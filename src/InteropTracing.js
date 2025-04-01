import { check } from 'k6';
import exec from 'k6/execution';
import http from 'k6/http';
import { Counter } from 'k6/metrics';

const AVERAGE_FILES_UPLOADED_PER_DAY = 7500;

export let options = JSON.parse(open('./modules/test-types/'+__ENV.TEST_TYPE+'.json'));

let bearerToken = `eyJ0eXAiOiJhdCtqd3QiLCJhbGciOiJSUzI1NiIsInVzZSI6InNpZyIsImtpZCI6IjFmM2U2NTdkLTQ3NGQtNDFjNi1iNDhiLTk3ZGRlZGE4MWJjMiJ9.eyJvcmdhbml6YXRpb25JZCI6ImU3OWEyNGNkLThlZGMtNDQxZS1hZThkLWU4N2MzYWVhMDA1OSIsInVpZCI6ImYwN2RkYjhmLTE3ZjktNDdkNC1iMzFlLTM1ZDFhYzEwZTUyMSIsImF1ZCI6InFhLmludGVyb3AucGFnb3BhLml0L20ybSIsIm5iZiI6MS43NDM0OTIwMTlFOSwib3JnYW5pemF0aW9uIjp7ImlwYUNvZGUiOiI1TjJUUjU1NyIsImlkIjoiYTA2MDVkMWMtMmE4Zi00MDBlLTkxODUtNDY0NDEyMTVhODRhIiwibmFtZSI6IlBhZ29QQSBTLnAuQS4iLCJmaXNjYWxfY29kZSI6IjE1Mzc2MzcxMDA5Iiwicm9sZXMiOlt7InJvbGUiOiJhZG1pbiIsInBhcnR5Um9sZSI6Ik1BTkFHRVIifV19LCJpc3MiOiJxYS5pbnRlcm9wLnBhZ29wYS5pdCIsImV4dGVybmFsSWQiOnsib3JpZ2luIjoiSVBBIiwidmFsdWUiOiJjX2YyMDUifSwidXNlci1yb2xlcyI6ImFkbWluIiwic2VsZmNhcmVJZCI6IjAyNmU4YzcyLTc5NDQtNGRjZC04NjY4LWY1OTY0NDdmZWM2ZCIsImV4cCI6MS43NDM1Nzg0MTlFOSwiaWF0IjoxLjc0MzQ5MjAxOUU5LCJqdGkiOiIzYjcyNzhlZS0yMDk4LTQzYTktYjk5NC0wODBiMWJkNDk5NGUifQ.dKTEAJVQJXSIMnChVpvrUKWVuoJJlhdPSa46y2RAcZeGnf3IDQ00hrmlra8u9n2WgMjHVfxo6cJC5tieKD2TpDo0MDOnce4f-R_9V7DVZZg35MaxLSktT-cAGOs3EdO9eSqgIcmxRH15b-hZh42GeHA1-KNk_PLW1E2KT83NOqivW16o2v-5t5T4XbwX4y76HBFXyfH8cD7yrZ9UnzeCUai3AthzGJF1T6h83vrcnkEqbcxkVRG52JZH2qKPCwkraZu512wb3WsQWaBjHRYfZuI0NCBmTGxuIUTIJIVIoNUrRT0pvyR0Ke2YGJ7TZciTiVX4ikw1y4PxkixOzJ39Bw`

let params = {
  headers: {
    'Authorization': 'Bearer ' + bearerToken,
  },
};

options.setupTimeout = options.setupTimeout || "38600s";



let tracingIdFile = open('./resources/TracingID-QA.txt');

export function setup() {
    if(tracingIdFile !== 'undefined') {
      let lines = tracingIdFile.split(';');
      const tracingIdArray = lines.map(line => {
        const [tracingId, date] = line.split(',');
        return { tracingId, date };
      });
      console.log("TRACING-ID_LENGTH: "+ tracingIdArray.length);
      return tracingIdArray
    }
    throw new Error('Setup failed: there are no Tracing-ID loaded!');
}

/*export function setup() {
  let tracingList = [];
  let offset = 0;
  let addedTraces = 0;
  let totalCount = 0;
  let shouldStop = false;
  do {
    let getTracingUrl = `https://api.qa.tracing.interop.pagopa.it/tracings?states=COMPLETED&offset=${offset}&limit=50`;
    let getTracingResponse = http.get(getTracingUrl, params);
    let data = JSON.parse(getTracingResponse.body);
    totalCount = data.totalCount;
    if (!data.results[0].tracingId) {
      break;
    }

    data.results.some(element => {
      const isPresent = tracingList.some(item =>
        item.tracingId === element.tracingId)
      if(!isPresent) {
        tracingList.push({
          tracingId: element.tracingId,
          date: element.date
        });
        addedTraces++;
        if (addedTraces === AVERAGE_FILES_UPLOADED_PER_DAY) {
          shouldStop = true;
          return true;
        } else {
          return false;
        }
      }
    });
    offset++;
  } while (!shouldStop && offset < totalCount);
  if (tracingList.length < AVERAGE_FILES_UPLOADED_PER_DAY) {
    throw new Error('Setup failed: there are no enough Tracing loaded!')
  }
  console.log(tracingList.map(item => `${item.tracingId},${item.date};`).join('\n'));
  return { tracingList };
}*/

const code_success = new Counter('code_success');
const code_unauthorized = new Counter('code_unauthorized');
const code_badrequest = new Counter('code_badrequest');
const code_forbidden = new Counter('code_forbidden');
const code_notfound = new Counter('code_notfound');
const code_iserror = new Counter('code_iserror');
const code_serviceunavailable = new Counter('code_serviceunavailable');



export default function replaceTracingTest(data) {
  const successFile = `date,purpose_id,status,token_id,requests_count\n${data[exec.scenario.iterationInTest].date},59b568cc-a097-4217-9c58-66fa76389fe0,200,c7ebf39e-e323-46f1-92d8-0482bcc3bfe3,555\n${data[exec.scenario.iterationInTest].date},59b568cc-a097-4217-9c58-66fa76389fe0,404,c7ebf39e-e323-46f1-92d8-0482bcc3bfe3,0`;
  const formData = {
    file: http.file(successFile, 'data.csv', 'text/csv')
  };
  let url = `https://api.qa.tracing.interop.pagopa.it/tracings/${data[exec.scenario.iterationInTest].tracingId}/replace`;
  
  let tracingResponse = http.post(url, formData, params );

  if(tracingResponse.status !== 200){
    switch (tracingResponse.status) {
      case 401:
        code_unauthorized.add(1);
        break;
      case 400:
        code_badrequest.add(1);
        break;
      case 403:
        code_forbidden.add(1);
        break;
      case 404:
        code_notfound.add(1);
        break;
      case 500:
        code_iserror.add(1);
        break;
      case 503:
        code_serviceunavailable.add(1);
        break;
    }
  } else {
    code_success.add(1);

  }
  check(tracingResponse, {
      'All the calls succeeded with status code 200!': (tracingResponse) => tracingResponse.status === 200,
  });

}