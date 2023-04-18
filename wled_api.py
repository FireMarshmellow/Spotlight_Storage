import requests
import time

ip_list = ['192.168.0.179', '192.168.0.42'] # Add your WLED IP addres/s here.

def send_request(target_ip, start_num, stop_num, color):
    url = f"http://{target_ip}/json/state" # construct URL using the target IP address
    state = {"seg": [{"id": 0, "start": start_num, "stop": stop_num, "col": [color]}]}
    response = requests.post(url, json=state)

def lights(position):
    position = tuple(map(int, position.split(',')))
    start_num = int(position[1]) - 1
    print(start_num)

    send_request(ip_list[position[0] - 1], start_num, int(position[1]), [255, 255, 255])

    time.sleep(5) # Change how long the LED stays on for.

    send_request(ip_list[position[0] - 1], 0, 60, [0, 255, 0])
