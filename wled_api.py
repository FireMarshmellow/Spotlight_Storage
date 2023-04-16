import requests
import time

url_list = ['http://192.168.0.179/json/state', 'http://192.168.0.42/json/state']

def send_request(target_url, start_num, stop_num, color):
    state = {"seg": [{"id": 0, "start": start_num, "stop": stop_num, "col": [color]}]}
    response = requests.post(target_url, json=state)

def lights(position):
    position = tuple(map(int, position.split(',')))
    start_num = int(position[1]) - 1
    print(start_num)
    
    send_request(url_list[position[0] - 1], start_num, int(position[1]), [255, 255, 255])

    time.sleep(5)

    send_request(url_list[position[0] - 1], 0, 60, [0, 255, 0])