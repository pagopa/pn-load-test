import { sleep } from 'k6';
import w6TestOptimized from './W6Test.js';




export let options = JSON.parse(open('./modules/test-types/'+__ENV.TEST_TYPE+'.json'));



/**
 * This test is the optimized version of the DeliverSendAndReceiverGetDownload.js test
 * 
 * The K6 memory leak is partially caused by the use of external modules
*/
export default function w6onlySend() {


  try{
    w6TestOptimized(true);
  }catch(error){
    console.log('internalSendNotification error: ',error)
  }
  
  sleep(2);
}