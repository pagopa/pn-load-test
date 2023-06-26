import exec from 'k6/execution';
import http from 'k6/http';
import { Counter } from 'k6/metrics';
import { uuidv4 } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';


export let options = JSON.parse(open('./modules/test-types/'+__ENV.TEST_TYPE+'.json'));

const throttling = new Counter('throttling');
const bearerToken = 'Bearer ' + `${__ENV.BEARER_TOKEN_USER1}`
const recipientId = 'PF-b3ccac31-38ea-44cd-9601-9f2d19e853af';

const params = {
    headers: {
        'Content-Type': 'application/json',
        'Authorization': bearerToken
    }};


const basePath = `${__ENV.WEB_BASE_PATH}`
const verificationCodeUrl = 'http://internal-EcsA-20230409091221502000000003-2047636771.eu-south-1.elb.amazonaws.com/external-channels/verification-code/'
// const verificationCodeUrl = 'http://localhost:8888/external-channels/verification-code/'


const postRecipientLegalAddress = 'https://' + basePath + '/address-book/v1/digital-address/legal/{senderId}/PEC'
const postRecipientCourtesyAddress = 'https://' + basePath + '/address-book/v1/digital-address/courtesy/{senderId}/EMAIL'
const getLegalAddressBySender = 'http://internal-EcsA-20230409091221502000000003-2047636771.eu-south-1.elb.amazonaws.com/address-book-private/v1/digital-address/legal/' + recipientId + '/{senderId}'
// const getLegalAddressBySender = 'http://localhost:8888/address-book-private/v1/digital-address/legal/' + recipientId + '/{senderId}'
const getCourtesyAddressBySender = 'http://internal-EcsA-20230409091221502000000003-2047636771.eu-south-1.elb.amazonaws.com/address-book-private/v1/digital-address/courtesy/' + recipientId + '/{senderId}'
// const getCourtesyAddressBySender = 'http://localhost:8888/address-book-private/v1/digital-address/courtesy/' + recipientId + '/{senderId}'

const senderIds = [
    'cc1c6a8e-5967-42c6-9d83-bfb12ba1665a', '7b2fff42-d3c1-44f0-b53a-bf9089a37c73', 'e5e56011-4e4c-4e1c-b4fe-befd2a8ca9ff', 'ef29949d-1167-4af9-86f4-23bcaaf6e41b',
    'e5e56011-4e4c-4e1c-b4fe-befd2a8ca9ff', '026e8c72-7944-4dcd-8668-f596447fec6d', '56ed074c-13b6-4d61-ba49-221953e6b60f', '337d7290-4f43-4d70-ae02-69c20b4428ec',
    '614b68f2-f80f-4ebc-be30-2ad87e88aa10', '5fc82440-0a04-401e-b1f9-b1e9af2429ab', '88d30379-9249-443d-82f5-084fb7a81daf', 'a95dace4-4a47-4149-a814-0e669113ce40',
    '79e9ab1c-2f25-4dc9-8e59-843f7dc8c5a7', '1962d21c-c701-4805-93f6-53a877898756', '16dabc75-f12e-42c4-aa0c-be9c22e9c89e', '4a56d1e5-8c17-4b48-86db-589ebfdc1d15',
    '9115f90b-1dc9-4ba8-8645-b38bda016b8f', 'b6c5b42a-8a07-436f-96ce-8c2ab7f4dbd2', '5b994d4a-0fa8-47ac-9c7b-354f1d44a1ce', '7ac8d531-9c46-48eb-965a-25c12fa1fd81',
    'fd511ebc-774c-45d2-be55-2fc0537f04e5', 'fd511ebc-774c-45d2-be55-2fc0537f04e5', '4db741cf-17e1-4751-9b7b-7675ccca472b', 'd26c06aa-1fbb-417d-b5ef-2ac41423aaea',
    'd07f5543-c1f2-4142-b648-68d31df8a63b', '118d3486-8e12-470d-a5f1-5fab96b276d4'
]


export default function () {
    const uuid = uuidv4();

    const senderId = senderIds[exec.scenario.iterationInTest % senderIds.length];
    const urlPec = postRecipientLegalAddress.replace('{senderId}', senderId);
    const urlEmail = postRecipientCourtesyAddress.replace('{senderId}', senderId);
    const pec = uuid + '@pec.it';
    const email = uuid + '@mail.it';

    console.log('Request for creating PEC: ', pec, ' with SenderId: ', senderId);
    callPostRecipientAddress(urlPec, pec, null);
    console.log('Retrieve verificationCode for PEC: ', pec);
    const verificationCode = getVerificationCode(pec);
    console.log('Confirm for creating PEC: ', pec, verificationCode);
    callPostRecipientAddress(urlPec, pec, verificationCode);

    console.log('Request for creating EMAIL: ', email, ' with SenderId: ', senderId);
    callPostRecipientAddress(urlEmail, email, null);
    console.log('Retrieve verificationCode for EMAIL: ', email);
    const verificationCodeEmail = getVerificationCode(email);
    console.log('Confirm for creating EMAIL: ', email, verificationCodeEmail);
    callPostRecipientAddress(urlEmail, email, verificationCodeEmail);


    console.log('Retrieve Legal Addresses for senderId: ', senderId);
    callGetAddressBySender(senderId, getLegalAddressBySender);

    console.log('Retrieve Courtesy Addresses for senderId: ', senderId);
    callGetAddressBySender(senderId, getCourtesyAddressBySender);

}

function callPostRecipientAddress(url, pecOrEmail, verificationCode) {
    let requestBodyPec;

    if(verificationCode == null) {
        requestBodyPec = {
            'value': pecOrEmail
        }
    }
    else {
        requestBodyPec = {
            'value': pecOrEmail,
            'verificationCode': verificationCode
        }
    }

    const r = http.post(url, JSON.stringify(requestBodyPec), params);
    checkErrorStatus(r, pecOrEmail)


    if (r.status === 403) {
        throttling.add(1);
    }

    sleep(1);
}

function getVerificationCode(pec) {
    const res = http.get(verificationCodeUrl + pec);
    checkErrorStatus(res);

    return res.body;

}

function callGetAddressBySender(senderId, url) {
    const res = http.get(url.replace('{senderId}', senderId));
    checkErrorStatus(res);

    return res.body;
}

function checkErrorStatus(response, pecOrEmail) {
    if(response.status  >= 400) {
        throw 'Error status code ' + response.status + ' for url: ' + response.url + ' pecOrEmail: ' + pecOrEmail;
    }
}