# ToDo's – MIMOSA

## My current setup:
- 16 led panels with 36 pixels (576 pixels on the rotating tower)
    - I found it difficult to see the led’s when the storage boxes are filled to the top and the boxes can divide into three smaller compartments and that blocks the led’s too, that’s the reason for the led panels 
- MIMOSA V4.0 with Docker on a server-pc
- WLED on ESP32-C3 ultra tiny
- Changed the "LED off" button to set the led color to black, to stop the WLED's going back to the before set mode. This simply off's the led's. But the partymode and on fuctions are still there if somebody want's them.


## Good:

- The MIMOSA itself 😉
- Adding pictures is as easy as it could be. Link and file-upload is perfect, what could be a nice thing, when the pictures from the link-adding feature would download the pictures into the database.
- Settings Page
- Adding parts page
- The website itself looks appealing with the modern design.
- Duplication of existing parts.
- Dark mode is nice
- Search bar and tag search


## Not so good:

- Button symbol’s (locate, add, remove, edit) don’t always load, so it is difficult to know what button what is
- The slider for “led show time” is cool, but this value does not need to be changed that often. My point is: If that was a value box where you can type the number in seconds or minutes, it would be better. When using the smartphone, I found myself accidently sliding this when on the MIMOSA settings page.
- The brightness slider is fine, but as said above, this value does not change that often.
- Sometimes the locate-button does not do anything, like it is bricked and after some while it works, or if not after a hard reboot it works. But I do not know what causes it, could also be my network (not sure).
- There should be a message box or something asking for stock changes, to reduce the chance of accidently removing or adding stock of parts.

## Wished feature’s:

- The Cube I’ve built has four sides, it is possible to use the serpentine, but this is more, or less ideal (576 entries are a lot, in one list). I don’t know if this is a bit difficult to program, but maybe not. So, a setting for more serpentine’s that could start with 1 – X and then start a new serpentine next to it from 1 – X.
- Language file: I currently run my MIMOSA 4.0 and translated the html-file to german.  But some things can’t be translated, because then the lines and numbers of the serpentine get mixed up and is not correct anymore. So, a folder to put translations files for all text in the html-file that than merges to it, and shows everything in the languages the user has set up.
- QR-Code to scan with a Barcode-Scanner, to add or remove Stock (would be nice to have but not required)
- Settable price in part, that then shows not only the price for that specific part and its stock level, but also the amount of money the organizer currently holds.
- Showing already used pixels in serpentine: if you have free storage containers (especially in such a large environment like mine) you can easily lose track of them. If all used boxes/pixels are shown with the blue-dot or other colored dot's, it is easy to find and select free boxes.
- On my pcb layout I did not pay attention to the serpentine. So it would be nice to be able to change the serpentine and number generating not only horizontal and vertical, but also vertical beginning always on the left side.
- The copy option for a part does copy everything except the pictures. That would be nice to have. E.g. I added rasperrypi’s and just needed to split them in different storage boxes and always needed to recreate the pictures.
- Setting option for pixel colors, to use the full potential of the ws2812 led.
- Settable stock value, if it falls below a set level it indicates low stock with a red color and the user sees that when he pushes the locate button.

### My current workflow to adding parts to my storage tower is as follows:
- Access the server with my smartphone over its ip address.
- Start to add a part with the “Add Part” button or copy existing ones.
- Take a picture with the “add from file” button. On the Smartphone it asks if I want to use a “file from folder” or use the “camera”. Usually I just take a picture with the camera in the 1:1 ratio setting, to account for bad scaling/cropping/stretching.
- Then select what pixels to use.
- Hit the “add button” and done.