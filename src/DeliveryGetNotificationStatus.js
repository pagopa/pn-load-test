import { check, sleep } from 'k6';
import http from 'k6/http';
import { Counter } from 'k6/metrics';
import sendNotification from './DeliverySendNotification.js';


export let options = JSON.parse(open('./modules/test-types/'+__ENV.TEST_TYPE+'.json'));

var apiKey = `${__ENV.API_KEY}`
var envName = `${__ENV.ENV_NAME}`


export function setup() {
    var result = JSON.parse(sendNotification(userTaxId).body);
    return result;
}


const throttling = new Counter('throttling');


export default function getNotification(notificationRequest) {

    var url = new URL(`https://api.${envName}.pn.pagopa.it/delivery/requests`);
    url.searchParams.append('notificationRequestId', notificationRequest.paProtocolNumber);

    var params = {
        headers: {
         'Content-Type': 'application/json',
         'x-api-key': apiKey
        },
    };
    
    var r = http.get(url.toString(), params);

    console.log(`Status ${r.status}`);

    check(r, {
        'status is 200': (r) => r.status === 200,
    });

    if (r.status === 403) {
        throttling.add(1);
    }

    sleep(1);
}