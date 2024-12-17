import { check, sleep } from 'k6';
import crypto from 'k6/crypto';
import { SharedArray } from 'k6/data';
import encoding from 'k6/encoding';
import exec from 'k6/execution';
import http from 'k6/http';



export let options = JSON.parse(open('./modules/test-types/'+__ENV.TEST_TYPE+'.json'));

let notificationReceivedLegalFact = JSON.parse(open('./model/templateEngine/receivedLegalFact.json'));
let viewedLegalFact = JSON.parse(open('./model/templateEngine/viewedLegalFact.json'));
let malfunctionLegalFact = JSON.parse(open('./model/templateEngine/malfunctionLegalFact.json'));
let cancelledLegalFact = JSON.parse(open('./model/templateEngine/cancelledLegalFact.json'));
let analogWorkflowFailureLegalFact = JSON.parse(open('./model/templateEngine/analogWorkflowFailureLegalFact.json'));
let pecDeliveryWorkflowLegalFact = JSON.parse(open('./model/templateEngine/pecDeliveryWorkflowLegalFact.json'));
let notificationAAR = JSON.parse(open('./model/templateEngine/notificationAAR.json'));
let notificationAarRaddAlt = JSON.parse(open('./model/templateEngine/notificationAarRaddAlt.json'));
let notificationAarForEmail = JSON.parse(open('./model/templateEngine/notificationAarForEmail.json'));
let notificationAarForPec = JSON.parse(open('./model/templateEngine/notificationAarForPec.json'));
let notificationAarForSms = JSON.parse(open('./model/templateEngine/notificationAarForSms.json'));


export function templateEngineTest(request, body) {
    let url = `http://localhost:8886/${request}`;

    //console.log(`Url ${url}`);

    let params = {
      headers: {
      'Content-Type': 'application/json',
      'x-language': 'IT'
      }
    };

    let payload = JSON.stringify(body);
    let response = http.put(url, payload, params);

    let requestId = request.replace('templates-engine-private/v1/templates/','');
    if(response.status > 202)console.log("http response value is: "+response.status+"for request: "+requestId);

    check(response, {
        'status templateEngine is KO': (response) => response.status > 202,
    });

    check(response, {
        'status templateEngine is 202': (response) => response.status === 202,
    });
 
}

export default function templateLoadTest() {

    try{
        templateEngineTest('templates-engine-private/v1/templates/notification-received-legal-fact',notificationReceivedLegalFact);
    }catch(error){
        console.log('notification-received-legal-fact error: ',error)
    }
    
    try{
        templateEngineTest('templates-engine-private/v1/templates/notification-viewed-legal-fact',viewedLegalFact);
    }catch(error){
        console.log('notification-viewed-legal-fact error: ',error)
    }

    try{
        templateEngineTest('templates-engine-private/v1/templates/malfunction-legal-fact',malfunctionLegalFact);
    }catch(error){
        console.log('malfunction-legal-fact error: ',error)
    }
   
    try{
        templateEngineTest('templates-engine-private/v1/templates/notification-cancelled-legal-fact',cancelledLegalFact);
    }catch(error){
        console.log('notification-cancelled-legal-fact error: ',error)
    }

    try{
        templateEngineTest('templates-engine-private/v1/templates/analog-delivery-workflow-failure-legal-fact',analogWorkflowFailureLegalFact);
    }catch(error){
        console.log('analog-delivery-workflow-failure-legal-fact error: ',error)
    }

    try{
        templateEngineTest('templates-engine-private/v1/templates/pec-delivery-workflow-legal-fact',pecDeliveryWorkflowLegalFact);
    }catch(error){
        console.log('pec-delivery-workflow-legal-fact error: ',error)
    }

    try{
        templateEngineTest('templates-engine-private/v1/templates/notification-aar',notificationAAR);
    }catch(error){
        console.log('notification-aar error: ',error)
    }

    try{
        templateEngineTest('templates-engine-private/v1/templates/notification-aar-radd-alt',notificationAarRaddAlt);
    }catch(error){
        console.log('notification-aar-radd-alt error: ',error)
    }

    try{
        templateEngineTest('templates-engine-private/v1/templates/notification-aar-for-email',notificationAarForEmail);
    }catch(error){
        console.log('notification-aar-for-email error: ',error)
    }

    try{
        templateEngineTest('templates-engine-private/v1/templates/notification-aar-for-pec',notificationAarForPec);
    }catch(error){
        console.log('notification-aar-for-pec error: ',error)
    }

    try{
        templateEngineTest('templates-engine-private/v1/templates/notification-aar-for-sms',notificationAarForSms);
    }catch(error){
        console.log('notification-aar-for-sms error: ',error)
    }

    
    

    sleep(2);
  }
