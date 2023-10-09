import { sleep } from 'k6';
import http from 'k6/http';
import { Counter } from 'k6/metrics';
import apiKey from './ApiKeyManagerTest.js';
import downtimeLogsTest from "./DowntimeLogsTest.js";
import delegateMaTest from "./Mandate_Ma.js";
import w6TestOptimized from "./W6Test.js";
import loginTest from "./login-http.js";


const w6Iteration = new Counter('w6Iteration');
const downtimeIteration = new Counter('downtimeIteration');
const mandatePFIteration = new Counter('mandatePFIteration');
const apiKeyIteration = new Counter('apiKeyIteration');
const loginIteration = new Counter('loginIteration');



export const options = {
    setupTimeout: '2400s',
    scenarios: {
      w6_test: {
        executor: 'ramping-arrival-rate',
        timeUnit: '20s',
        startRate: 1, 
        preAllocatedVUs: 200, 
        maxVUs: 9000,

        stages: [
          { target: 1, duration: '30m' },
        ],
        tags: { test_type: 'digitalUserSoakTest' }, 
        exec: 'digitalUserSoakTest', 
      },
      downtime_test: {
        executor: 'ramping-arrival-rate',
        timeUnit: '20s',
        startRate: 2, 
        preAllocatedVUs: 200, 
        maxVUs: 9000,

        stages: [
          { target: 2, duration: '30m' }
        ],
        tags: { test_type: 'downtimeUserSoakTest' }, 
        exec: 'downtimeUserSoakTest', 
      },
      mandate_pf_test: {
        executor: 'ramping-arrival-rate',
        timeUnit: '60s',
        startRate: 1, 
        preAllocatedVUs: 200, 
        maxVUs: 9000,

        stages: [
          { target: 1, duration: '30m' }
        ],
        tags: { test_type: 'mandatePfUserSoakTest' }, 
        exec: 'mandatePfUserSoakTest', 
      },
      login_test: {
        executor: 'ramping-arrival-rate',
        timeUnit: '60s',
        startRate: 1, 
        preAllocatedVUs: 200, 
        maxVUs: 9000,

        stages: [
          { target: 1, duration: '30m' },
        ],
        tags: { test_type: 'loginUserSoakTest' }, 
        exec: 'loginUserSoakTest', 
      },
      apikey_test: {
        executor: 'ramping-arrival-rate',
        timeUnit: '60s',
        startRate: 1, 
        preAllocatedVUs: 200, 
        maxVUs: 9000,

        stages: [
          { target: 1, duration: '30m' },
        ],
        tags: { test_type: 'apiKeyUserSoakTest' }, 
        exec: 'apiKeyUserSoakTest', 
      }
    }
  };

let bearerToken = `${__ENV.BEARER_TOKEN_USER1}`
let basePath = `${__ENV.WEB_BASE_PATH}`;



export function setup() {
    //ATTENZIONE: Nel caso di esecuzione in seguito a test di carico massimo il tempo di setup va alzato di molto
    deleteMandatePF("SETUP");
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



export function digitalUserSoakTest() {
    w6TestOptimized();
    w6Iteration.add(1);
    sleep(2);
}

export function downtimeUserSoakTest() {
    downtimeLogsTest();
    downtimeIteration.add(1);
    sleep(2);
}

export function mandatePfUserSoakTest() {
    delegateMaTest();
    mandatePFIteration.add(1);
    sleep(2);
}


export function loginUserSoakTest() {
    loginTest();
    loginIteration.add(1);
    sleep(2);
}

export function apiKeyUserSoakTest() {
    apiKey();
    apiKeyIteration.add(1);
    sleep(2);
}