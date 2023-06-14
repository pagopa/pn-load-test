import { check, sleep } from 'k6';
import crypto from 'k6/crypto';
import { SharedArray } from 'k6/data';
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
let useIunFile = `${__ENV.USE_IUN_FILE}`;
let withGroup = `${__ENV.WITH_GROUP}`;
let digitalWorkflow = `${__ENV.DIGITAL_WORKFLOW}`;
let withPayment = `${__ENV.WITH_PAYMENT}`;
let paTaxId = `${__ENV.PA_TAX_ID}`;
let moreAttach = `${__ENV.MORE_ATTACH}`;

let sha256;
let pdfNumber = 3;

const iunArray = new SharedArray('iun sharedArray', function () {
  let iunFile = open('./resources/NotificationIUN.txt');
  if(iunFile){
    const dataArray =  iunFile.split(';');
    console.log("IUN_LENGTH: "+ dataArray.length);
    return dataArray; // must be an array
  }else{
    const dataArray = [];
    return dataArray;
  }
});

const fileArray = new SharedArray('bin file sharedArray', function () {
    const dataArray = [];
    dataArray.push(open('./resources/AvvisoPagoPA.pdf', 'b'));
    for(let i = 0; i< pdfNumber; i++){
        dataArray.push(open('./resources/PDF_'+(i+1)+'.pdf', 'b'));
    }
    return dataArray; // must be an array
});


/**
 * ReceiverSearch.js
 */
export function internalRecipientSearch() {
    let url = `https://${webBasePath}/delivery/notifications/received?startDate=2023-05-29T00%3A00%3A00.000Z&endDate=2023-06-01T00%3A00%3A00.000Z&size=10`;
    
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

    console.log(`Notifications Received search Status: ${r.status}`);
    
    check(r, {
      'status search is 200': (r) => r.status === 200,
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
    
    let currentIun = 'NKLW-WLER-PHUE-202306-P-1';
    if(useIunFile && useIunFile !== 'undefined') {
      currentIun = iunArray[exec.scenario.iterationInTest % iunArray.length].trim();
    }
     
    let url = `https://${webBasePath}/delivery/notifications/received/${currentIun}`;
    let token = 'Bearer ' + bearerToken;

    console.log(`Url ${url}`);

    let params = {
      headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/plain, */*',
      'Authorization': token
      }
    };

    let r = http.get(url, params);

    console.log(`Notifications Received Iun Status: ${r.status}`);
    
    check(r, {
      'status received-get is 200': (r) => r.status === 200,
    });


    let result = JSON.parse(r.body);
    console.log(JSON.stringify(result));

    result.documents.forEach(document => {
        let url = `https://${webBasePath}/delivery/notifications/received/${currentIun}/attachments/documents/${document.docIdx}`;
        console.log('URL download: '+url);

        let downloadRes = http.get(url, params);
        check(downloadRes, {
            'status received-download-document is 200': (r) => downloadRes.status === 200,
          });

          let paramsDownloadS3 = {
            headers: {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'Host': 'pn-safestorage-eu-south-1-089813480515.s3.eu-south-1.amazonaws.com'
            },
            responseType: 'none',
          };

          console.log('DOWNLOAD RES '+JSON.stringify(downloadRes.body));

          console.log("S3 URL: "+downloadRes.body.url);
          let downloadS3 = http.get(JSON.parse(downloadRes.body).url,paramsDownloadS3);
          
          check(downloadS3, {
            'status download-s3-document is 200': (r) => downloadS3.status === 200,
          });
     });

    
    if(result.recipients[0].payment && result.recipients[0].payment.pagoPaForm){

        let urlPaymentDownload = `https://${webBasePath}/delivery/notifications/received/${currentIun}/attachments/payment/PAGOPA`;
        console.log('URL download-payment: '+urlPaymentDownload);
    
        let paymentdownloadRes = http.get(urlPaymentDownload, params);
    
        check(paymentdownloadRes, {
            'status received-download-attach is 200': (r) => paymentdownloadRes.status === 200,
        });    


        console.log('PAYMENT DOWNLOAD RES '+JSON.stringify(paymentdownloadRes.body));

        let paramsDownloadS3 = {
            headers: {
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            },
            responseType: 'none',
          };

          console.log("S3 URL: "+JSON.parse(paymentdownloadRes.body).url);

          let downloadS3 = http.get(JSON.parse(paymentdownloadRes.body).url,paramsDownloadS3);

          check(downloadS3, {
            'status download-S3-attach is 200': (r) => downloadS3.status === 200,
          });
    }
    
}


/*************************************************************************************************** */



/**
 * DeliverySendNotification.js
*/
export function internalPreloadFile(onlyPreloadUrl, otherFile) {
    let currBinFile = fileArray[0];
    if(otherFile){
        currBinFile = fileArray[otherFile%pdfNumber]
    }
    

    sha256 = crypto.sha256(currBinFile, 'base64');
    console.log('Sha: '+sha256);

    console.log('Apikey: '+apiKey);

    let url = `https://${basePath}/delivery/attachments/preload`;

    let paramsDeliveryPreload = {
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey
        },
    };

    preloadFileRequest[0].sha256 = sha256;
    let payload = JSON.stringify(preloadFileRequest);
    console.log('body: '+payload);
    let preloadResponse = http.post(url, payload, paramsDeliveryPreload);
    
    console.log("DELIVERY PRELOAD: "+preloadResponse.status);

    check(preloadResponse, {
        'status preload is 200': (preloadResponse) => preloadResponse.status === 200,
    });

    check(preloadResponse, {
        'error delivery-preload is 5xx': (preloadResponse) => preloadResponse.status >= 500,
    });
    
    /*
    "secret": "...",
    "httpMethod": "PUT",
    "url": "..."
    */

    if(!onlyPreloadUrl){
        let resultPreload = JSON.parse(preloadResponse.body)[0];
        let paramsSafeStorage = {
            headers: {
                'Content-Type': 'application/pdf',
                'x-amz-checksum-sha256': sha256,
                'x-amz-meta-secret': resultPreload.secret,
            },
            responseType: 'none',
        };
    
        let urlSafeStorage = resultPreload.url;
        
        let safeStorageUploadResponde = http.put(urlSafeStorage, currBinFile.buffer, paramsSafeStorage);
    
        check(safeStorageUploadResponde, {
            'status safe-storage preload is 200': (safeStorageUploadResponde) => safeStorageUploadResponde.status === 200,
        });
    
        check(safeStorageUploadResponde, {
            'error safeStorage is 5xx': (safeStorageUploadResponde) => safeStorageUploadResponde.status >= 500,
        });
        
        console.log("SAFE_STORAGE PRELOAD: "+safeStorageUploadResponde.status);
        return resultPreload;   
    }
   
}

export function internalSendNotification() {

    let resultPreload = internalPreloadFile();

    notificationRequest.documents[0].ref.key = resultPreload.key;
    notificationRequest.documents[0].digests.sha256 = sha256;

    if(moreAttach && moreAttach !== 'undefined') {
        for(let i = 1; i <= moreAttach; i++){
            let preloadDocument = internalPreloadFile(false,i);
            notificationDocument.ref.key = preloadDocument.key;
            notificationDocument.digests.sha256 = sha256;
            notificationDocument.title = 'TEST_PDF_'+i;

            notificationRequest.documents[i] = JSON.parse(JSON.stringify(notificationDocument));
        }
    }


    
    let url = `https://${basePath}/delivery/requests`;

     let params = {
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey
        },
    };

    if(withGroup && withGroup !== 'undefined') {
        let gruopUrl = `https://${basePath}/ext-registry-b2b/pa/v1/groups?metadataOnly=true`;
        let groupList = JSON.parse((http.get(gruopUrl, params)).body);
        console.log(JSON.stringify(groupList));
        let group = groupList.find((elem) => elem.status === 'ACTIVE');
        notificationRequest.group = group.id;
    }

    if(withPayment && withPayment !== 'undefined') {
        let paymentAttachPreload = internalPreloadFile();
        paymentRequest.noticeCode = ("3" + (((exec.scenario.iterationInTest+''+exec.vu.idInTest+''+(Math.floor(Math.random() * 9999999))).substring(0,7) +''+ new Date().getTime().toString().substring(3,13)).padStart(17, '0').substring(0, 17)));
        paymentRequest.pagoPaForm.digests.sha256 = sha256;
        paymentRequest.pagoPaForm.ref.key = paymentAttachPreload.key;
        notificationRequest.recipients[0].payment = paymentRequest;
    }

    if(digitalWorkflow && digitalWorkflow !== 'undefined') {
        notificationRequest.recipients[0].digitalDomicile = digitalDomicileRequest;
    }

    notificationRequest.senderTaxId = paTaxId;

    notificationRequest.paProtocolNumber = ("2023" + (((exec.scenario.iterationInTest+''+exec.vu.idInTest+''+(Math.floor(Math.random() * 9999999))).substring(0,7) +''+ new Date().getTime().toString().substring(0,13)).padStart(20, '0').substring(0, 20)));

    console.log('paprotocol: '+notificationRequest.paProtocolNumber);
    let payload = JSON.stringify(notificationRequest);

    console.log('notificationRequest: '+JSON.stringify(notificationRequest));

    let r = http.post(url, payload, params);

    console.log(`Status ${r.status}`);

    check(r, {
        'status is 409': (r) => r.status === 409,
    });

    check(r, {
        'status is 202': (r) => r.status === 202,
    });
    
    console.log('REQUEST-ID-LOG: '+r.body)

    if (r.status === 403) {
        throttling.add(1);
     }

    

    return r;
  
}




/**
 * This test is the optimized version of the DeliverSendAndReceiverGetDownload.js test
 * 
 * The K6 memory leak is partially caused by the use of external modules
*/
export default function w6TestOptimized() {
    sleep(2);
    
    internalRecipientSearch();
    internlRecipientReadAndDownload();
    internalSendNotification();

    sleep(7);
}