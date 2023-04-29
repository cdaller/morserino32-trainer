'use strict';

const { M32_MENU_CW_GENERATOR_FILE_PLAYER_ID } = require('./m32-communication-service');


const log  = require ('loglevel');

class FileUploadUI {
    constructor(m32CommunicationService) {
        
        this.m32CommunicationService = m32CommunicationService;
        this.m32CommunicationService.addProtocolHandler(this);

        this.downloadFileButton = document.getElementById("m32-file-upload-download-file-button");
        this.uploadFileButton = document.getElementById("m32-file-upload-upload-file-button");
        this.fileSizeStatus = document.getElementById("m32-file-upload-file-size-status");
        this.fileTextArea = document.getElementById('file-upload-content');

        this.downloadFileButton.addEventListener('click', this.downloadFileButtonClick.bind(this), false);
        this.uploadFileButton.addEventListener('click', this.uploadFileButtonClick.bind(this), false);

        document.getElementById("m32-file-upload-german-proverbs").addEventListener('click', this.loadText.bind(this));
        document.getElementById("m32-file-upload-menu-play-file-button").addEventListener('click', this.m32CwGeneratorFilePlayerStart.bind(this));

        this.textsMap = this.getTextsMap();
    }

    readFile() {
        this.m32CommunicationService.sendM32Command('GET file/size');
        this.m32CommunicationService.sendM32Command('GET file/text');
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
                    console.log('file-upload-handleM32Object', value);
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
                this.m32CommunicationService.sendM32Command('PUT file/' + command + '/' + lines[lineNum], false);
                command = 'append';
            }
        }
        this.m32CommunicationService.sendM32Command('GET file/size');
    }

    receivedFileSize(size, free) {
        log.debug("received file free/size", free, size);
        this.fileSizeStatus.innerHTML = size + "bytes used, " + free + "bytes free";
    }

    receivedFileText(text) {
        this.fileTextArea.value = text;
    }

    loadText(event) {
        let text = this.textsMap[event.target.id];
        if (text) {
            this.fileTextArea.value = text;
        }
    }

    m32CwGeneratorFilePlayerStart() {
        this.m32CommunicationService.sendM32Command('PUT menu/start/' + M32_MENU_CW_GENERATOR_FILE_PLAYER_ID);

    }

    getTextsMap() {
        return {
            'm32-file-upload-german-proverbs': 
`\\c Deutsche Sprichworte
Jeder sollte vor seiner eigenen Tuer kehren. = 
Wer rastet, der rostet. = 
Wenn zwei sich streiten, freut sich der Dritte. = 
Wer ernten will, muss saeen. = 
Jeder Topf findet seinen Deckel. = 
Liebe geht durch den Magen. = 
Wo Rauch ist, da ist auch Feuer. = 
Puenktlichkeit ist die Hoeflichkeit der Koenige. = 
Das Auge isst mit. = 
Die Welt ist ein Dorf. = 
Das letzte Hemd hat keine Taschen. = 
Dummheit und Stolz wachsen auf einem Holz. = 
Wer schoen sein will, muss leiden. = 
Der Ton macht die Musik. = 
Die Ratten verlassen das sinkende Schiff. = 
Was Haenschen nicht lernt, lernt Hans nimmermehr. = 
Ist die Katze aus dem Haus tanzen die Maeuse auf dem Tisch. = 
Der Fisch stinkt vom Kopf her. = 
Man saegt nicht den Ast ab auf dem man sitzt. = 
Kleinvieh macht auch Mist. = 
Reden ist silber, schweigen ist gold. = 
Mit Speck faengt man Maeuse. = 
Eine Hand waescht die andere. = 
Lieber den Spatz in der Hand als die Taube auf dem Dach. = 
Unkraut vergeht nicht. = 
Wer den Pfennig nicht ehrt ist des Talers nicht wert. = 
In der Not frisst der Teufel Fliegen. = 
Pech im Spiel Glueck in der Liebe. = 
Ein gutes Gewissen ist ein sanftes Ruhekissen. = 
Wer im Glashaus sitzt, soll nicht mit Steinen werfen. = 
Viele Koeche verderben den Brei. = 
Kleider machen Leute. = 
Scherben bringen Glueck. = 
Einem geschenkten Gaul schaut man nicht ins Maul. = 
Luegen haben kurze Beine. = 
Auch ein blindes Huhn findet mal ein Korn. = 
Jeder ist seines Glueckes Schmied. = 
Aller guten Dinge sind drei. = 
Gelegenheit macht Diebe. = 
Der Apfel faellt nicht weit vom Stamm. = 
Wie man in den Wald hineinruft, so schallt es heraus. = 
Morgenstund hat Gold im Mund. = 
`, 
        };
    }

}
module.exports = { FileUploadUI }
