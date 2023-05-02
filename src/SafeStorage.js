import { preloadFile } from './DeliverySendNotification.js';

export let options = JSON.parse(open('./modules/test-types/'+__ENV.TEST_TYPE+'.json'));

export function setup() {
    let onlyPreloadUrlParam = `${__ENV.ONLY_PRELOAD_URL}`
    let onlyPreloadUrl = false;
    if(onlyPreloadUrlParam && onlyPreloadUrlParam !== 'undefined') {
        onlyPreloadUrl = true;
    }
    return onlyPreloadUrl;
}

export default function(onlyPreloadUrl){

    var r = preloadFile(onlyPreloadUrl);
    console.log(JSON.stringify(r));

}