import sendNotification from './DeliverySendNotification.js';
import recipientSearch from './ReceiverSearch.js';
import recipientReadAndDownload from './notificationReceivedAndDownload.js';

export let options = JSON.parse(open('./modules/test-types/'+__ENV.TEST_TYPE+'.json'));



export default function w6Test() {
    
    recipientSearch();
    recipientReadAndDownload();
    sendNotification();
    
    sleep(2);
}