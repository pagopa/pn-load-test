const axios = require('axios');
const fs = require('fs');

const apiKey = process.argv[2];
const baseUrl = process.argv[3];

const fileName = process.argv[4];
const appendOrCreate = process.argv[5]; // 'append' or 'create'
let firstWrite = true;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));


function getStreamEvents (streamId, lastEventId) {
  const url = `https://${baseUrl}/delivery-progresses/streams/${streamId}/events`;
  const queryParams = lastEventId ? `?lastEventId=${lastEventId}` : '';

   return axios.get(url + queryParams, {
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
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


const processStream = async () => {
  try {

    let streamId; 
    await createStream().then((response) => {
      console.log(response.data)
      console.log('ID: '+response.data.streamId)
      streamId = response.data.streamId;
    })
    .catch((error) =>{
      console.log(error);
    });

    console.log(`Stream created with ID: ${streamId}`);

    let lastEventId = null;

    const cleanup = async () => {
        console.log('EXIT');

        if (streamId) {
          await deleteStream(streamId).then((response) => {
            console.log('deleted: '+response)
          })
          .catch((error) =>{
            console.log(error);
          });
        }

        process.exit(0);
    };
  
    process.on('SIGINT', cleanup); //'SIGINT' 'SIGTERM' 'SIGQUIT'

    while (true) {
      let events;
      let retryAfter;
      await getStreamEvents(streamId, lastEventId).then((response) => {
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

processStream();
