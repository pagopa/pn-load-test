import { check, sleep } from 'k6';
import http from 'k6/http';
import { Counter } from 'k6/metrics';
  

export let options = JSON.parse(open('./modules/test-types/'+__ENV.TEST_TYPE+'.json'));

const throttling = new Counter('throttling');

let apiKey = `${__ENV.API_KEY}`
let basePath = `${__ENV.BASE_PATH}`



export default function getNotification() {
  let currentIun = 'GZKG-AMPR-TANY-202507-N-1';  
  console.log("INTERNAL IUN: "+currentIun);

  let url = `https://${basePath}/delivery/v2.7/notifications/sent/${currentIun}`;
  console.log('URL: '+url)

  let params = {
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey
    },
  };
  let r = http.get(url, params);

  console.log(`Status ${r.status}`);

  check(r, {
    'status get is 200': (r) => r.status === 200,
  });

  if (r.status === 403) {
    throttling.add(1);
  }

  sleep(1);
  return r;
}