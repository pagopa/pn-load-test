import { URL } from 'https://jslib.k6.io/url/1.0.0/index.js';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';
import exec from 'k6/execution';
import http from 'k6/http';
import { Counter } from 'k6/metrics';



export let options = JSON.parse(open('./modules/test-types/'+__ENV.TEST_TYPE+'.json'));


let bearerTokenPg1 = `${__ENV.BEARER_TOKEN_USER_PG1}`;
let cfPg1 = `${__ENV.CF_USER_PG1}`;
let basePath = `${__ENV.WEB_BASE_PATH}`;
//let lambdaBasePath = `${__ENV.LAMBDA_BASE_PATH}`;
//let lambdaApiKey = `${__ENV.LAMBDA_API_KEY}`;

let mandateRequest = JSON.parse(open('./model/mandateRequest.json'));
let acceptMandateReq = JSON.parse(open('./model/acceptMandate.json'));

const mandateCreated = new Counter('mandate_pg_created');
const mandateAccepted = new Counter('mandate_pg_accepted');
const mandateReject = new Counter('mandate_pg_reject');


export function setup() {
    //ATTENZIONE: Nel caso di esecuzione in seguito a test di carico massimo il tempo di setup va alzato di molto
    let params = {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + bearerTokenPg1,
        },
      };
      let removedMandate = 0;
      let mandateFound = 0;
      let moreResult = false;
      let nextPagesKey = '';
      do{
        let urlGetMadate = new URL(`https://${basePath}/mandate/api/v1/mandates-by-delegate`);
        urlGetMadate.searchParams.append('size', '10');

        if(nextPagesKey){
            urlGetMadate.searchParams.append('nextPageKey', nextPagesKey);
        }
  
        let obj = {}
        let mandates = http.post(urlGetMadate.toString(),JSON.stringify(obj),params);
        console.log('mandates: ',mandates);
        console.log('status: ',mandates.status);
        console.log('body: ',mandates.body);
        
        moreResult = JSON.parse(mandates.body).moreResult;
        nextPagesKey = JSON.parse(mandates.body).nextPagesKey[0];

        let mandateArray = JSON.parse(mandates.body).resultsPage;
        console.log("** SETUP FUNCTION** MANDATE FOUND: "+mandateArray.length);
        mandateFound += mandateArray.length;
        
        for(let i = 0; i < mandateArray.length; i++){
          let urlRevoke = `https://${basePath}/mandate/api/v1/mandate/${mandateArray[i].mandateId}/reject`;
          
          let mandateRevoke = http.patch(urlRevoke, null, params);
          if(mandateRevoke.status === 204){
            removedMandate++;
          }
        }
        
      }while(moreResult);

      console.log("** SETUP FUNCTION** MANDATE DELETED: "+removedMandate+" (MANDATE FOUND: "+mandateFound+")");
}

const userArray = new SharedArray('iun sharedArray mandatePG', function () {
  let userFile = open('./resources/token.json');
  if(userFile){
    const dataArray = JSON.parse(userFile).slice();
    return dataArray; // must be an array
  }else{
    const dataArray = [];
    return dataArray;
  }
});


export default function mandatePgCompleteTest() {
    
    let cf;
    if(exec.scenario.iterationInTest === 1){
        cf = 'GLLGLL64B15G702I';
    }else{
      cf =  userArray[exec.scenario.iterationInTest % userArray.length].taxiId;
        //cf = generateCF(exec.scenario.iterationInTest);
    }
     
  /* 
    var body = { entries: [{taxId:cf, tokenType:'PF'}]}

    let paramsLambda = {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': lambdaApiKey,
        },
      };

    let lambdaurl = `https://${lambdaBasePath}/unique/generate`;
    console.log('URL LAMBDA: '+lambdaurl);
    let tokenRequest = http.post(lambdaurl, JSON.stringify(body), paramsLambda);
    check(tokenRequest, {
        'status token creation is 200': (tokenRequest) => tokenRequest.status === 200,
      });
  */
    
    let bearerToken = userArray[exec.scenario.iterationInTest % userArray.length].token;
  
    mandateRequest.delegator.fiscalCode = cf;
    mandateRequest.delegate.fiscalCode = cfPg1;
    mandateRequest.delegate.person = false;
    mandateRequest.delegate.companyName = "testDiCaricoSPA"

    let dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - 15);
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
      'status mandate pg create is 201': (mandateCreate) => mandateCreate.status === 201,
    });
    if(mandateCreate.status === 201){
      mandateCreated.add(1);
    }


    let mandateJson = JSON.parse(mandateCreate.body);
    let urlAcceptMandate = `https://${basePath}/mandate/api/v1/mandate/${mandateJson.mandateId}/accept`;

    let paramsPg = {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + bearerTokenPg1,
        },
      };

    let acceptMandateResp = http.patch(urlAcceptMandate,JSON.stringify(acceptMandateReq),paramsPg);
  
    check(acceptMandateResp, {
      'status mandate pg accept is 204': (acceptMandateResp) => acceptMandateResp.status === 204,
    });
    if(acceptMandateResp.status === 204){
      mandateAccepted.add(1);
    }
  
    if(exec.scenario.iterationInTest !== 1){
      sleep(2);
      
      let urlReject = `https://${basePath}/mandate/api/v1/mandate/${mandateJson.mandateId}/reject`;
          
      let mandateRevoke = http.patch(urlReject, null, paramsPg);

      check(mandateRevoke, {
        'status mandate pg reject is 204': (mandateRevoke) => mandateRevoke.status === 204,
      });
      if(mandateRevoke.status === 204){
        mandateReject.add(1);
      }

    }

    

  sleep(1);

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

