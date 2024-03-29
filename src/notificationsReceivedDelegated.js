import { check, sleep } from 'k6';
import http from 'k6/http';
import { Counter } from 'k6/metrics';
import { acceptMandate } from "./modules/acceptMandate.js";
import { createMandate } from "./modules/createMandate.js";
import { revokeMandate } from "./modules/revokeMandate.js";
import { sendNotificationToPn } from './modules/sendNotification.js';


export let options = JSON.parse(open('./modules/test-types/'+__ENV.TEST_TYPE+'.json'));

const throttling = new Counter('throttling');


export function setup() {
  let r = createMandate();
  console.log(r.body);
  
  sleep(1);

  if(r.status === 201) {
    let body = JSON.parse(r.body);
    console.log(`Mandate Create Status: ${r.status}`);
    console.log(`Body: ${r.body}`);
    let mandateId =  body.mandateId

    r = acceptMandate(mandateId);
    console.log(`Mandate Accept Status: ${r.status}`);
    console.log(`Body: ${r.body}`);
    
    let taxId = `${__ENV.TAX_ID_USER1}`
    let iun = sendNotificationToPn(taxId).iun;

    let response = {};
    response["mandateId"] = mandateId;
    response["iun"] = iun;
    return response;
  }
}

export function teardown(request) {
  if(request !== undefined && request.mandateId !== undefined) {
    let r = revokeMandate(request.mandateId);
    console.log(`Mandate Revoke Status: ${r.status}`);
    sleep(1);
  }
}

export default function delegateRead(request) {
  if(request && request.mandateId  && request.iun ) {

    let bearerToken = `${__ENV.BEARER_TOKEN_USER2}`
    let basePath = `${__ENV.WEB_BASE_PATH}`

	  let url = `https://${basePath}/delivery/notifications/received/${request.iun}?mandateId=${request.mandateId}`;
	  
	  console.log(`Url ${url}`);

    let params = {
      headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${bearerToken}`,
      'Accept': 'application/json, text/plain, */*'
      },
    };
  
    let r = http.get(url, params);

    console.log(`Notifications Received Iun Delegated Status: ${r.status}`);
    console.log(`Body: ${r.body}`);
    check(r, {
      'status is 200': (r) => r.status === 200,
    });

    if (r.status === 429) {
      throttling.add(1);
    }
    sleep(1);
    return r;
  }
}



