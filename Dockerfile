FROM python:3.13

COPY static static
COPY app.py  app.py
COPY db.py db.py
COPY favicon.ico favicon.ico
COPY requirements.txt requirements.txt
COPY templates templates
COPY setup.py setup.py
ENV TRANSLATIONS_DIR=/app/static/translations


RUN pip install -r requirements.txt
RUN python setup.py

EXPOSE 5000
EXPOSE 5001
ENTRYPOINT python app.py
