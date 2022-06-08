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

### ToDo

QSO: 
* remove callsign with space (/)
* <bk> als endezeichen (/)
* or weg (/)
* verabschiedung: qru/qrt -> antwort auch qru
  * tu e e 
    * e e
  * wenn gb -> dann nix kn, sondern sk e e
    * und kein xx de yy, nur mehr e e!
* gm <call> from <qth>
* rufzeichen (/)
  * echte präfixe + 2/3/4 random, letzten 2 keine zahlen (/)
* wx: raining: min -2c (/)
* wx (is) sunny
* you have to send correct xxx de yyy first!
* wx (/)
* rig
* wenn nich verstehe, dann schicke ich
  * ur name ?

### callsigns

* 3Adw
* 5Adww
* 9Adwww
* Dwdww
* Dwdwww
* Ddwww
* E2dwww
* EAdwww
* EWdwww
* Fdwww
* Gdwww
* I1dwww
* IKdwww
* INdwww
* IZdwww
* JAdwww
* JHdwww
* JMdwww
* Kdw
* Kdwww
* Kwdww
* Kwdwww
* LYdww
* Ndw
* Ndwww
* Nwdww
* Nwdwww
* OEdwww
* OKdwww
* ONdww
* OZdwww
* PAdwww
* Rdww
* Rdwww
* RVdww
* SPdwww
* SQdwww
* SVdwww
* Uwdwww
* Vwdww
* Vdwww
* WAdwww
* Wdw
* Wdwww
* Wwdww
* Xwdwww
* YBdww
* YDdwww