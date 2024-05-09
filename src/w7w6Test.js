import { sleep } from 'k6';
import { Counter } from 'k6/metrics';
import w6TestOptimized from "./W6Test.js";
import w7TestOptimized from "./W7Test.js";


const w7Iteration = new Counter('w7Iteration');
const w6Iteration = new Counter('w6Iteration');



export const options = {
    setupTimeout: '2400s',
    scenarios: {
      w7_test: {
        executor: "constant-arrival-rate",
        rate: 52,
        timeUnit: "1s", 
        duration: "60m",
        preAllocatedVUs: 200, 
        maxVUs: 9000,
  
        tags: { test_type: 'analogicSoakTest' }, 
        exec: 'analogicSoakTest', 
      },
      w6_test: {
        executor: "constant-arrival-rate",
        rate: 18,
        timeUnit: "1s", 
        duration: "60m",
        preAllocatedVUs: 200, 
        maxVUs: 9000,

        tags: { test_type: 'digitalSoakTest' }, 
        exec: 'digitalSoakTest', 
      },
    }
  };



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