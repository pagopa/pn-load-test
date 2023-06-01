import sendNotification from './DeliverySendNotification.js';
import recipientSearch from './ReceiverSearch.js';
import { sendNotificationToPn } from './modules/sendNotification.js';
import recipientReadAndDownload from './notificationReceivedAndDownload.js';
  

export let options = JSON.parse(open('./modules/test-types/'+__ENV.TEST_TYPE+'.json'));

let iunFile = open('./resources/NotificationIUN.txt');


export function setup() {
  let useIunFile = `${__ENV.USE_IUN_FILE}`
  if(useIunFile && useIunFile !== 'undefined') {
    let iunArray = iunFile.split(';');
    console.log("IUN_LENGTH: "+ iunArray.length);
    return iunArray
  }
  return sendNotificationToPn("GLLGLL64B15G702I").iun;
}


export default function getAndSendNotification(iun) {
    
    recipientSearch();
    recipientReadAndDownload(iun);
    sendNotification();
}