FROM python:3.7
WORKDIR /app
COPY ./requirements.txt /app
RUN python -m pip install --upgrade pip
RUN pip install -r requirements.txt --user
COPY . .
EXPOSE 5000
CMD ["python", "app.py"]