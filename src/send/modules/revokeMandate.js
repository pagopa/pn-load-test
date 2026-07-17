import http from 'k6/http';

const apiVersion = 'v1'

export function revokeMandate(mandateId) {

    let bearerToken = `${__ENV.BEARER_TOKEN_USER1}`
    let basePath = `${__ENV.WEB_BASE_PATH}`

    let url = `https://${basePath}/mandate/api/${apiVersion}/mandate/${mandateId}/revoke`;
    let token = 'Bearer ' + bearerToken;
    
    console.log(`Url ${url}`);
 
    let params = {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token
      },
    };

  return http.patch(url, null, params);
}