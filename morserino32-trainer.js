

let jsdiff = require('diff');

let storageKey = 'morserino-trainer';

//Define the elements
let receiveText = document.getElementById("receiveText");
let inputText = document.getElementById("inputText");
let connectButton = document.getElementById("connectButton");
let showHideButton = document.getElementById("showHideButton");
let statusBar = document.getElementById("statusBar");
let clearButton = document.getElementById("clearButton");
let saveButton = document.getElementById("saveButton");

let resultComparison = document.getElementById("resultComparison");
let inputComparator = document.getElementById("inputComparator");
let correctPercentage = document.getElementById("correctPercentage");
let compareTextsButton = document.getElementById("compareTextsButton");

let lastPercentage;
let showHideButtonState = true; // true = show
setTextShowHideButton();
showStoredResults(JSON.parse(localStorage.getItem(storageKey)));


//Couple the elements to the Events
connectButton.addEventListener("click", clickConnect)

showHideButton.addEventListener("click", clickShowHide);
clearButton.addEventListener("click", clearTextFields);
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

function clickShowHide() {
    showHideButtonState = !showHideButtonState;
    receiveText.classList.toggle("hidden");
    resultComparison.classList.toggle("hidden");
    setTextShowHideButton();
}

function setTextShowHideButton() {
    if (showHideButtonState) {
        showHideButton.innerText = "Hide text from Morserino";
    } else {
        showHideButton.innerText = "Show text from Morserino";
    }
}

function compareTexts() {
    let received = trimReceivedText(receiveText.value);
    let input = inputText.value.trim();

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

    inputComparator.replaceChildren(...elements);
    lastPercentage = received.length > 0 ? Math.round(correctCount / received.length * 100) : 0;
    
    correctPercentage.innerText = "Score: " + correctCount + "/" + received.length + " correct (" + lastPercentage + "%)";
}

function trimReceivedText(text) {
    text = text.trim();
    if (text.startsWith("vvv<ka> ")) {
        text = text.substring(" vvv<ka> ".length - 1);
    }
    if (text.endsWith(" +")) {
        text = text.substring(0, text.length - " +".length);
    }
    return text;
}

function createSpanElement(value, clasz) {
    return createElement(value, 'span', clasz);
}

function createElement(value, tag, clasz) {
    let element = document.createElement(tag);
    element.classList.add(clasz);
    element.innerHTML = value;
    return element;
}

function clearTextFields() {
    receiveText.value = "";
    inputText.value = "";
    inputComparator.innerHTML = "";
    correctPercentage.innerHTML = "";
}

function saveResult() {
    let storedResults = JSON.parse(localStorage.getItem(storageKey));
    if (!storedResults) {
        storedResults = [];
    }
    let receivedText = trimReceivedText(receiveText.value);
    let result = {text: receivedText, percentage: lastPercentage, date: Date.now()}
    storedResults.push(result);
    let storedResultsText = JSON.stringify(storedResults);
    localStorage.setItem(storageKey, storedResultsText);
    console.log('Saving result to localStorage', storedResultsText);
    showStoredResults(storedResults);
}


function showStoredResults(storedResults) {
    let resultElement = this.document.getElementById('savedResults');
    if (storedResults) {
        let elements = storedResults.map(result => {
            let text = result.text + (result.percentage ? ' (' + result.percentage + '%)' : '');
            return createElement(text, 'li', null);
        });
        elements = elements.reverse(); // sort by date descending
        resultElement.replaceChildren(...elements);  
    }
}

//Define outputstream, inputstream and port so they can be used throughout the sketch
var outputStream, inputStream, port;
navigator.serial.addEventListener('connect', e => {
    statusBar.innerText = `Connected to ${e.port}`;
    connectButton.innerText = "Disconnect"
});

navigator.serial.addEventListener('disconnect', e => {
    statusBar.innerText = `Disconnected`;
    connectButton.innerText = "Connect"
});

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

        statusBar.innerText = "Connected";
        connectButton.innerText = "Disconnect"
        let decoder = new TextDecoderStream();
        inputDone = port.readable.pipeTo(decoder.writable);
        inputStream = decoder.readable;

        const encoder = new TextEncoderStream();
        outputDone = encoder.readable.pipeTo(port.writable);
        outputStream = encoder.writable;

        reader = inputStream.getReader();
        readLoop();
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
    statusBar.innerText = "Disconnected";
    connectButton.innerText = "Connect"
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
    }
}
