# download all messages from a queue, without deleting them, writing it to file, if there are any
#
#
# Usage:
# aws sso login --profile sso_pn-core-dev
#
# python3 ./get_test_metrics/dlq_utils/queues_check.py --dlq-save <dql_save_file> --profile <profile_name>
#
# 
# Example:
# python3 ./get_test_metrics/dlq_utils/queues_check.py --dlq-save outputs/dlq/retrieved_messages.json --profile sso_pn-core-dev

import boto3
import time
import sys
import json

# check passed parameters
if len(sys.argv) != 5:
    print('Usage: python3 ./queues_check.py --dlq-save <dql_save_file> --profile <profile_name>')
    sys.exit(1)

dql_save_file = sys.argv[2]
profile_name = sys.argv[4]

queue_name = 'pn-safestore_to_deliverypush-DLQ'
wait_time_seconds = 2
visibility_timeout_seconds = 20 # bigger enough for being able of retrieving all the messages in the queu without deleting them



session = boto3.Session(profile_name=profile_name)
sqs = session.resource('sqs')

# receive all messages from the queue, without deleting them
queue = sqs.get_queue_by_name(QueueName=queue_name)

start_time = time.time()

retrieved_messages = []
while True:
    try:
        messages = queue.receive_messages(MaxNumberOfMessages=10,
                                          WaitTimeSeconds=wait_time_seconds, 
                                          VisibilityTimeout=visibility_timeout_seconds,
                                          AttributeNames=['All'],
                                          MessageAttributeNames=['All'])
    except Exception:
        print("Exception retrieving messages: " + str(Exception))
        exit(1)

    if (len(messages) == 0):
        print("No more messages in the queue")
        break
    for message in messages:
        print(message.body)
        # append the object as decoded JSON to the list
        try:
            decoded_body = json.loads(message.body)
            retrieved_messages.append(decoded_body)
        except Exception as e:
            print("Exception decoding message: " + str(e))
            exit(1)
        # we don't delete the message, so that we can retrieve it again

end_time = time.time()
print(f'Elapsed time: {end_time - start_time} seconds')

# number of messages retrieved
print(f'Number of messages retrieved: {len(retrieved_messages)}')

# save retrieved messages to a json file, if more than 0
if len(retrieved_messages) > 0:
    json_to_write = json.dumps(retrieved_messages, indent=4)
    with open(dql_save_file, 'w') as f:
        f.write(json_to_write)
        print(f'File {dql_save_file} written')
else:
    print(f'No messages retrieved, file {dql_save_file} not written')
