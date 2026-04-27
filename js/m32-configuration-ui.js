'use strict';

const log  = require ('loglevel');
const { createElement } = require('./dom-utils');

// taken from Willi's original code, but adapted to new config structure
// see https://github.com/oe1wkl/Morserino-32/blob/master/Software/Utilities/m32_config_tool.html
var CONFIGURATION_GROUPS=[
  {name:'General',icon:'⚙',params:['Encoder Click','Tone Pitch','Time-out','Quick Start','Output Case','Headphone Output','Theme','BLT Kbd Output','Serial Output']},
  {name:'Key, Paddles & Keyer',icon:'🔑',params:['Paddle Polar.','External Pol.','Keyer Mode','CurtisB DahT%','CurtisB DitT%','AutoChar Spc','Latency']},
  {name:'CW Generation',icon:'📡',params:['Interchar Spc','InterWord Spc','Random Groups','Length Rnd Gr','Length Calls','Calls Region','Call Prefixes','Length Abbrev','Length Words','Max # of Words','Stop<Next>Rep','CW Gen Displ','Randomize File','Each Word 2x']},
  {name:'Echo Trainer',icon:'🔊',params:['Echo Prompt','Echo Repeats','Confrm. Tone','Tone Shift','Adaptv. Speed','Echo Speed Max']},
  {name:'Transmitting & Decoding',icon:'📻',params:['Key ext TX','Generator Tx','Trx Channel','Bandwidth','Decoded on IO']},
  {name:'Koch Character Sequence',icon:'📖',params:['Koch Sequence','LICW Carousel']},
  {name:'Games',icon:'🎮',params:['Invader Orient.']}
];

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

        document.getElementById('m32-config-snapshot-button-store').addEventListener('click', this.storeSnapshot.bind(this));
        
        document.getElementById('m32-config-cw-school-setup-snaphot1-button').addEventListener('click', this.setupCwSchoolSnapshot1.bind(this));
        document.getElementById('m32-config-cw-school-setup-snaphot2-button').addEventListener('click', this.setupCwSchoolSnapshot2.bind(this));
        document.getElementById('m32-config-cw-school-setup-snaphot3-button').addEventListener('click', this.setupCwSchoolSnapshot3.bind(this));
        document.getElementById('m32-config-cw-school-setup-snaphot4-button').addEventListener('click', this.setupCwSchoolSnapshot4.bind(this));
        document.getElementById('m32-config-cw-school-setup-snaphot4-koch-button').addEventListener('click', this.setupCwSchoolSnapshot4Koch.bind(this));
        document.getElementById('m32-config-cw-school-setup-snaphot5-button').addEventListener('click', this.setupCwSchoolSnapshot5.bind(this));
        document.getElementById('m32-config-cw-school-setup-snaphot6-button').addEventListener('click', this.setupCwSchoolSnapshot6.bind(this));
        document.getElementById('m32-config-cw-school-setup-snaphot6-koch-button').addEventListener('click', this.setupCwSchoolSnapshot6Koch.bind(this));
        document.getElementById('m32-config-cw-school-setup-snapshot7-button').addEventListener('click', this.setupCwSchoolSnapshot7.bind(this));
        document.getElementById('m32-config-cw-school-setup-snapshot7-koch-button').addEventListener('click', this.setupCwSchoolSnapshot7Koch.bind(this));
        document.getElementById('m32-config-cw-school-setup-snapshot8-button').addEventListener('click', this.setupCwSchoolSnapshot8.bind(this));
        document.getElementById('m32-config-cw-school-setup-snapshot8-koch-button').addEventListener('click', this.setupCwSchoolSnapshot8Koch.bind(this));
        
        document.getElementById('m32-device-info-button').addEventListener('click', this.requestDeviceInfo.bind(this));

        this.snapshotRecallButton = document.getElementById('m32-config-snapshot-button-recall');
        this.snapshotRecallButton.addEventListener('click', this.recallSnapshotClicked.bind(this));
        this.snapshotClearButton = document.getElementById('m32-config-snapshot-button-clear');
        this.snapshotClearButton.addEventListener('click', this.clearSnapshotClicked.bind(this));
    }

    readConfigs() {
        this.m32CommunicationService.sendM32Command('GET wifi');
        this.m32CommunicationService.sendM32Command('GET snapshots');
        this.m32CommunicationService.sendM32Command('GET configs'); // triggers a handleM32Object callback
        this.m32CommunicationService.sendM32Command('GET kochlesson');
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
                        this.initGroupContainers();
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
                case 'device':
                    if (this.configRootElement) {
                        console.log(value);
                        this.receivedDevice(value);
                    }
                    break;
                case 'customchars':
                    if (this.configRootElement) {
                        this.receivedCustomChars(value);
                    }
                    break;
                case 'kochlesson':
                    if (this.configRootElement) {
                        this.receivedKochLesson(value);
                    }
                    break;

                }
        } else {
            console.log('cannot handle json', jsonObject);
        }
    }

    initGroupContainers() {
        this.configRootElement.innerHTML = '';
        this.groupContainers = {};

        for (let group of CONFIGURATION_GROUPS) {
            let groupDiv = createElement(null, 'div', 'mb-4');
            let heading = createElement(`${group.icon} ${group.name}`, 'h4', 'border-bottom pb-1 mt-3');
            groupDiv.appendChild(heading);
            let paramsDiv = createElement(null, 'div', null);
            groupDiv.appendChild(paramsDiv);
            if (group.name === 'Koch Character Sequence') {
                this.kochExtrasContainer = createElement(null, 'div', null);
                groupDiv.appendChild(this.kochExtrasContainer);
            }
            this.configRootElement.appendChild(groupDiv);
            this.groupContainers[group.name] = paramsDiv;
        }

        this.createCustomCharsUI();
        this.createKochLessonUI();

        this.otherGroupDiv = createElement(null, 'div', 'mb-4 d-none');
        this.otherGroupDiv.appendChild(createElement('Others', 'h4', 'border-bottom pb-1 mt-3'));
        let otherParamsDiv = createElement(null, 'div', null);
        this.otherGroupDiv.appendChild(otherParamsDiv);
        this.configRootElement.appendChild(this.otherGroupDiv);
        this.groupContainers['__other__'] = otherParamsDiv;
    }

    createCustomCharsUI() {
        let container = this.kochExtrasContainer;
        if (!container) return;

        let rowDiv = createElement(null, 'div', 'row d-none');
        rowDiv.id = 'custom-chars-row';

        let titleColumn = createElement(null, 'div', 'col-md-6');
        titleColumn.replaceChildren(
            createElement('Custom Characters', 'h4', null),
            createElement('Characters used in the custom Koch sequence', 'p', null)
        );

        let inputGroupDiv = createElement(null, 'div', 'col-md-4');
        let inputGroup = createElement(null, 'div', 'input-group');
        let inputEl = createElement(null, 'input', 'form-control');
        inputEl.type = 'text';
        inputEl.id = 'm32-custom-chars-input';
        let saveButton = createElement('Save', 'button', 'btn btn-primary');
        saveButton.addEventListener('click', this.saveCustomChars.bind(this));
        inputGroup.replaceChildren(inputEl, saveButton);
        inputGroupDiv.appendChild(inputGroup);

        rowDiv.replaceChildren(titleColumn, inputGroupDiv);
        container.appendChild(rowDiv);
    }

    setCustomCharsVisible(visible) {
        let row = document.getElementById('custom-chars-row');
        if (row) {
            row.classList.toggle('d-none', !visible);
        }
    }

    receivedCustomChars(value) {
        let input = document.getElementById('m32-custom-chars-input');
        if (input) {
            input.value = value['characters'] || '';
        }
    }

    saveCustomChars() {
        let input = document.getElementById('m32-custom-chars-input');
        if (!input) return;
        let chars = input.value.replace(/\s/g, '');
        this.m32CommunicationService.sendM32Command(`PUT customchars/set/${chars}`, false);
    }

    createKochLessonUI() {
        let container = this.kochExtrasContainer;
        if (!container) return;

        let rowDiv = createElement(null, 'div', 'row mt-3');
        rowDiv.id = 'koch-lesson-row';

        let titleColumn = createElement(null, 'div', 'col-md-6');
        titleColumn.replaceChildren(
            createElement('Koch Lesson', 'h4', null),
            createElement('Selected lesson — determines which characters are active in the Koch sequence', 'p', null)
        );

        let controlDiv = createElement(null, 'div', 'col-md-4');
        let inputGroup = createElement(null, 'div', 'input-group');
        let inputEl = createElement(null, 'input', 'form-control');
        inputEl.type = 'number';
        inputEl.id = 'm32-koch-lesson-input';
        inputEl.min = 1;
        inputEl.addEventListener('input', this.onKochLessonInput.bind(this));
        let saveButton = createElement('Save', 'button', 'btn btn-primary');
        saveButton.addEventListener('click', this.saveKochLesson.bind(this));
        inputGroup.replaceChildren(inputEl, saveButton);

        let charsDisplay = createElement(null, 'div', 'mt-2 font-monospace');
        charsDisplay.id = 'm32-koch-lesson-chars';

        controlDiv.replaceChildren(inputGroup, charsDisplay);
        rowDiv.replaceChildren(titleColumn, controlDiv);
        container.appendChild(rowDiv);
    }

    receivedKochLesson(value) {
        this.kochLessonCharacters = value['characters'] || [];
        let input = document.getElementById('m32-koch-lesson-input');
        if (input) {
            input.min = value['minimum'] || 1;
            input.max = value['maximum'] || this.kochLessonCharacters.length;
            input.value = value['value'];
        }
        this.updateKochLessonCharsDisplay(value['value']);
    }

    onKochLessonInput(event) {
        this.updateKochLessonCharsDisplay(parseInt(event.target.value));
    }

    updateKochLessonCharsDisplay(lessonNumber) {
        let display = document.getElementById('m32-koch-lesson-chars');
        if (!display || !this.kochLessonCharacters) return;
        let active = this.kochLessonCharacters.slice(0, lessonNumber);
        display.textContent = active.join(' ');
    }

    saveKochLesson() {
        let input = document.getElementById('m32-koch-lesson-input');
        if (!input) return;
        this.m32CommunicationService.sendM32Command(`PUT kochlesson/${input.value}`, false);
        this.m32CommunicationService.sendM32Command('GET kochlesson');
    }

    findGroupContainer(configName) {
        for (let group of CONFIGURATION_GROUPS) {
            if (group.params.includes(configName)) {
                return this.groupContainers[group.name];
            }
        }
        this.otherGroupDiv.classList.remove('d-none');
        return this.groupContainers['__other__'];
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
            this.findGroupContainer(config.name).appendChild(configElement);

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
        //if (config.displayed) {
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
        //}

        if (config.name === 'Koch Sequence') {
            let displayValue = config.displayed
                || (config.isMapped ? config.mappedValues[config.value] : config.value.toString());
            let isCustom = displayValue === 'Custom Chars';
            this.setCustomCharsVisible(isCustom);
            if (isCustom) this.m32CommunicationService.sendM32Command('GET customchars');
            this.m32CommunicationService.sendM32Command('GET kochlesson');
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

        if (configName === 'Koch Sequence') {
            let config = this.configMap[configName];
            let displayValue = config && config.isMapped ? config.mappedValues[parseInt(value)] : value;
            let isCustom = displayValue === 'Custom Chars';
            this.setCustomCharsVisible(isCustom);
            if (isCustom) this.m32CommunicationService.sendM32Command('GET customchars');
            this.m32CommunicationService.sendM32Command('GET kochlesson');
        }
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
        this.snapshotClearButton.disabled = false;
    }

    recallSnapshotClicked() {
        let selectedOption = document.getElementById('m32-config-snapshots-select');
        let snapshotId = selectedOption.value;
        if (snapshotId) {
            log.debug("recall snapshot", snapshotId);
            this.m32CommunicationService.sendM32Command('PUT menu/stop', false);
            this.m32CommunicationService.sendM32Command("PUT snapshot/recall/" + snapshotId, false);
            // read new configuration:
            this.m32CommunicationService.sendM32Command("GET configs");
        }
    }

    clearSnapshotClicked() {
        let selectedOption = document.getElementById('m32-config-snapshots-select');
        let snapshotId = selectedOption.value;
        if (snapshotId) {
            log.debug("clear snapshot", snapshotId);
            this.m32CommunicationService.sendM32Command("PUT snapshot/clear/" + snapshotId, false);
            // read new configuration:
            this.m32CommunicationService.sendM32Command("GET snapshots");
        }
    }

    storeSnapshot() {
        let selectedOption = document.getElementById('m32-config-snapshots-store-select');
        let snapshotId = selectedOption.value;
        if (snapshotId) {
            log.debug("store snapshot", snapshotId);
            this.m32CommunicationService.sendM32Command("PUT snapshot/store/" + snapshotId, false);
            // read new configuration:
            this.m32CommunicationService.sendM32Command("GET snapshots");
        }
    }


    setupCwSchoolSnapshot1() {
        // snapshot 1
        log.debug('configure snapshots 1');
        this.m32CommunicationService.sendM32Command("PUT menu/set/20"); // Koch Trainer / CW Generator/Random
        this.m32CommunicationService.sendM32Command("PUT config/InterWord Spc/30", false);
        this.m32CommunicationService.sendM32Command("PUT config/Interchar Spc/3", false);
        this.m32CommunicationService.sendM32Command("PUT config/Random Groups/0", false); // All Chars
        this.m32CommunicationService.sendM32Command("PUT config/Length Rnd Gr/1", false);
        this.m32CommunicationService.sendM32Command("PUT config/Each Word 2x/0", false);
        this.m32CommunicationService.sendM32Command("PUT config/Max # of Words/20", false);
        this.m32CommunicationService.sleep(1000);
        this.m32CommunicationService.sendM32Command("PUT snapshot/store/1", false);

        this.m32CommunicationService.sendM32Command("GET snapshots");
        this.m32CommunicationService.sendM32Command("GET configs");
    }

    setupCwSchoolSnapshot2() {
        log.debug('configure snapshots for CW Schule Graz');
        // snapshot 2
        log.debug('configure snapshots 2');
        this.m32CommunicationService.sendM32Command("PUT menu/set/17"); // Koch Trainer/Select Lesson
        this.m32CommunicationService.sendM32Command("PUT config/InterWord Spc/7", false);
        this.m32CommunicationService.sendM32Command("PUT config/Interchar Spc/3", false);
        this.m32CommunicationService.sendM32Command("PUT config/Random Groups/0", false); // All Chars
        this.m32CommunicationService.sendM32Command("PUT config/Time-out/0", false);
        this.m32CommunicationService.sendM32Command("PUT config/Each Word 2x/0", false);
        this.m32CommunicationService.sleep(1000);
        this.m32CommunicationService.sendM32Command("PUT snapshot/store/2", false);

        this.m32CommunicationService.sendM32Command("GET snapshots");
        this.m32CommunicationService.sendM32Command("GET configs");
    }

    setupCwSchoolSnapshot3() {
        // snapshot 3
        log.debug('configure snapshots 3');
        //this.m32CommunicationService.sendM32Command("PUT menu/set/25"); // Koch Trainer/Echo Trainer/Random
        this.m32CommunicationService.sendM32Command("PUT menu/set/29"); // Koch Trainer/Echo Trainer/Adapt. Rand.
        this.m32CommunicationService.sendM32Command("PUT config/InterWord Spc/7", false);
        this.m32CommunicationService.sendM32Command("PUT config/Interchar Spc/3", false);
        this.m32CommunicationService.sendM32Command("PUT config/Random Groups/0", false); // All Chars
        this.m32CommunicationService.sendM32Command("PUT config/Length Rnd Gr/1", false); // 2-5
        this.m32CommunicationService.sendM32Command("PUT config/Each Word 2x/0", false);
        this.m32CommunicationService.sendM32Command("PUT config/Max # of Words/20", false);
        this.m32CommunicationService.sleep(1000);
        this.m32CommunicationService.sendM32Command("PUT snapshot/store/3", false);

        this.m32CommunicationService.sendM32Command("GET snapshots");
        this.m32CommunicationService.sendM32Command("GET configs");
    }

    setupCwSchoolSnapshot4() {
        // snapshot 4
        log.debug('configure snapshots 4');
        this.m32CommunicationService.sendM32Command("PUT menu/set/20"); // Koch Trainer/CW Generator/Random
        this.m32CommunicationService.sendM32Command("PUT config/InterWord Spc/45", false);
        this.m32CommunicationService.sendM32Command("PUT config/Interchar Spc/15", false);
        this.m32CommunicationService.sendM32Command("PUT config/Random Groups/0", false); // All Chars
        this.m32CommunicationService.sendM32Command("PUT config/Length Rnd Gr/9", false);
        this.m32CommunicationService.sendM32Command("PUT config/Each Word 2x/0", false);
        this.m32CommunicationService.sendM32Command("PUT config/Max # of Words/15", false);
        this.m32CommunicationService.sleep(1000);
        this.m32CommunicationService.sendM32Command("PUT snapshot/store/4", false);

        this.m32CommunicationService.sendM32Command("GET snapshots");
        this.m32CommunicationService.sendM32Command("GET configs");
    }

    setupCwSchoolSnapshot4Koch() {
        // snapshot 4
        log.debug('configure snapshots 4');
        this.m32CommunicationService.sendM32Command("PUT menu/set/20"); // Koch Trainer/CW Generator/Random
        this.m32CommunicationService.sendM32Command("PUT config/InterWord Spc/6", false);
        this.m32CommunicationService.sendM32Command("PUT config/Interchar Spc/3", false);
        this.m32CommunicationService.sendM32Command("PUT config/Random Groups/0", false); // All Chars
        this.m32CommunicationService.sendM32Command("PUT config/Length Rnd Gr/9", false);
        this.m32CommunicationService.sendM32Command("PUT config/Each Word 2x/0", false);
        this.m32CommunicationService.sendM32Command("PUT config/Max # of Words/15", false);
        this.m32CommunicationService.sleep(1000);
        this.m32CommunicationService.sendM32Command("PUT snapshot/store/4", false);

        this.m32CommunicationService.sendM32Command("GET snapshots");
        this.m32CommunicationService.sendM32Command("GET configs");
    }

    setupCwSchoolSnapshot5() {
        // snapshot 5
        log.debug('configure snapshots 5');
        this.m32CommunicationService.sendM32Command("PUT menu/set/1"); // CW Keyer
        this.m32CommunicationService.sleep(1000);
        this.m32CommunicationService.sendM32Command("PUT snapshot/store/5", false);

        this.m32CommunicationService.sendM32Command("GET snapshots");
        this.m32CommunicationService.sendM32Command("GET configs");
    }
    
    setupCwSchoolSnapshot6() {
        // snapshot 6
        log.debug('configure snapshots 6');
        this.m32CommunicationService.sendM32Command("PUT menu/set/26"); // Koch Trainer/Echo Trainer/CW Abbrevs
        this.m32CommunicationService.sendM32Command("PUT config/InterWord Spc/7", false);
        this.m32CommunicationService.sendM32Command("PUT config/Interchar Spc/15", false);
        this.m32CommunicationService.sendM32Command("PUT config/Random Groups/0", false); // All Chars
        this.m32CommunicationService.sendM32Command("PUT config/Length Abbrev/2", false);
        this.m32CommunicationService.sendM32Command("PUT config/Each Word 2x/0", false);
        this.m32CommunicationService.sendM32Command("PUT config/Max # of Words/20", false);
        this.m32CommunicationService.sendM32Command("PUT snapshot/store/6", false);

        this.m32CommunicationService.sendM32Command("GET snapshots");
        this.m32CommunicationService.sendM32Command("GET configs");
    }

    setupCwSchoolSnapshot6Koch() {
        // snapshot 6
        log.debug('configure snapshots 6');
        this.m32CommunicationService.sendM32Command("PUT menu/set/26"); // Koch Trainer/Echo Trainer/CW Abbrevs
        this.m32CommunicationService.sendM32Command("PUT config/InterWord Spc/6", false);
        this.m32CommunicationService.sendM32Command("PUT config/Interchar Spc/3", false);
        this.m32CommunicationService.sendM32Command("PUT config/Random Groups/0", false); // All Chars
        this.m32CommunicationService.sendM32Command("PUT config/Length Abbrev/2", false);
        this.m32CommunicationService.sendM32Command("PUT config/Each Word 2x/0", false);
        this.m32CommunicationService.sendM32Command("PUT config/Max # of Words/20", false);
        this.m32CommunicationService.sendM32Command("PUT snapshot/store/6", false);

        this.m32CommunicationService.sendM32Command("GET snapshots");
        this.m32CommunicationService.sendM32Command("GET configs");
    }

    setupCwSchoolSnapshot7() {
        // snapshot 7
        log.debug('configure snapshots 7');
        this.m32CommunicationService.sendM32Command("PUT menu/set/8"); // CW Generator/File Player
        this.m32CommunicationService.sendM32Command("PUT config/InterWord Spc/45", false);
        this.m32CommunicationService.sendM32Command("PUT config/Interchar Spc/15", false);
        this.m32CommunicationService.sendM32Command("PUT config/Each Word 2x/1", false);
        this.m32CommunicationService.sendM32Command("PUT config/Max # of Words/0", false);
        this.m32CommunicationService.sendM32Command("PUT snapshot/store/7", false);
        
        this.m32CommunicationService.sendM32Command("GET snapshots");
        this.m32CommunicationService.sendM32Command("GET configs");
    }

    setupCwSchoolSnapshot7Koch() {
        // snapshot 7
        log.debug('configure snapshots 7');
        this.m32CommunicationService.sendM32Command("PUT menu/set/8"); // CW Generator/File Player
        this.m32CommunicationService.sendM32Command("PUT config/InterWord Spc/6", false);
        this.m32CommunicationService.sendM32Command("PUT config/Interchar Spc/3", false);
        this.m32CommunicationService.sendM32Command("PUT config/Each Word 2x/1", false);
        this.m32CommunicationService.sendM32Command("PUT config/Max # of Words/0", false);
        this.m32CommunicationService.sendM32Command("PUT snapshot/store/7", false);
        
        this.m32CommunicationService.sendM32Command("GET snapshots");
        this.m32CommunicationService.sendM32Command("GET configs");
    }

    setupCwSchoolSnapshot8() {
        // snapshot 8
        log.debug('configure snapshots 8');
        this.m32CommunicationService.sendM32Command("PUT menu/set/13"); // Echo Trainer / Callsigns
        this.m32CommunicationService.sendM32Command("PUT config/InterWord Spc/45", false);
        this.m32CommunicationService.sendM32Command("PUT config/Interchar Spc/15", false);
        this.m32CommunicationService.sendM32Command("PUT config/Length Calls/1", false); // length = 3
        this.m32CommunicationService.sendM32Command("PUT config/Each Word 2x/1", false);
        this.m32CommunicationService.sendM32Command("PUT config/Max # of Words/0", false);
        this.m32CommunicationService.sendM32Command("PUT snapshot/store/8", false);
        
        this.m32CommunicationService.sendM32Command("GET snapshots");
        this.m32CommunicationService.sendM32Command("GET configs");
    }

    setupCwSchoolSnapshot8Koch() {
        // snapshot 8
        log.debug('configure snapshots 8');
        this.m32CommunicationService.sendM32Command("PUT menu/set/13"); // Echo Trainer / Callsigns
        this.m32CommunicationService.sendM32Command("PUT config/InterWord Spc/6", false);
        this.m32CommunicationService.sendM32Command("PUT config/Interchar Spc/3", false);
        this.m32CommunicationService.sendM32Command("PUT config/Length Calls/1", false); // length = 3
        this.m32CommunicationService.sendM32Command("PUT config/Each Word 2x/1", false);
        this.m32CommunicationService.sendM32Command("PUT config/Max # of Words/0", false);
        this.m32CommunicationService.sendM32Command("PUT snapshot/store/8", false);
        
        this.m32CommunicationService.sendM32Command("GET snapshots");
        this.m32CommunicationService.sendM32Command("GET configs");
    }

    requestDeviceInfo() {
        this.m32CommunicationService.sendM32Command("GET device");
    }

    receivedDevice(value) {
        let message = 'Hardware: ' + value['hardware'] + ', Firmware: ' + value['firmware'];
        document.getElementById('m32-config-device-info').innerHTML = message;
    }
}

module.exports = { ConfigurationUI }
