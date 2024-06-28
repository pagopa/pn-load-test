import { check, sleep } from 'k6';
import crypto from 'k6/crypto';
import { SharedArray } from 'k6/data';
import encoding from 'k6/encoding';
import exec from 'k6/execution';
import http from 'k6/http';



export let options = JSON.parse(open('./modules/test-types/'+__ENV.TEST_TYPE+'.json'));

let notificationRequest = JSON.parse(open('./model/notificationRequest.json'));
let preloadFileRequest = JSON.parse(open('./model/preloadFile.json'));
let notificationDocument = JSON.parse(open('./model/notificationDocument.json'));
let paymentRequest = JSON.parse(open('./model/payment.json'));
let digitalDomicileRequest = JSON.parse(open('./model/digitalDomicile.json'));

let apiKey = `${__ENV.API_KEY}`;
let bearerToken = `${__ENV.BEARER_TOKEN_USER1}`;
let webBasePath = `${__ENV.WEB_BASE_PATH}`;
let basePath = `${__ENV.BASE_PATH}`;
let withGroup = `${__ENV.WITH_GROUP}`;
let digitalWorkflow = `${__ENV.DIGITAL_WORKFLOW}`;
let withPayment = `${__ENV.WITH_PAYMENT}`;
let paTaxId = `${__ENV.PA_TAX_ID}`;
let moreAttach = `${__ENV.MORE_ATTACH}`;
let randomAddress = `${__ENV.RANDOM_ADDRESS}`;

let sha256;
let pdfNumber = 3;





/**
 * ReceiverSearch.js
 */
export function internalRecipientSearch() {
    let url = `https://${webBasePath}/bff/v1/notifications/received?startDate=2023-05-29T00%3A00%3A00.000Z&endDate=2023-06-01T00%3A00%3A00.000Z&size=10`;
    
    let token = 'Bearer ' + bearerToken;

    console.log(`Url ${url}`);

    let params = {
      headers: {
      'Content-Type': 'application/json',
      'Authorization': token
      },
      responseType: 'none',
    };

    let r = http.get(url, params);

    console.log(`Notifications BFF Received search Status: ${r.status}`);
    
    check(r, {
      'status BFF search is 200': (r) => r.status === 200,
    });

    console.log(JSON.parse(r.body))

    sleep(1);
    return r;
 
}


/*************************************************************************************************** */


/**
 * Address.js
 */
export function internalRecipientAddress() {
    let url = `https://${webBasePath}/bff/v1/addresses`;
    
    let token = 'Bearer ' + bearerToken;

    console.log(`Url ${url}`);

    let params = {
      headers: {
      'Content-Type': 'application/json',
      'Authorization': token
      },
      responseType: 'none',
    };

    let r = http.get(url, params);

    console.log(`Notifications BFF Received Address Status: ${r.status}`);
    
    check(r, {
      'status BFF Address is 200': (r) => r.status === 200,
    });

    console.log(JSON.parse(r.body))

    sleep(1);
    return r;
 
}


/*************************************************************************************************** */


/**
 * Delegator.js
 */
export function internalRecipientDelegator() {
    let url = `https://${webBasePath}/bff/v1/mandate/delegator`;
    
    let token = 'Bearer ' + bearerToken;

    console.log(`Url ${url}`);

    let params = {
      headers: {
      'Content-Type': 'application/json',
      'Authorization': token
      },
      responseType: 'none',
    };

    let r = http.get(url, params);

    console.log(`Notifications BFF Delegator Status: ${r.status}`);
    
    check(r, {
      'status BFF Delegator is 200': (r) => r.status === 200,
    });

    console.log(JSON.parse(r.body))

    sleep(1);
    return r;
 
}

/*************************************************************************************************** */


/**
 * HelpDesk.js
 */
export function internalRecipientHelpDesk() {
    let url = `https://${webBasePath}/bff/v1/downtime/status`;
    
    let token = 'Bearer ' + bearerToken;

    console.log(`Url ${url}`);

    let params = {
      headers: {
      'Content-Type': 'application/json',
      'Authorization': token
      },
      responseType: 'none',
    };

    let r = http.get(url, params);

    console.log(`Notifications BFF HelpDesk  Status: ${r.status}`);
    
    check(r, {
      'status BFF HelpDesk is 200': (r) => r.status === 200,
    });

    console.log(JSON.parse(r.body))

    sleep(1);
    return r;
 
}

/*************************************************************************************************** */


/**
 * notificationReceiverdAndDownload.js
 */
export function internlRecipientReadAndDownload() {
    
    let currentIun = 'RKWH-GPRN-NJTZ-202406-H-1';
   
     
    let url = `https://${webBasePath}/bff/v1/notifications/received/${currentIun}`;
    let token = 'Bearer ' + bearerToken;

    console.log(`Url ${url}`);

    let params = {
      headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/plain, */*',
      'Authorization': token
      },
      tags: { name: 'getNotificationIun' },
    };

    let r = http.get(url, params);

    console.log(`Notifications BFF Received Iun Status: ${r.status}`);
    
    check(r, {
      'status BFF received-get is 200': (r) => r.status === 200,
    });


    let result = JSON.parse(r.body);
    console.log(JSON.stringify(result));

    result.documents.forEach(document => {
        let url = `https://${webBasePath}/bff/v1/notifications/received/${currentIun}/documents/ATTACHMENT?documentIdx=${document.docIdx}`;
        console.log('URL download: '+url);

        let downloadRes = http.get(url, params);
        check(downloadRes, {
            'status BFF received-download-document is 200': (r) => downloadRes.status === 200,
          });

     });

    
}


/*************************************************************************************************** */




/**
 * This test is the optimized version of the DeliverSendAndReceiverGetDownload.js test
 * 
 * The K6 memory leak is partially caused by the use of external modules
*/
export default function bffTest() {

    try{
      internalRecipientSearch();
    }catch(error){
      console.log('internalRecipientSearch error: ',error)
    }
  
    try{
      internlRecipientReadAndDownload();
    }catch(error){
      console.log('internlRecipientReadAndDownload error: ',error)
    }

    try{
        internalRecipientAddress();
      }catch(error){
        console.log('internalRecipientAddress error: ',error)
      }
  
      try{
        internalRecipientDelegator();
      }catch(error){
        console.log('internalRecipientDelegator error: ',error)
      }
  
      try{
        internalRecipientHelpDesk();
      }catch(error){
        console.log('internalRecipientHelpDesk error: ',error)
      }
  
  sleep(2);
}