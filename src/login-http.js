import { check, sleep } from 'k6';
import exec from 'k6/execution';
import http from 'k6/http';

export let options = JSON.parse(open('./modules/test-types/'+__ENV.TEST_TYPE+'.json'));

const password = `${__ENV.PASSWORD}`
const usernames = [
    'cesare',
    'ada',
    'garibaldi',
    'lucrezia',
    'cristoforocolombo',
    'lapulzella',
    'fieramosca',
    'cleopatra',
    'marcopolo',
    'innominato',
    'Louis',
    'montessori',
    'little',
    'dino',
    'galileo',
    'leonardo',
    'MarcoTullioCicerone',
    'LucioAnneoSeneca',
    'MarcoPorcioCatoneSpqr'
]



///demo/samlsso
const urlOne = 'https://hub-login.spid.dev.notifichedigitali.it/login?entityID=xx_testenv2&authLevel=SpidL2';

const urlTwo = 'https://spid-saml-check.spid.dev.notifichedigitali.it/demo/start';

const urlThree = 'https://spid-saml-check.spid.dev.notifichedigitali.it/demo/login';

const urlFour = 'https://hub-login.spid.dev.notifichedigitali.it/acs';

//const urlSuccess = 'https://login.dev.notifichedigitali.it/login/success';

const urlFive = 'https://cittadini.dev.notifichedigitali.it/#token=';

export default function () {

     //Try-sleep
     sleep(1);

    
    const paramsWithOneRedirect = {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:109.0) Gecko/20100101 Firefox/114.0',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'same-site',
            'Sec-Fetch-User': '?1',
            'TE': 'trailers'
        },
        redirects: 100
    }


    // const username = usernames[Math.floor(Math.random() * usernames.length)];
    const username = usernames[exec.scenario.iterationInTest % usernames.length];

    const responseOne = http.get(urlOne, paramsWithOneRedirect);
    //const responseOne = http.get(urlOne, params);

    check(responseOne, {
        'status hub-spid login is 200': (responseOne) => responseOne.status === 200,
    });

    check(responseOne, {
        'error hub-spid login is 502': (responseOne) => responseOne.status === 502,
    });

    console.log(`[${exec.scenario.iterationInTest}] responseOne.status `,responseOne.status);
    check(responseOne, {
        'error hub-spid login is > 400': (responseOne) => responseOne.status > 400,
    });

    if(responseOne.status >= 400){
        console.log(`[${exec.scenario.iterationInTest}] responseOne`,responseOne);
    }
    //Try-sleep
    sleep(1);

    /*let urlRedirect = responseOne.headers['Location'];
    console.log('URL-REDIRECT: ',urlRedirect);

    const responseOneRedirect = http.get(urlRedirect, params);

    check(responseOneRedirect, {
        'status hub-spid login REDIRECT is 200': (responseOneRedirect) => responseOneRedirect.status === 200,
    });

    console.log('responseOneRedirect.status ',responseOneRedirect.status);
    check(responseOneRedirect, {
        'error hub-spid login REDIRECT is > 400': (responseOneRedirect) => responseOneRedirect.status > 400,
    });
    if(responseOneRedirect.status >= 400){
        console.log('responseOneRedirect.body',responseOneRedirect.body);
        console.log('responseOneRedirect',responseOneRedirect);
    }
    
    //Try-sleep
    sleep(1);
    */

    const responseBody = responseOne.body
    console.log(`[${exec.scenario.iterationInTest}] FIRST RESPONSE: `, responseOne);
    const samlValue = getSamlValue(responseBody);
    //console.log("SAML: ", samlValue);

    const signAlgValue = getSigAlgValue(responseBody);
    //console.log("SIGNALG: ", signAlgValue);

    const signatureValue = getSignatureValue(responseBody);
    //console.log("SIGNATURE: ", signatureValue);

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

    const paramsTwo = {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:109.0) Gecko/20100101 Firefox/114.0',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'same-site',
            'Sec-Fetch-User': '?1',
            'TE': 'trailers'
        },
    }
    

    const responseBodyTwo = http.post(urlTwo, bodyUrlTwo, paramsTwo);
    check(responseBodyTwo, {
        'status spid-saml-check-START is 200': (responseBodyTwo) => responseBodyTwo.status === 200,
    });

    console.log(`[${exec.scenario.iterationInTest}] responseBodyTwo.status `,responseBodyTwo.status);
    check(responseBodyTwo, {
        'error spid-saml-check-START is > 400': (responseBodyTwo) => responseBodyTwo.status > 400,
    });
    if(responseBodyTwo.status >= 400){
        console.log(`[${exec.scenario.iterationInTest}] responseBodyTwo.body`,responseBodyTwo.body);
        console.log(`[${exec.scenario.iterationInTest}] responseBodyTwo`,responseBodyTwo);
    }

    //Try-sleep
    sleep(1);


    const paramsThree = {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:109.0) Gecko/20100101 Firefox/114.0',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'same-site',
            'Sec-Fetch-User': '?1',
            'TE': 'trailers'
        },
    }
    
    const bodyUrlThree = {
        'username': username,
        'password': password,
        'params[spidLevel]': 2,
        'params[organizationDisplayName]': 'Organization display name',
        'params[samlRequest]': samlValue,
        'params[relayState]': '',
        'params[sigAlg]': signAlgValue,
        'params[signature]': signatureValue,
        'params[purpose]': '',
        'params[minAge]': '',
        'params[maxAge]': '',
        'retry': -1
    };
    const responseThree = http.post(urlThree, bodyUrlThree, paramsThree);

    if(responseThree.status >= 400){
        console.log(`[${exec.scenario.iterationInTest}] responseThree.body`,responseThree.body);
        console.log(`[${exec.scenario.iterationInTest}] responseThree`,responseThree);
    }
    check(responseThree, {
        'status spid-saml-check-LOGIN is 200': (responseThree) => responseThree.status === 200,
    });

    console.log(`[${exec.scenario.iterationInTest}] responseThree.status `,responseThree.status);
    check(responseThree, {
        'error spid-saml-check-LOGIN is > 400': (responseThree) => responseThree.status >= 400,
    });

    //Try-sleep
    sleep(1);

    //console.log("BODY WITH SAML RESPONSE: ", responseThree.body);
    const samlResponseValue = getSamlResponse(responseThree.body);
    //console.log("SAMLRESPONSE: ", samlResponseValue);
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
        },
        redirects: 100
    };

    const paramsFourWithRedirect = {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:109.0) Gecko/20100101 Firefox/114.0',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'same-site',
            'Sec-Fetch-User': '?1',
            'TE': 'trailers'
        },
        redirects: 100
    }

    const bodyUrlFour = {
        'RelayState': '',
        'SAMLResponse': samlResponseValue
    };
    const responseFour = http.post(urlFour, bodyUrlFour, paramsFourWithRedirect);
    //console.log("RESPONSEFOUR: ", responseFour);
    check(responseFour, {
        'status hub-login.spid-acs is 200': (responseFour) => responseFour.status === 200,
    });

    console.log(`[${exec.scenario.iterationInTest}] responseFour.status `,responseFour.status);
    check(responseFour, {
        'error hub-login.spid-acs is > 400': (responseFour) => responseFour.status >= 400,
    });

    check(responseFour, {
        'status hub-login.spid-acs is 504': (responseFour) => responseFour.status === 504,
    });
    

    //Try-sleep
    //sleep(1);

    const responseFourUrl = responseFour.url;
    //console.log("RESPONSEFOUR-URL: ", responseFour.url);
    const loginSuccess = responseFourUrl.includes('token');

    check(responseFourUrl, {
        'responseFourUrl.includes(token)': (responseFourUrl) => responseFourUrl.includes('token'),
    });
    
    if(loginSuccess) {
        const indexToken = responseFourUrl.indexOf('token=');
        const token = responseFourUrl.substring(indexToken + 6);
        console.log("TOKEN: ", token);
        const finalResponse = http.get(urlFive + token, paramsFour);

        check(finalResponse, {
            'status finalResponse is 200': (finalResponse) => finalResponse.status === 200,
        });
    
        console.log(`[${exec.scenario.iterationInTest}] finalResponse.status `,finalResponse.status);
        check(finalResponse, {
            'error finalResponse is > 400': (finalResponse) => finalResponse.status > 400,
        });

        //console.log("FINAL RESPONSE: ", finalResponse.body);
    }


    /*
    const paramsSuccess = {
        headers:{
            "x-pagopa-safestorage-cx-id": "pn-delivery-push",
        }
    }

    const responseSuccess = http.get(urlSuccess, paramsSuccess);
    console.log("responseSuccess: ", responseSuccess);
    check(responseSuccess, {
        'status responseSuccess is 200': (responseSuccess) => responseSuccess.status === 200,
    });

    console.log('responseSuccess.status ',responseSuccess.status);
    check(responseSuccess, {
        'error responseSuccess is > 400': (responseSuccess) => responseSuccess.status >= 400,
    });
    */

    //Try-sleep
    sleep(1);
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


