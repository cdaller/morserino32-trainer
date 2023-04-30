'use strict';

const log  = require ('loglevel');
const { createElement } = require('./dom-utils');

class M32Config {
    constructor(value) {
        this.name = value['name'];
        this.value = value['value'];
        this.description = value['description'];
        this.minimum = value['minimum'];
        this.maximum = value['maximum'];
        this.step = value['step'];
        this.isMapped = value['isMapped'];
        this.mappedValues = value['mapped values'];
        this.displayed = value['displayed'];
    }

    merge(value) {
        this.value = value['value'];
        this.displayed = value['displayed'];
    }
}

class ConfigurationUI {
    constructor(m32CommunicationService, configRootElement) {
        this.m32CommunicationService = m32CommunicationService;
        this.m32CommunicationService.addProtocolHandler(this);
        this.configNames = [];
        this.configMap = {};
        this.configRootElement = configRootElement;
        this.m32translations = m32CommunicationService.m32translations;

        document.getElementById('m32-config-reload-button').addEventListener('click', this.readConfigs.bind(this));

        document.getElementById('m32-config-wifi1-button').addEventListener('click', this.saveWifi.bind(this));
        document.getElementById('m32-config-wifi2-button').addEventListener('click', this.saveWifi.bind(this));
        document.getElementById('m32-config-wifi3-button').addEventListener('click', this.saveWifi.bind(this));

        document.getElementById('m32-select-wifi1-button').addEventListener('click', this.selectWifi.bind(this));
        document.getElementById('m32-select-wifi2-button').addEventListener('click', this.selectWifi.bind(this));
        document.getElementById('m32-select-wifi3-button').addEventListener('click', this.selectWifi.bind(this));

        document.getElementById('m32-config-snapshots-select').addEventListener('change', this.changedSnapshot.bind(this));

        this.snapshotRecallButton = document.getElementById('m32-config-snapshot-button-recall');
        this.snapshotRecallButton.addEventListener('click', this.recallSnapshotClicked.bind(this));
    }

    readConfigs() {
        this.m32CommunicationService.sendM32Command('GET wifi');
        this.m32CommunicationService.sendM32Command('GET snapshots');
        this.m32CommunicationService.sendM32Command('GET configs'); // triggers a handleM32Object callback
    }

    // callback method for a full json object received
    handleM32Object(jsonObject) {
        console.log('configHandler.handleM32Object', jsonObject);
        const keys = Object.keys(jsonObject);
        if (keys && keys.length > 0) {
            const key = keys[0];
            const value = jsonObject[key];
            switch(key) {
                case 'configs':
                    if (this.configRootElement) {                            
                        console.log(value);
                        console.log(value.length);
                        this.configNames = [];
                        this.configMap = {};
                        for (let index = 0; index < value.length; index++) {
                            let name = value[index]['name'];
                            this.configNames.push(name);
                        }
                        this.fetchFullConfiguration();
                    }
                    break;
                case 'config':
                    if (this.configRootElement) {                            
                        console.log(value);
                        let name = value['name'];
                        let m32Config = this.configMap[name];
                        if (m32Config) {
                            m32Config.merge(value);
                        } else {
                            this.configMap[name] = new M32Config(value);
                        }
                        this.addConfigurationElements(this.configMap[name]);
                    }
                    break;
                case 'wifi':
                    if (this.configRootElement) {                            
                        console.log(value);
                        this.receivedWifis(value);
                    }
                    break;
                case 'snapshots':
                    if (this.configRootElement) {                            
                        console.log(value);
                        this.receivedSnapshots(value);
                    }
                    break;
    
                }
        } else {
            console.log('cannot handle json', jsonObject);
        }
    }

    fetchFullConfiguration() {
        // FIXME: order is sometimes mixed up!
        log.debug('fetching configuration settings for', this.configNames);
        this.m32CommunicationService.disableVoiceOuputTemporarily('config');
        for (let index = 0; index < this.configNames.length; index++) {
            let configName = this.configNames[index];
            this.m32CommunicationService.sendM32Command('GET config/' + configName);
        }
    }
    
    addConfigurationElements(config) {
        log.debug('add/replace dom element for config', config)

        let i18nName = this.m32translations.translateConfig(config.name, this.m32CommunicationService.m32Language);
        let elementId = this.getIdFromName(config.name);
        let configElement = document.getElementById(elementId);
        if (!configElement) {
            configElement = createElement(null, 'div', 'row');
            configElement.id = elementId;
            this.configRootElement.appendChild(configElement);

            let elements = [];
            let titleColumn = createElement(null, 'div', 'col-md-6');
            titleColumn.replaceChildren(...[createElement(i18nName, 'h4', null), createElement(config.description, 'p', null)]);
            elements.push(titleColumn);
            let selectDivElement = createElement(null, 'div', 'col-md-4');
            let selectElement = createElement(null, 'select', 'form-select');
            //selectElement.disabled = true; // FIXME: remove for edit!
            selectElement.setAttribute('data-m32-config-name', config.name);
            selectElement.addEventListener('change', this.onChangeConfig.bind(this));
            
            let optionElements = [];
            for (let index = config.minimum; index <= config.maximum; index += config.step) {
                let displayValue = config.isMapped ? config.mappedValues[index] : index.toString();
                let optionElement = createElement(displayValue, 'option', null);
                optionElement.value = index;
                if (config.value == index) {
                    optionElement.selected = true;
                }
                optionElements.push(optionElement);
            }
            selectElement.replaceChildren(...optionElements);
            selectDivElement.replaceChildren(...[selectElement]);
            elements.push(selectDivElement);
            configElement.replaceChildren(...elements);
        }
        // if a config element is received on manual user interaction on morserino, a different config
        // element is sent: no mapping, only 'displayed' and 'value' 
        // update the selection
        if (config.displayed) {
            // not a full config json was received, but only a value and displayed
            let selectorElement = document.querySelector('[data-m32-config-name="' + config.name + '"]');
            let configValue = config.value.toString();
            for (let index = 0; index < selectorElement.length; index += 1) {
                let optionElement = selectorElement[index];
                if (optionElement.value === configValue) {
                    optionElement.selected = true;
                } else {
                    optionElement.selected = false;
                }
            }
        }
    }

    getIdFromName(configName) {
        return configName.replace(/[ #,/]/g, '_');
    }

    onChangeConfig(event) {
        let configName = event.target.getAttribute('data-m32-config-name');
        let value = event.target.value;
        let command = "PUT config/" + configName + "/" + value;
        log.debug('changed:', configName, value);
        this.m32CommunicationService.sendM32Command(command, false);
    }

    receivedWifis(wifiConfig) {
        let baseId = 'm32-config-wifi';
        for (let index = 1; index < 4; index++) {
            let ssidId = baseId + index + '-ssid';
            let trxPeerId = baseId + index + '-trxpeer';
            document.getElementById(ssidId).value = wifiConfig[index-1]['ssid'];
            document.getElementById(trxPeerId).value = wifiConfig[index-1]['trxpeer'];
        }
    }

    saveWifi(event) {
        let baseId = event.target.id.substring(0, event.target.id.length - '-button'.length);
        let ssidId = baseId + '-ssid';
        let passwordId = baseId + '-password';
        let trxPeerId = baseId + '-trxpeer';
        let wifiNumber = baseId.substring(baseId.length - 1);
        let ssid = document.getElementById(ssidId).value;
        let password = document.getElementById(passwordId).value;
        let trxPeer = document.getElementById(trxPeerId).value;
        this.m32CommunicationService.sendM32Command(`PUT wifi/ssid/${wifiNumber}/${ssid}`, false);
        this.m32CommunicationService.sendM32Command(`PUT wifi/password/${wifiNumber}/${password}`, false);
        this.m32CommunicationService.sendM32Command(`PUT wifi/trxpeer/${wifiNumber}/${trxPeer}`, false);
    }

    selectWifi(event) {
        let baseId = event.target.id.substring(0, event.target.id.length - '-button'.length);
        let wifiNumber = baseId.substring(baseId.length - 1);
        this.m32CommunicationService.sendM32Command(`PUT wifi/select/${wifiNumber}`, false);
    }

    receivedSnapshots(snapshots) {
        let selectElement = document.getElementById('m32-config-snapshots-select');
        let existingSnapshots = snapshots['existing snapshots']
        let optionElements = [];

        for (let index = 0; index < existingSnapshots.length; index++) {
            let snapshotId = existingSnapshots[index];
            let optionElement = createElement(snapshotId.toString(), 'option', null);
            optionElement.value = snapshotId;
            optionElements.push(optionElement);
        }
        selectElement.replaceChildren(...optionElements);
        selectElement.selectedIndex = -1; // no element selected by default
    }

    changedSnapshot(event) {
        //let selectElement = event.target;
        //let newSnapshotId = selectElement.options[selectElement.selectedIndex].value;
        this.snapshotRecallButton.disabled = false;
    }

    recallSnapshotClicked() {
        let selectedOption = document.getElementById('m32-config-snapshots-select');
        let snapshotId = selectedOption.value;
        if (snapshotId) {
            log.debug("recall snapshot", snapshotId);
            this.m32CommunicationService.sendM32Command("PUT snapshot/recall/" + snapshotId, false);
            // read new configuration:
            this.m32CommunicationService.sendM32Command("GET configs");
        }
    }
}

module.exports = { ConfigurationUI }
