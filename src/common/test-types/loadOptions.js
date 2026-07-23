// src/common/test-types/loadOptions.js
export function loadTestOptions(testType = __ENV.TEST_TYPE) {
  if (!testType) {
    throw new Error('Missing TEST_TYPE env var');
  }

  return JSON.parse(open(`./${testType}.json`));
}