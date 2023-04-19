# MIMOSA - short for "Mellow_Labs Inventory Management and Organization System Apparatus". Just like a refreshing mimosa, this system will make your life brighter and more organized!

## Video

youtu.be/7C4i-2IqSS4

## Features

- inventory management
- search
- locate items

## Installation

1. Clone the repo
2. pip install -r requirements.txt
3. Edit the ip_list variable in wled_api.py to include the IP addresses of your WLED devices. For example: ip_list = ["192.168.1.100", "192.168.1.101"]
4. Run app.py

## dependencies:

- python 3.6

## Usage

1. Obtain the IP addresses of your WLED devices and add them to the ip_list array in the wled_api.py file.
2. When calling the lights() function in wled_api.py, provide a tuple argument that indicates the index of the device IP address in the ip_list array (starting from 0), and the LED position as a comma-separated pair of integers (starting from 1). For example, to control the LED at position 3 on the second device in the list, pass the argument (1,3) to the lights() function.
3. Adjust the time.sleep value in the lights() function to control how long the LED stays on for.

## Notes

1. Optionally modify color values in wled_api.py for RGBW strips to reduce power consumption and prolong it's life.
