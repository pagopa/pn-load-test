import http from 'k6/http';
import { Counter } from 'k6/metrics';
import { check, sleep } from 'k6';
import { uuidv4 } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';
import exec from 'k6/execution';
import { URL } from 'https://jslib.k6.io/url/1.0.0/index.js';


export let options = JSON.parse(open('./modules/test-types/'+__ENV.TEST_TYPE+'.json'));

let apikey = `${__ENV.LAMBDA_API_KEY}`;
let basePath = `${__ENV.LAMBDA_BASE_PATH}`;
let actionForIun = `${__ENV.ACTION_FOR_IUN}`;
let testMode = `${__ENV.TEST_MODE}`; //0 only action 1 only futureAction 2 action and futureAction (50/50)
let numberOfCurrentAction = `${__ENV.NUMBER_OF_CURRENT_ACTION}`; //immediate action number only for TEST_MODE 2

let actionDeliveryPushRequest = JSON.parse(open('./model/ActionManagerBody.json'));


function generateUid(addHours) {

    const currentDate = new Date();
    const currentMilliseconds = currentDate.getTime();
    const millisecondsString = (currentMilliseconds+'').slice(-5);

    const formattedDate = currentDate.getFullYear() +
        '_' + ('0' + (currentDate.getMonth() + 1)).slice(-2) +
        '_' + ('0' + currentDate.getDate()).slice(-2);

    const vuId = ((exec.vu.idInTest%99999)+'').padStart(5,'1'); 
    
    let resultString = millisecondsString + '-'+vuId+'-' + formattedDate;
    if(addHours){
        resultString +=
        'T' + ('0' + currentDate.getHours()).slice(-2) +
        ':' + ('0' + currentDate.getMinutes()).slice(-2) +
        ':' + ('0' + currentDate.getSeconds()).slice(-2);
    }
    return resultString;
}


function generateFakeIUN() {
   
    const getRandomLetters = (length) =>
        Array.from({ length }, () => String.fromCharCode(65 + Math.floor(Math.random() * 26))).join('');

    const getRandomDigits = (length) =>
        Array.from({ length }, () => Math.floor(Math.random() * 10)).join('');

    const part1 = getRandomLetters(4);
    const part2 = getRandomLetters(4);
    const part3 = getRandomLetters(4);
    const part4 = getRandomDigits(6);
    const part5 = getRandomLetters(1);
    const part6 = getRandomDigits(1);

    return `${part1}-${part2}-${part3}-${part4}-${part5}-${part6}`;
}

let actionsType = [ "NOTIFICATION_VALIDATION", "NOTIFICATION_REFUSED", "NOTIFICATION_CANCELLATION", "SCHEDULE_RECEIVED_LEGALFACT_GENERATION", "CHECK_ATTACHMENT_RETENTION", "START_RECIPIENT_WORKFLOW", "CHOOSE_DELIVERY_MODE", "ANALOG_WORKFLOW", "DIGITAL_WORKFLOW_NEXT_ACTION", 
    "DIGITAL_WORKFLOW_NEXT_EXECUTE_ACTION", "DIGITAL_WORKFLOW_NO_RESPONSE_TIMEOUT_ACTION", "DIGITAL_WORKFLOW_RETRY_ACTION", "SEND_DIGITAL_FINAL_STATUS_RESPONSE", "REFINEMENT_NOTIFICATION", "SENDER_ACK", "DOCUMENT_CREATION_RESPONSE", "POST_ACCEPTED_PROCESSING_COMPLETED", "SEND_ANALOG_FINAL_STATUS_RESPONSE" ]

function insertAction(iun, isCurrentAction){

    let insertActionBasePath = `http://internal-EcsA-20230409091221502000000003-2047636771.eu-south-1.elb.amazonaws.com:8080/action-manager-private/action`;

    let params = {
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apikey,
        },
    };
    
    actionDeliveryPushRequest.actionId = "Test_"+generateUid(false)+"_"+iun+"_"+uuidv4();
    actionDeliveryPushRequest.iun = iun;
    let currentDate = (new Date());
    currentDate.setMinutes(currentDate.getMinutes() - 1);
    actionDeliveryPushRequest.notBefore = currentDate.toISOString();
    actionDeliveryPushRequest.timeslot = (currentDate.toISOString()+'').slice(0,16);
    actionDeliveryPushRequest.type = actionsType[exec.scenario.iterationInTest % actionsType.length];

    //console.log("actionDeliveryPushRequest: "+JSON.stringify(actionDeliveryPushRequest));
    
    if(isCurrentAction){
        console.log(" params: "+JSON.stringify(params)+" actionDeliveryPushRequest "+JSON.stringify(actionDeliveryPushRequest));
        let insertActionResponse = http.post(insertActionBasePath, JSON.stringify(actionDeliveryPushRequest) ,params);
   
        check(insertActionResponse, {
            'status insertActionResponse is 201': (insertActionResponse) => insertActionResponse.status === 201,
        });

        check(insertActionResponse, {
            'error insertActionResponse is 4xx': (insertActionResponse) => insertActionResponse.status >= 400 && insertActionResponse.status < 500,
        });
    
        check(insertActionResponse, {
            'error insertActionResponse is 5xx': (insertActionResponse) => insertActionResponse.status >= 500,
        });
    }else{
        let currentDate = (new Date());
        //currentDate.setDate(currentDate.getDate() + 1);
        currentDate.setMinutes(currentDate.getMinutes() + (5 + (exec.vu.idInTest%5)));
        //console.log("DEBUG CURRENTE DATE: "+currentDate.toISOString());
        actionDeliveryPushRequest.notBefore = currentDate.toISOString();
        actionDeliveryPushRequest.timeslot = (currentDate.toISOString()+'').slice(0,16);

        console.log(" params: "+JSON.stringify(params)+" FutureActionDeliveryPushRequest "+JSON.stringify(actionDeliveryPushRequest));
        let insertFutureActionResponse = http.post(insertActionBasePath, JSON.stringify(actionDeliveryPushRequest) ,params);
   
        check(insertFutureActionResponse, {
            'status insertFutureActionResponse is 201': (insertFutureActionResponse) => insertFutureActionResponse.status === 201,
        });

         check(insertFutureActionResponse, {
            'error insertFutureActionResponse is 4xx': (insertFutureActionResponse) => insertFutureActionResponse.status >= 400 && insertFutureActionResponse.status < 500,
        });
    
        check(insertFutureActionResponse, {
            'error insertFutureActionResponse is 5xx': (insertFutureActionResponse) => insertFutureActionResponse.status >= 500,
        });

        sleep(30);
    
        let unscheduleActionResponse = http.put(insertActionBasePath+'/'+actionDeliveryPushRequest.actionId+'/unschedule',params);

        console.log('STATUS unscheduleActionResponse: ',unscheduleActionResponse.status);
   
        check(unscheduleActionResponse, {
            'status unscheduleActionResponse is 204': (unscheduleActionResponse) => unscheduleActionResponse.status === 204,
        });

         check(unscheduleActionResponse, {
            'error unscheduleActionResponse is 4xx': (unscheduleActionResponse) => unscheduleActionResponse.status >= 400 && unscheduleActionResponse.status < 500,
        });
    
        check(unscheduleActionResponse, {
            'error unscheduleActionResponse is 5xx': (unscheduleActionResponse) => unscheduleActionResponse.status >= 500,
        });
    }
   
}

export default function pocDeliveryPushTest() {
    console.log("basePath: "+basePath);
    console.log("apikey: "+apikey);
    console.log("Action for iun: "+actionForIun);
    //one execution every 5 
    let futureActionExecution = (exec.scenario.iterationInTest % 5)
    let currentIun= generateFakeIUN();
    if(futureActionExecution == 0){
        insertAction(currentIun,false);
    }else{
        insertAction(currentIun,true);
    }
    
   
  
}


