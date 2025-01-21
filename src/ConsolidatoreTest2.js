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
    let RQID=`K6SEND.${IUN}.TESTPOSTEL.PCRETRY_${exec.scenario.iterationInTest}`;
    console.log('RQID: '+RQID);

    let document = [
      ["safestorage://PN_NOTIFICATION_ATTACHMENTS-b507973f1c6147bf8cc8bbfe118edd65.pdf","V8et70pSHZNQ+UtTnK6NiYEDHjLKbD53SSG+h/zxr4s="],
      ["safestorage://PN_NOTIFICATION_ATTACHMENTS-5ce15d3f40b847039446f167e649ad73.pdf","TVZZc4U/UrH2TusIPNHy0tlk+O+lFzbCUBdzYBXTbgw="],
      ["safestorage://PN_NOTIFICATION_ATTACHMENTS-8f71d2aff158423f961a4447e22d2d59.pdf","zau/OnuF3ORV8j/Zn2PFfVgQpdJK7TbByoCc4Tl8gz8="],
      ["safestorage://PN_NOTIFICATION_ATTACHMENTS-241f1a5484ba48b9b2da5077b8e07cd0.pdf","VYqJkaTCEnWvMUisy8vK+tk5PtUWe73bSHhvMOnLFGI="],
      ["safestorage://PN_NOTIFICATION_ATTACHMENTS-488cb83dd75f4c4e9e5f9f16118bc262.pdf","lEcsKu6zHBKvlE27B7gyoUioSBdiCs3GsDSgf+bmYWQ="]];

    paperRequest.attachments[1].uri = document[exec.scenario.iterationInTest % document.length][0];
    paperRequest.attachments[1].sha256 = document[exec.scenario.iterationInTest % document.length][1];
    paperRequest.attachments[1].documentType = "ATTO";

    //PARAMETRIZZARE I PARAMETRI HC
    paperRequest.requestId = RQID;
    paperRequest.productType = '890'
    paperRequest.receiverCap = '06044';
    paperRequest.receiverCity = 'CASTEL RITALDI';
    paperRequest.receiverPr = 'PG';
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