
/*
This code is highly based on the webSerial tutorial by Google:
https://codelabs.developers.google.com/codelabs/web-serial/#0
*/


//Define the elements
let receiveText = document.getElementById("receiveText");
let inputText = document.getElementById("inputText");
let connectButton = document.getElementById("connectButton");
let showHideButton = document.getElementById("showHideButton");
let statusBar = document.getElementById("statusBar");
let startButton = document.getElementById("startButton");


let resultComparison = document.getElementById("resultComparison");
let inputComparator = document.getElementById("inputComparator");
let correctPercentage = document.getElementById("correctPercentage");
let compareTextsButton = document.getElementById("compareTextsButton");

const myers = require('myers-diff');

let showHideButtonState = true; // true = show
setTextShowHideButton();

//Couple the elements to the Events
connectButton.addEventListener("click", clickConnect)

showHideButton.addEventListener("click", clickShowHide);
startButton.addEventListener("click", startChallenge);
compareTextsButton.addEventListener("click", compareTexts);

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
    let received = receiveText.value.trim();
    let input = inputText.value.trim();

    if (received.startsWith("vvv<ka> ") && !input.startsWith("vvv<ka> ")) {
        received = received.substring(" vvv<ka> ".length - 1);
    }
    if (received.endsWith(" +") && !input.endsWith(" +")) {
        received = received.substring(0, received.length - " +".length - 1);
    }

    const changes = myers.diff(received, input, {
        compare: 'chars',
        ignoreWhitespace: false,
        ignoreCase: true,
        ignoreAccents: false
    });

    //console.log(changes);

    let elements = [];
    let index = 0;
    let errorCount = 0;
    let correctCount = 0;

    for (const change of changes) {
        // add correct text before next change:
        let nextPos = change.lhs.pos;
        correctCount += nextPos - index;
        let correctText = received.substring(index, nextPos);
        //console.log("correctText: ", correctText);
        elements.push(createSpanElement(correctText, "correct"));
        index = nextPos;

        if (myers.changed(change.lhs)) {
            // deleted
            const { pos, text, del, length } = change.lhs;
            //console.log("deleted: ", pos, text, del, length);
            let deletedText = received.substring(pos, pos + length);
            //console.log("deletedText: ", deletedText);
            elements.push(createSpanElement(deletedText, "missing"))
            index = pos + length;
            //console.log("index: ", index);
            errorCount += length;
        }
        if (myers.changed(change.rhs)) {
            // added
            const { pos, text, add, length } = change.rhs;
            //console.log("added: ", pos, text, add, length);
            let addedText = input.substring(pos, pos + length);
            //console.log("addedText: ", addedText);
            elements.push(createSpanElement(addedText, "wrong"))
            errorCount += length;
        }
    }

    // add end of string
    correctCount += received.length - index;
    let endText = received.substring(index);
    //console.log("endText:", endText);
    elements.push(createSpanElement(endText, "correct"));

    inputComparator.replaceChildren(...elements);
    percentage = received.length > 0 ? Math.round(correctCount / received.length * 100) : 0;
    correctPercentage.innerText = "Score: " + correctCount + "/" + received.length + " correct (" + percentage + "%)";
};

function createSpanElement(value, clasz) {
    let element = document.createElement('span');
    element.classList.add(clasz);
    element.innerHTML = value;
    return element;
}

function startChallenge() {
    receiveText.value = "";
    inputText.value = "";
    inputComparator.innerHTML = "";
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
