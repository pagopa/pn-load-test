import { check } from 'k6';
import crypto from 'k6/crypto';
import http from 'k6/http';


export let options = JSON.parse(open('./modules/test-types/'+__ENV.TEST_TYPE+'.json'));

let apiKey = `${__ENV.API_KEY}`
let sha256;
let binFile = open('./resources/AvvisoPagoPa.pdf', 'b');
let preloadFileRequest = JSON.parse(open('./model/requestSafeStorage.json'));


export default function preloadFileDirect() {
    
    console.log(binFile);

    sha256 = crypto.sha256(binFile, 'base64');
    console.log('Sha: '+sha256);

 
    let url = 'http://localhost:8888/safe-storage/v1/files';
    let paramsSafeStoragePreload = {
        headers: {
            'Content-Type': 'application/json',
            'X-Amzn-Trace-Id' : 'Root=1-63eb69b6-fatmantest20230418095908;Parent=0dd41322d48364ec;Sampled=1;Self=1-63eb69b6-6e47f78a785c1ca4099c139d',
            'x-pagopa-safestorage-cx-id': 'pn-test',
            'x-checksum': 'SHA-256',
            'x-checksum-value':sha256,
        },
    };

    let payload = JSON.stringify(preloadFileRequest);
    console.log('body: '+payload);
    let preloadResponse = http.post(url, payload, paramsSafeStoragePreload);
    
    console.log("SAFE-STORAGE-DIRECT PRELOAD: "+preloadResponse.status);

    check(preloadResponse, {
        'status preload is 200': (preloadResponse) => preloadResponse.status === 200,
    });

    check(preloadResponse, {
        'error delivery-preload is 5xx': (preloadResponse) => preloadResponse.status >= 500,
    });
    
   
}
