import { check } from 'k6';
import http from 'k6/http';
import { Counter } from 'k6/metrics';

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
let iun = `${__ENV.IUN}`;

// Rampa di 2 ore: si parte da 10 richieste/sec e si sale di 50 req/s ogni 15
// minuti, per vedere fino a quale rate l'endpoint risponde senza errori.
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
        { target: 60, duration: '40m' }
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

export default function () {
  let url = `https://${basePath}/bff/v1/notifications/received/UPEH-AZYG-DGEM-202610-L-1`;
  let token = 'Bearer ' + bearerToken;

  let params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token,
    },
  };

  let r = http.get(url, params);

  console.log(`Notifications Received Iun Status: ${r.status}`);

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
