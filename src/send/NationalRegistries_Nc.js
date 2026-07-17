import { check } from 'k6';
import http from 'k6/http';
import { Counter } from 'k6/metrics';

export let options = JSON.parse(open('./modules/test-types/'+__ENV.TEST_TYPE+'.json'));

let bearerToken = `${__ENV.BEARER_TOKEN_USER1}`
let basePath = `${__ENV.WEB_BASE_PATH}`
let nationalRegRequest = JSON.parse(open('./model/ANPRRequestBody.json'));

const code_unauthorized = new Counter('code_unauthorized');
const code_badrequest = new Counter('code_badrequest');
const code_forbidden = new Counter('code_forbidden');
const code_notfound = new Counter('code_notfound');
const code_iserror = new Counter('code_iserror');
const code_serviceunavailable = new Counter('code_serviceunavailable');



export default function getPhysicalDomicileNcTest() {

  nationalRegRequest.filter.taxId = "PPPPLT80A01H501V";
  nationalRegRequest.filter.referenceRequestDate = new Date().toString()
  console.log(nationalRegRequest)
  const bodyPayload = JSON.stringify(nationalRegRequest);

  let params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + bearerToken,
    },
  };

  let url = `http://${basePath}/national-registries-private/anpr/address`;

  let resp = http.post(url, bodyPayload, params);
  console.log(resp)

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
  check(resp, {
      'get physicalDomicile from ANPR is 200': (resp) => resp.status === 200,
  });

}



