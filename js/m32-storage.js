'use strict';

const log  = require ('loglevel');

var events = require('events');

const STORAGE_KEY = 'morserino-trainer';
const STORAGE_KEY_SETTINGS = 'morserino-trainer-settings';

const EVENT_SETTINGS_CHANGED = "settings-changed";


class M32Settings {
    constructor() {
        this.cwPlayerWpm = 15;
        this.cwPlayerEws = 0;
        this.cwPlayerEls = 2;
        this.qsoRptWords = false;
        this.voiceOutputEnabled = true;
        this.showCwSchoolGraz = true;
    }

    loadFromStoredSettings(storedSettings) {
        if (storedSettings) {
    
            if ('cwPlayerWpm' in storedSettings) {
                this.cwPlayerWpm = storedSettings.cwPlayerWpm;
            }
            if ('cwPlayerEws' in storedSettings) {
                this.cwPlayerEws = storedSettings.cwPlayerEws;
            }
            if ('cwPlayerEls' in storedSettings) {
                this.cwPlayerEls = storedSettings.cwPlayerEls;
            }
            if ('qsoRptWords' in storedSettings) {
                this.qsoRptWords = storedSettings.qsoRptWords;
            }
            if ('voiceOutputEnabled' in storedSettings) {
                this.voiceOutputEnabled = storedSettings.voiceOutputEnabled;
            }
            if ('showCwSchoolGraz' in storedSettings) {
                this.showCwSchoolGraz = storedSettings.showCwSchoolGraz;
            }

        }
    }
}

class M32Storage {

    constructor() {
        this.settings = new M32Settings();
        this.eventEmitter = new events.EventEmitter();
    }

    addEventListener(eventType, callback) {
        this.eventEmitter.addListener(eventType, callback);
    }

    loadSettings() {
        let storedSettings = JSON.parse(localStorage.getItem(STORAGE_KEY_SETTINGS));
        this.settings.loadFromStoredSettings(storedSettings);
        this.eventEmitter.emit(EVENT_SETTINGS_CHANGED, this.settings);
    
        // setCwPlayerSettings();
        // setCwSettingsInUIInput();
        // setCwSettingsInUILabels();
    }
    
    saveSettings() {
        log.debug("save settings", this.settings);
        localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(this.settings));
    }

    getSavedResults() {
        let savedResults = JSON.parse(localStorage.getItem(STORAGE_KEY));
        return savedResults;
    }
    
    saveResults(storedResults) {
        let storedResultsText = JSON.stringify(storedResults);
        localStorage.setItem(STORAGE_KEY, storedResultsText);
        log.debug('Saving result to localStorage', storedResultsText);
    }
}

module.exports = { M32Settings, M32Storage, EVENT_SETTINGS_CHANGED }
