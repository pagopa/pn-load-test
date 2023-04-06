import { check, sleep } from 'k6';
import exec from 'k6/execution';
import http from 'k6/http';
import { Counter } from 'k6/metrics';
import { sendNotificationToPn } from './modules/sendNotification.js';
  

export let options = JSON.parse(open('./modules/test-types/'+__ENV.TEST_TYPE+'.json'));

const throttling = new Counter('throttling');

let apiKey = `${__ENV.API_KEY}`
let envName = `${__ENV.ENV_NAME}`
let useIunFile = `${__ENV.USE_IUN_FILE}`
let iunFile = open('./resources/NotificationIUN.txt');


export function setup() {
  if(useIunFile && useIunFile !== 'undefined') {
    let iunArray = iunFile.split(';');
    console.log("IUN_LENGTH: "+ iunArray.length);
    return iunArray
  }
  return sendNotificationToPn("FRMTTR76M06B715E").iun;
}



export default function getNotification(iun) {
  let currentIun = iun;
  if(useIunFile && useIunFile !== 'undefined') {
    currentIun = iun[exec.scenario.iterationInTest % iun.length].trim();
  }
  
  console.log("INTERNAL IUN: "+currentIun);
  let url = `https://api.${envName}.pn.pagopa.it/delivery/notifications/sent/${currentIun}`;
  console.log('URL: '+url)

  let params = {
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey
    },
  };
  let r = http.get(url, params);

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