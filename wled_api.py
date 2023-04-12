import requests

# Replace this with your WLED IP address
wled_ip = "192.168.0.179"

def light_on(position):
    start_num = int(position) -1
    print(start_num)
    params = {
    "seg": [ # Segment array
        {
        "id": 0, # Segment ID
        "start": start_num, # Start LED index (0-based)
        "stop": int(position), # Stop LED index (exclusive)
        "on": True, # Turn on segment
        "col": [ # Color array
            [255, 255, 255] # White color for primary color
        ]
        }
    ]
    }

    # Send the request to WLED JSON API
    response = requests.post(f"http://{wled_ip}/json/state", json=params)

    # Check the response status
    if response.status_code == 200:
        print("Success!")
    else:
        print("Error:", response.reason)    