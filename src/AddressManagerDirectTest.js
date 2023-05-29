import { check } from 'k6';
import http from 'k6/http';


export let options = JSON.parse(open('./modules/test-types/'+__ENV.TEST_TYPE+'.json'));

let addressManagerRequest = JSON.parse(open('./model/requestAddressManager.json'));


export default function preloadFileDirect() {
 
    let url = 'http://localhost:8888/address-private/normalize';
    let paramsAddressManager = {
        headers: {
            'Content-Type': 'application/json',
            'pn-address-manager-cx-id' : 'pn-delivery-push'
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
