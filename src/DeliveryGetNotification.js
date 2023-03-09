import { check, sleep } from 'k6';
import http from 'k6/http';
import { Counter } from 'k6/metrics';


export let options = {
  // virtual users
  vus: 44,
  // duration: '60s',
  //duration: '30s',
  stages: [
    { duration: "10s", 
        target: 22,
        thresholds: {
            http_req_duration: ['p(95)<5000'],
        } 
    },
    { duration: "10s", 
        target: 44,
        thresholds: {
            http_req_duration: ['p(90)<5000'],
        } 
    },
    { duration: "10s", 
        target: 44,
        thresholds: {
            http_req_duration: ['max<50000'],
        } 
    },
    { duration: "10s", 
        target: 22,
        thresholds: {
            http_req_duration: ['p(95)<5000'],
        } 
    },
    { duration: "10s", 
        target: 11,
        thresholds: {
            http_req_duration: ['p(95)<5000'],
        } 
    },
    { duration: "10s", 
        target: 0,
        thresholds: {
            http_req_duration: ['p(95)<5000'],
        } 
    },
  ] 
   
  //target serve per avere una crescita/decrescita nei vu da 0 a target/ da n a target linearmente 
};


const throttling = new Counter('throttling');



export default function getNotification() {

  var apiKey = `${__ENV.API_KEY}`
  var envName = `${__ENV.ENV_NAME}`

  var url = `https://api.${envName}.pn.pagopa.it/delivery/notifications/sent/YJVP-WZXH-RTAR-202303-G-1`;

  var params = {
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey
    },
  };
  var r = http.get(url, params);

  console.log(`Status ${r.status}`);

  check(r, {
    'status is 200': (r) => r.status === 200,
  });

  if (r.status === 429) {
    throttling.add(1);
  }

  sleep(1);
}