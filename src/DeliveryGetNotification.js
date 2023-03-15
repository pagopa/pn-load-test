import { check, sleep } from 'k6';
import http from 'k6/http';
import { Counter } from 'k6/metrics';
import { sendNotificationToPn } from './modules/sendNotification.js';



export let options = JSON.parse(open('./modules/test-types/'+__ENV.TEST_TYPE+'.json'));

var apiKey = `${__ENV.API_KEY}`
var envName = `${__ENV.ENV_NAME}`



export function setup() {
  return sendNotificationToPn("FRMTTR76M06B715E");
}


const throttling = new Counter('throttling');

//export let options = JSON.parse(open(__ENV.TEST_TYPE)); for select external options 

export default function getNotification(iun) {

  console.log("INTERNAL IUN: "+iun);
  var url = `https://api.${envName}.pn.pagopa.it/delivery/notifications/sent/${iun}`;
  console.log('URL: '+url)

  var params = {
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey
    },
  };
  var r = http.get(url, params);

  console.log(`Status ${r.status}`);

  check(r, {
    'status is 200': (r) => r.status === 200,
  });

  if (r.status === 403) {
    throttling.add(1);
  }

  sleep(1);
}