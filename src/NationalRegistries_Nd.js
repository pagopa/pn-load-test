import { check, sleep } from 'k6';
import exec from 'k6/execution';
import http from 'k6/http';
import { Counter } from 'k6/metrics';

export let options = JSON.parse(open('./modules/test-types/'+__ENV.TEST_TYPE+'.json'));

let bearerToken = `${__ENV.BEARER_TOKEN_USER1}`
let basePath = `${__ENV.WEB_BASE_PATH}`
let RegImpreseRequest = JSON.parse(open('./model/IPAorRegImpreseRequestBody.json'));
let INIPECRequest = JSON.parse(open('./model/INIPECRequestBody.json'));

const code_unauthorized = new Counter('code_unauthorized');
const code_badrequest = new Counter('code_badrequest');
const code_forbidden = new Counter('code_forbidden');
const code_notfound = new Counter('code_notfound');
const code_iserror = new Counter('code_iserror');
const code_serviceunavailable = new Counter('code_serviceunavailable');


export function setup() {
  //nothing to setup
}


export function teardown(request) {
  //nothing to clear
}

export default function getPhysicalDomicileNdTest() {

  INIPECRequest.filter.taxId = "TSTGNN80A01F839X";
  RegImpreseRequest.filter.taxId = "TSTGNN80A01F839X";

  const bodyINIPECPayload = JSON.stringify(INIPECRequest);
  const bodyRegImpresePayload = JSON.stringify(RegImpreseRequest);

  let map = new Map();
  map.set(`/national-registries-private/registro-imprese/address`, bodyRegImpresePayload);
  map.set(`/national-registries-private/inipec/digital-address`, bodyINIPECPayload);

  let params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + bearerToken,
      'pn-national-registries-cx-id': 'TOINSERT'
    },
  };

  for (let [key, value] of map) {
    let url = `http://${basePath}${key}`;
    let resp = http.post(url, value, params);
    if(resp.status !== 200){
        switch (resp.status) {
          case 401:
            code_unauthorized.add(1);
            break;
          case 400:
            code_badrequest.add(1);
            break;
          case 403:
            code_forbidden.add(1);
            break;
          case 404:
            code_notfound.add(1);
            break;
          case 500:
            code_iserror.add(1);
            break;
          case 503:
            code_serviceunavailable.add(1);
            break;
        }
      }
     let type = key.split("/")[2];
     checking(type, resp);
    }
  }


function checking(type, resp) {
    switch (type) {
        case 'registro-imprese':
            check(resp, {
                'get physicalDomicile from RegistroImprese for PG is 200': (resp) => resp.status === 200,
            });
        case 'inipec':
            check(resp, {
                'get physicalDomicile from INIPEC for PG is 200': (resp) => resp.status === 200,
            });
        }
}