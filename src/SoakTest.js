import { sleep } from 'k6';
import http from 'k6/http';
import { Counter } from 'k6/metrics';
import downtimeLogsTest from "./DowntimeLogsTest.js";
import mandatePgCompleteTest from "./MandatePgCompleteTest.js";
import delegateMaTest from "./Mandate_Ma.js";
import w6TestOptimized from "./W6Test.js";
import w7TestOptimized from "./W7Test.js";
import loginTest from "./login-http.js";

const w7Iteration = new Counter('w7Iteration');
const w6Iteration = new Counter('w6Iteration');
const downtimeIteration = new Counter('downtimeIteration');
const mandatePFIteration = new Counter('mandatePFIteration');
const mandatePGIteration = new Counter('mandatePGIteration');
const loginIteration = new Counter('loginIteration');



export const options = {
    setupTimeout: '2400s',
    scenarios: {
      w7_test: {
        executor: 'ramping-arrival-rate',
        timeUnit: '1s',
        startRate: 5, 
        preAllocatedVUs: 200, 
        maxVUs: 9000,

        stages: [
          { target: 5, duration: '20m' },

          { target: 50, duration: '0s' },
          { target: 50, duration: '80m' },

          { target: 5, duration: '0s' },
          { target: 5, duration: '260m' }
        ],
        tags: { test_type: 'analogicSoakTest' }, 
        exec: 'analogicSoakTest', 
      },
      w6_test: {
        executor: 'ramping-arrival-rate',
        timeUnit: '1s',
        startRate: 1, 
        preAllocatedVUs: 200, 
        maxVUs: 9000,

        stages: [
          { target: 1, duration: '20m' },

          { target: 10, duration: '0s' },
          { target: 10, duration: '80m' },

          { target: 1, duration: '0s' },
          { target: 1, duration: '260m' }
        ],
        tags: { test_type: 'digitalSoakTest' }, 
        exec: 'digitalSoakTest', 
      },
      downtime_test: {
        executor: 'ramping-arrival-rate',
        timeUnit: '1s',
        startRate: 2, 
        preAllocatedVUs: 200, 
        maxVUs: 9000,

        stages: [
          { target: 2, duration: '20m' },

          { target: 15, duration: '0s' },
          { target: 15, duration: '320m' },

          { target: 2, duration: '0s' },
          { target: 2, duration: '20m' }
        ],
        tags: { test_type: 'downtimeSoakTest' }, 
        exec: 'downtimeSoakTest', 
      },
      mandate_pf_test: {
        executor: 'ramping-arrival-rate',
        timeUnit: '1s',
        startRate: 1, 
        preAllocatedVUs: 200, 
        maxVUs: 9000,

        stages: [
          { target: 1, duration: '20m' },

          { target: 7, duration: '0s' },
          { target: 7, duration: '320m' },

          { target: 1, duration: '0s' },
          { target: 1, duration: '20m' }
        ],
        tags: { test_type: 'mandatePfSoakTest' }, 
        exec: 'mandatePfSoakTest', 
      },
      mandate_pg_test: {
        executor: 'ramping-arrival-rate',
        timeUnit: '1s',
        startRate: 1, 
        preAllocatedVUs: 200, 
        maxVUs: 9000,

        stages: [
          { target: 1, duration: '20m' },

          { target: 7, duration: '0s' },
          { target: 7, duration: '320m' },

          { target: 1, duration: '0s' },
          { target: 1, duration: '20m' }
        ],
        tags: { test_type: 'mandatePgSoakTest' }, 
        exec: 'mandatePgSoakTest', 
      },
      login_test: {
        executor: 'ramping-arrival-rate',
        timeUnit: '1s',
        startRate: 1, 
        preAllocatedVUs: 200, 
        maxVUs: 9000,

        stages: [
          { target: 1, duration: '20m' },

          { target: 15, duration: '0s' },
          { target: 15, duration: '320m' },

          { target: 1, duration: '0s' },
          { target: 1, duration: '20m' }
        ],
        tags: { test_type: 'loginSoakTest' }, 
        exec: 'loginSoakTest', 
      },
    }
  };

let bearerTokenPg1 = `${__ENV.BEARER_TOKEN_USER_PG1}`;
let bearerToken = `${__ENV.BEARER_TOKEN_USER1}`
let basePath = `${__ENV.WEB_BASE_PATH}`;



export function setup() {
    //ATTENZIONE: Nel caso di esecuzione in seguito a test di carico massimo il tempo di setup va alzato di molto
    deleteMandatePF("SETUP");
    deleteMandatePG();
  }
  
  
  export function teardown(request) {
    deleteMandatePF("TEARDOWN");
  }

function deleteMandatePF(fun){
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

function deleteMandatePG(){
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

export function analogicSoakTest() {
    w7TestOptimized();
    w7Iteration.add(1);
    sleep(2);
}

export function digitalSoakTest() {
    w6TestOptimized();
    w6Iteration.add(1);
    sleep(2);
}

export function downtimeSoakTest() {
    downtimeLogsTest();
    downtimeIteration.add(1);
    sleep(2);
}

export function mandatePfSoakTest() {
    delegateMaTest();
    mandatePFIteration.add(1);
    sleep(2);
}

export function mandatePgSoakTest() {
    mandatePgCompleteTest();
    mandatePGIteration.add(1);
    sleep(2);
}

export function loginSoakTest() {
    loginTest();
    loginIteration.add(1);
    sleep(2);
}