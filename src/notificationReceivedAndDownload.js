import { check } from 'k6';
import exec from 'k6/execution';
import http from 'k6/http';
import { sendNotificationToPn } from './modules/sendNotification.js';

export let options = JSON.parse(open('./modules/test-types/'+__ENV.TEST_TYPE+'.json'));

let bearerToken = `${__ENV.BEARER_TOKEN_USER1}`
let basePath = `${__ENV.WEB_BASE_PATH}`
let iunFile = open('./resources/NotificationIUN.txt');

export function setup() {
  let taxId = `${__ENV.TAX_ID_USER1}`
  let useIunFile = `${__ENV.USE_IUN_FILE}`
  if(useIunFile && useIunFile !== 'undefined') {
    let iunArray = iunFile.split(';');
    console.log("IUN_LENGTH: "+ iunArray.length);
    return iunArray
  }
  return sendNotificationToPn(taxId).iun;
}

export default function recipientReadAndDownload(iun) {
    let useIunFile = `${__ENV.USE_IUN_FILE}`
    let currentIun = iun;
    if(useIunFile && useIunFile !== 'undefined') {
        currentIun = iun[exec.scenario.iterationInTest % iun.length].trim();
    }
     
    let url = `https://${basePath}/delivery/notifications/received/${currentIun}`;
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
            }
          };

          console.log('DOWNLOAD RES '+JSON.stringify(downloadRes.body));

          console.log("S3 URL: "+downloadRes.body.url);
          let downloadS3 = http.get(JSON.parse(downloadRes.body).url,paramsDownloadS3);
          
          check(downloadS3, {
            'status download-s3-document is 200': (r) => downloadS3.status === 200,
          });
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
            }
          };

          console.log("S3 URL: "+JSON.parse(paymentdownloadRes.body).url);

          let downloadS3 = http.get(JSON.parse(paymentdownloadRes.body).url,paramsDownloadS3);

          check(downloadS3, {
            'status download-S3-attach is 200': (r) => downloadS3.status === 200,
          });
    }
    
}



