'use strict';

const log  = require ('loglevel');

const { createElement } = require('./dom-utils');
const ReRegExp = require('reregexp').default;
const { EVENT_SETTINGS_CHANGED } = require('./m32-storage');

const QSO_WAIT_TIME_MS = 2000; // wait ms after receiving 'kn' to answer

class QsoTrainerUI {

    constructor(m32CommunicationService, m32Storage) {
        this.m32CommunicationService = m32CommunicationService;
        this.m32Storage = m32Storage;
        this.m32Storage.addEventListener(EVENT_SETTINGS_CHANGED, this.settingsChanged.bind(this));


        this.receiveTextQsoTrainer = document.getElementById("receiveTextQsoTrainer");
        this.clearQsoTrainerButton = document.getElementById("clearQsoTrainerButton");
        this.autoKeyQsoTrainerButton = document.getElementById("autoKeyQsoTrainerButton");
        this.qsoMessages = document.getElementById("qsoMessages");
        this.inputTextQsoTrainer = document.getElementById("inputTextQsoTrainer");
        this.inputTextQsoTrainerButton = document.getElementById("inputTextQsoTrainerButton");
        this.clearInputTextQsoTrainerButton = document.getElementById("clearInputTextQsoTrainerButton");
        this.qsoWpmSelect = document.getElementById("qsoWpmSelect");
        this.qsoEwsSelect = document.getElementById("qsoEwsSelect");
        this.qsoElsSelect = document.getElementById("qsoElsSelect");
        this.qsoRptWordsCheckbox = document.getElementById("qsoRptWordsCheckbox");
        this.testCwSettingsPlayButton = document.getElementById("testCwSettingsPlayButton");
        this.testCwSettingsStopButton = document.getElementById("testCwSettingsStopButton");
        this.testCwSettingsText = document.getElementById("testCwSettingsText");

        this.autoQsoCallsign;
        this.autoQsoCallsignBot;
        this.autoQsoMessages;
        this.qsoCallSign;
        this.qsoName;
        this.qsoQth;
        this.qsoCallSignBot;
        this.autoKeyQsoIndex;
        this.qsoRptWords = this.qsoRptWordsCheckbox.checked;
        this.clearQsoTrainerFields();

        // eslint-disable-next-line no-undef
        this.cwPlayer = new jscw(); // FIXME: create later???
        this.cwPlayerWpm; // wpm
        this.cwPlayerEws; // extended word spacing
        this.cwPlayerEls; // extended letter spacing: effective speed

        this.clearQsoTrainerButton.addEventListener('click', this.clearQsoTrainerFields.bind(this));
        this.autoKeyQsoTrainerButton.addEventListener('click', this.autoKeyQso.bind(this));
        this.inputTextQsoTrainerButton.addEventListener('click', this.moveQsoInputTextToMessages.bind(this));
        this.clearInputTextQsoTrainerButton.addEventListener('click', function() {
            this.inputTextQsoTrainer.value = '';
        });
        this.qsoRptWordsCheckbox.addEventListener('change', event => {
            console.log(event);
            this.qsoRptWords = event.target.checked;
            console.log('qsoRptWords', this.qsoRptWords);
            this.setCwSettingsInUILabels();
            this.saveSettings();
        });
        this.qsoWpmSelect.addEventListener('change', event => {
            this.cwPlayerWpm = event.target.value;
            this.setCwPlayerSettings();
            this.setCwSettingsInUILabels();
            this.saveSettings();
        });
        this.qsoEwsSelect.addEventListener('change', event => {
            this.cwPlayerEws = event.target.value;
            this.setCwPlayerSettings();
            this.setCwSettingsInUILabels();
            this.saveSettings();
        });
        this.qsoElsSelect.addEventListener('change', event => {
            this.cwPlayerEls = event.target.value;
            this.setCwPlayerSettings();
            this.setCwSettingsInUILabels();
            this.saveSettings();
        });

        this.cwPlayerIsPlaying = false;
        this.cwPlayer.onPlay = function(event) {
            console.log('player play event received', event);
            this.cwPlayerIsPlaying = true;
        }
        this.cwPlayer.onFinished = function(event) {
            console.log('player finished event received', event);
            this.cwPlayerIsPlaying = false;
        }

        this.testCwSettingsPlayButton.addEventListener('click', () => {
            this.playCw(this.testCwSettingsText.value);
        });
        this.testCwSettingsStopButton.addEventListener('click', () => {
            this.cwPlayer.stop();
        });
        

        this.endOfMessageDetected = false;
        
        this.activeMode = false;
    }

    textReceived(value) {
        if (this.activeMode) {
            this.receiveTextQsoTrainer.value += value;
        }
    }

    modeSelected(mode) {
        this.activeMode = mode === 'qso-trainer';
        log.debug("qso trainer active", this.activeMode, mode);
    }


    detectQso() {
        this.endOfMessageDetected = false;
        //console.log('detecteQso', endOfMessageDetected)
        let text = this.receiveTextQsoTrainer.value;
        if (text.endsWith(' kn ') || text.endsWith(' <kn> ') 
            || text.endsWith('e e ')
            || text.endsWith(' bk ') || text.endsWith(' <bk> ') 
            || text.endsWith(' k ')) {
            this.endOfMessageDetected = true;
            //console.log('detecteQso: end of message detected', endOfMessageDetected)
            setTimeout(() => { this.detectQsoMessageEnded() }, QSO_WAIT_TIME_MS);
        }
    }

    detectQsoMessageEnded() {
        console.log('detectQsoMessageEnded, endOfMessageDetected=', this.endOfMessageDetected)
        if (this.endOfMessageDetected) {
            //console.log('really answerQso')
            let message = this.receiveTextQsoTrainer.value;
            console.log('last message:', message);
            this.displayQsoMessage('Your message: ' + message, false);
            this.receiveTextQsoTrainer.value = '';
            this.answerQso(message);
        }
    }

    answerQso(message) {
        let answer = this.createQsoAnswer(message);
        this.playCw(answer);
        this.displayQsoMessage(answer, true);
    }

    duplicateWords(text) {
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

    displayQsoMessage(message, isAnswer) {
        let htmlMessage = message.replace(/\n/g, '<br/>');
        let answerElement;
        if (isAnswer) {
            answerElement = this.createAnswerElement(htmlMessage)        
        } else {
            answerElement = createElement(htmlMessage, 'p', 'qso-request')
        }
        //console.log('adding element', answerElement);
        this.qsoMessages.appendChild(answerElement);
    }

    playCw(message) {
        message = message.replace(/\n/g, ' ');
        let messageToPlay = message;
        if (this.qsoRptWords) {
            messageToPlay = this.duplicateWords(message);
        }
        if (this.cwPlayerIsPlaying) {
            this.cwPlayer.stop(); // stop any message that is currently played
        }
        this.cwPlayer.play(messageToPlay);
    }

    moveQsoInputTextToMessages() {
        let message = this.inputTextQsoTrainer.value;
        let htmlMessage = message.replace(/\n/g, '<br/>');
        let answerElement = createElement(htmlMessage, 'span', 'qso-answer');

        let col1 = createElement(null, 'div', 'col-12 col-md-12');
        col1.appendChild(answerElement);
        
        let row = createElement(null, 'div', 'row');
        row.appendChild(col1);
        
        this.qsoMessages.appendChild(row);

        this.inputTextQsoTrainer.value = '';
    }


    createAnswerElement(message) {

        var that = this;

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
        // https://stackoverflow.com/questions/19624113/how-can-i-use-a-class-method-as-onclick-handler-in-javascript
        replayButton.onclick = ( function(_message) { 
            return function() {
                that.playCw(_message);
            }
        })(message.replace(/<br\/>/g, ' '));
        // eslint-disable-next-line no-undef
        new bootstrap.Tooltip(replayButton, { trigger : 'hover' });

        let stopButton = createElement('Stop', 'button', 'btn btn-outline-danger btn-sm qso-answer-button');
        stopButton.setAttribute('type', 'button');
        stopButton.setAttribute('data-toggle', 'tooltip');
        stopButton.setAttribute('title', 'Stop cw player.')
        stopButton.onclick = ( function() { 
            return function() { 
                that.cwPlayer.stop();
            }
        })();
        let pauseButton = createElement('Pause', 'button', 'btn btn-outline-warning btn-sm qso-answer-button');
        pauseButton.setAttribute('type', 'button');
        pauseButton.setAttribute('data-toggle', 'tooltip');
        pauseButton.setAttribute('title', 'Pause cw player.')
        pauseButton.onclick = ( function() { 
            return function() { 
                that.cwPlayer.pause();
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

    createQsoAnswer(message) {
        console.log('message:', message);
        let answer = '';
        let shouldAppendEndOfMessage = true;
        let isIntro = false;
        let textDetected = false;
        let qthDetected = false;
    
        // CQ CQ CQ de .... 
        this.executeIfMatch(message, /.*cq.*\s+de\s+(\w+)/, answer, (groups) => { 
            this.qsoCallSign = groups[0];
            this.qsoCallSignBot = this.generateCallSign();
            this.autoQsoCallsign = this.qsoCallSign;
            this.autoQsoCallsignBot = this.qsoCallSignBot;
            this.generateAutoQsoMessages();
            answer = this.appendToMessage(answer, this.qsoCallSign + ' de ' + this.qsoCallSignBot + ' ' + this.qsoCallSignBot + ' pse k');
            shouldAppendEndOfMessage = false;
            isIntro = true;
            textDetected = true;
            console.log('matched cq, answer:', answer);
        });
        console.log('isIntro', isIntro);
        if (!isIntro) {
            answer = this.appendToMessage(answer, 'r r ' + this.qsoCallSign + ' de ' + this.qsoCallSignBot);        
        }
        this.executeIfMatch(message, /.*(gm|ga|ge)\s(om|yl)/, answer, (groups) => { 
            answer = this.appendToMessage(answer, groups[0]); // do not reply with 'om' or 'yl' because we do not know if om or yl!
            textDetected = true;
            console.log('matched gm/ga/ge, answer:', answer);
        });
        // eslint-disable-next-line no-unused-vars
        this.executeIfMatch(message, /.*rst\sis\s(\w+)/, answer, (groups) => { 
            var rst = this.getRandom('555', '569', '579', '589', '599');
            answer = this.appendToMessage(answer, 'ur rst is ' + rst + ' ' + rst);
            textDetected = true;
            console.log('matched rst, answer:', answer);
        });
        this.executeIfMatch(message, /.*qth\sis\s(\w+)/, answer, (groups) => { 
            this.qsoQth = groups[0];
            qthDetected = true;
            console.log('matched qth:', this.qsoQth);
        });
        this.executeIfMatch(message, /.*\sname\sis\s(\w+)/, answer, (groups) => { 
            this.qsoName = groups[0];
            var name = this.getRandomName();
            if (this.qsoQth === '') {
                answer = this.appendToMessage(answer, 'ok ' + this.qsoName);
            } else {
                answer = this.appendToMessage(answer, 'ok ' + this.qsoName + ' from ' + this.qsoQth);
            }
            answer = this.appendToMessage(answer, 'my name is ' + name + ' ' + name);
            textDetected = true;
            console.log('matched name, answer:', answer);
        });
        this.executeIfMatch(message, /.*\swx\sis\s(\w+)(?:.*temp\s([-]?\d+)\s*c?)?/, answer, (groups) => { 
            let weather = groups[0];
            let temperature = groups[1];
            let temperatureString = '';
            if (temperature !== undefined) {
                temperatureString = ' es temp ' + groups[1] + 'c';
            }
            answer = this.appendToMessage(answer, 'ok ur wx is ' + weather + temperatureString);
            answer = this.appendToMessage(answer, 'my wx is ' + this.getRandomWx());
            textDetected = true;
            console.log('matched wx, answer:', answer);
        });
        if (qthDetected) {
            var qth = this.getRandomQth();
            answer = this.appendToMessage(answer, 'my qth is ' + qth + ' ' + qth);
            textDetected = true;
            console.log('matched qth, answer:', answer);
        }
        // eslint-disable-next-line no-unused-vars
        this.executeIfMatch(message, /.*gb\s(om|yl)/, answer, (groups) => { 
            answer = this.appendToMessage(answer, 'gb ' + this.qsoName + ' 73 es 55');
            textDetected = true;
            console.log('matched gb, answer:', answer);
        });
        // eslint-disable-next-line no-unused-vars
        this.executeIfMatch(message, /(tu|sk) e e/, answer, (groups) => { 
            answer = this.appendToMessage(answer, 'e e');
            shouldAppendEndOfMessage = false;
            textDetected = true;
            console.log('matched tu e e, answer:', answer);
        });
        // eslint-disable-next-line no-unused-vars
        this.executeIfMatch(message, /.*test/, answer, (groups) => { 
            answer = this.appendToMessage(answer, 'test back');
            textDetected = true;
            console.log('matched test, answer:', answer);
        });
    
        if (!textDetected) {
            answer = this.appendToMessage(answer, 'pse rpt kn'); // did not understand!
        } else if (shouldAppendEndOfMessage) {
            answer = this.appendToMessage(answer, this.qsoCallSign + ' de ' + this.qsoCallSignBot + ' ' + this.getRandom('pse kn', 'kn'));
        }
    
        return answer;
    }
    
    executeIfMatch(message, regexp, answer, callback) {
        var result = message.match(regexp);
        if (result) {
            result.shift(); // remove matching string, only return groups (if any)
            return callback(result, answer);
        }
    }
    
    appendToMessage(message, textToAppend) {
        if (!message || message.length == 0) {
            message = textToAppend;
        } else {
            message += ' =\n' + textToAppend;
        }
        return message;
    }
    
    generateCallSign() {
        return new ReRegExp(this.getRandomCallsignRegexp()).build();
    }
    
    getRandomCallsignRegexp() {
        return this.getRandom(
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
    
    getRandomName() {
        return this.getRandom('frank', 'christof', 'john', 'gerhard', 'manfred', 'steve', 'yuan', 'carl', 'tommy', 
        'andrea', 'sabine', 'karin', 'anja', 'yvonne', 'bob', 'david', 'sophie', 'joseph', 'josef',
        'sam', 'joe', 'laura', 'hank', 'nick', 'alice', 'sarah', 'patrick', 'tom', 'dan', 'alice',
        'beth', 'liz', 'josh', 'ann', 'anna', 'robert', 'bill', 'mickey', 'alex', 'ed', 'edward',
        'alice', 'emma', 'jolie', 'andy', 'andi', 'samuel', 'pat', 'mike', 'michael', 'daniel');
    }
    
    getRandomQth() {
        return this.getRandom('graz', 'vienna', 'berlin', 'nyborg', 'paris', 'london', 'kyiv', 'tokyo', 'hamburg', 
        'salzburg', 'linz', 'weyregg', 'boulder', 'hagerstown', 'pittsburg', 'greenville', 
        'charleston', 'bratislava', 'ljubljana', 'zagreb', 'budapest', 'wels', 'bolzano', 'munich',
        'berlin', 'innsbruck', 'marseille', 'barcelona', 'zaragoza', 'madrid', 'lyon', 'geneve',
        'toulouse', 'anvers', 'gent', 'brussels', 'cologne', 'prague', 'monaco', 'milano', 'rome', 'napoli',
        'nice', 'split', 'sarajevo', 'florence', 'cambridge', 'liverpool', 'edinborough', 'manchester',
        'copenhagen', 'oslo');
    }
    
    getRandomWx() {
        let wx = this.getRandom('sun', 'cloudy', 'rain', 'snow', 'fog', 'hot', 'cold', 'sunny', 'raining', 'snowing', 'foggy');
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
    
    getRandom(...values) {
        let randomIndex = Math.random() * values.length | 0;
        return values[randomIndex];
    }
    
    autoKeyQso() {
        if (this.autoKeyQsoIndex == 0) {
            this.resetQsoTrainerFields();
        }
        let message = this.autoQsoMessages[this.autoKeyQsoIndex];
        this.receiveTextQsoTrainer.value = message;
        //Scroll to the bottom of the text field
        this.receiveTextQsoTrainer.scrollTop = this.receiveTextQsoTrainer.scrollHeight;
        this.detectQso();
    
        this.autoKeyQsoIndex++;
        if (this.autoKeyQsoIndex >= this.autoQsoMessages.length) {
            this.autoKeyQsoIndex = 0;
        }
    }
    
    generateAutoQsoMessages() {
        let deText = this.autoQsoCallsignBot + ' de ' + this.autoQsoCallsign;
        let name = this.getRandomName();
        this.autoQsoMessages = [
            'cq cq cq de ' + this.autoQsoCallsign + ' ' + this.autoQsoCallsign + ' pse k <kn> ', 
            deText + ' =\n' + this.getRandom('gm', 'ge') + ' = \nur rst is 599 5nn = hw ?\n' + deText + ' kn ',
            deText + ' =\nmy name is ' + name + ' ' + name + ' =\n' + deText + ' kn ',
            deText + ' =\nmy qth is ' + this.getRandomQth() + ' =\n' + deText + ' kn ',
            deText + ' =\nmy wx is ' + this.getRandomWx() +' =\n' + deText + ' kn ',
        ];
    }
    
    clearQsoTrainerFields() {
        this.receiveTextQsoTrainer.value = '';
        this.inputTextQsoTrainer.value = '';
        this.qsoMessages.replaceChildren();
        this.resetQsoTrainerFields();
    }
    
    resetQsoTrainerFields() {
        // clean all qso state variables
        this.qsoCallSign = '';
        this.qsoCallSignBot = '';
        this.qsoName = '';
        this.qsoQth = '';
        this.autoKeyQsoIndex = 0;
        this.autoQsoCallsign = this.generateCallSign();
        this.autoQsoCallsignBot = this.generateCallSign();
        this.generateAutoQsoMessages();
    }
    
    saveSettings() {
        this.m32Storage.settings.cwPlayerWpm = this.cwPlayerWpm;
        this.m32Storage.settings.cwPlayerEws = this.cwPlayerEws;
        this.m32Storage.settings.cwPlayerEls = this.cwPlayerEls;
        this.m32Storage.settings.qsoRptWords = this.qsoRptWords;
        this.m32Storage.saveSettings();
    }

    settingsChanged(settings) {
        log.debug("settings changed event", settings);
        this.cwPlayerWpm = this.m32Storage.settings.cwPlayerWpm;
        this.cwPlayerEws = this.m32Storage.settings.cwPlayerEws;
        this.cwPlayerEls = this.m32Storage.settings.cwPlayerEls;
        this.qsoRptWords = this.m32Storage.settings.qsoRptWords;
        this.setCwSettingsInUIInput();
        this.setCwSettingsInUILabels();
        this.setCwPlayerSettings();
    }

    setCwSettingsInUIInput() {
        document.getElementById('qsoWpmSelect').value = this.cwPlayerWpm;
        document.getElementById('qsoEwsSelect').value = this.cwPlayerEws;
        document.getElementById('qsoElsSelect').value = this.cwPlayerEls;
        this.qsoRptWordsCheckbox.checked = this.qsoRptWords;
    }
    
    setCwSettingsInUILabels() {
        document.getElementById('qsoCwWpmLabel').textContent = this.cwPlayerWpm + 'wpm';
        document.getElementById('qsoCwEwsLabel').textContent = this.cwPlayerEws;
        document.getElementById('qsoCwElsLabel').textContent = this.cwPlayerEls;
        if (this.qsoRptWords) {
            document.getElementById('qsoRptLabel').textContent = 'rpt';
        } else {
            document.getElementById('qsoRptLabel').textContent = 'no rpt';
        }
    }
    
    setCwPlayerSettings() {
        this.cwPlayer.setWpm(this.cwPlayerWpm);
        this.cwPlayer.setEws(this.cwPlayerEws);
        let eff = this.cwPlayerWpm / this.cwPlayerEls;
        this.cwPlayer.setEff(eff);
    }
    

}

module.exports = { QsoTrainerUI }