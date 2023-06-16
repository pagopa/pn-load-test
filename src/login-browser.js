import { chromium } from 'k6/experimental/browser';
import { sleep } from 'k6';

export let options = JSON.parse(open('./modules/test-types/'+__ENV.TEST_TYPE+'.json'));
let username = `${__ENV.USERNAME}`
let password = `${__ENV.PASSWORD}`
export default async function () {
    // const browser = chromium.launch({ headless: false });
    const browser = chromium.launch({ headless: true });
    const page = browser.newPage();

    try {
        //01 Vai sulla pagina di login
        await page.goto('https://login.dev.notifichedigitali.it/login');
        // await page.waitForNavigation({ waitUntil: 'networkidle' });
        // sleep(3);
        page.waitForSelector('button[id="spidButton"]');
        // page.screenshot({ path: '/Users/vincenzoracca/Desktop/prova.jpg' });

        //02 Clicca sul button SPID
        const spidButton = page.locator(
            'button[id="spidButton"]'
        );
        await spidButton.click();
        // sleep(3);
        page.waitForSelector('img[src="https://upload.wikimedia.org/wikipedia/commons/1/11/Test-Logo.svg"]');


        //03 Clicca sul'immagine Test
        const testImg = page.locator(
            'img[src="https://upload.wikimedia.org/wikipedia/commons/1/11/Test-Logo.svg"]'
        );
        await testImg.click();
        sleep(2);
        // page.waitForSelector('button[class="italia-it-button italia-it-button-size-m button-spid spacer-top-1"]');

        //04 Inserisco username e password e poi clicca sul button Entra con SPID
        page.fill('#username', username);
        page.fill('#password', password);
        const entraConSpidButton = page.locator(
            'button[class="italia-it-button italia-it-button-size-m button-spid spacer-top-1"]'
        );
        await entraConSpidButton.click();
        // sleep(3);
        page.waitForSelector('input[class="btn btn-send btn-success"]');


        //05 Clicca sul button Conferma
        const confermaButton = page.locator(
            'input[class="btn btn-send btn-success"]'
        );
        await confermaButton.click();
        sleep(5);

    } finally {
        page.close();
        browser.close();
    }
}
