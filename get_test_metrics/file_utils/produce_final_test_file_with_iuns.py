# python3 ./get_test_metrics/file_utils/produce_final_test_file_with_iuns.py

# read rows from from first filename and write to second filename with a ";" at the end
def read_file_and_write_rows_with_semicolon(source_filename: str, destination_filename: str) -> None:
    with open(source_filename, 'r') as source_file:
        with open(destination_filename, 'w') as destination_file:
            for line in source_file:
                destination_file.write(line.strip() + ';'+'\n')

source_filename = './get_test_metrics/file_utils/iuns-decoded-without-removed.txt'
destination_filename = './get_test_metrics/file_utils/iuns-decoded-without-removed-with-semicolon.txt'

read_file_and_write_rows_with_semicolon(source_filename, destination_filename)
