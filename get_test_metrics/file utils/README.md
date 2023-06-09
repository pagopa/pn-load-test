# 1.pre
populate notification-request-ids.txt file

# 1 - start from notification-request-ids.txt, producing notification-request-ids-decoded.txt
decode_iuns.py

# 2.pre
populate iuns-to-remove.txt

# 2 - remove iuns in iuns-to-remove.txt from notification-request-ids-decoded.txt, producing iuns-decoded-without-removed.txt
remove_iuns.py

# 3 - produce iuns with one iun per line, followed by ;
produce_final_test_file_with_iuns.py