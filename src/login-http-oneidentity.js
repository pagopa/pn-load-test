import { check, sleep } from 'k6';
import exec from 'k6/execution';
import http from 'k6/http';
import { Counter, Rate } from 'k6/metrics';

export let options = JSON.parse(open('./modules/test-types/'+__ENV.TEST_TYPE+'.json'));

// ── Configurazione ────────────────────────────────────────────────────────────

const password = `${__ENV.PASSWORD}`
let env = `${__ENV.LOGIN_ENV}`

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

const WEBAPI_BASE = `https://webapi.${env}.notifichedigitali.it`;
const SP_BASE     = `https://cittadini.${env}.notifichedigitali.it`;
const IDP_BASE    = `https://idp.uat.oneid.pagopa.it`;
const IDP_PARAM   = IDP_BASE;

// Costante fissa del Service Provider — non cambia tra sessioni
const CLIENT_NAME = `Cittadini-${env.toUpperCase()}`;

// ── Metriche di sessione ──────────────────────────────────────────────────────
// Una "sessione" = un intero tentativo di login (iterazione). Ogni sessione tentata
// finisce o in sessionsCompleted, oppure in esattamente uno dei contatori di fallimento
// qui sotto, che indicano su quale chiamata e per quale motivo si è fermata.
const sessionsAttempted = new Counter('login_sessions_attempted');
const sessionsCompleted = new Counter('login_sessions_completed');
const sessionSuccessRate = new Rate('login_session_success_rate');

const failStep1WebapiAuthorize   = new Counter('login_failed_step1_webapi_oidc_authorize');
const failStep2SamlRequest       = new Counter('login_failed_step2_saml_request_assente');
const failStep3AuthnRequestId    = new Counter('login_failed_step3_authn_request_id_assente');
const failStep4Status            = new Counter('login_failed_step4_login_status_ko');
const failStep4CredenzialiNonValide = new Counter('login_failed_step4_credenziali_non_valide');
const failStep4ConsensoAssente   = new Counter('login_failed_step4_pagina_consenso_assente');
const failStep6SamlResponseAssente = new Counter('login_failed_step6_saml_response_assente');
const failStep6Status            = new Counter('login_failed_step6_acs_status_ko');
const failStep6CallbackErrato    = new Counter('login_failed_step6_callback_non_sp');
const failStep6ErroreInUrl       = new Counter('login_failed_step6_errore_in_url_finale');

// ── Helpers ───────────────────────────────────────────────────────────────────

// Estrae il value di un query param da un URL
function extractQueryParam(url, name) {
  const m = url.match(new RegExp(`[?&]${name}=([^&]*)`));
  return m ? decodeURIComponent(m[1]) : null;
}

// Estrae il value di un <input name="X"> — gestisce attributi con e senza virgolette
function extractField(body, fieldName) {
  const re = new RegExp(`name=['"]?${fieldName}['"]?\\s+value=['"]?([^'"\\s/>]*)['"]?`, 'i');
  const m  = body.match(re);
  return m ? m[1] : '';
}

// Estrae l'action del primo <form> trovato
function extractAction(body) {
  const m = body.match(/action=['"]?([^'">\s]+)['"]?/i);
  return m ? m[1] : null;
}

// Estrae la SAMLResponse dal form auto-submit di OneID
function extractSamlResponse(body) {
  const m = body.match(/name=['"]SAMLResponse['"][^>]*value=['"]([^'"]+)['"]/i);
  return m ? m[1] : null;
}

// ── Scenario ──────────────────────────────────────────────────────────────────

export default function loginTest() {
  sleep(1);

  const username = usernames[exec.scenario.iterationInTest % usernames.length];
  const jar      = new http.CookieJar();
  const headers  = {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    'Upgrade-Insecure-Requests': '1',
    'Content-Type': 'application/x-www-form-urlencoded',
  };

  console.log(`[iter ${exec.scenario.iterationInTest}] username: ${username}`);

  sessionsAttempted.add(1);

  // ── Step 1: webapi genera l'URL OIDC con nonce e state univoci ────────────
  // GET webapi/oidc/authorize → { location: "https://uat.oneid.../oidc/authorize?...&nonce=X&state=Y" }
  const res1 = http.get(
    `${WEBAPI_BASE}/oidc/authorize?idp=${encodeURIComponent(IDP_PARAM)}`,
    { jar: jar, headers: Object.assign({}, headers, { Origin: SP_BASE }) },
  );

  const step1Ok = check(res1, {
    '[step1] webapi risponde 200':      function(r) { return r.status === 200; },
    '[step1] location presente nel JSON': function(r) { return !!r.json('location'); },
  });
  if (!step1Ok) {
    console.error(`[step1] FALLITO su GET ${WEBAPI_BASE}/oidc/authorize — status: ${res1.status}`);
    failStep1WebapiAuthorize.add(1);
    sessionSuccessRate.add(false);
    return;
  }

  const oidcUrl  = res1.json('location');
  const clientId = extractQueryParam(oidcUrl, 'client_id');

  // ── Step 2: OneID genera il SAMLRequest e lo mette in un form auto-submit ─
  // GET oidc/authorize → HTML con <form action="/samlsso"> + SAMLRequest firmato
  const res2 = http.get(oidcUrl, { jar: jar, headers: headers, redirects: 5 });

  const samlRequest = extractField(res2.body, 'SAMLRequest');
  const relayState  = extractField(res2.body, 'RelayState');
  const samlAction  = extractAction(res2.body);

  const step2Ok = check(res2, {
    '[step2] risponde 200':        function(r) { return r.status === 200; },
    '[step2] SAMLRequest presente': function() { return !!samlRequest; },
    '[step2] action presente':      function() { return !!samlAction; },
  });
  if (!step2Ok) {
    console.error(`[step2] FALLITO su GET ${oidcUrl} (estrazione SAMLRequest/action dal form) — body: ${res2.body.substring(0, 300)}`);
    failStep2SamlRequest.add(1);
    sessionSuccessRate.add(false);
    return;
  }

  // ── Step 3: POST SAMLRequest a OneID — otteniamo authnRequestId ───────────
  // POST /samlsso → HTML pagina login con authnRequestId come campo hidden
  // authnRequestId è l'ID del SAMLRequest, legato a questa sessione SAML
  const res3 = http.post(
    samlAction,
    { SAMLRequest: samlRequest, RelayState: relayState },
    { jar: jar, headers: headers, redirects: 5 },
  );

  const authnRequestId = extractField(res3.body, 'authnRequestId');

  const step3Ok = check(res3, {
    '[step3] risponde 200':           function(r) { return r.status === 200; },
    '[step3] pagina login presente':  function(r) { return r.body.includes('login-form'); },
    '[step3] authnRequestId trovato': function() { return !!authnRequestId; },
  });
  if (!step3Ok) {
    console.error(`[step3] FALLITO su POST ${samlAction} (estrazione authnRequestId dal form login) — body: ${res3.body.substring(0, 300)}`);
    failStep3AuthnRequestId.add(1);
    sessionSuccessRate.add(false);
    return;
  }

  // ── Step 4: POST credenziali ──
  // POST /login con authnRequestId (dinamico) + clientId/clientName (fissi SP) + credenziali
  const res4 = http.post(
    `${IDP_BASE}/login`,
    { authnRequestId: authnRequestId, clientId: clientId, clientName: CLIENT_NAME, username: username, password: password },
    { jar: jar, headers: Object.assign({}, headers, { Origin: IDP_BASE, Referer: `${IDP_BASE}/samlsso` }), redirects: 10 },
  );

  const status4Ok     = res4.status === 200;
  const credenzialiOk = !res4.body.includes('Credenziali non valide');
  const consensoOk    = res4.body.includes('consent-form');

  const step4Ok = check(res4, {
    '[step4] risponde 200':              function() { return status4Ok; },
    '[step4] credenziali valide':        function() { return credenzialiOk; },
    '[step4] pagina consenso presente':  function() { return consensoOk; },
  });
  if (!step4Ok) {
    if (!status4Ok) {
      console.error(`[step4] FALLITO su POST ${IDP_BASE}/login (status ${res4.status}) — url: ${res4.url} body: ${res4.body.substring(0, 300)}`);
      failStep4Status.add(1);
    } else if (!credenzialiOk) {
      console.error(`[step4] FALLITO su POST ${IDP_BASE}/login — credenziali non valide per utente "${username}"`);
      failStep4CredenzialiNonValide.add(1);
    } else {
      console.error(`[step4] FALLITO su POST ${IDP_BASE}/login — pagina consenso assente — url: ${res4.url} body: ${res4.body.substring(0, 300)}`);
      failStep4ConsensoAssente.add(1);
    }
    sessionSuccessRate.add(false);
    return;
  }

  // ── Step 5: POST consenso — chiamata diretta, authnRequestId riusato ──────
  // POST /consent — authnRequestId e clientId sono gli stessi della sessione attiva
  const res5 = http.post(
    `${IDP_BASE}/consent`,
    { authnRequestId: authnRequestId, clientId: clientId, username: username, consent: 'true' },
    { jar: jar, headers: Object.assign({}, headers, { Origin: IDP_BASE, Referer: `${IDP_BASE}/` }), redirects: 0 },
  );

  check(res5, {
    '[step5] consenso inviato': function(r) { return r.status === 200 || r.status === 302; },
  });

  // ── Step 6: POST SAMLResponse all'ACS di OneID ───────────────────────────────
  // L'ACS è https://uat.oneid.pagopa.it/saml/acs (non idp.uat.oneid.pagopa.it)
  // RelayState va estratto dal form — il browser invia "internal-idp"
  const ACS_URL      = 'https://uat.oneid.pagopa.it/saml/acs';
  const samlResponse = extractSamlResponse(res5.body);
  const relayStateAcs = extractField(res5.body, 'RelayState') || 'internal-idp';

  const step6DataOk = check(res5, {
    '[step6] SAMLResponse estratta': function() { return !!samlResponse; },
  });
  if (!step6DataOk) {
    console.error(`[step6] FALLITO su POST ${IDP_BASE}/consent — SAMLResponse non trovata — body: ${res5.body.substring(0, 400)}`);
    failStep6SamlResponseAssente.add(1);
    sessionSuccessRate.add(false);
    return;
  }

  const res6 = http.post(
    ACS_URL,
    { SAMLResponse: samlResponse, RelayState: relayStateAcs },
    {
      jar: jar,
      headers: Object.assign({}, headers, {
        Origin:  IDP_BASE,
        Referer: `${IDP_BASE}/`,
      }),
      redirects: 10,
    },
  );

  const status6Ok   = res6.status === 200;
  const callbackOk  = res6.url.startsWith(SP_BASE);
  const nessunErrore = !res6.url.includes('error');

  const step6Ok = check(res6, {
    '[step6] login completato': function() { return status6Ok; },
    '[step6] callback SP':      function() { return callbackOk; },
    '[step6] nessun errore':    function() { return nessunErrore; },
  });

  if (!step6Ok) {
    if (!status6Ok) {
      console.error(`[step6] FALLITO su POST ${ACS_URL} (status ${res6.status}) — url: ${res6.url}`);
      failStep6Status.add(1);
    } else if (!callbackOk) {
      console.error(`[step6] FALLITO su POST ${ACS_URL} — callback non su SP atteso — url finale: ${res6.url}`);
      failStep6CallbackErrato.add(1);
    } else {
      console.error(`[step6] FALLITO su POST ${ACS_URL} — url finale contiene errore — url: ${res6.url}`);
      failStep6ErroreInUrl.add(1);
    }
    sessionSuccessRate.add(false);
    return;
  }

  sessionsCompleted.add(1);
  sessionSuccessRate.add(true);
  console.log(`[iter ${exec.scenario.iterationInTest}] completato — url finale: ${res6.url}`);
  sleep(1);
}