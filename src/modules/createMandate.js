import http from 'k6/http';
import { sleep } from 'k6';

const apiVersion = 'v1'

const payload = JSON.stringify(JSON.parse(open('../model/mandateRequest.json')));

export function createMandate() {

  var bearerToken = `${__ENV.BEARER_TOKEN_USER1}`
  var envName = `${__ENV.ENV_NAME}`

  var url = `https://webapi.${envName}.pn.pagopa.it/mandate/api/${apiVersion}/mandate`;
  var token = 'Bearer ' + bearerToken;
  
  //console.log(`Token ${token}`);
  //console.log(`Payload ${payload}`);
  
  var params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token
    },
  };
  
  return http.post(url, payload, params);

}