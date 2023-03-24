import { URL } from 'https://jslib.k6.io/url/1.0.0/index.js';
import { sleep } from 'k6';
import http from 'k6/http';
import sendNotification from '/DeliverySendNotification.js';

export function sendNotificationToPn(userTaxId){

    let envName = `${__ENV.ENV_NAME}`
    let apiKey = `${__ENV.API_KEY}`

    let result = JSON.parse(sendNotification(userTaxId).body);
    console.log('result: '+result.notificationRequestId);
    let url = new URL(`https://api.${envName}.pn.pagopa.it/delivery/requests`);
    url.searchParams.append('notificationRequestId', result.notificationRequestId);

    let params = {
        headers: {
         'Content-Type': 'application/json',
         'x-api-key': apiKey
        },
    };
    for(let i = 0; i < 8; i++){
        sleep(30);
        let notification = http.get(url.toString(), params);
        notification = JSON.parse(notification.body);
    
        if(notification && notification.iun){
            console.log("IUN: "+notification.iun)
            return {iun: notification.iun, requestId: result.notificationRequestId};
        }
        console.log(JSON.stringify(notification))
    }
}