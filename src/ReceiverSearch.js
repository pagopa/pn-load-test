import { check, sleep } from 'k6';
import http from 'k6/http';
import { Counter } from 'k6/metrics';

export let options = JSON.parse(open('./modules/test-types/'+__ENV.TEST_TYPE+'.json'));

const throttling = new Counter('throttling');
let bearerToken = `${__ENV.BEARER_TOKEN_USER1}`
let basePath = `${__ENV.WEB_BASE_PATH}`



export default function recipientSearch() {
    /*
    var endDate = new Date().toISOString();
    
    var date = new Date();
    date.setDate(date.getDate() - 2);
    var startDate= date.toISOString();
*/

    //let url = encodeURI(`https://${basePath}/delivery/notifications/received?startDate=${startDate}&endDate=${endDate}&size=10`);
    let url = `https://${basePath}/delivery/notifications/received?startDate=2023-05-29T00%3A00%3A00.000Z&endDate=2023-06-01T00%3A00%3A00.000Z&size=10`;
    
    let token = 'Bearer ' + bearerToken;

    console.log(`Url ${url}`);

    let params = {
      headers: {
      'Content-Type': 'application/json',
      'Authorization': token
      },
      responseType: 'none',
    };

    let r = http.get(url, params);

    console.log(`Notifications Received search Status: ${r.status}`);
    
    check(r, {
      'status search is 200': (r) => r.status === 200,
    });

    console.log(JSON.parse(r.body))

    if (r.status === 429) {
      throttling.add(1);
    }
    sleep(1);
    return r;
 
}



