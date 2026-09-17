import { check } from 'k6';
import { SharedArray } from 'k6/data';
import exec from 'k6/execution';
import http from 'k6/http';
import { Counter } from 'k6/metrics';

export let options = JSON.parse(open('./modules/test-types/'+__ENV.TEST_TYPE+'.json'));

let basePath = `${__ENV.WEB_BASE_PATH}`;
let INIPECRequest = JSON.parse(open('./model/INIPECRequestBody.json'));

const code_unauthorized = new Counter('code_unauthorized');
const code_badrequest = new Counter('code_badrequest');
const code_forbidden = new Counter('code_forbidden');
const code_notfound = new Counter('code_notfound');
const code_iserror = new Counter('code_iserror');
const code_serviceunavailable = new Counter('code_serviceunavailable');

const taxIdArray = new SharedArray('taxId sharedArray', function () {
  let taxIdFile = open('./resources/lista_cf_numerici_inipec_collaudo.txt');
  if (taxIdFile) {
    const dataArray = taxIdFile.split('\n').filter((line) => line.trim() !== '');
    console.log("TAXID_LENGTH: " + dataArray.length);
    return dataArray; // must be an array
  } else {
    return [];
  }
});

export default function getDigitalAddressFromIniPEC() {

  const currentTaxId = taxIdArray[exec.scenario.iterationInTest % taxIdArray.length].trim();
  INIPECRequest.filter.taxId = currentTaxId;

  const bodyINIPECPayload = JSON.stringify(INIPECRequest);

  let params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  let url = `http://${basePath}/national-registries-private/inipec/digital-address`;
  let resp = http.post(url, bodyINIPECPayload, params);

  if (resp.status !== 200) {
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
    'get digitalAddress from INIPEC is 200': (resp) => resp.status === 200,
  });
}
