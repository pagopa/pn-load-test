import { check } from 'k6';
import { SharedArray } from 'k6/data';
import exec from 'k6/execution';
import http from 'k6/http';
import { sendNotificationToPn } from './modules/sendNotification.js';

export let options = JSON.parse(open('./modules/test-types/'+__ENV.TEST_TYPE+'.json'));

let bearerToken = `${__ENV.BEARER_TOKEN_USER1}`
let basePath = `${__ENV.WEB_BASE_PATH}`

const iunArray = new SharedArray('iun sharedArray', function () {
  let iunFile = open('./resources/NotificationIUN.txt');
  if(iunFile){
    let dataArray = [];
    dataArray =  iunFile.split(';');
    console.log("IUN_LENGTH: "+ dataArray.length);
    return dataArray; // must be an array
  }else{
    const dataArray = [];
    return dataArray;
  }
});

//let iunFile = open('./resources/NotificationIUN.txt');

export function setup() {
  let useIunFile = `${__ENV.USE_IUN_FILE}`
  if(!useIunFile || useIunFile === 'undefined') {
    let taxId = `${__ENV.TAX_ID_USER1}`
    return sendNotificationToPn(taxId).iun;
  } 
}

export default function recipientReadAndDownload(iun) {
    let useIunFile = `${__ENV.USE_IUN_FILE}`
    let currentIun = iun;
    if(useIunFile && useIunFile !== 'undefined') {
      console.log('USO FILE');
      currentIun = iunArray[exec.scenario.iterationInTest % iunArray.length].trim();
      console.log('IUN: '+currentIun);
    }
     
    let url = `https://${basePath}/delivery/notifications/received/${currentIun}`;
    let token = 'Bearer ' + bearerToken;

    console.log(`Url ${url}`);

    let params = {
      headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/plain, */*',
      'Authorization': token
      },
      tags: { name: 'getNotificationIUn' },
    };

    let r = http.get(url, params);

    console.log(`Notifications Received Iun Status: ${r.status}`);
    
    check(r, {
      'status received-get is 200': (r) => r.status === 200,
    });


    let result = JSON.parse(r.body);
    console.log(JSON.stringify(result));

    console.log('JSON: '+result);

    result.documents.forEach(document => {
        let url = `https://${basePath}/delivery/notifications/received/${currentIun}/attachments/documents/${document.docIdx}`;
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
            tags: { name: 'getNotificationDownload' },
          };

          console.log('DOWNLOAD RES '+JSON.stringify(downloadRes.body));

          console.log("S3 URL: "+downloadRes.body.url);
          let downloadS3 = http.get(JSON.parse(downloadRes.body).url,paramsDownloadS3);
          
          check(downloadS3, {
            'status download-s3-document is 200': (r) => downloadS3.status === 200,
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
        console.log('URL download atto opponibile: '+url);
  
        let paramsLegalFact = {
          headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/plain, */*',
          'Authorization': token
          },
          tags: { name: 'getLegalFact' },
        };

        let downloadLegalFact = http.get(url, paramsLegalFact);

        check(downloadLegalFact, {
            'status received-download-LegalFact is 200': (r) => downloadLegalFact.status === 200,
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
  
          console.log('DOWNLOAD LEGAL FACT RES '+JSON.stringify(downloadLegalFact.body));
  
          console.log("S3 URL: "+downloadLegalFact.body.url);
          let downloadLegalFactS3 = http.get(JSON.parse(downloadLegalFact.body).url,paramsDownloadS3LegalFact);
          
          check(downloadLegalFactS3, {
            'status download-s3-LegalFact is 200': (r) => downloadLegalFactS3.status === 200,
          });
      })
   });

    
    if(result.recipients[0].payment && result.recipients[0].payment.pagoPaForm){

        let urlPaymentDownload = `https://${basePath}/delivery/notifications/received/${currentIun}/attachments/payment/PAGOPA`;
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
            tags: { name: 'getNotificationDownloads' },
          };

          console.log("S3 URL: "+JSON.parse(paymentdownloadRes.body).url);

          let downloadS3 = http.get(JSON.parse(paymentdownloadRes.body).url,paramsDownloadS3);

          check(downloadS3, {
            'status download-S3-attach is 200': (r) => downloadS3.status === 200,
          });
    }
    
}



