#!/bin/sh
cd "`dirname "$0"`"

node node_modules/jshint/bin/hint *.js ./server/*.js ./server/lib/*.js ./public/js/*.js

if [ $? -eq 0 ]; then
   echo 'Lint-free'
fi
