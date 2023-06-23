import { check, sleep } from 'k6';
import http from 'k6/http';
import { Counter } from 'k6/metrics';

export let options = JSON.parse(open('./modules/test-types/'+__ENV.TEST_TYPE+'.json'));

let bearerTokenPg1 = `${__ENV.BEARER_TOKEN_USER_PG1}`
let taxIdPg1 = 'CCRMCT06A03A433H';

let bearerTokenPg2 = `${__ENV.BEARER_TOKEN_USER_PG2}`
let taxIdPg2 = '20517490320';

let basePath = `${__ENV.WEB_BASE_PATH}`
let mandateRequest = JSON.parse(open('./model/mandateRequest.json'));
let acceptMandateReq = JSON.parse(open('./model/acceptMandate.json'));

const mandateCreated = new Counter('mandate_created');
const mandateRejected = new Counter('mandate_rejected');
const mandateAccepted = new Counter('mandate_accepted');

export function setup() {
    deleteMandateMb("SETUP");
}


export function teardown(request) {
    deleteMandateMb("TEARDOWN");
}

function deleteMandateMb(fun){
  let params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + bearerTokenPg1,
    },
  };
  let urlGetMadate = `https://${basePath}/mandate/api/v1/mandates-by-delegator`;

  let mandates = http.get(urlGetMadate,params);

  let mandateArray = JSON.parse(mandates.body);
  console.log("**"+fun+" FUNCTION** MANDATE FOUND: "+mandateArray.length);
  let removedMandate = 0;
  for(let i = 0; i < mandateArray.length; i++){
    let urlRevoke = `https://${basePath}/mandate/api/v1/mandate/${mandateArray[i].mandateId}/revoke`;
    
    let mandateRevoke = http.patch(urlRevoke, null, params);
    if(mandateRevoke.status === 204){
      removedMandate++;
    }
  }
  console.log("**"+fun+" FUNCTION** MANDATE DELETED: "+removedMandate+" (MANDATE FOUND: "+mandateArray.length+")");
}



export default function delegateMbTest() {

  mandateRequest.delegator.fiscalCode = taxIdPg1;
  mandateRequest.delegate.fiscalCode = taxIdPg2;

  mandateRequest.delegator.person = false;
  mandateRequest.delegate.person = false;
  mandateRequest.delegator.companyName = "testDiCaricoSRL"
  mandateRequest.delegate.companyName = "testDiCaricoSPA"

  let dateFrom = new Date();
  mandateRequest.datefrom = dateFrom.toISOString().slice(0, 10);

  let dateTo = new Date();
  dateTo.setDate(dateTo.getDate() + 1);
  mandateRequest.dateto = dateTo.toISOString().slice(0, 10);


  const mandateCreationPayload = JSON.stringify(mandateRequest);

  let paramsPg1 = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + bearerTokenPg1,
    },
  };

  let paramsPg2 = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + bearerTokenPg2,
    },
  }

  let urlCreate = `https://${basePath}/mandate/api/v1/mandate`;
  
  let mandateCreate = http.post(urlCreate, mandateCreationPayload, paramsPg1);

  if(mandateCreate.status === 409){
    for(let i = 0; i < 15; i++){
        mandateCreate = http.post(urlCreate, mandateCreationPayload, paramsPg1);
        if(!mandateCreate.status === 409){
            break;
        }else{
            sleep(1);
        }
    }
  }//retry if conflict

  check(mandateCreate, {
    'status mandate create is 201': (mandateCreate) => mandateCreate.status === 201,
  });
 
  if(mandateCreate.status === 201){
    mandateCreated.add(1);

    let mandateJson = JSON.parse(mandateCreate.body);
    let urlAcceptMandate = `https://${basePath}/mandate/api/v1/mandate/${mandateJson.mandateId}/accept`;
    let acceptMandateResp = http.patch(urlAcceptMandate,JSON.stringify(acceptMandateReq),paramsPg2);
  
    check(acceptMandateResp, {
      'status mandate accept is 204': (acceptMandateResp) => acceptMandateResp.status === 204,
    });
    if(acceptMandateResp.status === 204){
      mandateAccepted.add(1);
    }
  
    //let mandateJson = JSON.parse(mandateCreate.body);
    let urlReject = `https://${basePath}/mandate/api/v1/mandate/${mandateJson.mandateId}/reject`;
      
    let mandateReject = http.patch(urlReject, null, paramsPg2);
  
    check(mandateReject, {
      'status mandate reject is 204': (mandateReject) => mandateReject.status === 204,
    });
    if(mandateReject.status === 204){
      mandateRejected.add(1);
    }
  }else{
    deleteMandateMb("DEFAULT-FUNCTION");
  }//resolve conflict 

  
 
}

