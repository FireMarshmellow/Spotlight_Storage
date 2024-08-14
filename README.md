# Spotlight Storage - The easy way to find your parts
![MIMOSA](https://github.com/user-attachments/assets/79bdf901-aec4-45b8-97d5-1e768b65df19)



## Spotlight Storage is from [Mellow Labs](https://github.com/FireMarshmellow/M.I.M.O.S.A)
On this repo you get a ready to install on windows docker container for the MIMOSA storage system. 
Setup time is less then 10 minutes even for beginner users.

With this you can use any WS2812 or other led's that run [WLED](https://kno.wled.ge/) 

## Videos
The videos are not up to date and the content in them do not match the current Spotlight Storage (old: M.I.M.O.S.A) version. But they are a good starting point to see it working and how to setup the esp and ws2812 leds.
##
[Main video](https://youtu.be/7C4i-2IqSS4)

[Step by step video](https://youtu.be/QOd1apc0Lpo)

## Hardware i used

[ESP32-C3](https://www.amazon.de/Waveshare-Development-ESP32-S3FH4R2-Castellated-Applications/dp/B0CHYHGYRH/ref=sr_1_3?__mk_de_DE=%C3%85M%C3%85%C5%BD%C3%95%C3%91&crid=3HT19BBR039GT&dib=eyJ2IjoiMSJ9.yV2RTYatG7l54mT4TmFs41gUutfrpBPcC-gNcJjW5yrX18ynT5ARl4Q363-yduVYFbXaiIDiG0O_OKJwcpUODORDJywTWMIIUHu_6GFNiXwqHgM4ZCQqe2FDi0h_BT4InKffRyJEq28FkhdjnfdLetRaF4Uk4hTL-Brc5Qjb8kmWcPcPNoRb4uG-FDWQU1Nj3aow_Y54AF_bpCq7385eE0SDKwWei3MRFSzsHGJvdIg.XqcFwKVecXx0t8aSXZ8k-3qn2ApPvE-6qe_Vg8m5CO4&dib_tag=se&keywords=esp32-s3+mini&qid=1723273994&sprefix=esp32-s3+mini%2Caps%2C92&sr=8-3)

[LEDs](https://www.amazon.de/BTF-LIGHTING-Individuell-adressierbar-Vollfarbiger-DIY-Projekte/dp/B088BPGMXB/ref=sr_1_1_sspa?dib=eyJ2IjoiMSJ9.PnDQdOUPg0UohlqZWxHQ8xYtwlm0N3cqEYbM29-REkcFFp9UB1Dpmwter90G4I3xpW5k3PxKchdsn5po5skd0NmraUfUk1Z0m6hhIzBw8DHe135MoTHnt8yXO20BuzfVKimMGoHR81c-6jKIZwOG8GXNTYY077dAJ_CyzHpVEKXWE1WTF9WiD2xEmnyKsdQoKSUqKqMxmGJsM9DwHy0iucC5qQfnJrEKCsChlFBLzvCyiBcP6sdf3W7pgMddlRcIAkP-XPp3WV2RBak6UxZTPv49qdQzKoJFiCnQfBfhBgY.qLxtFwyIAQ7sA-UBBsXBx2MR-kBGaU0054Z07bD3TGg&dib_tag=se&keywords=Ws2812b+Led+Strip&qid=1723274094&sr=8-1-spons&sp_csd=d2lkZ2V0TmFtZT1zcF9hdGY&psc=1)

## Features
- inventory management
- search
- locate items
- sort items in groups
- set up multible storage locations in different rooms, only wifi is needed.

## Install WLED on ESP devices
1. Go to WLED [installation page ](https://install.wled.me/) and select the latest release and intall it on the esp device.
2. Put in your wifi data.
3. Go to the ip address of your esp, to `Config -> LED Preferences` and set up your led's like in the video.
4. Make note of the esp ip address, you will need it later to put into your MIMOSA settings.

## Installation of Spotlight Storage with `Installation.bat` file

1. Download this Repo as zip and extract it to the location you want to install MIMOSA on your pc. (you can put it anywhere you want e.g. Downloads,Documents,Desktop,C it doesn's matter)
2. Install and start the Docker Desktop https://www.docker.com/products/docker-desktop/
3. Docker Desktop must be startet at least once before, to set it up for the next step.
4. In the location where you have put the  MIMOSA folder, open that folder, then doubble click on the file `install.bat` and let the magic happen.
5. Now if everything is correct, it will start a terminal, open Docker Desktop when it is not allready running, build the Spotlight Storage V4-Container and start it.
7. The terminal closes after 5 second automatically
8. That's it, go to `localhost:5000` in any browser, you can now enjoy the easy life with Spotlight Storage.

- To get access to Spotlight Storage over other browsers in your network e.g. with your smartphone you need to find the ip address of your computer, mine is for example 192.168.1.20 and behind the ip adress you need to put in the port 5000 and this is what you put into the browser `http://yourcomputerip:5000`

- Remove or turn off Spotlight Storage System with the `uninstall.bat`, no data will be lost. It just turns off docker container and removes it. If you hit `install.bat` after the `uninstall.bat` it will turn on docker container, build it and you can reach the same page and data as before.

## dependencies:

- python 3.6
