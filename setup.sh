#!/bin/bash

rm -rf /app/requirements.txt /app/entrypoint.sh /app/.dockerignore

sed -i 's/debug=True/debug=False/g'  /app/app.py
sed -i "s/MIMOSA_VERSION/$MIMOSA_VERSION/g"  /app/app.py