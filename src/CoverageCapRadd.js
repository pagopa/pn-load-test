import { check } from 'k6';
import http from 'k6/http';
import { Counter } from 'k6/metrics';

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
          { target: 5, duration: '2s' },
          /*{ target: 60, duration: '15m' },
          { target: 60, duration: '45m' },
          { target: 5, duration: '0s' },
          { target: 5, duration: '10s' }*/
        ],
        tags: { test_type: 'rampingSoak60' }, 
        exec: 'callCapRaddCoverageEndpoint', 
      }
    }
  };

const code_success = new Counter('code_success');
const code_unauthorized = new Counter('code_unauthorized');
const code_badrequest = new Counter('code_badrequest');
const code_forbidden = new Counter('code_forbidden');
const code_notfound = new Counter('code_notfound');
const code_iserror = new Counter('code_iserror');
const code_serviceunavailable = new Counter('code_serviceunavailable');



export function callCapRaddCoverageEndpoint() {
  let params = {
        headers: {
          'Content-Type': 'application/json',
        },
  };

let request = JSON.stringify({
    cap: '00199',
    city: 'Roma'
});



  let url = `http://localhost:8887/radd-net-private/api/v1/coverages/check?search_mode=COMPLETE`;

  let coverageResponse = http.post(url, request, params );

  if(coverageResponse.status !== 200){
    switch (coverageResponse.status) {
      case 401:
        code_unauthorized.add(1);
        break;
      case 400:
        code_badrequest.add(1);
        break;
      case 403:
        code_forbidden.add(1);
        break;
      case 404:
        code_notfound.add(1);
        break;
      case 500:
        code_iserror.add(1);
        break;
      case 503:
        code_serviceunavailable.add(1);
        break;
    }
  } else {
    code_success.add(1);

  }
  check(coverageResponse, {
      'All the calls succeeded with status code 200!': (coverageResponse) => coverageResponse.status === 200,
  });

}