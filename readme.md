# Morserino32 CW Trainer

A browser reads the cw trainer characters from the morserino device via serial input and compares them to the characters entered by the user.

Just go to the [Live Demo Page](https://tegmento.org)!

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
* Set to "Everything" - you might to do this for every stored snapshot profile you want to use!

## Build

```bash
# compile script to bundle.js
browserify morserino32-trainer.js -o bundle.js

# or during development use watchify to compile on changes:
watchify morserino32-trainer.js -o bundle.js
```

## Feature Requests

### Serial Protocol with morserino

* Allow full remote control from the web application
* Speech output for visually impaired users.
* see [serialtest.html](serialtest.html) for details or better test at [serialtest at tegmento](//tegmento.org/serialtest.html)

### Play Texts

* Play full QSO examples
  * with random callsigns/QTH/etc.
* Play other texts
  * german
  * english
  * upload your own texts
    * store them in local session so they are remembered
* Modes
  * User needs to type word correctly or repeat
  * just play


### QSO Bot

* remove callsign with space (/)
* <bk> as end (/)
* real callsigns (/)
* wx (/)
  * wx: raining: min -2c (/)
  * wx (is) sunny
* good bye: QRU/QRT -> answer also with QRU
  * tu e e 
    * e e
  * if gb -> then no "kn", but "sk e e"
    * and do nto send "xx de yy", but only "e e"!
* gm <call> from <qth>
* you have to send correct xxx de yyy first!
* add rig description
* if I do not understand, send
  * ur name ?
* "I am lazy"
  * let bot start QSO
  * let bot continue QSO