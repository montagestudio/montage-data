#!/bin/sh
source ~/.profile
cd "${0%/*}"
echo "Updating JSDoc at $(date +%FT%T)..." >>.watch.log
jsdoc -c .jsdoc.conf.json >>.watch.log 2>&1
