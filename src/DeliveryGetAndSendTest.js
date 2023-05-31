import getNotification from './DeliveryGetNotification.js';
import sendNotification from './DeliverySendNotification.js';
import { sendNotificationToPn } from './modules/sendNotification.js';
  

export let options = JSON.parse(open('./modules/test-types/'+__ENV.TEST_TYPE+'.json'));

let iunFile = open('./resources/NotificationIUN.txt');


export function setup() {
  let useIunFile = `${__ENV.USE_IUN_FILE}`
  if(useIunFile && useIunFile !== 'undefined') {
    let iunArray = iunFile.split(';');
    console.log("IUN_LENGTH: "+ iunArray.length);
    return iunArray
  }
  return sendNotificationToPn("FRMTTR76M06B715E").iun;
}



export default function getAndSendNotification(iun) {

  getNotification(iun);
  sendNotification();
}