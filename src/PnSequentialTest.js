import { check, sleep } from 'k6';
import exec from 'k6/execution';
import { Counter } from 'k6/metrics';
import getNotification from './DeliveryGetNotification.js';
import getNotificationStatus from './DeliveryGetNotificationStatus.js';
import getNotificationWeb from './DeliveryGetNotificationWeb.js';
import { acceptMandate } from './modules/acceptMandate.js';
import { createMandate } from './modules/createMandate.js';
import { revokeMandate } from './modules/revokeMandate.js';
import { sendNotificationToPn } from './modules/sendNotification.js';
import recipientRead from './notificationsReceived.js';
import delegateRead from './notificationsReceivedDelegated.js';

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
  
      let response = {};
      response["mandateId"] = mandateId;
      response["iun"] = "";
      return response;
    }

    /*
    let mandate = JSON.parse(createMandate().body);
    acceptMandate(mandate.mandateId);
    let mandateReadData = {};
    mandateReadData["mandateId"] = mandate.mandateId;
    mandateReadData["iun"] = "";

    return mandateReadData;
    */
}

export function teardown(mandateReadData) {
      let r = revokeMandate(mandateReadData.mandateId);
      console.log(`Mandate Revoke Status: ${r.status}`);
}

export function checkResult(r){
    check(r, {
        'status is 200': (r) => r.status === 200,
    });

    if (r.status === 403) {
        throttling.add(1);
    }
}

export default function (mandateReadData) {
    let taxId = `${__ENV.TAX_ID_USER1}`
    let result = sendNotificationToPn(taxId);
    
    checkResult(getNotificationStatus(result.requestId));
    
    if(exec.scenario.iterationInTest%2){
        checkResult(getNotification(result.iun));
    }else{
        checkResult(getNotificationWeb(result.iun));
    }
    
    if(exec.scenario.iterationInTest%2){
        checkResult(recipientRead(result.iun));
    }else{
        mandateReadData["iun"] = result.iun;
        delegateRead(mandateReadData);
    }
    
    
}