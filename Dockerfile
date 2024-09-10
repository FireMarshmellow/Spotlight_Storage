FROM python:alpine3.20

# Metadata params
ARG VCS_REF
ARG BUILD_DATE

ENV MIMOSA_VERSION=V4-2024.09.1dev
ENV MIMOSA_DOCKER_VERSION=2024.09.2dev
WORKDIR /app
EXPOSE 5000 
COPY /setup.sh /setup.sh
RUN  chmod +x /setup.sh 
COPY requirements.txt ./

RUN apk add --no-cache bash git curl && \
    apk upgrade && \
    cd /app && \
    pip install --upgrade pip && \
    pip install waitress && \
    pip install --no-cache-dir -r requirements.txt

COPY . .

RUN /setup.sh

RUN rm -rf /setup.sh /app/setup.sh
RUN echo "$(date "+%d.%m.%Y %T") Spotlight Storage Docker ${MIMOSA_DOCKER_VERSION} Built from Spotlight Storage ${MIMOSA_VERSION}" >> /build_date.info


COPY /entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

#HEALTHCHECK CMD curl --fail http://localhost:5000 || exit 1

ENTRYPOINT ["/entrypoint.sh"]