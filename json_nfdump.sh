#!/bin/sh
usage="$(basename "$0") [-h] [netflows_directory] -- program to format nfdump output as json. Requires nfdump.

where:
    -h show this help and exit
    netflows_directory directory containing netflow files created by nfcapd

example:
  $(basename "$0") nfcapd_capture_directory > netflows.json
    "
case $1 in
  -h) echo "$usage"
    exit
    ;;
  "") echo "Missing argument netflows_directory" >&2
    echo "$usage" >&2
    exit 1
    ;;
esac
echo [$(nfdump -q -R $1 -N -o "fmt:{\"start\": \"%ts\", \"duration\":\"%td\", \"sourceWithPort\": \"%sap\", \"destWithPort\":\"%dap\", \"source\": \"%sa\", \"dest\":\"%da\", \"protocol\": \"%pr\", \"bytes\": %byt}," | sed -e "s/\" */\"/g" -e "s/\([^,]\) *\"/\1\"/g" -e "s/: +\([0-9]\)/: \1/g")] | sed -e "s/,]/]/g"

