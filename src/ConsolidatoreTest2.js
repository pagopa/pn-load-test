import { check, sleep } from 'k6';
import exec from 'k6/execution';
import http from 'k6/http';



export let options = JSON.parse(open('./modules/test-types/'+__ENV.TEST_TYPE+'.json'));

let paperRequest = JSON.parse(open('./model/paperRequest.json'));

//let basePath = `${__ENV.BASE_PATH}`;

const now = new Date();
const year = now.getFullYear();
const month = String(now.getMonth() + 1).padStart(2, '0'); 
const day = String(now.getDate()).padStart(2, '0');
const hours = String(now.getHours()).padStart(2, '0');
const minutes = String(now.getMinutes()).padStart(2, '0');

const dateStr = `${year}${month}${day}-${hours}${minutes}`;

const IUN = `IUN_CONS-${dateStr}-F-1`;




export function sendDirectConsolidatore() {

    //${IUN}.PARAMETRIZZARE_QUESTO.PCRETRY_${exec.scenario.iterationInTest}`; 
    //TESTCASE
    let RQID=`K6SEND.${IUN}.POSTEL.PCRETRY_${exec.scenario.iterationInTest}`;
    console.log('RQID: '+RQID);

    //PARAMETRIZZARE I PARAMETRI HC
    paperRequest.requestId = RQID;
    paperRequest.productType = 'AR'
    paperRequest.receiverCap = '00013';
    paperRequest.receiverCity = 'CASTELCHIODATO';
    paperRequest.receiverPr = 'RM';
    paperRequest.receiverCountry = 'ITALIA';
    
    let url = `http://localhost:8889/external-channels/v1/paper-deliveries-engagements/${RQID}`;

     let params = {
        headers: {
            'Content-Type': 'application/json',
            'x-pagopa-extch-cx-id': 'pn-cons-000'
        },
    };

 
    let payload = JSON.stringify(paperRequest);


    let r = http.put(url, payload, params);

    check(r, {
        'status send is KO': (r) => r.status !== 200,
    });

    check(r, {
        'status send is 200': (r) => r.status === 200,
    });
        

    return r;
  
}



export default function consolidatoreTest() {

  try{
    sendDirectConsolidatore();
  }catch(error){
    console.log('sendDirectConsolidatore error: ',error)
  }
  

  sleep(1);
}