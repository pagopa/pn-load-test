
# Usage:
# aws sso login --profile sso_pn-confinfo-dev
#
# python3 ./get_test_metrics/dlq_utils/safestorage_check.py --dlq_input_file <input_file> --profile <profile_name>
#
# Example:
# python3 ./get_test_metrics/dlq_utils/safestorage_check.py --dlq_input_file outputs/dlq/retrieved_messages.json --profile sso_pn-confinfo-dev

import boto3
import sys
import json


s3_bucket_name = 'pn-safestorage-eu-south-1-089813480515'

if len(sys.argv) != 5:
    print('Usage: python3 ./safestorage_check.py --dlq_input_file <input_file> --profile <profile_name>')
    sys.exit(1)

dlq_input_file = sys.argv[2]
profile_name = sys.argv[4]

# read dlq_input_file as JSON and put in a object
try:
    with open(dlq_input_file) as json_file:
        dlq_input = json.load(json_file)
except FileNotFoundError:
    print(f'File {dlq_input_file} not found')
    sys.exit(1)
except json.decoder.JSONDecodeError:
    print(f'File {dlq_input_file} is not a valid JSON file')
    sys.exit(1)

# check that dlq_input is a list and is not empty
if not isinstance(dlq_input, list) or len(dlq_input) == 0:
    print(f'File {dlq_input_file} is not a valid JSON file')
    sys.exit(1)

#print(dlq_input)
print(f'Number of elements in dlq_input: {len(dlq_input)}')

# iterate over dlq_input and for each element get the corresponding object from S3
session = boto3.Session(profile_name=profile_name)
s3 = session.resource('s3')

for dlq_input_element in dlq_input:
    print(dlq_input_element.get('key'))

    # get the object from S3
    try:
        # object = s3.Object(s3_bucket_name, dlq_input_element['key'])
        pass
    except Exception:
        print("Exception retrieving object: " + str(Exception))
        exit(1)
