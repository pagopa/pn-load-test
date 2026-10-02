import { check } from 'k6';
import http from 'k6/http';
import { Counter } from 'k6/metrics';
import { SharedArray } from 'k6/data';
import exec from 'k6/execution';

// Counter per status code, cosi' nel report finale si vede quante chiamate
// sono andate in ciascuno stato.
const status200 = new Counter('status_200');
const status429 = new Counter('status_429');
const status500 = new Counter('status_500');
const status502 = new Counter('status_502');
const status503 = new Counter('status_503');
const status504 = new Counter('status_504');
const statusOther = new Counter('status_other');

let bearerToken = `${__ENV.BEARER_TOKEN_USER1}`;
let basePath = `${__ENV.WEB_BASE_PATH}`;

// Lista di IUN da file (uno per riga), condivisa fra le VU senza duplicarla
// in memoria. Default: src/resources/NotificationIUN-CapacityTest.txt (20.000
// IUN). Si puo' sovrascrivere con -e IUN_FILE=./path/iunList.txt
const iunFilePath = __ENV.IUN_FILE || './resources/NotificationIUN-CapacityTest.txt';
const iunList = new SharedArray('iunList', function () {
  return open(iunFilePath)
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
});

// Deve coincidere con il target piu' alto configurato nelle stages qui sotto:
// serve per calcolare quanti IUN distinti sono necessari per garantire 5 minuti
// di cooldown per ciascuno (vedi setup()).
const PEAK_RATE = 60;
const IUN_COOLDOWN_SECONDS = 300;

// Rampa di 1 ora: si parte da 10 richieste/sec e si sale, per vedere fino a
// quale rate l'endpoint risponde senza errori.
export const options = {
  scenarios: {
    received_ramp_test: {
      executor: 'ramping-arrival-rate',
      timeUnit: '1s',
      startRate: 10,
      preAllocatedVUs: 400,
      maxVUs: 2500,

      stages: [
        { target: 10, duration: '10m' },
        { target: 40, duration: '10m' },
        { target: 60, duration: '0s' },  // salto istantaneo a 60 (niente rampa)
        { target: 60, duration: '40m' }  // plateau a 60 per 40 minuti
      ],
    },
  },
  // Appena piu' del 5% delle richieste fallisce, il test si ferma subito:
  // il gradino attivo in quel momento e' il rate a cui l'endpoint ha iniziato
  // a rispondere con errori.
  thresholds: {
    http_req_failed: [
      { threshold: 'rate<0.05', abortOnFail: true, delayAbortEval: '10s' },
    ],
  },
};

export function setup() {
  const minRequiredIuns = PEAK_RATE * IUN_COOLDOWN_SECONDS;
  if (iunList.length < minRequiredIuns) {
    throw new Error(
      `Servono almeno ${minRequiredIuns} IUN per garantire ${IUN_COOLDOWN_SECONDS / 60} minuti di cooldown al rate di picco (${PEAK_RATE} req/s), ma IUN_FILE ne contiene solo ${iunList.length}.`
    );
  }
  console.log(`IUN disponibili: ${iunList.length} (minimo richiesto: ${minRequiredIuns})`);
}

export default function () {
  // Round-robin deterministico: l'N-esima richiesta della scenario usa sempre
  // lo stesso indice, quindi un IUN si ripete solo dopo aver esaurito tutta la
  // lista, garantendo il cooldown di 5 minuti se iunList.length e' sufficiente.
  let iun = iunList[exec.scenario.iterationInTest % iunList.length];

  let url = `https://${basePath}/bff/v1/notifications/received/${iun}`;
  let token = 'Bearer ' + bearerToken;

  let params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token,
    },
  };

  let r = http.get(url, params);

  console.log(`Notifications Received Iun Status: ${r.status}`);

  if (r.status !== 200) {
    console.log(`Notifications Received Iun Body: ${r.body}`);
  }

  check(r, {
    'status is 200': (r) => r.status === 200,
  });

  switch (r.status) {
    case 200:
      status200.add(1);
      break;
    case 429:
      status429.add(1);
      break;
    case 500:
      status500.add(1);
      break;
    case 502:
      status502.add(1);
      break;
    case 503:
      status503.add(1);
      break;
    case 504:
      status504.add(1);
      break;
    default:
      statusOther.add(1);
  }
}
