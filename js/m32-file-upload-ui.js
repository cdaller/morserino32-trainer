'use strict';

const log  = require ('loglevel');

class FileUploadUI {
    constructor(m32CommunicationService) {
        
        this.m32CommunicationService = m32CommunicationService;
        this.m32CommunicationService.addProtocolHandler(this);

        this.downloadFileButton = document.getElementById("download-file-button");
        this.uploadFileButton = document.getElementById("upload-file-button");
        this.fileSizeStatus = document.getElementById("file-size-status");
        this.fileTextArea = document.getElementById('file-upload-content');

        this.downloadFileButton.addEventListener('click', this.downloadFileButtonClick.bind(this), false);
        this.uploadFileButton.addEventListener('click', this.uploadFileButtonClick.bind(this), false);
    }

    readFile() {
        this.m32CommunicationService.sendM32Command('GET file/size');
        //this.m32CommunicationService.sendM32Command('GET file/text');
    }

    // callback method for a full json object received
    handleM32Object(jsonObject) {
        console.log('configHandler.handleM32Object', jsonObject);
        const keys = Object.keys(jsonObject);
        if (keys && keys.length > 0) {
            const key = keys[0];
            const value = jsonObject[key];
            switch(key) {
                case 'file':
                    if (value['size']) {
                        this.receivedFileSize(value['size'], value['free']);
                    }
                    if (value['text']) {
                        this.receivedFileText(value['text']);
                    }
                    console.log(value);
                    console.log(value.length);
                    break;
                }
        } else {
            console.log('cannot handle json', jsonObject);
        }
    }

    downloadFileButtonClick() {
        this.m32CommunicationService.sendM32Command('GET file/text');
    }

    uploadFileButtonClick() {
        let text = this.fileTextArea.value;
        let lines = text.split('\n');
        log.debug("Uploading text with " + lines.length + " lines");
        let command = "new";
        for (let lineNum = 0; lineNum < lines.length; lineNum++) {
            let line = lines[lineNum].trim();
            if (line) {
                this.m32CommunicationService.sendM32Command('PUT file/' + command + '/' + lines[lineNum]);
                command = 'append';
            }
        }
    }

    receivedFileSize(size, free) {
        this.fileSizeStatus.innerHTML = size + "bytes used, " + free + "bytes free";
    }

    receivedFileText(text) {
        this.fileTextArea.value = text;
    }

}
module.exports = { FileUploadUI }
