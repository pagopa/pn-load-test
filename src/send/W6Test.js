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
let useIunFile = `${__ENV.USE_IUN_FILE}`;
let withGroup = `${__ENV.WITH_GROUP}`;
let digitalWorkflow = `${__ENV.DIGITAL_WORKFLOW}`;
let withPayment = `${__ENV.WITH_PAYMENT}`;
let paTaxId = `${__ENV.PA_TAX_ID}`;
let moreAttach = `${__ENV.MORE_ATTACH}`;
let randomAddress = `${__ENV.RANDOM_ADDRESS}`;

let sha256;
let pdfNumber = 3;

let iunArray = new SharedArray('iun sharedArray w6', function () {
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


const fileArray = new SharedArray('bin file sharedArray w6', function () {
    const dataArray = [];
    
    var obj = {'fileString': encoding.b64encode(open('./resources/AvvisoPagoPA.pdf','b'))}
    dataArray.push(obj);
    for(let i = 0; i< pdfNumber; i++){
      var obj = {'fileString': encoding.b64encode(open('./resources/PDF_'+(i+1)+'.pdf','b'))}
        dataArray.push(obj);
    }
    return dataArray; // must be an array
});

/*
let binFile = open('./resources/AvvisoPagoPA.pdf', 'b');


let anotherBinFile = [];
//let pdfNumber = 3;
for(let i = 0; i< pdfNumber; i++){
    anotherBinFile[i] = open('./resources/PDF_'+(i+1)+'.pdf', 'b');
}
*/


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

    console.log(`Notifications W6 Received search Status: ${r.status}`);
    
    check(r, {
      'status W6 search is 200': (r) => r.status === 200,
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

    console.log(`Notifications W6 Received Iun Status: ${r.status}`);
    
    check(r, {
      'status W6 received-get is 200': (r) => r.status === 200,
    });


    let result = JSON.parse(r.body);
    console.log(JSON.stringify(result));

    result.documents.forEach(document => {
        let url = `https://${webBasePath}/bff/v1/notifications/received/${currentIun}/documents/ATTACHMENT?documentIdx=${document.docIdx}`;
        console.log('URL download: '+url);

        let downloadRes = http.get(url, params);
        check(downloadRes, {
            'status W6 received-download-document is 200': (r) => downloadRes.status === 200,
          });

          let paramsDownloadS3 = {
            headers: {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'Host': 'pn-safestorage-eu-south-1-089813480515.s3.eu-south-1.amazonaws.com'
            },
            responseType: 'none',
            tags: { name: 'getNotificationDownload' },
          };

          console.log('DOWNLOAD RES '+JSON.stringify(downloadRes.body));

          console.log("S3 URL: "+JSON.parse(downloadRes.body).url);
          let downloadS3 = http.get(JSON.parse(downloadRes.body).url,paramsDownloadS3);
          
          check(downloadS3, {
            'status W6 download-s3-document is 200': (r) => downloadS3.status === 200,
          });
     });

     
     result.timeline.forEach(timelineArray => {
        timelineArray.legalFactsIds.forEach(timelineElem =>{
          
          let key = timelineElem.key;
          let keySearch;
          if (key.includes("PN_LEGAL_FACTS")) {
            keySearch = key.substring(key.indexOf("PN_LEGAL_FACTS"));
          } else if (key.includes("PN_NOTIFICATION_ATTACHMENTS")) {
            keySearch = key.substring(key.indexOf("PN_NOTIFICATION_ATTACHMENTS"));
          } else if (key.includes("PN_EXTERNAL_LEGAL_FACTS")) {
            keySearch = key.substring(key.indexOf("PN_EXTERNAL_LEGAL_FACTS"));
          }
          console.log(keySearch);
  
          let url = `https://${basePath}/delivery-push/${currentIun}/legal-facts/${timelineElem.category}/${keySearch}`
          //console.log('URL download atto opponibile: '+url);
    
          let paramsLegalFact = {
            headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json, text/plain, */*',
            'x-api-key': apiKey
            },
            tags: { name: 'getLegalFact' },
          };
  
          let downloadLegalFact = http.get(url, paramsLegalFact);
  
          check(downloadLegalFact, {
              'status W6 received-download-LegalFact is 200': (r) => downloadLegalFact.status === 200,
            });
    
            let paramsDownloadS3LegalFact = {
              headers: {
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
              'Accept-Encoding': 'gzip, deflate, br',
              'Host': 'pn-safestorage-eu-south-1-089813480515.s3.eu-south-1.amazonaws.com'
              },
              responseType: 'none',
              tags: { name: 'getLegalFactDownload' },
            };
    
            //console.log('DOWNLOAD LEGAL FACT RES '+JSON.stringify(downloadLegalFact.body));
    
            console.log("S3 URL: "+JSON.parse(downloadLegalFact.body).url);
            let downloadLegalFactS3 = http.get(JSON.parse(downloadLegalFact.body).url,paramsDownloadS3LegalFact);
            
            check(downloadLegalFactS3, {
              'status W6 download-s3-LegalFact is 200': (r) => downloadLegalFactS3.status === 200,
            });
        })
     });
     
    
    if(result.recipients[0].payment && result.recipients[0].payment.pagoPaForm){

        let urlPaymentDownload = `https://${webBasePath}/delivery/notifications/received/${currentIun}/attachments/payment/PAGOPA?attachmentIdx=0`;
        console.log('URL download-payment: '+urlPaymentDownload);
    
        let paymentdownloadRes = http.get(urlPaymentDownload, params);
    
        check(paymentdownloadRes, {
            'status W6 received-download-attach is 200': (r) => paymentdownloadRes.status === 200,
        });    


        console.log('PAYMENT DOWNLOAD RES '+JSON.stringify(paymentdownloadRes.body));

        let paramsDownloadS3 = {
            headers: {
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            },
            responseType: 'none',
            tags: { name: 'getNotificationDownloads' },
          };

          console.log("S3 URL: "+JSON.parse(paymentdownloadRes.body).url);

          let downloadS3 = http.get(JSON.parse(paymentdownloadRes.body).url,paramsDownloadS3);

          check(downloadS3, {
            'status W6 download-S3-attach is 200': (r) => downloadS3.status === 200,
          });
    }
    
}


/*************************************************************************************************** */


/**
 * DeliverySendNotification.js
*/
export function internalPreloadFile(onlyPreloadUrl, otherFile) {
    let currBinFile = encoding.b64decode(fileArray[0].fileString);
    if(otherFile){
        currBinFile = encoding.b64decode(fileArray[otherFile%pdfNumber].fileString);
    }
  
    
    //console.log('BIN FILE: '+currBinFile);

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
        'status W6 preload is 200': (preloadResponse) => preloadResponse.status === 200,
    });

    check(preloadResponse, {
        'error W6 delivery-preload is 5xx': (preloadResponse) => preloadResponse.status >= 500,
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
                'Content-Length' : currBinFile.byteLength,
                'x-amz-meta-secret': resultPreload.secret,
            },
            responseType: 'none',
            tags: { name: 'getSafeStorageUrl' },
        };
    
        let urlSafeStorage = resultPreload.url;
        
        let safeStorageUploadResponde = http.put(urlSafeStorage, currBinFile, paramsSafeStorage);
    
        check(safeStorageUploadResponde, {
            'status W6 safe-storage preload is 200': (safeStorageUploadResponde) => safeStorageUploadResponde.status === 200,
        });
    
        check(safeStorageUploadResponde, {
            'error W6 safeStorage is 5xx': (safeStorageUploadResponde) => safeStorageUploadResponde.status >= 500,
        });

        check(safeStorageUploadResponde, {
          'error W6 safeStorage is 501': (safeStorageUploadResponde) => safeStorageUploadResponde.status === 501,
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

    let number;
    if(randomAddress && randomAddress !== 'undefined'){
        number = exec.scenario.iterationInTest % 3000;
        if(number == 0){
            number = 1;
        }
    }else{
        number = 310;
    }

    notificationRequest.recipients[0].physicalAddress.at = 'VIALE C. COLOMBO '+number;
    console.log('ADDRESS: '+notificationRequest.recipients[0].physicalAddress.at);
    notificationRequest.recipients[0].physicalAddress.address = 'VIALE C. COLOMBO '+number;
    /*notificationRequest.recipients[0].physicalAddress.zip = '00100';
    notificationRequest.recipients[0].physicalAddress.municipality = 'roma';
    notificationRequest.recipients[0].physicalAddress.municipalityDetails = 'roma';
    notificationRequest.recipients[0].physicalAddress.province = 'RM';
    */
    notificationRequest.recipients[0].physicalAddress.zip = '87100';
    notificationRequest.recipients[0].physicalAddress.municipality = 'Cosenza';
    notificationRequest.recipients[0].physicalAddress.municipalityDetails = 'Cosenza';
    notificationRequest.recipients[0].physicalAddress.province = 'CS';
    
    let url = `https://${basePath}/delivery/v2.5/requests`;

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
        //console.log('Payment-request: '+JSON.stringify(paymentRequest));
        //console.log('Payment-request[0]: '+JSON.stringify(paymentRequest[0]));
        //console.log('Payment-request[0].pagopa: '+JSON.stringify(paymentRequest[0].pagoPa));

        paymentRequest[0].pagoPa.noticeCode = ("3" + (((exec.scenario.iterationInTest+''+exec.vu.idInTest+''+(Math.floor(Math.random() * 9999999))).substring(0,7) +''+ new Date().getTime().toString().substring(3,13)).padStart(17, '0').substring(0, 17)));
        paymentRequest[0].pagoPa.attachment.digests.sha256 = sha256;
        paymentRequest[0].pagoPa.attachment.ref.key = paymentAttachPreload.key;
        notificationRequest.recipients[0].payments = paymentRequest;
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
        'status W6 is 409': (r) => r.status === 409,
    });

    check(r, {
        'status W6 is 202': (r) => r.status === 202,
    });
    
    console.log('REQUEST-ID-LOG: '+r.body)

    

    return r;
  
}




/**
 * This test is the optimized version of the DeliverSendAndReceiverGetDownload.js test
 * 
 * The K6 memory leak is partially caused by the use of external modules
*/
export default function w6TestOptimized(onlySend,externalIun) {

  if(!onlySend){
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
  }
  

  
    internalSendNotification();
  
  

  sleep(2);
}