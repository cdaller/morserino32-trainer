'use strict';

const { M32_MENU_CW_GENERATOR_FILE_PLAYER_ID } = require('./m32-communication-service');


const log  = require ('loglevel');
const { createElement } = require('./dom-utils');

const MAX_NUMBER_MEMORIES = 8;


class CWMemoryUI {
    constructor(m32CommunicationService) {
        
        this.m32CommunicationService = m32CommunicationService;
        this.m32CommunicationService.addProtocolHandler(this);

        document.getElementById("cw-memory-start-snapshot5-button").addEventListener('click', this.startSnapshot5.bind(this));
        document.getElementById("cw-memory-start-button").addEventListener('click', this.startCwKeyer.bind(this));        


        for (var index = 1; index < MAX_NUMBER_MEMORIES + 1; index++) {
            console.log("add click event to memory buttons ", index);
            document.getElementById("m32-cw-memory-" + index + "-save-button").addEventListener('click', this.saveCwMemory.bind(this, index));
            document.getElementById("m32-cw-memory-" + index + "-recall-button").addEventListener('click', this.recallCwMemory.bind(this, index));

            document.getElementById("m32-cw-memory-" + index + "-input").addEventListener('change', this.setInputToChanged.bind(this, index));
        }
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
                        console.log("received cw memory indices", usedIndices);
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

    saveCwMemory(index) {
        let inputElement = document.getElementById("m32-cw-memory-" + index + "-input");
        const content = inputElement.value;
        console.log("Save CW Memory", index, content);
        this.m32CommunicationService.sendM32Command('PUT cw/store/' + index + '/' + content);

        inputElement.classList.remove("changed");
    }

    recallCwMemory(index) {
        console.log("Recall CW Memory", index);
        this.m32CommunicationService.sendM32Command('PUT cw/recall/' + index);            
    }

    readCwMemoriesForIndices(usedIndices) {
        console.log("Read cw memories for Indices", usedIndices);
        for (let index = 0; index < usedIndices.length; index++) {
            this.m32CommunicationService.sendM32Command('GET cw/memory/' + usedIndices[index]);
        }
    }

    cwMemoryReceived(index, content) {
        let inputElement = document.getElementById("m32-cw-memory-" + index + "-input");
        inputElement.value = content;
    }

    setInputToChanged(index) {
        let inputElement = document.getElementById("m32-cw-memory-" + index + "-input");
        inputElement.classList.add("changed");
    }

    startSnapshot5() {
        log.debug("starting snapshot 5");
        this.m32CommunicationService.sendM32Command('PUT menu/stop', false);
        this.m32CommunicationService.sendM32Command('PUT snapshot/recall/5', false);
        this.m32CommunicationService.sendM32Command('PUT menu/start', false);
    }

    startCwKeyer() {
        this.m32CommunicationService.sendM32Command('PUT menu/stop', false);
        this.m32CommunicationService.sendM32Command('PUT menu/start/1', false);
    }

}
module.exports = { CWMemoryUI }
