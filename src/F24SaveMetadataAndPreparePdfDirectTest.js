import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = JSON.parse(open('./modules/test-types/'+__ENV.TEST_TYPE+'.json'));

const BASE_URL = __ENV.BASE_URL;

const headers = {
    'Content-Type': 'application/json',
    'x-pagopa-f24-cx-id': 'cxId',
};

const fileKey = __ENV.FILE_KEY;
const sha256 = __ENV.SHA256;
const sleepSeconds = parseFloat(__ENV.SLEEP_SECONDS);

export default function () {
    const iteration = __ITER;
    const uniqueSetId = `IUN_ABCD-HILM-YKWX-202202-${iteration}`;
    const uniqueRequestId = `ABCD-HILM-YKWX-202202-${iteration}_rec0_try1`;

    const saveMetadataPayload = JSON.stringify({
        setId: uniqueSetId,
        f24Items: [
            {
                applyCost: true,
                fileKey: fileKey,
                sha256: sha256,
                pathTokens: ["0","0"]
            }
        ]
    });

    let saveMetadataResponse = http.put(`${BASE_URL}/f24-private/metadata/${uniqueSetId}`, saveMetadataPayload, { headers });
    check(saveMetadataResponse, {
        'saveMetadata: status 202': (r) => r.status === 202,
    });

    sleep(sleepSeconds);

    const preparePdfPayload = JSON.stringify({
        setId: uniqueSetId,
        requestId: uniqueRequestId,
        pathTokens: ["0"],
        notificationCost: 100 
    });

    let preparePdfResponse = http.post(`${BASE_URL}/f24-private/prepare/${uniqueRequestId}`, preparePdfPayload, { headers });
    check(preparePdfResponse, {
        'preparePDF: status 202': (r) => r.status === 202,
    });
}
