ARG BASE_IMAGE=docker.io/library/python:alpine3.20
FROM ${BASE_IMAGE}

# Metadata params
ARG VCS_REF
ARG BUILD_DATE
ARG GIT_COMMIT=${GITHUB_HEAD_REF}
ARG GIT_SOURCE=${GITHUB_REPOSITORY}
ENV MIMOSA_VERSION=V4-2024.09.1dev
ENV MIMOSA_DOCKER_VERSION=2024.09.2dev

LABEL org.opencontainers.image.description="Mellow_Labs Inventory Management and Organization System Apparatus"
LABEL org.opencontainers.image.revision="${GIT_COMMIT}"
LABEL org.opencontainers.image.source="${GIT_SOURCE}"
LABEL org.opencontainers.image.url="https://github.com/FireMarshmellow/Spotlight_Storage"
LABEL org.opencontainers.image.licenses="MIT"
LABEL org.opencontainers.image.authors="Tomasz Burzy"

# hadolint ignore=DL3013,DL3018
RUN apk upgrade && \
    apk add --no-cache bash git curl && \
    pip install --no-cache-dir --upgrade pip

WORKDIR /app
COPY . .
RUN pip install --no-cache-dir -r requirements.txt \
    && echo "$(date "+%d.%m.%Y %T") Spotlight Storage Docker ${MIMOSA_DOCKER_VERSION} Built from Spotlight Storage ${MIMOSA_VERSION}" >> /build_date.info

EXPOSE 5000
HEALTHCHECK --interval=60s --timeout=5s \
    CMD curl --fail http://localhost:5000 || exit 1

USER nobody
ENTRYPOINT ["python", "./app.py"]
