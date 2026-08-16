'use strict'

let log = require("loglevel");

const CONTROL_PANEL_DEBOUNCE_MS = 150;

class M32CommandUIHandler {

    constructor(language = 'en', m32translations, m32CommunicationService) {
        this.m32ProtocolEnabled = false;
        this.language = language;
        this.m32translations = m32translations;
        this.m32CommunicationService = m32CommunicationService;
        this.controlPanels = {};

        this.setupControlPanel('speed', 'm32Speed', 'm32SpeedPanel', 'm32SpeedRange', 'm32SpeedRangeValue');
        this.setupControlPanel('volume', 'm32Volume', 'm32VolumePanel', 'm32VolumeRange', 'm32VolumeRangeValue');
        this.setupControlPanel('kochlesson', 'm32KochLesson', 'm32KochLessonPanel', 'm32KochLessonRange', 'm32KochLessonRangeValue', {
            charsElementId: 'm32KochLessonRangeChars',
            buildCommand: (value) => 'PUT kochlesson/' + value
        });

        document.addEventListener('click', this.closeAllControlPanels.bind(this));
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                this.closeAllControlPanels();
            }
        });
    }

    setupControlPanel(controlName, badgeId, panelId, rangeId, rangeValueId, options = {}) {
        let badge = document.getElementById(badgeId);
        let panel = document.getElementById(panelId);
        let range = document.getElementById(rangeId);
        let rangeValue = document.getElementById(rangeValueId);
        let charsElement = options.charsElementId ? document.getElementById(options.charsElementId) : null;
        if (!badge || !panel || !range || !rangeValue) {
            return;
        }

        badge.addEventListener('click', (event) => {
            event.stopPropagation();
            let isOpen = panel.classList.contains('show');
            this.closeAllControlPanels();
            if (!isOpen) {
                panel.classList.add('show');
            }
        });
        panel.addEventListener('click', (event) => event.stopPropagation());

        let buildCommand = options.buildCommand || (value => 'PUT control/' + controlName + '/' + value);

        let debounceTimer = null;
        range.addEventListener('input', () => {
            rangeValue.textContent = range.value;
            this.updateControlPanelChars(controlName, range.value);
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                this.m32CommunicationService.sendM32Command(buildCommand(range.value), false);
            }, CONTROL_PANEL_DEBOUNCE_MS);
        });

        this.controlPanels[controlName] = { range, rangeValue, charsElement, characters: [] };
    }

    closeAllControlPanels() {
        document.querySelectorAll('.dropdown-menu.show').forEach(element => element.classList.remove('show'));
    }

    updateControlPanel(controlName, value, minimum, maximum, characters) {
        let controlPanel = this.controlPanels[controlName];
        if (!controlPanel) {
            return;
        }
        if (minimum !== undefined) {
            controlPanel.range.min = minimum;
        }
        if (maximum !== undefined) {
            controlPanel.range.max = maximum;
        }
        if (characters !== undefined) {
            controlPanel.characters = characters;
        }
        controlPanel.range.value = value;
        controlPanel.rangeValue.textContent = value;
        this.updateControlPanelChars(controlName, value);
    }

    updateControlPanelChars(controlName, lessonNumber) {
        let controlPanel = this.controlPanels[controlName];
        if (!controlPanel || !controlPanel.charsElement) {
            return;
        }
        controlPanel.charsElement.textContent = controlPanel.characters.slice(0, lessonNumber).join(' ');
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
                    var controlMinimum = value['minimum'];
                    var controlMaximum = value['maximum'];
                    if (controlKey === 'speed') {
                        this.receivedM32Speed(controlValue, controlMinimum, controlMaximum);
                    } else if (controlKey === 'volume') {
                        this.receivedM32Volume(controlValue, controlMinimum, controlMaximum);
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

    receivedM32Speed(speed, minimum, maximum) {
        let speedElement = document.getElementById("m32Speed");
        if (speedElement) {
            speedElement.textContent = speed + ' wpm';
        }
        this.updateControlPanel('speed', speed, minimum, maximum);
    }

    receivedM32Volume(volume, minimum, maximum) {
        let volumeElement = document.getElementById("m32Volume");
        if (volumeElement) {
            volumeElement.textContent = 'Vol: ' + volume;
        }
        this.updateControlPanel('volume', volume, minimum, maximum);
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
        this.updateControlPanel('kochlesson', value, kochlesson['minimum'], kochlesson['maximum'], characters);
    }

}

module.exports = { M32CommandUIHandler } 

