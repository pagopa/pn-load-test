import { sleep } from 'k6';
import { Counter } from 'k6/metrics';
import w6TestOptimized from "./W6Test.js";
import w7TestOptimized from "./W7Test.js";
import F24TestOptimized from './F24Test.js';


const w7Iteration = new Counter('w7Iteration');
const f24Iteration = new Counter('f24Iteration');
const w6Iteration = new Counter('w6Iteration');




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
          { target: 35, duration: '30m' },
          { target: 35, duration: '10m' },
          { target: 5, duration: '0s' },
          { target: 5, duration: '10s' }
        ],
        tags: { test_type: 'analogicSoakTest' }, 
        exec: 'analogicSoakTest', 
      },
      f24_test: {
        executor: 'ramping-arrival-rate',
        timeUnit: '1s',
        startRate: 5, 
        preAllocatedVUs: 200, 
        maxVUs: 9000,

        stages: [
            { target: 5, duration: '10s' },
            { target: 15, duration: '30m' },
            { target: 15, duration: '10m' },
            { target: 5, duration: '0s' },
            { target: 5, duration: '10s' }
        ],
        tags: { test_type: 'f24SoakTest' }, 
        exec: 'f24SoakTest', 
      },
      w6_test: {
        executor: 'ramping-arrival-rate',
        timeUnit: '1s',
        startRate: 1, 
        preAllocatedVUs: 200, 
        maxVUs: 9000,

        stages: [
          { target: 5, duration: '10s' },
          { target: 10, duration: '30m' },
          { target: 10, duration: '10m' },
          { target: 5, duration: '0s' },
          { target: 5, duration: '10s' }
        ],
        tags: { test_type: 'digitalSoakTest' }, 
        exec: 'digitalSoakTest', 
      },
    }
  };



export function analogicSoakTest() {
    F24TestOptimized(true);
    w7Iteration.add(1);
    sleep(2);
}

export function f24SoakTest() {
    w7TestOptimized(true);
    f24Iteration.add(1);
    sleep(2);
}

export function digitalSoakTest() {
    w6TestOptimized(true);
    w6Iteration.add(1);
    sleep(2);
}