import { check } from 'k6';
import { Counter } from 'k6/metrics';
import getNotification from './DeliveryGetNotification.js';
import getNotificationStatus from './DeliveryGetNotificationStatus.js';
import getNotificationWeb from './DeliveryGetNotificationWeb.js';
import { sendNotificationToPn } from './modules/sendNotification.js';
import recipientRead from './notificationsReceived.js';
  

export let options = JSON.parse(open('./modules/test-types/'+__ENV.TEST_TYPE+'.json'));

const throttling = new Counter('throttling');


export function setup() {
   //setup 
}

export function checkResult(r){
    check(r, {
        'status is 200': (r) => r.status === 200,
    });

    if (r.status === 403) {
        throttling.add(1);
    }
}

export default function () {
    let taxId = `${__ENV.TAX_ID_USER1}`
    let result = sendNotificationToPn(taxId);
    
    checkResult(getNotificationStatus(result.notificationRequestId));
    
    if(exec.scenario.iterationInTest%2){
        checkResult(getNotification(result.iun));
    }else{
        checkResult(getNotificationWeb(result.iun));
    }
    
    checkResult(recipientRead(result.iun));
    
}