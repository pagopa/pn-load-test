
import { check, sleep } from 'k6';
import { Counter } from 'k6/metrics';
import http from 'k6/http';

// Per retrieveNotificationCost
export const retrieveNotificationCost_200 = new Counter('retrieveNotificationCost_200');
export const retrieveNotificationCost_400 = new Counter('retrieveNotificationCost_400');
export const retrieveNotificationCost_403 = new Counter('retrieveNotificationCost_403');
export const retrieveNotificationCost_404 = new Counter('retrieveNotificationCost_404');
export const retrieveNotificationCost_500 = new Counter('retrieveNotificationCost_500');

// Per retrieveNotificationCostForPayment
export const retrieveNotificationCostForPayment_200 = new Counter('retrieveNotificationCostForPayment_200');
export const retrieveNotificationCostForPayment_400 = new Counter('retrieveNotificationCostForPayment_400');
export const retrieveNotificationCostForPayment_403 = new Counter('retrieveNotificationCostForPayment_403');
export const retrieveNotificationCostForPayment_404 = new Counter('retrieveNotificationCostForPayment_404');
export const retrieveNotificationCostForPayment_500 = new Counter('retrieveNotificationCostForPayment_500');

// Per initializeNotificationCost
export const initializeNotificationCost_202 = new Counter('initializeNotificationCost_202');
export const initializeNotificationCost_400 = new Counter('initializeNotificationCost_400');
export const initializeNotificationCost_403 = new Counter('initializeNotificationCost_403');
export const initializeNotificationCost_404 = new Counter('initializeNotificationCost_404');
export const initializeNotificationCost_500 = new Counter('initializeNotificationCost_500');

/*
export const options = {
    setupTimeout: '2400s',
    scenarios: {
      notificationCost: {
        executor: 'shared-iterations',
        vus: 1,
        iterations: 4,
        tags: { test_type: 'retrieveNotificationCost' }, 
        exec: 'retrieveNotificationCost', 
      },
      notificationCostForPayment: {
        executor: 'shared-iterations',
        vus: 1,
        iterations: 4,
        tags: { test_type: 'retrieveNotificationCostForPayment' }, 
        exec: 'retrieveNotificationCostForPayment', 
      },
      initializeNotificationCost: {
        executor: 'shared-iterations',
        vus: 1,
        iterations: 4,
        tags: { test_type: 'initializeNotificationCost' }, 
        exec: 'initializeNotificationCost', 
      }
    }
  };
*/


export const options = {
    setupTimeout: '2400s',
    scenarios: {
      notificationCost: {
        executor: 'ramping-arrival-rate',
        timeUnit: '1s',
        startRate: 5, 
        preAllocatedVUs: 200, 
        maxVUs: 9000,
        stages: [
          { target: 5, duration: '10s' },
          { target: 20, duration: '5m' },
          { target: 20, duration: '50m' },
          { target: 5, duration: '5m' },
          { target: 5, duration: '10s' }
        ],
        tags: { test_type: 'retrieveNotificationCost' }, 
        exec: 'retrieveNotificationCost', 
      },
      notificationCostForPayment: {
        executor: 'ramping-arrival-rate',
        timeUnit: '1s',
        startRate: 5, 
        preAllocatedVUs: 200, 
        maxVUs: 9000,
        stages: [
            { target: 5, duration: '10s' },
            { target: 20, duration: '5m' },
            { target: 20, duration: '50m' },
            { target: 5, duration: '5m' },
            { target: 5, duration: '10s' }
        ],
        tags: { test_type: 'retrieveNotificationCostForPayment' }, 
        exec: 'retrieveNotificationCostForPayment', 
      },
      initializeNotificationCost: {
        executor: 'ramping-arrival-rate',
        timeUnit: '1s',
        startRate: 5, 
        preAllocatedVUs: 200, 
        maxVUs: 9000,
        stages: [
          { target: 5, duration: '10s' },
          { target: 20, duration: '5m' },
          { target: 20, duration: '50m' },
          { target: 5, duration: '5m' },
          { target: 5, duration: '10s' }
        ],
        tags: { test_type: 'initializeNotificationCost' }, 
        exec: 'initializeNotificationCost', 
      }
    }
  };


//DA LOCALE
//let domain = 'http://localhost:8886';

//DA REMOTO
let domain = 'http://internal-EcsA-20230504103152508600000011-1839177861.eu-south-1.elb.amazonaws.com:8080';

//notification-cost-private/cost/{iun}/recipient/{recIndex}
export function retrieveNotificationCost() {
    let url = `${domain}/notification-cost-private/cost/EMWR-AHWJ-GXJL-202604-D-1/recipient/0`;
    let r = http.get(url);
    console.log('retrieveNotificationCost response body: ', r.body);

    if (r.status === 200) retrieveNotificationCost_200.add(1);
    else if (r.status === 400) retrieveNotificationCost_400.add(1);
    else if (r.status === 403) retrieveNotificationCost_403.add(1);
    else if (r.status === 404) retrieveNotificationCost_404.add(1);
    else if (r.status === 500) retrieveNotificationCost_500.add(1);

    check(r, {
        'retrieveNotificationCost status is 200': (r) => r.status === 200,
    });
}

//notification-cost-private/cost/payment/{creditorTaxId}/{noticeCode}
export function retrieveNotificationCostForPayment() {
    let url = `${domain}/notification-cost-private/cost/payment/77777777777/347887685040282844`;
    let r = http.get(url);
    console.log('retrieveNotificationCostForPayment response body: ', r.body);

    if (r.status === 200) retrieveNotificationCostForPayment_200.add(1);
    else if (r.status === 400) retrieveNotificationCostForPayment_400.add(1);
    else if (r.status === 403) retrieveNotificationCostForPayment_403.add(1);
    else if (r.status === 404) retrieveNotificationCostForPayment_404.add(1);
    else if (r.status === 500) retrieveNotificationCostForPayment_500.add(1);

    check(r, {
        'retrieveNotificationCostForPayment status is 200': (r) => r.status === 200,
    });
}

//notification-cost-private/cost/initialize/{iun}
export function initializeNotificationCost() {
    let url = `${domain}/notification-cost-private/cost/initialize/ZRNX-QPGU-KYEU-203201-Y-3`;
    let params = {
        headers: {
            'Content-Type': 'application/json'
        },
    };
    let payload = JSON.stringify({
    "paFee": 10,
    "notificationFeePolicy": "DELIVERY_MODE",
    "pagoPaIntMode": "SYNC",
    "vat": 29,
    "senderPaId": "5b994d4a-0fa8-47ac-9c7b-354f1d44a1ce",
    "senderTaxId": "80016350821",
    "costRecipients": [
        {
            "recIndex": 0,
            "recipientInternalId": "CLMCST42R12D960Z",
            "payments": [
                {
                    "iuv": "77777777777##302030150707166381",
                    "applyCost": true
                }
            ]
        }
    ]
});
    let r = http.post(url, payload, params);
    console.log('initializeNotificationCost response body: ', r.body);

    if (r.status === 202) initializeNotificationCost_202.add(1);
    else if (r.status === 400) initializeNotificationCost_400.add(1);
    else if (r.status === 403) initializeNotificationCost_403.add(1);
    else if (r.status === 404) initializeNotificationCost_404.add(1);
    else if (r.status === 500) initializeNotificationCost_500.add(1);

    check(r, {
        'initializeNotificationCost status is 202': (r) => r.status === 202,
    });
}