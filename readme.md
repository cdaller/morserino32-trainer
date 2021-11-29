# Morserino32 CW Trainer

A browser reads the cw trainer characters via serial input and compares them to
the characters entered by the user.

## Build

```bash
# compile script to bundle.js
browserify morserino32-trainer.js -o bundle.js

# or during development use watchify to compile on changes:
watchify morserino32-trainer.js -o bundle.js
```

## Run

Configure morserino32 to send Decoder to serial output:
* Double click on black button
* Find "Serial Output"
* Set to "Decoder", "Keyer+Decoder", or to "Everything"

* Connect usb cable from Morserino32 to your PC/Mac/Linux machine
* Open morserino32-trainer.html in browser
* In the web page use "Connect" button, select serial port of Morserino32
* Start CW-Generator
* Type your decoded CW into the second field.
* Hide received/compared text if you want.