import http from 'k6/http';
import { sleep } from 'k6';
import exec from 'k6/execution';

export let options = JSON.parse(open('./modules/test-types/'+__ENV.TEST_TYPE+'.json'));
let password = `${__ENV.PASSWORD}`

let usernames = [
    'ada',
    'cristoforocolombo',
    'fieramosca',
    'MarcoTullioCicerone',
    'LucioAnneoSeneca',
    'galileo',
    'dino',
    'marcopolo',
    'cleopatra'
]
export default function () {

    const username = usernames[Math.floor(Math.random() * usernames.length)];


    ///demo/samlsso
    const urlOne = 'https://hub-login.spid.dev.notifichedigitali.it/login?entityID=xx_testenv2&authLevel=SpidL2';

    const urlTwo = 'https://spid-saml-check.spid.dev.notifichedigitali.it/demo/start';

    const urlThree = 'https://spid-saml-check.spid.dev.notifichedigitali.it/demo/login';

    const urlFour = 'https://hub-login.spid.dev.notifichedigitali.it/acs';

    const urlFive = 'https://cittadini.dev.notifichedigitali.it/#token=';

    const params = {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:109.0) Gecko/20100101 Firefox/114.0',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'same-site',
            'Sec-Fetch-User': '?1',
            'TE': 'trailers'
        }
    }
    const responseOne = http.get(urlOne, params);
    const responseBody = responseOne.body
    // console.log('FIRST RESPONSE: ', responseOne);
    const samlValue = getSamlValue(responseBody);
    console.log("SAML: ", samlValue);

    const signAlgValue = getSigAlgValue(responseBody);
    console.log("SIGNALG: ", signAlgValue);

    const signatureValue = getSignatureValue(responseBody);
    console.log("SIGNATURE: ", signatureValue);

    const relayStateValue = getRelayStateValue(responseBody);
    const bindingValue = getBindingValue(responseBody);

    ////////
    const bodyUrlTwo = {
        'samlRequest': samlValue,
        'relayState': relayStateValue,
        'sigAlg': signAlgValue,
        'signature': signatureValue,
        'binding': bindingValue

    };

    const responseBodyTwo = http.post(urlTwo, bodyUrlTwo, params);
    // console.log("BODYTWO: ", responseBodyTwo.body);
    //////////
    sleep(1);
    const bodyUrlThree = {
        'username': username,
        'password': password,
        'params[spidLevel]': 2,
        'params[organizationDisplayName]': 'Organization+display+name',
        'params[samlRequest]': samlValue,
        'params[relayState]': relayStateValue,
        'params[sigAlg]': signAlgValue,
        'params[signature]': signatureValue,
        'params[purpose]': '',
        'params[minAge]': '',
        'retry': -1
    };
    const responseBodyThree = http.post(urlThree, bodyUrlThree, params);
    // console.log("BODY WITH SAML RESPONSE: ", responseBodyThree);
    const samlResponseValue = getSamlResponse(responseBodyThree.body);
    console.log("SAMLRESPONSE: ", samlResponseValue);
    ///////////////
    const paramsFour = {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:109.0) Gecko/20100101 Firefox/114.0',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'same-site',
            'Sec-Fetch-User': '?1',
            'TE': 'trailers',
            'Origin': 'https://spid-saml-check.spid.dev.notifichedigitali.it',
            'Referer': 'https://spid-saml-check.spid.dev.notifichedigitali.it/'
        }
    };

    const bodyUrlFour = {
        'RelayState': '',
        'SAMLResponse': samlResponseValue
    };
    const responseFour = http.post(urlFour, bodyUrlFour, params);
    console.log("RESPONSEFOUR: ", responseFour);
    const responseFourHttpStatusResponse = responseFour.status;

    if(responseFourHttpStatusResponse === 200) {
        const responseFourUrl = responseFour.url;
        console.log("RESPONSEFOUR-URL: ", responseFour.url);
        const loginSuccess = responseFourUrl.includes('token');
        if(loginSuccess) {
            const indexToken = responseFourUrl.indexOf('token=');
            const token = responseFourUrl.substring(indexToken + 6);
            console.log("TOKEN: ", token);
            const finalResponse = http.get(urlFive + token, paramsFour);
            console.log("FINAL RESPONSE: ", finalResponse.body);
        }
        else {
            throw 'Error 200 OK but not success login: ' + decodeURI(responseFourUrl) + ' user: ' + username;
        }
    }
    else {
        throw 'Error login, status code: ' + responseFourHttpStatusResponse + ' user: ' + username;
    }
}

function getSamlValue(responseBody) {
    const indexSaml = responseBody.indexOf('"samlRequest"');
    // console.log('Index: ', indexSaml);
    const sub = responseBody.substring(indexSaml + 21);
    // console.log('Sub: ', sub);
    const indexSamlValue = sub.indexOf(';');
    const subTwo = sub.substring(0, indexSamlValue + 1);
    return subTwo;
}

function getSigAlgValue(responseBody) {
    const indexSaml = responseBody.indexOf('"sigAlg"');
    // console.log('Index: ', indexSaml);
    const sub = responseBody.substring(indexSaml + 16);
    // console.log('Sub: ', sub);
    const indexSamlValue = sub.indexOf('sha256');
    const subTwo = sub.substring(0, indexSamlValue + 6);
    return subTwo;
}

function getSignatureValue(responseBody) {
    const indexSaml = responseBody.indexOf('"signature"');
    // console.log('Index: ', indexSaml);
    const sub = responseBody.substring(indexSaml + 19);
    // console.log('Sub: ', sub);
    const indexSamlValue = sub.indexOf(';');
    const subTwo = sub.substring(0, indexSamlValue + 1);
    return subTwo;
}

function getRelayStateValue(responseBody) {
    return '';
}

function getBindingValue(responseBody) {
    return 'HTTP-Redirect';
}

function getSamlResponse(responseBody) {
    const indexSaml = responseBody.indexOf('"SAMLResponse"');
    // console.log('Index: ', indexSaml);
    const sub = responseBody.substring(indexSaml + 22);
    // console.log('Sub: ', sub);
    const indexSamlValue = sub.indexOf(';');
    const subTwo = sub.substring(0, indexSamlValue + 1);
    return subTwo;
}
