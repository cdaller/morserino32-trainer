class M32CommandUIHandler {

    constructor(language = 'en') {
        this.m32ProtocolEnabled = false;
        this.language = language;
    }

    // callback method for a full json object received
    handleM32Object(jsonObject) {
        console.log('uiHandler.handleM32Object', jsonObject);
        if (!this.m32ProtocolEnabled) {
            this.m32ProtocolEnabled = true;
            this.enableAllM32ProtocolElements();
        }
        const keys = Object.keys(jsonObject);
        if (keys && keys.length > 0) {
            const key = keys[0];
            const value = jsonObject[key];
            switch(key) {
                case 'menu':
                    this.receivedM32Menu(value['content']);
                    break;
                case 'control':
                    var controlKey = value['name'];
                    var controlValue = value['value'];
                    if (controlKey === 'speed') {
                        this.receivedM32Speed(controlValue);
                    }
                    break;            }
        } else {
            console.log('cannot handle json', json);
        }
    }

    setLanguage(language) {
        this.language = language;
    }
    
    enableAllM32ProtocolElements() {
        console.log('enable all m32 protocol elements');
        document.querySelectorAll('.m32-protocol').forEach(element => element.classList.add('m32-protocol-enabled'))
    }

    receivedM32Speed(speed) {
        document.getElementById("m32Speed").textContent = speed + ' wpm';
    }

    receivedM32Menu(menu) {
        var menues = menu.split('/');
        var textToDisplay = menues.map((menu) => translateMenu(menu, this.language)).join('/');
        document.getElementById("m32Menu").textContent = textToDisplay;
        // FIXME: does not work - use event to publish this?
        // if (menues.length > 1 && menues[1] === 'Echo Trainer') {
        //     openTabForMode(MODE_ECHO_TRAINER);
        // }
    }

}

