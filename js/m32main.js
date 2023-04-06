'use strict';


let Charts = require('chart.js');
let log = require("loglevel");
log.setDefaultLevel(log.levels.DEBUG);
log.debug("m32main start");

var events = require('events');

const { M32ConnectUI } = require('./m32-connect-ui');
const { M32CwGeneratorUI } = require('./m32-cw-generator-ui');
const { M32Storage } = require('./m32-storage');
const { EchoTrainerUI } = require('./m32-echo-trainer-ui');
const { M32CommunicationService } = require('./m32-communication-service');
const { QsoTrainerUI } = require('./m32-qso-trainer');

// let m32Protocolhandler;

// some constants
let VERSION = '0.5.0-beta6';


const MODE_CW_GENERATOR = 'cw-generator';
const MODE_ECHO_TRAINER = 'echo-trainer';
const MODE_QSO_TRAINER = 'qso-trainer';
const MODE_M32_CONFIG = 'm32-config';

const EVENT_MODE_SELECTED = "mode-selected";

// init all UI after page is loaded:
document.addEventListener('DOMContentLoaded', function() {
    new M32Main();
}, false);

class M32Main {

    constructor() {
        log.debug("initM32");

        this.mode = MODE_CW_GENERATOR;

        let m32Storage = new M32Storage();

        let m32CommunicationService = new M32CommunicationService();

        this.m32ConnectUI = new M32ConnectUI(m32CommunicationService, m32Storage);
        this.m32CwGeneratorUI = new M32CwGeneratorUI(m32CommunicationService, m32Storage);
        this.echoTrainerUI = new EchoTrainerUI(m32CommunicationService);
        this.qsoTrainerUI = new QsoTrainerUI(m32CommunicationService, m32Storage);

        m32Storage.loadSettings();

        document.getElementById("versionSpan").textContent = VERSION;

        this.eventEmitter = new events.EventEmitter();
        this.eventEmitter.addListener(EVENT_MODE_SELECTED, this.echoTrainerUI.modeSelected.bind(this.echoTrainerUI));
        this.eventEmitter.addListener(EVENT_MODE_SELECTED, this.m32CwGeneratorUI.modeSelected.bind(this.m32CwGeneratorUI));
        this.eventEmitter.addListener(EVENT_MODE_SELECTED, this.qsoTrainerUI.modeSelected.bind(this.qsoTrainerUI));

        // enable bootstrap tooltips everywhere:    
        var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
        tooltipTriggerList.map(function (tooltipTriggerEl) {
            // eslint-disable-next-line no-undef
            return new bootstrap.Tooltip(tooltipTriggerEl, { trigger : 'hover' });
        });    

        for (let tabElement of document.querySelectorAll('button[data-bs-toggle="tab"]')) {
            tabElement.addEventListener('shown.bs.tab', this.tabEventListener.bind(this));
        }

        let urlParams = new URLSearchParams(window.location.search);
        let paramMode = urlParams.get('mode');
        if (paramMode) {
            console.log('setting mode from url params:', paramMode);
            this.openTabForMode(paramMode);
        }

        if (urlParams.get('debug') !== null) {
            this.m32CwGeneratorUI.setDebug(true);
            this.echoTrainerUI.setDebug(true);
            log.info('debug mode enabled!');
            // receiveTextQsoTrainer.addEventListener('input', function(event) {
            //     detectQso();
            // });
        } else {
            this.m32CwGeneratorUI.setDebug(false);
            this.echoTrainerUI.setDebug(true);

            // disable editing of morserino input fields
            console.log('debug mode disabled!');
            // receiveTextEchoTrainer.readonly = true;
            // receiveTextEchoTrainer.onfocus = null;
            // receiveTextQsoTrainer.readonly = true;
            // receiveTextQsoTrainer.addEventListener('focus', function(event) {
            //     event.target.blur();
            // });
        }
        let paramM32Language = urlParams.get('language');
        if (paramM32Language) {
            console.log('setting m32language to ', paramM32Language);
            m32CommunicationService.setLanguage(paramM32Language);
        }
        
    }

    // ------------------------ tab handling ------------------------

    openTabForMode(mode) {
        if (mode === MODE_CW_GENERATOR) {
            document.getElementById('cw-generator-tab').click();
        } else if (mode === MODE_ECHO_TRAINER) {
            document.getElementById('echo-trainer-tab').click();
        } else if (mode === MODE_QSO_TRAINER) {
            document.getElementById('qso-trainer-tab').click();
        } else if (mode === MODE_M32_CONFIG) {
            document.getElementById('m32-config-tab').click();
        } else {
            console.log('Unknown mode: ', mode);
        }
    }

    tabEventListener(event) {
        //console.log('tab event', event);	
        if (event.target.id === 'cw-generator-tab') {
            this.mode = MODE_CW_GENERATOR;
        } else if (event.target.id === 'echo-trainer-tab') {
            this.mode = MODE_ECHO_TRAINER;
        } else if (event.target.id === 'qso-trainer-tab') {
            this.mode = MODE_QSO_TRAINER;
        } else if (event.target.id === 'm32-config-tab') {
            this.mode = MODE_M32_CONFIG;
            //sendM32Command('GET configs');
        }
        this.eventEmitter.emit(EVENT_MODE_SELECTED, this.mode);
    }
}

module.exports = { MODE_CW_GENERATOR, MODE_ECHO_TRAINER, MODE_QSO_TRAINER, MODE_M32_CONFIG }

