import { check } from 'k6';
import http from 'k6/http';

export let options = JSON.parse(open('./modules/test-types/'+__ENV.TEST_TYPE+'.json'));

let bearerToken = `${__ENV.BEARER_TOKEN_USER2}`;


export function callDowntimeHistory() {
    let url = `https://webapi.test.notifichedigitali.it/bff/v1/downtime/history?fromTime=2025-01-01T00:00:00Z`;
    let token = 'Bearer ' + bearerToken;
    let params = {
      headers: {
      'Content-Type': 'application/json',
      'Authorization': token
      }
    };

    let response = http.get(url, params);
    check(response, {
      'All the calls succeeded with status code 200!': (response) => response.status === 200,
  });
    return response;

}


export default function run() {
    try{
      callDowntimeHistory();
    }catch(error){
      console.log('callDowntimeHistory error: ', error)
    }

}