(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
'use strict';

let log = require("loglevel");

var events = require('events');

var { M32ProtocolHandler } = require("./m32protocol");
var { M32CommandConfigHandler } = require('./m32protocol-config-handler');
var { M32CommandSpeechHandler } = require('./m32protocol-speech-handler');
var { M32State, M32CommandStateHandler } = require('./m32protocol-state-handler')
var { M32CommandUIHandler} = require('./m32protocol-ui-handler');

const EVENT_M32_CONNECTED = "m32-connected";
const EVENT_M32_DISCONNECTED = "m32-disconnected";
const EVENT_M32_CONNECTION_ERROR = "m32-connection-error";
const EVENT_M32_TEXT_RECEIVED = "m32-text-received";

class M32CommunicationService {

    constructor(autoInitM32Protocol = true, sendCommandsAsText = false) {
        //Define outputstream, inputstream and port so they can be used throughout the sketch
        this.outputStream;
        this.inputStream;
        this.port = null;
        this.inputDone;
        this.outputDone;

        this.autoInitM32Protocol = autoInitM32Protocol;
        this.sendCommandsAsText = sendCommandsAsText;

        this.timer = ms => new Promise(res => setTimeout(res, ms))

        this.eventEmitter = new events.EventEmitter();

        // speech & m3 protocol handler
        var m32Language = 'en';
        this.m32State = new M32State();
        this.speechSynthesisHandler = new M32CommandSpeechHandler(m32Language);
        this.commandUIHandler = new M32CommandUIHandler(m32Language);
        const configHandler = new M32CommandConfigHandler(document.getElementById("m32-config"));
        this.m32Protocolhandler = new M32ProtocolHandler([
            new M32CommandStateHandler(this.m32State), 
            this.commandUIHandler, 
            this.speechSynthesisHandler,
            configHandler]);
    }

    addEventListener(eventType, callback) {
        this.eventEmitter.addListener(eventType, callback);
        //log.debug("number of event listeners",eventType, this.eventEmitter.listenerCount(eventType));
    }

    isConnected() {
        return this.port !== null;
    }

    enableVoiceOutput(enabled) {
        log.debug("speech synthesis, enable voice output", enabled);
        this.speechSynthesisHandler.enabled = enabled;
    }

    setLanguage(language) {
        this.speechSynthesisHandler.language = language;
        this.commandUIHandler.language = language;
    }

// navigator.serial.addEventListener('connect', e => {
//     console.log('connect event triggered')
//     statusBar.innerText = `Connected to ${e.port}`;
//     statusBar.className = 'badge bg-success';
//     connectButton.innerText = 'Disconnect';
// });

// navigator.serial.addEventListener('disconnect', e => {
//     console.log('disconnect event triggered')
//     statusBar.innerText = `Disconnected`;
//     statusBar.className = 'badge bg-danger';
//     connectButton.innerText = 'Connect';
// });

//Connect to Morserino
    async connect() {
        log.debug("connecting to morserino");

        const baudRate = 115200;

        //Optional filter to only see relevant boards
        const filter = {
            // morserino32
            // Product ID: 0xea60
            // Vendor ID: 0x10c4  (Silicon Laboratories, Inc.)
            usbVendorId: 0x10c4
        };

        //Try to connect to the Serial port
        try {
            this.port = await navigator.serial.requestPort({ filters: [filter] });
            // Continue connecting to |port|.

            // - Wait for the port to open.
            await this.port.open({ baudRate: baudRate });

            this.eventEmitter.emit(EVENT_M32_CONNECTED);

            // eslint-disable-next-line no-undef
            let decoder = new TextDecoderStream();
            this.inputDone = this.port.readable.pipeTo(decoder.writable);
            this.inputStream = decoder.readable;

            // eslint-disable-next-line no-undef
            const encoder = new TextEncoderStream();
            this.outputDone = encoder.readable.pipeTo(this.port.writable);
            this.outputStream = encoder.writable;

            this.reader = this.inputStream.getReader();

            this.readLoop();

            if (this.autoInitM32Protocol) {
                this.initM32Protocol();
            }

        } catch (e) {
            let msg = e;

            //If the pipeTo error appears; clarify the problem by giving suggestions.
            if (e == 'TypeError: Cannot read property "pipeTo" of undefined') {
                msg += '\n Use Google Chrome and enable-experimental-web-platform-features'
            }
            this.eventEmitter.emit("m32-connected", msg);

        }
    }

    //Write to the Serial port
    async writeToStream(line) {
        log.debug('send command', line);
        const writer = this.outputStream.getWriter();
        writer.write(line);
        writer.write('\n');
        writer.releaseLock();
    }

    //Disconnect from the Serial port
    async disconnect() {

        if (this.reader) {
            await this.reader.cancel();
            await this.inputDone.catch(() => { });
            this.reader = null;
            this.inputDone = null;
        }
        if (this.outputStream) {
            await this.outputStream.getWriter().close();
            await this.outputDone;
            this.outputStream = null;
            this.outputDone = null;
        }
        //Close the port.
        if (this.port) {
            await this.port.close();
        }
        this.port = null;
        this.eventEmitter.emit(EVENT_M32_DISCONNECTED);
    }

    //Read the incoming data
    async readLoop() {

        // eslint-disable-next-line no-constant-condition
        while (true) {
            const { value, done } = await this.reader.read();
            if (done === true) {
                break;
            }

            if (this.m32Protocolhandler.handleInput(value)) {
                if (!this.sendCommandsAsText) {   
                    continue;
                }
            }

            log.debug("other values received", value);

            this.eventEmitter.emit(EVENT_M32_TEXT_RECEIVED, value);

            // // when recieved something add it to the textarea
            // if (mode == MODE_CW_GENERATOR) {
            //     receiveText.value += value;
            //     //Scroll to the bottom of the text field
            //     receiveText.scrollTop = receiveText.scrollHeight;
            //     compareTexts();
            //     applyAutoHide();    
            // } else if (mode == MODE_ECHO_TRAINER) {
            //     receiveTextEchoTrainer.value += value;
            //     //Scroll to the bottom of the text field
            //     receiveTextEchoTrainer.scrollTop = receiveTextEchoTrainer.scrollHeight;
            //     detectAbbreviation();
            // } else if (mode == MODE_QSO_TRAINER) {
            //     receiveTextQsoTrainer.value += value;
            //     //Scroll to the bottom of the text field
            //     receiveTextQsoTrainer.scrollTop = receiveTextQsoTrainer.scrollHeight;
            //     detectQso();
            // }
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    initM32Protocol() {
        //sendM32Command('PUT device/protocol/off', false); // force device info on next PUT
        this.sendM32Command('PUT device/protocol/on');
        this.sleep(1000);
        //sendM32Command('GET device');
        this.sendM32Command('GET control/speed');
        //sendM32Command('GET control/volume');
        this.sendM32Command('GET menu');
    }

    async sendM32Command(command, waitForResponse = true) {
        console.log('sending command, wait', waitForResponse);
        while(this.m32Protocolhandler.waitForResponse) {
            console.log('waiting for response');
            await this.timer(50);
        }
        this.writeToStream(command);
        if (waitForResponse) {
            this.m32Protocolhandler.commandSent();
        }
    }

    connected() {
        log.debug("Connected Test");
    }
}

module.exports = { M32CommunicationService, EVENT_M32_CONNECTED, EVENT_M32_DISCONNECTED, 
    EVENT_M32_CONNECTION_ERROR, EVENT_M32_TEXT_RECEIVED }

},{"./m32protocol":9,"./m32protocol-config-handler":4,"./m32protocol-speech-handler":6,"./m32protocol-state-handler":7,"./m32protocol-ui-handler":8,"events":12,"loglevel":11}],2:[function(require,module,exports){
'use strict';

const log  = require ('loglevel');
const { EVENT_M32_CONNECTED, EVENT_M32_DISCONNECTED, EVENT_M32_CONNECT_ERROR } = require('./m32-communication-service');
const { EVENT_SETTINGS_CHANGED } = require('./m32-storage');

class M32ConnectUI {
    constructor(m32CommunicationService, m32Storage) {
        this.m32Storage = m32Storage;
        this.m32Storage.addEventListener(EVENT_SETTINGS_CHANGED, this.settingsChanged.bind(this));

        this.connectButton = document.getElementById("connectButton");
        this.voiceOutputCheckbox = document.getElementById("voiceOutputCheckbox");
        this.statusBar = document.getElementById("statusBar");
        this.voiceOutputEnabled = true;
        this.m32CommunicationService = m32CommunicationService;
        this.m32CommunicationService.addEventListener(EVENT_M32_CONNECTED, this.connected);
        this.m32CommunicationService.addEventListener(EVENT_M32_DISCONNECTED, this.disconnected.bind(this));
        this.m32CommunicationService.addEventListener(EVENT_M32_CONNECT_ERROR, this.connectError.bind(this));

        this.connectButton.addEventListener('click', this.clickConnect.bind(this), false);
        if (this.voiceOutputCheckbox) {
            this.voiceOutputCheckbox.addEventListener('change', this.clickVoiceOutputReceived.bind(this));
        }

        // check if serial communication is available at all:
        let serialCommunicationavailable = navigator.serial !== undefined;        
        if (!serialCommunicationavailable) {
            this.disableSerialCommunication();
        }  
    }

    //When the connectButton is pressed
    async clickConnect() {
        if (this.m32CommunicationService.isConnected()) {
            log.debug("disconnecting")
            //if already connected, disconnect
            this.m32CommunicationService.disconnect();

        } else {
            log.debug("connecting")
            //otherwise connect
            await this.m32CommunicationService.connect();
        }
    }

    disableSerialCommunication() {
        this.connectButton.disabled = true;
        document.getElementById('serialCommunicationDisabledInfo').style.display = 'block';
    }


    connected = () => {
        log.debug("Connect-UI, connected");
        this.statusBar.innerText = `Connected`;
        this.statusBar.className = 'badge bg-success';
        this.connectButton.innerText = 'Disconnect';
    }

    disconnected() {
        this.statusBar.innerText = `Disconnected`;
        this.statusBar.className = 'badge bg-danger';
        this.connectButton.innerText = 'Connect';
    }

    connectError(message) {
        this.connectButton.innerText = 'Connect'
        this.statusBar.innerText = message;
    }

    clickVoiceOutputReceived() {
        // saveSettings
        log.debug("voice output changed", this.m32Storage.settings);
        this.voiceOutputEnabled = this.voiceOutputCheckbox.checked;
        this.m32Storage.settings.voiceOutputEnabled = this.voiceOutputEnabled;
        this.m32CommunicationService.enableVoiceOutput(this.voiceOutputEnabled);
        this.m32Storage.saveSettings();
    }

    settingsChanged(settings) {
        log.debug("settings changed event", settings);
        this.voiceOutputEnabled = settings.voiceOutputEnabled;
        this.voiceOutputCheckbox.checked = this.voiceOutputEnabled;
        this.m32CommunicationService.enableVoiceOutput(this.voiceOutputEnabled);
    }
}

module.exports = { M32ConnectUI }

},{"./m32-communication-service":1,"./m32-storage":3,"loglevel":11}],3:[function(require,module,exports){
'use strict';

const log  = require ('loglevel');

var events = require('events');

const STORAGE_KEY = 'morserino-trainer';
const STORAGE_KEY_SETTINGS = 'morserino-trainer-settings';

const EVENT_SETTINGS_CHANGED = "settings-changed";


class M32Settings {
    constructor() {
        this.cwPlayerWpm = 15;
        this.cwPlayerEws = 0;
        this.cwPlayerEls = 2;
        this.qsoRptWords = false;
        this.voiceOutputEnabled = true;
    }

    loadFromStoredSettings(storedSettings) {
        if (storedSettings) {
    
            if ('cwPlayerWpm' in storedSettings) {
                this.cwPlayerWpm = storedSettings.cwPlayerWpm;
            }
            if ('cwPlayerEws' in storedSettings) {
                this.cwPlayerEws = storedSettings.cwPlayerEws;
            }
            if ('cwPlayerEls' in storedSettings) {
                this.cwPlayerEls = storedSettings.cwPlayerEls;
            }
            if ('qsoRptWords' in storedSettings) {
                this.qsoRptWords = storedSettings.qsoRptWords;
            }
            if ('voiceOutputEnabled' in storedSettings) {
                this.voiceOutputEnabled = storedSettings.voiceOutputEnabled;
            }
        }
    }
}

class M32Storage {

    constructor() {
        this.settings = new M32Settings();
        this.eventEmitter = new events.EventEmitter();
    }

    addEventListener(eventType, callback) {
        this.eventEmitter.addListener(eventType, callback);
    }

    loadSettings() {
        let storedSettings = JSON.parse(localStorage.getItem(STORAGE_KEY_SETTINGS));
        this.settings.loadFromStoredSettings(storedSettings);
        this.eventEmitter.emit(EVENT_SETTINGS_CHANGED, this.settings);
    
        // setCwPlayerSettings();
        // setCwSettingsInUIInput();
        // setCwSettingsInUILabels();
    }
    
    saveSettings() {
        log.debug("save settings", this.settings);
        localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(this.settings));
    }

    getSavedResults() {
        let savedResults = JSON.parse(localStorage.getItem(STORAGE_KEY));
        return savedResults;
    }
    
    saveResults(storedResults) {
        let storedResultsText = JSON.stringify(storedResults);
        localStorage.setItem(STORAGE_KEY, storedResultsText);
        log.debug('Saving result to localStorage', storedResultsText);
    }
}

module.exports = { M32Settings, M32Storage, EVENT_SETTINGS_CHANGED }

},{"events":12,"loglevel":11}],4:[function(require,module,exports){
'use strict';

// class represents the state of the morserino
class M32Config {
    constructor() {
        this.speedWpm = null;
    }
}

// handling configuration of the morserino
class M32CommandConfigHandler {

    constructor(configElement) {
        this.configElement = configElement;
    }
    
    // callback method for a full json object received
    handleM32Object(jsonObject) {
        console.log('configHandler.handleM32Object', jsonObject);
        const keys = Object.keys(jsonObject);
        if (keys && keys.length > 0) {
            const key = keys[0];
            const value = jsonObject[key];
            switch(key) {
                case 'configs':
                    if (this.configElement) {                            
                        console.log(value);
                        console.log(value.length);
                        let elements = [];
                        for (let index = 0; index < value.length; index++) {
                            let element = createSpanElement(value[index]['name'], null);
                            elements.push(element);
                        }
                        this.configElement.replaceChildren(...elements);
                    }
                    break;
            }
        } else {
            console.log('cannot handle json', jsonObject);
        }
    }
}

module.exports = { M32CommandConfigHandler, M32Config }


},{}],5:[function(require,module,exports){
'use strict';

const log  = require ('loglevel');

class M32Translations {

  constructor() {
    this.m32ProtocolFallbackLanguage = 'en';
    this.menuTranslations = this.getMenuTranslations();
    this.configTranslations = this.getConfigTranslations();
  }

  translateMenu(key, language) {
    return this.translate(key, language, this.menuTranslations);
  }

  translateConfig(key, language) {
    return this.translate(key, language, this.configTranslations);
  }

  translate(key, language, i18nMap) {
    log.debug("Translate key", key, "to language", language);
    var translationMap = i18nMap[key.trim().toLowerCase()];
    if (!translationMap) {
      return key;
    }
    var translation = translationMap[language];
    if (translation) {
      return translation;
    }
    if (language === this.m32ProtocolFallbackLanguage) {
      return key; // no fallback
    }
    // try fallback language
    translation = translationMap[this.m32ProtocolFallbackLanguage];
    if (translation) {
      return translation;
    }
    return key;
  }

  getMenuTranslations() {
      return {
        'koch trainer': {de: 'Koch Trainer'},
        // koch lessons
        '13 char .': {en: '13 char dot'},
        '21 char ,': {en: '21 char comma'},
        '24 char /': {en: '24 char slash'},
        '32 char ?': {en: '32 char questionmark'},
        '41 char -': {en: '41 char minus'},
        '51 char :': {en: '51 char colon'},
      'cw generator': {de: 'CW Generator'},
        'random': {de: 'Zufall'},
        'cw abbrevs': {en: 'CW Abbreviations', de: 'CW Abkürzungen'},
        'english words': {de: 'Englische Worte'},
        'mixed': {de: 'Gemischt'},
      'select lesson': {de: 'Auswahl Lektion'},
      'learn new chr': {en: 'Learn new Character', de: 'Lerne neue Buchstaben'},
      'echo trainer': {},
        'call signs': {de: 'Rufzeichen'},
        'file player': {de: 'Datei abspielen'},
    'tranceiver': {en: 'Transceiver', de: 'Transceiver'},
      'lora trx': {en: 'Lora Transceiver', de: 'Lora Transceiver'},
      'wifi trx': {en: 'WiFi Transceiver', de: 'WLAN Tranceiver'},
      'icw/ext trx': {en: 'iCW/External Tranceiver', de: 'iCW/Externer Tranceiver'},
    'cw decoder': {},
    'wifi functions': {de: 'WLAN Funktionen'},
      'check wifi': {de: 'WLAN Prüfen'},
      'upload file': {de: 'Datei hochladen'},
      'config wifi': {en: 'Configure Wifi', de: 'Konfiguriere WLAN'},
      'update firmw': {en: 'Update Firmware', de: 'Firmware aktualisieren'},
      'wifi select': {de: 'WLAN auswählen'},
      'disp mac addr': {en: 'Display Mac Address', de: 'Zeige Mac Adresse'},
    'go to sleep': {de: 'Geh Schlafen'},
    'cw keyer': {},
      'ext trx': {en: 'External Transceiver', de: 'Externer Tranceiver'},
    }
  }

  getConfigTranslations() {
    return {
      'paddle polar.': { en: 'Paddle Polarity' },
      'external pol.': { en: 'External Polarity' },
      'curtisb daht%': { en: 'Curtis B Mode dah Timing Percentage' },
      'curtisb ditt%': { en: 'Curtis B Mode dit Timing Percentage' },
      'autochar spc': { en: 'Auto Character Space' },
      'interword spc': { en: 'Inter word Space' },
      'interchar spc': { en: 'Inter character Space' },
      'length rnd gr': { en: 'Length Random Groups' },
      'length abbrev': { en: 'Length Abbreviations' },
      'max # of words': { en: 'Maximum Number of Words' },
      'cw gen displ': { en: 'CW Generator Display' },
      'each word 2x': { en: 'Each Word 2 times' },
      'confrm. tone': { en: 'Confirm Tone' },
      'key ext tx': { en: 'Key External Transmit' },
      'generator tx': { en: 'Generator Transmit' },
      'adaptv. speed': { en: 'Adaptive Speed' },
      'stop<next>rep': { en: 'Stop Next Repeat' },
      // values
      'custom chars': { en: 'Custom Characters' },
      'bc1: r e a': { en: 'BC1: r. e. a' },
    }
  }
}

module.exports = { M32Translations }
},{"loglevel":11}],6:[function(require,module,exports){
'use strict';

let log = require("loglevel");

const { M32Translations } = require('./m32protocol-i18n');

// all functions for speech synthesis

class M32CommandSpeechHandler {

    constructor(language = 'en') {
        this.speechSynth = window.speechSynthesis;
        this.language = language;
        this.voice = null;
        this.enabled = true;
        this.m32Translations = new M32Translations();
    }

    speak(text) {
        if (!this.enabled) {
            return;
        }
        console.log('speak', text);

        if (this.speechSynth.speaking) {
            log.debug("cancel previous speech synthesis");
            this.speechSynth.cancel();
        }

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.pitch = 1;
        utterance.rate = 1;
        utterance.voice = this.getVoice(this.language);
        this.speechSynth.speak(utterance);
    }

    getVoice(language) {
        if (this.voice != null) {
            return this.voice;
        }
        //console.log('getting voice for', language);
        var voices = this.speechSynth.getVoices();
        var voice;
        //voices.forEach(v => console.log(v));
        if (language === 'en') {
            voice = voices.find(voice => voice.voiceURI === 'Google UK English Male');
            if (!voice) {
                voice = voices.find(voice => voice.lang.startsWith(language));
            }
        } else if (language === 'de') {
            voice = voices.find(voice => voice.lang.startsWith(language) && voice.voiceURI.startsWith('Google'));
        } else {
            voice = voices.find(voice => voice.lang.startsWith(language));
        }
        //console.log('selected voice', voice);
        this.voice = voice;
        return voice;
    }

    setLanguage(language) {
        this.language = language;
    }

    // callback method for a full json object received
    handleM32Object(jsonObject) {
        log.debug('speech.handleM32Object', jsonObject);
        const keys = Object.keys(jsonObject);
        if (keys && keys.length > 0) {
            const key = keys[0];
            const value = jsonObject[key];
            switch(key) {
                case 'menu':
                    var menues = value['content'].split('/');
                    var textToSpeak = menues.map((menu) => this.m32Translations.translateMenu(menu, this.language)).join(' ');
                    this.speak(textToSpeak);
                    break;
                case 'control':
                    this.speak(value['name'] + ' ' + value['value']);
                    break;
                /*    
                case 'activate':
                    this.speak(value['state']);
                    break;
                */
                case 'message':
                    this.speak(value['content']);
                    break;
                case 'config':
                    // distinguish between navigation in configuration and manual request of config (returning mapped values):
                    if (!value['isMapped']) {
                        this.speak(this.m32Translations.translateConfig(value['name'], this.language) + ' is ' + this.m32Translations.translateConfig(value['displayed'], this.language));
                    }
                    break;
                case 'error':
                    this.speak(value['message']);
                    break;
                default:
                    console.log('unhandled json key', key);
            }
        } else {
            log.info('cannot handle json', jsonObject);
        }
    }    
}

module.exports = { M32CommandSpeechHandler }

},{"./m32protocol-i18n":5,"loglevel":11}],7:[function(require,module,exports){
'use strict';

// class represents the state of the morserino
class M32State {
    constructor() {
        this.speedWpm = null;
    }
}

// handling state changes on the morserino
class M32CommandStateHandler {

    constructor(m32State) {
        this.m32State = m32State;
    }

    // callback method for a full json object received
    handleM32Object(jsonObject) {
        console.log('uiState.handleM32Object', jsonObject);
        const keys = Object.keys(jsonObject);
        if (keys && keys.length > 0) {
            const key = keys[0];
            const value = jsonObject[key];
            switch(key) {
                case 'control':
                    var controlKey = value['name'];
                    var controlValue = value['value'];
                    if (controlKey === 'speed') {
                        this.receivedM32Speed(controlValue);
                    }
                    break;
                case 'device':
                    console.log('M32 Device:', value);
                    break;
                case 'error':
                    console.log('M32 Error:', value['message']);
                    break;
                //default:
                    //console.log('unhandled json key', key);
            }
        } else {
            console.log('cannot handle json', jsonObject);
        }
    }
    

    receivedM32Speed(speed) {
        this.m32State.speedWpm = Number(speed);
    }
}

module.exports = { M32State, M32CommandStateHandler }


},{}],8:[function(require,module,exports){
'use strict'

let log = require("loglevel");

const { M32Translations } = require('./m32protocol-i18n');


class M32CommandUIHandler {

    constructor(language = 'en') {
        this.m32ProtocolEnabled = false;
        this.language = language;
        this.m32translations = new M32Translations();
    }

    // callback method for a full json object received
    handleM32Object(jsonObject) {
        log.debug('uiHandler.handleM32Object', jsonObject);
        if (!this.m32ProtocolEnabled) {
            this.m32ProtocolEnabled = true;
            this.enableAllM32ProtocolElements();
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
                    break;            }
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
        // FIXME: does not work - use event to publish this?
        // if (menues.length > 1 && menues[1] === 'Echo Trainer') {
        //     openTabForMode(MODE_ECHO_TRAINER);
        // }
    }

}

module.exports = { M32CommandUIHandler } 


},{"./m32protocol-i18n":5,"loglevel":11}],9:[function(require,module,exports){
'use strict';

const MORSERINO_START = 'vvv<ka> ';
const MORSERINO_END = ' +';


class M32ProtocolHandler {
    constructor(callbackFunctions) {
        this.json = '';
        this.inJson = false;
        this.callbacks = callbackFunctions;
        this.m32ProtocolSupported = false;
        this.waitForResponse = false;
    }

    commandSent() {
        console.log("set waitForResponse");
        this.waitForResponse = true;
    }

    // returns true if input was handled by m32 protocol, false if plain text was detected
    handleInput(input) {
        if (!this.inJson && input.startsWith('{')) {
            this.inJson = true;
        } 
        if (this.inJson) {
            this.json = this.json + input;
            var braceCount = this.countChar(this.json, '{') - this.countChar(this.json, '}');
            //console.log('value', value);
            //console.log('json', "'" + this.json + "'");
            if (braceCount == 0) {
                // use all callbacks:
                this.callbacks.forEach(callback => {
                    callback.handleM32Object(JSON.parse(this.json));
                }); 
                this.json = '';
                this.inJson = false;
                this.m32ProtocolSupported = true;
                this.waitForResponse = false;
                this.useAllCallbacks = true; // for next object
            }
            return true;
        }
        return false;
    }
    
    countChar(text, char) {
        return text.split(char).length - 1;
    } 
}

module.exports = { M32ProtocolHandler, MORSERINO_START, MORSERINO_END }

},{}],10:[function(require,module,exports){
'use strict';

let log = require("loglevel");
log.setDefaultLevel(log.levels.DEBUG);
log.debug("serialtest start");

const { M32ConnectUI } = require('./m32-connect-ui');
const { M32CommunicationService, EVENT_M32_TEXT_RECEIVED } = require('./m32-communication-service');
const { M32Storage } = require('./m32-storage');


// init all UI after page is loaded:
document.addEventListener('DOMContentLoaded', function() {
    new SerialTest();
}, false);

class SerialTest {

    constructor() {
        let m32Storage = new M32Storage();
        this.m32CommunicationService = new M32CommunicationService(false, true);
        this.m32ConnectUI = new M32ConnectUI(this.m32CommunicationService, m32Storage);
        
        // define the elements
        this.receiveText = document.getElementById("receiveText");
        this.inputText = document.getElementById("inputText");
        let clearAllButton = document.getElementById("clearAllButton");
        let clearReceivedButton = document.getElementById("clearReceivedButton");
        let sendTextButton = document.getElementById("sendTextButton");

        this.m32CommunicationService.addEventListener(EVENT_M32_TEXT_RECEIVED, this.textReceived.bind(this));

        
        clearAllButton.addEventListener('click', this.clearTextFields.bind(this));
        clearReceivedButton.addEventListener('click', this.clearReceivedTextField.bind(this));
        sendTextButton.addEventListener('click', this.clickSend.bind(this));
    }

    clearTextFields() {
        this.inputText.value = '';
        this.clearReceivedTextField();
    }
    
    clearReceivedTextField() {
        this.receiveText.value = '';
    }
    
    //When the send button is pressed
    clickSend() {
        //send the message
        console.log('sending:', this.inputText.value)
        this.m32CommunicationService.sendM32Command(this.inputText.value);
        //and clear the input field, so it's clear it has been sent
        //sendText.value = '';
    }

    textReceived(value) {
        this.receiveText.value += value;
        //Scroll to the bottom of the text field
        this.receiveText.scrollTop = this.receiveText.scrollHeight;

    }
}
},{"./m32-communication-service":1,"./m32-connect-ui":2,"./m32-storage":3,"loglevel":11}],11:[function(require,module,exports){
/*
* loglevel - https://github.com/pimterry/loglevel
*
* Copyright (c) 2013 Tim Perry
* Licensed under the MIT license.
*/
(function (root, definition) {
    "use strict";
    if (typeof define === 'function' && define.amd) {
        define(definition);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = definition();
    } else {
        root.log = definition();
    }
}(this, function () {
    "use strict";

    // Slightly dubious tricks to cut down minimized file size
    var noop = function() {};
    var undefinedType = "undefined";
    var isIE = (typeof window !== undefinedType) && (typeof window.navigator !== undefinedType) && (
        /Trident\/|MSIE /.test(window.navigator.userAgent)
    );

    var logMethods = [
        "trace",
        "debug",
        "info",
        "warn",
        "error"
    ];

    // Cross-browser bind equivalent that works at least back to IE6
    function bindMethod(obj, methodName) {
        var method = obj[methodName];
        if (typeof method.bind === 'function') {
            return method.bind(obj);
        } else {
            try {
                return Function.prototype.bind.call(method, obj);
            } catch (e) {
                // Missing bind shim or IE8 + Modernizr, fallback to wrapping
                return function() {
                    return Function.prototype.apply.apply(method, [obj, arguments]);
                };
            }
        }
    }

    // Trace() doesn't print the message in IE, so for that case we need to wrap it
    function traceForIE() {
        if (console.log) {
            if (console.log.apply) {
                console.log.apply(console, arguments);
            } else {
                // In old IE, native console methods themselves don't have apply().
                Function.prototype.apply.apply(console.log, [console, arguments]);
            }
        }
        if (console.trace) console.trace();
    }

    // Build the best logging method possible for this env
    // Wherever possible we want to bind, not wrap, to preserve stack traces
    function realMethod(methodName) {
        if (methodName === 'debug') {
            methodName = 'log';
        }

        if (typeof console === undefinedType) {
            return false; // No method possible, for now - fixed later by enableLoggingWhenConsoleArrives
        } else if (methodName === 'trace' && isIE) {
            return traceForIE;
        } else if (console[methodName] !== undefined) {
            return bindMethod(console, methodName);
        } else if (console.log !== undefined) {
            return bindMethod(console, 'log');
        } else {
            return noop;
        }
    }

    // These private functions always need `this` to be set properly

    function replaceLoggingMethods(level, loggerName) {
        /*jshint validthis:true */
        for (var i = 0; i < logMethods.length; i++) {
            var methodName = logMethods[i];
            this[methodName] = (i < level) ?
                noop :
                this.methodFactory(methodName, level, loggerName);
        }

        // Define log.log as an alias for log.debug
        this.log = this.debug;
    }

    // In old IE versions, the console isn't present until you first open it.
    // We build realMethod() replacements here that regenerate logging methods
    function enableLoggingWhenConsoleArrives(methodName, level, loggerName) {
        return function () {
            if (typeof console !== undefinedType) {
                replaceLoggingMethods.call(this, level, loggerName);
                this[methodName].apply(this, arguments);
            }
        };
    }

    // By default, we use closely bound real methods wherever possible, and
    // otherwise we wait for a console to appear, and then try again.
    function defaultMethodFactory(methodName, level, loggerName) {
        /*jshint validthis:true */
        return realMethod(methodName) ||
               enableLoggingWhenConsoleArrives.apply(this, arguments);
    }

    function Logger(name, defaultLevel, factory) {
      var self = this;
      var currentLevel;
      defaultLevel = defaultLevel == null ? "WARN" : defaultLevel;

      var storageKey = "loglevel";
      if (typeof name === "string") {
        storageKey += ":" + name;
      } else if (typeof name === "symbol") {
        storageKey = undefined;
      }

      function persistLevelIfPossible(levelNum) {
          var levelName = (logMethods[levelNum] || 'silent').toUpperCase();

          if (typeof window === undefinedType || !storageKey) return;

          // Use localStorage if available
          try {
              window.localStorage[storageKey] = levelName;
              return;
          } catch (ignore) {}

          // Use session cookie as fallback
          try {
              window.document.cookie =
                encodeURIComponent(storageKey) + "=" + levelName + ";";
          } catch (ignore) {}
      }

      function getPersistedLevel() {
          var storedLevel;

          if (typeof window === undefinedType || !storageKey) return;

          try {
              storedLevel = window.localStorage[storageKey];
          } catch (ignore) {}

          // Fallback to cookies if local storage gives us nothing
          if (typeof storedLevel === undefinedType) {
              try {
                  var cookie = window.document.cookie;
                  var location = cookie.indexOf(
                      encodeURIComponent(storageKey) + "=");
                  if (location !== -1) {
                      storedLevel = /^([^;]+)/.exec(cookie.slice(location))[1];
                  }
              } catch (ignore) {}
          }

          // If the stored level is not valid, treat it as if nothing was stored.
          if (self.levels[storedLevel] === undefined) {
              storedLevel = undefined;
          }

          return storedLevel;
      }

      function clearPersistedLevel() {
          if (typeof window === undefinedType || !storageKey) return;

          // Use localStorage if available
          try {
              window.localStorage.removeItem(storageKey);
              return;
          } catch (ignore) {}

          // Use session cookie as fallback
          try {
              window.document.cookie =
                encodeURIComponent(storageKey) + "=; expires=Thu, 01 Jan 1970 00:00:00 UTC";
          } catch (ignore) {}
      }

      /*
       *
       * Public logger API - see https://github.com/pimterry/loglevel for details
       *
       */

      self.name = name;

      self.levels = { "TRACE": 0, "DEBUG": 1, "INFO": 2, "WARN": 3,
          "ERROR": 4, "SILENT": 5};

      self.methodFactory = factory || defaultMethodFactory;

      self.getLevel = function () {
          return currentLevel;
      };

      self.setLevel = function (level, persist) {
          if (typeof level === "string" && self.levels[level.toUpperCase()] !== undefined) {
              level = self.levels[level.toUpperCase()];
          }
          if (typeof level === "number" && level >= 0 && level <= self.levels.SILENT) {
              currentLevel = level;
              if (persist !== false) {  // defaults to true
                  persistLevelIfPossible(level);
              }
              replaceLoggingMethods.call(self, level, name);
              if (typeof console === undefinedType && level < self.levels.SILENT) {
                  return "No console available for logging";
              }
          } else {
              throw "log.setLevel() called with invalid level: " + level;
          }
      };

      self.setDefaultLevel = function (level) {
          defaultLevel = level;
          if (!getPersistedLevel()) {
              self.setLevel(level, false);
          }
      };

      self.resetLevel = function () {
          self.setLevel(defaultLevel, false);
          clearPersistedLevel();
      };

      self.enableAll = function(persist) {
          self.setLevel(self.levels.TRACE, persist);
      };

      self.disableAll = function(persist) {
          self.setLevel(self.levels.SILENT, persist);
      };

      // Initialize with the right level
      var initialLevel = getPersistedLevel();
      if (initialLevel == null) {
          initialLevel = defaultLevel;
      }
      self.setLevel(initialLevel, false);
    }

    /*
     *
     * Top-level API
     *
     */

    var defaultLogger = new Logger();

    var _loggersByName = {};
    defaultLogger.getLogger = function getLogger(name) {
        if ((typeof name !== "symbol" && typeof name !== "string") || name === "") {
          throw new TypeError("You must supply a name when creating a logger.");
        }

        var logger = _loggersByName[name];
        if (!logger) {
          logger = _loggersByName[name] = new Logger(
            name, defaultLogger.getLevel(), defaultLogger.methodFactory);
        }
        return logger;
    };

    // Grab the current global log variable in case of overwrite
    var _log = (typeof window !== undefinedType) ? window.log : undefined;
    defaultLogger.noConflict = function() {
        if (typeof window !== undefinedType &&
               window.log === defaultLogger) {
            window.log = _log;
        }

        return defaultLogger;
    };

    defaultLogger.getLoggers = function getLoggers() {
        return _loggersByName;
    };

    // ES6 default export, for compatibility
    defaultLogger['default'] = defaultLogger;

    return defaultLogger;
}));

},{}],12:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

var R = typeof Reflect === 'object' ? Reflect : null
var ReflectApply = R && typeof R.apply === 'function'
  ? R.apply
  : function ReflectApply(target, receiver, args) {
    return Function.prototype.apply.call(target, receiver, args);
  }

var ReflectOwnKeys
if (R && typeof R.ownKeys === 'function') {
  ReflectOwnKeys = R.ownKeys
} else if (Object.getOwnPropertySymbols) {
  ReflectOwnKeys = function ReflectOwnKeys(target) {
    return Object.getOwnPropertyNames(target)
      .concat(Object.getOwnPropertySymbols(target));
  };
} else {
  ReflectOwnKeys = function ReflectOwnKeys(target) {
    return Object.getOwnPropertyNames(target);
  };
}

function ProcessEmitWarning(warning) {
  if (console && console.warn) console.warn(warning);
}

var NumberIsNaN = Number.isNaN || function NumberIsNaN(value) {
  return value !== value;
}

function EventEmitter() {
  EventEmitter.init.call(this);
}
module.exports = EventEmitter;
module.exports.once = once;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._eventsCount = 0;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
var defaultMaxListeners = 10;

function checkListener(listener) {
  if (typeof listener !== 'function') {
    throw new TypeError('The "listener" argument must be of type Function. Received type ' + typeof listener);
  }
}

Object.defineProperty(EventEmitter, 'defaultMaxListeners', {
  enumerable: true,
  get: function() {
    return defaultMaxListeners;
  },
  set: function(arg) {
    if (typeof arg !== 'number' || arg < 0 || NumberIsNaN(arg)) {
      throw new RangeError('The value of "defaultMaxListeners" is out of range. It must be a non-negative number. Received ' + arg + '.');
    }
    defaultMaxListeners = arg;
  }
});

EventEmitter.init = function() {

  if (this._events === undefined ||
      this._events === Object.getPrototypeOf(this)._events) {
    this._events = Object.create(null);
    this._eventsCount = 0;
  }

  this._maxListeners = this._maxListeners || undefined;
};

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function setMaxListeners(n) {
  if (typeof n !== 'number' || n < 0 || NumberIsNaN(n)) {
    throw new RangeError('The value of "n" is out of range. It must be a non-negative number. Received ' + n + '.');
  }
  this._maxListeners = n;
  return this;
};

function _getMaxListeners(that) {
  if (that._maxListeners === undefined)
    return EventEmitter.defaultMaxListeners;
  return that._maxListeners;
}

EventEmitter.prototype.getMaxListeners = function getMaxListeners() {
  return _getMaxListeners(this);
};

EventEmitter.prototype.emit = function emit(type) {
  var args = [];
  for (var i = 1; i < arguments.length; i++) args.push(arguments[i]);
  var doError = (type === 'error');

  var events = this._events;
  if (events !== undefined)
    doError = (doError && events.error === undefined);
  else if (!doError)
    return false;

  // If there is no 'error' event listener then throw.
  if (doError) {
    var er;
    if (args.length > 0)
      er = args[0];
    if (er instanceof Error) {
      // Note: The comments on the `throw` lines are intentional, they show
      // up in Node's output if this results in an unhandled exception.
      throw er; // Unhandled 'error' event
    }
    // At least give some kind of context to the user
    var err = new Error('Unhandled error.' + (er ? ' (' + er.message + ')' : ''));
    err.context = er;
    throw err; // Unhandled 'error' event
  }

  var handler = events[type];

  if (handler === undefined)
    return false;

  if (typeof handler === 'function') {
    ReflectApply(handler, this, args);
  } else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      ReflectApply(listeners[i], this, args);
  }

  return true;
};

function _addListener(target, type, listener, prepend) {
  var m;
  var events;
  var existing;

  checkListener(listener);

  events = target._events;
  if (events === undefined) {
    events = target._events = Object.create(null);
    target._eventsCount = 0;
  } else {
    // To avoid recursion in the case that type === "newListener"! Before
    // adding it to the listeners, first emit "newListener".
    if (events.newListener !== undefined) {
      target.emit('newListener', type,
                  listener.listener ? listener.listener : listener);

      // Re-assign `events` because a newListener handler could have caused the
      // this._events to be assigned to a new object
      events = target._events;
    }
    existing = events[type];
  }

  if (existing === undefined) {
    // Optimize the case of one listener. Don't need the extra array object.
    existing = events[type] = listener;
    ++target._eventsCount;
  } else {
    if (typeof existing === 'function') {
      // Adding the second element, need to change to array.
      existing = events[type] =
        prepend ? [listener, existing] : [existing, listener];
      // If we've already got an array, just append.
    } else if (prepend) {
      existing.unshift(listener);
    } else {
      existing.push(listener);
    }

    // Check for listener leak
    m = _getMaxListeners(target);
    if (m > 0 && existing.length > m && !existing.warned) {
      existing.warned = true;
      // No error code for this since it is a Warning
      // eslint-disable-next-line no-restricted-syntax
      var w = new Error('Possible EventEmitter memory leak detected. ' +
                          existing.length + ' ' + String(type) + ' listeners ' +
                          'added. Use emitter.setMaxListeners() to ' +
                          'increase limit');
      w.name = 'MaxListenersExceededWarning';
      w.emitter = target;
      w.type = type;
      w.count = existing.length;
      ProcessEmitWarning(w);
    }
  }

  return target;
}

EventEmitter.prototype.addListener = function addListener(type, listener) {
  return _addListener(this, type, listener, false);
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.prependListener =
    function prependListener(type, listener) {
      return _addListener(this, type, listener, true);
    };

function onceWrapper() {
  if (!this.fired) {
    this.target.removeListener(this.type, this.wrapFn);
    this.fired = true;
    if (arguments.length === 0)
      return this.listener.call(this.target);
    return this.listener.apply(this.target, arguments);
  }
}

function _onceWrap(target, type, listener) {
  var state = { fired: false, wrapFn: undefined, target: target, type: type, listener: listener };
  var wrapped = onceWrapper.bind(state);
  wrapped.listener = listener;
  state.wrapFn = wrapped;
  return wrapped;
}

EventEmitter.prototype.once = function once(type, listener) {
  checkListener(listener);
  this.on(type, _onceWrap(this, type, listener));
  return this;
};

EventEmitter.prototype.prependOnceListener =
    function prependOnceListener(type, listener) {
      checkListener(listener);
      this.prependListener(type, _onceWrap(this, type, listener));
      return this;
    };

// Emits a 'removeListener' event if and only if the listener was removed.
EventEmitter.prototype.removeListener =
    function removeListener(type, listener) {
      var list, events, position, i, originalListener;

      checkListener(listener);

      events = this._events;
      if (events === undefined)
        return this;

      list = events[type];
      if (list === undefined)
        return this;

      if (list === listener || list.listener === listener) {
        if (--this._eventsCount === 0)
          this._events = Object.create(null);
        else {
          delete events[type];
          if (events.removeListener)
            this.emit('removeListener', type, list.listener || listener);
        }
      } else if (typeof list !== 'function') {
        position = -1;

        for (i = list.length - 1; i >= 0; i--) {
          if (list[i] === listener || list[i].listener === listener) {
            originalListener = list[i].listener;
            position = i;
            break;
          }
        }

        if (position < 0)
          return this;

        if (position === 0)
          list.shift();
        else {
          spliceOne(list, position);
        }

        if (list.length === 1)
          events[type] = list[0];

        if (events.removeListener !== undefined)
          this.emit('removeListener', type, originalListener || listener);
      }

      return this;
    };

EventEmitter.prototype.off = EventEmitter.prototype.removeListener;

EventEmitter.prototype.removeAllListeners =
    function removeAllListeners(type) {
      var listeners, events, i;

      events = this._events;
      if (events === undefined)
        return this;

      // not listening for removeListener, no need to emit
      if (events.removeListener === undefined) {
        if (arguments.length === 0) {
          this._events = Object.create(null);
          this._eventsCount = 0;
        } else if (events[type] !== undefined) {
          if (--this._eventsCount === 0)
            this._events = Object.create(null);
          else
            delete events[type];
        }
        return this;
      }

      // emit removeListener for all listeners on all events
      if (arguments.length === 0) {
        var keys = Object.keys(events);
        var key;
        for (i = 0; i < keys.length; ++i) {
          key = keys[i];
          if (key === 'removeListener') continue;
          this.removeAllListeners(key);
        }
        this.removeAllListeners('removeListener');
        this._events = Object.create(null);
        this._eventsCount = 0;
        return this;
      }

      listeners = events[type];

      if (typeof listeners === 'function') {
        this.removeListener(type, listeners);
      } else if (listeners !== undefined) {
        // LIFO order
        for (i = listeners.length - 1; i >= 0; i--) {
          this.removeListener(type, listeners[i]);
        }
      }

      return this;
    };

function _listeners(target, type, unwrap) {
  var events = target._events;

  if (events === undefined)
    return [];

  var evlistener = events[type];
  if (evlistener === undefined)
    return [];

  if (typeof evlistener === 'function')
    return unwrap ? [evlistener.listener || evlistener] : [evlistener];

  return unwrap ?
    unwrapListeners(evlistener) : arrayClone(evlistener, evlistener.length);
}

EventEmitter.prototype.listeners = function listeners(type) {
  return _listeners(this, type, true);
};

EventEmitter.prototype.rawListeners = function rawListeners(type) {
  return _listeners(this, type, false);
};

EventEmitter.listenerCount = function(emitter, type) {
  if (typeof emitter.listenerCount === 'function') {
    return emitter.listenerCount(type);
  } else {
    return listenerCount.call(emitter, type);
  }
};

EventEmitter.prototype.listenerCount = listenerCount;
function listenerCount(type) {
  var events = this._events;

  if (events !== undefined) {
    var evlistener = events[type];

    if (typeof evlistener === 'function') {
      return 1;
    } else if (evlistener !== undefined) {
      return evlistener.length;
    }
  }

  return 0;
}

EventEmitter.prototype.eventNames = function eventNames() {
  return this._eventsCount > 0 ? ReflectOwnKeys(this._events) : [];
};

function arrayClone(arr, n) {
  var copy = new Array(n);
  for (var i = 0; i < n; ++i)
    copy[i] = arr[i];
  return copy;
}

function spliceOne(list, index) {
  for (; index + 1 < list.length; index++)
    list[index] = list[index + 1];
  list.pop();
}

function unwrapListeners(arr) {
  var ret = new Array(arr.length);
  for (var i = 0; i < ret.length; ++i) {
    ret[i] = arr[i].listener || arr[i];
  }
  return ret;
}

function once(emitter, name) {
  return new Promise(function (resolve, reject) {
    function errorListener(err) {
      emitter.removeListener(name, resolver);
      reject(err);
    }

    function resolver() {
      if (typeof emitter.removeListener === 'function') {
        emitter.removeListener('error', errorListener);
      }
      resolve([].slice.call(arguments));
    };

    eventTargetAgnosticAddListener(emitter, name, resolver, { once: true });
    if (name !== 'error') {
      addErrorHandlerIfEventEmitter(emitter, errorListener, { once: true });
    }
  });
}

function addErrorHandlerIfEventEmitter(emitter, handler, flags) {
  if (typeof emitter.on === 'function') {
    eventTargetAgnosticAddListener(emitter, 'error', handler, flags);
  }
}

function eventTargetAgnosticAddListener(emitter, name, listener, flags) {
  if (typeof emitter.on === 'function') {
    if (flags.once) {
      emitter.once(name, listener);
    } else {
      emitter.on(name, listener);
    }
  } else if (typeof emitter.addEventListener === 'function') {
    // EventTarget does not have `error` event semantics like Node
    // EventEmitters, we do not listen for `error` events here.
    emitter.addEventListener(name, function wrapListener(arg) {
      // IE does not have builtin `{ once: true }` support so we
      // have to do it manually.
      if (flags.once) {
        emitter.removeEventListener(name, wrapListener);
      }
      listener(arg);
    });
  } else {
    throw new TypeError('The "emitter" argument must be of type EventEmitter. Received type ' + typeof emitter);
  }
}

},{}]},{},[10]);
