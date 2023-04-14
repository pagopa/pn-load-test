import { sleep } from 'k6';
import { preloadFile } from './DeliverySendNotification.js';

export let options = JSON.parse(open('./modules/test-types/'+__ENV.TEST_TYPE+'.json'));


export default function(){

    var r = preloadFile();
    sleep(2);
    console.log(JSON.stringify(r));

}