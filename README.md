# WARNING: This version is not compatible with the same database from version 2, Use the provided converter to update your database file.

# MIMOSA - short for "Mellow_Labs Inventory Management and Organization System Apparatus". Just like a refreshing mimosa, this system will make your life brighter and more organized!

## Videos

Main Video:
[youtu.be/7C4i-2IqSS4](https://youtu.be/7C4i-2IqSS4)

Step by step Video:
[https://youtu.be/QOd1apc0Lpo](https://youtu.be/QOd1apc0Lpo)

## Hardware i used

Affiliate links:

D1 mini: https://amzn.to/440mfet

LEDs : https://amzn.to/3VcoaIY

## New Features

- Support for multiple LEDs per item
- Dark mode
- Adjustable timeout
- Settings panel

## Installation

1. Clone the repo
2. pip install -r requirements.txt
3. If you already have a database, Move it to the main directory. And make sure it's backed up
4. Run app.py Or .exe

## dependencies:

- python 3.6

## docker

```
version: "3"
services:
  mimosa-app:
    image: mmblack04/mimosa:latest
    container_name: mimosa
    ports:
      - "5000:5000"
```

## Development

If you would like to help with development, we have a Trello board for to-dos and feature requests. Please contact us for access.
[trello.com/mimosa-todos](https://trello.com/invite/b/es69yaRU/ATTI349558717e0304248c5ca4064938da9bAE64E809/mimosa-todos)
