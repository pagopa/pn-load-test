import { check } from 'k6';
import exec from 'k6/execution';
import http from 'k6/http';
import { Counter } from 'k6/metrics';


export let options = JSON.parse(open('./modules/test-types/'+__ENV.TEST_TYPE+'.json'));

let params = {
    headers: {
        'Content-Type': 'application/json'
    }
};

let sendMessagePayload = JSON.stringify({
    internalRecipientId: '5b334d4a-0gt7-24ac-9c7b-354e2d44w5tr',
    recipientId: 'RSSMRA85T10A562S',
    senderDescription: 'Comune di Milano',
    originId: 'VEAJ-PTPD-NZDQ-202501-Y-1',
    associatedPayment: true,
});

let summaryTracker = {};

let retrievalId = 'YTWY-GAWU-XAGD-202502-E-1~OK~13212-abvee1-3332-aaa'
let requests = [
  { name: "/send-message",    method: 'POST', url: 'http://localhost:8886/emd-integration-private/send-message', payload: sendMessagePayload },
  { name: "/token/check-tpp", method: 'GET',  url: `http://localhost:8886/emd-integration-private/token/check-tpp?retrievalId=${retrievalId}`, payload: null },
  { name: "/emd/check-tpp",   method: 'GET',  url: `http://localhost:8886/emd-integration-private/emd/check-tpp?retrievalId=${retrievalId}`, payload: null },
  { name: "/payment-url",     method: 'GET', url: `http://localhost:8886/emd-integration-private/payment-url?retrievalId=${retrievalId}&noticeCode=302000100000019421&paTaxId=77777777777`, payload: null },
];


function sanitizeMetricName(name) {
  return name.replace(/[^a-zA-Z0-9_]/g, "_"); // Sostituisce caratteri non validi con "_"
}


let counters = {};
for (let req of requests) {
  let sanitizedName = sanitizeMetricName(req.name);
  counters[sanitizedName] = {};
  for (let status of [200, 400, 401, 403, 404, 500]) {  // Definisci gli status di interesse
      let key = `${sanitizedName}_${status}`;
      counters[sanitizedName][status] = new Counter(key);
  }
}

function trackStatus(endpoint, status) {
  let sanitizedName = sanitizeMetricName(endpoint);
  if (counters[sanitizedName][status]) {
      counters[sanitizedName][status].add(1);
  }
}

export function performCall() {
    for (let req of requests) {
        let response;

        if (req.method == 'POST') {
            response = http.post(req.url, req.payload, params);
        } else {
            response = http.get(req.url)
        }

        trackStatus(req.name, response.status);
    }
}

export default function callEmdIntegration() {
  performCall();
}