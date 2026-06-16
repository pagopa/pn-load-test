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
        maxVUs: 500,
        stages: [
          { target: 40, duration: '3m' },    // ramp-up fino a 40 req/s
          { target: 40, duration: '58m' },   // hold a 40 req/s; la guardia a 139.000 nel codice chiude lo scenario
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

export function f24SoakTest() {
    F24TestOptimized(true);
    f24Iteration.add(1);
    sleep(2);
}

export function digitalSoakTest() {
    w6TestOptimized(true);
    w6Iteration.add(1);
    sleep(2);
}