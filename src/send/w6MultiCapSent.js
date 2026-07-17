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
let basePath = `${__ENV.BASE_PATH}`;
let withGroup = `${__ENV.WITH_GROUP}`;
let digitalWorkflow = `${__ENV.DIGITAL_WORKFLOW}`;
let withPayment = `${__ENV.WITH_PAYMENT}`;
let paTaxId = `${__ENV.PA_TAX_ID}`;
let moreAttach = `${__ENV.MORE_ATTACH}`;
let randomAddress = `${__ENV.RANDOM_ADDRESS}`;

let sha256;
let pdfNumber = 3;



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
      'status W7 preload is 200': (preloadResponse) => preloadResponse.status === 200,
  });

  check(preloadResponse, {
      'error W7 delivery-preload is 5xx': (preloadResponse) => preloadResponse.status >= 500,
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
          'status W7 safe-storage preload is 200': (safeStorageUploadResponde) => safeStorageUploadResponde.status === 200,
      });
  
      check(safeStorageUploadResponde, {
          'error W7 safeStorage is 5xx': (safeStorageUploadResponde) => safeStorageUploadResponde.status >= 500,
      });

      check(safeStorageUploadResponde, {
        'error W7 safeStorage is 501': (safeStorageUploadResponde) => safeStorageUploadResponde.status === 501,
    });
      
      console.log("SAFE_STORAGE PRELOAD: "+safeStorageUploadResponde.status);
      return resultPreload;   
  }
 
}

let address = [
  {cap: "70121", via: "Via Addis Abeba", province: "BA", municipality: "BARI" },
  {cap: "70122", via: "Corte Albero Lungo", province: "BA", municipality: "BARI" },
  {cap: "70132", via: "Via Abruzzi", province: "BA", municipality: "BARI" },
  {cap: "70123", via: "Via Ammiraglio Caracciolo", province: "BA", municipality: "BARI" },
  {cap: "70124", via: "Parco Adria", province: "BA", municipality: "BARI" },
  {cap: "70131", via: "Via Agostinelli", province: "BA", municipality: "BARI" },
  {cap: "70125", via: "Via Adige", province: "BA", municipality: "BARI" },
  {cap: "70126", via: "Via Abate Eustasio", province: "BA", municipality: "BARI" },
  {cap: "80124", via: "Via Acate", province: "NA", municipality: "NAPOLI" },
  {cap: "70127", via: "Via Adolfo la Volpe", province: "BA", municipality: "BARI" },
  {cap: "70128", via: "Via Alfredo Spilotros", province: "BA", municipality: "BARI" },
  {cap: "70129", via: "Via Ada Negri", province: "BA", municipality: "BARI" }
];

export function internalMultiCapSendNotification() {

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

    let currentAddress = address[exec.scenario.iterationInTest % address.length];

    notificationRequest.recipients[0].physicalAddress.at = currentAddress.via+' '+number;
    console.log('ADDRESS: '+notificationRequest.recipients[0].physicalAddress.at);
    notificationRequest.recipients[0].physicalAddress.address = currentAddress.via+' '+number;
    notificationRequest.recipients[0].physicalAddress.zip = currentAddress.cap;
    notificationRequest.recipients[0].physicalAddress.municipality = currentAddress.municipality;
    notificationRequest.recipients[0].physicalAddress.municipalityDetails = currentAddress.municipality;
    notificationRequest.recipients[0].physicalAddress.province = currentAddress.province;
    
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
export default function w6TestOptimizedMultiCap() {
  
    internalMultiCapSendNotification();
  
  sleep(2);
}