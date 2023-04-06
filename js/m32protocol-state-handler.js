'use strict';

// class represents the state of the morserino
class M32State {
    constructor() {
        this.speedWpm = null;
    }
}

// handling state changes on the morserino
class M32CommandStateHandler {

    constructor(m32State) {
        this.m32State = m32State;
    }

    // callback method for a full json object received
    handleM32Object(jsonObject) {
        console.log('uiState.handleM32Object', jsonObject);
        const keys = Object.keys(jsonObject);
        if (keys && keys.length > 0) {
            const key = keys[0];
            const value = jsonObject[key];
            switch(key) {
                case 'control':
                    var controlKey = value['name'];
                    var controlValue = value['value'];
                    if (controlKey === 'speed') {
                        this.receivedM32Speed(controlValue);
                    }
                    break;
                case 'device':
                    console.log('M32 Device:', value);
                    break;
                case 'error':
                    console.log('M32 Error:', value['message']);
                    break;
                //default:
                    //console.log('unhandled json key', key);
            }
        } else {
            console.log('cannot handle json', jsonObject);
        }
    }
    

    receivedM32Speed(speed) {
        this.m32State.speedWpm = Number(speed);
    }
}

module.exports = { M32State, M32CommandStateHandler }

