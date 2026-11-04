import { check, sleep } from 'k6';
import http from 'k6/http';

export let options = JSON.parse(open('./modules/test-types/'+__ENV.TEST_TYPE+'.json'));

let bearerToken = `${__ENV.BEARER_TOKEN_PA}`;
let webBasePath = `${__ENV.WEB_BASE_PATH}`;

export default function bffApiKeys(){

    let token = 'Bearer ' + bearerToken;
    let params = {
        headers: {
            'Authorization': token,
            'Accept': 'application/json,application/problem+json'
        }
    };

    let url = `https://${webBasePath}/bff/v1/api-keys`;

    for (let i = 0; i < 10; i++) {
        let response = http.get(url, params);

        check(response, {
            'status api-keys is 200': (response) => response.status === 200,
        });
    }

    sleep(1);
}
