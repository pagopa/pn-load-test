import { check, sleep } from 'k6';
import crypto from 'k6/crypto';
import http from 'k6/http';


export let options = JSON.parse(open('/modules/test-types/'+__ENV.TEST_TYPE+'.json'));

var apiKey = `${__ENV.API_KEY}`
var envName = `${__ENV.ENV_NAME}`
var sha256;
var binFile = open('/resources/AvvisoPagoPA.pdf', 'b');
var notificationRequest = JSON.parse(open('/model/notificationRequest.json'));
var preloadFileRequest = JSON.parse(open('/model/preloadFile.json'));

function preloadFile() {
    
    console.log(binFile);

    sha256 = crypto.sha256(binFile, 'base64');
    console.log('Sha: '+sha256);

    var url = `https://api.${envName}.pn.pagopa.it/delivery/attachments/preload`;

    var paramsDeliveryPreload = {
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey
        },
    };

    preloadFileRequest[0].sha256 = sha256;
    var payload = JSON.stringify(preloadFileRequest);
    console.log('body: '+payload);
    var preloadResponse = http.post(url, payload, paramsDeliveryPreload);
    console.log(preloadResponse.body);
    
    /*
    "secret": "...",
    "httpMethod": "PUT",
    "url": "..."
    */

    var resultPreload = JSON.parse(preloadResponse.body)[0];
    var paramsSafeStorage = {
        headers: {
            'Content-Type': 'application/pdf',
            'x-amz-checksum-sha256': sha256,
            'x-amz-meta-secret': resultPreload.secret,
        },
    };

    var urlSafeStorage = resultPreload.url;
    
    var safeStorageUploadResponde = http.put(urlSafeStorage, binFile, paramsSafeStorage);
    console.log("RESULT PRELOAD: "+safeStorageUploadResponde.status);
    return resultPreload;   
}


export default function sentNotification() {

    var resultPreload = preloadFile();

    var withGroup = `${__ENV.WITH_GROUP}`
    
    var url = `https://api.${envName}.pn.pagopa.it/delivery/requests`;

     var params = {
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey
        },
    };

    if(withGroup && withGroup !== 'undefined') {
        var gruopUrl = `https://api.${envName}.pn.pagopa.it/ext-registry-b2b/pa/v1/groups?metadataOnly=true`;
        var groupList = JSON.parse((http.get(gruopUrl, params)).body);
        console.log(JSON.stringify(groupList));
        var group = groupList.find((elem) => elem.status === 'ACTIVE');
        notificationRequest.group = group.id;
    }

    notificationRequest.paProtocolNumber = ("2023" + new Date().getTime().toString().padStart(14, '0'));

    notificationRequest.documents[0].ref.key = resultPreload.key;
    notificationRequest.documents[0].digests.sha256 = sha256;

    console.log('paprotocol: '+notificationRequest.paProtocolNumber);
    var payload = JSON.stringify(notificationRequest);

    var r = http.post(url, payload, params);

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