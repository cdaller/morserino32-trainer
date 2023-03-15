

let jsdiff = require('diff');
let Charts = require('chart.js');
const ReRegExp = require('reregexp').default;

// speech & m3 protocol handler
var m32Language = 'en';
const m32State = new M32State();
const speechSynthesisHandler = new M32CommandSpeechHandler(m32Language);
const commandUIHandler = new M32CommandUIHandler(m32Language);
const m32Protocolhandler = new M32ProtocolHandler([new M32CommandStateHandler(m32State), commandUIHandler, speechSynthesisHandler]);

// some constants

let VERSION = '0.5.0-beta5';
let STORAGE_KEY = 'morserino-trainer';
let STORAGE_KEY_SETTINGS = 'morserino-trainer-settings';

const MORSERINO_START = 'vvv<ka> ';
const MORSERINO_END = ' +';

const MODE_ECHO_TRAINER = 'echo-trainer';
const MODE_CW_GENERATOR = 'cw-generator';
const MODE_QSO_TRAINER = 'qso-trainer';
let mode = MODE_CW_GENERATOR;

const QSO_WAIT_TIME_MS = 2000; // wait ms after receiving 'kn' to answer

// define the elements
let receiveText = document.getElementById("receiveText");
let inputText = document.getElementById("inputText");
let connectButton = document.getElementById("connectButton");
let voiceOutputCheckbox = document.getElementById("voiceOutputCheckbox");
let voiceOutputEnabled = true;

let showReceivedCheckbox = document.getElementById("showReceivedCheckbox");
let ignoreWhitespaceCheckbox = document.getElementById("ignoreWhitespaceCheckbox");
let autoHideCheckbox = document.getElementById("autoHideCheckbox");
let statusBar = document.getElementById("statusBar");
let clearAllButton = document.getElementById("clearAllButton");
let clearReceivedButton = document.getElementById("clearReceivedButton");
let saveButton = document.getElementById("saveButton");

let resultComparison = document.getElementById("resultComparison");
let inputComparator = document.getElementById("inputComparator");
let correctPercentage = document.getElementById("correctPercentage");
let compareTextsButton = document.getElementById("compareTextsButton");

let lastPercentage;
let ignoreWhitespace = false;
ignoreWhitespaceCheckbox.checked = ignoreWhitespace;

let receiveTextEchoTrainer = document.getElementById("receiveTextEchoTrainer");
let clearEchoTrainerButton = document.getElementById("clearEchoTrainerButton");
let showAllAbbreviationsButton = document.getElementById("showAllAbbreviationsButton");

let receiveTextQsoTrainer = document.getElementById("receiveTextQsoTrainer");
let clearQsoTrainerButton = document.getElementById("clearQsoTrainerButton");
let autoKeyQsoTrainerButton = document.getElementById("autoKeyQsoTrainerButton");
let qsoMessages = document.getElementById("qsoMessages");
let inputTextQsoTrainer = document.getElementById("inputTextQsoTrainer");
let inputTextQsoTrainerButton = document.getElementById("inputTextQsoTrainerButton");
let clearInputTextQsoTrainerButton = document.getElementById("clearInputTextQsoTrainerButton");
let qsoWpmSelect = document.getElementById("qsoWpmSelect");
let qsoEwsSelect = document.getElementById("qsoEwsSelect");
let qsoElsSelect = document.getElementById("qsoElsSelect");
let qsoRptWordsCheckbox = document.getElementById("qsoRptWordsCheckbox");
let testCwSettingsPlayButton = document.getElementById("testCwSettingsPlayButton");
let testCwSettingsStopButton = document.getElementById("testCwSettingsStopButton");

let autoQsoCallsign;
let autoQsoCallsignBot;
let autoQsoMessages;
let qsoCallSign;
let qsoName;
let qsoQth;
let qsoCallSignBot;
let autoKeyQsoIndex;
let qsoRptWords = qsoRptWordsCheckbox.checked;
clearQsoTrainerFields();

// after page is loaded, set version string from javascript:
document.addEventListener("DOMContentLoaded", function() {
    document.getElementById("versionSpan").textContent = VERSION;
});


let serialCommunicationavailable = navigator.serial !== undefined;
//console.log("serial communication available", serialCommunicationavailable);
if (!serialCommunicationavailable) {
    disableSerialCommunication();
} 

// --------------- chart template -----------------
let ctx = document.getElementById('savedResultChart');
let savedResultChart = new Chart(ctx, {
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
                            callback: function(value, index, ticks) {
                                return value + '%';
                            }
                        },
                        beginAtZero: true,
                    },
                    y1: {
                        position: 'right',
                        ticks: {
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

// enable bootstrap tooltips everywhere:    
var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
    return new bootstrap.Tooltip(tooltipTriggerEl, { trigger : 'hover' });
});    

showSavedResults(JSON.parse(localStorage.getItem(STORAGE_KEY)));

// couple the elements to the Events
connectButton.addEventListener('click', clickConnect)
voiceOutputCheckbox.addEventListener('change', clickVoiceOutputReceived);

showReceivedCheckbox.addEventListener('change', clickShowReceived);
ignoreWhitespaceCheckbox.addEventListener('change', clickIgnoreWhitespace);
clearAllButton.addEventListener('click', clearTextFields);
clearReceivedButton.addEventListener('click', clearReceivedTextField);
compareTextsButton.addEventListener('click', compareTexts);
saveButton.addEventListener('click', saveResult);

inputText.oninput = compareTexts;
clearEchoTrainerButton.addEventListener('click', clearEchoTrainerFields);
showAllAbbreviationsButton.addEventListener('click', showAllAbbreviations);

clearQsoTrainerButton.addEventListener('click', clearQsoTrainerFields);
autoKeyQsoTrainerButton.addEventListener('click', autoKeyQso);
inputTextQsoTrainerButton.addEventListener('click', moveQsoInputTextToMessages);
clearInputTextQsoTrainerButton.addEventListener('click', function() {
    inputTextQsoTrainer.value = '';
});
qsoRptWordsCheckbox.addEventListener('change', function(event) {
    console.log(event);
    qsoRptWords = event.target.checked;
    console.log('qsoRptWords', qsoRptWords);
    setCwSettingsInUILabels();
    saveSettings();
});
qsoWpmSelect.addEventListener('change', function(event) {
    cwPlayerWpm = event.target.value;
    setCwPlayerSettings();
    setCwSettingsInUILabels();
    saveSettings();
});
qsoEwsSelect.addEventListener('change', function(event) {
    cwPlayerEws = event.target.value;
    setCwPlayerSettings();
    setCwSettingsInUILabels();
    saveSettings();
});
qsoElsSelect.addEventListener('change', function(event) {
    cwPlayerEls = event.target.value;
    setCwPlayerSettings();
    setCwSettingsInUILabels();
    saveSettings();
});

let urlParams = new URLSearchParams(window.location.search);
let paramMode = urlParams.get('mode');
if (paramMode) {
    console.log('setting mode from url params:', paramMode);
    openTabForMode(paramMode);
}
if (urlParams.get('debug') !== null) {
    console.log('debug mode enabled!');
    receiveTextQsoTrainer.addEventListener('input', function(event) {
        detectQso();
    });
} else {
    // disable editing of morserino input fields
    console.log('debug mode disabled!');
    receiveTextEchoTrainer.readonly = true;
    receiveTextEchoTrainer.onfocus = null;
    receiveTextQsoTrainer.readonly = true;
    receiveTextQsoTrainer.addEventListener('focus', function(event) {
        event.target.blur();
    });
}
let paramM32Language = urlParams.get('m32language');
if (paramM32Language) {
    console.log('setting m32language to ', paramM32Language);
    speechSynthesisHandler.setLanguage(paramM32Language);
    commandUIHandler.setLanguage(paramM32Language);
}

//When the connectButton is pressed
async function clickConnect() {
    if (port) {
        //if already connected, disconnect
        disconnect();

    } else {
        //otherwise connect
        await connect();
    }
}

function clickVoiceOutputReceived() {
    voiceOutputEnabled = voiceOutputCheckbox.checked;
    saveSettings();
}

// ------------------------------ cw generator code ------------------------------
function clickShowReceived() {
    let shouldShow = showReceivedCheckbox.checked;
    console.log('should show: ', shouldShow);
    if (shouldShow) {
        document.getElementById('morserino_detail').classList.add('show');
        resultComparison.classList.add('show');
    } else {
        document.getElementById('morserino_detail').classList.remove('show');
        resultComparison.classList.remove('show');
    }
}

function clickIgnoreWhitespace() {
    ignoreWhitespace = ignoreWhitespaceCheckbox.checked;
    console.log('ignore whitespace: ', ignoreWhitespace);
    compareTexts();
}

function applyAutoHide() {
    if (!autoHideCheckbox.checked) {
        return;
    }
    let text = receiveText.value;
    if (!text || text.length < MORSERINO_START.length) {
        return;
    }
    text = text.trim();
    if (showReceivedCheckbox.checked && text.startsWith(MORSERINO_START) && !text.endsWith(MORSERINO_END)) {
        showReceivedCheckbox.checked = false;
        showReceivedCheckbox.dispatchEvent(new Event('change'));
        console.log('auto hiding text');
    }
    if (!showReceivedCheckbox.checked && text.startsWith(MORSERINO_START) && text.endsWith(MORSERINO_END)) {
        showReceivedCheckbox.checked = true;
        showReceivedCheckbox.dispatchEvent(new Event('change'));
        console.log('auto unhiding text');
    }
}

// ------------------------------ compare text and create nice comparison html -------------------------------
function compareTexts() {
    let received = trimReceivedText(receiveText.value).toLowerCase();
    let input = inputText.value.trim().toLowerCase();

    let [elements, correctCount, totalCount] = createHtmlForComparedText(received, input, ignoreWhitespace);

    inputComparator.replaceChildren(...elements);
    lastPercentage = received.length > 0 ? Math.round(correctCount / totalCount * 100) : 0;
    
    correctPercentage.innerText = 'Score: ' + correctCount + '/' + totalCount + ' correct (' + lastPercentage + '%)';
}

function createHtmlForComparedText(received, input, ignoreWhitespace) {
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

function trimReceivedText(text) {
    text = text.trim();
    if (text.toLowerCase().startsWith(MORSERINO_START)) {
        text = text.substring(MORSERINO_START.length);
    }
    if (text.endsWith(' +')) {
        text = text.substring(0, text.length - MORSERINO_END.length);
    }
    return text;
}

function createSpanElement(value, clasz) {
    return createElement(value, 'span', clasz);
}

function createElement(value, tag, classes) {
    let element = document.createElement(tag);
    if (classes) {
        classes.split(' ').forEach(clasz => {
            element.classList.add(clasz);    
        });
    }
    element.innerHTML = value;
    return element;
}

function createElementWithChildren(tag, ...children) {
    let element = document.createElement(tag);
    element.replaceChildren(...children);
    return element;
}

function clearTextFields() {
    inputText.value = '';
    clearReceivedTextField();
}

function clearReceivedTextField() {
    receiveText.value = '';
    inputComparator.innerHTML = '';
    correctPercentage.innerHTML = '';
}

// ------------------------------ handle save(d) result(s) -------------------------------
function saveResult() {
    let storedResults = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!storedResults) {
        storedResults = [];
    }
    let receivedText = trimReceivedText(receiveText.value);
    let input = inputText.value.trim();
    let result = {
        text: receivedText, 
        input: input, 
        percentage: lastPercentage, 
        date: Date.now(), 
        ignoreWhitespace: ignoreWhitespace,
        speedWpm: m32State.speedWpm
    };
    storedResults.push(result);
    let storedResultsText = JSON.stringify(storedResults);
    localStorage.setItem(STORAGE_KEY, storedResultsText);
    console.log('Saving result to localStorage', storedResultsText);
    showSavedResults(storedResults);
}


function showSavedResults(savedResults) {
    let resultElement = this.document.getElementById('savedResults');
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
                let [comparedElements, correctCount] = createHtmlForComparedText(result.text, result.input, ignoreWhitespace);
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
                    inputText.value = _text;
                    document.getElementsByClassName('inputContainer')[0].scrollIntoView();
                }
            })(result.text);
            new bootstrap.Tooltip(loadElement, { trigger : 'hover' });

            let removeElement = createElement('Remove', 'button', 'btn btn-outline-danger');
            removeElement.setAttribute('type', 'button');
            removeElement.setAttribute('title', 'Remove result from saved results.')
            removeElement.onclick = ( function(_index) { return function() { removeStoredResult(_index); }})(index);
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

        drawSavedResultGraph(savedResults);
    }
    showHideSavedResultGraph(savedResults);
}

function removeStoredResult(index) {
    let savedResults = JSON.parse(localStorage.getItem(STORAGE_KEY));
    // remove element index from array:
    savedResults = savedResults.slice(0,index).concat(savedResults.slice(index + 1));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(savedResults));
    showSavedResults(savedResults);
}

// ------------------------ graph code ------------------------
function drawSavedResultGraph(savedResults) {
    console.log('Drawing stored result graph');
    let percentageValues = [];
    let speedWpm = [];
    let labels = [];
    savedResults.forEach((result, index) => {
        let date = new Date(result.date);
        var dateString = date.toLocaleDateString() + ' ' + date.toLocaleTimeString()
        labels.push(dateString);
        percentageValues.push(result.percentage);
        //console.log('speedwpm', index, result.speedWpm);
        speedWpm.push(result.speedWpm);
    });
    savedResultChart.data.labels = labels;
    savedResultChart.data.datasets[0].data = percentageValues;
    savedResultChart.data.datasets[1].data = speedWpm;
    if (!speedWpm.some(x => x)) {
        // if no speed info available, do not show speed axis and values
        savedResultChart.options.scales.y1.display = false;
        savedResultChart.options.plugins.legend.display = false;
    }
    savedResultChart.update();
}

function showHideSavedResultGraph(savedResults) {
    let canvasElement = document.getElementById('savedResultChart');
    if (savedResults && savedResults.length > 0) {
        console.log('showing graph');
        canvasElement.style.display = 'block';
    } else {
        console.log('hiding graph');
        canvasElement.style.display = 'none';
    }
}


// ------------------------ tab handling ------------------------
for (tabElement of document.querySelectorAll('button[data-bs-toggle="tab"]')) {
	tabElement.addEventListener('shown.bs.tab', tabEventListener);
}

function openTabForMode(mode) {
    if (mode === MODE_CW_GENERATOR) {
        document.getElementById('cw-generator-tab').click();
    } else if (mode === MODE_ECHO_TRAINER) {
        document.getElementById('echo-trainer-tab').click();
    } else if (mode === MODE_QSO_TRAINER) {
        document.getElementById('qso-trainer-tab').click();
    } else {
        console.log('Unknown mode: ', mode);
    }
}

function tabEventListener(event) {
    //console.log('tab event', event);	
    if (event.target.id === 'cw-generator-tab') {
        mode = MODE_CW_GENERATOR;
    } else if (event.target.id === 'echo-trainer-tab') {
        mode = MODE_ECHO_TRAINER;
    } else if (event.target.id === 'qso-trainer-tab') {
        mode = MODE_QSO_TRAINER;
    }
}


// ------------------------ echo trainer code ------------------------
function detectAbbreviation() {
    let text = receiveTextEchoTrainer.value;
    if (text.endsWith(' OK')) {
        let lines = text.split(String.fromCharCode(10));
        let lastLine = lines[lines.length - 1];
        //console.log('lastline: ', lastLine);
        let abbreviation = lastLine.split(' ')[0];
        //console.log('abbreviation: ', abbreviation);
        if (abbreviation in abbreviations) {
            addAbbreviationToList(abbreviation, 1);
            //console.log('Abbreviation detected:', abbreviation, abbreviations[abbreviation]);
            // let abbrevText = abbreviations[abbreviation]['en'] + '/' + abbreviations[abbreviation]['de'];
            // let content = receiveTextEchoTrainer.value;//.slice(0, -1); // cut off trailing new line
            // receiveTextEchoTrainer.value = content + ' (' + abbrevText + ')';//  + String.fromCharCode(10);
        }
    }
}

function addAbbreviationToList(abbreviation, position) {
    let table = document.getElementById('abbreviationTable');
    let rowElement = table.insertRow(position); // insert in 1st position after header
    let cells = [];
    cells.push(createElement(abbreviation, 'td', null));
    cells.push(createElement(abbreviations[abbreviation]['en'], 'td', null));
    cells.push(createElement(abbreviations[abbreviation]['de'], 'td', null));
    rowElement.replaceChildren(...cells);
}

function clearEchoTrainerFields() {
    receiveTextEchoTrainer.value = '';
    clearAbbreviations();
}

function clearAbbreviations() {
    let table = document.getElementById('abbreviationTable');
    let rowCount = table.getElementsByTagName('tr').length;
    for (count = 1; count < rowCount; count++) {
        table.deleteRow(-1);
    }
}

function showAllAbbreviations() {
    Object.entries(abbreviations).forEach(([k,v]) => {
        addAbbreviationToList(k, -1);
    })
}

// ------------------------ qso trainer code ------------------------
let cwPlayer = new jscw();

let cwPlayerWpm; // wpm
let cwPlayerEws; // extended word spacing
let cwPlayerEls; // extended letter spacing: effective speed

loadSettings();

var cwPlayerIsPlaying = false;
cwPlayer.onPlay = function(event) {
    console.log('player play event received', event);
    cwPlayerIsPlaying = true;
}
cwPlayer.onFinished = function(event) {
    console.log('player finished event received', event);
    cwPlayerIsPlaying = false;
}

let endOfMessageDetected = false;

function detectQso() {
    endOfMessageDetected = false;
    //console.log('detecteQso', endOfMessageDetected)
    let text = receiveTextQsoTrainer.value;
    if (text.endsWith(' kn ') || text.endsWith(' <kn> ') 
        || text.endsWith('e e ')
        || text.endsWith(' bk ') || text.endsWith(' <bk> ') 
        || text.endsWith(' k ')) {
        endOfMessageDetected = true;
        //console.log('detecteQso: end of message detected', endOfMessageDetected)
        setTimeout(detectQsoMessageEnded, QSO_WAIT_TIME_MS)
    }
}

function detectQsoMessageEnded() {
    console.log('detectQsoMessageEnded, endOfMessageDetected=', endOfMessageDetected)
    if (endOfMessageDetected) {
        //console.log('really answerQso')
        let message = receiveTextQsoTrainer.value;
        console.log('last message:', message);
        displayQsoMessage('Your message: ' + message, false);
        receiveTextQsoTrainer.value = '';
        answerQso(message);
    }
}

function answerQso(message) {
    let answer = createQsoAnswer(message);
    playCw(answer);
    displayQsoMessage(answer, true);
}

function duplicateWords(text) {
    let result = '';
    let words = text.split(' ');
    let lastWord = '';
    // dupliate all words, except when they are already duplicated in the message
    for (let index = 0; index < words.length; index++) {
        let word = words[index];
        if (word !== lastWord) {
            result += word + ' ' + word + ' ';
        } else {
            lastWord = ''; // if there are more than 2 repetitions in the text, use them!
        }
        lastWord = word;
    }
    console.log('duplicate words: ', text, result);
    return result.trim();
}

function displayQsoMessage(message, isAnswer) {
    let htmlMessage = message.replace(/\n/g, '<br/>');
    let answerElement;
    if (isAnswer) {
        answerElement = createAnswerElement(htmlMessage)        
    } else {
        answerElement = createElement(htmlMessage, 'p', 'qso-request')
    }
    //console.log('adding element', answerElement);
    qsoMessages.appendChild(answerElement);
}

function playCw(message) {
    message = message.replace(/\n/g, ' ');
    let messageToPlay = message;
    if (qsoRptWords) {
        messageToPlay = duplicateWords(message);
    }
    if (cwPlayerIsPlaying) {
        cwPlayer.stop(); // stop any message that is currently played
    }
    cwPlayer.play(messageToPlay);
}

function moveQsoInputTextToMessages() {
    let message = inputTextQsoTrainer.value;
    let htmlMessage = message.replace(/\n/g, '<br/>');
    let answerElement = createElement(htmlMessage, 'span', 'qso-answer');

    let col1 = createElement(null, 'div', 'col-12 col-md-12');
    col1.appendChild(answerElement);
    
    let row = createElement(null, 'div', 'row');
    row.appendChild(col1);
    
    qsoMessages.appendChild(row);

    inputTextQsoTrainer.value = '';
}


function createAnswerElement(message) {

    let answerElement = createElement(message, 'p', 'qso-answer unreadable')

    let showButton = createElement('Show', 'button', 'btn btn-outline-primary btn-sm qso-answer-button');
    showButton.setAttribute('type', 'button');
    showButton.setAttribute('data-toggle', 'tooltip');
    showButton.setAttribute('title', 'Show/hide text of answer.')
    showButton.onclick = ( function(_targetElement, _buttonElement) { 
        return function() { 
            _targetElement.classList.toggle('unreadable');
            if (_targetElement.classList.contains('unreadable')) {
                _buttonElement.textContent = 'Show';
            } else {
                _buttonElement.textContent = 'Hide';
            }
        }
    })(answerElement, showButton);

    let replayButton = createElement('Rpt', 'button', 'btn btn-outline-success btn-sm qso-answer-button');
    replayButton.setAttribute('type', 'button');
    replayButton.setAttribute('data-toggle', 'tooltip');
    replayButton.setAttribute('title', 'Replay cw code.')
    replayButton.onclick = ( function(_message) { 
        return function() {
            playCw(_message);
        }
    })(message.replace(/<br\/>/g, ' '));
    new bootstrap.Tooltip(replayButton, { trigger : 'hover' });

    let stopButton = createElement('Stop', 'button', 'btn btn-outline-danger btn-sm qso-answer-button');
    stopButton.setAttribute('type', 'button');
    stopButton.setAttribute('data-toggle', 'tooltip');
    stopButton.setAttribute('title', 'Stop cw player.')
    stopButton.onclick = ( function() { 
        return function() { 
            cwPlayer.stop();
        }
    })();
    let pauseButton = createElement('Pause', 'button', 'btn btn-outline-warning btn-sm qso-answer-button');
    pauseButton.setAttribute('type', 'button');
    pauseButton.setAttribute('data-toggle', 'tooltip');
    pauseButton.setAttribute('title', 'Pause cw player.')
    pauseButton.onclick = ( function() { 
        return function() { 
            cwPlayer.pause();
        }
    })();
    
    let messageColumn = createElement(null, 'div', 'col-12 col-md-9');
    messageColumn.appendChild(answerElement);
    let buttonColumn = createElement(null, 'div', 'col-12 col-md-3');
    buttonColumn.appendChild(showButton);
    buttonColumn.appendChild(replayButton);
    buttonColumn.appendChild(stopButton);
    buttonColumn.appendChild(pauseButton);

    let row = createElement(null, 'div', 'row');
    row.appendChild(messageColumn);
    row.appendChild(buttonColumn);
    
    return row;
}

let answer = createQsoAnswer('cq cq cq de oe6chd o e 6 c h d');
console.log('answer:', answer);
// answer = createQsoAnswer('r r ur rst is 599');
// console.log('answer:', answer);
// answer = createQsoAnswer('gm ur rst is 568');
// console.log('answer:', answer);
// answer = createQsoAnswer('foobar');
// console.log('answer:', answer);
// answer = createQsoAnswer('tu e e');
// console.log('answer:', answer);
// answer = createQsoAnswer('my name is otto');
// console.log('answer:', answer);
// answer = createQsoAnswer('gb om');
// console.log('answer:', answer);
answer = createQsoAnswer('my name is fred == my qth is toronto');
console.log('answer:', answer);
answer = createQsoAnswer('my wx is cold');
console.log('answer:', answer);

function createQsoAnswer(message) {
    console.log('message:', message);
    let answer = '';
    let shouldAppendEndOfMessage = true;
    let isIntro = false;
    let textDetected = false;
    let qthDetected = false;

    // CQ CQ CQ de .... 
    executeIfMatch(message, /.*cq.*\s+de\s+(\w+)/, answer, function(groups) { 
        qsoCallSign = groups[0];
        qsoCallSignBot = generateCallSign();
        autoQsoCallsign = qsoCallSign;
        autoQsoCallsignBot = qsoCallSignBot;
        generateAutoQsoMessages();
        answer = appendToMessage(answer, qsoCallSign + ' de ' + qsoCallSignBot + ' ' + qsoCallSignBot + ' pse k');
        shouldAppendEndOfMessage = false;
        isIntro = true;
        textDetected = true;
        console.log('matched cq, answer:', answer);
    });
    console.log('isIntro', isIntro);
    if (!isIntro) {
        answer = appendToMessage(answer, 'r r ' + qsoCallSign + ' de ' + qsoCallSignBot);        
    }
    executeIfMatch(message, /.*(gm|ga|ge)\s(om|yl)/, answer, function(groups) { 
        answer = appendToMessage(answer, groups[0]); // do not reply with 'om' or 'yl' because we do not know if om or yl!
        textDetected = true;
        console.log('matched gm/ga/ge, answer:', answer);
    });
    executeIfMatch(message, /.*rst\sis\s(\w+)/, answer, function(groups) { 
        var rst = getRandom('555', '569', '579', '589', '599');
        answer = appendToMessage(answer, 'ur rst is ' + rst + ' ' + rst);
        textDetected = true;
        console.log('matched rst, answer:', answer);
    });
    executeIfMatch(message, /.*qth\sis\s(\w+)/, answer, function(groups) { 
        qsoQth = groups[0];
        qthDetected = true;
        console.log('matched qth:', qsoQth);
    });
    executeIfMatch(message, /.*\sname\sis\s(\w+)/, answer, function(groups) { 
        qsoName = groups[0];
        var name = getRandomName();
        if (qsoQth === '') {
            answer = appendToMessage(answer, 'ok ' + qsoName);
        } else {
            answer = appendToMessage(answer, 'ok ' + qsoName + ' from ' + qsoQth);
        }
        answer = appendToMessage(answer, 'my name is ' + name + ' ' + name);
        textDetected = true;
        console.log('matched name, answer:', answer);
    });
    executeIfMatch(message, /.*\swx\sis\s(\w+)(?:.*temp\s([-]?\d+)\s*c?)?/, answer, function(groups) { 
        let weather = groups[0];
        let temperature = groups[1];
        let temperatureString = '';
        if (temperature !== undefined) {
            temperatureString = ' es temp ' + groups[1] + 'c';
        }
        answer = appendToMessage(answer, 'ok ur wx is ' + weather + temperatureString);
        answer = appendToMessage(answer, 'my wx is ' + getRandomWx());
        textDetected = true;
        console.log('matched wx, answer:', answer);
    });
    if (qthDetected) {
        var qth = getRandomQth();
        answer = appendToMessage(answer, 'my qth is ' + qth + ' ' + qth);
        textDetected = true;
        console.log('matched qth, answer:', answer);
    }
    executeIfMatch(message, /.*gb\s(om|yl)/, answer, function(groups) { 
        answer = appendToMessage(answer, 'gb ' + qsoName + ' 73 es 55');
        textDetected = true;
        console.log('matched gb, answer:', answer);
    });
    executeIfMatch(message, /(tu|sk) e e/, answer, function(groups) { 
        answer = appendToMessage(answer, 'e e');
        shouldAppendEndOfMessage = false;
        textDetected = true;
        console.log('matched tu e e, answer:', answer);
    });
    executeIfMatch(message, /.*test/, answer, function(groups) { 
        answer = appendToMessage(answer, 'test back');
        textDetected = true;
        console.log('matched test, answer:', answer);
    });

    if (!textDetected) {
        answer = appendToMessage(answer, 'pse rpt kn'); // did not understand!
    } else if (shouldAppendEndOfMessage) {
        answer = appendToMessage(answer, qsoCallSign + ' de ' + qsoCallSignBot + ' ' + getRandom('pse kn', 'kn'));
    }

    return answer;
}

function executeIfMatch(message, regexp, answer, callback) {
    var result = message.match(regexp);
    if (result) {
        result.shift(); // remove matching string, only return groups (if any)
        return callback(result, answer);
    }
}

function appendToMessage(message, textToAppend) {
    if (!message || message.length == 0) {
        message = textToAppend;
    } else {
        message += ' =\n' + textToAppend;
    }
    return message;
}

function generateCallSign() {
    return new ReRegExp(getRandomCallsignRegexp()).build();
}

function getRandomCallsignRegexp() {
    return getRandom(
        /1[ABS][0-9][A-Z]{2,3}/,
        /2[A-Z][0-9][A-Z]{2,3}/,
        /3D[A-Z][0-9][A-Z]{2}/,
        /3[A-Z][0-9][A-Z]{2,3}/,
        /4[A-Z][0-9][A-Z]{2,3}/,
        /5[A-Z][0-9][A-Z]{2,3}/,
        /6[A-Z][0-9][A-Z]{2,3}/,
        /7[A-Z][0-9][A-Z]{2,3}/,
        /8[A-Z][0-9][A-Z]{2,3}/,
        /9[A-Z][0-9][A-Z]{2,3}/,
        /A[A-Z][0-9][A-Z]{2,3}/,
        /A[2-9][A-Z]{3}/,
        /B[A-Z][0-9][A-Z]{2,3}/,
        /B[2-9][A-Z]{3}/,
        /C[A-Z][0-9][A-Z]{2,3}/,
        /C[0-9][A-Z]{3}/,
        /D[A-Z][0-9][A-Z]{2,3}/,
        /D[0-9][A-Z]{3}/,
        /E[A-Z][0-9][A-Z]{2,3}/,
        /E[2-67][A-Z]{3}/,
        /F[0-9][A-Z]{3}/,
        /G[0-9][A-Z]{3}/,
        /H[A-Z][0-9][A-Z]{2,3}/,
        /H[1-9][A-Z]{3}/,
        /I[A-Z][0-9][A-Z]{2,3}/,
        /I[1-9][A-Z]{3}/,
        /I[A-Z][0-9][A-Z]{2,3}/,
        /I[1-9][A-Z]{3}/,
        /J[A-Z][0-9][A-Z]{2,3}/,
        /J[2-8][A-Z]{3}/,
        // /K[0-9][A-Z]/, // special callsign in US
        /K[0-9][A-Z]{3}/,
        /K[A-Z][0-9][A-Z]{2,3}/,
        /L[A-Z][0-9][A-Z]{2,3}/,
        /L[2-8][A-Z]{3}/,
        /M[A-Z][0-9][A-Z]{2,3}/,
        /N[2-9][A-Z]{2,3}/,
        // /N[0-9][A-Z]/, // special callsign in US
        /O[A-Z][0-9][A-Z]{2,3}/,
        /P[A-Z][0-9][A-Z]{2,3}/,
        /P[2-9][A-Z]{3}/,
        /R[0-9][A-Z]{2,3}/,
        /R[A-Z][0-9][A-Z]{2}/,
        /S[A-Z][0-9][A-Z]{2,3}/,
        /S[02-9][A-Z]{3}/,
        /T[A-Z][0-9][A-Z]{2,3}/,
        /T[2-8][A-Z]{3}/,
        /U[A-Z][0-9][A-Z]{3}/,
        /V[A-Z][0-9][A-Z]{2,3}/,
        /V[2-9][A-Z]{2,3}/,
        /W[A-Z]{0,1}[0-9][A-Z]{1,2}/,
        /X[A-Z][0-9][A-Z]{2,3}/,
        /Y[A-Z][0-9][A-Z]{2,3}/,
        /Y[2-9][A-Z]{3}/,
        /Z[A-Z][0-9][A-Z]{2,3}/,
        /Z[238][A-Z]{3}/,
        );
}

function getRandomName() {
    return getRandom('frank', 'christof', 'john', 'gerhard', 'manfred', 'steve', 'yuan', 'carl', 'tommy', 
    'andrea', 'sabine', 'karin', 'anja', 'yvonne', 'bob', 'david', 'sophie', 'joseph', 'josef',
    'sam', 'joe', 'laura', 'hank', 'nick', 'alice', 'sarah', 'patrick', 'tom', 'dan', 'alice',
    'beth', 'liz', 'josh', 'ann', 'anna', 'robert', 'bill', 'mickey', 'alex', 'ed', 'edward',
    'alice', 'emma', 'jolie', 'andy', 'andi', 'samuel', 'pat', 'mike', 'michael', 'daniel');
}

function getRandomQth() {
    return getRandom('graz', 'vienna', 'berlin', 'nyborg', 'paris', 'london', 'kyiv', 'tokyo', 'hamburg', 
    'salzburg', 'linz', 'weyregg', 'boulder', 'hagerstown', 'pittsburg', 'greenville', 
    'charleston', 'bratislava', 'ljubljana', 'zagreb', 'budapest', 'wels', 'bolzano', 'munich',
    'berlin', 'innsbruck', 'marseille', 'barcelona', 'zaragoza', 'madrid', 'lyon', 'geneve',
    'toulouse', 'anvers', 'gent', 'brussels', 'cologne', 'prague', 'monaco', 'milano', 'rome', 'napoli',
    'nice', 'split', 'sarajevo', 'florence', 'cambridge', 'liverpool', 'edinborough', 'manchester',
    'copenhagen', 'oslo');
}

function getRandomWx() {
    let wx = getRandom('sun', 'cloudy', 'rain', 'snow', 'fog', 'hot', 'cold', 'sunny', 'raining', 'snowing', 'foggy');
    let minTemp = -20;
    let maxTemp = 35;
    if (wx.startsWith('hot')) {
        minTemp = 0; // in alaska zero degrees might be hot :-)
    }
    if (wx.startsWith('snow')) {
        maxTemp = 5;
    }
    if (wx.startsWith('rain')) {
        minTemp = -2;
    }
    let temp = 'temp ' + Math.round(minTemp + Math.random() * (maxTemp - minTemp)) + 'c'; // -20 to +35 degrees
    return wx + ' ' + temp;
}

function getRandom(...values) {
    let randomIndex = Math.random() * values.length | 0;
    return values[randomIndex];
}

function autoKeyQso() {
    if (autoKeyQsoIndex == 0) {
        resetQsoTrainerFields();
    }
    let message = autoQsoMessages[autoKeyQsoIndex];
    receiveTextQsoTrainer.value = message;
    //Scroll to the bottom of the text field
    receiveTextQsoTrainer.scrollTop = receiveTextQsoTrainer.scrollHeight;
    detectQso();

    autoKeyQsoIndex++;
    if (autoKeyQsoIndex >= autoQsoMessages.length) {
        autoKeyQsoIndex = 0;
    }
}

function generateAutoQsoMessages() {
    let deText = autoQsoCallsignBot + ' de ' + autoQsoCallsign;
    let name = getRandomName();
    autoQsoMessages = [
        'cq cq cq de ' + autoQsoCallsign + ' ' + autoQsoCallsign + ' pse k <kn> ', 
        deText + ' =\n' + getRandom('gm', 'ge') + ' = \nur rst is 599 5nn = hw ?\n' + deText + ' kn ',
        deText + ' =\nmy name is ' + name + ' ' + name + ' =\n' + deText + ' kn ',
        deText + ' =\nmy qth is ' + getRandomQth() + ' =\n' + deText + ' kn ',
        deText + ' =\nmy wx is ' + getRandomWx() +' =\n' + deText + ' kn ',
    ];
}

function clearQsoTrainerFields() {
    receiveTextQsoTrainer.value = '';
    inputTextQsoTrainer.value = '';
    qsoMessages.replaceChildren();
    resetQsoTrainerFields();
}

function resetQsoTrainerFields() {
    // clean all qso state variables
    qsoCallSign = '';
    qsoCallSignBot = '';
    qsoName = '';
    qsoQth = '';
    autoKeyQsoIndex = 0;
    autoQsoCallsign = generateCallSign();
    autoQsoCallsignBot = generateCallSign();
    generateAutoQsoMessages();
}

function loadSettings() {
    let storedSettings = JSON.parse(localStorage.getItem(STORAGE_KEY_SETTINGS));
    if (storedSettings) {

        if ('cwPlayerWpm' in storedSettings) {
            cwPlayerWpm = storedSettings.cwPlayerWpm;
        } else {
            cwPlayerWpm = 15;
        }
        if ('cwPlayerEws' in storedSettings) {
            cwPlayerEws = storedSettings.cwPlayerEws;
        } else {
            cwPlayerEws = 0;
        }
        if ('cwPlayerEls' in storedSettings) {
            cwPlayerEls = storedSettings.cwPlayerEls;
        } else {
            cwPlayerEls = 2;
        }
        if ('qsoRptWords' in storedSettings) {
            qsoRptWords = storedSettings.qsoRptWords;
        } else {
            qsoRptWords = false;
        }
        if ('voiceOutputEnabled' in storedSettings) {
            voiceOutputEnabled = storedSettings.voiceOutputEnabled;
        } else {
            voiceOutputEnabled = true;
        }
    }

    setCwPlayerSettings();
    setCwSettingsInUIInput();
    setCwSettingsInUILabels();
    setVoiceOutputEnabledSettings();
}

function saveSettings() {
    let storedSettings = {
        'cwPlayerWpm': cwPlayerWpm, 
        'cwPlayerEws': cwPlayerEws, 
        'cwPlayerEls': cwPlayerEls,
        'qsoRptWords': qsoRptWords,
        'voiceOutputEnabled': voiceOutputEnabled,
    };
    console.log(storedSettings);
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(storedSettings));
}

function setCwSettingsInUIInput() {
    document.getElementById('qsoWpmSelect').value = cwPlayerWpm;
    document.getElementById('qsoEwsSelect').value = cwPlayerEws;
    document.getElementById('qsoElsSelect').value = cwPlayerEls;
    qsoRptWordsCheckbox.checked = qsoRptWords;
}

function setCwSettingsInUILabels() {
    document.getElementById('qsoCwWpmLabel').textContent = cwPlayerWpm + 'wpm';
    document.getElementById('qsoCwEwsLabel').textContent = cwPlayerEws;
    document.getElementById('qsoCwElsLabel').textContent = cwPlayerEls;
    if (qsoRptWords) {
        document.getElementById('qsoRptLabel').textContent = 'rpt';
    } else {
        document.getElementById('qsoRptLabel').textContent = 'no rpt';
    }
}

function setCwPlayerSettings() {
    cwPlayer.setWpm(cwPlayerWpm);
    cwPlayer.setEws(cwPlayerEws);
    let eff = cwPlayerWpm / cwPlayerEls;
    cwPlayer.setEff(eff);
}

function setVoiceOutputEnabledSettings() {
    voiceOutputCheckbox.checked = voiceOutputEnabled;
    speechSynthesisHandler.enabled = voiceOutputEnabled;
}


testCwSettingsPlayButton.addEventListener('click', function() {
    playCw(testCwSettingsText.value);
});
testCwSettingsStopButton.addEventListener('click', function() {
    cwPlayer.stop();
});


// ------------------------ serial communication code ------------------------

function disableSerialCommunication() {
    connectButton.disabled = true;
    document.getElementById('serialCommunicationDisabledInfo').style.display = 'block';
}

//Define outputstream, inputstream and port so they can be used throughout the sketch
var outputStream, inputStream, port;
// navigator.serial.addEventListener('connect', e => {
//     console.log('connect event triggered')
//     statusBar.innerText = `Connected to ${e.port}`;
//     statusBar.className = 'badge bg-success';
//     connectButton.innerText = 'Disconnect';
// });

// navigator.serial.addEventListener('disconnect', e => {
//     console.log('disconnect event triggered')
//     statusBar.innerText = `Disconnected`;
//     statusBar.className = 'badge bg-danger';
//     connectButton.innerText = 'Connect';
// });

//Connect to the Arduino
async function connect() {

    const baudRate = 115200;

    //Optional filter to only see relevant boards
    const filter = {
        // morserino32
        // Product ID: 0xea60
        // Vendor ID: 0x10c4  (Silicon Laboratories, Inc.)
        usbVendorId: 0x10c4
    };

    //Try to connect to the Serial port
    try {
        port = await navigator.serial.requestPort(/*{ filters: [filter] }*/);
        // Continue connecting to |port|.

        // - Wait for the port to open.
        await port.open({ baudRate: baudRate });

        statusBar.innerText = `Connected`;
        statusBar.className = 'badge bg-success';
        connectButton.innerText = 'Disconnect';

        let decoder = new TextDecoderStream();
        inputDone = port.readable.pipeTo(decoder.writable);
        inputStream = decoder.readable;

        const encoder = new TextEncoderStream();
        outputDone = encoder.readable.pipeTo(port.writable);
        outputStream = encoder.writable;

        reader = inputStream.getReader();

        readLoop();

        initM32Protocol();

        inputText.focus();
    } catch (e) {

        //If the pipeTo error appears; clarify the problem by giving suggestions.
        if (e == 'TypeError: Cannot read property "pipeTo" of undefined') {
            e += '\n Use Google Chrome and enable-experimental-web-platform-features'
        }
        connectButton.innerText = 'Connect'
        statusBar.innerText = e;
    }
}

//Write to the Serial port
async function writeToStream(line) {
    console.log('send command', line);
    const writer = outputStream.getWriter();
    writer.write(line);
    writer.write('\n');
    writer.releaseLock();
}

//Disconnect from the Serial port
async function disconnect() {

    if (reader) {
        await reader.cancel();
        await inputDone.catch(() => { });
        reader = null;
        inputDone = null;
    }
    if (outputStream) {
        await outputStream.getWriter().close();
        await outputDone;
        outputStream = null;
        outputDone = null;
    }
    statusBar.innerText = `Disconnected`;
    statusBar.className = 'badge bg-danger';
    connectButton.innerText = 'Connect';
    //Close the port.
    await port.close();
    port = null;
}

//Read the incoming data
async function readLoop() {

    while (true) {
        const { value, done } = await reader.read();
        if (done === true) {
            break;
        }

        if (m32Protocolhandler.handleInput(value)) {
            continue;
        }

        // when recieved something add it to the textarea
        if (mode == MODE_CW_GENERATOR) {
            receiveText.value += value;
            //Scroll to the bottom of the text field
            receiveText.scrollTop = receiveText.scrollHeight;
            compareTexts();
            applyAutoHide();    
        } else if (mode == MODE_ECHO_TRAINER) {
            receiveTextEchoTrainer.value += value;
            //Scroll to the bottom of the text field
            receiveTextEchoTrainer.scrollTop = receiveTextEchoTrainer.scrollHeight;
            detectAbbreviation();
        } else if (mode == MODE_QSO_TRAINER) {
            receiveTextQsoTrainer.value += value;
            //Scroll to the bottom of the text field
            receiveTextQsoTrainer.scrollTop = receiveTextQsoTrainer.scrollHeight;
            detectQso();
        }
    }
}

function initM32Protocol() {
    sendM32Command('PUT device/protocol/on', false);
    //sendM32Command('GET device');
    sendM32Command('GET control/speed', true);
    sendM32Command('GET control/volume', false);
}

const timer = ms => new Promise(res => setTimeout(res, ms))

async function sendM32Command(command, useAllCallbacks = true) {
    while(m32Protocolhandler.waitForResponse) {
        //console.log('waiting for response');
        await timer(50);
    };
    writeToStream(command);
    m32Protocolhandler.commandSent(useAllCallbacks);
}



// source: https://de.wikipedia.org/wiki/Liste_von_Abk%C3%BCrzungen_im_Amateurfunk
// and cw abbreviations CW-Schule graz
abbreviations = {
    '33': {'de': 'Grüße unter Funkerinnen', 'en': 'female ham greeting' },
    '44': {'de': 'Melde mich via Telefon, WFF Gruß', 'en': 'answer by wire, call on telephone, WFF greetings' },
    '55': {'de': 'Viel Erfolg', 'en': '-' },
    '5nn': {'de': '599', 'en': '599' },
    '72': {'de': 'Viele Grüße QRP', 'en': 'Best regards QRP' },
    '73': {'de': 'Viele Grüße', 'en': 'Best regards' },
    '88': {'de': 'Liebe und Küsse', 'en': 'Love and kisses' },
    '99': {'de': 'Verschwinde!', 'en': 'get lost!' },
    'a': {'de': 'Alpha', 'en': 'Alpha'  },
    'aa': {'de': 'alles nach...', 'en': 'all after...' },
    'ab': {'de': 'alles vor...', 'en': 'all before...' },
    'abt': {'de': 'ungefähr', 'en': 'about' },
    'ac': {'de': 'Wechselstrom (auch Brumm)', 'en': 'alternating current' },
    'adr': {'de': 'Anschrift', 'en': 'address' },
    'af': {'de': 'Audiofrequenz', 'en': 'audio frequency' },
    'afsk': {'de': 'audio freq. shift keying', 'en': 'audio freq. shift keying' },
    'agc': {'de': 'Automatische Lautstärkeregelung', 'en': 'automatic gain control' },
    'agn': {'de': 'Wieder, nochmals', 'en': 'again' },
    'alc': {'de': 'Automatische Pegel-Regelung', 'en': 'automatic level control' },
    'am': {'de': 'Vormittag, Amplitudenmodulation', 'en': 'before lunch, amplitude modulation' },
    'ani': {'de': 'Irgendein, jemand', 'en': 'any' },
    'ans': {'de': 'Antwort', 'en': 'answer' },
    'ant': {'de': 'Antenne', 'en': 'antenna' },
    'any': {'de': 'Irgendein, jemand', 'en': 'any' },
    'ar': {'de': 'Spruchende', 'en': 'end of message' },
    'as': {'de': 'Bitte warten', 'en': 'please wait quietly' },
    'atv': {'de': 'amateur TV', 'en': 'amateur TV' },
    'avc': {'de': 'Automatische Lautstärkeregelung', 'en': 'automatic volume control' },
    'award': {'de': 'Amateurfunkdiplom', 'en': 'award' },
    'awdh': {'de': 'Auf Wiederhören', 'en': '-' },
    'awds': {'de': 'Auf Wiedersehen', 'en': '-' },
    'b': {'de': 'Bravo', 'en': 'Bravo'  },
    'b4': {'de': 'vorher', 'en': 'before' },
    'bc': {'de': 'Rundfunk', 'en': 'broadcast' },
    'bci': {'de': 'Rundfunkstörungen', 'en': 'Broadcast interference' },
    'bcnu': {'de': 'Hoffe Dich wieder zu treffen', 'en': 'be seeing you' },
    'bd': {'de': 'schlecht', 'en': 'bad' },
    'bfo': {'de': 'Überlagerungsoszillator', 'en': 'beat frequency oscillator' },
    'bk': {'de': 'Pause', 'en': 'break' },
    'bpm': {'de': 'Buchstaben pro Minute', 'en': '-' },
    'bt': {'de': 'Trennung (=)', 'en': 'break (=)' },
    'btr': {'de': 'besser', 'en': 'better' },
    'btw': {'de': 'Nebenbei bemerkt', 'en': 'by the way' },
    'bug': {'de': 'halbautomatische Taste', 'en': 'semi-automatic key' },
    'buro': {'de': 'Büro', 'en': 'bureau' },
    'c': {'de': 'ja, Bejahung (von spanisch "si"), Charly', 'en': 'yes, correct, affirmation (from spanish "si"), Charly' },
    'call': {'de': 'Rufzeichen, rufen', 'en': 'call-sign, call' },
    'cfm': {'de': 'bestätige', 'en': 'confirm' },
    'cheerio': {'de': 'Servus! Tschüss! (Grußwort)', 'en': 'cheerio' },
    'cl': {'de': 'Station wird abgeschaltet', 'en': 'close' },
    'cld': {'de': 'gerufen', 'en': 'called' },
    'clg': {'de': 'rufend, ich rufe', 'en': 'calling' },
    'col': {'de': 'kollationieren', 'en': 'collate' },
    'conds': {'de': 'Ausbreitungsbedingungen', 'en': 'conditions' },
    'condx': {'de': 'DX-Ausbreitungsbedingungen', 'en': 'dx-conditions' },
    'congrats': {'de': 'Glückwünsche', 'en': 'congratulations' },
    'cpi': {'de': 'aufnehmen', 'en': 'copy' },
    'cq': {'de': 'allgemeiner Anruf', 'en': 'seek you' },
    'crd': {'de': 'Stationskarte, (QSL-Karte)', 'en': 'card, verification card' },
    'cs': {'de': 'Rufzeichen', 'en': 'call sign' },
    'cu': {'de': 'Wir sehen uns später', 'en': 'see you' },
    'cuagn': {'de': 'wir treffen uns wieder', 'en': 'see you again' },
    'cud': {'de': 'konnte, könnte', 'en': 'could' },
    'cul': {'de': 'wir sehen uns wieder', 'en': 'see you later' },
    'cw': {'de': 'Tastfunk, Morsetelegrafie', 'en': 'continuous wave' },
    'd': {'de': 'Delta', 'en': 'Delta'  },
    'db': {'de': 'Dezibel', 'en': 'decibels' },
    'dc': {'de': 'Gleichstrom', 'en': 'direct current' },
    'de': {'de': 'von (vor dem eigenen Rufz.)', 'en': 'from' },
    'diff': {'de': 'Unterschied', 'en': 'difference' },
    'dl': {'de': 'Deutschland', 'en': 'Germany' },
    'dok': {'de': 'Distrikts-Ortsverbandskenner (DARC)', 'en': 'DOK' },
    'dr': {'de': 'Liebe(r) ...', 'en': 'dear ...' },
    'dwn': {'de': 'abwärts, niedrigere Frequenz', 'en': 'down' },
    'dx': {'de': 'große Entfernung, Fernverbindung', 'en': 'long distance' },
    'e': {'de': 'Echo', 'en': 'Echo'  },
    'ee': {'de': 'ENDE', 'en': 'end' },
    'el': {'de': '(Antennen-)Elemente', 'en': 'elements' },
    'elbug': {'de': 'elektronische Taste', 'en': 'electronic key' },
    'ere': {'de': 'hier', 'en': 'here' },
    'es': {'de': 'und, &', 'en': 'and, &' },
    'excus': {'de': 'Entschuldigung', 'en': 'excuse me' },
    'f': {'de': 'Foxrott', 'en': 'Foxrott'  },
    'fb': {'de': 'ausgezeichnet, prima', 'en': 'fine business' },
    'fer': {'de': 'für', 'en': 'for' },
    'fm': {'de': 'von, Frequenzmodulation', 'en': 'from, frequency modulation' },
    'fone': {'de': 'Telefonie', 'en': 'telephony' },
    'fr': {'de': 'für', 'en': 'for' },
    'frd': {'de': 'Freund', 'en': 'friend' },
    'freq': {'de': 'Frequenz', 'en': 'frequency' },
    'fwd': {'de': 'vorwärts', 'en': 'forward' },
    'g': {'de': 'Golf', 'en': 'Golf'  },
    'ga': {'de': 'beginnen Sie, anfangen', 'en': 'go ahead' },
    'ga': {'de': 'Guten Nachmittag', 'en': 'good afternoon' },
    'gb': {'de': 'leben Sie wohl', 'en': 'good bye' },
    'gd': {'de': 'Guten Tag!', 'en': 'good day (nicht GB)' },
    'ge': {'de': 'Guten Abend!', 'en': 'good evening' },
    'gl': {'de': 'Viel Glück!', 'en': 'good luck!' },
    'gld': {'de': 'erfreut', 'en': 'glad' },
    'gm': {'de': 'Guten Morgen!', 'en': 'good morning' },
    'gn': {'de': 'Gute Nacht!', 'en': 'good night' },
    'gnd': {'de': 'Erdung, Erdpotential', 'en': 'ground' },
    'gp': {'de': 'Ground-Plane-Antenne', 'en': 'ground plane antenna' },
    'gs': {'de': 'Dollarnote', 'en': 'green stamp (dollar note)' },
    'gt': {'de': 'Guten Tag', 'en': '-' },
    'gud': {'de': 'gut', 'en': 'good' },
    'guhor': {'de': 'kein Empfang (mehr)', 'en': 'going unable to hear or receive' },
    'h': {'de': 'Hotel', 'en': 'Hotel'  },
    'ham': {'de': 'Funkamateur', 'en': 'ham' },
    'hf': {'de': 'high frequency, Kurzwelle (3-30MHz)', 'en': 'high frequency, shortwave (3-30MHz)' },
    'hh': {'de': 'Irrung', 'en': 'correction' },
    'hi': {'de': 'lachen', 'en': 'hi(larious), laughing' },
    'hpe': {'de': 'ich hoffe', 'en': 'hope' },
    'hr': {'de': 'hier', 'en': 'here' },
    'hrd': {'de': 'gehört', 'en': 'heard' },
    'hrs': {'de': 'Stunden', 'en': 'hours' },
    'hv': {'de': 'habe', 'en': 'have' },
    'hvy': {'de': 'schwer', 'en': 'heavy' },
    'hw': {'de': 'wie (werde ich gehört)?', 'en': 'how (copy)?' },
    'hw?': {'de': 'wie werde ich gehört?', 'en': 'how copy?' },
    'hwsat?': {'de': 'wie finden Sie das?', 'en': 'how is about that?' },
    'i': {'de': 'ich, India', 'en': 'I, India' },
    'iaru': {'de': 'international amateur radio union', 'en': 'international amateur radio union' },
    'if': {'de': 'Zwischenfrequenz', 'en': 'intermediate freq.' },
    'ii': {'de': 'ich wiederhole', 'en': 'i repeat' },
    'info': {'de': 'Information', 'en': 'information' },
    'inpt': {'de': 'Eingang(sleistung)', 'en': 'input power' },
    'input': {'de': 'Eingangsleistung', 'en': 'input' },
    'irc': {'de': 'Antwortschein', 'en': 'international return coupon' },
    'itu': {'de': 'Int. Fernmeldeunion', 'en': 'International Telecommunication Union' },
    'j': {'de': 'Juliett', 'en': 'Juliett'  },
    'k': {'de': 'Kommen ..., Kilo', 'en': 'come, Kilo' },
    'ka': {'de': 'Spruchanfang', 'en': 'message begins' },
    'key': {'de': 'Morsetaste', 'en': 'key' },
    'khz': {'de': 'Kilo Herz', 'en': 'kilo herz' },
    'km': {'de': 'Kilometer', 'en': 'kilometers' },
    'kn': {'de': 'kommen, nur eine bestimmte Station', 'en': '"Over to you, only the station named should respond (e.g. W7PTH DE W1AW KN)"' },
    'knw': {'de': 'wissen', 'en': 'know' },
    'kw': {'de': 'kilowatt', 'en': 'kilowatt' },
    'ky': {'de': 'Morsetaste', 'en': 'morse key' },
    'l': {'de': 'Lima', 'en': 'Lima'  },
    'lbr': {'de': 'Lieber ...', 'en': '-' },
    'lf': {'de': 'Niederfrequenz, siehe NF', 'en': 'low frequency' },
    'lid': {'de': 'schlechter Operator', 'en': '"lousy incompetent dummy"' },
    'lis': {'de': 'lizenziert, Lizenz', 'en': 'licensed, licence' },
    'lng': {'de': 'lang', 'en': 'long' },
    'loc': {'de': 'Standortkenner', 'en': 'locator' },
    'log': {'de': 'Stations-, Funktagebuch', 'en': 'log book' },
    'lp': {'de': 'long path', 'en': 'long path' },
    'lsb': {'de': 'unteres Seitenband', 'en': 'lower sideband' },
    'lsn': {'de': 'hören Sie', 'en': 'listen' },
    'ltr': {'de': 'Brief', 'en': 'letter' },
    'luf': {'de': 'lowest usable freq.', 'en': 'lowest usable freq.' },
    'lw': {'de': 'Langdrahtantenne', 'en': 'long wire antenna' },
    'm': {'de': 'mobile., Mike', 'en': 'mobile., Mike' },
    'ma': {'de': 'mA (milli-Ampere)', 'en': 'mA (milli-Ampere)' },
    'mesz': {'de': 'Sommerzeit', 'en': 'middle european summer time' },
    'mez': {'de': 'Winterzeit', 'en': 'middle european time zone' },
    'mgr': {'de': 'Manager', 'en': 'manager' },
    'mhz': {'de': 'Megahertz', 'en': 'megahertz' },
    'min': {'de': 'Minute(n)', 'en': 'minute(s)' },
    'mins': {'de': 'Minuten', 'en': 'minutes' },
    'mm': {'de': 'bewegliche Seestation', 'en': 'maritime mobile' },
    'mm': {'de': 'maritime mobile', 'en': 'maritime mobile' },
    'mni': {'de': 'viel, viele', 'en': 'many' },
    'mni': {'de': 'viel(e)', 'en': 'many' },
    'mod': {'de': 'Modulation', 'en': 'modulation' },
    'msg': {'de': 'Nachricht, Telegramm', 'en': 'message' },
    'mtr': {'de': 'Meter, Messgerät', 'en': 'meter' },
    'muf': {'de': 'maximum usable freq.', 'en': 'maximum usable freq.' },
    'my': {'de': 'mein', 'en': 'my' },
    'n': {'de': 'Nein, 9, November', 'en': 'no, 9, November' },
    'net': {'de': 'Funknetz', 'en': 'network' },
    'nf': {'de': 'Niederfrequenz', 'en': 'low freq.' },
    'nil': {'de': 'nichts', 'en': 'nothing' },
    'no': {'de': 'nein (auch: Nummer)', 'en': 'no (number)' },
    'nr': {'de': 'Nahe, Nummer', 'en': 'near, number' },
    'nw': {'de': 'Jetzt', 'en': 'now' },
    'o': {'de': 'Oscar', 'en': 'Oscar'  },
    'ob': {'de': 'alter Junge (vertrauliche Anrede)', 'en': 'old boy' },
    'oc': {'de': 'alter Knabe (vertrauliche Anrede)', 'en': 'old chap' },
    'ok': {'de': 'in Ordnung', 'en': 'O.K., okay' },
    'om': {'de': 'Funker, Herr', 'en': 'old man' },
    'op': {'de': 'Funker, Operator', 'en': 'operator' },
    'osc': {'de': 'Oszillator', 'en': 'oscillator' },
    'oscar': {'de': 'OSCAR Amateurfunksatellit', 'en': 'OSCAR satellite' },
    'ot': {'de': 'langjähriger Funker, "alter Herr"', 'en': 'oldtimer' },
    'output': {'de': 'Ausgang(sleistung)', 'en': 'output (power)' },
    'ow': {'de': 'Ehefrau eines CB-Funkers', 'en': 'old woman' },
    'p': {'de': 'Papa', 'en': 'Papa'  },
    'pa': {'de': 'Endstufe', 'en': 'power amplifier' },
    'pep': {'de': 'Hüllkurvenspitzenleistung', 'en': 'peak envelope power' },
    'pm': {'de': 'Nachmittag', 'en': 'after lunch' },
    'pse': {'de': 'Bitte', 'en': 'please' },
    'psed': {'de': 'erfreut', 'en': 'pleased' },
    'pwr': {'de': 'Leistung', 'en': 'power' },
    'px': {'de': 'Präfix, Landeskenner', 'en': 'prefix, country code' },
    'q': {'de': 'Quebec', 'en': 'Quebec'  },
    'qra':  {'de': 'Der Name meiner Funkstelle ist...', 'en': 'name of my station is...'},
    'qrb':  {'de': 'Die Entfernung zwischen unseren Funkstellen beträgt ungefähr ... Kilometer.', 'en': 'distance betwenn our stations is...'},
    'qrg': {'de': 'Deine genaue Frequenz ist ...', 'en': 'your exact frequency is ...' },
    'qrl':  {'de': 'Ich bin beschäftigt, bitte nicht stören!, Arbeit, Ist die Frequenz frei?', 'en': 'I am busy! Please, do not interfere!, Work, Is this frequence in use?'},
    'qrm': {'de': 'man made Störungen', 'en': 'man mad interference' },
    'qrn': {'de': 'natürliche Störungen 1..nicht - 5..sehr stark', 'en': 'natural interference ...' },
    'qro':  {'de': 'Sendeleistung erhöhen', 'en': 'increase power'},
    'qrp':  {'de': 'Sendeliestung vermindern', 'en': 'decrease power'},
    'qrq':  {'de': 'Geben Sie schneller', 'en': 'send faster'},
    'qrs':  {'de': 'Geben Sie langsamer', 'en': 'send slower'},
    'qrt':  {'de': 'Stellen Sie die Übermittlung ein', 'en': 'I am suspending operation shut off'},
    'qru': {'de': 'Ich habe nichts für dich', 'en': 'i have nothing for you' },
    'qrv':  {'de': 'Ich bin bereit', 'en': 'I am ready'},
    'qrx':  {'de': 'Ich werde Sie um ... Uhr auf ... kHz wieder rufen.', 'en': 'I will call you again at ... on frq ...'},
    'qrz': {'de': 'Du wirst von ... auf ... kHz gerufen (oder: Wer ruft mich?)', 'en': 'who is calling me?' },
    'qsb':  {'de': 'Stärke schwankt', 'en': 'Your signals are fading'},
    'qsk':  {'de': 'I kann Sie zwischen meinen Zeichen hören. Sie dürfen mich wäährend meiner Übermittlung unterbrechen.', 'en': 'I can hear you between my signals.'},
    'qsl': {'de': 'Empfangsbestätigung', 'en': 'confirmation' },
    'qso':  {'de': 'Ich kann mit ... unmittelbar verkehren', 'en': 'I can communicate directly with ...'},
    'qsp':  {'de': 'Ich werde an ... vermitteln.', 'en': 'I can relay a message to ...'},
    'qst': {'de': 'Nachricht an Alle!', 'en': 'broadcast!' },
    'qsy': {'de': 'Frequenz ändern auf ... kHz', 'en': 'change freq. to ... kHz' },
    'qtc':  {'de': 'Ich habe Nachrichten für Sie', 'en': 'I have telegrams for you'},
    'qth':  {'de': 'Mein Standort ist ...', 'en': 'My position is ...'},
    'qtr':  {'de': 'Es ist ... Uhr', 'en': 'Correct time UTC is ...'},
    'r': {'de': 'Dezimalkomma (zwischen Zahlen), richtig, verstanden, keine Wiederholung nötig, Romeo', 'en': 'decimal point, roger, received, Romeo' },
    'rcvd': {'de': 'empfangen', 'en': 'received' },
    're': {'de': 'bezüglich ...', 'en': 'regarding ...' },
    'ref': {'de': 'Referenz ...', 'en': 'reference ...' },
    'rf': {'de': 'Hochfrequenz', 'en': 'radio frequency, high frequency' },
    'rfi': {'de': 'Funkstörungen', 'en': 'radio frequency interference' },
    'rig': {'de': 'Stationsausrüstung, Funkgerät', 'en': 'rig, station equipment' },
    'rprt': {'de': 'Rapport', 'en': 'report' },
    'rpt': {'de': 'wiederholen', 'en': 'repeat' },
    'rq': {'de': 'Frage', 'en': 'request' },
    'rst': {'de': 'readability, strength, tone', 'en': 'readability, strength, tone' },
    'rtty': {'de': 'Funkfernschreiben', 'en': 'radio teletype' },
    'rx': {'de': 'Empfänger', 'en': 'receiver' },
    's': {'de': 'Sierra', 'en': 'Sierra'  },
    'sae': {'de': 'adressierter Rückumschlag', 'en': 'self addressed envelope' },
    'sase': {'de': 'Adressiertes, frankiertes Kuvert für QSL Karte', 'en': 'self adressed stamped envelope' },
    'shf': {'de': 'super high frequency (cm-Wellen)', 'en': 'super high frequency' },
    'sigs': {'de': 'Zeichen', 'en': 'signals' },
    'sk': {'de': '"Verkehrsschluss (bei Funksprüchen), auch: Hinweis auf den Tod eines hams"', 'en': '"end of contact, also death of ham"' },
    'sked': {'de': 'Verabredung', 'en': 'schedule' },
    'sn': {'de': 'bald', 'en': 'soon' },
    'sota': {'de': 'summits on the air', 'en': 'summits on the air' },
    'sp': {'de': 'short path', 'en': 'short path' },
    'sri': {'de': 'leider, tut mir leid', 'en': 'sorry' },
    'ssb': {'de': 'Single Sideband', 'en': 'single sideband' },
    'sstv': {'de': 'Bildübertragung', 'en': 'slow scan t.v.' },
    'stn': {'de': 'Station', 'en': 'station' },
    'sum': {'de': 'etwas, ein wenig', 'en': 'some' },
    'sure': {'de': 'sicher, gewiss', 'en': 'sure' },
    'swl': {'de': 'Kurzwellenhörer', 'en': 'short-ware listener' },
    'swr': {'de': 'Stehwellenverhältnis', 'en': 'standing wave ratio' },
    't': {'de': 'turns / tera- / 0, Tango', 'en': 'turns / tera- / 0, Tango' },
    'tcvr': {'de': 'Sendeempfänger', 'en': 'transceiver' },
    'temp': {'de': 'Temperatur', 'en': 'temperature' },
    'test': {'de': 'Versuch (auch: Contest-Anruf)', 'en': 'test' },
    'tfc': {'de': 'Funkverkehr', 'en': 'traffic' },
    'thru': {'de': 'durch', 'en': 'trough' },
    'tia': {'de': 'thanks in advance', 'en': 'thanks in advance' },
    'tks': {'de': 'danke, Dank', 'en': 'thanks' },
    'tmw': {'de': 'morgen', 'en': 'tomorrow' },
    'tnx': {'de': 'danke, Dank', 'en': 'thanks' },
    'trub': {'de': 'Schwierigkeiten, Störungen', 'en': 'trouble' },
    'trx': {'de': 'Sendeempfänger', 'en': 'transceiver' },
    'tu': {'de': 'Danke', 'en': 'Thank You' },
    'tvi': {'de': 'Fernsehstörungen', 'en': 't.v. interference' },
    'tx': {'de': 'Sender', 'en': 'transmitter' },
    'u': {'de': 'Du, Uniform', 'en': 'you, Uniform' },
    'ufb': {'de': 'ganz ausgezeichnet', 'en': 'ultra fine business' },
    'uhf': {'de': 'ultra high frequency (dezimeter-Wellen)', 'en': 'ultra high frequency' },
    'ukw': {'de': 'Ultrakurzwelle', 'en': 'very high frequency' },
    'unlis': {'de': 'unlizenziert, "Pirat"', 'en': 'unlicensed' },
    'up': {'de': 'aufwärts, höhere Frequenz ... kHz', 'en': 'up ... kHz' },
    'ur': {'de': 'Du bist ...', 'en': 'your, you are ...' },
    'urs': {'de': 'die Ihrigen, Deine Familie', 'en': 'your´s' },
    'usb': {'de': 'oberes Seitenband', 'en': 'upper side band' },
    'utc': {'de': 'koordinierte Weltzeit (Z-time)', 'en': 'universal time coordinated' },
    'v': {'de': 'Viktor', 'en': 'Viktor' },
    've': {'de': 'Verstanden', 'en': 'verified' },
    'vert': {'de': 'Vertikal (Antenne)', 'en': 'vertical (antenna)' },
    'vfo': {'de': 'verstellbarer Oszillator', 'en': 'variable frequency oscillator' },
    'vhf': {'de': 'very high frequency (UKW-Bereich)', 'en': 'very high frequency' },
    'vl': {'de': 'viel', 'en': 'many' },
    'vln': {'de': 'Vielen', 'en': 'many' },
    'vy': {'de': 'sehr', 'en': 'very' },
    'w': {'de': 'Watt (Leistungsangabe), Whiskey', 'en': 'watt, watts, Whiskey' },
    'watts': {'de': 'watt', 'en': 'watts' },
    'wid': {'de': 'mit', 'en': 'with' },
    'wkd': {'de': 'gearbeitet (gefunkt mit...)', 'en': 'worked' },
    'wkg': {'de': 'ich arbeite (mit...)', 'en': 'working' },
    'wl': {'de': 'ich werde ...', 'en': 'i will ...' },
    'wpm': {'de': 'Worte pro Minute', 'en': 'words per minute' },
    'wtts': {'de': 'Watt (Leistungsangabe)', 'en': 'watts' },
    'wud': {'de': 'würde', 'en': 'would' },
    'wx': {'de': 'Wetter', 'en': 'weather' },
    'x': {'de': 'X-Ray', 'en': 'X-Ray'  },
    'xcus': {'de': 'Entschuldigung, entschuldige', 'en': 'excuse' },
    'xcvr': {'de': 'Sendeemfänger', 'en': 'transceiver' },
    'xmas': {'de': 'Weihnachten', 'en': 'Christmas' },
    'xmtr': {'de': 'Sender', 'en': 'transmitter' },
    'xtal': {'de': 'Quarz', 'en': 'crystal, quartz crystal' },
    'xxx': {'de': 'Dringlichkeitszeichen', 'en': 'urgency signal' },
    'xyl': {'de': 'Ehefrau', 'en': 'ex young lady, wife' },
    'y': {'de': 'Yankee', 'en': 'Yankee'  },
    'yday': {'de': 'gestern', 'en': 'yesterday' },
    'yl': {'de': 'Funkerin, Frau', 'en': 'young lady' },
    'yr': {'de': 'Jahr', 'en': 'year' },
    'yrs': {'de': 'Jahre', 'en': 'years' },
    'z': {'de': 'Zulu Time', 'en': 'zulu time' },
}
