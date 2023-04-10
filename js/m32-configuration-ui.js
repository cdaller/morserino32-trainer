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
    }

    readConfigs() {
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
                        this.configMap[name] = new M32Config(value);
                        this.addConfigurationElements(this.configMap[name]);
                    }
                    break;
                }
        } else {
            console.log('cannot handle json', jsonObject);
        }
    }

    fetchFullConfiguration() {
        log.debug('fetching configuration settings for', this.configNames);
        for (let index = 0; index < this.configNames.length; index++) {
            let configName = this.configNames[index];
            if (configName !== 'CurtisB DahT%' 
                && configName !== 'CurtisB DitT%'
                && configName !== 'InterWord Spc'
                && configName !== 'Interchar Spc'
                && configName !== 'Echo Repeats'
                && configName !== 'Max # of Words'
                ) {
            this.m32CommunicationService.sendM32Command('GET config/' + configName);
                }
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
        }
        let elements = [];
        let titleColumn = createElement(null, 'div', 'col-md-6');
        titleColumn.replaceChildren(...[createElement(i18nName, 'h3', null), createElement(config.description, 'p', null)]);
        elements.push(titleColumn);
        if (config.isMapped) {
            let selectDivElement = createElement(null, 'div', 'col-md-4');
            let selectElement = createElement(null, 'select', 'form-select');
            selectElement.disabled = true; // FIXME: remove for edit!
            let optionElements = [];
            for (let index = config.minimum; index <= config.maximum; index++) {

                let optionElement = createElement(config.mappedValues[index], 'option', null);
                optionElement.value = index;
                if (config.value == index) {
                    optionElement.selected = true;
                }
                optionElements.push(optionElement);
            }
            selectElement.replaceChildren(...optionElements);
            selectDivElement.replaceChildren(...[selectElement]);
            elements.push(selectDivElement);
        } else {
            // fixme: create input field:
            elements.push(createElement(config.value, 'span', null));
        }
        configElement.replaceChildren(...elements);
    }

    getIdFromName(configName) {
        return configName.replace(/[] #,\/]/g, '_');
    }
}

module.exports = { ConfigurationUI }
