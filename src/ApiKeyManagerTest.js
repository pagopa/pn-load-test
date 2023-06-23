import { check, sleep } from 'k6';
import http from 'k6/http';

export let options = JSON.parse(open('./modules/test-types/'+__ENV.TEST_TYPE+'.json'));

let createNotificationRequest = JSON.parse(open('./model/createApiKey.json'));
let bearerToken = `${__ENV.BEARER_TOKEN_PA}`
let webBasePath = `${__ENV.WEB_BASE_PATH}`

export default function apiKey(){

    let token = 'Bearer ' + bearerToken;
    let params = {
        headers: {
        'Content-Type': 'application/json',
        'Authorization': token
        }
      };


    let url = `https://${webBasePath}/api-key-self/api-keys`;
    
    let payload = JSON.stringify(createNotificationRequest);

    let apiKeyCreation = http.post(url, payload, params);

    check(apiKeyCreation, {
      'status apiKey creation is 200': (apiKeyCreation) => apiKeyCreation.status === 200,
    });

    let creationBody = JSON.parse(apiKeyCreation.body);

    let urlBlock = `https://${webBasePath}/api-key-self/api-keys/${creationBody.id}/status`;

    var blockBody = {
      "status": "BLOCK"
    }

    let apiKeyBlock = http.put(urlBlock,JSON.stringify(blockBody),params);

    check(apiKeyBlock, {
      'status apiKey block is 200': (apiKeyBlock) => apiKeyBlock.status === 200,
    });


    let urlDelete = `https://${webBasePath}/api-key-self/api-keys/${creationBody.id}`;

    let apiKeyDelete = http.del(urlDelete,null,params);

    check(apiKeyDelete, {
      'status apiKey delete is 200': (apiKeyDelete) => apiKeyDelete.status === 200,
    });

    sleep(1);
}