# aws sso login --profile sso_pn-core-dev
#
# python3 ./get_test_metrics/queues_check.py --profile <profile_name>
#
# python3 ./get_test_metrics/queues_check.py --profile sso_pn-core-dev

import boto3
import time
import sys

# check passed parameters
if len(sys.argv) != 3:
    print('Usage: python3 ./queues_check.py --profile <profile_name>')
    sys.exit(1)

profile_name = sys.argv[2]

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
        retrieved_messages.append(message.body)
        # we don't delete the message, so that we can retrieve it again

end_time = time.time()
print(f'Elapsed time: {end_time - start_time} seconds')

# number of messages retrieved
print(f'Number of messages retrieved: {len(retrieved_messages)}')