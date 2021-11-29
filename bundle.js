(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){

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

},{"myers-diff":4}],2:[function(require,module,exports){
function changed(change) {
	if (!change.del && change.add) {
		return true;
	}
	if (change.del && !change.add) {
		return true;
	}
	return false;
}

module.exports = changed;

},{}],3:[function(require,module,exports){
// NormalFormat
// http://www.gnu.org/software/diffutils/manual/html_node/Example-Normal.html#Example-Normal
function GnuNormalFormat(change) {
	const nf = [];
	const str = [];

	// del add description
	// 0   >0  added count to rhs
	// >0  0   deleted count from lhs
	// >0  >0  changed count lines
	let op;
	if (change.lhs.del === 0 && change.rhs.add > 0) {
		op = 'a';
	}
	else if (change.lhs.del > 0 && change.rhs.add === 0) {
		op = 'd';
	}
	else {
		op = 'c';
	}

	function encodeSide(side, key) {
		// encode side as a start,stop if a range
		str.push(side.at + 1);
		if (side[key] > 1) {
			str.push(',');
			str.push(side[key] + side.at);
		}
	}
	encodeSide(change.lhs, 'del');
	str.push(op);
	encodeSide(change.rhs, 'add');

	nf.push(str.join(''));
	for (let i = change.lhs.at; i < change.lhs.at + change.lhs.del; ++i) {
		nf.push('< ' + change.lhs.getPart(i).text);
	}
	if (change.rhs.add && change.lhs.del) {
		nf.push('---');
	}
	for (let i = change.rhs.at; i < change.rhs.at + change.rhs.add; ++i) {
		nf.push('> ' + change.rhs.getPart(i).text);
	}
	return nf.join('\n');
}

var formats = {
	GnuNormalFormat: function (changes) {
		var i, out = [];
		for (i = 0; i < changes.length; ++i) {
			out.push(GnuNormalFormat(changes[i]));
		}
		return out.join('\n');
	}
}

module.exports = formats;

},{}],4:[function(require,module,exports){
const { diff } = require('./myers');
const formats = require('./formats');
const changed = require('./changed');

module.exports = {
	diff,
	formats,
	changed
};

},{"./changed":2,"./formats":3,"./myers":5}],5:[function(require,module,exports){
const Splitter = require('./splitter');

function getDefaultSettings() {
	return {
		compare: 'lines', // lines|words|chars
		ignoreWhitespace: false,
		ignoreCase: false,
		ignoreAccents: false
	};
}

/**
 * Encodes text into diff-codes to prepare for Myers diff.
 */
class Encoder {
	constructor() {
		this.code = 0;
		this.diff_codes = {};
	}

	encode(text, settings) {
		return new EncodeContext(this, text, settings);
	}

	getCode(line) {
		if (this.diff_codes[line]) {
			return this.diff_codes[line];
		}
		this.code = this.code + 1;
		this.diff_codes[line] = this.code;
		return this.code;
	}
}

/**
 * Encoder context
 */
class EncodeContext {
	constructor(encoder, text, options) {
		let re;
		if (text) {
			if (options.compare === 'chars') {
				// split all chars
				re = '';
			} else if (options.compare === 'words') {
				// split all of the text on spaces
				re = ' ';
			} else { // lines (default)
				re = '\n';
			}
		}

		this.encoder = encoder;
		this._codes = {};
		this._modified = {};
		this._parts = [];

		let count = 0;
		const split = new Splitter(text, re);
		let part;
		while ((part = split.next()) !== null) {
			let line = part.text;
			if (options.ignoreWhitespace) {
				line = line.replace(/\s+/g, '');
			}
			if (options.ignoreCase) {
				line = line.toLowerCase();
			}
			if (options.ignoreAccents) {
				line = line.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
			}
			const aCode = encoder.getCode(line);
			this._codes[count] = aCode;
			this._parts.push(part);
			count += 1;
		}
	}

	finish() {
		delete this.encoder;
	}

	get codes() {
		return this._codes;
	}

	get length() {
		return Object.keys(this._codes).length;
	}

	get modified() {
		return this._modified;
	}
}

class Myers {
	static compareLCS(lhsCtx, rhsCtx, callback) {
		let lhsStart = 0;
		let rhsStart = 0;
		let lhsLine = 0;
		let rhsLine = 0;

		while (lhsLine < lhsCtx.length || rhsLine < rhsCtx.length) {
			if ((lhsLine < lhsCtx.length) && (!lhsCtx.modified[lhsLine])
				&& (rhsLine < rhsCtx.length) && (!rhsCtx.modified[rhsLine])) {
				// equal lines
				lhsLine++;
				rhsLine++;
			}
			else {
				// maybe deleted and/or inserted lines
				lhsStart = lhsLine;
				rhsStart = rhsLine;
				while ((lhsLine < lhsCtx.length)
					&& (rhsLine >= rhsCtx.length || lhsCtx.modified[lhsLine])) {
					lhsLine++;
				}
				while ((rhsLine < rhsCtx.length)
					&& (lhsLine >= lhsCtx.length || rhsCtx.modified[rhsLine])) {
					rhsLine++;
				}
				// istanbul ignore else
				if ((lhsStart < lhsLine) || (rhsStart < rhsLine)) {
					const lat = Math.min(lhsStart, (lhsCtx.length) ? lhsCtx.length - 1 : 0);
					const rat = Math.min(rhsStart, (rhsCtx.length) ? rhsCtx.length - 1 : 0);
					const lpart = lhsCtx._parts[Math.min(lhsStart, lhsCtx.length - 1)];
					const rpart = rhsCtx._parts[Math.min(rhsStart, rhsCtx.length - 1)];

					const item = {
						lhs: {
							at: lat,
							del: lhsLine - lhsStart,
							pos: lpart ? lpart.pos : null,
							text: lpart ? lpart.text : null
						},
						rhs: {
							at: rat,
							add: rhsLine - rhsStart,
							pos: rpart ? rpart.pos : null,
							text: rpart ? rpart.text : null
						}
					};
					callback(item);
				}
			}
		}
	}

	static getShortestMiddleSnake(
		lhsCtx, lhsLower, lhsUpper,
		rhsCtx, rhsLower, rhsUpper,
		vectorU, vectorD
	) {
		const max = lhsCtx.length + rhsCtx.length + 1;
		// istanbul ignore next
		if (max === undefined) {
			throw new Error('unexpected state');
		}
		let kdown = lhsLower - rhsLower,
			kup = lhsUpper - rhsUpper,
			delta = (lhsUpper - lhsLower) - (rhsUpper - rhsLower),
			odd = (delta & 1) != 0,
			offset_down = max - kdown,
			offset_up = max - kup,
			maxd = ((lhsUpper - lhsLower + rhsUpper - rhsLower) / 2) + 1,
			ret = {x:0, y:0}, d, k, x, y;

		vectorD[offset_down + kdown + 1] = lhsLower;
		vectorU[offset_up + kup - 1] = lhsUpper;
		for (d = 0; d <= maxd; ++d) {
			for (k = kdown - d; k <= kdown + d; k += 2) {
				if (k === kdown - d) {
					x = vectorD[offset_down + k + 1];//down
				}
				else {
					x = vectorD[offset_down + k - 1] + 1;//right
					if ((k < (kdown + d)) && (vectorD[offset_down + k + 1] >= x)) {
						x = vectorD[offset_down + k + 1];//down
					}
				}
				y = x - k;
				// find the end of the furthest reaching forward D-path in diagonal k.
				while ((x < lhsUpper)
					&& (y < rhsUpper)
					&& (lhsCtx.codes[x] === rhsCtx.codes[y])
				) {
					x++; y++;
				}
				vectorD[ offset_down + k ] = x;
				// overlap ?
				if (odd && (kup - d < k) && (k < kup + d)) {
					if (vectorU[offset_up + k] <= vectorD[offset_down + k]) {
						ret.x = vectorD[offset_down + k];
						ret.y = vectorD[offset_down + k] - k;
						return (ret);
					}
				}
			}
			// Extend the reverse path.
			for (k = kup - d; k <= kup + d; k += 2) {
				// find the only or better starting point
				if (k === kup + d) {
					x = vectorU[offset_up + k - 1]; // up
				} else {
					x = vectorU[offset_up + k + 1] - 1; // left
					if ((k > kup - d) && (vectorU[offset_up + k - 1] < x))
						x = vectorU[offset_up + k - 1]; // up
				}
				y = x - k;
				while ((x > lhsLower)
					&& (y > rhsLower)
					&& (lhsCtx.codes[x - 1] === rhsCtx.codes[y - 1])
				) {
					// diagonal
					x--;
					y--;
				}
				vectorU[offset_up + k] = x;
				// overlap ?
				if (!odd && (kdown - d <= k) && (k <= kdown + d)) {
					if (vectorU[offset_up + k] <= vectorD[offset_down + k]) {
						ret.x = vectorD[offset_down + k];
						ret.y = vectorD[offset_down + k] - k;
						return (ret);
					}
				}
			}
		}
		// should never get to this state
		// istanbul ignore next
		throw new Error('unexpected state');
	}

	static getLongestCommonSubsequence(
		lhsCtx, lhsLower, lhsUpper,
		rhsCtx, rhsLower, rhsUpper,
		vectorU = [], vectorD = []
	) {
		// trim off the matching items at the beginning
		while ( (lhsLower < lhsUpper)
			&& (rhsLower < rhsUpper)
			&& (lhsCtx.codes[lhsLower] === rhsCtx.codes[rhsLower]) ) {
			++lhsLower;
			++rhsLower;
		}
		// trim off the matching items at the end
		while ( (lhsLower < lhsUpper)
			&& (rhsLower < rhsUpper)
			&& (lhsCtx.codes[lhsUpper - 1] === rhsCtx.codes[rhsUpper - 1]) ) {
			--lhsUpper;
			--rhsUpper;
		}
		if (lhsLower === lhsUpper) {
			while (rhsLower < rhsUpper) {
				rhsCtx.modified[rhsLower++] = true;
			}
		}
		else if (rhsLower === rhsUpper) {
			while (lhsLower < lhsUpper) {
				lhsCtx.modified[lhsLower++] = true;
			}
		}
		else {
			const { x, y } = Myers.getShortestMiddleSnake(
				lhsCtx, lhsLower, lhsUpper,
				rhsCtx, rhsLower, rhsUpper, 
				vectorU, vectorD);
			Myers.getLongestCommonSubsequence(
				lhsCtx, lhsLower, x, 
				rhsCtx, rhsLower, y,
				vectorU, vectorD);
			Myers.getLongestCommonSubsequence(
				lhsCtx, x, lhsUpper,
				rhsCtx, y, rhsUpper,
				vectorU, vectorD);
		}
	}

	/**
	 * Compare {@code lhs} to {@code rhs}.  Changes are compared from left
	 * to right such that items are deleted from left, or added to right,
	 * or just otherwise changed between them.
	 * 
	 * @param   {string} lhs - The left-hand source text.
	 * @param   {string} rhs - The right-hand source text.
	 * @param   {object} [options={}] - Optional settings.
	 */
	static diff(lhs, rhs, options = {}) {
		const settings = getDefaultSettings();
		const encoder = new Encoder();

		if (lhs === undefined) {
			throw new Error('illegal argument \'lhs\'');
		}
		if (rhs === undefined) {
			throw new Error('illegal argument \'rhs\'');
		}

		Object.assign(settings, options);

		const lhsCtx = encoder.encode(lhs, settings);
		const rhsCtx = encoder.encode(rhs, settings);

		// Myers.LCS(lhsCtx, rhsCtx);

		Myers.getLongestCommonSubsequence(
			lhsCtx,
			0,
			lhsCtx.length,
			rhsCtx,
			0,
			rhsCtx.length
		);

		// compare lhs/rhs codes and build a list of comparisons
		const changes = [];
		const compare = (options.compare === 'chars') ? 0 : 1;

		Myers.compareLCS(lhsCtx, rhsCtx, function _changeItem(item) {
			// add context information
			item.lhs.getPart = (n) => lhsCtx._parts[n];
			item.rhs.getPart = (n) => rhsCtx._parts[n];
			if (compare === 0) {
				item.lhs.length = item.lhs.del;
				item.rhs.length = item.rhs.add;
			} else {
				// words and lines
				item.lhs.length = 0;
				if (item.lhs.del) {
					// get the index of the second-last item being deleted,
					// plus its length, minus the start pos.
					const i = item.lhs.at + item.lhs.del - 1;
					const part = lhsCtx._parts[i];
					item.lhs.length = part.pos + part.text.length
						- lhsCtx._parts[item.lhs.at].pos;
				}

				item.rhs.length = 0;
				if (item.rhs.add) {
					// get the index of the second-last item being added,
					// plus its length, minus the start pos.
					const i = item.rhs.at + item.rhs.add - 1;
					const part = rhsCtx._parts[i];
					item.rhs.length = part.pos + part.text.length
						- rhsCtx._parts[item.rhs.at].pos;
				}
			}
			changes.push(item);
		});

		lhsCtx.finish();
		rhsCtx.finish();

		return changes;
	}
}

module.exports = Myers;

},{"./splitter":6}],6:[function(require,module,exports){
/**
 * Text splitter that also returns character position.  Functionally
 * equivalent to string.split, but faster.
 * @param {string} text - The text to split.
 * @param {string} ch - The character on which to split.
 * @returns A splitter that can be used to iteratively call `next()` for
 * each part.
 */
function Splitter(text, ch) {
	let start = 0;
	let pos = ch ? text.indexOf(ch) : 0;
	return {
		/**
		 * Returns the next split.
		 * @returns The text an character index of the split `{ text, pos }`,
		 * or `null` when done.
		 */
		next: function _split() {
			if (text.length === 0) {
				return null;
			} else if (!ch) {
				if (start >= text.length) {
					return null;
				}
				const part = {
					text: text.charAt(start),
					pos: start
				};
				start += 1;
				return part;
			} else if (pos < 0) {
				// handle remaining text.  the `start` might be at some
				// position less than `text.length`.  it may also be _exactly_
				// `text.length` if the `text` ends with a double `ch`, e.g.
				// "\n\n", the `start` is set to `pos + 1` below, which is one
				// after the first "\n" of the pair.  it would also be split.
				if (start <= text.length) {
					const part = {
						text: text.substr(start),
						pos: start
					};
					pos = -1;
					start = text.length + 1;
					return part;
				} else {
					return null;
				}
			}
			const end = pos - start;
			const word = text.substr(start, end);
			const part = {
				text: word,
				pos: start
			};
			start = pos + 1;
			pos = text.indexOf(ch, start);
			return part;
		}
	}
}

module.exports = Splitter;

},{}]},{},[1]);
