import http from 'k6/http';

const apiVersion = 'v1'

let json = JSON.parse(open('../model/mandateRequest.json'));




export function createMandate() {

  let bearerToken = `${__ENV.BEARER_TOKEN_USER1}`
  let basePath = `${__ENV.WEB_BASE_PATH}`

  let dateFrom = new Date();
  json.datefrom = dateFrom.toISOString().slice(0, 10);

  let dateTo = new Date();
  dateTo.setDate(dateTo.getDate() + 1);
  json.dateto = dateTo.toISOString().slice(0, 10);

  json.delegate.fiscalCode = 'CLMCST42R12D969Z';

  const payload = JSON.stringify(json);

  let url = `https://${basePath}/mandate/api/${apiVersion}/mandate`;
  
  let params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + bearerToken,
    },
  };
  
  return http.post(url, payload, params);

}