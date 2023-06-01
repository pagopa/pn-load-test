import { check, sleep } from 'k6';
import http from 'k6/http';
import { Counter } from 'k6/metrics';
import { sendNotificationToPn } from './modules/sendNotification.js';

export let options = JSON.parse(open('./modules/test-types/'+__ENV.TEST_TYPE+'.json'));

const throttling = new Counter('throttling');
let bearerToken = `${__ENV.BEARER_TOKEN_USER1}`
let basePath = `${__ENV.WEB_BASE_PATH}`


export function setup() {
  let taxId = `${__ENV.TAX_ID_USER1}`
  if(useIunFile && useIunFile !== 'undefined') {
    let iunArray = iunFile.split(';');
    console.log("IUN_LENGTH: "+ iunArray.length);
    return iunArray
  }
  return sendNotificationToPn(taxId).iun;
}

export default function recipientRead(iun) {
  let currentIun = iun;
  if(useIunFile && useIunFile !== 'undefined') {
    currentIun = iun[exec.scenario.iterationInTest % iun.length].trim();
  }
     
    let url = `https://${basePath}/delivery/notifications/received/${currentIun}`;
    let token = 'Bearer ' + bearerToken;

    console.log(`Url ${url}`);

    let params = {
      headers: {
      'Content-Type': 'application/json',
      'Authorization': token
      }
    };

    let r = http.get(url, params);

    console.log(`Notifications Received Iun Status: ${r.status}`);
    //console.log(`Response body ${r.body}`);
    
    check(r, {
      'status is 200': (r) => r.status === 200,
    });

    if (r.status === 429) {
      throttling.add(1);
    }
    sleep(1);
    return r;
 
}



