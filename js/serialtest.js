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