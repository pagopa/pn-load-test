#!/bin/bash
# Utilizza per estrarre le linee tra start_line e end_line
if [ "$#" -lt 2 ]; then
  echo "Usage: $0 <log_file> <output_file>"
  exit 1
fi

# Assegna gli argomenti a variabili
log_file="$1"
output_file="$2"
start_line="271482"
end_line="11824336"



sed -n "${start_line},${end_line}p" "$log_file" > "$output_file"

echo "Contenuto estratto salvato in $output_file"