

let jsdiff = require('diff');
let Charts = require('chart.js');

let storageKey = 'morserino-trainer';

const MORSERINO_START = 'vvv<ka> ';
const MORSERINO_END = ' +';

//Define the elements
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
let ignoreWhitespace = true;

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

//Couple the elements to the Events
connectButton.addEventListener("click", clickConnect)

showReceivedCheckbox.addEventListener("change", clickShowReceived);
ignoreWhitespaceCheckbox.addEventListener("change", clickIgnoreWhitespace);
clearAllButton.addEventListener("click", clearTextFields);
clearReceivedButton.addEventListener("click", clearReceivedTextField);
compareTextsButton.addEventListener("click", compareTexts);
saveButton.addEventListener("click", saveResult);

inputText.oninput = compareTexts;

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

function compareTexts() {
    let received = trimReceivedText(receiveText.value).toLowerCase();
    let input = inputText.value.trim().toLowerCase();

    if(ignoreWhitespace) {
        received = received.replace(/\s/g,"");
        input = input.replace(/\s/g,"");
    }

    let [elements, correctCount] = createHtmlForComparedText(received, input);

    inputComparator.replaceChildren(...elements);
    lastPercentage = received.length > 0 ? Math.round(correctCount / received.length * 100) : 0;
    
    correctPercentage.innerText = "Score: " + correctCount + "/" + received.length + " correct (" + lastPercentage + "%)";
}

function createHtmlForComparedText(received, input) {
    let elements = [];
    let correctCount = 0;

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
    return [elements, correctCount];
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

function saveResult() {
    let storedResults = JSON.parse(localStorage.getItem(storageKey));
    if (!storedResults) {
        storedResults = [];
    }
    let receivedText = trimReceivedText(receiveText.value);
    let input = inputText.value.trim();
    let result = {text: receivedText, input: input, percentage: lastPercentage, date: Date.now()};
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
                let [comparedElements, correctCount] = createHtmlForComparedText(result.text, result.input);
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
        //When recieved something add it to the big textarea
        receiveText.value += value;
        //Scroll to the bottom of the text field
        receiveText.scrollTop = receiveText.scrollHeight;
        compareTexts();
        applyAutoHide();
    }
}
