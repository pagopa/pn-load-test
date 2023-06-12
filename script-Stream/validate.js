const fs = require('fs');
const readline = require('readline');

let dynamotimelineElements = [];
let streamtimelineElements = [];

const statusElement = ['REQUEST_ACCEPTED', 'SEND_DIGITAL_DOMICILE', 'DIGITAL_SUCCESS_WORKFLOW', 'REFINEMENT'];
//process.argv[3] = test/0_Stream_w6_9iter_30min_0806_1542.txt
//process.argv[2] = test/processed-timelines.json
const dynamofilePath =  process.argv[2];
const streamfilePath =  process.argv[3];
const streamType =  process.argv[4];

function readTimelineElementsFromDynamoFile(filePath) {
    return new Promise((resolve, reject) => {
        const fileAStream = fs.createReadStream(filePath, { encoding: 'utf8' });
        let data = '';

        fileAStream.on('data', chunk => {
            data += chunk;
        });

        fileAStream.on('end', () => {
            processDataFromDynamoFile(data);
            console.log('End reading dynamo-file, number of elements: < ' + dynamotimelineElements.length + ' >');
            resolve();
        });

        fileAStream.on('error', error => {
            reject(error);
        });
    });
}

function processDataFromDynamoFile(data) {
    const dynamoFile = JSON.parse(data);

    for (const item of dynamoFile) {
        const iun = item.iun;
        for (const timelineItem of item.timeline) {
            const category = timelineItem.category;
            const key = `${iun}:${category}`;
            dynamotimelineElements.push(key);
        }
    }
}

function readTimelineElementsFromStreamFile(filePath) {
    return new Promise((resolve, reject) => {
        const fileAStream = fs.createReadStream(filePath, { flags: 'r', encoding: 'utf-8' });
        const rl = readline.createInterface({
            input: fileAStream,
        });

        rl.on('line', processDataFromStreamFile);

        rl.on('close', () => {
            console.log('End reading stream-file, number of elements: < ' + streamtimelineElements.length + ' >');
            resolve();
        });

        fileAStream.on('error', error => {
            reject(error);
        });
    });
}

function processDataFromStreamFile(line) {
    const fileData = JSON.parse(line);
    const iun = fileData.iun;
    const category = fileData.timelineEventCategory;
    const key = `${iun}:${category}`;
    streamtimelineElements.push(key);
}

function verifyStream(){
    
    for(let i = 0; i < dynamotimelineElements.length; i++){ 
        if(streamType === 'STATUS' && statusElement.includes(dynamotimelineElements[i].substring(dynamotimelineElements[i].indexOf(':')+1,dynamotimelineElements[i].length))){
            if(!streamtimelineElements.includes(dynamotimelineElements[i])){
                console.log("STREAM IS NOT VALID");
                break;
            }
        }else{
            if(!streamtimelineElements.includes(dynamotimelineElements[i])){
                console.log("STREAM IS NOT VALID");
                break;
            }
        }
    }
}


async function main() {
    await Promise.all([
        readTimelineElementsFromStreamFile(streamfilePath),
        readTimelineElementsFromDynamoFile(dynamofilePath)
    ]);
   
    verifyStream();
}

main();