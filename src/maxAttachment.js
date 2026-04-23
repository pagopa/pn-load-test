import { sleep } from 'k6';
import { Counter } from 'k6/metrics';
import w7TestOptimized from "./W7Test.js";
import F24TestOptimized from './F24Test.js';

const w7Iteration = new Counter('w7Iteration');
const w6Iteration = new Counter('w6Iteration');
const f24Iteration = new Counter('f24Iteration');


export const options = {
    setupTimeout: '2400s',
    scenarios: {
      w7_test: {
        executor: 'ramping-arrival-rate',
        timeUnit: '1s',
        startRate: 1, 
        preAllocatedVUs: 200, 
        maxVUs: 9000,

        stages: [
          { target: 1, duration: '2s' },
          { target: 7, duration: '10m' },
          { target: 7, duration: '25m' },
          { target: 1, duration: '5m' }
        ],
        tags: { test_type: 'analogicSoakTest' }, 
        exec: 'analogicSoakTest', 
      }
    }
  };



export function analogicSoakTest() {
    F24TestOptimized(true);
    f24Iteration.add(1);
    sleep(2);
}