'use strict';

const log  = require ('loglevel');
let jsdiff = require('diff');

const { createSpanElement } = require('./dom-utils')

const { MORSERINO_START, MORSERINO_END } = require('./m32protocol')
const { EVENT_M32_TEXT_RECEIVED } = require('./m32-communication-service');


class M32CwGeneratorUI {

    constructor(m32CommunicationService) {

        // define the elements
        this.receiveText = document.getElementById("receiveText");
        this.inputText = document.getElementById("inputText");

        this.showReceivedCheckbox = document.getElementById("showReceivedCheckbox");
        this.ignoreWhitespaceCheckbox = document.getElementById("ignoreWhitespaceCheckbox");
        this.autoHideCheckbox = document.getElementById("autoHideCheckbox");
        this.clearAllButton = document.getElementById("clearAllButton");
        this.clearReceivedButton = document.getElementById("clearReceivedButton");
        this.saveButton = document.getElementById("saveButton");

        this.resultComparison = document.getElementById("resultComparison");
        this.inputComparator = document.getElementById("inputComparator");
        this.correctPercentage = document.getElementById("correctPercentage");
        this.compareTextsButton = document.getElementById("compareTextsButton");

        this.lastPercentage;
        this.ignoreWhitespace = false;
        this.ignoreWhitespaceCheckbox.checked = this.ignoreWhitespace;

        this.showReceivedCheckbox.addEventListener('change', this.clickShowReceived.bind(this));
        this.ignoreWhitespaceCheckbox.addEventListener('change', this.clickIgnoreWhitespace.bind(this));
        this.clearAllButton.addEventListener('click', this.clearTextFields.bind(this));
        this.clearReceivedButton.addEventListener('click', this.clearReceivedTextField.bind(this));
        this.compareTextsButton.addEventListener('click', this.compareTexts.bind(this));
        this.saveButton.addEventListener('click', this.saveResult.bind(this));

        this.inputText.oninput = this.compareTexts.bind(this);

        this.m32CommunicationService = m32CommunicationService;
        this.m32CommunicationService.addEventListener(EVENT_M32_TEXT_RECEIVED, this.textReceived.bind(this));

    }

    textReceived(value) {
        this.receiveText.value += value;
        //Scroll to the bottom of the text field
        this.receiveText.scrollTop = this.receiveText.scrollHeight;
        this.compareTexts();
        this.applyAutoHide();    

    }

    applyAutoHide() {
        if (!this.autoHideCheckbox.checked) {
            return;
        }
        let text = this.receiveText.value;
        if (!text || text.length < MORSERINO_START.length) {
            return;
        }
        text = text.trim();
        if (this.showReceivedCheckbox.checked && text.startsWith(MORSERINO_START) && !text.endsWith(MORSERINO_END)) {
            this.showReceivedCheckbox.checked = false;
            this.showReceivedCheckbox.dispatchEvent(new Event('change'));
            log.debug('auto hiding text');
        }
        if (!this.showReceivedCheckbox.checked && text.startsWith(MORSERINO_START) && text.endsWith(MORSERINO_END)) {
            this.showReceivedCheckbox.checked = true;
            this.showReceivedCheckbox.dispatchEvent(new Event('change'));
            log.debug('auto unhiding text');
        }
    }


    clickShowReceived() {
        let shouldShow = this.showReceivedCheckbox.checked;
        log.debug('should show: ', shouldShow);
        if (shouldShow) {
            document.getElementById('morserino_detail').classList.add('show');
            this.resultComparison.classList.add('show');
        } else {
            document.getElementById('morserino_detail').classList.remove('show');
            this.resultComparison.classList.remove('show');
        }
    }
    
    clickIgnoreWhitespace() {
        this.ignoreWhitespace = this.ignoreWhitespaceCheckbox.checked;
        log.debug('ignore whitespace: ', this.ignoreWhitespace);
        this.compareTexts();
    }

    clearTextFields() {
        this.inputText.value = '';
        this.clearReceivedTextField();
    }
    
    clearReceivedTextField() {
        this.receiveText.value = '';
        this.inputComparator.innerHTML = '';
        this.correctPercentage.innerHTML = '';
    }

    compareTexts() {
        let received = this.trimReceivedText(this.receiveText.value).toLowerCase();
        let input = this.inputText.value.trim().toLowerCase();
    
        let [elements, correctCount, totalCount] = this.createHtmlForComparedText(received, input, this.ignoreWhitespace);
    
        this.inputComparator.replaceChildren(...elements);
        this.lastPercentage = received.length > 0 ? Math.round(correctCount / totalCount * 100) : 0;
        
        this.correctPercentage.innerText = 'Score: ' + correctCount + '/' + totalCount + ' correct (' + this.lastPercentage + '%)';
    }

    trimReceivedText(text) {
        text = text.trim();
        if (text.toLowerCase().startsWith(MORSERINO_START)) {
            text = text.substring(MORSERINO_START.length);
        }
        if (text.endsWith(' +')) {
            text = text.substring(0, text.length - MORSERINO_END.length);
        }
        return text;
    }
    
    // ------------------------------ compare text and create nice comparison html -------------------------------
    createHtmlForComparedText(received, input, ignoreWhitespace) {
        let elements = [];
        let correctCount = 0;

        if (ignoreWhitespace) {
            received = received.replace(/\s/g,'');
            input = input.replace(/\s/g,'');
        }

        let diff = jsdiff.diffChars(received, input);
        diff.forEach(function (part) {
            // green for additions, red for deletions
            // grey for common parts
            if (part.added) {
                elements.push(createSpanElement(part.value, 'wrong'))
            } else if (part.removed) {
                elements.push(createSpanElement(part.value, 'missing'))
            } else {
                correctCount += part.value.length;
                elements.push(createSpanElement(part.value, 'correct'))
            }
        });
        return [elements, correctCount, received.length];
    }

    saveResult() {
        // TODO
    }
}

module.exports = { M32CwGeneratorUI };