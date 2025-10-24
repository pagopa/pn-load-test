import { check } from 'k6';
import http from 'k6/http';
import { Counter } from 'k6/metrics';
import exec from 'k6/execution';

export let options = JSON.parse(open('./modules/test-types/'+__ENV.TEST_TYPE+'.json'));
let ITER_ESEGUITE = `${__ENV.ITER_ESEGUITE}`;
let ioBasePath = `${__ENV.IO_BASE_PATH}`; 
let ioApiKey = `${__ENV.IO_API_KEY}`;


const code_success = new Counter('code_success');
const code_unauthorized = new Counter('code_unauthorized');
const code_badrequest = new Counter('code_badrequest');
const code_forbidden = new Counter('code_forbidden');
const code_notfound = new Counter('code_notfound');
const code_iserror = new Counter('code_iserror');
const code_serviceunavailable = new Counter('code_serviceunavailable');



export default function callUserAttributeEndpoint() {
  let codiceFiscale = generaCodiceFiscale();
  console.log("Codice fiscale generato: " + codiceFiscale);

  let request = JSON.stringify({
    activationStatus: true
  })

  let param = {
      headers: {
          'Content-Type': 'application/json',
          'x-pagopa-cx-taxid': codiceFiscale,
          'x-api-key': ioApiKey
      },
  }
    
    let url = `https://${ioBasePath}/address-book-io/v1/digital-address/courtesy`;
    console.log(`Updating Courtesy Address for ${codiceFiscale} at URL: ${url}`);
    let r = http.put(url, request, param);
    console.log(`Update Courtesy Address Status: ${r.status}`);

    check(r, {
        'status Update Courtesy Address is 200': (r) => r.status === 200,
    });
}

// Costanti definite fuori dalla funzione per efficienza
const LETTERE_MESI = "ABCDEHLMPRST";
const CONSONANTI = "BCDFGHJKLMNPQRSTVWXYZ"; // 21 consonanti
const VOCALI = "AEIOU";

// Mappa per il calcolo del carattere di controllo (posizioni DISPARI)
const MAPPA_DISPARI = {
  '0': 1, '1': 0, '2': 5, '3': 7, '4': 9, '5': 13, '6': 15, '7': 17, '8': 19, '9': 21,
  'A': 1, 'B': 0, 'C': 5, 'D': 7, 'E': 9, 'F': 13, 'G': 15, 'H': 17, 'I': 19, 'J': 21,
  'K': 2, 'L': 4, 'M': 18, 'N': 20, 'O': 11, 'P': 3, 'Q': 6, 'R': 8, 'S': 12, 'T': 14,
  'U': 16, 'V': 10, 'W': 22, 'X': 25, 'Y': 24, 'Z': 23
};

// Mappa per il calcolo del carattere di controllo (posizioni PARI)
const MAPPA_PARI = {
  '0': 0, '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
  'A': 0, 'B': 1, 'C': 2, 'D': 3, 'E': 4, 'F': 5, 'G': 6, 'H': 7, 'I': 8, 'J': 9,
  'K': 10, 'L': 11, 'M': 12, 'N': 13, 'O': 14, 'P': 15, 'Q': 16, 'R': 17, 'S': 18,
  'T': 19, 'U': 20, 'V': 21, 'W': 22, 'X': 23, 'Y': 24, 'Z': 25
};

function generaCodiceFiscale() {
  let n = exec.scenario.iterationInTest + (ITER_ESEGUITE +1)

  const c1 = CONSONANTI[n % 21];
  const c2 = CONSONANTI[Math.floor(n / 21) % 21];
  const c3 = CONSONANTI[Math.floor(n / 441) % 21];
  const cognome = c1 + c2 + c3;

  const n1 = CONSONANTI[Math.floor(n / 9261) % 21];
  const n2 = CONSONANTI[Math.floor(n / 194481) % 21];
  const n3 = CONSONANTI[Math.floor(n / 4084101) % 21];
  const nome = n1 + n2 + n3;

  const anno = String(n % 100).padStart(2, '0');

  const mese = LETTERE_MESI[n % 12]; // Indice da 0 a 11

  const sesso = n % 2; 
  const giornoBase = (Math.floor(n / 12) % 28) + 1; // Giorno da 1 a 28
  const giornoVal = (sesso === 1) ? giornoBase + 40 : giornoBase;
  const giorno = String(giornoVal).padStart(2, '0');

  const letteraComune = "Z";
  const numComune = String(Math.floor(n / (12 * 28)) % 1000).padStart(3, '0');
  const comune = letteraComune + numComune;
  
  const cfParziale = cognome + nome + anno + mese + giorno + comune;

  let somma = 0;
  for (let i = 0; i < 15; i++) {
    const char = cfParziale[i];
    if ((i + 1) % 2 === 1) { // Posizione DISPARI (1, 3, 5...)
      somma += MAPPA_DISPARI[char];
    } else { 
      somma += MAPPA_PARI[char];
    }
  }

  const resto = somma % 26;
  const carattereControllo = String.fromCharCode(65 + resto); // 65 è il cod. ASCII di 'A'

  return cfParziale + carattereControllo;
}



