

let jsdiff = require('diff');
let Charts = require('chart.js');
const ReRegExp = require('reregexp').default;

// speech & m3 protocol handler
var m32Language = 'en';
const m32State = new M32State();
const speechSynthesisHandler = new M32CommandSpeechHandler(m32Language);
const commandUIHandler = new M32CommandUIHandler(m32Language);
const configHandler = new M32CommandConfigHandler(document.getElementById("m32-config"));
const m32Protocolhandler = new M32ProtocolHandler([
    new M32CommandStateHandler(m32State), 
    commandUIHandler, 
    speechSynthesisHandler,
    configHandler]);

// some constants

let STORAGE_KEY_SETTINGS = 'morserino-trainer-settings';


const MODE_ECHO_TRAINER = 'echo-trainer';
const MODE_CW_GENERATOR = 'cw-generator';
const MODE_QSO_TRAINER = 'qso-trainer';
const MODE_M32_CONFIG = 'm32-config';
let mode = MODE_CW_GENERATOR;


// define the elements



// after page is loaded, set version string from javascript:
document.addEventListener("DOMContentLoaded", function() {
    document.getElementById("versionSpan").textContent = VERSION;
});


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


showSavedResults(JSON.parse(localStorage.getItem(STORAGE_KEY)));

// couple the elements to the Events





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




// ------------------------ echo trainer code ------------------------

// ------------------------ qso trainer code ------------------------

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





