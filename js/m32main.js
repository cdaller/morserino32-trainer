'use strict';

let Charts = require('chart.js');
const ReRegExp = require('reregexp').default;
let log = require("loglevel");
log.setDefaultLevel(log.levels.DEBUG);
log.debug("m32main start");

const { M32ConnectUI } = require('./m32-connect-ui');
const { M32CwGeneratorUI } = require('./m32-cw-generator-ui');

// let m32Protocolhandler;

// some constants
let VERSION = '0.5.0-beta5';
let STORAGE_KEY = 'morserino-trainer';
let STORAGE_KEY_SETTINGS = 'morserino-trainer-settings';


const MODE_ECHO_TRAINER = 'echo-trainer';
const MODE_CW_GENERATOR = 'cw-generator';
const MODE_QSO_TRAINER = 'qso-trainer';
const MODE_M32_CONFIG = 'm32-config';
let mode = MODE_CW_GENERATOR;

const QSO_WAIT_TIME_MS = 2000; // wait ms after receiving 'kn' to answer

// init all UI after page is loaded:
document.addEventListener('DOMContentLoaded', function() {
    initM32Main(); // m32main
}, false);


function initM32Main() {
    log.debug("initM32");

    let m32ConnectUI = new M32ConnectUI();    
    let m32CwGeneratorUI = new M32CwGeneratorUI(m32ConnectUI.m32ConnectService);

    document.getElementById("versionSpan").textContent = VERSION;

    // enable bootstrap tooltips everywhere:    
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        // eslint-disable-next-line no-undef
        return new bootstrap.Tooltip(tooltipTriggerEl, { trigger : 'hover' });
    });    

}

module.exports = { initM32Main };