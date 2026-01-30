import { sleep } from 'k6';
import { Counter } from 'k6/metrics';
import w7TestOptimized from "./W7Test.js";


const w7Iteration = new Counter('w7Iteration');


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
          { target: 5, duration: '10s' },
          { target: 60, duration: '1m' },
          { target: 60, duration: '3m' },
          { target: 5, duration: '0s' },
          { target: 5, duration: '10s' }
        ],
        tags: { test_type: 'analogicSoakTest' }, 
        exec: 'analogicSoakTest', 
      }
    }
  };



export function analogicSoakTest() {
    w7TestOptimized(true);
    w7Iteration.add(1);
    sleep(2);
}