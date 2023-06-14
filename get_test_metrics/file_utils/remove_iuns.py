# python3 ./get_test_metrics/file_utils/remove_iuns.py

def read_file_and_remove_rows_present_in_second_file(iuns_filename: str, iuns_ro_remove_filename: str, destination_filename: str) -> None:
    with open(iuns_filename, 'r') as source_file:
        with open(iuns_ro_remove_filename, 'r') as second_file:
            with open(destination_filename, 'w') as destination_file:
                second_file_contents = second_file.read()
                for line in source_file:
                    if line not in second_file_contents:
                        destination_file.write(line)

iuns_filename = './get_test_metrics/file_utils/notification-request-ids-decoded.txt'
iuns_ro_remove_filename = './get_test_metrics/file_utils/iuns-to-remove.txt'
destination_filename = './get_test_metrics/file_utils/iuns-decoded-without-removed.txt'

read_file_and_remove_rows_present_in_second_file(iuns_filename, iuns_ro_remove_filename, destination_filename)
