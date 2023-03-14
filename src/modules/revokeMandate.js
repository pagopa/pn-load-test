import http from 'k6/http';
import { sleep } from 'k6';

const apiVersion = 'v1'

export function revokeMandate(mandateId) {

    var bearerToken = `${__ENV.BEARER_TOKEN_USER1}`
    var envName = `${__ENV.ENV_NAME}`

    var url = `https://webapi.${envName}.pn.pagopa.it/mandate/api/${apiVersion}/mandate/${mandateId}/revoke`;
    var token = 'Bearer ' + bearerToken;
    
    console.log(`Url ${url}`);
 
    var params = {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token
      },
    };

  return http.patch(url, null, params);
}