import { check } from 'k6';
import exec from 'k6/execution';
import http from 'k6/http';
import { Counter } from 'k6/metrics';

const AVERAGE_FILES_UPLOADED_PER_DAY = 50;

export let options = JSON.parse(open('./modules/test-types/'+__ENV.TEST_TYPE+'.json'));

let bearerToken = `eyJ0eXAiOiJhdCtqd3QiLCJhbGciOiJSUzI1NiIsInVzZSI6InNpZyIsImtpZCI6IjFmM2U2NTdkLTQ3NGQtNDFjNi1iNDhiLTk3ZGRlZGE4MWJjMiJ9.eyJvcmdhbml6YXRpb25JZCI6ImU3OWEyNGNkLThlZGMtNDQxZS1hZThkLWU4N2MzYWVhMDA1OSIsInVpZCI6ImYwN2RkYjhmLTE3ZjktNDdkNC1iMzFlLTM1ZDFhYzEwZTUyMSIsImF1ZCI6InFhLmludGVyb3AucGFnb3BhLml0L20ybSIsIm5iZiI6MS43Mzk4ODQzMDFFOSwib3JnYW5pemF0aW9uIjp7ImlkIjoiYzc2MmVjNzQtZjcyOS00MmU2LTg1YWEtYjgzN2I1Y2Q1OGRmIiwibmFtZSI6IlBhZ29QQSBTLnAuQS4iLCJmaXNjYWxfY29kZSI6IjE1Mzc2MzcxMDA5Iiwicm9sZXMiOlt7InJvbGUiOiJhZG1pbiIsInBhcnR5Um9sZSI6Ik1BTkFHRVIifV0sImlwYUNvZGUiOiI1TjJUUjU1NyJ9LCJpc3MiOiJxYS5pbnRlcm9wLnBhZ29wYS5pdCIsImV4dGVybmFsSWQiOnsib3JpZ2luIjoiSVBBIiwidmFsdWUiOiJjX2YyMDUifSwidXNlci1yb2xlcyI6ImFkbWluIiwic2VsZmNhcmVJZCI6IjAyNmU4YzcyLTc5NDQtNGRjZC04NjY4LWY1OTY0NDdmZWM2ZCIsImV4cCI6MS43Mzk5NzA3MDFFOSwiaWF0IjoxLjczOTg4NDMwMUU5LCJqdGkiOiI4ZjQ1Y2UxYy1kMWEzLTQzNDItODA0Ni1lNmY0MzVlMmEzZGUifQ.eRjGYow0J1qYvhxDpGHvrQrcm3ie8Qob5VN3g4V1kIB6jnTe9s8kW9U-0NsFriojiEmhJteoIBnuSw9W5oBcObuackpNmSqiiU7iGGUFTkSDDbxmdxMVVOay5X2zZuyDzXB1T5z_6BUKHprIqZwCE45uslrvwlNZERfvx29Uvej4zn7eimXEaI2OfSXzyF-3L9FlaRO1NSbt0APToZgQFV1Qc9Us2REJl3piNu3F0rUEhj7J67eGMN1ekWN4DODmsiEb2gZqwRa7zuYpkSw4Mle4QwwrYdmMJtGH-EP8gfp70jpTEAHrGPBs557EByzIB4sfAa4vUiEmW-lWO5w86A`

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
  const successFile = `date,purpose_id,token,status,requests_count\n${data.tracingList[exec.scenario.iterationInTest].date},28874634-6ea6-4def-b200-7377182c71be,12345678-90ab-cdef-1234-567890abcdef,200,48\n${data.tracingList[exec.scenario.iterationInTest].date},0e1114e6-31d1-41a4-811d-a0c3d1b70bbf,99382e29-b0cf-412b-a060-72e421b6d167,404,48`;
  const formData = {
    file: http.file(successFile, 'data.csv', 'text/csv')
  };
  let url = `https://api.dev.tracing.interop.pagopa.it/tracings/${data.tracingList[exec.scenario.iterationInTest].tracingId}/replace`;
  
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