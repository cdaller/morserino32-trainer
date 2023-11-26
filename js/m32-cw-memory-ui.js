'use strict';

const { M32_MENU_CW_GENERATOR_FILE_PLAYER_ID } = require('./m32-communication-service');


const log  = require ('loglevel');
const { createElement } = require('./dom-utils');


class CWMemoryUI {
    constructor(m32CommunicationService) {
        
        this.m32CommunicationService = m32CommunicationService;
        this.m32CommunicationService.addProtocolHandler(this);
    }


    // callback method for a full json object received
    handleM32Object(jsonObject) {
        console.log('cw-memory.handleM32Object', jsonObject);
        const keys = Object.keys(jsonObject);
        if (keys && keys.length > 0) {
            const key = keys[0];
            const value = jsonObject[key];
            switch(key) {
                case 'CW Memories':
                    if (value['cw memories in use']) {
                        const usedIndices = value['cw memories in use'];
                        console.log("yyyyy usedIndices", usedIndices);
                        this.readCwMemoriesForIndices(usedIndices);
                    }
                    break;
                case 'CW Memory':
                    const index = value['number'];
                    const content = value['content'];
                    console.log("cw memory", index, "content", content);
                    this.cwMemoryReceived(index, content);
                    break;
                }
        } else {
            console.log('cannot handle json', jsonObject);
        }
    }

    readCwMemories() {
        this.m32CommunicationService.sendM32Command('GET cw/memories');
    }

    readCwMemoriesForIndices(usedIndices) {
        console.log("xxxx usedIndices", usedIndices);
        for (let index = 0; index < usedIndices.length; index++) {
            this.m32CommunicationService.sendM32Command('GET cw/memory/' + usedIndices[index]);            
        }
    }

    cwMemoryReceived(index, content) {
        let inputElement = document.getElementById("m32-cw-memory-" + index + "-input");
        inputElement.value = content;
    }
}
module.exports = { CWMemoryUI }
