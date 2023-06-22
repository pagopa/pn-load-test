import { check, sleep } from 'k6';
import exec from 'k6/execution';
import http from 'k6/http';
import { Counter } from 'k6/metrics';
import { v4 as uuidv4 } from 'uuid';


export let options = JSON.parse(open('./modules/test-types/'+__ENV.TEST_TYPE+'.json'));

const throttling = new Counter('throttling');

const params = {
    headers: {
        'Content-Type': 'application/json',
        'Authorization': bearerToken
    }};

const bearerToken = 'Bearer ' + `${__ENV.BEARER_TOKEN_USER1}`
const basePath = `${__ENV.WEB_BASE_PATH}`
const verificationCodeUrl = 'http://internal-EcsA-20230409091221502000000003-2047636771.eu-south-1.elb.amazonaws.com/external-channels/verification-code/'

const postRecipientLegalAddress = 'https://' + basePath + '/address-book/v1/digital-address/legal/default/PEC'


export default function getNotificationWeb(iun) {

    const pec = uuidv4() + '@pec.it';
    console.log('Request for creating PEC: ', pec);
    callPostRecipientLegalAddress(pec, null);

    const verificationCode = getVerificationCode(pec);
    console.log('Confirm for creating PEC: ', pec, verificationCode);
    callPostRecipientLegalAddress(pec, verificationCode);

    return r;
}

function callPostRecipientLegalAddress(pec, verificationCode) {
    let requestBodyPec;

    if(verificationCode == null) {
        requestBodyPec = {
            'value': pec
        }
    }
    else {
        requestBodyPec = {
            'value': pec,
            'verificationCode': verificationCode
        }
    }


    const r = http.post(postRecipientLegalAddress, requestBodyPec, params);

    console.log(`Status ${r.status}`);

    check(r, {
        'status is 200': (r) => r.status === 200,
    });

    if (r.status === 403) {
        throttling.add(1);
    }

    sleep(1);
}

function getVerificationCode(pec) {
    console.log('Retrieve verificationCode for pec: ', pec);
    const res = http.get(verificationCodeUrl + pec);
    if (res.status !== 200) {
        throw 'Error in getVerificationCode for pec: ' + pec + ' with status: ' + res.status;
    }

    return res.body;

}