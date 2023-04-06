import { URL } from 'https://jslib.k6.io/url/1.0.0/index.js';
import { check, sleep } from 'k6';
import http from 'k6/http';
import { Counter } from 'k6/metrics';
import sendNotification from './DeliverySendNotification.js';


export let options = JSON.parse(open('./modules/test-types/'+__ENV.TEST_TYPE+'.json'));


let apiKey = `${__ENV.API_KEY}`
let envName = `${__ENV.ENV_NAME}`


export function setup() {
    let result = JSON.parse(sendNotification().body);
    sleep(60);
    return result;    
}


const throttling = new Counter('throttling');


export default function getNotificationStatus(notificationRequest) {

    let url = new URL(`https://api.${envName}.pn.pagopa.it/delivery/requests`);
    url.searchParams.append('notificationRequestId', notificationRequest.notificationRequestId);

    let params = {
        headers: {
         'Content-Type': 'application/json',
         'x-api-key': apiKey
        },
    };
    
    let r = http.get(url.toString(), params);

    console.log(`Status ${r.status}`);

    check(r, {
        'status is 200': (r) => r.status === 200,
    });

    if (r.status === 403) {
        throttling.add(1);
    }

    sleep(1);
    return r;
}