

let jsdiff = require('diff');
let Charts = require('chart.js');

// some constants
let storageKey = 'morserino-trainer';

const MORSERINO_START = 'vvv<ka> ';
const MORSERINO_END = ' +';

const MODE_ECHO_TRAINER = 'echo-trainer';
const MODE_CW_GENERATOR = 'cw-generator';
let mode = MODE_CW_GENERATOR;

// define the elements
let receiveText = document.getElementById("receiveText");
let inputText = document.getElementById("inputText");
let connectButton = document.getElementById("connectButton");
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

// --------------- chart template -----------------
let ctx = document.getElementById('savedResultChart');
let savedResultChart = new Chart(ctx, {
    type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Score',
                    data: [],
                    borderColor: '#0d6efd', // same color as blue buttons
                    tension: 0.3
                }]
            },
            options: {
                scales: {
                    y: {
                        ticks: {
                            // Include a dollar sign in the ticks
                            callback: function(value, index, ticks) {
                                return value + '%';
                            }
                        },
                        beginAtZero: true
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: 'Score',
                    },
                    legend: {
                        display: false,
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

showSavedResults(JSON.parse(localStorage.getItem(storageKey)));

// couple the elements to the Events
connectButton.addEventListener("click", clickConnect)

showReceivedCheckbox.addEventListener("change", clickShowReceived);
ignoreWhitespaceCheckbox.addEventListener("change", clickIgnoreWhitespace);
clearAllButton.addEventListener("click", clearTextFields);
clearReceivedButton.addEventListener("click", clearReceivedTextField);
compareTextsButton.addEventListener("click", compareTexts);
saveButton.addEventListener("click", saveResult);

inputText.oninput = compareTexts;
clearEchoTrainerButton.addEventListener("click", clearEchoTrainerFields);


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

// ------------------------------ cw generator code ------------------------------
function clickShowReceived() {
    let shouldShow = showReceivedCheckbox.checked;
    console.log('should show: ', shouldShow);
    if (shouldShow) {
        document.getElementById("morserino_detail").classList.add('show');
        resultComparison.classList.add('show');
    } else {
        document.getElementById("morserino_detail").classList.remove('show');
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
        showReceivedCheckbox.dispatchEvent(new Event("change"));
        console.log('auto hiding text');
    }
    if (!showReceivedCheckbox.checked && text.startsWith(MORSERINO_START) && text.endsWith(MORSERINO_END)) {
        showReceivedCheckbox.checked = true;
        showReceivedCheckbox.dispatchEvent(new Event("change"));
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
    
    correctPercentage.innerText = "Score: " + correctCount + "/" + totalCount + " correct (" + lastPercentage + "%)";
}

function createHtmlForComparedText(received, input, ignoreWhitespace) {
    let elements = [];
    let correctCount = 0;

    if (ignoreWhitespace) {
        received = received.replace(/\s/g,"");
        input = input.replace(/\s/g,"");
    }

    let diff = jsdiff.diffChars(received, input);
    diff.forEach(function (part) {
        // green for additions, red for deletions
        // grey for common parts
        if (part.added) {
            elements.push(createSpanElement(part.value, "wrong"))
        } else if (part.removed) {
            elements.push(createSpanElement(part.value, "missing"))
        } else {
            correctCount += part.value.length;
            elements.push(createSpanElement(part.value, "correct"))
        }
    });
    return [elements, correctCount, received.length];
}

function trimReceivedText(text) {
    text = text.trim();
    if (text.toLowerCase().startsWith(MORSERINO_START)) {
        text = text.substring(MORSERINO_START.length);
    }
    if (text.endsWith(" +")) {
        text = text.substring(0, text.length - MORSERINO_END.length);
    }
    return text;
}

function createSpanElement(value, clasz) {
    return createElement(value, 'span', clasz);
}

function createElement(value, tag, clasz) {
    let element = document.createElement(tag);
    if (clasz) {
        element.classList.add(...clasz.split(' '));
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
    inputText.value = "";
    clearReceivedTextField();
}

function clearReceivedTextField() {
    receiveText.value = "";
    inputComparator.innerHTML = "";
    correctPercentage.innerHTML = "";
}

// ------------------------------ handle save(d) result(s) -------------------------------
function saveResult() {
    let storedResults = JSON.parse(localStorage.getItem(storageKey));
    if (!storedResults) {
        storedResults = [];
    }
    let receivedText = trimReceivedText(receiveText.value);
    let input = inputText.value.trim();
    let result = {text: receivedText, input: input, percentage: lastPercentage, date: Date.now(), ignoreWhitespace: ignoreWhitespace};
    storedResults.push(result);
    let storedResultsText = JSON.stringify(storedResults);
    localStorage.setItem(storageKey, storedResultsText);
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
            cells.push(createElement((result.percentage ? ' (' + result.percentage + '%)' : ''), 'td', null));
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
    let savedResults = JSON.parse(localStorage.getItem(storageKey));
    // remove element index from array:
    savedResults = savedResults.slice(0,index).concat(savedResults.slice(index + 1));
    localStorage.setItem(storageKey, JSON.stringify(savedResults));
    showSavedResults(savedResults);
}

// ------------------------ graph code ------------------------
function drawSavedResultGraph(savedResults) {
    console.log('Drawing stored result graph');
    let percentageValues = [];
    let labels = [];
    savedResults.forEach((result, index) => {
        let date = new Date(result.date);
        var dateString = date.toLocaleDateString() + ' ' + date.toLocaleTimeString()
        labels.push(dateString);
        percentageValues.push(result.percentage);
    });
    savedResultChart.data.labels = labels;
    savedResultChart.data.datasets[0].data = percentageValues;
    savedResultChart.update();
}

function showHideSavedResultGraph(savedResults) {
    let canvasElement = document.getElementById('savedResultChart');
    if (savedResults && savedResults.length > 0) {
        console.log('showing graph');
        canvasElement.style.display = "block";
    } else {
        console.log('hiding graph');
        canvasElement.style.display = "none";
    }
}


// ------------------------ tab handling ------------------------
for (tabElement of document.querySelectorAll('button[data-bs-toggle="tab"]')) {
	tabElement.addEventListener('shown.bs.tab', tabEventListener);
}

function tabEventListener(event) {
    console.log('tab event', event);	
    if (event.target.id === 'cw-generator-tab') {
        mode = MODE_CW_GENERATOR;
    } else if (event.target.id === 'echo-trainer-tab') {
        mode = MODE_ECHO_TRAINER;
    }
  }


// ------------------------ echo trainer code ------------------------
function detectAbbreviation() {
    let text = receiveTextEchoTrainer.value;
    if (text.endsWith(' OK' + String.fromCharCode(10))) {
        let lines = text.split(String.fromCharCode(10));
        let lastLine = lines[lines.length - 2]; // last element is always empty
        let abbreviation = lastLine.split(' ')[0];
        if (abbreviation in abbreviations) {
            console.log('Abbreviation detected:', abbreviation, abbreviations[abbreviation]);
            let abbrevText = abbreviations[abbreviation]['en'] + '/' + abbreviations[abbreviation]['de'];
            let content = receiveTextEchoTrainer.value.slice(0, -1); // cut off trailing new line
            receiveTextEchoTrainer.value = content + ' (' + abbrevText + ')' + String.fromCharCode(10);
        }
    }
}

function clearEchoTrainerFields() {
    receiveTextEchoTrainer.value = "";
}

// ------------------------ serial communication code ------------------------

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

        inputText.focus();
    } catch (e) {

        //If the pipeTo error appears; clarify the problem by giving suggestions.
        if (e == "TypeError: Cannot read property 'pipeTo' of undefined") {
            e += "\n Use Google Chrome and enable-experimental-web-platform-features"
        }
        connectButton.innerText = "Connect"
        statusBar.innerText = e;
    }
}
//Write to the Serial port
async function writeToStream(line) {
    const writer = outputStream.getWriter();
    writer.write(line);
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

//When the send button is pressed
function clickSend() {
    //send the message
    writeToStream(sendText.value)
    //and clear the input field, so it's clear it has been sent
    sendText.value = "";
}

//Read the incoming data
async function readLoop() {
    while (true) {
        const { value, done } = await reader.read();
        if (done === true) {
            break;
        }
        //When recieved something add it to the textarea
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
        }
    }
}

// source: https://de.wikipedia.org/wiki/Liste_von_Abk%C3%BCrzungen_im_Amateurfunk
// and cw abbreviations CW-Schule graz
abbreviations = {
    '33': {'de' : 'Grüße unter Funkerinnen', 'en' :'female ham greeting' },
    '55': {'de' : 'Viel Erfolg', 'en' :'-' },
    '72': {'de' : 'Viele Grüße QRP', 'en' :'Best regards QRP' },
    '73': {'de' : 'Viele Grüße', 'en' :'Best regards' },
    '88': {'de' : 'Liebe und Küsse', 'en' :'Love and kisses' },
    '99': {'de' : 'Verschwinde', 'en' :'get lost' },
    'a': {'de': 'alpha', 'en': 'alpha'  },
    'abt': {'de' : 'ungefähr', 'en' :'about' },
    'ac': {'de' : 'Wechselstrom (auch Brumm)', 'en' :'alternating current' },
    'adr': {'de' : 'Anschrift', 'en' :'address' },
    'agn': {'de' : 'Wieder, nochmals', 'en' :'again' },
    'am': {'de' : 'Vormittag (ante meridiem)', 'en' :'a.m.' },
    'ani': {'de' : 'Irgendein, jemand', 'en' :'any' },
    'ans': {'de' : 'Antwort', 'en' :'answer' },
    'ant': {'de' : 'Antenne', 'en' :'antenna' },
    'any': {'de' : 'Irgendein, jemand', 'en' :'any' },
    'ar': {'de' : 'Spruchende', 'en' :'end of message' },
    'as': {'de' : 'Bitte warten', 'en' :'please wait quietly' },
    'award': {'de' : 'Amateurfunkdiplom', 'en' :'award' },
    'awdh': {'de' : 'auf Wiederhören', 'en' :'-' },
    'awds': {'de' : 'auf Wiedersehen', 'en' :'-' },
    'b': {'de': 'bravo', 'en': 'bravo'  },
    'bci': {'de' : 'Rundfunkstörungen', 'en' :'Broadcast interference' },
    'bcnu': {'de' : 'Hoffe Sie wieder zu treffen', 'en' :'be seeing you' },
    'bd': {'de' : 'schlecht', 'en' :'bad' },
    'bk': {'de' : 'Pause', 'en' :'break' },
    'bpm': {'de' : 'Buchstaben pro Minute', 'en' :'-' },
    'bt': {'de' : 'Trennung (=)', 'en' :'break (=)' },
    'btr': {'de' : 'besser', 'en' :'better' },
    'bug': {'de' : 'halbautomatische Taste', 'en' :'semi-automatic key' },
    'c': {'de' : 'ja, Bejahung (von spanisch "si")', 'en' :'yes, correct, affirmation (from spanish "si")' },
//    'c': {'de': 'charly', 'en': 'charly'  },
    'call': {'de' : 'Rufzeichen, rufen', 'en' :'call-sign, call' },
    'cfm': {'de' : 'bestätige', 'en' :'confirm' },
    'cheerio': {'de' : 'Servus! Tschüss! (Grußwort)', 'en' :'cheerio' },
    'cl': {'de' : 'Station wird abgeschaltet', 'en' :'close' },
    'cld': {'de' : 'gerufen', 'en' :'called' },
    'clg': {'de' : 'rufend, ich rufe', 'en' :'calling' },
    'col': {'de' : 'kollationieren', 'en' :'collate' },
    'conds': {'de' : 'Ausbreitungsbedingungen', 'en' :'conditions' },
    'condx': {'de' : 'DX-Ausbreitungsbedingungen', 'en' :'dx-conditions' },
    'cpi': {'de' : 'aufnehmen', 'en' :'copy' },
    'cq': {'de' : 'allgemeiner Anruf', 'en' :'seek you' },
    'crd': {'de' : 'Stationskarte, (QSL-Karte)', 'en' :'card, verification card' },
    'cs': {'de' : 'Rufzeichen', 'en' :'call sign' },
    'cuagn': {'de' : 'wir treffen uns wieder', 'en' :'see you again' },
    'cud': {'de' : 'konnte, könnte', 'en' :'could' },
    'cul': {'de' : 'wir sehen uns wieder', 'en' :'see you later' },
    'cw': {'de' : 'Tastfunk, Morsetelegrafie', 'en' :'code work' },
    'd': {'de': 'delta', 'en': 'delta'  },
    'de': {'de' : 'von (vor dem eigenen Rufz.)', 'en' :'from' },
    'dl': {'de' : 'Deutschland', 'en' :'Germany' },
    'dok': {'de' : 'Distrikts-Ortsverbandskenner (DARC)', 'en' :'DOK' },
    'dr': {'de' : 'lieber, liebe', 'en' :'dear' },
    'dwn': {'de' : 'abwärts, niedrigere Frequenz', 'en' :'down' },
    'dx': {'de' : 'große Entfernung, Fernverbindung', 'en' :'long distance' },
    'el': {'de' : '(Antennen-)Elemente', 'en' :'elements' },
    'elbug': {'de' : 'elektronische Taste', 'en' :'electronic key' },
    'ere': {'de' : 'hier', 'en' :'here' },
    'es': {'de' : 'und, &', 'en' :'and, &' },
    'f': {'de': 'foxrott', 'en': 'foxrott'  },
    'fb': {'de' : 'ausgezeichnet, prima', 'en' :'fine business' },
    'fer': {'de' : 'für', 'en' :'for' },
    'fm': {'de' : 'von', 'en' :'from' },
    'fone': {'de' : 'Telefonie', 'en' :'telephony' },
    'fr': {'de' : 'für', 'en' :'for' },
    'frd': {'de' : 'Freund', 'en' :'friend' },
    'freq': {'de' : 'Frequenz', 'en' :'frequency' },
    'g': {'de': 'golf', 'en': 'golf'  },
    'ga': {'de' : 'beginnen Sie, anfangen', 'en' :'go ahead' },
    'ga': {'de' : 'Guten Nachmittag', 'en' :'good afternoon' },
    'gb': {'de' : 'leben Sie wohl', 'en' :'good bye' },
    'gd': {'de' : 'Guten Tag!', 'en' :'good day (nicht GB)' },
    'ge': {'de' : 'Guten Abend!', 'en' :'good evening' },
    'gl': {'de' : 'viel Glück', 'en' :'good luck' },
    'gld': {'de' : 'erfreut', 'en' :'glad' },
    'gm': {'de' : 'Guten Morgen!', 'en' :'good morning' },
    'gn': {'de' : 'Gute Nacht!', 'en' :'good night' },
    'gnd': {'de' : 'Erdung, Erdpotential', 'en' :'ground' },
    'gp': {'de' : 'Ground-Plane-Antenne', 'en' :'ground plane antenna' },
    'gud': {'de' : 'gut', 'en' :'good' },
    'guhor': {'de' : 'kein Empfang (mehr)', 'en' :'going unable to hear or receive' },
    'h': {'de': 'hotel', 'en': 'hotel'  },
    'ham': {'de' : 'Funkamateur', 'en' :'ham' },
    'hf': {'de' : 'Hochfrequenz, Kurzwelle', 'en' :'high frequency' },
    'hh': {'de' : 'Irrung', 'en' :'correction' },
    'hi': {'de' : 'lachen', 'en' :'laughing' },
    'hpe': {'de' : 'hoffen', 'en' :'hope' },
    'hr': {'de' : 'hier', 'en' :'here' },
    'hrd': {'de' : 'gehört', 'en' :'heard' },
    'hw?': {'de' : 'wie (werde ich empfangen)?', 'en' :'how?' },
    'hwsat?': {'de' : 'wie finden Sie das?', 'en' :'how is about that?' },
    'i': {'de' : 'ich', 'en' :'I' },
//    'i': {'de': 'india', 'en': 'india'  },
    'info': {'de' : 'Information', 'en' :'information' },
    'inpt': {'de' : 'Eingangsleistung', 'en' :'input' },
    'input': {'de' : 'Eingangsleistung', 'en' :'input' },
    'j': {'de': 'juliett', 'en': 'juliett'  },
    'k': {'de': 'kommen', 'en': 'come'  },
//    'k': {'de': 'kilo', 'en': 'kilo'  },
    'ka': {'de' : 'Spruchanfang', 'en' :'message begins' },
    'key': {'de' : 'Morsetaste', 'en' :'key' },
    'kn': {'de' : 'kommen, nur eine bestimmte Station', 'en' : '"Over to you, only the station named should respond (e.g. W7PTH DE W1AW KN)"' },
    'knw': {'de' : 'wissen', 'en' :'know' },
    'kw': {'de' : 'Kilowatt', 'en' :'kilowatt' },
    'l': {'de': 'lima', 'en': 'lima'  },
    'lid': {'de' : 'schlechter Operator', 'en' :'"lousy incompetent dummy"' },
    'lis': {'de' : 'lizenziert, Lizenz', 'en' :'licensed, licence' },
    'log': {'de' : 'Stations-, Funktagebuch', 'en' :'log book' },
    'lsb': {'de' : 'unteres Seitenband', 'en' :'lower sideband' },
    'lsn': {'de' : 'hören Sie', 'en' :'listen' },
    'ltr': {'de' : 'Brief', 'en' :'letter' },
    'lw': {'de' : 'Langdrahtantenne', 'en' :'long wire antenna' },
    'm': {'de': 'mike', 'en': 'mike'  },
    'min': {'de' : 'Minute', 'en' :'minute' },
    'mins': {'de' : 'Minuten', 'en' :'minutes' },
    'mm': {'de' : 'bewegliche Seestation', 'en' :'maritime mobile' },
    'mni': {'de' : 'viel, viele', 'en' :'many' },
    'msg': {'de' : 'Nachricht, Telegramm', 'en' :'message' },
    'mtr': {'de' : 'Meter, Messgerät', 'en' :'meter' },
    'my': {'de' : 'mein', 'en' :'my' },
    'n': {'de' : 'nein, Verneinung', 'en' :'no, negation' },
//    'n': {'de': 'november', 'en': 'november'  },
    'net': {'de' : 'Funknetz', 'en' :'net' },
    'nil': {'de' : 'nichts', 'en' :'nothing' },
    'no': {'de' : 'nein (auch: Nummer)', 'en' :'no (number)' },
    'nr': {'de' : 'nahe, Nummer', 'en' :'near, number' },
    'nw': {'de' : 'nun, jetzt', 'en' :'now' },
    'o': {'de': 'oscar', 'en': 'oscar'  },
    'ob': {'de' : 'alter Junge (vertrauliche Anrede)', 'en' :'old boy' },
    'oc': {'de' : 'alter Knabe (vertrauliche Anrede)', 'en' :'old chap' },
    'ok': {'de' : 'in Ordnung', 'en' :'O.K., okay' },
    'om': {'de' : 'Funker, Herr', 'en' :'old man' },
    'op': {'de' : 'Funker, Operator', 'en' :'operator' },
    'ot': {'de' : 'langjähriger Funker, „alter Herr“', 'en' :'oldtimer' },
    'output': {'de' : 'Ausgangsleistung', 'en' :'output' },
    'ow': {'de' : 'Ehefrau eines CB-Funkers', 'en' :'old woman' },
    'p': {'de': 'papa', 'en': 'papa'  },
    'pa': {'de' : 'Endstufe', 'en' :'power amplifier' },
    'pm': {'de' : 'Nachmittag (post meridiem)', 'en' :'p.m.' },
    'pse': {'de' : 'bitte', 'en' :'please' },
    'psed': {'de' : 'erfreut', 'en' :'pleased' },
    'pwr': {'de' : 'Leistung', 'en' :'power' },
    'q': {'de': 'quebec', 'en': 'quebec'  },
    'qra':  {'de': 'Der Name meiner Funkstelle ist...', 'en': 'name of my station is...'},
    'qrb':  {'de': 'Die Entfernung zwischen unseren Funkstellen beträgt ungefähr ... Kilometer.', 'en': 'distance betwenn our stations is...'},
    'qrg':  {'de': 'Ihre genaue Frequenz ist ...', 'en': 'your exact frequency is ...'},
    'qrl':  {'de': 'Ich bin beschäftigt, bitte nicht stören!', 'en': 'I am busy! Please, do not interfere'},
    'qrm':  {'de': 'Ich werde gestört', 'en': 'I have interference'},
    'qrn':  {'de': 'Ich werde durch athmospärische Störungen beeinträchtigt (1: not, 5: sehr stark)', 'en': 'I am troubled by static (1:nil, 5: very strong'},
    'qro':  {'de': 'Sendeleistung erhöhen', 'en': 'increase power'},
    'qrp':  {'de': 'Sendeliestung vermindern', 'en': 'decrease power'},
    'qrq':  {'de': 'Geben Sie schneller', 'en': 'send faster'},
    'qrs':  {'de': 'Geben Sie langsamer', 'en': 'send slower'},
    'qrt':  {'de': 'Stellen Sie die Übermittlung ein', 'en': 'I am suspending operation shut off'},
    'qru':  {'de': 'Ich habe nichts für Sie', 'en': 'I have nothing for you'},
    'qrv':  {'de': 'Ich bin bereit', 'en': 'I am ready'},
    'qrx':  {'de': 'Ich werde Sie um ... Uhr auf ... kHz wieder rufen.', 'en': 'I will call you again at ... on frq ...'},
    'qrz':  {'de': 'Sie werden von ... auf ... kHz gerufen', 'en': 'You are called by ...'},
    'qsb':  {'de': 'Stärke schwankt', 'en': 'Your signals are fading'},
    'qsk':  {'de': 'I kann Sie zwischen meinen Zeichen hören. Sie dürfen mich wäährend meiner Übermittlung unterbrechen.', 'en': 'I can hear you between my signals.'},
    'qsl':  {'de': 'Ich gebe eine Empfangsbestätigung', 'en': 'I will acknowledge receipt'},
    'qso':  {'de': 'Ich kann mit ... unmittelbar verkehren', 'en': 'I can communicate directly with ...'},
    'qsp':  {'de': 'Ich werde an ... vermitteln.', 'en': 'I can relay a message to ...'},
    'qst':  {'de': 'Ich rufe alle Stationen / Nachricht an alle', 'en': 'Broadcasting to all stations'},
    'qsy':  {'de': 'Gehen Sie zum Senden auf eine andere Frequenz (oder auf ... kHz)', 'en': 'Change for transmission to frq ...'},
    'qtc':  {'de': 'Ich habe Nachrichten für Sie', 'en': 'I have telegrams for you'},
    'qth':  {'de': 'Mein Standort ist ...', 'en': 'My position is ...'},
    'qtr':  {'de': 'Es ist ... Uhr', 'en': 'Correct time UTC is ...'},
//    'r': {'de' : 'Dezimalkomma (zwischen Zahlen)', 'en' :'decimal point' },
    'r': {'de' : 'richtig, verstanden, keine Wiederholung nötig', 'en' :'"roger", right, received' },
//    'r': {'de': 'romeo', 'en': 'romeo'  },
    'rcvd': {'de' : 'empfangen', 'en' :'received' },
    'ref': {'de' : 'Referenz, Bezug, bezüglich', 'en' :'reference' },
    'rf': {'de' : 'Hochfrequenz', 'en' :'radio frequency, high frequency' },
    'rfi': {'de' : 'Funkstörungen', 'en' :'radio frequency interference' },
    'rig': {'de' : 'Stationsausrüstung, Funkgerät', 'en' :'rig, station equipment' },
    'rprt': {'de' : 'Bericht', 'en' :'report' },
    'rpt': {'de' : 'wiederholen', 'en' :'repeat' },
    'rq': {'de' : 'Frage', 'en' :'request' },
    'rtty': {'de' : 'Funkfernschreiben', 'en' :'radio teletype' },
    'rx': {'de' : 'Empfänger', 'en' :'receiver' },
    's': {'de': 'sierra', 'en': 'sierra'  },
    'sae': {'de' : 'adressierter Rückumschlag', 'en' :'self addressed envelope' },
    'sase': {'de' : 'freigemachter adressierter Rückumschlag (SASE)', 'en' :'self addressed and stamped' },
    'sigs': {'de' : 'Signale', 'en' :'signals' },
    'sk': {'de' : '"Verkehrsschluss (bei Funksprüchen), auch: Hinweis auf den Tod eines hams"', 'en' :'"end of contact, also death of ham"' },
    'sked': {'de' : 'Verabredung', 'en' :'schedule' },
    'sn': {'de' : 'bald', 'en' :'soon' },
    'sri': {'de' : 'leider', 'en' :'sorry' },
    'stn': {'de' : 'Station', 'en' :'station' },
    'sum': {'de' : 'etwas, ein wenig', 'en' :'some' },
    'sure': {'de' : 'sicher, gewiss', 'en' :'sure' },
    'swl': {'de' : 'Kurzwellenhörer', 'en' :'short-ware listener' },
    'swr': {'de' : 'Stehwellenverhältnis', 'en' :'standing wave ratio' },
    't': {'de': 'tango', 'en': 'tango'  },
    'tcvr': {'de' : 'Sendeempfänger', 'en' :'transceiver' },
    'temp': {'de' : 'Temperatur', 'en' :'temperature' },
    'test': {'de' : 'Versuch (auch: Contest-Anruf)', 'en' :'test' },
    'tfc': {'de' : 'Funkverkehr', 'en' :'traffic' },
    'thru': {'de' : 'durch', 'en' :'trough' },
    'tks': {'de' : 'danke, Dank', 'en' :'thanks' },
    'tmw': {'de' : 'morgen', 'en' :'tomorrow' },
    'tnx': {'de' : 'danke, Dank', 'en' :'thanks' },
    'trub': {'de' : 'Schwierigkeiten, Störungen', 'en' :'trouble' },
    'trx': {'de' : 'Sendeempfänger', 'en' :'transceiver' },
    'tu': {'de' : 'danke', 'en' :'thank you' },
    'tx': {'de' : 'Sender', 'en' :'transmitter' },
    'u': {'de' : 'Sie, Du', 'en' :'you' },
//    'u': {'de': 'uniform', 'en': 'uniform'  },
    'ufb': {'de' : 'ganz ausgezeichnet', 'en' :'ultra fine business' },
    'unlis': {'de' : 'unlizenziert, "Pirat"', 'en' :'unlicensed' },
    'up': {'de' : 'aufwärts, höhere Frequenz', 'en' :'up' },
    'ur': {'de' : 'ihr, dein', 'en' :'your' },
    'urs': {'de' : 'die Ihrigen, Deine Familie', 'en' :'your´s' },
    'usb': {'de' : 'oberes Seitenband', 'en' :'upper side band' },
    'utc': {'de' : 'koordinierte Weltzeit (Z-time)', 'en' :'universal time coordinated' },
    'v': {'de': 'viktor', 'en': 'viktor'  },
    've': {'de' : 'Verstanden', 'en' :'verified' },
    'vy': {'de' : 'sehr', 'en' :'very' },
    'w': {'de' : 'Watt (Leistungsangabe)', 'en' :'watt, watts' },
//    'w': {'de': 'whiskey', 'en': 'whiskey'  },
    'wid': {'de' : 'mit', 'en' :'with' },
    'wkd': {'de' : 'gearbeitet (gefunkt mit...)', 'en' :'worked' },
    'wkg': {'de' : 'ich arbeite (mit...)', 'en' :'working' },
    'wpm': {'de' : 'Worte pro Minute', 'en' :'words per minute' },
    'wtts': {'de' : 'Watt (Leistungsangabe)', 'en' :'watts' },
    'wud': {'de' : 'würde', 'en' :'would' },
    'wx': {'de' : 'Wetter', 'en' :'weather' },
    'x': {'de': 'x-ray', 'en': 'x-ray'  },
    'xcus': {'de' : 'Entschuldigung, entschuldige', 'en' :'excuse' },
    'xmas': {'de' : 'Weihnachten', 'en' :'Christmas' },
    'xmtr': {'de' : 'Sender', 'en' :'transmitter' },
    'xtal': {'de' : 'Quarz', 'en' :'crystal, quartz crystal' },
    'xxx': {'de' : 'Dringlichkeitszeichen', 'en' :'urgency signal' },
    'xyl': {'de' : 'Ehefrau', 'en' :'ex young lady, wife' },
    'y': {'de': 'yankee', 'en': 'yankee'  },
    'yday': {'de' : 'gestern', 'en' :'yesterday' },
    'yl': {'de' : 'Funkerin, Frau', 'en' :'young lady' },
    'yr': {'de' : 'Jahr', 'en' :'year' },
    'yrs': {'de' : 'Jahre', 'en' :'years' },
    'z': {'de': 'zulu', 'en': 'zulu'  },
}
