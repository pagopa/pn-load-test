import { URL } from 'https://jslib.k6.io/url/1.0.0/index.js';
import { sleep } from 'k6';
import http from 'k6/http';
import sentNotification from '/DeliverySendNotification.js';

export function sendNotificationToPn(userTaxId){

    var envName = `${__ENV.ENV_NAME}`
    var apiKey = `${__ENV.API_KEY}`

    var result = JSON.parse(sentNotification(userTaxId).body);
    console.log('result: '+result.notificationRequestId);
    var url = new URL(`https://api.${envName}.pn.pagopa.it/delivery/requests`);
    url.searchParams.append('notificationRequestId', result.notificationRequestId);

    var params = {
        headers: {
         'Content-Type': 'application/json',
         'x-api-key': apiKey
        },
    };
    for(let i = 0; i < 8; i++){
        sleep(30);
        var notification = http.get(url.toString(), params);
        notification = JSON.parse(notification.body);
    
        if(notification && notification.iun){
         console.log("IUN: "+notification.iun)
        return notification.iun;
        }
        console.log(JSON.stringify(notification))
    }
}