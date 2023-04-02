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
        this.voiceOutputCheckbox.addEventListener('change', this.clickVoiceOutputReceived.bind(this));

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
