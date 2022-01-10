# Morserino32 CW Trainer

A browser reads the cw trainer characters from the morserino device via serial input and compares them to the characters entered by the user.

Just go to the [Live Demo Page](https://cdaller.github.io/morserino32-trainer/index.html)!

You might need to configure the morserino to send characters via serial line first! (see below how to do so)

* Connect usb cable from Morserino32 to your PC/Mac/Linux machine
* Open index.html in browser
* In the web page use "Connect" button, select serial port of Morserino32
* Start CW-Generator
* Type your decoded CW into the second field.
* Hide received/compared text if you want.

The results can also be saved into the local storage of the browser to show the progress you make and to have some text to encode in cw.

Supported browsers:
* Chrome
* Edge
* Opera

For details of browser support see [here](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/serial).

## Configure morserino32 to send Decoder to serial output

By default, the morserino does not send data to the serial connection.

* Double click black button
* Find "Serial Output"
* Set to "Decoder", "Keyer+Decoder", or to "Everything"

## Build

```bash
# compile script to bundle.js
browserify morserino32-trainer.js -o bundle.js

# or during development use watchify to compile on changes:
watchify morserino32-trainer.js -o bundle.js
```