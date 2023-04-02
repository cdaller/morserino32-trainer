'use strict';

// class represents the state of the morserino
class M32Config {
    constructor() {
        this.speedWpm = null;
    }
}

// handling configuration of the morserino
class M32CommandConfigHandler {

    constructor(configElement) {
        this.configElement = configElement;
    }
    
    // callback method for a full json object received
    handleM32Object(jsonObject) {
        console.log('configHandler.handleM32Object', jsonObject);
        const keys = Object.keys(jsonObject);
        if (keys && keys.length > 0) {
            const key = keys[0];
            const value = jsonObject[key];
            switch(key) {
                case 'configs':
                    if (this.configElement) {                            
                        console.log(value);
                        console.log(value.length);
                        let elements = [];
                        for (let index = 0; index < value.length; index++) {
                            let element = createSpanElement(value[index]['name'], null);
                            elements.push(element);
                        }
                        this.configElement.replaceChildren(...elements);
                    }
                    break;
            }
        } else {
            console.log('cannot handle json', jsonObject);
        }
    }
}

module.exports = { M32CommandConfigHandler, M32Config }

