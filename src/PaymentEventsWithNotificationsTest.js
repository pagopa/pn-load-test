import paymentEvents, { setup as paymentSetup, teardown as paymentTeardown } from './PaymentEventsTest.js';
import { analogicSoakTest, digitalSoakTest, f24SoakTest } from './w7w6F24Test.js';

/**
 * PN-20853 - Eventi di pagamento insieme al flusso standard di invio notifiche.
 *
 * Nessuna logica propria: unisce gli scenari di PaymentEventsTest.js (funzione di default, scenario "main"
 * ed eventuale "steady") e quelli di w7w6F24Test.js (analogicSoakTest, f24SoakTest, digitalSoakTest),
 * usati senza modifiche. Le options arrivano dal test type (run-test.sh --with-notifications le genera),
 * non da w7w6F24Test.js.
 *
 * Env: quelle di PaymentEventsTest.js più quelle delle notifiche (BASE_PATH, API_KEY, PA_TAX_ID e, se usati,
 * WITH_PAYMENT, WITH_GROUP, RANDOM_ADDRESS, MORE_ATTACH).
 */

export let options = JSON.parse(open('./modules/test-types/' + __ENV.TEST_TYPE + '.json'));

export function setup() {
    return paymentSetup();
}

export function teardown(data) {
    return paymentTeardown(data);
}

export { analogicSoakTest, digitalSoakTest, f24SoakTest };

export default paymentEvents;
