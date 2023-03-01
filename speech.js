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
            console.error("speechSynthesis.speaking");
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

}

