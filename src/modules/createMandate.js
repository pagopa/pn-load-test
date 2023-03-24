import http from 'k6/http';

const apiVersion = 'v1'

const payload = JSON.stringify(JSON.parse(open('../model/mandateRequest.json')));

export function createMandate() {

  let bearerToken = `${__ENV.BEARER_TOKEN_USER1}`
  let envName = `${__ENV.ENV_NAME}`

  let url = `https://webapi.${envName}.pn.pagopa.it/mandate/api/${apiVersion}/mandate`;
  let token = 'Bearer ' + bearerToken;
  
  let params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token
    },
  };
  
  return http.post(url, payload, params);

}