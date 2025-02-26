import { check } from 'k6';
import exec from 'k6/execution';
import http from 'k6/http';
import { Counter } from 'k6/metrics';

const AVERAGE_FILES_UPLOADED_PER_DAY = 50;

export let options = JSON.parse(open('./modules/test-types/'+__ENV.TEST_TYPE+'.json'));

let bearerToken = `dummybearer`

let params = {
  headers: {
    'Authorization': 'Bearer ' + bearerToken,
  },
};


export function setup() {
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
  console.log(tracingList);
  return { tracingList };
}

const code_success = new Counter('code_success');
const code_unauthorized = new Counter('code_unauthorized');
const code_badrequest = new Counter('code_badrequest');
const code_forbidden = new Counter('code_forbidden');
const code_notfound = new Counter('code_notfound');
const code_iserror = new Counter('code_iserror');
const code_serviceunavailable = new Counter('code_serviceunavailable');



export default function replaceTracingTest(data) {
  const successFile = `date,purpose_id,status,token_id,requests_count\n${data.tracingList[exec.scenario.iterationInTest].date},59b568cc-a097-4217-9c58-66fa76389fe0,200,c7ebf39e-e323-46f1-92d8-0482bcc3bfe3,555\n${data.tracingList[exec.scenario.iterationInTest].date},59b568cc-a097-4217-9c58-66fa76389fe0,404,c7ebf39e-e323-46f1-92d8-0482bcc3bfe3,0`;
  console.log(successFile)
  const formData = {
    file: http.file(successFile, 'data.csv', 'text/csv')
  };
  let url = `https://api.qa.tracing.interop.pagopa.it/tracings/${data.tracingList[exec.scenario.iterationInTest].tracingId}/replace`;
  
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