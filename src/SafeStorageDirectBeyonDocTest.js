import { check } from 'k6';
import crypto from 'k6/crypto';
import http from 'k6/http';


//export let options = JSON.parse(open('./modules/test-types/'+__ENV.TEST_TYPE+'.json'));

let sha256;
let binFile = open('./resources/AvvisoPagoPA.pdf', 'b');
let preloadFileRequest = JSON.parse(open('./model/requestSafeStorageBeyonDoc.json'));

export function setup() {
    let onlyPreloadUrlParam = `${__ENV.ONLY_PRELOAD_URL}`
    let onlyPreloadUrl = false;
    if(onlyPreloadUrlParam && onlyPreloadUrlParam !== 'undefined') {
        onlyPreloadUrl = true;
    }
    return onlyPreloadUrl;
}

export default function preloadFileDirect(onlyPreloadUrl) {
    
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
    

    if(!onlyPreloadUrl){
        let resultPreload = JSON.parse(preloadResponse.body);
        console.log('PRELOAD RESPONSE: '+JSON.stringify(resultPreload));
        let paramsSafeStorage = {
            headers: {
                'Content-Type': 'application/pdf',
                'x-amz-checksum-sha256': sha256,
                'x-amz-meta-secret': resultPreload.secret,
            },
        };
    
        let urlSafeStorage = resultPreload.uploadUrl;
        
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
