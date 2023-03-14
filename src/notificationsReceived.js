import { notificationsReceived } from "./modules/notificationsReceived.js";
import { check, sleep } from 'k6';
import { Counter } from 'k6/metrics';

export const options = {
  vus: 1,
  duration: '1s',
};

//export let options = JSON.parse(open('/modules/test-types/'+__ENV.TEST_TYPE+'.json'));

const throttling = new Counter('throttling');

//var mandateId = '4e432dbe-e2c5-4367-8e28-169c4287ea32';
var mandateId;
var iun = 'QZHD-TXMV-GUPU-202303-Q-1';

export function setup() {
    //sendNotifications to USER1
}

export default function () {
    var r = notificationsReceived(iun);

    console.log(`Notifications Received Iun Status: ${r.status}`);
    console.log(`Response body ${r.body}`);
    
    check(r, {
      'status is 200': (r) => r.status === 200,
    });

    if (r.status === 429) {
      throttling.add(1);
    }
    sleep(1);
 
}



