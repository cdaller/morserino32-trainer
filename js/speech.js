// all functions for speech synthesis

class Speech {

    constructor(language) {
        this.speechSynth = window.speechSynthesis;
        this.language = language;
        this.voice = null;
    }

    speak(text) {
        console.log('speak', text);

        if (this.speechSynth.speaking) {
            console.log("cancel previous speech synthesis");
            this.speechSynth.cancel();
        }

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.pitch = 1;
        utterance.rate = 1;
        utterance.voice = this.getVoice(this.language);
        this.speechSynth.speak(utterance);
    }

    getVoice(language) {
        if (this.voice != null) {
            return this.voice;
        }
        //console.log('getting voice for', language);
        var voices = this.speechSynth.getVoices();
        var voice;
        //voices.forEach(v => console.log(v));
        if (language === 'en') {
            voice = voices.find(voice => voice.lang.startsWith(language));
        } else if (language === 'de') {
            voice = voices.find(voice => voice.lang.startsWith(language) && voice.voiceURI.startsWith('Google'));
        } else {
            voice = voices.find(voice => voice.lang.startsWith(language));
        }
        //console.log('selected voice', voice);
        this.voice = voice;
        return voice;
    }

    // callback method for a full json object received
    handleM32Object(jsonObject) {
        console.log('speech.handleM32Object', jsonObject);
        const keys = Object.keys(jsonObject);
        if (keys && keys.length > 0) {
            const key = keys[0];
            const value = jsonObject[key];
            switch(key) {
                case 'menu':
                    var menues = value['name'].split('/');
                    var textToSpeak = menues.map((menu) => this.translateMenu(menu, this.language)).join(' ');
                    this.speak(textToSpeak);
                    break;
                case 'control':
                    this.speak(value['name'] + ' ' + value['value']);
                    break;
                case 'activate':
                    this.speak(value['state']);
                    break;
                case 'error':
                    this.speak(value['message']);
                    break;
                default:
                    console.log('unhandled json key', key);
            }
        } else {
            console.log('cannot handle json', json);
        }
    }

    translateMenu(menuName, language) {
        var translation = this.menuTranslations[menuName];
        if (!translation) {
            return menuName;
        }
        translation = translation[language];
        if (!translation) {
            return menuName;
        }
        return translation;
    };
    
    menuTranslations = {
        'CW Abbrevs': {'en': 'CW Abbreviations'},
        'Learn New Chr': {'en': 'Learn new Character'},
        'LoRa Trx': {'en': 'LORA Transceiver'},
        'WiFi Trx': {'en': 'WiFi Transceiver'},
        'Ext Trx': {'en': 'External Transceiver'},
        'Disp MAC Addr': {'en': 'Display Mac Address'},
        'Config Wifi': {'en': 'Configure Wifi'},
        'Update Firmw': {'en': 'Update Firmware'},
    }
    
    
}

