import http from 'k6/http';

const apiVersion = 'v1'

const payload = JSON.parse(open('../model/acceptMandate.json'));

export function acceptMandate(mandateId) {

    let bearerToken = `${__ENV.BEARER_TOKEN_USER2}`
    let basePath = `${__ENV.WEB_BASE_PATH}`

    let url = `https://${basePath}/mandate/api/${apiVersion}/mandate/${mandateId}/accept`;
    let token = 'Bearer ' + bearerToken;
    
    console.log(`Url ${url}`);

    let params = {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token
      },
    };

    return http.patch(url,JSON.stringify(payload),params);

}