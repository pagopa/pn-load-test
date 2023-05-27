const { argv } = require('node:process');
const fs  = require('node:fs');
const readline = require('node:readline/promises');


const fileName = argv[2]

const fileStream = fs.createReadStream( fileName );

const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
});


let requests = {};

rl.on('line', (line) => {
  const lineObject = JSON.parse( line );
  if( lineObject?.msg?.startsWith("Request:") ) {
    requests[lineObject.request_id] = lineObject

  }
  else if( lineObject?.msg?.startsWith("Response:") ) {
    const request_id = lineObject.request_id;
    const request = requests[request_id];
    const time = request.time;

    const requestMsg = request.msg.split("\n")
    const requestHeaderLine = requestMsg[1];
    const requestHeaderLineParts = requestHeaderLine.trim().split(/ +/, 3);
    const requestMethod = requestHeaderLineParts[0];
    const requestPath = requestHeaderLineParts[1];
    const requestHost = requestMsg[2].replace(/Host: /, "");

    const responseMsg = lineObject.msg.split("\n");
    const statusLine = responseMsg[1];
    const statusCode = statusLine.replace(/[^ ]+ ([0-9]{3}) .*/, "$1")

    const traceIdLines = responseMsg
        .filter( line => line.startsWith("X-Amzn-Trace-Id: ") )
        .map( line => line.replace(/X-Amzn-Trace-Id: /, ""));
    const traceId = ( traceIdLines.length > 0 ) ? traceIdLines[0] : null;
    
    const infos = { statusCode, traceId, requestMethod, requestHost, requestPath, time }
    console.log( JSON.stringify( infos ));

    requests[request_id] = null;
  }
});

