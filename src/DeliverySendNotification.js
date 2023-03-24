import { check, sleep } from 'k6';
import crypto from 'k6/crypto';
import http from 'k6/http';


export let options = JSON.parse(open('./modules/test-types/'+__ENV.TEST_TYPE+'.json'));

let apiKey = `${__ENV.API_KEY}`
let envName = `${__ENV.ENV_NAME}`
let sha256;
let binFile = open('./resources/AvvisoPagoPA.pdf', 'b');
let notificationRequest = JSON.parse(open('./model/notificationRequest.json'));
let preloadFileRequest = JSON.parse(open('./model/preloadFile.json'));

function preloadFile() {
    
    console.log(binFile);

    sha256 = crypto.sha256(binFile, 'base64');
    console.log('Sha: '+sha256);

    let url = `https://api.${envName}.pn.pagopa.it/delivery/attachments/preload`;

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
    console.log(preloadResponse.body);
    
    /*
    "secret": "...",
    "httpMethod": "PUT",
    "url": "..."
    */

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
    console.log("RESULT PRELOAD: "+safeStorageUploadResponde.status);
    return resultPreload;   
}


export default function sendNotification(userTaxId) {

    let resultPreload = preloadFile();

    let withGroup = `${__ENV.WITH_GROUP}`
    
    let url = `https://api.${envName}.pn.pagopa.it/delivery/requests`;

     let params = {
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey
        },
    };

    if(withGroup && withGroup !== 'undefined') {
        let gruopUrl = `https://api.${envName}.pn.pagopa.it/ext-registry-b2b/pa/v1/groups?metadataOnly=true`;
        let groupList = JSON.parse((http.get(gruopUrl, params)).body);
        console.log(JSON.stringify(groupList));
        let group = groupList.find((elem) => elem.status === 'ACTIVE');
        notificationRequest.group = group.id;
    }

    if(userTaxId){
        console.log("TAX-ID: "+userTaxId);
        notificationRequest.recipients[0].taxId = userTaxId;
    }

    notificationRequest.paProtocolNumber = ("2023" + new Date().getTime().toString().padStart(14, '0'));

    notificationRequest.documents[0].ref.key = resultPreload.key;
    notificationRequest.documents[0].digests.sha256 = sha256;

    console.log('paprotocol: '+notificationRequest.paProtocolNumber);
    let payload = JSON.stringify(notificationRequest);

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