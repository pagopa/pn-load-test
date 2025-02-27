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


export function performCall() {
    let retrievalId = 'YTWY-GAWU-XAGD-202502-E-1~OK~13212-abvee1-3332-aaa'
    let requests = [
        { name: "/send-message",    method: 'POST', url: 'http://localhost:8886/emd-integration-private/send-message', payload: sendMessagePayload },
        { name: "/token/check-tpp", method: 'GET',  url: `http://localhost:8886/emd-integration-private/token/check-tpp?retrievalId=${retrievalId}`, payload: null },
        { name: "/emd/check-tpp",   method: 'GET',  url: `http://localhost:8886/emd-integration-private/emd/check-tpp?retrievalId=${retrievalId}`, payload: null },
        { name: "/payment-url",     method: 'GET', url: `http://localhost:8886/emd-integration-private/payment-url?retrievalId=${retrievalId}&noticeCode=302000100000019421&paTaxId=77777777777`, payload: null },
    ];

    for (let req of requests) {
        let response;

        if (req.method == 'POST') {
            response = http.post(req.url, req.payload, params);
        } else {
            response = http.get(req.url)
        }

        if (!summaryTracker[req.name]) {
          summaryTracker[req.name] = {};
        }
        if (!summaryTracker[req.name][response.status]) {
          summaryTracker[req.name][response.status] = 0;
        }
        summaryTracker[req.name][response.status]++;
    }
}

export default function callEmdIntegration() {
  performCall();
  for (let endpoint in summaryTracker) {
    console.log(`${endpoint}`);
    for (let status in summaryTracker[endpoint]) {
      console.log(`   - Status ${status}: ${summaryTracker[endpoint][status]} chiamate`);
    }
  }
}