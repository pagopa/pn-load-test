import { check, sleep } from 'k6';
import exec from 'k6/execution';
import http from 'k6/http';



export let options = JSON.parse(open('./modules/test-types/'+__ENV.TEST_TYPE+'.json'));

let notificationRequest = JSON.parse(open('./model/notificationRequest.json'));
let paymentRequest = JSON.parse(open('./model/payment.json'));

let apiKey = `${__ENV.API_KEY}`;
let basePath = `${__ENV.BASE_PATH}`;
let withGroup = `${__ENV.WITH_GROUP}`;
let withPayment = `${__ENV.WITH_PAYMENT}`;
let paTaxId = `${__ENV.PA_TAX_ID}`;
let moreAttach = `${__ENV.MORE_ATTACH}`;

let sha256;





export function sendConsolidatore() {

    notificationRequest.documents[0].ref.key = "PN_NOTIFICATION_ATTACHMENTS-8c0b7e80907844e7b3a0c5d3c955c99d.pdf"
    notificationRequest.documents[0].digests.sha256 = "V8et70pSHZNQ+UtTnK6NiYEDHjLKbD53SSG+h/zxr4s=";

    notificationRequest.recipients[0].taxId ='NVDLVK91L50E991P';


    if(moreAttach && moreAttach !== 'undefined') {
        console.log('no moreAttach');
    }


    delete notificationRequest.recipients[0].physicalAddress.at;
   
    notificationRequest.recipients[0].physicalAddress.address = 'VIA_PN_2_CONS';
    notificationRequest.recipients[0].physicalAddress.zip = '80012';
    notificationRequest.recipients[0].physicalAddress.municipality = 'CALVIZZANO';
    delete notificationRequest.recipients[0].physicalAddress.municipalityDetails;
    notificationRequest.recipients[0].physicalAddress.province = 'NA';

    
    let url = `https://${basePath}/delivery/requests`;

     let params = {
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey
        },
    };

    if(withGroup && withGroup !== 'undefined') {
        notificationRequest.group = "6467344676f10c7617353c90";
    }


    notificationRequest.senderTaxId = paTaxId;

    notificationRequest.paProtocolNumber = ("2023" + (((exec.scenario.iterationInTest+''+exec.vu.idInTest+''+(Math.floor(Math.random() * 9999999))).substring(0,7) +''+ new Date().getTime().toString().substring(0,13)).padStart(20, '0').substring(0, 20)));

    console.log('paprotocol: '+notificationRequest.paProtocolNumber);
    let payload = JSON.stringify(notificationRequest);

    console.log('notificationRequest: '+JSON.stringify(notificationRequest));

    let r = http.post(url, payload, params);

    console.log(`Status ${r.status}`);

    check(r, {
        'status W7 is 409': (r) => r.status === 409,
    });

    check(r, {
        'status W7 is 202': (r) => r.status === 202,
    });
    
    console.log('REQUEST-ID-LOG: '+r.body)

    if (r.status === 403) {
        throttling.add(1);
     }

    

    return r;
  
}




/**
 * This test is the optimized version of the DeliverSendAndReceiverGetDownload.js test
 * 
 * The K6 memory leak is partially caused by the use of external modules
*/
export default function consolidatoreTest() {

  try{
    sendConsolidatore();
  }catch(error){
    console.log('internalSendNotification error: ',error)
  }
  

  sleep(1);
}