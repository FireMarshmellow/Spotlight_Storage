#!/bin/sh
# Starts Spotlight Storage with the waitress production server as the
# unprivileged "app" user. When started as root (the default), it first makes
# sure the mounted volumes are writable by that user, so existing installs
# whose data folders were created by root keep working.
set -e
[ -n "$DEBUG" ] && set -x

cd /app
SERVER="waitress-serve --listen=0.0.0.0:5000 --threads=${WAITRESS_THREADS:-8} app:app"

if [ "$(id -u)" = "0" ]; then
    for dir in /app/data /app/images /app/logs; do
        mkdir -p "$dir"
        if [ "$(stat -c %u "$dir")" != "$(id -u app)" ]; then
            chown -R app:app "$dir"
        fi
    done
    # shellcheck disable=SC2086
    exec su-exec app:app $SERVER
fi

# shellcheck disable=SC2086
exec $SERVER
