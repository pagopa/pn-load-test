import { check, sleep } from 'k6';
import exec from 'k6/execution';
import http from 'k6/http';
import { Counter } from 'k6/metrics';
import { sendNotificationToPn } from './modules/sendNotification.js';
  


const throttling = new Counter('throttling');

let apiKey = `${__ENV.API_KEY}`
let basePath = `${__ENV.BASE_PATH}`
let iunFile = open('./resources/NotificationIUN.txt');


export const options = {
    setupTimeout: '2400s',
    scenarios: {
      rest_test: {
        executor: 'ramping-arrival-rate',
        timeUnit: '1s',
        startRate: 5, 
        preAllocatedVUs: 200, 
        maxVUs: 9000,

        stages: [
          { target: 5, duration: '10s' },
          { target: 60, duration: '15m' },
          { target: 60, duration: '60m' },
          { target: 5, duration: '0s' },
          { target: 5, duration: '10s' }
        ],
        tags: { test_type: 'getNotificationAndLegalFacts' }, 
        exec: 'getNotificationAndLegalFacts', 
      },
    }
  };

export function setup() {
  let useIunFile = `${__ENV.USE_IUN_FILE}`
  if(useIunFile && useIunFile !== 'undefined') {
    let iunArray = iunFile.split(';');
    console.log("IUN_LENGTH: "+ iunArray.length);
    return iunArray
  }
  return sendNotificationToPn("FRMTTR76M06B715E").iun;
}



export function getNotificationAndLegalFacts(iun) {
  let useIunFile = `${__ENV.USE_IUN_FILE}`
  let currentIun = iun;
  if(useIunFile && useIunFile !== 'undefined') {
    currentIun = iun[exec.scenario.iterationInTest % iun.length].trim();
  }
  
  console.log("INTERNAL IUN: "+currentIun);
  let url = `https://${basePath}/delivery/v2.6/notifications/sent/${currentIun}`;
  console.log('URL: '+url)

  let params = {
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey
    },
  };
  let r = http.get(url, params);

  console.log(`Status ${r.status}`);

  check(r, {
    'status get is 200': (r) => r.status === 200,
  });

  if (r.status === 403) {
    throttling.add(1);
  }

  console.log("INTERNAL IUN: "+currentIun);
  let urlLegalFacts = `https://${basePath}/delivery-push/v2.0/${currentIun}/legal-facts`;
  console.log('URL: '+url)

  let response = http.get(urlLegalFacts, params);

  console.log(`Status ${response.status}`);

  check(r, {
    'status get legatFact list is 200': (response) => response.status === 200,
  });

  if (response.status === 403) {
    throttling.add(1);
  }

  let result = JSON.parse(r.body);
  console.log(JSON.stringify(result));

  result.timeline.forEach(timelineArray => {
    timelineArray.legalFactsIds.forEach(timelineElem =>{
      
      let key = timelineElem.key;
      let keySearch;
      if (key.includes("PN_LEGAL_FACTS")) {
        keySearch = key.substring(key.indexOf("PN_LEGAL_FACTS"));
      } else if (key.includes("PN_NOTIFICATION_ATTACHMENTS")) {
        keySearch = key.substring(key.indexOf("PN_NOTIFICATION_ATTACHMENTS"));
      } else if (key.includes("PN_EXTERNAL_LEGAL_FACTS")) {
        keySearch = key.substring(key.indexOf("PN_EXTERNAL_LEGAL_FACTS"));
      }
      console.log(keySearch);

      if(keySearch !== undefined){
        let url = `https://${basePath}/delivery-push/${currentIun}/download/legal-facts/${keySearch}`
        //console.log('URL download atto opponibile: '+url);
  
        let paramsLegalFact = {
          headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/plain, */*',
          'x-api-key': apiKey
          },
          tags: { name: 'getLegalFact' },
        };
  
        let downloadLegalFact = http.get(url, paramsLegalFact);
  
        check(downloadLegalFact, {
            'status W6 received-download-LegalFact is 200': (r) => downloadLegalFact.status === 200,
          });
      }
     

    })
 });

  sleep(1);
  return r;
}