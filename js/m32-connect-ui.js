'use strict';

const log  = require ('loglevel');
const { M32CommunicationService, EVENT_M32_CONNECTED, EVENT_M32_DISCONNECTED, EVENT_M32_CONNECT_ERROR } = require('./m32-communication-service');

class M32ConnectUI {
    constructor() {
        this.connectButton = document.getElementById("connectButton");
        this.voiceOutputCheckbox = document.getElementById("voiceOutputCheckbox");
        this.statusBar = document.getElementById("statusBar");
        this.voiceOutputEnabled = true;
        this.m32ConnectService = new M32CommunicationService(this.connected);
        this.m32ConnectService.addEventListener(EVENT_M32_CONNECTED, this.connected);
        this.m32ConnectService.addEventListener(EVENT_M32_DISCONNECTED, this.disconnected.bind(this));
        this.m32ConnectService.addEventListener(EVENT_M32_CONNECT_ERROR, this.connectError.bind(this));

        this.connectButton.addEventListener('click', this.clickConnect.bind(this), false);
        this.voiceOutputCheckbox.addEventListener('change', this.clickVoiceOutputReceived.bind(this));

        // check if serial communication is available at all:
        let serialCommunicationavailable = navigator.serial !== undefined;        
        if (!serialCommunicationavailable) {
            this.disableSerialCommunication();
        }  
    }

    //When the connectButton is pressed
    async clickConnect() {
        if (this.m32ConnectService.isConnected()) {
            log.debug("disconnecting")
            //if already connected, disconnect
            this.m32ConnectService.disconnect();

        } else {
            log.debug("connecting")
            //otherwise connect
            await this.m32ConnectService.connect();
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
        log.debug("voice output changed")
        this.voiceOutputEnabled = this.voiceOutputCheckbox.checked;
        this.m32ConnectService.enableVoiceOutput(this.voiceOutputEnabled);
        // FIXME: saveSettings
    }
    

}

module.exports = { M32ConnectUI }
