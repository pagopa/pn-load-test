import { createMandate } from "./modules/createMandate.js";
import { notificationsReceivedDelegated } from "./modules/notificationsReceivedDelegated.js";
import { revokeMandate } from "./modules/revokeMandate.js";
import { acceptMandate } from "./modules/acceptMandate.js";
import { check, sleep } from 'k6';
import { Counter } from 'k6/metrics';

/*export const options = {
  vus: 1,
  duration: '1s',
};*/

export let options = JSON.parse(open('/modules/test-types/'+__ENV.TEST_TYPE+'.json'));

const throttling = new Counter('throttling');

//var mandateId = '4e432dbe-e2c5-4367-8e28-169c4287ea32';
var iun = 'QZHD-TXMV-GUPU-202303-Q-1';

export function setup() {
  var r = createMandate();
  console.log(r.body);
  
  check(r, {
      'status is 201': (r) => r.status === 201,
  });

  if (r.status === 429) {
    throttling.add(1);
  }
  sleep(1);

  if(r.status === 201) {
    var body = JSON.parse(r.body);
    console.log(`Mandate Create Status: ${r.status}`);
    console.log(`Body: ${r.body}`);
    var mandateId =  body.mandateId

    r = acceptMandate(mandateId);
    console.log(`Mandate Accept Status: ${r.status}`);
    console.log(`Body: ${r.body}`);
    check(r, {
      'status is 204': (r) => r.status === 204,
    });
    
    if(r.status === 429) {
      throttling.add(1);
    }
    sleep(1);

    //sendNotifications to USER1

    var response = {};
    response["mandateId"] = mandateId;
    response["iun"] = iun;
    return response;
  }
}

export function teardown(request) {
  if(request !== undefined && request.mandateId !== undefined) {
    var r = revokeMandate(request.mandateId);
    console.log(`Mandate Revoke Status: ${r.status}`);
    check(r, {
        'status is 204': (r) => r.status === 204,
    });
    
    if (r.status === 429) {
      throttling.add(1);
    }
    sleep(1);
  }
}

export default function (request) {
  if(request !== undefined && request.mandateId !== undefined && request.iun !== undefined) {
    var r = notificationsReceivedDelegated(request.iun, request.mandateId);
    console.log(`Notifications Received Iun Delegated Status: ${r.status}`);
    console.log(`Body: ${r.body}`);
    check(r, {
      'status is 200': (r) => r.status === 200,
    });

    if (r.status === 429) {
      throttling.add(1);
    }
    sleep(1);
  }
}



