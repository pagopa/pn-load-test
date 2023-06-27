import { sleep } from 'k6';
import getDigitalDomicileNaTest from './NationalRegistries_Na.js';
import getDigitalDomicileNbTest from './NationalRegistries_Nb.js';
import getPhysicalDomicileNcTest from './NationalRegistries_Nc.js';
import getPhysicalDomicileNdTest from './NationalRegistries_Nd.js';
export let options = JSON.parse(open('./modules/test-types/'+__ENV.TEST_TYPE+'.json'));







export default function executionNationalRegistries() {
    getDigitalDomicileNaTest();
    getDigitalDomicileNbTest();
    getPhysicalDomicileNcTest();
    getPhysicalDomicileNdTest();
    sleep(1);
}