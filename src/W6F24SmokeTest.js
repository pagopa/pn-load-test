import { digitalSoakTest, f24SoakTest } from './w7w6F24Test.js';

/**
 * PN-20853 - Prova breve dei flussi W6 (digitale) e F24 di w7w6F24Test.js, senza eventi di pagamento.
 * Le options arrivano dal test type (es. notificationsW6F24Smoke: 1 notifica per flusso, shared-iterations).
 * Env: BASE_PATH, API_KEY, PA_TAX_ID, DIGITAL_WORKFLOW e, se usati, WITH_PAYMENT, RECIPIENT_TAX_ID_W6_F24.
 */

export let options = JSON.parse(open('./modules/test-types/' + __ENV.TEST_TYPE + '.json'));

export { digitalSoakTest, f24SoakTest };
