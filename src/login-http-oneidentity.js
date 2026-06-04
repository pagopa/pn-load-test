import { check, sleep } from 'k6';
import exec from 'k6/execution';
import http from 'k6/http';

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

// Costanti fisse del Service Provider — non cambiano tra sessioni
const CLIENT_ID   = 'DFCUf4W3KHfKUl4USEVYrMgpMxvyKICHM_ZPiZ3ftm0';
const CLIENT_NAME = `Cittadini-${env.toUpperCase()}`;

// ── Helpers ───────────────────────────────────────────────────────────────────

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

  // ── Step 1: webapi genera l'URL OIDC con nonce e state univoci ────────────
  // GET webapi/oidc-authorize → { location: "https://uat.oneid.../oidc/authorize?...&nonce=X&state=Y" }
  const res1 = http.get(
    `${WEBAPI_BASE}/oidc-authorize?idp=${encodeURIComponent(IDP_PARAM)}`,
    { jar, headers: { ...headers, Origin: SP_BASE } },
  );

  const step1Ok = check(res1, {
    '[step1] webapi risponde 200':      r => r.status === 200,
    '[step1] location presente nel JSON': r => !!r.json('location'),
  });
  if (!step1Ok) { console.error(`[step1] FALLITO — status: ${res1.status}`); return; }

  const oidcUrl = res1.json('location');

  // ── Step 2: OneID genera il SAMLRequest e lo mette in un form auto-submit ─
  // GET oidc/authorize → HTML con <form action="/samlsso"> + SAMLRequest firmato
  const res2 = http.get(oidcUrl, { jar, headers, redirects: 5 });

  const samlRequest = extractField(res2.body, 'SAMLRequest');
  const relayState  = extractField(res2.body, 'RelayState');
  const samlAction  = extractAction(res2.body);

  const step2Ok = check(res2, {
    '[step2] risponde 200':        r => r.status === 200,
    '[step2] SAMLRequest presente': () => !!samlRequest,
    '[step2] action presente':      () => !!samlAction,
  });
  if (!step2Ok) { console.error(`[step2] FALLITO — body: ${res2.body.substring(0, 300)}`); return; }

  // ── Step 3: POST SAMLRequest a OneID — otteniamo authnRequestId ───────────
  // POST /samlsso → HTML pagina login con authnRequestId come campo hidden
  // authnRequestId è l'ID del SAMLRequest, legato a questa sessione SAML
  const res3 = http.post(
    samlAction,
    { SAMLRequest: samlRequest, RelayState: relayState },
    { jar, headers, redirects: 5 },
  );

  const authnRequestId = extractField(res3.body, 'authnRequestId');

  const step3Ok = check(res3, {
    '[step3] risponde 200':           r => r.status === 200,
    '[step3] pagina login presente':  r => r.body.includes('login-form'),
    '[step3] authnRequestId trovato': () => !!authnRequestId,
  });
  if (!step3Ok) { console.error(`[step3] FALLITO — body: ${res3.body.substring(0, 300)}`); return; }

  // ── Step 4: POST credenziali ──
  // POST /login con authnRequestId (dinamico) + clientId/clientName (fissi SP) + credenziali
  const res4 = http.post(
    `${IDP_BASE}/login`,
    { authnRequestId, clientId: CLIENT_ID, clientName: CLIENT_NAME, username, password },
    { jar, headers: { ...headers, Origin: IDP_BASE, Referer: `${IDP_BASE}/samlsso` }, redirects: 10 },
  );

  const step4Ok = check(res4, {
    '[step4] risponde 200':              r => r.status === 200,
    '[step4] credenziali valide':        r => !r.body.includes('Credenziali non valide'),
    '[step4] pagina consenso presente':  r => r.body.includes('consent-form'),
  });
  if (!step4Ok) { console.error(`[step4] FALLITO — url: ${res4.url} body: ${res4.body.substring(0, 300)}`); return; }

  // ── Step 5: POST consenso — chiamata diretta, authnRequestId riusato ──────
  // POST /consent — authnRequestId e clientId sono gli stessi della sessione attiva
const res5 = http.post(
  `${IDP_BASE}/consent`,
  { authnRequestId, clientId: CLIENT_ID, username, consent: 'true' },
  { jar, headers: { ...headers, Origin: IDP_BASE, Referer: `${IDP_BASE}/` }, redirects: 0 },
);

check(res5, {
  '[step5] consenso inviato': r => r.status === 200 || r.status === 302,
});

// ── Step 6: POST SAMLResponse all'ACS di OneID ───────────────────────────────
// L'ACS è https://uat.oneid.pagopa.it/saml/acs (non idp.uat.oneid.pagopa.it)
// RelayState va estratto dal form — il browser invia "internal-idp"
const ACS_URL     = 'https://uat.oneid.pagopa.it/saml/acs';
const samlResponse = extractSamlResponse(res5.body);
const relayStateAcs = extractField(res5.body, 'RelayState') || 'internal-idp';

const step6DataOk = check(res5, {
  '[step6] SAMLResponse estratta': () => !!samlResponse,
});
if (!step6DataOk) {
  console.error(`[step6] SAMLResponse non trovata — body: ${res5.body.substring(0, 400)}`);
  return;
}

const res6 = http.post(
  ACS_URL,
  { SAMLResponse: samlResponse, RelayState: relayStateAcs },
  {
    jar,
    headers: {
      ...headers,
      Origin:  IDP_BASE,                // https://idp.uat.oneid.pagopa.it
      Referer: `${IDP_BASE}/`,          // https://idp.uat.oneid.pagopa.it/
    },
    redirects: 10,
  },
);

check(res6, {
  '[step6] login completato': r => r.status === 200,
  '[step6] callback SP':      r => r.url.startsWith(SP_BASE),
  '[step6] nessun errore':    r => !r.url.includes('error'),
});

console.log(`[iter ${exec.scenario.iterationInTest}] completato — url finale: ${res6.url}`);
  sleep(1);
}