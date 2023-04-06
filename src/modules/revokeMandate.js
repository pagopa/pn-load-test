import http from 'k6/http';

const apiVersion = 'v1'

export function revokeMandate(mandateId) {

    let bearerToken = `${__ENV.BEARER_TOKEN_USER1}`
    let envName = `${__ENV.ENV_NAME}`

    let url = `https://webapi.${envName}.pn.pagopa.it/mandate/api/${apiVersion}/mandate/${mandateId}/revoke`;
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