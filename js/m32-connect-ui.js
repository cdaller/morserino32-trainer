'use strict';

const log  = require ('loglevel');
const { M32ConnectService, EVENT_M32_CONNECTED, EVENT_M32_DISCONNECTED, EVENT_M32_CONNECT_ERROR } = require('./m32-connect-service');

class M32ConnectUI {
    constructor() {
        this.connectButton = document.getElementById("connectButton");
        this.voiceOutputCheckbox = document.getElementById("voiceOutputCheckbox");
        this.statusBar = document.getElementById("statusBar");
        this.voiceOutputEnabled = true;
        this.m32ConnectService = new M32ConnectService(this.connected);
        this.m32ConnectService.addEventListener(EVENT_M32_CONNECTED, this.connected);
        this.m32ConnectService.addEventListener(EVENT_M32_DISCONNECTED, this.disconnected.bind(this));
        this.m32ConnectService.addEventListener(EVENT_M32_CONNECT_ERROR, this.connectError.bind(this));

        this.connectButton.addEventListener('click', this.clickConnect.bind(this), false);
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

}

module.exports = { M32ConnectUI }
