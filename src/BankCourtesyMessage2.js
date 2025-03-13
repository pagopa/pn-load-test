import { check,sleep } from 'k6';
import exec from 'k6/execution';
import http from 'k6/http';
import { Counter } from 'k6/metrics';


export let options = JSON.parse(open('./modules/test-types/'+__ENV.TEST_TYPE+'.json'));

let params = {
    headers: {
        'Content-Type': 'application/json'
    }
};

let basePath = 'http://internal-ecsa-20230504103152508600000011-1839177861.eu-south-1.elb.amazonaws.com:8080';


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


export default function callEmdIntegration() {

  let sendMessagePayload = JSON.stringify({
    internalRecipientId: '5b334d4a-0gt7-24ac-9c7b-354e2d44w5tr',
    recipientId: 'RSSMRA85T10A562S',
    senderDescription: 'Comune di Milano',
    originId: generateFakeIUN(),
    associatedPayment: true,
  });

  let responseSendMessagge = http.post(`${basePath}/emd-integration-private/send-message`, sendMessagePayload, params);
  check(responseSendMessagge, {
    'status send-message emd is 200': (responseSendMessagge) => responseSendMessagge.status === 200,
  });
  check(responseSendMessagge, {
    'status send-message emd is not 200': (responseSendMessagge) => responseSendMessagge.status !== 200,
  });


  let retrievalIdToken = generateFakeIUN()+"~OK~13212-abvee1-3332-aaa";
  let responseToken = http.get(`${basePath}/emd-integration-private/token/check-tpp?retrievalId=${retrievalIdToken}`);
  check(responseToken, {
    'status token/check-tpp emd is 200': (responseToken) => responseToken.status === 200,
  });
  check(responseToken, {
    'status token/check-tpp emd is not 200': (responseToken) => responseToken.status !== 200,
  });
  

  let retrievalIdEmd = generateFakeIUN()+"~OK~13212-abvee1-3332-aaa";
  let responseEmd = http.get(`${basePath}/emd-integration-private/emd/check-tpp?retrievalId=${retrievalIdEmd}`);
  check(responseEmd, {
    'status emd/check-tpp emd is 200': (responseEmd) => responseEmd.status === 200,
  });
  check(retrievalIdEmd, {
    'status emd/check-tpp emd is not 200': (responseEmd) => responseEmd.status !== 200,
  });

  let noticeCodeNumber = ("3" + (((exec.scenario.iterationInTest+''+exec.vu.idInTest+''+(Math.floor(Math.random() * 9999999))).substring(0,7) +''+ new Date().getTime().toString().substring(3,13)).padStart(17, '0').substring(0, 17)));
  let retrievalIdPayment = generateFakeIUN()+"~OK~13212-abvee1-3332-aaa";
  let responsePayment = http.get(`${basePath}/emd-integration-private/payment-url?retrievalId=${retrievalIdPayment}&noticeCode=${noticeCodeNumber}&paTaxId=77777777777`);
  check(responsePayment, {
    'status payment-url emd is 200': (responsePayment) => responsePayment.status === 200,
  });
  check(responsePayment, {
    'status payment-url emd is not 200': (responsePayment) => responsePayment.status !== 200,
  });


}