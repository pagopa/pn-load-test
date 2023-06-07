const axios = require('axios');
const fs = require('fs');
const { Worker, isMainThread, workerData } = require('worker_threads');

const apiKey = process.argv[2];
const baseUrl = process.argv[3];

const fileName = process.argv[4];
const appendOrCreate = process.argv[5]; // 'append' or 'create'
const numOfStream = process.argv[6];


const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));


function getStreamEvents (basepath, internalApikey, streamId, lastEventId) {
  const url = `https://${basepath}/delivery-progresses/streams/${streamId}/events`;
  const queryParams = lastEventId ? `?lastEventId=${lastEventId}` : '';

   return axios.get(url + queryParams, {
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': internalApikey,
    }});
}

function createStream () {
  const url = `https://${baseUrl}/delivery-progresses/streams`;
  const body = {
    title: 'stream-test',
    eventType: 'STATUS',
    filterValues: [],
  };

  return axios.post(url, body,
    {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
  })
  
}

function deleteStream (streamId) {
    const url = `https://${baseUrl}/delivery-progresses/streams/${streamId}`;
    return axios.delete(url,
      {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      }})
}


const processStream = async (basePath, internalApikey, streamId, fileName) => {
  try {
    console.log("streamId "+streamId);
    console.log("fileName "+fileName);
    let firstWrite = true;
    let lastEventId = null;
    while (true) {
      let events;
      let retryAfter;
      console.log('SONO NEL THREAD ('+streamId+') NEL WHILE CON LAST-EVENT-ID: '+lastEventId);
      
      await getStreamEvents(basePath, internalApikey, streamId, lastEventId).then((response) => {
        console.log(response.data)
        console.log("retry-after "+response.headers['retry-after'])
        events = response.data;
        retryAfter = response.headers['retry-after']
      })
      .catch((error) =>{
        console.log(error);
      });

      if (events.length > 0) {
        lastEventId = events[events.length - 1].eventId;
        console.log('lastEventId: '+lastEventId)
        events.forEach((elem) => {
          if(!firstWrite || appendOrCreate === 'append'){
            fs.appendFile(fileName, JSON.stringify(elem) + '\n', (err) => { if (err) { throw new Error(`Error appending to file: ${err}`); } });
          }else{
            fs.writeFile(fileName, JSON.stringify(elem) + '\n',(err) => {if (err) {throw new Error(`Error appending to file: ${err}`)}});
            firstWrite = false;
          }
        });
      }

      if (retryAfter > 0) {
        console.log(`Attendo ${retryAfter} ms`);
        await delay(retryAfter);
      }
    }
  } catch (error) {
    console.error(error);
  }
}

const main = async () => {

  let streamIdList = [];
  for(let i = 0; i < numOfStream; i++){
    let streamId; 
    await createStream().then((response) => {
      console.log(response.data)
      console.log('ID: '+response.data.streamId)
      streamId = response.data.streamId;
    })
    .catch((error) =>{
      console.log(error);
    });
    streamIdList.push(streamId);

    console.log(`Stream created with ID: ${streamId}`);

    const worker = new Worker(process.argv[1], { workerData: [baseUrl, apiKey, streamId,i+'_'+fileName] });

    
    worker.on('exit', (code) => {console.log(`Worker ${i} stopped with exit code ${code}`)});
    
  }

  const cleanup = async () => {

    console.log('EXIT');
    console.log("STREAM ID LIST "+streamIdList);

    for(let i = 0; i < streamIdList.length; i++){
      await deleteStream(streamIdList[i]).then((response) => {
        console.log('deleted: '+response)
      })
      .catch((error) =>{
        console.log(error);
      });
    }

    process.exit(0);
  };

  process.on('SIGINT', cleanup); //'SIGINT' 'SIGTERM' 'SIGQUIT'
  
}



if (isMainThread) {
  main().catch((error) => {
    console.error(error);
  });
} else {
  const basePath = workerData[0];
  const internalApikey = workerData[1];
  const streamId = workerData[2];
  const internalfileName = workerData[3];
  processStream(basePath, internalApikey, streamId,internalfileName).catch((error) => {
    console.error(`Error processing stream ${streamId}:`, error);
    process.exit(1);
  });
}
