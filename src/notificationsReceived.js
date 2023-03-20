import { check, sleep } from 'k6';
import http from 'k6/http';
import { Counter } from 'k6/metrics';
import { sendNotificationToPn } from './modules/sendNotification.js';

export let options = JSON.parse(open('./modules/test-types/'+__ENV.TEST_TYPE+'.json'));

const throttling = new Counter('throttling');
var bearerToken = `${__ENV.BEARER_TOKEN_USER1}`
var envName = `${__ENV.ENV_NAME}`


export function setup() {
  var taxId = `${__ENV.TAX_ID_USER1}`
  return sendNotificationToPn(taxId).iun;
}

export default function recipientRead(iun) {
     
    var url = `https://webapi.${envName}.pn.pagopa.it/delivery/notifications/received/${iun}`;
    var token = 'Bearer ' + bearerToken;

    console.log(`Url ${url}`);

    var params = {
      headers: {
      'Content-Type': 'application/json',
      'Authorization': token
      }
    };

    var r = http.get(url, params);

    console.log(`Notifications Received Iun Status: ${r.status}`);
    console.log(`Response body ${r.body}`);
    
    check(r, {
      'status is 200': (r) => r.status === 200,
    });

    if (r.status === 429) {
      throttling.add(1);
    }
    sleep(1);
    return r;
 
}



