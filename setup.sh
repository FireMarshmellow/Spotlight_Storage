#!/bin/sh
# Build-time clean-up inside the image.
set -e

rm -rf /app/requirements.txt /app/requirements-dev.txt /app/entrypoint.sh /app/.dockerignore /app/tests /app/pytest.ini

sed -i 's/debug=True/debug=False/g'  /app/app.py
sed -i "s/MIMOSA_VERSION/$MIMOSA_VERSION/g"  /app/app.py
