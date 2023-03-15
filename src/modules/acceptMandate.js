import http from 'k6/http';

const apiVersion = 'v1'

const payload = JSON.parse(open('../model/acceptMandate.json'));

export function acceptMandate(mandateId) {

    var bearerToken = `${__ENV.BEARER_TOKEN_USER2}`
    var envName = `${__ENV.ENV_NAME}`

    var url = `https://webapi.${envName}.pn.pagopa.it/mandate/api/${apiVersion}/mandate/${mandateId}/accept`;
    var token = 'Bearer ' + bearerToken;
    
    console.log(`Url ${url}`);

    var params = {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token
      },
    };

    return http.patch(url,JSON.stringify(payload),params);

}