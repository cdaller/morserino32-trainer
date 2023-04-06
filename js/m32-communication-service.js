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
