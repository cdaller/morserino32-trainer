'use strict';

const log  = require ('loglevel');
let jsdiff = require('diff');

const { createElement, createSpanElement, createElementWithChildren } = require('./dom-utils')

const { EVENT_M32_TEXT_RECEIVED, MORSERINO_START, MORSERINO_END } = require('./m32-communication-service');

class M32CwGeneratorUI {

    constructor(m32CommunicationService, m32Storage) {

        // define the elements
        this.receiveText = document.getElementById("receiveText");
        this.inputText = document.getElementById("inputText");

        this.showReceivedCheckbox = document.getElementById("showReceivedCheckbox");
        this.ignoreWhitespaceCheckbox = document.getElementById("ignoreWhitespaceCheckbox");
        this.autoHideCheckbox = document.getElementById("autoHideCheckbox");
        this.clearAllButton = document.getElementById("clearAllButton");
        this.clearReceivedButton = document.getElementById("clearReceivedButton");
        this.saveButton = document.getElementById("saveResultButton");
        document.getElementById("speakResultButton").addEventListener("click", this.speakResult.bind(this));

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

        document.getElementById("cw-generator-start-snapshot4-button").addEventListener('click', this.startSnapshot4.bind(this));
        document.getElementById("cw-generator-start-button").addEventListener('click', this.startCwGenerator.bind(this));        

        this.m32CommunicationService = m32CommunicationService;
        this.m32CommunicationService.addEventListener(EVENT_M32_TEXT_RECEIVED, this.textReceived.bind(this));
        this.m32State = this.m32CommunicationService.m32State; // FIXME: use event to publish change in m32State
        
        this.activeMode = true;

        this.savedResultChart = this.createSavedResultChart();

        this.m32Storage = m32Storage;
        this.showSavedResults(this.m32Storage.getSavedResults());
    }

    textReceived(value) {
        if (this.activeMode) {
            log.debug("cw-generator received text", value);
            this.receiveText.value += value;
            //Scroll to the bottom of the text field
            this.receiveText.scrollTop = this.receiveText.scrollHeight;
            this.compareTexts();
            this.applyAutoHide();    
        }
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

    speakResult() {
        let received = this.trimReceivedText(this.receiveText.value).toLowerCase();
        let input = this.inputText.value.trim().toLowerCase();
        let output = this.createVoiceTextForComparedText(received, input);

        output = [`${this.lastPercentage}% correct: `, ...output];

        this.m32CommunicationService.speechSynthesisHandler.speak(output.join('--'));
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

    modeSelected(mode) {
        this.activeMode = mode === 'cw-generator';
        log.debug("cw generator active", this.activeMode, mode);
    }

    setDebug(debug) {
        if (debug) {
            this.receiveText.readOnly = false;
            this.receiveText.onfocus = null;
        } else {
            this.receiveText.readOnly = true;
            this.receiveText.addEventListener('focus', function(event) {
                event.target.blur();
            });
        }
    }

    createVoiceTextForComparedText(received, input) {
        let elements = [];

        let diff = jsdiff.diffChars(received, input);
        let that = this;
        diff.forEach(function (part) {
            // green for additions, red for deletions
            // grey for common parts
            if (part.added) {
                let letters = that.m32CommunicationService.m32translations.phonetisize(part.value);
                elements.push(` wrong ${letters}`);
            } else if (part.removed) {
                let letters = that.m32CommunicationService.m32translations.phonetisize(part.value);
                elements.push(` missing ${letters}`);
            } else {
                let letters = that.m32CommunicationService.m32translations.phonetisize(part.value);
                elements.push(` correct ${letters}`);
            }
        });
        return elements;
    }


    // ------------------------------ handle save(d) result(s) -------------------------------
    saveResult() {
        let storedResults = this.m32Storage.getSavedResults();
        if (!storedResults) {
            storedResults = [];
        }
        let receivedText = this.trimReceivedText(this.receiveText.value);
        let input = this.inputText.value.trim();
        let result = {
            text: receivedText, 
            input: input, 
            percentage: this.lastPercentage, 
            date: Date.now(), 
            ignoreWhitespace: this.ignoreWhitespace,
            speedWpm: this.m32State ? this.m32State.speedWpm : null
        };
        storedResults.push(result);
        this.m32Storage.saveResults(storedResults);
        this.showSavedResults(storedResults);
    }


    showSavedResults(savedResults) {
        var that = this;

        let resultElement = document.getElementById('savedResults');


        if (savedResults) {
            let tableElement = createElement(null, 'table', 'table');
            let elements = savedResults
                            .map((result, index) => {
                let date = new Date(result.date);
                let rowElement = createElement(null, 'tr', null);
                let cells = [];

                let cellContent = [];
                cellContent.push(createSpanElement(result.text, null));
                cellContent.push(createElement(null, 'br', null));
                if (result.input) {
                    cellContent.push(createSpanElement(result.input, null));
                    cellContent.push(createElement(null, 'br', null));
                    let ignoreWhitespace = result.ignoreWhitespace || false;
                    // eslint-disable-next-line no-unused-vars
                    let [comparedElements, correctCount] = this.createHtmlForComparedText(result.text, result.input, ignoreWhitespace);
                    cellContent.push(...comparedElements);
                }

                let textCell = createElement(null, 'td', null);
                textCell.replaceChildren(...cellContent);
                cells.push(textCell);
                cells.push(createElement((result.percentage ? result.percentage + '%' : ''), 'td', null));
                cells.push(createElement((result.speedWpm ? result.speedWpm + 'wpm' : ''), 'td', null));
                cells.push(createElement((result.date ? ' ' + date.toLocaleDateString() + ' ' + date.toLocaleTimeString() : ''), 'td', null));

                let loadElement = createElement('Load', 'button', 'btn btn-outline-primary');
                loadElement.setAttribute('type', 'button');
                loadElement.setAttribute('data-toggle', 'tooltip');
                loadElement.setAttribute('title', 'Load text into input field for CW Keyer mode.')
                loadElement.onclick = ( function(_text) { 
                    return function() { 
                        that.inputText.value = _text;
                        document.getElementsByClassName('inputContainer')[0].scrollIntoView();
                    }
                })(result.text);
                // eslint-disable-next-line no-undef
                new bootstrap.Tooltip(loadElement, { trigger : 'hover' });

                let removeElement = createElement('Remove', 'button', 'btn btn-outline-danger');
                removeElement.setAttribute('type', 'button');
                removeElement.setAttribute('title', 'Remove result from saved results.')
                removeElement.onclick = ( function(_index) { 
                    return function() { 
                        that.removeStoredResult(_index); 
                    }
                })(index);
                // eslint-disable-next-line no-undef
                new bootstrap.Tooltip(removeElement, { trigger : 'hover' });

                let buttonCell = createElement(null, 'td', null);
                buttonCell.replaceChildren(loadElement, createElement(null, 'br', null), removeElement);
                cells.push(buttonCell);

                rowElement.replaceChildren(...cells);
                return rowElement;
            });
            elements = elements.reverse(); // order by date desc

            let headerRow = createElementWithChildren('tr', 
            createElement('Received/Input/Comparison', 'th', null), 
            createElement('Success', 'th', null),
            createElement('Speed', 'th', null),
            createElement('Date/Time', 'th', null),
            createElement('', 'th', null),
            );

            let tableElements = [];
            tableElements.push(createElementWithChildren('thead', headerRow));
            tableElements.push(createElementWithChildren('tbody', ...elements));
            tableElement.replaceChildren(...tableElements);

            resultElement.replaceChildren(tableElement);  

            this.drawSavedResultGraph(savedResults);
        }
        this.showHideSavedResultGraph(savedResults);
    }

    removeStoredResult(index) {
        let savedResults = this.m32Storage.getSavedResults();
        // remove element index from array:
        savedResults = savedResults.slice(0,index).concat(savedResults.slice(index + 1));
        this.m32Storage.saveResults(savedResults);
        this.showSavedResults(savedResults);
    }

    drawSavedResultGraph(savedResults) {
        console.log('Drawing stored result graph');
        let percentageValues = [];
        let speedWpm = [];
        let labels = [];
        // eslint-disable-next-line no-unused-vars
        savedResults.forEach((result, index) => {
            let date = new Date(result.date);
            var dateString = date.toLocaleDateString() + ' ' + date.toLocaleTimeString()
            labels.push(dateString);
            percentageValues.push(result.percentage);
            //console.log('speedwpm', index, result.speedWpm);
            speedWpm.push(result.speedWpm);
        });
        this.savedResultChart.data.labels = labels;
        this.savedResultChart.data.datasets[0].data = percentageValues;
        this.savedResultChart.data.datasets[1].data = speedWpm;
        if (!speedWpm.some(x => x)) {
            // if no speed info available, do not show speed axis and values
            this.savedResultChart.options.scales.y1.display = false;
            this.savedResultChart.options.plugins.legend.display = false;
        }
        this.savedResultChart.update();
    }
    
    showHideSavedResultGraph(savedResults) {
        let canvasElement = document.getElementById('savedResultChart');
        if (savedResults && savedResults.length > 0) {
            console.log('showing graph');
            canvasElement.style.display = 'block';
        } else {
            console.log('hiding graph');
            canvasElement.style.display = 'none';
        }
    }

    // ------------------------------ chart -------------------------------
    createSavedResultChart() {
        let ctx = document.getElementById('savedResultChart');
        // eslint-disable-next-line no-undef
        return new Chart(ctx, {
            type: 'line',
                    data: {
                        labels: [],
                        datasets: [
                        {
                            label: 'Score',
                            data: [],
                            borderColor: '#0d6efd', // same color as blue buttons
                            tension: 0.3,
                            yAxisID: 'y',
                        }, 
                        {
                            label: "Speed wpm",
                            data: [],
                            borderColor: 'red', 
                            yAxisID: 'y1',
                        }
                        ]
                    },
                    options: {
                        scales: {
                            y: {
                                ticks: {
                                    // eslint-disable-next-line no-unused-vars
                                    callback: function(value, index, ticks) {
                                        return value + '%';
                                    }
                                },
                                beginAtZero: true,
                            },
                            y1: {
                                position: 'right',
                                ticks: {
                                    // eslint-disable-next-line no-unused-vars
                                    callback: function(value, index, ticks) {
                                        return value + ' wpm';
                                    }
                                },
                                beginAtZero: false,
                                suggestedMin: 10,
                                suggestedMax: 25,
                                grid: {
                                    display: false
                                }
                            }
                        },
                        plugins: {
                            title: {
                                display: true,
                                text: 'Score',
                            },
                            legend: {
                                display: true,
                            },
                            tooltip: {
                                callbacks: {
                                    label: function(context) {
                                        var label = context.dataset.label || '';        
                                        if (label) {
                                            label += ': ';
                                        }
                                        if (context.parsed.y !== null) {
                                            label += context.parsed.y + '%';
                                        }
                                        return label;
                                    }
                                }
                            }
                        }
                    },

            });


    }
    
    startSnapshot4() {
        log.debug("starting snapshot 4");
        this.m32CommunicationService.sendM32Command('PUT menu/stop', false);
        this.m32CommunicationService.sendM32Command('PUT snapshot/recall/4', false);
        this.m32CommunicationService.sendM32Command('PUT menu/start', false);
    }

    startCwGenerator() {
        this.m32CommunicationService.sendM32Command('PUT menu/stop', false);
        this.m32CommunicationService.sendM32Command('PUT menu/start/20', false);
    }
}

module.exports = { M32CwGeneratorUI };