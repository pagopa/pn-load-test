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
   
    const millisecondsString = ((new Date()).getTime()+'').slice(-8);

    const initialString = millisecondsString.slice(0,4)+"-"+millisecondsString.slice(4,millisecondsString.length);
    sleep(1);
    const centralString = ((new Date()).getTime()+'').slice(-4);

    const dateAndVu = ((new Date())).getFullYear() + ((exec.vu.idInTest%99)+'').padStart(2,'1'); 

    //const vuId = ((exec.vu.idInTest%99999)+'').padStart(5,'1'); 
   
    let finalString = (exec.vu.idInTest%99+'').padStart(2,'1');
   
    let resultString = initialString+'-'+centralString+'-'+dateAndVu+'-'+ finalString.slice(0,1)+'-'+finalString.slice(1,2);
    
    return resultString;
}


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

    //console.log("actionDeliveryPushRequest: "+JSON.stringify(actionDeliveryPushRequest));
    
    if(isCurrentAction){
        console.log(" params: "+JSON.stringify(params)+" actionDeliveryPushRequest "+JSON.stringify(actionDeliveryPushRequest));
        let insertActionResponse = http.post(insertActionBasePath, JSON.stringify(actionDeliveryPushRequest) ,params);
   
        check(insertActionResponse, {
            'status insertActionResponse is 200': (insertActionResponse) => insertActionResponse.status === 200,
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

    }
   
}

export default function pocDeliveryPushTest() {
    console.log("basePath: "+basePath);
    console.log("apikey: "+apikey);
    console.log("Action for iun: "+actionForIun);

    let currentIun= generateFakeIUN();
    insertAction(currentIun,false);
   
  
}


