(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
'use strict';

let log = require("loglevel");

const events = require('events');

const { M32CommandSpeechHandler } = require('./m32protocol-speech-handler');
const { M32State, M32CommandStateHandler } = require('./m32protocol-state-handler')
const { M32CommandUIHandler} = require('./m32protocol-ui-handler');
const { M32Translations } = require('./m32protocol-i18n');

const MORSERINO_START = 'vvv<ka> ';
const MORSERINO_END = ' +';
const STATUS_JSON = 'status-m32-json-received';
const STATUS_TEXT = 'status-m32-text-received';


const EVENT_M32_CONNECTED = "event-m32-connected";
const EVENT_M32_DISCONNECTED = "event-m32-disconnected";
const EVENT_M32_CONNECTION_ERROR = "event-m32-connection-error";
const EVENT_M32_TEXT_RECEIVED = "event-m32-text-received";
const EVENT_M32_JSON_ERROR_RECEIVED = "event-m32-json-error-received";

const M32_MENU_CW_GENERATOR_FILE_PLAYER_ID = 8;

class M32CommunicationService {

    constructor(autoInitM32Protocol = true) {
        //Define outputstream, inputstream and port so they can be used throughout the sketch
        this.outputStream;
        this.inputStream;
        this.port = null;
        this.inputDone;
        this.outputDone;

        this.autoInitM32Protocol = autoInitM32Protocol;

        this.timer = ms => new Promise(res => setTimeout(res, ms))

        this.eventEmitter = new events.EventEmitter();

        // speech & m3 protocol handler
        this.m32Language = 'en';
        this.m32State = new M32State();
        this.m32translations = new M32Translations(this.m32Language);
        this.speechSynthesisHandler = new M32CommandSpeechHandler(this.m32Language);
        this.commandUIHandler = new M32CommandUIHandler(this.m32Language, this.m32translations);
        this.protocolHandlers = [
            new M32CommandStateHandler(this.m32State), 
            this.commandUIHandler, 
            this.speechSynthesisHandler];

            this.waitForReponseLock = new Lock();


        this.m32StreamParser = new M32StreamParser(this.m32Received.bind(this));

        //M32StreamParser.test();
    }

    addProtocolHandler(protcolHandler) {
        this.protocolHandlers.push(protcolHandler);
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

    disableVoiceOuputTemporarily(type) {
        this.speechSynthesisHandler.disableVoiceOuputTemporarily(type);
    }

    setLanguage(language) {
        this.m32Language = language;
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
            log.debug("connecting to port ", this.port);
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

            this.m32StreamParser.append(value);
            this.m32StreamParser.process(); // calls m32Received as callback
        }
    }

    // is called from M32StreamParser
    m32Received(result) {
        log.debug('m32protocol received:', result);
        if (result.status === STATUS_JSON) {
            this.waitForReponseLock.locked = false;
            try {
                // fix wrong encoding of new lines in json from morserino:
                result.content = result.content.replaceAll(/\n/g,"\\n").replaceAll(/\r/g, "").replaceAll("\\c","\\\\c");
                let jsonObject = JSON.parse(result.content);
                this.protocolHandlers.forEach(handler => {
                    handler.handleM32Object(jsonObject);
                }); 
            } catch(e) {
                log.error('json parse failed: ', e);
                this.eventEmitter.emit(EVENT_M32_JSON_ERROR_RECEIVED, result.error + ' when parsing "' + result.content + '"');
                this.eventEmitter.emit(EVENT_M32_TEXT_RECEIVED, result.content);
            }
        } else if (result.status === STATUS_TEXT) {
            log.debug("text values received", result.content);
            this.eventEmitter.emit(EVENT_M32_TEXT_RECEIVED, result.content);
        }
    }

    async sendM32Command(command, waitForResponse = true) {
        if (command && command.trim()) {
            console.log('sending command', command, 'wait', waitForResponse);
            if(waitForResponse) {
                while(this.waitForReponseLock.locked) {
                    log.debug('Waiting for response');
                    await this.timer(50);
                }
            }
            this.writeToStream(command.trim());
            if (waitForResponse) {
                this.waitForReponseLock.locked = true;
            }
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    initM32Protocol() {
        //sendM32Command('PUT device/protocol/off', false); // force device info on next PUT
        this.sendM32Command('PUT device/protocol/on');
        // enable serial output ALL as default
        this.sendM32Command('PUT config/Serial Output/5', false);
        //sendM32Command('GET device');
        this.sendM32Command('GET control/speed');
        this.sendM32Command('GET kochlesson');
        //sendM32Command('GET control/volume');
        this.sendM32Command('GET menu');
    }



    connected() {
        log.debug("Connected Test");
    }
}

class M32StreamParser {
    constructor(callback = this.callback.bind(this)) {
        this.callback = callback;
        this.toProcess = '';
    }

    static test() {
        let testM32Parser = new M32StreamParser();
        log.debug("test text");
        testM32Parser.set('foobar');
        testM32Parser.process();

        log.debug("test text json");
        testM32Parser.set('foobar{ "foo": 2}');
        testM32Parser.process();

        log.debug("test text json text");
        testM32Parser.set('foobar{ "foo": 2}baz');
        testM32Parser.process();

        log.debug("test multiple json");
        testM32Parser.set('foobar{ "foo": 2}{"foo": 3}baz');
        testM32Parser.process();

        log.debug("test split json");
        testM32Parser.set('bar{ "foo":');
        testM32Parser.process();
        testM32Parser.append('1}baz');
        testM32Parser.process();

        log.debug("test quoted simple");
        testM32Parser.set('bar{ "foo":"}1"}baz');
        testM32Parser.process();

        log.debug("test quoted split");
        testM32Parser.set('bar{ "foo":"');
        testM32Parser.process();
        testM32Parser.append('}1{"}baz');
        testM32Parser.process();
    }

    set(text) {
        this.toProcess = text;
    }

    append(text) {
        this.toProcess = this.toProcess + text;
    }

    process() {
       while(this.doProcess());
    }

    doProcess() {
        // handle strings like: foobar{"bar":1}{"foo":2}{"foo":"}2{"}baz
        let inQuote = false;
        let prefixLength = this.toProcess.indexOf('{');
        if (prefixLength == 0) {
            // JSON follows
            let braceCount = 0;
            for (var index = 0; index < this.toProcess.length; index++) {
                const char = this.toProcess[index];
                if (char == '"') {
                    inQuote = !inQuote;
                }
                if (!inQuote) {
                    if (char == '{') {
                        braceCount += 1;
                    } else if (char == '}') {
                        braceCount -= 1;
                    }
                }
                if (braceCount == 0) {
                    let jsonString = this.toProcess.substring(0, index + 1);
                    this.callback({status: STATUS_JSON,  content: jsonString});

                    this.toProcess = this.toProcess.substring(index + 1);
                    if (this.toProcess.length > 0) {
                        return true;
                    } else {
                        return false;
                    }
                }
            }
            return false;
        } else if (prefixLength > 0) {
            // TEXT  + JSON follows
            let prefix = this.toProcess.substring(0, prefixLength);
            this.callback({status: STATUS_TEXT,  content: prefix});
            this.toProcess = this.toProcess.substring(prefixLength);
            if (this.toProcess.length > 0) {
                return true;
            } else {
                return false;
            }
        } else {
            // text only
            this.callback({status: STATUS_TEXT,  content: this.toProcess});
            this.toProcess = '';
            return false;
        }
    }

    callback(result) {
        if (result.status == STATUS_JSON) {
            try {
                let jsonObject = JSON.parse(result.content);
                log.debug(result, jsonObject);
            } catch(e) {
                log.debug(result, 'JSON parse error', e);
            }
        } else {
            log.debug(result);
        }
    }

}

class Lock {
    constructor() {
        this.locked = false;
    }
}

module.exports = { M32CommunicationService, EVENT_M32_CONNECTED, EVENT_M32_DISCONNECTED, 
    EVENT_M32_CONNECTION_ERROR, EVENT_M32_TEXT_RECEIVED, EVENT_M32_JSON_ERROR_RECEIVED, MORSERINO_START, MORSERINO_END,
    M32_MENU_CW_GENERATOR_FILE_PLAYER_ID }

},{"./m32protocol-i18n":4,"./m32protocol-speech-handler":5,"./m32protocol-state-handler":6,"./m32protocol-ui-handler":7,"events":10,"loglevel":9}],2:[function(require,module,exports){
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

        this.cwSchoolGrazEnabled = false;
        this.cwSchoolGrazCheckbox = document.getElementById("cwSchoolGrazCheckbox");
        if (this.cwSchoolGrazCheckbox) {
          this.cwSchoolGrazCheckbox.addEventListener('change', this.clickCwSchoolReceived.bind(this));   
        }

        document.addEventListener("m32Connected", (e) => {
            this.changeAllCwSchoolGrazElements();
        }, false);

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

        this.cwSchoolGrazEnabled = settings.showCwSchoolGraz;
        this.cwSchoolGrazCheckbox.checked = this.cwSchoolGrazEnabled;
        this.changeAllCwSchoolGrazElements();

    }

    clickCwSchoolReceived() {
        log.debug('CW School Graz changed');
        this.cwSchoolGrazEnabled = this.cwSchoolGrazCheckbox.checked;
        this.m32Storage.settings.showCwSchoolGraz = this.cwSchoolGrazEnabled;
        this.changeAllCwSchoolGrazElements(this.cwSchoolGrazEnabled);
        this.m32Storage.saveSettings();
    }

    changeAllCwSchoolGrazElements() {
        log.debug('enable all cw-school-graz elements');
        if (this.cwSchoolGrazEnabled && this.m32CommunicationService.commandUIHandler.m32ProtocolEnabled) {
            document.querySelectorAll('.cw-school-graz').forEach(element => element.classList.add('cw-school-graz-enabled'));
        } else {
            document.querySelectorAll('.cw-school-graz').forEach(element => element.classList.remove('cw-school-graz-enabled'));
        }
    }


}

module.exports = { M32ConnectUI }

},{"./m32-communication-service":1,"./m32-storage":3,"loglevel":9}],3:[function(require,module,exports){
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
        this.showCwSchoolGraz = true;
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
            if ('showCwSchoolGraz' in storedSettings) {
                this.showCwSchoolGraz = storedSettings.showCwSchoolGraz;
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

},{"events":10,"loglevel":9}],4:[function(require,module,exports){
'use strict';

const log  = require ('loglevel');

class M32Translations {

  constructor() {
    this.m32ProtocolFallbackLanguage = 'en';
    this.menuTranslations = this.getMenuTranslations();
    this.configTranslations = this.getConfigTranslations();
    this.characterTranslations = this.getAlphabetTranslations();
  }

  phonetisize(text) {
    return [...text].map(char => this.translateCharacter(char)).join(' '); 
  }

  translateMenu(key, language, languageVariant = '') {
    return this.translate(key, language, languageVariant, this.menuTranslations);
  }

  translateConfig(key, language, languageVariant = '') {
    return this.translate(key, language, languageVariant, this.configTranslations);
  }

  translateCharacter(key) {
    return this.translate(key, this.m32ProtocolFallbackLanguage, '', this.characterTranslations);
  }


  translate(key, language, languageVariant = '', i18nMap) {
    log.debug("Translate key", key, "to language", language);
    var translationMap = i18nMap[key.trim().toLowerCase()];
    if (!translationMap) {
      return key;
    }

    var translation;
    if (languageVariant) {
      translation = translationMap[language + '_' + languageVariant];
      if (translation) {
        return translation;
      }
    }

    translation = translationMap[language];
    if (translation) {
      return translation;
    }
    if (language === this.m32ProtocolFallbackLanguage) {
      return key; // no fallback
    }
    // try fallback language
    return this.translate(key, this.m32ProtocolFallbackLanguage, languageVariant, i18nMap);
  }

  getMenuTranslations() {
      return {
        'koch trainer': {de: 'Koch Trainer'},
        'adapt. rand.': {en: 'Adaptive Random', de: 'Adaptiver Zufall'},
        // koch lessons
        '1 char m':  {en: '1 m', en_speak: '1--mike'},
        '2 char k':  {en: '2 k', en_speak: '2--kilo'},
        '3 char r':  {en: '3 r', en_speak: '3--romeo'},
        '4 char s':  {en: '4 s', en_speak: '4--sierra'},
        '5 char u':  {en: '5 u', en_speak: '5--uniform'},
        '6 char a':  {en: '6 a', en_speak: '6--alpha'},
        '7 char p':  {en: '7 p', en_speak: '7--papa'},
        '8 char t':  {en: '8 t', en_speak: '8--tango'},
        '9 char l':  {en: '9 l', en_speak: '9--lima'},
        '10 char o': {en: '10 o', en_speak: '10--oscar'},
        '11 char w': {en: '11 w', en_speak: '11--whiskey'},
        '12 char i': {en: '12 i', en_speak: '12--india'},
        '13 char .': {en: '13 .', en_speak: '13--dot'},
        '14 char n': {en: '14 n', en_speak: '14--november'},
        '15 char j': {en: '15 j', en_speak: '15--juliet'},
        '16 char e': {en: '16 e', en_speak: '16--echo'},
        '17 char f': {en: '17 f', en_speak: '17--foxtrott'},
        '18 char 0': {en: '18 0', en_speak: '18--0'},
        '19 char y': {en: '19 y', en_speak: '19--yankee'},
        '20 char v': {en: '20 v', en_speak: '20--victor'},
        '21 char ,': {en: '21 ,', en_speak: '21--comma'},
        '22 char g': {en: '22 g', en_speak: '22--golf'},
        '23 char 5': {en: '23 5', en_speak: '23--5'},
        '24 char':   {en: '24 /', en_speak: '24--slash'}, // "/" is used as menu separator
        '25 char q': {en: '25 q', en_speak: '25--quebec'},
        '26 char 9': {en: '26 9', en_speak: '26--9'},
        '27 char z': {en: '27 z', en_speak: '27--zulu'},
        '28 char h': {en: '28 h', en_speak: '28--hotel'},
        '29 char 3': {en: '29 3', en_speak: '29--3'},
        '30 char 8': {en: '30 8', en_speak: '30--8'},
        '31 char b': {en: '31 b', en_speak: '31--bravo'},
        '32 char ?': {en: '32 ?', en_speak: '32--questionmark'},
        '33 char 4': {en: '33 4', en_speak: '33--4'},
        '34 char 2': {en: '34 2', en_speak: '34--2'},
        '35 char 7': {en: '35 7', en_speak: '35--7'},
        '36 char c': {en: '36 c', en_speak: '36--charly'},
        '37 char 1': {en: '37 1', en_speak: '37--1'},
        '38 char d': {en: '38 d', en_speak: '38--delta'},
        '39 char 6': {en: '39 6', en_speak: '39--6'},
        '40 char x': {en: '40 x', en_speak: '40--x-ray'},
        '41 char -': {en: '41 -', en_speak: '41--minus'},
        '42 char =': {en: '42 =', en_speak: '42--='},
        '43 char <sk>': {en: '43 <sk>', en_speak: '43--silent key'},
        '44 char +': {en: '44 +', en_speak: '44--+'},
        '45 char <as>': {en: '45 <as>', en_speak: '45--alpha sierra'},
        '46 char <kn>': {en: '46 <kn>', en_speak: '46--kilo november'},
        '47 char <ka>': {en: '47 <ka>', en_speak: '47--kilo alpha'},
        '48 char <ve>': {en: '48 <ve>', en_speak: '48--victor echo'},
        '49 char <bk>': {en: '49 <bk>', en_speak: '49--bravo kilo'},
        '50 char @': {en: '50 @', en_speak: '50--@'},
        '51 char :': {en: '51 :', en_speak: '51--colon'},
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

  getAlphabetTranslations() {
    return {
      'a': {en: 'alpha'},
      'b': {en: 'beta'},
      'c': {en: 'charly'},
      'd': {en: 'delta'},
      'e': {en: 'echo'},
      'f': {en: 'foxtrott'},
      'g': {en: 'gamma'},
      'h': {en: 'hotel'},
      'i': {en: 'india'},
      'j': {en: 'juliet'},
      'k': {en: 'kilo'},
      'l': {en: 'lima'},
      'm': {en: 'mike'},
      'n': {en: 'november'},
      'o': {en: 'oscar'},
      'p': {en: 'papa'},
      'q': {en: 'quebec'},
      'r': {en: 'romeo'},
      's': {en: 'sierra'},
      't': {en: 'tango'},
      'u': {en: 'uniform'},
      'v': {en: 'victor'},
      'x': {en: 'x-ray'},
      'y': {en: 'yankee'},
      'z': {en: 'zulu}'}
    } 
  }
}

module.exports = { M32Translations }

},{"loglevel":9}],5:[function(require,module,exports){
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
        this.m32Translations = new M32Translations(this.language);
        this.speakQueue = [];
        this.disabledTypeMap = new Map();
    }

    speak(text, type = 'none', addToQueue = true) {
        if (!this.enabled) {
            return;
        }
        if (this.disabledTypeMap.has(type)) {
            this.disableVoiceOuputTemporarily(type); // refresh disable state
            return;
        }
        console.log('speak', text);

        if (this.speechSynth.speaking) {
            if (addToQueue && (type === 'message' || type == 'error')) {
                log.debug('push to speak queue', text, type);
                this.speakQueue.push({text, type});
                return;
            } else {
                log.debug("cancel previous speech synthesis");
                this.speechSynth.cancel();
            }
        }

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.pitch = 1;
        utterance.rate = 1;
        utterance.voice = this.getVoice(this.language);
        utterance.addEventListener('end', this.speakEndEvent.bind(this));
        this.speechSynth.speak(utterance);
    }

    speakEndEvent() {
        if (this.speakQueue.length > 0) {
            let toSpeakObj = this.speakQueue.shift();
            log.debug('shifted from speak queue', this.speakQueue);
            this.speak(toSpeakObj.text, toSpeakObj.type, false);
        }
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

    disableVoiceOuputTemporarily(type) {
        let timeoutId = this.disabledTypeMap.get(type);
        if (timeoutId) {
            // cancel old timeout for type
            //log.debug('Cancel timeout for type ', type, timeoutId);
            clearTimeout(timeoutId);
        }
        timeoutId = setTimeout(() => {
            //log.debug('Delete timeout for type ', type);
            this.disabledTypeMap.delete(type);
        }, 1000);
        //log.debug('Add timeout for type ', type);
        this.disabledTypeMap.set(type, timeoutId);
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
                    var textToSpeak = menues.map((menu) => this.m32Translations.translateMenu(menu, this.language, 'speak')).join(' ');
                    this.speak(textToSpeak, 'menu');
                    break;
                case 'control':
                    this.speak(value['name'] + ' ' + value['value'], 'control');
                    break;
                /*    
                case 'activate':
                    this.speak(value['state']);
                    break;
                */
                case 'message':
                    this.speak(value['content'], 'message');
                    break;
                case 'config': {
                    // distinguish between navigation in configuration and manual request of config (returning mapped values):
                    let configName = this.m32Translations.translateConfig(value['name'], this.language, 'speak');
                    let configValue = '';
                    if (value['displayed']) {
                        configValue = this.m32Translations.translateConfig(value['displayed'], this.language, 'speak');
                    } else {
                        if (value['isMapped'] == false) {
                            configValue = value['value'];
                        } else {
                            let mappingIndex = value['value'];
                            configValue = value['mapped values'][mappingIndex];
                        }
                    }
                    this.speak(configName + ' is ' + configValue, 'config');
                    break;
                }
                case 'error':
                    this.speak(value['message'], 'error');
                    break;
                case 'device':
                    this.speak('firmware' + value['firmware'], 'device');
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

},{"./m32protocol-i18n":4,"loglevel":9}],6:[function(require,module,exports){
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


},{}],7:[function(require,module,exports){
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


},{"loglevel":9}],8:[function(require,module,exports){
'use strict';

let log = require("loglevel");
log.setDefaultLevel(log.levels.DEBUG);
log.debug("serialtest start");

const { M32ConnectUI } = require('./m32-connect-ui');
const { M32CommunicationService, EVENT_M32_TEXT_RECEIVED, EVENT_M32_JSON_ERROR_RECEIVED } = require('./m32-communication-service');
const { M32Storage } = require('./m32-storage');


// init all UI after page is loaded:
document.addEventListener('DOMContentLoaded', function() {
    new SerialTest();
}, false);

class SerialTest {

    constructor() {
        this.prettyPrint = false;
        let m32Storage = new M32Storage();
        this.m32CommunicationService = new M32CommunicationService(false);
        this.m32ConnectUI = new M32ConnectUI(this.m32CommunicationService, m32Storage);
        
        // define the elements
        this.receiveText = document.getElementById("receiveText");
        this.inputText = document.getElementById("inputText");
        let clearAllButton = document.getElementById("clearAllButton");
        let clearReceivedButton = document.getElementById("clearReceivedButton");
        let sendTextButton = document.getElementById("sendTextButton");

        this.m32CommunicationService.addEventListener(EVENT_M32_TEXT_RECEIVED, this.textReceived.bind(this));
        this.m32CommunicationService.addEventListener(EVENT_M32_JSON_ERROR_RECEIVED, this.jsonErrorReceived.bind(this));
        this.m32CommunicationService.addProtocolHandler(this);

        
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
        this.m32CommunicationService.sendM32Command(this.inputText.value, false);
        //and clear the input field, so it's clear it has been sent
        //sendText.value = '';
    }

    textReceived(value) {
        this.receiveText.value += value;
        //Scroll to the bottom of the text field
        this.receiveText.scrollTop = this.receiveText.scrollHeight;
    }

    jsonErrorReceived(value) {
        document.getElementById("receiveError").innerHTML = 
        `<div class="alert alert-danger alert-dismissible fade show" role="alert">
        ${value}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
      </div>`;
    }

    // callback method for a full json object received
    handleM32Object(jsonObject) {
        console.log('serialtest.handleM32Object', jsonObject);
        if (this.prettyPrint) {
          this.receiveText.value += JSON.stringify(jsonObject, null, 4);
        } else {
            this.receiveText.value += JSON.stringify(jsonObject);
        }
    }
}
},{"./m32-communication-service":1,"./m32-connect-ui":2,"./m32-storage":3,"loglevel":9}],9:[function(require,module,exports){
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

},{}],10:[function(require,module,exports){
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

},{}]},{},[8]);
