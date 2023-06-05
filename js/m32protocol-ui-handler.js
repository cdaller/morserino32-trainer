'use strict'

let log = require("loglevel");


class M32CommandUIHandler {

    constructor(language = 'en', m32translations) {
        this.m32ProtocolEnabled = false;
        this.language = language;
        this.m32translations = m32translations;
    }

    // callback method for a full json object received
    handleM32Object(jsonObject) {
        log.debug('uiHandler.handleM32Object', jsonObject);
        if (!this.m32ProtocolEnabled) {
            this.m32ProtocolEnabled = true;
            this.enableAllM32ProtocolElements();
            document.dispatchEvent(new Event("m32Connected"));
        }
        const keys = Object.keys(jsonObject);
        if (keys && keys.length > 0) {
            const key = keys[0];
            const value = jsonObject[key];
            switch(key) {
                case 'menu':
                    this.receivedM32Menu(value['content']);
                    break;
                case 'control':
                    var controlKey = value['name'];
                    var controlValue = value['value'];
                    if (controlKey === 'speed') {
                        this.receivedM32Speed(controlValue);
                    }
                    break;            
                case 'kochlesson':
                    this.receivedM32KochLesson(value);
                    break;                        
                }
        } else {
            console.debug('cannot handle json', jsonObject);
        }
    }

    setLanguage(language) {
        this.language = language;
    }
    
    enableAllM32ProtocolElements() {
        log.debug('enable all m32 protocol elements');
        document.querySelectorAll('.m32-protocol').forEach(element => element.classList.add('m32-protocol-enabled'))
    }

    receivedM32Speed(speed) {
        let speedElement = document.getElementById("m32Speed");
        if (speedElement) {
            speedElement.textContent = speed + ' wpm';
        }
    }

    receivedM32Menu(menu) {
        var menues = menu.split('/');
        var textToDisplay = menues.map((menu) => this.m32translations.translateMenu(menu, this.language)).join('/');
        var menuElement = document.getElementById("m32Menu");
        if (menuElement) {
            menuElement.textContent = textToDisplay;
        }

        if (menu.startsWith('Koch Trainer/Select Lesson') && menues.length > 2) {
            var lesson = menues[2].split(' ');
            var kochLessonElement = document.getElementById("m32KochLesson");
            if (kochLessonElement) {
                var value = lesson[0];
                var currentCharacter = lesson[2];
                kochLessonElement.textContent = "Koch " + value + " '" + currentCharacter + "'";
            }
        }

        // FIXME: does not work - use event to publish this?
        // if (menues.length > 1 && menues[1] === 'Echo Trainer') {
        //     openTabForMode(MODE_ECHO_TRAINER);
        // }
    }

    receivedM32KochLesson(kochlesson) {
        var value = kochlesson['value'];
        var characters = kochlesson['characters'];
        var currentCharacter  = characters[value - 1];
        var kochLessonElement = document.getElementById("m32KochLesson");
        if (kochLessonElement) {
            kochLessonElement.textContent = "Koch " + value + " '" + currentCharacter + "'";
        }
    }

}

module.exports = { M32CommandUIHandler } 

