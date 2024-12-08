FROM python:alpine3.20 as build

# Metadata params
ARG VCS_REF
ARG BUILD_DATE

ENV MIMOSA_VERSION=V4-2024.09.1dev
ENV MIMOSA_DOCKER_VERSION=2024.09.2dev

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
