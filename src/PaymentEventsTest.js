import { check, fail } from 'k6';
import { SharedArray } from 'k6/data';
import exec from 'k6/execution';
import http from 'k6/http';
import { Counter } from 'k6/metrics';

/**
 * PN-20853 - Test di carico sugli eventi di pagamento pagoPA.
 *
 * Ogni iterazione pubblica un evento di pagamento sul topic Kafka dei pagamenti tramite il mock Kafka
 * di pn-external-channels (POST /external-channels/v1/kafka/payment), lo stesso usato dai test e2e di
 * pn-b2b-client. L'evento attraversa poi pn-kafka-bridge, pn-notification-cost-service e delivery-push.
 *
 * Parametri:
 *  - TEST_TYPE                   file in modules/test-types (paymentEventsSmoke, paymentEventsFirstIteration, paymentEventsRamp)
 *  - EXTERNAL_CHANNELS_BASE_URL  base url di pn-external-channels raggiungibile dal runner (es. http://<alb-interno>:8080)
 *  - IUV_FILE                    OPZIONALE, dataset degli IUV (default ./resources/PaymentEventsIUV.txt)
 *  - AMOUNT                      OPZIONALE, importo in euro (anche decimali, es. 10.50): pn-kafka-bridge lo converte
 *                                in centesimi; se assente il mock usa "1000", cioè 1000 euro
 *
 * paymentDateTime viene inviato come ora locale di Roma senza offset e con 6 decimali (uuuu-MM-ddTHH:mm:ss.SSSSSS),
 * l'unico formato accettato da pn-kafka-bridge: gli altri finiscono fra i messaggi malformati.
 *  - SEND_EVENT_RATIO            OBBLIGATORIO, quota di eventi su IUV di SEND fra 0 e 1, senza default. Es. 0.06: su
 *                                ogni 100 eventi 6 usano gli IUV del dataset (notifiche reali) e 94 IUV che SEND non
 *                                conosce e scarta. Con 1 tutti gli eventi vanno su notifiche reali: usare solo di proposito
 *  - ITERATION_OFFSET            OPZIONALE, numero di eventi già generati da fasi precedenti: la numerazione riparte da lì
 *  - MAX_EVENTS                  OPZIONALE, numero massimo di eventi pubblicati dallo scenario; le iterazioni oltre non pubblicano
 *  ITERATION_OFFSET e MAX_EVENTS si possono valorizzare anche nell'env del singolo scenario del test type.
 *
 * Dataset: un IUV per riga (o separati da ';'), nel formato SEND <creditorTaxId>##<noticeCode>,
 * es. 77777777777##302000100000019421. Gli IUV vengono usati a rotazione.
 * Gli eventi non SEND usano il creditorTaxId 00000000000 e un numero avviso progressivo, assenti da pn-PaymentInfo.
 *
 * Protezioni per l'ambiente:
 *  - se il mock ha disattivato la connessione a Kafka il test viene interrotto, senza riattivarla: un broker
 *    in difficoltà non deve ricevere altro traffico;
 *  - i profili di carico interrompono il test quando gli errori o le latenze superano le soglie (abortOnFail).
 */

export let options = JSON.parse(open('./modules/test-types/' + __ENV.TEST_TYPE + '.json'));

const baseUrl = `${__ENV.EXTERNAL_CHANNELS_BASE_URL}`.replace(/\/+$/, '');
const iuvFile = __ENV.IUV_FILE || './resources/PaymentEventsIUV.txt';
const amount = __ENV.AMOUNT;
// pn-kafka-bridge interpreta amount in euro (anche decimali) e lo converte in centesimi
if (amount && !/^\d+(\.\d{1,2})?$/.test(amount)) {
    throw new Error(`AMOUNT deve essere un importo in euro, es. 10 o 10.50: ${amount}`);
}
// Nessun default: con 1 tutti gli eventi andrebbero su notifiche reali, la quota va scelta esplicitamente
if (__ENV.SEND_EVENT_RATIO === undefined || __ENV.SEND_EVENT_RATIO.trim() === '') {
    throw new Error('SEND_EVENT_RATIO obbligatorio (es. 0.06 nei test di carico): quota di eventi su notifiche reali');
}
const sendEventRatio = Number(__ENV.SEND_EVENT_RATIO);
if (!(sendEventRatio >= 0 && sendEventRatio <= 1)) {
    throw new Error(`SEND_EVENT_RATIO deve essere un numero fra 0 e 1: ${__ENV.SEND_EVENT_RATIO}`);
}
const NOT_SEND_CREDITOR_TAX_ID = '00000000000';

const PAYMENT_URL = `${baseUrl}/external-channels/v1/kafka/payment`;
const CONNECTION_URL = `${baseUrl}/external-channels/v1/kafka/connection`;
const JSON_PARAMS = {
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json,application/problem+json'
    }
};
// Dopo un errore ogni VU verifica lo stato della connessione Kafka al massimo una volta in questo intervallo
const CONNECTION_CHECK_INTERVAL_MS = 10000;

const CREDITOR_TAX_ID = /^\d{11}$/;
const NOTICE_CODE = /^\d{18}$/;

/**
 * Il mock non valida i campi e inoltra a Kafka anche eventi malformati, che pn-kafka-bridge scarta in DLQ
 * facendo scattare l'allarme: gli IUV vengono quindi validati prima di partire.
 */
const paymentNotices = new SharedArray('paymentNotices', function () {
    const notices = [];
    const invalid = [];
    open(iuvFile).split(/[;\r\n]+/).map((line) => line.trim()).filter((line) => line.length > 0)
        .forEach((iuv) => {
            const parts = iuv.split('##');
            if (parts.length === 2 && CREDITOR_TAX_ID.test(parts[0]) && NOTICE_CODE.test(parts[1])) {
                notices.push({ creditorTaxId: parts[0], noticeNumber: parts[1] });
            } else {
                invalid.push(iuv);
            }
        });
    if (invalid.length > 0) {
        throw new Error(`IUV non validi in ${iuvFile} (attesi <creditorTaxId 11 cifre>##<noticeCode 18 cifre>): `
            + invalid.slice(0, 10).join(', ') + (invalid.length > 10 ? ` ... (${invalid.length} in totale)` : ''));
    }
    if (notices.length === 0) {
        throw new Error(`Nessun IUV in ${iuvFile}`);
    }
    return notices;
});

const payment_events_published = new Counter('payment_events_published');
const payment_events_send = new Counter('payment_events_send');
const payment_events_not_send = new Counter('payment_events_not_send');
const code_success = new Counter('code_success');
const code_badrequest = new Counter('code_badrequest');
const code_iserror = new Counter('code_iserror');
const code_serviceunavailable = new Counter('code_serviceunavailable');
const code_other = new Counter('code_other');

let lastConnectionCheck = 0;

export function setup() {
    if (!__ENV.EXTERNAL_CHANNELS_BASE_URL) {
        fail('EXTERNAL_CHANNELS_BASE_URL non valorizzato');
    }
    console.log(`IUV_DATASET: ${paymentNotices.length} IUV da ${iuvFile}, quota eventi SEND ${sendEventRatio}`);
    if (!isKafkaConnectionEnabled()) {
        fail('Connessione Kafka del mock disattivata: verificare lo stato del broker prima di riattivarla e rilanciare');
    }
}

export default function paymentEvents() {
    const scenarioIteration = exec.scenario.iterationInTest;
    // MAX_EVENTS e ITERATION_OFFSET possono arrivare dall'env dello scenario (es. paymentEventsBacklog)
    const maxEvents = optionalNonNegativeInteger('MAX_EVENTS');
    if (maxEvents !== undefined && scenarioIteration >= maxEvents) {
        return;
    }
    if (scenarioIteration === 0) {
        // Segna nel console-output l'inizio di ogni fase (es. fine del pregresso e avvio del traffico a regime)
        console.log(`SCENARIO_START name=${exec.scenario.name} at=${new Date().toISOString()}`);
    }
    // Continua la numerazione delle fasi precedenti: IUV SEND a rotazione e numeri avviso non SEND non si ripetono
    const iteration = scenarioIteration + (optionalNonNegativeInteger('ITERATION_OFFSET') || 0);
    // Ripartizione deterministica: l'iterazione è SEND quando fa salire il numero di eventi SEND attesi
    const sendEventsBefore = Math.floor(iteration * sendEventRatio);
    const isSendEvent = Math.floor((iteration + 1) * sendEventRatio) > sendEventsBefore;
    const notice = isSendEvent
        ? paymentNotices[sendEventsBefore % paymentNotices.length]
        : { creditorTaxId: NOT_SEND_CREDITOR_TAX_ID, noticeNumber: `3${String(iteration).padStart(17, '0')}` };

    const request = {
        noticeNumber: notice.noticeNumber,
        creditorTaxId: notice.creditorTaxId,
        paymentDateTime: romeLocalDateTime(new Date())
    };
    if (amount) {
        request.amount = `${amount}`;
    }

    const r = http.post(PAYMENT_URL, JSON.stringify(request), Object.assign({ tags: { name: 'producePayment' } }, JSON_PARAMS));

    const published = check(r, {
        'status producePayment is 200': (res) => res.status === 200,
        'producePayment returns partition and offset': (res) => res.status === 200
            && res.json('partition') !== undefined && res.json('offset') !== undefined,
    });
    countStatus(r.status);

    if (published) {
        // Il mock usa come chiave Kafka un id che cambia solo ogni secondo: la partizione mostra come si distribuisce il carico
        payment_events_published.add(1, { partition: `${r.json('partition')}` });
        (isSendEvent ? payment_events_send : payment_events_not_send).add(1);
        return;
    }

    console.error(`PAYMENT_EVENT_KO status=${r.status} iuv=${notice.creditorTaxId}##${notice.noticeNumber} body=${r.body}`);
    if (r.status >= 500 && Date.now() - lastConnectionCheck > CONNECTION_CHECK_INTERVAL_MS) {
        lastConnectionCheck = Date.now();
        if (!isKafkaConnectionEnabled()) {
            exec.test.abort('Il mock ha disattivato la connessione a Kafka: test interrotto per non caricare il broker');
        }
    }
}

export function teardown() {
    const r = http.get(CONNECTION_URL, Object.assign({ tags: { name: 'checkKafkaConnection' } }, JSON_PARAMS));
    console.log(`KAFKA_CONNECTION_AT_END status=${r.status} body=${r.body}`);
}

/**
 * Dopo un errore di connessione a Kafka il mock disattiva il producer (kill switch). Lo script non lo riattiva:
 * la riattivazione va fatta a mano, dopo aver verificato che il broker sia di nuovo disponibile.
 */
function isKafkaConnectionEnabled() {
    const r = http.get(CONNECTION_URL, Object.assign({ tags: { name: 'checkKafkaConnection' } }, JSON_PARAMS));
    const enabled = r.status === 200 && r.json('enabled') === true;
    if (!enabled) {
        console.error(`KAFKA_CONNECTION_DISABLED status=${r.status} body=${r.body}`);
    }
    return enabled;
}

/**
 * Ora locale di Roma nel formato uuuu-MM-ddTHH:mm:ss.SSSSSS. Il runtime di k6 non ha i fusi orari di Intl:
 * l'ora legale europea va dall'ultima domenica di marzo all'ultima domenica di ottobre, alle 01:00 UTC.
 */
function romeLocalDateTime(date) {
    const year = date.getUTCFullYear();
    const lastSundayAt1Utc = (month) => {
        const lastDay = new Date(Date.UTC(year, month + 1, 0, 1));
        return lastDay.getTime() - lastDay.getUTCDay() * 86400000;
    };
    const t = date.getTime();
    const offsetHours = t >= lastSundayAt1Utc(2) && t < lastSundayAt1Utc(9) ? 2 : 1;
    const local = new Date(t + offsetHours * 3600000).toISOString(); // yyyy-MM-ddTHH:mm:ss.SSSZ
    return local.slice(0, 23) + '000';
}

function optionalNonNegativeInteger(name) {
    const raw = __ENV[name];
    if (raw === undefined || raw === '') {
        return undefined;
    }
    const value = Number(raw);
    if (!Number.isInteger(value) || value < 0) {
        exec.test.abort(`${name} deve essere un intero >= 0: ${raw}`);
    }
    return value;
}

function countStatus(status) {
    if (status === 200) {
        code_success.add(1);
    } else if (status === 400) {
        code_badrequest.add(1);
    } else if (status === 503) {
        code_serviceunavailable.add(1);
    } else if (status >= 500) {
        code_iserror.add(1);
    } else {
        code_other.add(1);
    }
}
