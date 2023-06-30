import base64

# function for reading in a file per row and encoding each row as base64, saving to a different file
def encode_base64_lines(source_filename: str, destination_filename: str) -> None:
    with open(source_filename, 'r') as source_file:
        with open(destination_filename, 'w') as destination_file:
            for line in source_file:
                if line == '\n':
                    continue
                encoded = base64.b64encode(line.encode('utf-8'))
                destination_file.write(encoded.decode('utf-8') + '\n')

# alternative concise line processing
#def decode_base64_lines(rows: list[str]) -> list[str]:
#    return [base64.b64decode(row).decode('utf-8') for row in rows if row != '']

source_filename = './get_test_metrics/file_utils/plain_iuns.txt'
destination_filename = './get_test_metrics/file_utils/converted-notification-request-ids.txt'

encode_base64_lines(source_filename, destination_filename)