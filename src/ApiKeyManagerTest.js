
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




}