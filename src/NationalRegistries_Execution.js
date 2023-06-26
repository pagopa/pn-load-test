import { check, sleep } from 'k6';
import exec from 'k6/execution';
import http from 'k6/http';
import { Counter } from 'k6/metrics';
export let options = JSON.parse(open('./modules/test-types/'+__ENV.TEST_TYPE+'.json'));
import getDigitalDomicileNaTest from './NationalRegistries_Na.js';
import getDigitalDomicileNbTest from './NationalRegistries_Nb.js';
import getPhysicalDomicileNcTest from './NationalRegistries_Nc.js';
import getPhysicalDomicileNdTest from './NationalRegistries_Nd.js';
let bearerToken = `${__ENV.BEARER_TOKEN_USER1}`
let basePath = `${__ENV.WEB_BASE_PATH}`



export function setup() {
  //nothing to setup
}


export function teardown(request) {
  //nothing to clear
}

export default function executionNationalRegistries() {
    getDigitalDomicileNaTest();
    getDigitalDomicileNbTest();
    getPhysicalDomicileNcTest();
    getPhysicalDomicileNdTest();
    sleep(1)
}