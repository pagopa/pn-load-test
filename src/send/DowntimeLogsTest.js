import { URL } from 'https://jslib.k6.io/url/1.0.0/index.js';
import { check } from 'k6';
import http from 'k6/http';

export let options = JSON.parse(open('./modules/test-types/'+__ENV.TEST_TYPE+'.json'));

let bearerToken = `${__ENV.BEARER_TOKEN_PA}`
let webBasePath = `${__ENV.WEB_BASE_PATH}`

export default function downtimeLogsTest(){

    let params = {
        headers: {
        'Content-Type': 'application/json',
        'authorization': 'Bearer '+bearerToken,
        'x-pagopa-safestorage-cx-id': 'pn-delivery-push',
        },
        tags: { name: 'searchDowntime' },
      };


    var dateToTime = new Date()
    dateToTime.setMilliseconds(dateToTime.getMilliseconds() - (Math.floor(Math.random() * 180000)));
    var toTime = dateToTime.toISOString();

    var date = new Date();
    date.setMonth(date.getMonth() - 5);
    date.setMilliseconds(date.getMilliseconds() - (Math.floor(Math.random() * 180000)));
    var fromTime = date.toISOString();


    let url = new URL(`https://${webBasePath}/downtime/v1/history`);
    url.searchParams.append('fromTime', fromTime);
    url.searchParams.append('toTime', toTime);
    url.searchParams.append('functionality', 'NOTIFICATION_VISUALIZATION' );
    url.searchParams.append('functionality', 'NOTIFICATION_CREATE' );
    url.searchParams.append('functionality', 'NOTIFICATION_WORKFLOW');
    url.searchParams.append('page', '0');
    url.searchParams.append('size', '10');
    

    let downtimeResult = http.get(url.toString(),params);

    check(downtimeResult, {
        'status search-downtime is 200': (downtimeResult) => downtimeResult.status === 200,
      });

    let jsonResult = JSON.parse(downtimeResult.body);

    
    for(let i = 0; i < jsonResult.result.length; i++){
        let urlDownloadLegalFact = `https://${webBasePath}/downtime/v1/legal-facts/${jsonResult.result[i].legalFactId}`;
        let downtimeDownloadResult = http.get(urlDownloadLegalFact,params);

        check(downtimeDownloadResult, {
            'status download-downtime is 200': (downtimeDownloadResult) => downtimeDownloadResult.status === 200,
          });
    }


    let urlDowntimeStatus = `https://${webBasePath}/downtime/v1/status`;
    let downtimeStatusResult = http.get(urlDowntimeStatus,params);

    check(downtimeStatusResult, {
        'status status-downtime is 200': (downtimeStatusResult) => downtimeStatusResult.status === 200,
      });



}