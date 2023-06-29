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

  //const cf = userPFCf[exec.scenario.iterationInTest % userPFCf.length];
  const cf = generateCF(exec.scenario.iterationInTest);
  
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




function genera_carattere_controllo( CF_FX) {

  let alpha_dispari = [] 
  let alpha_pari = []
  let somma_dispari = 0;
  let somma_pari = 0;
  let somma_controllo;

  for (var i = 0; i < CF_FX.length; i++) {

    if (i % 2 != 1) {
      alpha_dispari[i] = CF_FX.charAt(i);
      switch (alpha_dispari[i]) {
        case '0': case 'A': alpha_dispari[i] = 1;
          break;
        case '1': case 'B': alpha_dispari[i] = 0;
          break;
        case '2': case 'C': alpha_dispari[i] = 5;
          break;
        case '3': case 'D': alpha_dispari[i] = 7;
          break;
        case '4': case 'E': alpha_dispari[i] = 9;
          break;
        case '5': case 'F': alpha_dispari[i] = 13;
          break;
        case '6': case 'G': alpha_dispari[i] = 15;
          break;
        case '7': case 'H': alpha_dispari[i] = 17;
          break;
        case '8': case 'I': alpha_dispari[i] = 19;
          break;
        case '9': case 'J': alpha_dispari[i] = 21;
          break;
        case 'K': alpha_dispari[i] = 2;
          break;
        case 'L': alpha_dispari[i] = 4;
          break;
        case 'M': alpha_dispari[i] = 18;
          break;
        case 'N': alpha_dispari[i] = 20;
          break;
        case 'O': alpha_dispari[i] = 11;
          break;
        case 'P': alpha_dispari[i] = 3;
          break;
        case 'Q': alpha_dispari[i] = 6;
          break;
        case 'R': alpha_dispari[i] = 8;
          break;
        case 'S': alpha_dispari[i] = 12;
          break;
        case 'T': alpha_dispari[i] = 14;
          break;
        case 'U': alpha_dispari[i] = 16;
          break;
        case 'V': alpha_dispari[i] = 10;
          break;
        case 'W': alpha_dispari[i] = 22;
          break;
        case 'X': alpha_dispari[i] = 25;
          break;
        case 'Y': alpha_dispari[i] = 24;
          break;
        case 'Z': alpha_dispari[i] = 23;
          break;
      }
      //SOMMA DEI CARATTERI IN POSIZIONE DISPARI
      somma_dispari += alpha_dispari[i];
      // document.write(" |somma corrente dispari : " + somma_dispari + "|");
      // document.write(alpha_dispari[i]);

    }
    else {
      alpha_pari[i] = CF_FX.charAt(i);

      switch (alpha_pari[i]) {
        case '0': case 'A': alpha_pari[i] = 0;
          break;
        case '1': case 'B': alpha_pari[i] = 1;
          break;
        case '2': case 'C': alpha_pari[i] = 2;
          break;
        case '3': case 'D': alpha_pari[i] = 3;
          break;
        case '4': case 'E': alpha_pari[i] = 4;
          break;
        case '5': case 'F': alpha_pari[i] = 5;
          break;
        case '6': case 'G': alpha_pari[i] = 6;
          break;
        case '7': case 'H': alpha_pari[i] = 7;
          break;
        case '8': case 'I': alpha_pari[i] = 8;
          break;
        case '9': case 'J': alpha_pari[i] = 9;
          break;
        case 'K': alpha_pari[i] = 10;
          break;
        case 'L': alpha_pari[i] = 11;
          break;
        case 'M': alpha_pari[i] = 12;
          break;
        case 'N': alpha_pari[i] = 13;
          break;
        case 'O': alpha_pari[i] = 14;
          break;
        case 'P': alpha_pari[i] = 15;
          break;
        case 'Q': alpha_pari[i] = 16;
          break;
        case 'R': alpha_pari[i] = 17;
          break;
        case 'S': alpha_pari[i] = 18;
          break;
        case 'T': alpha_pari[i] = 19;
          break;
        case 'U': alpha_pari[i] = 20;
          break;
        case 'V': alpha_pari[i] = 21;
          break;
        case 'W': alpha_pari[i] = 22;
          break;
        case 'X': alpha_pari[i] = 23;
          break;
        case 'Y': alpha_pari[i] = 24;
          break;
        case 'Z': alpha_pari[i] = 25;
          break;
      }
      somma_pari += alpha_pari[i];
      //  document.write(" |somma corrente pari : " + somma_pari + "|");
      //  document.write(alpha_pari[i]);
    }
  } // chiusura for sui caratteri

  //#SOMMA FINALE
  somma_controllo = (somma_dispari + somma_pari) % 26;

  //#ARRAY DELLE LETTERE CHE SI ASSOCIERANNO AL RISULTATO DELLA SOMMA CONTROLLO
  var caratteri_lista = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];
  
  let lettera_controllo = caratteri_lista[ somma_controllo ];
  return lettera_controllo;
}

const HEX_TO_LETTER = [
  'B', 'C', 'D', 'F',
  'G', 'L', 'M', 'N',
  'P', 'Q', 'R', 'S',
  'T', 'V', 'Z', 'A'
]

function generateCF( iter ) {
  let _1_num = iter % 16
  let _2_num = Math.floor(iter / 16 ) % 16
  let _3_num = Math.floor(iter / (16^2) ) % 16
  let _4_num = Math.floor(iter / (16^3) ) % 16
  let _5_num = Math.floor(iter / (16^4) ) % 16
  let _6_num = Math.floor(iter / (16^5) ) % 16

  let  _1_char = HEX_TO_LETTER[ _1_num ];
  let  _2_char = HEX_TO_LETTER[ _2_num ];
  let  _3_char = HEX_TO_LETTER[ _3_num ];
  let  _4_char = HEX_TO_LETTER[ _4_num ];
  let  _5_char = HEX_TO_LETTER[ _5_num ];
  let  _6_char = HEX_TO_LETTER[ _6_num ];

  let cf_prefix = `${_1_char}${_2_char}${_3_char}${_4_char}${_5_char}${_6_char}20T25A944`

  let cc = genera_carattere_controllo( cf_prefix )
  let cf = `${cf_prefix}${cc}`;

  return cf;
}

