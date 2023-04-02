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
