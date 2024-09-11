#!/usr/bin/env bash
## Shell setting
if [[ -n "$DEBUG" ]]; then
    set -ex
else
    set -e
fi

cd /app && python ./app.py