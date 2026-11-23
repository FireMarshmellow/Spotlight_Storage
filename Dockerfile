# Pinned by digest; Dependabot (docker ecosystem) keeps it up to date.
FROM python:3.13-alpine3.24@sha256:9ef1a599f863231c3d91e941389bfdc4a2d6070557243d54df1a4e57015b960e

# Metadata params
ARG VCS_REF
ARG BUILD_DATE

ENV MIMOSA_VERSION=V4-2024.09.1dev
ENV MIMOSA_DOCKER_VERSION=2024.09.2dev
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1
WORKDIR /app
EXPOSE 5000

COPY requirements.txt ./

# su-exec lets the entrypoint drop root after fixing volume permissions.
# No bash/git/curl in the image: they are not needed at runtime.
RUN apk upgrade --no-cache && \
    apk add --no-cache su-exec && \
    pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt && \
    addgroup -S app && adduser -S -G app -H -h /app app

COPY . .

RUN sh ./setup.sh && \
    rm -f /app/setup.sh && \
    mkdir -p /app/data /app/images /app/logs && \
    chown -R app:app /app && \
    echo "$(date "+%d.%m.%Y %T") Spotlight Storage Docker ${MIMOSA_DOCKER_VERSION} Built from Spotlight Storage ${MIMOSA_VERSION}" >> /build_date.info

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

HEALTHCHECK --interval=60s --timeout=5s --start-period=20s \
    CMD wget -q -O /dev/null http://127.0.0.1:5000/ || exit 1

ENTRYPOINT ["/entrypoint.sh"]
