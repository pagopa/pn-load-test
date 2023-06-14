# 1.pre
populate notification-request-ids.txt file (one base-64 request id per line, followed by newline)

# 1 - start from notification-request-ids.txt, producing notification-request-ids-decoded.txt (one iun per line, followed by newline)
decode_iuns.py

# 2.pre (one iun per line, followed by newline)
populate iuns-to-remove.txt

# 2 - remove iuns in iuns-to-remove.txt from notification-request-ids-decoded.txt, producing iuns-decoded-without-removed.txt (one iun per line, followed by newline)
remove_iuns.py

# 3 - produce iuns with one iun per line, followed by ";" and then newline
produce_final_test_file_with_iuns.py