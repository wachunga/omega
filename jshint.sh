jshint *.js ./lib/*.js ./public/js/*.js

if [ $? -eq 0 ]; then
   echo 'Lint-free'
fi
