# Morserino32 CW Trainer

A browser reads the cw trainer characters from the Morserino device via serial input and compares them to the characters entered by the user.

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
browserify js/m32main.js -o js/bundle.js

# or during development use watchify to compile on changes:
watchify js/m32main.js -o js/bundle.js
```

## OS Specific Specialities

### Windows (and Linux): DTR/RTS Signal Handling on Connect

On **macOS**, the CP210x USB-serial driver keeps the DTR and RTS lines stable when the serial port is opened, so the Morserino connects cleanly without any reset.

On **Windows** (and potentially Linux), the CP210x/CH340 driver asserts both DTR and RTS when `port.open()` is called. The Morserino's ESP32 has an auto-reset circuit wired to these lines: asserting DTR pulses the EN (reset) pin, causing the device to **reboot on every connect**.

To prevent this, the app immediately calls `port.setSignals({ dataTerminalReady: false, requestToSend: false })` after opening the port on non-Mac systems. This de-asserts both lines before the reset circuit can latch. As a side effect, the Morserino still reboots once on the very first connect (the DTR transition during `port.open()` is unavoidable), but subsequent connects are clean.

Because of this initial reboot, the app detects the ESP32 boot messages on the serial stream (lines starting with `rst:0x`, `ets `, `load:0x`, etc.) and:
- **Suppresses** them so they don't appear as CW text in the UI.
- **Re-initializes the M32 protocol** automatically after a 5-second settle delay (the status bar shows "Reboot detected, reconnecting..." in yellow during this time).

## Feature Requests

### Serial Protocol with morserino

* Allow full remote control from the web application
* Speech output for visually impaired users.
* see [serialtest.html](serialtest.html) for details or better test at [serialtest at tegmento](//tegmento.org/serialtest.html)

```bash
browserify js/serialtest.js   -o js/bundle-serialtest.js
```

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

### Feedback from blind user Marcus

* menu "info
  * nice: get device - voice ouput firmware and battery
* important:
  * configuration
  * if "quick start" on -> to remember current state after switch on
    * forget to speak
* adaptive random speed
  * concurrent voice output and the morse character
* if morserino is in scroll mode, it should also speak the characters (m32 feature)
* create snapshots for cw school - DONE
* random texts
  * "(z)" - random words of text
  * speak one sentence after the other

* voice output for "upload done" - does not work because upload is async

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

### Morserino Protocol

* Create/save snapshots of CW school Graz
* Select Wifi  (/)
* CW Generator
  * Voice output for results. How? e.g. Bravo missing, X-Ray wrong, ...

TODO:
* cw keyer: button einfügen + radiergummi für letzte gruppe löschen
* Voice comparison stopps after 16 seconds (cancelled by whom?)


