
// speech synthesis
const speech = new Speech('en'); // see speech.js
const m32ProtocolHandler = new M32ProtocolHandler(speech);

// some constants

let VERSION = '0.4.0-beta5';

const MORSERINO_START = 'vvv<ka> ';
const MORSERINO_END = ' +';

const MODE_SERIAL_TEST = 'serial-test';
let mode = MODE_SERIAL_TEST;

// define the elements
let receiveText = document.getElementById("receiveText");
let inputText = document.getElementById("inputText");
let connectButton = document.getElementById("connectButton");
let statusBar = document.getElementById("statusBar");
let clearAllButton = document.getElementById("clearAllButton");
let clearReceivedButton = document.getElementById("clearReceivedButton");
let sendTextButton = document.getElementById("sendTextButton");

let serialCommunicationavailable = navigator.serial !== undefined;
//console.log("serial communication available", serialCommunicationavailable);
if (!serialCommunicationavailable) {
    disableSerialCommunication();
} 

// couple the elements to the Events
connectButton.addEventListener('click', clickConnect)

clearAllButton.addEventListener('click', clearTextFields);
clearReceivedButton.addEventListener('click', clearReceivedTextField);
sendTextButton.addEventListener('click', clickSend);

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

//When the send button is pressed
function clickSend() {
    //send the message
    console.log('sending:', inputText.value)
    writeToStream(inputText.value);
    //and clear the input field, so it's clear it has been sent
    //sendText.value = '';
}

//Read the incoming data
async function readLoop() {
    while (true) {
        const { value, done } = await reader.read();
        if (done === true) {
            break;
        }
        // when recieved something add it to the textarea
        if (mode == MODE_SERIAL_TEST) {
            receiveText.value += value;

            m32ProtocolHandler.handleInput(value);

            //Scroll to the bottom of the text field
            receiveText.scrollTop = receiveText.scrollHeight;
        }
    }
}