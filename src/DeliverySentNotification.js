import { check, sleep } from 'k6';
import http from 'k6/http';


export let options = {
    // virtual users
    vus: 1,
    // duration: '60s',
    //duration: '30s',
    stages: [
        {
            "duration": "10",
            "target": 1
          },
    ],
    "thresholds": {
        "http_req_failed": [
          "rate<0.001"
        ],
      }
   
  };


function precondition() {
    // https://api.dev.pn.pagopa.it/delivery/attachments/preload
    /*
    PreLoadRequest {
    preloadIdx: 0
    contentType: application/pdf
    sha256: jezIVxlG1M1woCSUngM6KipUN3/p8cG5RMIPnuEanlE=
    }
    

    var reader = new FileReader();
    let arrayBuffer;
    reader.readAsArrayBuffer(myFile);
    reader.onloadend = function (evt) {
        if (evt.target.readyState == FileReader.DONE) {
           arrayBuffer = evt.target.result;
        }
    }
    array = new Uint8Array(arrayBuffer);


    sha256 = crypto.sha256(array.buffer, 'hex');
    */
}


var notificationRequest = JSON.parse(open('/model/notificationRequest.json'));

export default function () {

    var apiKey = `${__ENV.API_KEY}`
    var envName = `${__ENV.ENV_NAME}`

    var url = `https://api.${envName}.pn.pagopa.it/delivery/requests`;

     var params = {
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey
        },
    };


  
  notificationRequest.paProtocolNumber = ("2023" + new Date().getTime().toString().padStart(14, '0'));
  console.log('paprotocol: '+notificationRequest.paProtocolNumber);
  var payload = JSON.stringify(notificationRequest);

  var r = http.post(url, payload, params);

  console.log(`Status ${r.status}`);

  check(r, {
    'status is 202': (r) => r.status === 202,
  });

  console.log(r.body)

  if (r.status === 429) {
    throttling.add(1);
  }


  sleep(0.5);

}