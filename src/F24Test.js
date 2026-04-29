import { check, sleep } from 'k6';
import crypto from 'k6/crypto';
import { SharedArray } from 'k6/data';
import encoding from 'k6/encoding';
import exec from 'k6/execution';
import http from 'k6/http';
import { internalPreloadFile as w7InternalPreloadFile } from './W7Test.js';
import { getSha256 as w7sha256 } from './W7Test.js';


export let options = JSON.parse(open('./modules/test-types/'+__ENV.TEST_TYPE+'.json'));

let notificationRequest = JSON.parse(open('./model/notificationRequest.json'));
let preloadFileRequest = JSON.parse(open('./model/preloadFile.json'));
let preloadFileF24Request = JSON.parse(open('./model/preloadFileF24.json'));
let paymentRequestf24 = JSON.parse(open('./model/paymentF24.json'));
let digitalDomicileRequest = JSON.parse(open('./model/digitalDomicile.json'));

let apiKey = `${__ENV.API_KEY}`;
let basePath = `${__ENV.BASE_PATH}`;
let withGroup = `${__ENV.WITH_GROUP}`;
let digitalWorkflow = `${__ENV.DIGITAL_WORKFLOW}`;
let paTaxId = `${__ENV.PA_TAX_ID}`;


let sha256;
let pdfNumber = 3;
const PAYMENTS_PER_RECIPIENT = 5;
const F24_RECIPIENTS_COUNT = 0;
const NOTICE_RUN_SEED = String(Date.now()).slice(-6);


const fileArray = new SharedArray('bin file sharedArray attach', function () {
    const dataArray = [];
    
    var obj = {'fileString': encoding.b64encode(open('./resources/AvvisoPagoPA.pdf','b'))}
    dataArray.push(obj);
    for(let i = 0; i< pdfNumber; i++){
      var obj = {'fileString': encoding.b64encode(open('./resources/PDF_'+(i+1)+'.pdf','b'))}
        dataArray.push(obj);
    }
    
    return dataArray; // must be an array
});


const f24Array = new SharedArray('bin file sharedArray F24', function () {
    const dataArray2 = [];
    
    //var obj2 = {'fileString': encoding.b64encode(open('./resources/METADATA_STANDARD_GRANDE.json'))}
    var obj2 = {'fileString': encoding.b64encode(open('./resources/METADATA_f24.json'))}
    dataArray2.push(obj2);
    
    return dataArray2; // must be an array
});



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
    
    console.log("DELIVERY PRELOAD: "+JSON.stringify(preloadResponse));

    check(preloadResponse, {
        'status attach-F24 preload is 200': (preloadResponse) => preloadResponse.status === 200,
    });

    check(preloadResponse, {
        'error attach-F24 delivery-preload is 5xx': (preloadResponse) => preloadResponse.status >= 500,
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
            'status attach-F24 safe-storage preload is 200': (safeStorageUploadResponde) => safeStorageUploadResponde.status === 200,
        });
    
        check(safeStorageUploadResponde, {
            'error attach-F24 safeStorage is 5xx': (safeStorageUploadResponde) => safeStorageUploadResponde.status >= 500,
        });

        check(safeStorageUploadResponde, {
          'error attach-F24 safeStorage is 501': (safeStorageUploadResponde) => safeStorageUploadResponde.status === 501,
      });
        
        console.log("SAFE_STORAGE PRELOAD: "+safeStorageUploadResponde.status);
        return resultPreload;   
    }
   
}



export function preloadF24() {
    
    let currBinFile = encoding.b64decode(f24Array[f24Array.length-1].fileString);
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

    preloadFileF24Request[0].sha256 = sha256;
    //preloadFileF24Request[0].contentType = 'application/json'
    
    let payload = JSON.stringify(preloadFileF24Request);
    //console.log('body: '+payload);
    let preloadResponse = http.post(url, payload, paramsDeliveryPreload);
    
    console.log("DELIVERY PRELOAD: "+JSON.stringify(preloadResponse));

    check(preloadResponse, {
        'status F24 preload is 200': (preloadResponse) => preloadResponse.status === 200,
    });

    check(preloadResponse, {
        'error F24 delivery-preload is 5xx': (preloadResponse) => preloadResponse.status >= 500,
    });
    
   //console.log('\n'+'RESULT PRELOAD:'+JSON.stringify(preloadResponse.body)+'\n');
    let resultPreload = JSON.parse(preloadResponse.body)[0];
    let paramsSafeStorage = {
        headers: {
            'Content-Type': 'application/json',
            'x-amz-checksum-sha256': sha256,
            'Content-Length' : currBinFile.byteLength,
            'x-amz-meta-secret': resultPreload.secret,
        },
        responseType: 'none',
        tags: { name: 'getSafeStorageUrl2' },
    };
    
    //console.log('SAFE-STORAGE-PARAMS: '+JSON.stringify(paramsSafeStorage));
    

    let urlSafeStorage = resultPreload.url;

    //console.log('SAFE-STORAGE-urlSafeStorage: '+urlSafeStorage);
        
    let safeStorageUploadResponde = http.put(urlSafeStorage, currBinFile, paramsSafeStorage);
    
    check(safeStorageUploadResponde, {
        'status F24 safe-storage preload is 200': (safeStorageUploadResponde) => safeStorageUploadResponde.status === 200,
    });
    
    check(safeStorageUploadResponde, {
        'error F24 safeStorage is 5xx': (safeStorageUploadResponde) => safeStorageUploadResponde.status >= 500,
    });

    check(safeStorageUploadResponde, {
        'error F24 safeStorage is 501': (safeStorageUploadResponde) => safeStorageUploadResponde.status === 501,
    });
        
    console.log("SAFE_STORAGE PRELOAD: "+safeStorageUploadResponde.status);
    return resultPreload;   
   
}


export function internalSendF24Notification() {
  
    let resultPreload = internalPreloadFile();

    notificationRequest.documents[0].ref.key = resultPreload.key;
    notificationRequest.documents[0].digests.sha256 = sha256;


    notificationRequest.recipients[0].physicalAddress.at = 'Via Primo maggio 34';
    console.log('ADDRESS: '+notificationRequest.recipients[0].physicalAddress.at);
    notificationRequest.recipients[0].physicalAddress.address = 'Via Primo maggio 34';
    notificationRequest.recipients[0].physicalAddress.zip = '00013';
    notificationRequest.recipients[0].physicalAddress.municipality = 'Tor Lupara';
    notificationRequest.recipients[0].physicalAddress.municipalityDetails = 'Tor Lupara';
    notificationRequest.recipients[0].physicalAddress.province = 'RM';
    
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

   
    let paymentAttachPreload = preloadF24();
    //console.log('paymentF24'+JSON.stringify(paymentRequestf24));
    paymentRequestf24[0].f24.metadataAttachment.digests.sha256 = sha256;
    paymentRequestf24[0].f24.metadataAttachment.ref.key = paymentAttachPreload.key;
    notificationRequest.recipients[0].payments = paymentRequestf24;

    
    console.log(JSON.stringify(notificationRequest.recipients[0]));
    
    notificationRequest.notificationFeePolicy = "DELIVERY_MODE";
    notificationRequest.paFee = 0;
    notificationRequest.vat = 0;

    if(digitalWorkflow && digitalWorkflow !== 'undefined') {
        notificationRequest.recipients[0].digitalDomicile = digitalDomicileRequest;
    }
    notificationRequest.recipients[0].digitalDomicile.address="test@pecOk.it";

    notificationRequest.senderTaxId = paTaxId;

    notificationRequest.paProtocolNumber = ("2023" + (((exec.scenario.iterationInTest+''+exec.vu.idInTest+''+(Math.floor(Math.random() * 9999999))).substring(0,7) +''+ new Date().getTime().toString().substring(0,13)).padStart(20, '0').substring(0, 20)));

    console.log('paprotocol: '+notificationRequest.paProtocolNumber);
    let payload = JSON.stringify(notificationRequest);

    console.log('notificationRequest: '+JSON.stringify(notificationRequest));

    console.log('URL: '+url);
    console.log('params: '+JSON.stringify(params));
    let r = http.post(url, payload, params);

    console.log(`Status ${r.status}`);

    check(r, {
        'status F24 is 409': (r) => r.status === 409,
    });

    check(r, {
        'status F24 is 403': (r) => r.status === 403,
    });

    check(r, {
        'status F24 is 202': (r) => r.status === 202,
    });
    
    console.log('REQUEST-ID-LOG: '+r.body)


    return r;
  
}




/**
 * This test is the optimized version of the DeliverSendAndReceiverGetDownload.js test
 * 
 * The K6 memory leak is partially caused by the use of external modules
*/
export default function F24TestOptimized(onlySend,externalIun) {

  
    internalSendF24NotificationNew();
 
  

  sleep(2);
}

export function internalSendF24NotificationNew() {

    let resultPreload = internalPreloadFile();

    notificationRequest.documents[0].ref.key = resultPreload.key;
    notificationRequest.documents[0].digests.sha256 = sha256;

    let url = `https://${basePath}/delivery/v2.5/requests`;

    let params = {
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey
        },
    };

    // GROUP (invariato)
    if (withGroup && withGroup !== 'undefined') {
        let groupUrl = `https://${basePath}/ext-registry-b2b/pa/v1/groups?metadataOnly=true`;
        let groupList = JSON.parse((http.get(groupUrl, params)).body);
        let group = groupList.find((elem) => elem.status === 'ACTIVE');
        notificationRequest.group = group.id;
    }

    // PRELOAD
 //   let paymentAttachPreloadF24 = preloadF24();
 //   let paymentAttachPreloadPagoPa = w7InternalPreloadFile();
 //   let pagoPaSha256 = w7sha256();

    const recipientsData = [
        { taxId: "GRBGPP87L04L741X", name: "Giuseppe Maria Garibaldi", address: "Via @OK_AR" },
        { taxId: "GTTRNT80T25F205T", name: "Renato Guttuso", address: "Via @FAIL-DiscoveryIrreperibile_AR" },
        { taxId: "LVLDAA85T50G702B", name: "Ada Lovelace", address: "Via @FAIL_AR" },
        { taxId: "DRCGNN12A46A326K", name: "Giovanna D'arco", address: "Via @FAIL-Irreperibile_AR" },
        { taxId: "NRELCU76E25L219L", name: "Lucia Neri", address: "Via @FAIL-Discovery_AR" },
        { taxId: "BNCMTT76E25L219S", name: "Matteo Bianchi", address: "Via @OK-Giacenza_AR" },
        { taxId: "RSSMLE80H14A944I", name: "Emilio Rossi", address: "Via @FAIL-Giacenza_AR" },
        { taxId: "RSSVNT80H54A944A", name: "Valentina Rossi", address: "Via OK-Giacenza-gt10_AR" },
        { taxId: "NREVNT80H54A944I", name: "Valentina Neri", address: "Via @FAIL-Giacenza-gt10_AR" },
        { taxId: "NREMRN79H14A944K", name: "Marino Neri", address: "Via @FAIL-CompiutaGiacenza_AR" },
        { taxId: "GLLNGL79H54A944E", name: "Angela Gialli", address: "Via @OK-Retry_AR" },
        { taxId: "GLLVCN79H14A944A", name: "Vincenzo Gialli", address: "Via @OK-NonRendicontabile_AR" },
        { taxId: "GLLGPP79H14H501X", name: "Giuseppe Gialli", address: "Via @OK-CausaForzaMaggiore_AR" },
        { taxId: "RSSLGU79B14H501K", name: "Luigi Rossi", address: "Via @OK_AR-CON020-7Z1P" },
        { taxId: "NRELGU79B14H501S", name: "Luigi Neri", address: "Via @OK_AR_ZIP" }
    ];

    notificationRequest.recipients = [];

    recipientsData.forEach((r, index) => {

        let recipient = {
            recipientType: "PF",
            taxId: r.taxId,
            denomination: r.name,
            physicalAddress: {
                at: "Presso",
                address: r.address,
                addressDetails: "",
                zip: "20019",
                municipality: "Settimo Milanese",
                municipalityDetails: "Settimo Milanese",
                province: "MI",
                foreignState: "ITALIA"
            },
            payments: []
        };

        const pagoPaPaymentsCount = PAYMENTS_PER_RECIPIENT;

        for (let paymentIndex = 0; paymentIndex < pagoPaPaymentsCount; paymentIndex += 1) {
            // PRELOAD
            let paymentAttachPreloadPagoPa = w7InternalPreloadFile();
            let pagoPaSha256 = w7sha256();
            let noticeCode = buildUniqueNoticeCode(index, paymentIndex);

            let pagoPaPayment = {
                pagoPa: {
                    noticeCode: noticeCode,
                    creditorTaxId: "77777777777",
                    applyCost: true,
                    attachment: {
                        digests: {
                            sha256: pagoPaSha256
                        },
                        contentType: "application/pdf",
                        ref: {
                            key: paymentAttachPreloadPagoPa.key,
                            versionToken: "v1"
                        }
                    }
                }
            };

            recipient.payments.push(pagoPaPayment);
        }

        // ===== F24 SOLO PRIMI 3 =====
//        if (index < F24_RECIPIENTS_COUNT) {
//            let f24Payment = JSON.parse(JSON.stringify(paymentRequestf24[0]));
//
//            f24Payment.f24.metadataAttachment.digests.sha256 = sha256;
//            f24Payment.f24.metadataAttachment.ref.key = paymentAttachPreloadF24.key;
//
//            recipient.payments.push(f24Payment);
//        }

        notificationRequest.recipients.push(recipient);
    });

    // DIGITAL
    if (digitalWorkflow && digitalWorkflow !== 'undefined') {
        notificationRequest.recipients.forEach(r => {
            r.digitalDomicile = digitalDomicileRequest;
            r.digitalDomicile.address = "test@pecOk.it";
        });
    }

    notificationRequest.notificationFeePolicy = "DELIVERY_MODE";
    notificationRequest.paFee = 0;
    notificationRequest.vat = 0;
    notificationRequest.senderTaxId = paTaxId;

    notificationRequest.paProtocolNumber =
        ("2023" +
            (((exec.scenario.iterationInTest + '' + exec.vu.idInTest + '' + (Math.floor(Math.random() * 9999999)))
                .substring(0, 7) +
                '' +
                new Date().getTime().toString().substring(0, 13))
                .padStart(20, '0')
                .substring(0, 20)));

    let payload = JSON.stringify(notificationRequest);
    console.log('payload for notification: '+payload);

    let r = http.post(url, payload, params);

    console.log(`Status ${r.status}`);

    check(r, { 'status is 409': (r) => r.status === 409 });
    check(r, { 'status is 403': (r) => r.status === 403 });
    check(r, { 'status is 202': (r) => r.status === 202 });

    console.log('REQUEST-ID-LOG: ' + r.body);

    return r;
}

// 18 cifre totali: "3" + 17. Include un seed di run per evitare duplicati tra run diverse.
function buildUniqueNoticeCode(recipientIndex, paymentIndex) {
    const iter = String(exec.scenario.iterationInTest).padStart(8, '0').slice(-8); // 8
    const rp = String((recipientIndex * PAYMENTS_PER_RECIPIENT) + paymentIndex)
        .padStart(3, '0')
        .slice(-3); // 3

    // 6 (run seed) + 8 (iteration) + 3 (recipient/payment) = 17
    return `3${NOTICE_RUN_SEED}${iter}${rp}`;
}