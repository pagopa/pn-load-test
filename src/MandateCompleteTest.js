import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';
import exec from 'k6/execution';
import http from 'k6/http';
import { Counter } from 'k6/metrics';

import { acceptMandate } from "./modules/acceptMandate.js";
import { createMandate } from "./modules/createMandate.js";


export let options = JSON.parse(open('./modules/test-types/'+__ENV.TEST_TYPE+'.json'));
let bearerTokenUser2 = `${__ENV.BEARER_TOKEN_USER2}`;
let bearerToken = `${__ENV.BEARER_TOKEN_USER1}`;
let basePath = `${__ENV.WEB_BASE_PATH}`;

let mandateRequest = JSON.parse(open('./model/mandateRequest.json'));

const mandateCreated = new Counter('mandate_created');
const mandateRevoked = new Counter('mandate_revoked');


const iunArray = new SharedArray('iun sharedArray', function () {
  let iunFile = open('./resources/NotificationIUN.txt');
  if(iunFile){
    const dataArray =  iunFile.split(';');
    console.log("IUN_LENGTH: "+ dataArray.length);
    return dataArray; // must be an array
  }else{
    const dataArray = [];
    return dataArray;
  }
});

export function setup() {
  deleteMandate("SETUP");

  let r = createMandate();
  console.log(r.body);
  
  sleep(1);

  if(r.status === 201) {
    let body = JSON.parse(r.body);
    console.log(`Mandate Create Status: ${r.status}`);
    console.log(`Body: ${r.body}`);
    let mandateId =  body.mandateId

    r = acceptMandate(mandateId);
    console.log(`Mandate Accept Status: ${r.status}`);
    console.log(`Body: ${r.body}`);
    
    return mandateId
  }
}

export function teardown(request) {
  deleteMandate("TEARDOWN");
}

function deleteMandate(fun){
  let params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + bearerToken,
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

const userPFCf = [
  'CSRGGL44L13H501E',
  'LVLDAA85T50G702B',
  'GRBGPP87L04L741X',
  'BRGLRZ80D58H501Q',
  //'CLMCST42R12D969Z',
  'DRCGNN12A46A326K',
  'FRMTTR76M06B715E',
  'FLPCPT69A65Z336P',
  'PLOMRC01P30L736Y',
  'MNZLSN99E05F205J',
  'RMSLSO31M04Z404R',
  'MNTMRA03M71C615V',
  'LTTSRT16T12H501Y',
  'DSRDNI00A01A225I',
  'DVNLRD52D15M059P',
  'CCRMCT06A03A433H',
  'SNCLNN65D19Z131V',
  'CTNMCP34B16H501T'
]

export default function mandateCompleteTest(mandateId) {
  delegateReadInternal(mandateId);
  delegateMaTestinterl();  
  
  sleep(1);
 
}


function delegateReadInternal(mandateId) {
  
  let currentIun = iunArray[exec.scenario.iterationInTest % iunArray.length].trim();

  let url = `https://${basePath}/delivery/notifications/received/${currentIun}?mandateId=${mandateId}`;
  
  console.log(`Url ${url}`);

  let params = {
    headers: {
    'Content-Type': 'application/json',
    Authorization: 'Bearer ' + bearerTokenUser2,
    'Accept': 'application/json, text/plain, */*'
    },
  };

  let r = http.get(url, params);

  check(r, {
    'status Delegate read is 200': (r) => r.status === 200,
  });

  sleep(1);
  return r;

}


export function delegateMaTestinterl() {

  const cf = userPFCf[exec.scenario.iterationInTest % userPFCf.length];
  
  mandateRequest.delegate.fiscalCode = cf;

  let dateFrom = new Date();
  mandateRequest.datefrom = dateFrom.toISOString().slice(0, 10);

  let dateTo = new Date();
  dateTo.setDate(dateTo.getDate() + 1);
  mandateRequest.dateto = dateTo.toISOString().slice(0, 10);


  const mandateCreationPayload = JSON.stringify(mandateRequest);

  let params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + bearerToken,
    },
  };

  let urlCreate = `https://${basePath}/mandate/api/v1/mandate`;
  
  let mandateCreate = http.post(urlCreate, mandateCreationPayload, params);

  if(mandateCreate.status === 409){
    while(true){
      mandateCreate = http.post(urlCreate, mandateCreationPayload, params);
      sleep(1);
      if(!mandateCreate.status === 409)break;
    }
  }//retry if conflict

  check(mandateCreate, {
    'status mandate create is 201': (mandateCreate) => mandateCreate.status === 201,
  });
  if(mandateCreate.status === 201){
    mandateCreated.add(1);
  }

  let mandateJson = JSON.parse(mandateCreate.body);
  let urlRevoke = `https://${basePath}/mandate/api/v1/mandate/${mandateJson.mandateId}/revoke`;
    
  let mandateRevoke = http.patch(urlRevoke, null, params);

  check(mandateRevoke, {
    'status mandate revoke is 204': (mandateRevoke) => mandateRevoke.status === 204,
  });
  if(mandateRevoke.status === 204){
    mandateRevoked.add(1);
  }
  
 
}

