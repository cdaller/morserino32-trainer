'use strict';

let log = require("loglevel");

const events = require('events');

const { M32CommandSpeechHandler } = require('./m32protocol-speech-handler');
const { M32State, M32CommandStateHandler } = require('./m32protocol-state-handler')
const { M32CommandUIHandler} = require('./m32protocol-ui-handler');
const { M32Translations } = require('./m32protocol-i18n');

const MORSERINO_REBOOT_WAIT_TIME_MS = 6000;

const MORSERINO_START = 'vvv<ka> ';
const MORSERINO_END = ' +';
const STATUS_JSON = 'status-m32-json-received';
const STATUS_TEXT = 'status-m32-text-received';


const EVENT_M32_CONNECTED = "event-m32-connected";
const EVENT_M32_DISCONNECTED = "event-m32-disconnected";
const EVENT_M32_CONNECTION_ERROR = "event-m32-connection-error";
const EVENT_M32_TEXT_RECEIVED = "event-m32-text-received";
const EVENT_M32_JSON_ERROR_RECEIVED = "event-m32-json-error-received";
const EVENT_M32_REBOOTING = "event-m32-rebooting";

const M32_MENU_CW_GENERATOR_FILE_PLAYER_ID = 8;

// ESP32 bootloader/ROM messages emitted on reset — should be silently ignored
const ESP32_BOOT_ERROR_PREFIXES = [
    'ets ', 'rst:0x', 'configsip: ', 'clk_drv:0x', 'mode:DIO, ', 'load:0x', 'entry 0x', '[SX12xx] ', 'E (',
];

function isEsp32BootOrErrorMessage(text) {
    const trimmed = text.trim();
    return ESP32_BOOT_ERROR_PREFIXES.some(prefix => trimmed.startsWith(prefix));
}

function isRebootMessage(text) {
    return text.includes('(SPI_FAST_FLASH_BOOT)');
}

// Returns true if `text` is or could grow into a boot message line (no \n yet)
function couldBeBootMessageStart(text) {
    return ESP32_BOOT_ERROR_PREFIXES.some(p => p.startsWith(text) || text.startsWith(p));
}

class M32CommunicationService {

    constructor(autoInitM32Protocol = true) {
        //Define outputstream, inputstream and port so they can be used throughout the sketch
        this.outputStream;
        this.inputStream;
        this.port = null;
        this.inputDone;
        this.outputDone;

        this.autoInitM32Protocol = autoInitM32Protocol;
        this._lineBuffer = '';
        this._lineBufferTimer = null;
        this._rebootInitPending = false;

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
        const filters = [
            { 
                // morserino32
                // Product ID: 0xea60
                usbVendorId: 0x10c4 // Silicon Laboratories, Inc.
            },
            { 
                // ESP32 Wroom version
                usbVendorId: 0x303a 
            }
        ];

        //Try to connect to the Serial port
        try {
            this.port = await navigator.serial.requestPort({ filters: filters });
            // Continue connecting to |port|.

            // - Wait for the port to open.
            log.debug("connecting to port ", this.port);
            await this.port.open({ baudRate: baudRate });

            // eslint-disable-next-line no-undef
            let decoder = new TextDecoderStream();
            this.inputDone = this.port.readable.pipeTo(decoder.writable);
            this.inputStream = decoder.readable;

            // eslint-disable-next-line no-undef
            const encoder = new TextEncoderStream();
            this.outputDone = encoder.readable.pipeTo(this.port.writable);
            this.outputStream = encoder.writable;

            this.reader = this.inputStream.getReader();

            // De-assert DTR and RTS immediately to prevent the ESP32 auto-reset circuit
            // from triggering on Windows, where the CP210x/CH340 driver asserts both
            // signals when the port opens. (WICG/serial issue #177)
            // On Mac this is not necessary and also works without reboot. So skip setting the signals.
            if (!/Mac/.test(navigator.userAgent)) {
                // setting DTR to false and RTS to false: reboots on connect, but is connected afterwards, only initial boot message shown (same on mac and windows)
                await this.port.setSignals({ dataTerminalReady: false, requestToSend: false });
            }

            log.debug('M32 Communication Service connected to Morserino.');
            this.readLoop();

            if (this.autoInitM32Protocol) {
                log.debug('Initializing M32 Protocol...');
                this.initM32Protocol();
            }

            this.eventEmitter.emit(EVENT_M32_CONNECTED);

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

            // Cancel any pending flush — new data arrived
            if (this._lineBufferTimer) {
                clearTimeout(this._lineBufferTimer);
                this._lineBufferTimer = null;
            }

            this._lineBuffer += result.content;

            // Process all complete lines
            let newlineIdx;
            while ((newlineIdx = this._lineBuffer.indexOf('\n')) !== -1) {
                const line = this._lineBuffer.substring(0, newlineIdx + 1);
                this._lineBuffer = this._lineBuffer.substring(newlineIdx + 1);
                if (isEsp32BootOrErrorMessage(line)) {
                    log.debug("ignoring ESP32 boot message:", line);
                    if (isRebootMessage(line)) {
                        this.onRebootDetected();
                    }
                } else {
                    this.eventEmitter.emit(EVENT_M32_TEXT_RECEIVED, line);
                }
            }

            // For the incomplete tail: emit immediately unless it could still be a boot message prefix,
            // in which case wait briefly — boot lines arrive as a burst so the rest will follow within ms.
            // If nothing arrives within the timeout it's a CW character (e.g. 'e') and gets flushed.
            if (this._lineBuffer) {
                if (couldBeBootMessageStart(this._lineBuffer)) {
                    this._lineBufferTimer = setTimeout(() => {
                        this._lineBufferTimer = null;
                        if (this._lineBuffer) {
                            if (isEsp32BootOrErrorMessage(this._lineBuffer)) {
                                log.debug("ignoring ESP32 boot message (no newline):", this._lineBuffer);
                                if (isRebootMessage(this._lineBuffer)) {
                                    this.onRebootDetected();
                                }
                            } else {
                                this.eventEmitter.emit(EVENT_M32_TEXT_RECEIVED, this._lineBuffer);
                            }
                            this._lineBuffer = '';
                        }
                    }, 300);
                } else {
                    this.eventEmitter.emit(EVENT_M32_TEXT_RECEIVED, this._lineBuffer);
                    this._lineBuffer = '';
                }
            }
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

    onRebootDetected() {
        if (this._rebootInitPending) {
            return;
        }
        this._rebootInitPending = true;
        log.debug('Reboot detected, re-initializing M32 protocol after settle delay...');
        this.eventEmitter.emit(EVENT_M32_REBOOTING);
        this.sleep(MORSERINO_REBOOT_WAIT_TIME_MS).then(() => {
            this._rebootInitPending = false;
            this.waitForReponseLock.locked = false; // release any lock stuck from pre-reboot commands
            log.debug('Re-initializing M32 protocol after reboot.');
            this.initM32Protocol();
            this.eventEmitter.emit(EVENT_M32_CONNECTED);
        });
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
    EVENT_M32_CONNECTION_ERROR, EVENT_M32_TEXT_RECEIVED, EVENT_M32_JSON_ERROR_RECEIVED, EVENT_M32_REBOOTING,
    MORSERINO_START, MORSERINO_END, M32_MENU_CW_GENERATOR_FILE_PLAYER_ID }
