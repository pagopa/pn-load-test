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

let retrievalId = 'YTWY-GAWU-XAGD-202502-E-1~OK~13212-abvee1-3332-aaa'

let basePath = 'http://internal-ecsa-20230504103152508600000011-1839177861.eu-south-1.elb.amazonaws.com:8080'
let requests = [
  { name: "/send-message",    method: 'POST', url: `${basePath}/emd-integration-private/send-message`, payload: sendMessagePayload },
  { name: "/token/check-tpp", method: 'GET',  url: `${basePath}/emd-integration-private/token/check-tpp?retrievalId=${retrievalId}`, payload: null },
  { name: "/emd/check-tpp",   method: 'GET',  url: `${basePath}/emd-integration-private/emd/check-tpp?retrievalId=${retrievalId}`, payload: null },
  { name: "/payment-url",     method: 'GET', url: `${basePath}/emd-integration-private/payment-url?retrievalId=${retrievalId}&noticeCode=302000100000019421&paTaxId=77777777777`, payload: null },
];

function sanitizeMetricName(name) {
  return name.replace(/[^a-zA-Z0-9_]/g, "_"); // Replaces invalid characters with "_"
}


let counters = {};
for (let req of requests) {
  let sanitizedName = sanitizeMetricName(req.name);
  counters[sanitizedName] = {};
  for (let status of [200, 400, 401, 403, 404, 500]) {  // Define the status codes of interest
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

function generateFakeIUN() {
   
  const millisecondsString = ((new Date()).getTime()+'').slice(-8);

  const initialString = millisecondsString.slice(0,4)+"-"+millisecondsString.slice(4,millisecondsString.length);
  sleep(1);
  const centralString = ((new Date()).getTime()+'').slice(-4);

  const dateAndVu = ((new Date())).getFullYear() + ((exec.vu.idInTest%99)+'').padStart(2,'1'); 

  //const vuId = ((exec.vu.idInTest%99999)+'').padStart(5,'1'); 
 
  let finalString = (exec.vu.idInTest%99+'').padStart(2,'1');
 
  let resultString = initialString+'-'+centralString+'-'+dateAndVu+'-'+ finalString.slice(0,1)+'-'+finalString.slice(1,2);
  
  return resultString;
}

export function performCall() {
    for (let req of requests) {
        let response;
        req.payload.originId = generateFakeIUN();
        
        if (req.method == 'POST') {
            response = http.post(req.url, req.payload, params);
            check(response, {
              'status post emd is 200': (response) => response.status === 200,
            });
            check(response, {
              'status post emd is not 200': (response) => response.status !== 200,
            });
        } else {
            response = http.get(req.url)
            check(response, {
              'status get emd is 200': (response) => response.status === 200,
            });
            check(response, {
              'status get emd is not 200': (response) => response.status !== 200,
            });
        }

        trackStatus(req.name, response.status);
    }
}

export default function callEmdIntegration() {
  performCall();
}