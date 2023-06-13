import { check } from 'k6';
import exec from 'k6/execution';
import http from 'k6/http';


export let options = JSON.parse(open('./modules/test-types/'+__ENV.TEST_TYPE+'.json'));
let addressManagerRequest = JSON.parse(open('./model/requestAddressManager.json'));

let iunFile = open('./resources/NotificationIUN.txt');
let capArray = ['20121','20131','20141','20151', '20161', '20122', '20132', '20142', '20152','20162', '20123', '20133',
 '20143', '20153', '20124', '20134', '20144', '20154', '20125', '20135', '20145', '20155', '20126', '20136', '20146',
  '20156', '20127', '20137', '20147', '20157', '20128', '20138', '20148', '20158', '20129', '20139','20149', '20159'];

export function setup() {
    let useIunFile = `${__ENV.USE_IUN_FILE}`
    if(useIunFile && useIunFile !== 'undefined') {
      let iunArray = iunFile.split(';');
      console.log("IUN_LENGTH: "+ iunArray.length);
      return iunArray
    }
    return sendNotificationToPn("FRMTTR76M06B715E").iun;
}

export default function addressManagerDirect(iun) {

    let useIunFile = `${__ENV.USE_IUN_FILE}`
    let currentIun = iun;
    if(useIunFile && useIunFile !== 'undefined') {
        currentIun = iun[exec.scenario.iterationInTest % iun.length].trim();
    }

    addressManagerRequest.correlationId = 'VALIDATE_NORMALIZE_ADDRESSES_REQUEST_IUN_'+currentIun;
    addressManagerRequest.requestItems[0].id = exec.scenario.iterationInTest;
    addressManagerRequest.requestItems[0].cap= capArray[exec.scenario.iterationInTest % capArray.length].trim();
    addressManagerRequest.requestItems[0].addressRow = 'VIA Mazzini '+exec.scenario.iterationInTest;


    let url = 'http://internal-EcsA-20230406081307135800000004-20484703.eu-south-1.elb.amazonaws.com:8080/address-private/normalize';
    let paramsAddressManager = {
        headers: {
            'Content-Type': 'application/json',
            'pn-address-manager-cx-id' : 'pn-delivery-push',
            'x-api-key' : ' '
        },
    };

    let payload = JSON.stringify(addressManagerRequest);
    console.log('body: '+payload);
    let preloadResponse = http.post(url, payload, paramsAddressManager);
    
    console.log("ADDRESS-MANAGER-DIRECT : "+preloadResponse.status);

    check(preloadResponse, {
        'status addressManager is 200': (preloadResponse) => preloadResponse.status === 200,
    });

    check(preloadResponse, {
        'error addressManager is 5xx': (preloadResponse) => preloadResponse.status >= 500,
    });
    
   
}
