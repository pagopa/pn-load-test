import { check, sleep } from 'k6';
import crypto from 'k6/crypto';
import http from 'k6/http';


export let options = JSON.parse(open('./modules/test-types/'+__ENV.TEST_TYPE+'.json'));

let apiKey = `${__ENV.API_KEY}`
let basePath = `${__ENV.BASE_PATH}`
let sha256;
let binFile = open('./resources/AvvisoPagoPA.pdf', 'b');
let notificationRequest = JSON.parse(open('./model/notificationRequest.json'));
let preloadFileRequest = JSON.parse(open('./model/preloadFile.json'));
let paymentRequest = JSON.parse(open('./model/payment.json'));
let digitalDomicileRequest = JSON.parse(open('./model/digitalDomicile.json'));

export function preloadFile(onlyPreloadUrl) {
    
    console.log(binFile);

    sha256 = crypto.sha256(binFile, 'base64');
    console.log('Sha: '+sha256);

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
        };
    
        let urlSafeStorage = resultPreload.url;
        
        let safeStorageUploadResponde = http.put(urlSafeStorage, binFile, paramsSafeStorage);
    
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


export default function sendNotification(userTaxId) {

    let resultPreload = preloadFile();

    let withGroup = `${__ENV.WITH_GROUP}`;

    let digitalWorkflow = `${__ENV.DIGITAL_WORKFLOW}`;

    let withPayment = `${__ENV.WITH_PAYMENT}`;

    let paTaxId = `${__ENV.PA_TAX_ID}`;
    
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
        let paymentAttachPreload = preloadFile();
        paymentRequest.noticeCode = ("302" + (Math.floor(Math.random() * 99999) +''+ new Date().getTime().toString().substring(3,13)).padStart(15, '0').substring(0, 15));
        paymentRequest.pagoPaForm.digests.sha256 = sha256;
        paymentRequest.pagoPaForm.ref.key = paymentAttachPreload.key;
        notificationRequest.recipients[0].payment = paymentRequest;
    }

    if(userTaxId){
        console.log("TAX-ID: "+userTaxId);
        notificationRequest.recipients[0].taxId = userTaxId;
    }

    if(digitalWorkflow && digitalWorkflow !== 'undefined') {
        notificationRequest.recipients[0].digitalDomicile = digitalDomicileRequest;
    }

    notificationRequest.senderTaxId = paTaxId;

    notificationRequest.paProtocolNumber = ("2023" + new Date().getTime().toString().padStart(14, '0'));

    notificationRequest.documents[0].ref.key = resultPreload.key;
    notificationRequest.documents[0].digests.sha256 = sha256;

    console.log('paprotocol: '+notificationRequest.paProtocolNumber);
    let payload = JSON.stringify(notificationRequest);

    console.log('notificationRequest: '+JSON.stringify(notificationRequest));

    let r = http.post(url, payload, params);

    console.log(`Status ${r.status}`);

    check(r, {
        'status is 202': (r) => r.status === 202,
    });

    console.log('REQUEST-ID-LOG: '+r.body)

    if (r.status === 403) {
        throttling.add(1);
     }

    sleep(0.5);

    return r;
  
}