import { check, sleep } from 'k6';
import http from 'k6/http';

export let options = JSON.parse(open('../common/test-types/' + __ENV.TEST_TYPE + '.json'));

let bearerToken = `${__ENV.ADMIN_GSP_TOKEN}`
let bffBasePath = `${__ENV.BFF_BASE_PATH}`

export default function getEServiceCatalog() {
    let url = `https://${bffBasePath}/catalog?offset=0&limit=50`;
    let authHeader = 'Bearer ' + bearerToken;

    let params = {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': authHeader
        },
    };

    let r = http.get(url, params);

    console.log(`EService Catalog BFF Received. Status code: ${r.status}`);

    check(r, {
        'status code is 200': (r) => r.status === 200,
    });

    console.log(JSON.parse(r.body))

    sleep(1);

    return r;
}