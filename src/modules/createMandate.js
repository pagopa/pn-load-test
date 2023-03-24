import http from 'k6/http';

const apiVersion = 'v1'

var json = JSON.parse(open('../model/mandateRequest.json'));

json.datefrom = new Date().toISOString().slice(0, 10);
var dateTo = new Date();
dateTo.setDate(dateTo.getDate() + 1);
json.dateto = dateTo.toISOString().slice(0, 10);

const payload = JSON.stringify(json);

export function createMandate() {

  var bearerToken = `${__ENV.BEARER_TOKEN_USER1}`
  var envName = `${__ENV.ENV_NAME}`

  var url = `https://webapi.${envName}.pn.pagopa.it/mandate/api/${apiVersion}/mandate`;
  var token = 'Bearer ' + bearerToken;
  
  var params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token
    },
  };
  
  return http.post(url, payload, params);

}