class M32ProtocolHandler {
    constructor(callbackFunction) {
        this.json = '';
        this.inJson = false;
        this.callback = callbackFunction;
    }

    // returns true if input was handled by m32 protocol, false if plain text was detected
    handleInput(input) {
        if (!this.inJson && input.startsWith('{')) {
            this.inJson = true;
        } 
        if (this.inJson) {
            this.json = this.json + input;
            var braceCount = this.countChar(this.json, '{') - this.countChar(this.json, '}');
            //console.log('value', value);
            //console.log('json', "'" + this.json + "'");
            if (braceCount == 0) {
                this.callback.handleM32Object(JSON.parse(this.json));
                this.json = '';
                this.inJson = false;
            }
            return true;
        }
        return false;
    }
    
    countChar(text, char) {
        return text.split(char).length - 1;
    } 
    
}
