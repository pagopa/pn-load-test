import http from 'k6/http';
import { Counter } from 'k6/metrics';
import { check, sleep } from 'k6';
import crypto from 'k6/crypto';
import { SharedArray } from 'k6/data';
import encoding from 'k6/encoding';
import exec from 'k6/execution';
import { URL } from 'https://jslib.k6.io/url/1.0.0/index.js';


//export let options = JSON.parse(open('./modules/test-types/'+__ENV.TEST_TYPE+'.json'));

let bearerToken = `${__ENV.BEARER_TOKEN_RADD1}`;
let basePath = `${__ENV.RADD_BASE_PATH}`;
let useIunFile = `${__ENV.USE_IUN_FILE}`
let aorRecipientTaxId = `${__ENV.RADD_AOR_TAXID}`;
let actRecipientTaxId = `${__ENV.RADD_ACT_TAXID}`;

let preloadFileRequest = JSON.parse(open('./model/preloadFileRadd.json'));
let raddStartTransactionBody = JSON.parse(open('./model/raddStartTransaction.json'));


let sha256;

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
    var obj = {'fileString': encoding.b64encode(open('./resources/Radd.zip','b'))}
    dataArray.push(obj);
    return dataArray; // must be an array
});

export function preloadFileRadd(onlyPreloadUrl, uid, operationId) {
    let currBinFile = encoding.b64decode(fileArray[0].fileString);
    
    //console.log('BIN FILE: '+currBinFile);

    sha256 = crypto.sha256(currBinFile, 'base64');
    console.log('Sha: '+sha256);

    console.log('Token: '+bearerToken);

    let url = `https://${basePath}/radd-net/api/v1/documents/upload`;

    let paramsRaddPreload = {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': bearerToken,
            'uid':uid
        },
    };

    preloadFileRequest.checksum = sha256;
    preloadFileRequest.operationId = operationId;
    let payload = JSON.stringify(preloadFileRequest);
    console.log('body: '+payload);
    let preloadResponse = http.post(url, payload, paramsRaddPreload);
    
    console.log("Radd PRELOAD: "+preloadResponse.status);

    check(preloadResponse, {
        'status preload is 200': (preloadResponse) => preloadResponse.status === 200,
    });

    check(preloadResponse, {
        'error radd-preload is 5xx': (preloadResponse) => preloadResponse.status >= 500,
    });
    
    
    /*
    "secret": "...",
    "httpMethod": "PUT",
    "url": "..."
    */

    if(!onlyPreloadUrl){
        console.log('PRELOAD-RESPONSE: '+preloadResponse.body);
        let resultPreload = JSON.parse(preloadResponse.body);
        let paramsSafeStorage = {
            headers: {
                'Content-Type': 'application/zip',
                'x-amz-checksum-sha256': sha256,
                'Content-Length' : currBinFile.byteLength,
                'x-amz-meta-secret': resultPreload.secret,
            },
            //responseType: 'none',
            tags: { name: 'getSafeStorageUrl' },
        };
    
        let urlSafeStorage = resultPreload.url;
        
        let safeStorageUploadResponde = http.put(urlSafeStorage, currBinFile, paramsSafeStorage);
    
        check(safeStorageUploadResponde, {
            'status safe-storage preload is 200': (safeStorageUploadResponde) => safeStorageUploadResponde.status === 200,
        });
    
        check(safeStorageUploadResponde, {
            'error safeStorage is 5xx': (safeStorageUploadResponde) => safeStorageUploadResponde.status >= 500,
        });

        check(safeStorageUploadResponde, {
          'error safeStorage is 501': (safeStorageUploadResponde) => safeStorageUploadResponde.status === 501,
      });
        
        console.log("SAFE_STORAGE PRELOAD: "+safeStorageUploadResponde.status);
        return resultPreload;   
    }
   
}

function generateUid() {
    // Ottieni la data corrente
    const currentDate = new Date();

    // Ottieni i millisecondi correnti
    const currentMilliseconds = currentDate.getTime();

    // Estrai solo le ultime 5 cifre dei millisecondi e convertile in stringa
    const millisecondsString = (currentMilliseconds+'').slice(-5);

    // Formatta la data nel formato richiesto
    const formattedDate = currentDate.getFullYear() +
        '_' + ('0' + (currentDate.getMonth() + 1)).slice(-2) +
        '_' + ('0' + currentDate.getDate()).slice(-2) +
        'T' + ('0' + currentDate.getHours()).slice(-2) +
        ':' + ('0' + currentDate.getMinutes()).slice(-2) +
        ':' + ('0' + currentDate.getSeconds()).slice(-2);

    const vuId = ((exec.vu.idInTest%999)+'').padStart(3,'1'); 
    // Costruisci e restituisci la stringa completa
    const resultString = millisecondsString + '-'+vuId+'-' + formattedDate;
    return resultString;
}

function aor(){
    let uid = generateUid();
    let operationId = ((new Date()).getTime()+'')+exec.vu.idInTest
    console.log('operationID: '+operationId);

    let aorInquiryUrl = new URL(`https://${basePath}/radd-net/api/v1/aor/inquiry`);

    aorInquiryUrl.searchParams.append('recipientTaxId', aorRecipientTaxId);
    aorInquiryUrl.searchParams.append('recipientType', 'PF');

    let paramsAorInquiry = {
        headers: {
            'Authorization': bearerToken,
            'uid':uid
        },
    };
    console.log("aorInquiryUrl: "+aorInquiryUrl.toString()+" paramsAorInquiry: "+JSON.stringify(paramsAorInquiry));

    let aorInquiryResponse = http.get(aorInquiryUrl.toString(), paramsAorInquiry);

    check(aorInquiryResponse, {
        'status aorInquiryResponse is 200': (aorInquiryResponse) => aorInquiryResponse.status === 200,
    });

    check(aorInquiryResponse, {
        'error aorInquiryResponse is 5xx': (aorInquiryResponse) => aorInquiryResponse.status >= 500,
    });

    console.log("aorInquiryResponse: "+aorInquiryResponse.body)

    let preloadFile = preloadFileRadd(false,uid,operationId);
    console.log("preloadFile"+JSON.stringify(preloadFile));

    const currentDate = (new Date()).toISOString();
    console.log('isoString: '+currentDate);


    let aorStartUrl = `https://${basePath}/radd-net/api/v1/aor/transaction/start`;

    let paramsAor = {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': bearerToken,
            'uid':uid
        },
    };
    
    
    delete raddStartTransactionBody.delegateTaxId;

    raddStartTransactionBody.operationId = operationId;
    raddStartTransactionBody.recipientTaxId = aorRecipientTaxId;
    raddStartTransactionBody.fileKey = preloadFile.fileKey
    raddStartTransactionBody.checksum = sha256;
    raddStartTransactionBody.operationDate = currentDate;

    console.log("aorStartUrl: "+aorStartUrl.toString()+" paramsAorStart: "+JSON.stringify(paramsAor)+" aorStartTransactionBody "+JSON.stringify(raddStartTransactionBody));
    let aorStartResponse = http.post(aorStartUrl, JSON.stringify(raddStartTransactionBody) ,paramsAor);
   
    console.log("aorStartResponse"+JSON.stringify(aorStartResponse.body));

    check(aorStartResponse, {
        'status aorStartResponse is 200': (aorStartResponse) => aorStartResponse.status === 200,
    });

    check(aorStartResponse, {
        'error aorStartResponse is 5xx': (aorStartResponse) => aorStartResponse.status >= 500,
    });

    let aorFrontespizioUrl = `https://${basePath}/radd-net/api/v1/download/AOR/${operationId}`;

    let paramsAorFrontespizio = {
        headers: {
            'Authorization': bearerToken,
        },
    };
    console.log("aorFrontespizioUrl: "+aorFrontespizioUrl+" paramsAorFrontespizio: "+JSON.stringify(paramsAorFrontespizio));

    let aorFrontespizioResponse = http.get(aorFrontespizioUrl, paramsAorFrontespizio);

    check(aorFrontespizioResponse, {
        'status aorFrontespizioResponse is 200': (aorFrontespizioResponse) => aorFrontespizioResponse.status === 200,
    });

    check(aorFrontespizioResponse, {
        'error aorFrontespizioResponse is 5xx': (aorFrontespizioResponse) => aorFrontespizioResponse.status >= 500,
    });


    let aorCompletetUrl = `https://${basePath}/radd-net/api/v1/aor/transaction/complete`;
    
    let aorCompleteBody = {
        "operationId": operationId,
        "operationDate": currentDate
    };

    console.log("aorCompletetUrl: "+aorCompletetUrl+" paramsAorComplete: "+JSON.stringify(paramsAor)+"aorCompleteBody"+JSON.stringify(aorCompleteBody));
    
    let aorCompleteResponse = http.post(aorCompletetUrl, JSON.stringify(aorCompleteBody) ,paramsAor);
   
    check(aorCompleteResponse, {
        'status aorCompleteResponse is 200': (aorCompleteResponse) => aorCompleteResponse.status === 200,
    });

    check(aorCompleteResponse, {
        'error aorCompleteResponse is 5xx': (aorCompleteResponse) => aorCompleteResponse.status >= 500,
    });

}

function act(){
    let currentIun = 'PRTE-UZDL-KTRL-202311-X-1';
    if(useIunFile && useIunFile !== 'undefined') {
      currentIun = iunArray[exec.scenario.iterationInTest % iunArray.length].trim();
    }

    let uid = generateUid();
    let operationId = ((new Date()).getTime()+'')+exec.vu.idInTest
    console.log('operationID: '+operationId);

    let actInquiryUrl = new URL(`https://${basePath}/radd-net/api/v1/act/inquiry`);

    actInquiryUrl.searchParams.append('recipientTaxId', actRecipientTaxId);
    actInquiryUrl.searchParams.append('recipientType', 'PF');
    actInquiryUrl.searchParams.append('iun', currentIun);

    let paramsActInquiry = {
        headers: {
            'Authorization': bearerToken,
            'uid':uid
        },
    };
    console.log("actInquiryUrl: "+actInquiryUrl.toString()+" paramsActInquiry: "+JSON.stringify(paramsActInquiry));

    let actInquiryResponse = http.get(actInquiryUrl.toString(), paramsActInquiry);

    check(actInquiryResponse, {
        'status actInquiryResponse is 200': (actInquiryResponse) => actInquiryResponse.status === 200,
    });

    check(actInquiryResponse, {
        'error actInquiryResponse is 5xx': (actInquiryResponse) => actInquiryResponse.status >= 500,
    });

    console.log("actInquiryResponse: "+actInquiryResponse.body)

    
    let preloadFile = preloadFileRadd(false,uid,operationId);
    console.log("preloadFile"+JSON.stringify(preloadFile));

    const currentDate = (new Date()).toISOString();
    console.log('isoString: '+currentDate);


    let actStartUrl = `https://${basePath}/radd-net/api/v1/act/transaction/start`;

    let paramsAct = {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': bearerToken,
            'uid':uid
        },
    };
    
    delete raddStartTransactionBody.delegateTaxId;
    raddStartTransactionBody.operationId = operationId;
    raddStartTransactionBody.recipientTaxId = actRecipientTaxId;
    raddStartTransactionBody.fileKey = preloadFile.fileKey
    raddStartTransactionBody.checksum = sha256;
    raddStartTransactionBody.operationDate = currentDate;
    raddStartTransactionBody.iun = currentIun;

    console.log("actStartUrl: "+actStartUrl+" paramsAct: "+JSON.stringify(paramsAct)+" actStartTransactionBody "+JSON.stringify(raddStartTransactionBody));
    
    let actStartResponse = http.post(actStartUrl, JSON.stringify(raddStartTransactionBody) ,paramsAct);
   
    //console.log("actStartResponse"+JSON.stringify(actStartResponse.body));

    check(actStartResponse, {
        'status actStartResponse is 200': (actStartResponse) => actStartResponse.status === 200,
    });

    check(actStartResponse, {
        'error actStartResponse is 5xx': (actStartResponse) => actStartResponse.status >= 500,
    });


    let actFrontespizioUrl = `https://${basePath}/radd-net/api/v1/download/ACT/${operationId}`;

    let paramsActFrontespizio = {
        headers: {
            'Authorization': bearerToken,
        },
    };
    console.log("actFrontespizioUrl: "+actFrontespizioUrl+" paramsActFrontespizio: "+JSON.stringify(paramsActFrontespizio));

    let actFrontespizioResponse = http.get(actFrontespizioUrl, paramsActFrontespizio);

    check(actFrontespizioResponse, {
        'status actFrontespizioResponse is 200': (actFrontespizioResponse) => actFrontespizioResponse.status === 200,
    });

    check(actFrontespizioResponse, {
        'error actFrontespizioResponse is 5xx': (actFrontespizioResponse) => actFrontespizioResponse.status >= 500,
    });


    let actAbortUrl = `https://${basePath}/radd-net/api/v1/aor/transaction/complete`;
    
    let actAbortBody = {
        "operationId": operationId,
        "reason": "TEST-DI-CARICO",
        "operationDate": currentDate
    };

    console.log("actAbortUrl: "+actAbortUrl+" paramsActAbort: "+JSON.stringify(paramsAct)+"actAbortBody"+JSON.stringify(actAbortBody));
    
    let actAbortResponse = http.post(actAbortUrl, JSON.stringify(actAbortBody) ,paramsAct);
   
    check(actAbortResponse, {
        'status actAbortResponse is 200': (actAbortResponse) => actAbortResponse.status === 200,
    });

    check(actAbortResponse, {
        'error actAbortResponse is 5xx': (actAbortResponse) => actAbortResponse.status >= 500,
    });
}

export default function raddPerformanceTest() {
    //console.log(bearerToken);
    //console.log(basePath);
    //act();
    //aor();
    
    try{
        aor();
      }catch(error){
        console.log('aor error: ',error)
      }
    
      try{
        act();
      }catch(error){
        console.log('aor error: ',error)
      }
    
  
}


