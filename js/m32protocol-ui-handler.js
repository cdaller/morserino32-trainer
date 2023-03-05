class M32CommandUIHandler {

    constructor() {
        this.m32ProtocolEnabled = false;
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
                    this.receivedM32Menu(value['name']);
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
    
    enableAllM32ProtocolElements() {
        console.log('enable all m32 protocol elements');
        document.querySelectorAll('.m32-protocol').forEach(element => element.classList.add('m32-protocol-enabled'))
    }

    receivedM32Speed(speed) {
        document.getElementById("m32Speed").textContent = speed + ' wpm';
    }

    receivedM32Menu(menu) {
        document.getElementById("m32Menu").textContent = menu;
    }

}

