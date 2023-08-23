'use strict';

const { M32_MENU_CW_GENERATOR_FILE_PLAYER_ID } = require('./m32-communication-service');


const log  = require ('loglevel');
const { createElement } = require('./dom-utils');


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

        this.fileUploadList = document.getElementById('upload-text-list');
        this.fillUploadFileList();

        //document.getElementById("m32-file-upload-german-proverbs").addEventListener('click', this.loadText.bind(this));
        document.getElementById("m32-file-upload-menu-play-file-button").addEventListener('click', this.m32CwGeneratorFilePlayerStart.bind(this));

        //this.textsMap = this.getTextsMap();
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

    loadUploadText(text) {
        if (text) {
            this.fileTextArea.value = text;
        } else {
            this.fileTextArea.value = 'foo';
        }
    }

    m32CwGeneratorFilePlayerStart() {
        this.m32CommunicationService.sendM32Command('PUT menu/start/' + M32_MENU_CW_GENERATOR_FILE_PLAYER_ID);

    }

    fillUploadFileList() {
        let elements = [];

        const texts = this.getFileUploadTexts();
        for (const text of texts) {
            let linkElement = createElement('<i class="bi bi-box-arrow-in-left"></i> ' + text.title, 'a', null);
            linkElement.setAttribute('href', 'javascript:');

            linkElement.addEventListener('click', () => { 
                this.fileTextArea.value = text.content; 
            });
            
            let listElement = createElement(null, 'li', null);
            listElement.replaceChildren(...[linkElement]);
            elements.push(listElement);
        }
        this.fileUploadList.replaceChildren(...elements);
    }


    getFileUploadTexts() {
        return [ {
            title: 'German Sayings', 
            content:  
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
`
},
{
    title: 'ARRL Examination Texts', 
    content:  
`\\c ARRL Examination Texts
VVV <KA> a0ti de w8wq w8wq <BT> tnx fer call jimmy <BT> your rst is 597 <BT> my name is jill <BT> qth here is lansing, michigan <BT> rig here is a yaesu ftdx9000mp running 250 watts <BT> my antenna is a beam <BT> here, the weather is foggy, temp is 31 f <BT> been into radio for 57 years <BT> my occupation is balloonist <BT> bk to you <BT> a0ti de w8wq kn<AR>
VVV <KA> a2lzg de w5qtp/8 <BT> good to talk to you again tom. <BT> rig is kenwood jz781 and runs 340 watts to a monobander antenna up 90 feet. <BT> weather is foggy and my name is catherine. <BT> i live in charleston, south carolina where your rst is 559. <BT> my age is 54 and i am a secretary. <BT> how copy? <BT> a2lzg de w5qtp/8 [sk]<AR>
VVV <KA> a4xxs de wf1jy/8 <BT> thanks for coming back edward. <BT> rig is kenwood jz429 and runs 875 watts to a yagi antenna up 112 feet. <BT> weather is overcast and cold and my name is catherine. <BT> i live in kailua, hawaii where your rst is 498. <BT> my age is 70 and i am a architect. <BT> how copy? <BT> a4xxs de wf1jy/8<AR>
VVV <KA> a5uu a5uu a5uu de kv6he <BT> tnx fer call maggie <BT> your rst is 545 <BT> name hr is alison <BT> im using an ic746pro es using 250 watts <BT> the ant is a beam <BT> qth is san jose, california <BT> here, the weather is great <BT> i work hr as a pottery painter <BT> ham since 1943 <BT> back to you maggie <BT> a5uu de kv6he kn<AR>
VVV <KA> a5yrz de kq2qyy/5 <BT> i am copying you with difficulty sarah. <BT> rig is kenwood zp691 and runs 170 watts to a dipole antenna up 73 feet. <BT> weather is hot and muggy and my name is eddie. <BT> i live in pittsfield, massachusetts where your rst is 558. <BT> my age is 39 and i am a architect. <BT> how copy? <BT> a5yrz de kq2qyy/5<AR>
VVV <KA> a9ve de kz0yy/3 <BT> solid copy robert. <BT> rig is heath xp297 and runs 805 watts to a inverted v antenna up 77 feet. <BT> weather is rainy and warm and my name is bob. <BT> i live in nashua, new hampshire where your rst is 469. <BT> my age is 56 and i am a student. <BT> how copy? <BT> a9ve de kz0yy/3 [sk]<AR>
VVV <KA> ab1xfz de kt5zjq/9 <BT> thanks for coming back thomas. <BT> rig is kenwood xv827 and runs 105 watts to a log periodic antenna up 107 feet. <BT> weather is overcast and warm and my name is matthew. <BT> i live in aberdeen, south dakota where your rst is 498. <BT> my age is 58 and i am a contractor. <BT> how copy? <BT> ab1xfz de kt5zjq/9 [sk]<AR>
VVV <KA> aj1s de kt6fq kt6fq <BT> tnx fer call justin <BT> ur rst is 567 solid cpy <BT> the name is ben <BT> location hr is redding, california <BT> rig here is an icom ic756 putting out 350 watts <BT> im using an hy gain beam <BT> wx hr very wet <BT> during the day im a congressman <BT> first licenced in 1919 <BT> bk to you <BT> aj1s de kt6fq kn<AR>
VVV <KA> ak2xx de wx5ywq/9 <BT> i am copying you with difficulty josh. <BT> rig is icom pj587 and runs 445 watts to a v beam antenna up 25 feet. <BT> weather is snow and cold and my name is jimmy. <BT> i live in wichita, kansas where your rst is 599. <BT> my age is 71 and i am a chemist. <BT> how copy? <BT> ak2xx de wx5ywq/9<AR>
VVV <KA> am4s am4s de wc3o <BT> tnx fer call rich <BT> my name is harold <BT> ur rst is 465 <BT> the qth is uniontown, pennsylvania <BT> rig is icom ic775 es using 200 watts <BT> ant is beam <BT> here, the weather is very humid, temp is 70 f <BT> my job is as a barista <BT> been licenced since 1920 <BT> over to you <BT> am4s de wc3o kn<AR>
VVV <KA> ap4zzw de kx9uy/3 <BT> rrr and thanks alex. <BT> rig is icom px639 and runs 750 watts to a yagi antenna up 28 feet. <BT> weather is hot and muggy and my name is johnny. <BT> i live in hagerstown, maryland where your rst is 558. <BT> my age is 38 and i am a professor. <BT> how copy? <BT> ap4zzw de kx9uy/3<AR>
VVV <KA> ap5vjz de kz0bpx/4 <BT> thanks for coming back jim. <BT> rig is icom pj328 and runs 240 watts to a v beam antenna up 36 feet. <BT> weather is thunderstorm and my name is liz. <BT> i live in danbury, connecticut where your rst is 459. <BT> my age is 69 and i am a architect. <BT> how copy? <BT> ap5vjz de kz0bpx/4<AR>
VVV <KA> aq9kjz de wx1yzw/4 <BT> good to talk to you again michael. <BT> rig is icom zp796 and runs 575 watts to a dipole antenna up 30 feet. <BT> weather is sunny and warm and my name is becky. <BT> i live in oshkosh, wisconsin where your rst is 579. <BT> my age is 26 and i am a professor. <BT> how copy? <BT> aq9kjz de wx1yzw/4 [sk]<AR>
VVV <KA> ar0yxp de wn3jaw/3 <BT> i am copying you with difficulty joshua. <BT> rig is homebrew kx497 and runs 735 watts to a colinear antenna up 93 feet. <BT> weather is rainy and cold and my name is pat. <BT> i live in jackson, mississippi where your rst is 588. <BT> my age is 18 and i am a welder. <BT> how copy? <BT> ar0yxp de wn3jaw/3 [sk]<AR>
VVV <KA> aw7x/8 de wn4p wn4p <BT> gm travis <BT> your rst is 465 with slight qrn <BT> name here is dion <BT> qth hr lexington, kentucky <BT> im using a ts570s at 50 watts <BT> ant is delta loop <BT> here, the weather is rather warm <BT> been a ham for 18 years <BT> im an air marshal <BT> 73 es gud dx <BT> aw7x/8 de wn4p sk<AR>
VVV <KA> aw8n/9 de w3em w3em <BT> thanks hillary <BT> your rst 456 456 <BT> name here is mike <BT> our qth is baltimore, maryland <BT> my radio is a knwd ts50s with 300 watts <BT> im using a g5rv <BT> the weather here is nice <BT> i work as a pianist <BT> been a ham for 14 years <BT> over to you <BT> aw8n/9 de w3em<AR>
VVV <KA> aw9pxj de wx5qyz/1 <BT> rrr and thanks grace. <BT> rig is icom pj589 and runs 560 watts to a tribander antenna up 94 feet. <BT> weather is thunderstorm and my name is sam. <BT> i live in kalamazoo, michigan where your rst is 488. <BT> my age is 59 and i am a architect. <BT> how copy? <BT> aw9pxj de wx5qyz/1<AR>
VVV <KA> ay3kpz de k4wiy/5 <BT> solid copy james. <BT> rig is kenwood kx599 and runs 890 watts to a inverted v antenna up 18 feet. <BT> weather is overcast and warm and my name is sarah. <BT> i live in dover, deleware where your rst is 588. <BT> my age is 66 and i am a doctor. <BT> how copy? <BT> ay3kpz de k4wiy/5<AR>
VVV <KA> ay6vxx de kj0jyz/8 <BT> good copy joshua. <BT> rig is icom xv233 and runs 135 watts to a yagi antenna up 96 feet. <BT> weather is hot and dry and my name is liza. <BT> i live in fayetteville, arkansas where your rst is 459. <BT> my age is 34 and i am a doctor. <BT> how copy? <BT> ay6vxx de kj0jyz/8<AR>
VVV <KA> az0zzu de kz6qyz/7 <BT> good to talk to you again william. <BT> rig is icom pz480 and runs 330 watts to a monobander antenna up 65 feet. <BT> weather is thunderstorm and my name is andy. <BT> i live in pocatello, idaho where your rst is 588. <BT> my age is 61 and i am a chemist. <BT> how copy? <BT> az0zzu de kz6qyz/7 [sk]<AR>
VVV <KA> k0hpy de ny5xu/2 <BT> thanks for coming back ed. <BT> rig is drake zk486 and runs 780 watts to a inverted v antenna up 61 feet. <BT> weather is sunny and warm and my name is josh. <BT> i live in grants pass, oregon where your rst is 598. <BT> my age is 50 and i am a chemist. <BT> how copy? <BT> k0hpy de ny5xu/2 [sk]<AR>
VVV <KA> k0jkx de n7zp/9 <BT> thanks for coming back anne. <BT> rig is kenwood zy538 and runs 50 watts to a tribander antenna up 10 feet. <BT> weather is thunderstorm and my name is mary. <BT> i live in lakeland, florida where your rst is 458. <BT> my age is 28 and i am a architect. <BT> how copy? <BT> k0jkx de n7zp/9 [sk]<AR>
VVV <KA> k3uby de k6siw k6siw <BT> r r r tnx fer call garfield <BT> rst 598 <BT> name here is arnie <BT> i have an ic756pro3 at 350 watts ant is beam <BT> our qth is paradise, california <BT> wx hr is a bit too warm, temp is 62 f <BT> been licenced for 60 years <BT> job-wise im a waiter <BT> hw copy now? <BT> k3uby de k6siw kn<AR>
VVV <KA> k4eo/9 k4eo/9 k4eo/9 de w9vp <BT> ok es tnx fer call bertha <BT> the name is harry <BT> your rst 569 solid cpy <BT> my qth is normal, illinois <BT> i have a k2 at 450 watts <BT> ant is quad <BT> the weather here is frosty, temp is 38 f <BT> im a sailor <BT> first licenced in 1904 <BT> back to you bertha, 73 es cu agn <BT> k4eo/9 de w9vp sk<AR>
VVV <KA> k4msb k4msb k4msb de wh1fv <BT> tnx fer call bessie <BT> name jimmy <BT> rst 465 <BT> my rig is ft857 350 watts <BT> ant is inverted v <BT> the qth is springfield, massachusetts <BT> the weather here is very damp, temp is 58 f <BT> job-wise im an online poker player <BT> got my ticket in 1943 <BT> over to you bessie <BT> k4msb de wh1fv kn<AR>
VVV <KA> k4xox de ku2kvf/7 <BT> rrr and thanks vicky. <BT> rig is icom jz537 and runs 85 watts to a zepp antenna up 64 feet. <BT> weather is sunny and warm and my name is david. <BT> i live in provo, utah where your rst is 559. <BT> my age is 70 and i am a doctor. <BT> how copy? <BT> k4xox de ku2kvf/7<AR>
VVV <KA> k5lcz de ws2xk/1 <BT> rrr and thanks eddie. <BT> rig is homebrew zx459 and runs 845 watts to a v beam antenna up 96 feet. <BT> weather is snow and cold and my name is mickey. <BT> i live in crossville, tennessee where your rst is 458. <BT> my age is 40 and i am a programmer. <BT> how copy? <BT> k5lcz de ws2xk/1 [sk]<AR>
VVV <KA> k5sy de ap0kvw/2 <BT> solid copy catherine. <BT> rig is yaesu px534 and runs 400 watts to a log periodic antenna up 24 feet. <BT> weather is overcast and cold and my name is bobby. <BT> i live in augusta, georgia where your rst is 598. <BT> my age is 60 and i am a contractor. <BT> how copy? <BT> k5sy de ap0kvw/2 [sk]<AR>
VVV <KA> k5yx de wl4uzk/5 <BT> good copy patrick. <BT> rig is kenwood zp108 and runs 580 watts to a delta loop antenna up 119 feet. <BT> weather is hot and muggy and my name is joseph. <BT> i live in aberdeen, south dakota where your rst is 489. <BT> my age is 36 and i am a secretary. <BT> how copy? <BT> k5yx de wl4uzk/5 [sk]<AR>
VVV <KA> k6ytu de nx2uzj/2 <BT> good copy sophie. <BT> rig is collins sb332 and runs 140 watts to a dipole antenna up 104 feet. <BT> weather is overcast and warm and my name is jack. <BT> i live in utica, new york where your rst is 558. <BT> my age is 60 and i am a chemist. <BT> how copy? <BT> k6ytu de nx2uzj/2<AR>
VVV <KA> k7bq de nx4yjr/2 <BT> solid copy liz. <BT> rig is icom zk983 and runs 295 watts to a monobander antenna up 23 feet. <BT> weather is overcast and warm and my name is daniel. <BT> i live in altoona, pennsylvania where your rst is 499. <BT> my age is 31 and i am a lawyer. <BT> how copy? <BT> k7bq de nx4yjr/2<AR>
VVV <KA> k7jfw de nz9yzn/9 <BT> good copy billy. <BT> rig is collins kx769 and runs 180 watts to a log periodic antenna up 11 feet. <BT> weather is overcast and warm and my name is daniel. <BT> i live in alliance, nebraska where your rst is 599. <BT> my age is 71 and i am a secretary. <BT> how copy? <BT> k7jfw de nz9yzn/9 [sk]<AR>
VVV <KA> k7zq de w9tyu/6 <BT> solid copy emma. <BT> rig is kenwood jz939 and runs 560 watts to a dipole antenna up 58 feet. <BT> weather is rainy and cold and my name is pat. <BT> i live in boulder, colorado where your rst is 469. <BT> my age is 66 and i am a lawyer. <BT> how copy? <BT> k7zq de w9tyu/6 [sk]<AR>
VVV <KA> k9ub k9ub de ni9kh ni9kh <BT> tnx fer call lisa <BT> the name is gail <BT> rst 366 366 with slight qrm <BT> the qth is urbana urbana, illinois <BT> im using a knwd ts50s running 200 watts <BT> im using a beam <BT> the weather here is frosty <BT> job-wise im a county sheriff <BT> been licenced since 1967 <BT> must qrt, telephone. 73 73 lisa <BT> k9ub de ni9kh sk<AR>
VVV <KA> kb1gn kb1gn de wi4l wi4l <BT> tnx fer call richard <BT> my name is albert <BT> ur rst 347 347 with slight qrn <BT> qth here is norfolk norfolk, irginia <BT> i have a k1 running 200 watts <BT> the ant is a yagi <BT> wx here is a bit too warm, temp is 96 f <BT> been licenced since 1926 <BT> job-wise im an economist <BT> must qrt, telephone. 73 73 richard <BT> kb1gn de wi4l [sk] kn<AR>
VVV <KA> kc4bxz de nj4zx/9 <BT> solid copy rachel. <BT> rig is kenwood px592 and runs 235 watts to a dipole antenna up 14 feet. <BT> weather is overcast and cold and my name is henry. <BT> i live in pocatello, idaho where your rst is 479. <BT> my age is 29 and i am a bookkeeper. <BT> how copy? <BT> kc4bxz de nj4zx/9<AR>
VVV <KA> ke0m de k4dv k4dv <BT> fb, tnx for call jan <BT> your rst is 446 with qrm <BT> name hr is olaf <BT> rig here is an icom ic775 150 watts <BT> my ant is vertical <BT> my qth is atlanta, georgia <BT> hr wx is too wet <BT> been into radio for 15 years <BT> my occupation is fedex driver <BT> i have to shut down now jan, 73 es gud dx <BT> ke0m de k4dv [sk] [kn]<AR>
VVV <KA> kg0aq kg0aq kg0aq de wx1sp <BT> thanks richard <BT> ur rst is 558 <BT> my name is kathy <BT> my location is bridgeport, connecticut <BT> i have a yaesu ft1000mp 400 watts <BT> the ant is a 3 el yagi <BT> the weather here is very nice <BT> my job is as a secretary <BT> first licenced in 1947 <BT> back to you <BT> kg0aq de wx1sp [kn]<AR>
VVV <KA> ki3f de n2mc/0 n2mc/0 <BT> thanks for the call bessie <BT> name kathy <BT> rst 577 <BT> rig here is a yaesu ft990 es using 500 watts <BT> ant hr is hy gain beam <BT> my location is mitchell, south dakota <BT> wx hr is icy <BT> my job is as a sculptor <BT> ive been licenced for 58 years <BT> good luck bessie, many tnx <BT> ki3f de n2mc/0 [sk] [kn]<AR>
VVV <KA> ki5i de k3nvm/4 k3nvm/4 <BT> fb, tnx for call chris <BT> name here is robert <BT> your rst is 457 with slight qrn<BT> i have a yaesu ft600 150 watts the ant is a vertical <BT> qth is lexington, kentucky <BT> wx hr cold and windy <BT> my job is as a weiner mobile driver <BT> been a ham for 43 years <BT> hw copy now? <BT> ki5i de k3nvm/4 [kn]<AR>
VVV <KA> kj1was de wx0wwx/6 <BT> thanks for coming back claire. <BT> rig is icom zp651 and runs 245 watts to a colinear antenna up 62 feet. <BT> weather is overcast and warm and my name is grace. <BT> i live in pittsfield, massachusetts where your rst is 569. <BT> my age is 44 and i am a doctor. <BT> how copy? <BT> kj1was de wx0wwx/6<AR>
VVV <KA> kl4vyy de w6fpx/8 <BT> rrr and thanks matt. <BT> rig is kenwood xv917 and runs 130 watts to a inverted v antenna up 50 feet. <BT> weather is snow and cold and my name is eddie. <BT> i live in bismarck, north dakota where your rst is 478. <BT> my age is 71 and i am a welder. <BT> how copy? <BT> kl4vyy de w6fpx/8 [sk]<AR>
VVV <KA> kl5zqy de k0jq/3 <BT> rrr and thanks andy. <BT> rig is drake xv264 and runs 320 watts to a dipole antenna up 39 feet. <BT> weather is overcast and cold and my name is sarah. <BT> i live in grass valley, california where your rst is 579. <BT> my age is 68 and i am a programmer. <BT> how copy? <BT> kl5zqy de k0jq/3 [sk]<AR>
VVV <KA> kq1puu de wy2xj/8 <BT> good to talk to you again grace. <BT> rig is kenwood kx550 and runs 295 watts to a dipole antenna up 78 feet. <BT> weather is sunny and cold and my name is edward. <BT> i live in harlingen, texas where your rst is 499. <BT> my age is 46 and i am a bookkeeper. <BT> how copy? <BT> kq1puu de wy2xj/8<AR>
VVV <KA> kq4ppx de k5jo/6 <BT> rrr and thanks rachel. <BT> rig is icom pz977 and runs 745 watts to a yagi antenna up 106 feet. <BT> weather is rainy and warm and my name is william. <BT> i live in augusta, georgia where your rst is 479. <BT> my age is 30 and i am a lawyer. <BT> how copy? <BT> kq4ppx de k5jo/6<AR>
VVV <KA> kr3xq de km8rjx/3 <BT> solid copy sarah. <BT> rig is homebrew zv777 and runs 50 watts to a dipole antenna up 66 feet. <BT> weather is rainy and warm and my name is alice. <BT> i live in alamogordo, new mexico where your rst is 558. <BT> my age is 54 and i am a lawyer. <BT> how copy? <BT> kr3xq de km8rjx/3 [sk]<AR>
VVV <KA> ku0dy de wo6spw/7 <BT> rrr and thanks edward. <BT> rig is yaesu pj958 and runs 245 watts to a dipole antenna up 72 feet. <BT> weather is sunny and cold and my name is johnny. <BT> i live in winnemucca, nevada where your rst is 499. <BT> my age is 22 and i am a welder. <BT> how copy? <BT> ku0dy de wo6spw/7 [sk]<AR>
VVV <KA> kv4jdx de w8ryx/2 <BT> solid copy joshua. <BT> rig is heath pj893 and runs 405 watts to a zepp antenna up 37 feet. <BT> weather is sunny and warm and my name is rebecca. <BT> i live in kailua, hawaii where your rst is 458. <BT> my age is 17 and i am a student. <BT> how copy? <BT> kv4jdx de w8ryx/2 [sk]<AR>
VVV <KA> kw6juy de kw0pwh/2 <BT> rrr and thanks liz. <BT> rig is icom zv229 and runs 330 watts to a log periodic antenna up 50 feet. <BT> weather is foggy and my name is beth. <BT> i live in crossville, tennessee where your rst is 478. <BT> my age is 64 and i am a doctor. <BT> how copy? <BT> kw6juy de kw0pwh/2 [sk]<AR>
VVV <KA> kx6qzp de k6zzx/6 <BT> solid copy beth. <BT> rig is heath kx278 and runs 140 watts to a dipole antenna up 24 feet. <BT> weather is thunderstorm and my name is kathy. <BT> i live in hibbing, minnesota where your rst is 489. <BT> my age is 29 and i am a mechanic. <BT> how copy? <BT> kx6qzp de k6zzx/6<AR>
VVV <KA> kx7kq de np1x/1 <BT> solid copy vicky. <BT> rig is kenwood zk974 and runs 625 watts to a delta loop antenna up 46 feet. <BT> weather is hot and muggy and my name is jane. <BT> i live in bismarck, north dakota where your rst is 568. <BT> my age is 35 and i am a programmer. <BT> how copy? <BT> kx7kq de np1x/1<AR>
VVV <KA> ky0jyv de w5yy/3 <BT> good copy grace. <BT> rig is icom pj834 and runs 50 watts to a dipole antenna up 116 feet. <BT> weather is foggy and my name is bill. <BT> i live in bozeman, montana where your rst is 559. <BT> my age is 34 and i am a welder. <BT> how copy? <BT> ky0jyv de w5yy/3 [sk]<AR>
VVV <KA> ky0q de ku8yx/2 <BT> thanks for coming back johnny. <BT> rig is kenwood zx210 and runs 130 watts to a inverted v antenna up 78 feet. <BT> weather is sunny and warm and my name is bob. <BT> i live in provo, utah where your rst is 569. <BT> my age is 31 and i am a carpenter. <BT> how copy? <BT> ky0q de ku8yx/2 [sk]<AR>
VVV <KA> ky5ulc de nz7qjx/7 <BT> i am copying you with difficulty patrick. <BT> rig is icom jx418 and runs 320 watts to a v beam antenna up 111 feet. <BT> weather is thunderstorm and my name is kathryn. <BT> i live in jackson, mississippi where your rst is 569. <BT> my age is 40 and i am a professor. <BT> how copy? <BT> ky5ulc de nz7qjx/7 [sk]<AR>
VVV <KA> ky6zpv de wm4cxp/0 <BT> rrr and thanks matthew. <BT> rig is heathkit kx252 and runs 195 watts to a v beam antenna up 29 feet. <BT> weather is rainy and warm and my name is rachel. <BT> i live in hagerstown, maryland where your rst is 588. <BT> my age is 39 and i am a carpenter. <BT> how copy? <BT> ky6zpv de wm4cxp/0<AR>
VVV <KA> ky7xzd de az5zzz/1 <BT> thanks for coming back hank. <BT> rig is icom zx688 and runs 665 watts to a zepp antenna up 22 feet. <BT> weather is hot and dry and my name is jimmy. <BT> i live in nashua, new hampshire where your rst is 589. <BT> my age is 24 and i am a pilot. <BT> how copy? <BT> ky7xzd de az5zzz/1 [sk]<AR>
VVV <KA> ky8my de wj5jkr/4 <BT> solid copy daniel. <BT> rig is icom zx666 and runs 765 watts to a colinear antenna up 98 feet. <BT> weather is rainy and cold and my name is claire. <BT> i live in alamogordo, new mexico where your rst is 469. <BT> my age is 55 and i am a mechanic. <BT> how copy? <BT> ky8my de wj5jkr/4 [sk]<AR>
VVV <KA> kz3yey de nz9yux/8 <BT> good to talk to you again josh. <BT> rig is yaesu xp852 and runs 160 watts to a zepp antenna up 61 feet. <BT> weather is snow and cold and my name is johnny. <BT> i live in hibbing, minnesota where your rst is 588. <BT> my age is 32 and i am a pilot. <BT> how copy? <BT> kz3yey de nz9yux/8<AR>
VVV <KA> kz6wjg de wz5zry/8 <BT> i am copying you with difficulty william. <BT> rig is heath zy348 and runs 740 watts to a vertical antenna up 39 feet. <BT> weather is overcast and cold and my name is michael. <BT> i live in spokane, washington where your rst is 588. <BT> my age is 16 and i am a sales manager. <BT> how copy? <BT> kz6wjg de wz5zry/8<AR>
VVV <KA> kz8nyz de wo1oyp/8 <BT> thanks for coming back patrick. <BT> rig is icom pz817 and runs 440 watts to a dipole antenna up 93 feet. <BT> weather is hot and dry and my name is catherine. <BT> i live in akron, ohio where your rst is 599. <BT> my age is 29 and i am a programmer. <BT> how copy? <BT> kz8nyz de wo1oyp/8 [sk]<AR>
VVV <KA> kz9pjm de kj1iw/7 <BT> good copy becky. <BT> rig is collins xv392 and runs 745 watts to a colinear antenna up 84 feet. <BT> weather is rainy and cold and my name is laura. <BT> i live in pittsfield, massachusetts where your rst is 469. <BT> my age is 43 and i am a programmer. <BT> how copy? <BT> kz9pjm de kj1iw/7<AR>
VVV <KA> kz9pvz de wq6kqs/6 <BT> i am copying you with difficulty liz. <BT> rig is yaesu zx377 and runs 755 watts to a dipole antenna up 16 feet. <BT> weather is sunny and cold and my name is beth. <BT> i live in fairbanks, alaska where your rst is 469. <BT> my age is 24 and i am a carpenter. <BT> how copy? <BT> kz9pvz de wq6kqs/6 [sk]<AR>
VVV <KA> n2jii de nc1qj nc1qj <BT> fb gud to hear u david <BT> your rst is 558 solid cpy <BT> name hr is jim <BT> rig is ft2000 at 250 watts <BT> the ant is a dipole <BT> location hr is newport, rhode island <BT> wx hr nice <BT> ive been a ham for the last 44 years <BT> i work hr as an acupuncturist <BT> back to you david, 73 es cu agn <BT> n2jii de nc1qj [sk] [kn]<AR>
VVV <KA> n6ixy de w9ou/8 <BT> good copy kate. <BT> rig is yaesu zv710 and runs 475 watts to a inverted v antenna up 67 feet. <BT> weather is overcast and warm and my name is kathryn. <BT> i live in hibbing, minnesota where your rst is 488. <BT> my age is 17 and i am a doctor. <BT> how copy? <BT> n6ixy de w9ou/8<AR>
VVV <KA> n7ljd de au8qy/9 <BT> rrr and thanks thomas. <BT> rig is yaesu sb912 and runs 735 watts to a yagi antenna up 17 feet. <BT> weather is overcast and warm and my name is rebecca. <BT> i live in nashua, new hampshire where your rst is 559. <BT> my age is 28 and i am a professor. <BT> how copy? <BT> n7ljd de au8qy/9<AR>
VVV <KA> n7rh de n7qva n7qva <BT> r and tnx dweezil <BT> name claire <BT> your rst 565 wid qrm <BT> qth is billings, montana <BT> rig here is a yaesu ft990 with 300 watts <BT> my antenna is a long wire <BT> wx here is bad, temp is 22 f <BT> job-wise im a waitsperson <BT> been a ham for 38 years <BT> back to you dweezil <BT> n7rh de n7qva<AR>
VVV <KA> n7uj de nq9h nq9h <BT> gm tipper <BT> your rst is 599 solid cpy <BT> name here is claire <BT> my rig is icom ic756 es using 450 watts <BT> ant hr is beam <BT> my location is chicago, illinois <BT> wx hr bad <BT> job-wise im a prison guard <BT> ive been licenced for 64 years <BT> tnx for qso <BT> n7uj de nq9h [sk] [kn]<AR>
VVV <KA> n8xvp de k1jzz/1 <BT> good to talk to you again grace. <BT> rig is yaesu kx519 and runs 875 watts to a yagi antenna up 21 feet. <BT> weather is rainy and warm and my name is vicky. <BT> i live in utica, new york where your rst is 478. <BT> my age is 75 and i am a contractor. <BT> how copy? <BT> n8xvp de k1jzz/1 [sk]<AR>
VVV <KA> n8ywk de wy6zp/8 <BT> good copy grace. <BT> rig is icom zk297 and runs 730 watts to a vertical antenna up 31 feet. <BT> weather is foggy and my name is kathy. <BT> i live in wichita, kansas where your rst is 469. <BT> my age is 39 and i am a lawyer. <BT> how copy? <BT> n8ywk de wy6zp/8<AR>
VVV <KA> nj5wzw de nx5njj/5 <BT> i am copying you with difficulty julie. <BT> rig is homebrew zk479 and runs 135 watts to a tribander antenna up 38 feet. <BT> weather is rainy and warm and my name is bob. <BT> i live in grants pass, oregon where your rst is 469. <BT> my age is 33 and i am a pilot. <BT> how copy? <BT> nj5wzw de nx5njj/5<AR>
VVV <KA> nk4yt de kq8z/2 <BT> good to talk to you again danny. <BT> rig is yaesu px254 and runs 560 watts to a yagi antenna up 86 feet. <BT> weather is overcast and warm and my name is nick. <BT> i live in fairbanks, alaska where your rst is 599. <BT> my age is 50 and i am a sales manager. <BT> how copy? <BT> nk4yt de kq8z/2<AR>
VVV <KA> nl1kwq de nl4qd/2 <BT> good to talk to you again bobby. <BT> rig is yaesu xv728 and runs 495 watts to a v beam antenna up 47 feet. <BT> weather is overcast and cold and my name is daniel. <BT> i live in nashua, new hampshire where your rst is 558. <BT> my age is 51 and i am a lawyer. <BT> how copy? <BT> nl1kwq de nl4qd/2<AR>
VVV <KA> nq2p de aw7qqg/3 <BT> rrr and thanks john. <BT> rig is heath zk461 and runs 115 watts to a inverted v antenna up 30 feet. <BT> weather is thunderstorm and my name is bob. <BT> i live in wichita, kansas where your rst is 489. <BT> my age is 18 and i am a student. <BT> how copy? <BT> nq2p de aw7qqg/3<AR>
VVV <KA> nu0iw de nq4jyw/0 <BT> i am copying you with difficulty rachel. <BT> rig is icom zk987 and runs 220 watts to a v beam antenna up 102 feet. <BT> weather is foggy and my name is josh. <BT> i live in spokane, washington where your rst is 488. <BT> my age is 61 and i am a contractor. <BT> how copy? <BT> nu0iw de nq4jyw/0<AR>
VVV <KA> nu1xsy de k2xu/7 <BT> solid copy cathy. <BT> rig is icom xp360 and runs 660 watts to a monobander antenna up 67 feet. <BT> weather is overcast and cold and my name is becky. <BT> i live in fayetteville, arkansas where your rst is 578. <BT> my age is 23 and i am a chemist. <BT> how copy? <BT> nu1xsy de k2xu/7<AR>
VVV <KA> nw1ny de w2fcg w2fcg <BT> fb es tnx fer buzz ben <BT> name kim <BT> ur rst is 599 solid cpy <BT> i have an icom ic781 at 500 watts <BT> im using a g5rv <BT> qth hr rochester, new york <BT> wx hr is cold, temp is 29 f <BT> i work as a steel worker <BT> ham since 1933 <BT> hw copy now? <BT> nw1ny de w2fcg [kn]<AR>
VVV <KA> nw2o nw2o de k2hn <BT> fb es tnx fer buzz barry <BT> rst 345 345 with slight qrn <BT> name chris <BT> i live in albany albany, new york <BT> my radio is a knwd ts950s es running 500 watts <BT> the ant is a quad <BT> wx hr cold and windy <BT> got my ticket in 1995 <BT> im a dancer <BT> 73 es tnx fer qso <BT> nw2o de k2hn sk<AR>
VVV <KA> nw6wpy de w5yy/1 <BT> good to talk to you again emma. <BT> rig is yaesu pz413 and runs 730 watts to a zepp antenna up 115 feet. <BT> weather is hot and muggy and my name is bobby. <BT> i live in provo, utah where your rst is 579. <BT> my age is 62 and i am a lawyer. <BT> how copy? <BT> nw6wpy de w5yy/1<AR>
VVV <KA> nx0yzw de wy2xxy/3 <BT> good to talk to you again sam. <BT> rig is kenwood xv953 and runs 220 watts to a colinear antenna up 107 feet. <BT> weather is overcast and cold and my name is nicholas. <BT> i live in davenport, iowa where your rst is 478. <BT> my age is 42 and i am a doctor. <BT> how copy? <BT> nx0yzw de wy2xxy/3 [sk]<AR>
VVV <KA> nx5qkp de kw2zxf/4 <BT> i am copying you with difficulty ed. <BT> rig is icom pj147 and runs 525 watts to a colinear antenna up 26 feet. <BT> weather is hot and dry and my name is rachel. <BT> i live in augusta, georgia where your rst is 569. <BT> my age is 20 and i am a mechanic. <BT> how copy? <BT> nx5qkp de kw2zxf/4 [sk]<AR>
VVV <KA> nx6qsx de w7yr/3 <BT> thanks for coming back vicky. <BT> rig is kenwood pj500 and runs 715 watts to a dipole antenna up 45 feet. <BT> weather is foggy and my name is michael. <BT> i live in aberdeen, south dakota where your rst is 468. <BT> my age is 27 and i am a carpenter. <BT> how copy? <BT> nx6qsx de w7yr/3<AR>
VVV <KA> ny1hdw de ko6zz/9 <BT> good copy cathy. <BT> rig is icom kx790 and runs 820 watts to a colinear antenna up 74 feet. <BT> weather is sunny and cold and my name is kate. <BT> i live in alamogordo, new mexico where your rst is 479. <BT> my age is 40 and i am a pilot. <BT> how copy? <BT> ny1hdw de ko6zz/9 [sk]<AR>
VVV <KA> ny2wu de kx3jcq/5 <BT> i am copying you with difficulty laura. <BT> rig is homebrew px122 and runs 665 watts to a delta loop antenna up 86 feet. <BT> weather is foggy and my name is mike. <BT> i live in huntsville, alabama where your rst is 578. <BT> my age is 27 and i am a programmer. <BT> how copy? <BT> ny2wu de kx3jcq/5<AR>
VVV <KA> ny2zfq de nx2vwx/3 <BT> solid copy jack. <BT> rig is kenwood xv180 and runs 190 watts to a inverted v antenna up 76 feet. <BT> weather is hot and dry and my name is simon. <BT> i live in alamogordo, new mexico where your rst is 558. <BT> my age is 55 and i am a engineer. <BT> how copy? <BT> ny2zfq de nx2vwx/3 [sk]<AR>
VVV <KA> ny3jw de av2yxj/8 <BT> solid copy vickie. <BT> rig is yaesu pj543 and runs 555 watts to a v beam antenna up 79 feet. <BT> weather is foggy and my name is vicky. <BT> i live in grass valley, california where your rst is 478. <BT> my age is 73 and i am a bookkeeper. <BT> how copy? <BT> ny3jw de av2yxj/8<AR>
VVV <KA> ny7vyy de wj1zyg/4 <BT> i am copying you with difficulty john. <BT> rig is icom jx630 and runs 430 watts to a vertical antenna up 34 feet. <BT> weather is rainy and cold and my name is rebecca. <BT> i live in provo, utah where your rst is 589. <BT> my age is 34 and i am a contractor. <BT> how copy? <BT> ny7vyy de wj1zyg/4<AR>
VVV <KA> ny9qxy de kt6wpj/5 <BT> rrr and thanks liz. <BT> rig is icom pj617 and runs 785 watts to a monobander antenna up 105 feet. <BT> weather is snow and cold and my name is robert. <BT> i live in lewiston, maine where your rst is 598. <BT> my age is 66 and i am a student. <BT> how copy? <BT> ny9qxy de kt6wpj/5<AR>
VVV <KA> w0so de w4ob w4ob <BT> thanks hillary <BT> your rst 365 365 with slight qrm <BT> my name is bobbie <BT> the qth is nashville nashville, tennessee <BT> i have a yaesu ft990 es using 350 watts <BT> the ant is an inverted v <BT> wx hr raining, temp is 32 f <BT> i work here as a reporter <BT> first licenced in 1905 <BT> 73, mni tnx fer qso hillary <BT> w0so de w4ob [sk] [kn]<AR>
VVV <KA> w0zu de wh8lz/1 <BT> thanks for coming back alice. <BT> rig is yaesu kx710 and runs 410 watts to a yagi antenna up 15 feet. <BT> weather is rainy and cold and my name is michael. <BT> i live in kirksville, missouri where your rst is 478. <BT> my age is 65 and i am a sales manager. <BT> how copy? <BT> w0zu de wh8lz/1 [sk]<AR>
VVV <KA> w0zu/1 de wh8lz <BT> thanks for coming back alice. <BT> i live in kirksville, missouri where the weather is rainy and cold. <BT> rig is yaesu kx710 running 410 watts and your rst is 478. <BT> name here is michael. <BT> my age is 65 and i am a sales manager. <BT> antenna is yagi up 15 feet. <BT> how copy? <BT> w0zu/1 de wh8lz [sk]<AR>
VVV <KA> w1dq w1dq de kv8bv <BT> ge owen <BT> rst 557 <BT> name is martin <BT> i live in dayton, ohio <BT> my radio is a ts50s with 250 watts <BT> ant is long wire <BT> weather hr is too hot for me <BT> my job is as a surgeon <BT> ive been a ham fer 36 years <BT> back to you <BT> w1dq de kv8bv [kn]<AR>
VVV <KA> w1ju/2 de kz4yz <BT> solid copy beth. <BT> i live in phoenix, arizona where the weather is sunny and warm. <BT> rig is homebrew zy182 running 330 watts and your rst is 579. <BT> name here is grace. <BT> my age is 63 and i am a secretary. <BT> antenna is tribander up 26 feet. <BT> how copy? <BT> w1ju/2 de kz4yz<AR>
VVV <KA> w1sx de k3ppu/5 <BT> i am copying you with difficulty beth. <BT> rig is icom zp746 and runs 840 watts to a colinear antenna up 63 feet. <BT> weather is rainy and cold and my name is johnny. <BT> i live in hibbing, minnesota where your rst is 568. <BT> my age is 49 and i am a lawyer. <BT> how copy? <BT> w1sx de k3ppu/5 [sk]<AR>
VVV <KA> w1sx/5 de k3ppu <BT> i am copying you with difficulty beth. <BT> i live in hibbing, minnesota where the weather is rainy and cold. <BT> rig is icom zp746 running 840 watts and your rst is 568. <BT> name here is johnny. <BT> my age is 49 and i am a lawyer. <BT> antenna is colinear up 63 feet. <BT> how copy? <BT> w1sx/5 de k3ppu [sk]<AR>
VVV <KA> w1zzq/2 de ny2kk <BT> rrr and thanks samuel. <BT> i live in hibbing, minnesota where the weather is sunny and cold. <BT> rig is icom pz168 running 210 watts and your rst is 459. <BT> name here is emma. <BT> my age is 20 and i am a student. <BT> antenna is dipole up 78 feet. <BT> how copy? <BT> w1zzq/2 de ny2kk [sk]<AR>
VVV <KA> w2hz de ku9zx/2 <BT> rrr and thanks jack. <BT> rig is collins pz776 and runs 465 watts to a monobander antenna up 90 feet. <BT> weather is sunny and cold and my name is jim. <BT> i live in newark, new jersey where your rst is 488. <BT> my age is 57 and i am a engineer. <BT> how copy? <BT> w2hz de ku9zx/2 [sk]<AR>
VVV <KA> w4laz/2 de wk7owu <BT> good copy tom. <BT> i live in harlingen, texas where the weather is snow and cold. <BT> rig is drake zv434 running 230 watts and your rst is 459. <BT> name here is bobby. <BT> my age is 25 and i am a architect. <BT> antenna is dipole up 104 feet. <BT> how copy? <BT> w4laz/2 de wk7owu [sk]<AR>
VVV <KA> w4xrm/0 w4xrm/0 w4xrm/0 de kf5cl <BT> fb, tnx for call katrina <BT> ur rst 355 355 wid qsb <BT> name here is david <BT> rig here is a knwd ts50s es running 200 watts <BT> im using a dipole <BT> my location is conway conway, arkansas <BT> here, the weather is very damp, <BT> temp is 22 f <BT> been licenced since 1981 <BT> here im a paralegal <BT> back to you <BT> katrina <BT> w4xrm/0 de kf5cl [kn]<AR>
VVV <KA> w5od w5od de w4lt w4lt <BT> gm liz <BT> name bill <BT> ur rst is 589 solid cpy <BT> my radio is a yaesu ft857 500 watts <BT> ant is 3 el yagi <BT> my qth is owensboro, kentucky <BT> weather hr is very damp, temp is 38 f <BT> im a policeman <BT> been licenced for 46 years <BT> bk es how cpy now? <BT> w5od de w4lt<AR>
VVV <KA> w7gj w7gj de n4tsj <BT> ge richard <BT> the name is david <BT> ur rst is 568 <BT> my rig is ft920 with 250 watts <BT> ant hr is g5rv <BT> qth here is nashville, tennessee <BT> the weather here is pretty good <BT> got my ticket in 1914 <BT> i work hr as a judge <BT> bk to you <BT> w7gj de n4tsj kn<AR>
VVV <KA> w7kz/6 de kq6ypq <BT> i am copying you with difficulty jimmy. <BT> i live in newark, new jersey where the weather is sunny and cold. <BT> rig is icom pz395 running 90 watts and your rst is 469. <BT> name here is michael. <BT> my age is 40 and i am a architect. <BT> antenna is v beam up 105 feet. <BT> how copy? <BT> w7kz/6 de kq6ypq [sk]<AR>
VVV <KA> w7wzq/6 de kz4uuy <BT> rrr and thanks claire. <BT> i live in davenport, iowa where the weather is foggy. <BT> rig is homebrew pz443 running 660 watts and your rst is 569. <BT> name here is catherine. <BT> my age is 36 and i am a engineer. <BT> antenna is log periodic up 91 feet. <BT> how copy? <BT> w7wzq/6 de kz4uuy<AR>
VVV <KA> w8wkn de kr9u/4 kr9u/4 <BT> many tnx fer call kevin <BT> name here is reggie <BT> your rst 346 346 with slight qrn <BT> my rig is k1 running 200 watts <BT> the ant is a 4 el beam <BT> qth hr greenville greenville, south carolina <BT> wx hr rather cold, temp is 55 f <BT> been a ham for 63 years <BT> my job is as a steel worker <BT> over to you <BT> w8wkn de kr9u/4 kn<AR>
VVV <KA> w8xdh w8xdh w8xdh de nt1x <BT> fb es tnx fer buzz gail <BT> your rst 587 solid cpy <BT> name hr is amy <BT> rig here is an icom ic756 450 watts ant hr is 4 el beam <BT> qth is montpelier, vermont <BT> weather hr is rather warm, temp is 71 f <BT> i work here as a police officer <BT> ive been a ham for the last 9 years <BT> 73 es tnx fer qso <BT> w8xdh de nt1x sk<AR>
VVV <KA> w9hci de w7vt w7vt <BT> ge mary <BT> name here is roland <BT> ur rst 447 with qrm <BT> rig is dx70t with 50 watts ant is beam <BT> my location is great falls great falls, montana <BT> hr wx is warm <BT> been into radio for 38 years <BT> i work as a researcher <BT> 73 mary es tnx fer qso <BT> w9hci de w7vt [sk] [kn]<AR>
VVV <KA> w9sgu de no3l no3l <BT> ok es tnx fer call dave <BT> ur rst is 598 solid cpy <BT> the name is michael <BT> qth is baltimore, maryland <BT> my radio is a ft840 with 400 watts <BT> my ant is delta loop <BT> wx hr is hot, temp is 87 f <BT> here im a game warden <BT> ive been a ham for the last 9 years <BT> many tnx qso dave, 73 <BT> w9sgu de no3l [sk] kn<AR>
VVV <KA> wd5qud/2 de a6jkv <BT> thanks for coming back cathy. <BT> i live in bismarck, north dakota where the weather is overcast and cold. <BT> rig is yaesu sb508 running 485 watts and your rst is 469. <BT> name here is joe. <BT> my age is 66 and i am a engineer. <BT> antenna is monobander up 23 feet. <BT> how copy? <BT> wd5qud/2 de a6jkv [sk]<AR>
VVV <KA> wd5z/3 de k4urw <BT> good copy sarah. <BT> i live in dover, deleware where the weather is rainy and warm. <BT> rig is yaesu jz557 running 770 watts and your rst is 458. <BT> name here is pat. <BT> my age is 41 and i am a architect. <BT> antenna is dipole up 59 feet. <BT> how copy? <BT> wd5z/3 de k4urw [sk]<AR>
VVV <KA> wf9xpu/1 de k0zgj <BT> i am copying you with difficulty nicholas. <BT> i live in kalamazoo, michigan where the weather is sunny and warm. <BT> rig is kenwood zp617 running 420 watts and your rst is 559. <BT> name here is nicholas. <BT> my age is 57 and i am a doctor. <BT> antenna is dipole up 67 feet. <BT> how copy? <BT> wf9xpu/1 de k0zgj [sk]<AR>
VVV <KA> wg2u wg2u de ws6u <BT> fb, tnx for call arnie <BT> the name is jane <BT> ur rst is 367 367 with qrm <BT> our qth is modesto modesto, california <BT> rig is ts870s sending out 250 watts <BT> im using an hy gain beam <BT> weather hr is clear and sunny <BT> been licenced for 14 years <BT> here im a cleaner <BT> hw copy now? <BT> wg2u de ws6u kn<AR>
VVV <KA> wg5zb de nq3qvb/4 <BT> i am copying you with difficulty michael. <BT> rig is kenwood zk808 and runs 670 watts to a yagi antenna up 70 feet. <BT> weather is sunny and warm and my name is danny. <BT> i live in lynchburg, virginia where your rst is 499. <BT> my age is 46 and i am a chemist. <BT> how copy? <BT> wg5zb de nq3qvb/4 [sk]<AR>
VVV <KA> wg5zb/4 de nq3qvb <BT> i am copying you with difficulty michael. <BT> i live in lynchburg, virginia where the weather is sunny and warm. <BT> rig is kenwood zk808 running 670 watts and your rst is 499. <BT> name here is danny. <BT> my age is 46 and i am a chemist. <BT> antenna is yagi up 70 feet. <BT> how copy? <BT> wg5zb/4 de nq3qvb [sk]<AR>
VVV <KA> wg6qh de n0kee n0kee <BT> rrr tnx fer call chelsea <BT>name hr is katherine <BT> your rst is 587 <BT> im using ts570s sending out 100 watts my ant is r5 vertical <BT> our qth is williston, north dakota <BT> hr wx is clear, temp is 70 f <BT>job-wise im a welder <BT> been amateur since 1959 <BT> 73 es gud dx <BT> wg6qh de n0kee [sk]<AR>
VVV <KA> wi1efj de kp9dyy/9 <BT> thanks for coming back nicholas. <BT> rig is icom jz277 and runs 295 watts to a monobander antenna up 94 feet. <BT> weather is hot and dry and my name is thom. <BT> i live in newark, new jersey where your rst is 589. <BT> my age is 54 and i am a welder. <BT> how copy? <BT> wi1efj de kp9dyy/9<AR>
VVV <KA> wi1efj/9 de kp9dyy <BT> thanks for coming back nicholas. <BT> i live in newark, new jersey where the weather is hot and dry. <BT> rig is icom jz277 running 295 watts and your rst is 589. <BT> name here is thom. <BT> my age is 54 and i am a welder. <BT> antenna is monobander up 94 feet. <BT> how copy? <BT> wi1efj/9 de kp9dyy<AR>
VVV <KA> wj0kqx/0 de ay9mzj <BT> solid copy kathryn. <BT> i live in utica, new york where the weather is overcast and warm. <BT> rig is yaesu pz439 running 715 watts and your rst is 589. <BT> name here is jimmy. <BT> my age is 66 and i am a secretary. <BT> antenna is log periodic up 38 feet. <BT> how copy? <BT> wj0kqx/0 de ay9mzj<AR>
VVV <KA> wk0pge/4 de n5qzq <BT> good copy danny. <BT> i live in huntsville, alabama where the weather is rainy and cold. <BT> rig is homebrew zk592 running 360 watts and your rst is 568. <BT> name here is rebecca. <BT> my age is 26 and i am a mechanic. <BT> antenna is vertical up 60 feet. <BT> how copy? <BT> wk0pge/4 de n5qzq [sk]<AR>
VVV <KA> wk3ll wk3ll de kr9ov kr9ov <BT> thanks katherine <BT> ur rst is 347 347 with heavy qrn <BT> name is harold <BT> the qth is springfield springfield, illinois <BT> im using an ic746pro at 500 watts <BT> ant hr is g5rv <BT> wx hr too hot for me, temp is 61 f <BT> first licenced in 1932 <BT> my job is as a doctor <BT> 73, mni tnx fer qso katherine <BT> wk3ll de kr9ov [sk] kn<AR>
VVV <KA> wk8uv/5 de ky8wkk <BT> rrr and thanks liza. <BT> i live in spokane, washington where the weather is overcast and warm. <BT> rig is kenwood zp367 running 845 watts and your rst is 469. <BT> name here is anne. <BT> my age is 44 and i am a mechanic. <BT> antenna is tribander up 85 feet. <BT> how copy? <BT> wk8uv/5 de ky8wkk<AR>
VVV <KA> wp6pxy de k7uzx/7 <BT> rrr and thanks alice. <BT> rig is homebrew zp426 and runs 720 watts to a inverted v antenna up 110 feet. <BT> weather is sunny and warm and my name is mickey. <BT> i live in kitty hawk, north carolina where your rst is 478. <BT> my age is 43 and i am a contractor. <BT> how copy? <BT> wp6pxy de k7uzx/7 [sk]<AR>
VVV <KA> wq2vuz de nx3yu/4 <BT> rrr and thanks kathy. <BT> rig is yaesu zx705 and runs 725 watts to a dipole antenna up 20 feet. <BT> weather is foggy and my name is sam. <BT> i live in lynchburg, virginia where your rst is 478. <BT> my age is 30 and i am a professor. <BT> how copy? <BT> wq2vuz de nx3yu/4 [sk]<AR>
VVV <KA> wq4zyu de wb5zwx/1 <BT> good to talk to you again emma. <BT> rig is yaesu pj688 and runs 500 watts to a delta loop antenna up 103 feet. <BT> weather is overcast and cold and my name is laura. <BT> i live in hanna, wyoming where your rst is 469. <BT> my age is 17 and i am a teacher. <BT> how copy? <BT> wq4zyu de wb5zwx/1 [sk]<AR>
VVV <KA> wq5rgq de nu5kpy/1 <BT> rrr and thanks bob. <BT> rig is yaesu xv669 and runs 880 watts to a log periodic antenna up 91 feet. <BT> weather is foggy and my name is michael. <BT> i live in kitty hawk, north carolina where your rst is 479. <BT> my age is 55 and i am a programmer. <BT> how copy? <BT> wq5rgq de nu5kpy/1<AR>
VVV <KA> wq8ga wq8ga de ai9i <BT> fb es tnx fer buzz travis <BT> name here is dan <BT> rst 457 much qrm <BT> my rig is ft840 putting out 50 watts <BT> ant is long wire <BT> my location is milwaukee, wisconsin <BT> the weather here is hot and humid, temp is 82 f <BT> job-wise im an internet marketer <BT> been licenced for 58 years <BT> back to you travis <BT> wq8ga de ai9i kn<AR>
VVV <KA> wq9zbu de k2yud/8 <BT> rrr and thanks ed. i live in hagerstown, maryland where your rst is 598. weather is sunny and warm and my name is henry. <BT> my age is 26 and i am a chemist. <BT> rig is heathkit xv643 and runs 775 watts to a delta loop antenna up 67 feet. how copy? <BT> wq9zbu de k2yud/8 [sk]<AR>
VVV <KA> wu0sv de wm2ccj/9 <BT> rrr and thanks alice. i live in alliance, nebraska where your rst is 488. weather is sunny and cold and my name is henry. <BT> my age is 47 and i am a welder. <BT> rig is kenwood px594 and runs 500 watts to a dipole antenna up 81 feet. how copy? <BT> wu0sv de wm2ccj/9 [sk]<AR>
VVV <KA> wu1rxp de ny8qzu/4 <BT> solid copy hank. i live in hibbing, minnesota where your rst is 468. weather is rainy and warm and my name is james. <BT> my age is 59 and i am a engineer. <BT> rig is heath xp993 and runs 480 watts to a colinear antenna up 40 feet. how copy? <BT> wu1rxp de ny8qzu/4<AR>
VVV <KA> ww0ppk de wa0dm/6 <BT> solid copy grace. <BT> rig is kenwood pz464 and runs 420 watts to a delta loop antenna up 14 feet. <BT> weather is overcast and warm and my name is vicky. <BT> i live in spokane, washington where your rst is 579. <BT> my age is 36 and i am a lawyer. <BT> how copy? <BT> ww0ppk de wa0dm/6<AR>
VVV <KA> ww5nq de ab9bxq/9 <BT> i am copying you with difficulty liz. <BT> rig is yaesu jz851 and runs 820 watts to a log periodic antenna up 58 feet. <BT> weather is thunderstorm and my name is bobby. <BT> i live in davenport, iowa where your rst is 598. <BT> my age is 36 and i am a sales manager. <BT> how copy? <BT> ww5nq de ab9bxq/9<AR>
VVV <KA> ww5uj de w4vpz/3 <BT> i am copying you with difficulty laura. <BT> rig is icom zv640 and runs 425 watts to a yagi antenna up 56 feet. <BT> weather is overcast and cold and my name is vickie. <BT> i live in rutland, vermont where your rst is 458. <BT> my age is 49 and i am a carpenter. <BT> how copy? <BT> ww5uj de w4vpz/3<AR>
VVV <KA> wx1yj de wh4sx/8 <BT> good copy mickey. <BT> rig is heathkit zk673 and runs 100 watts to a dipole antenna up 11 feet. <BT> weather is sunny and cold and my name is thom. <BT> i live in augusta, georgia where your rst is 458. <BT> my age is 44 and i am a carpenter. <BT> how copy? <BT> wx1yj de wh4sx/8 [sk]<AR>
VVV <KA> wx2ovz de aq7zw/2 <BT> good to talk to you again thom. i live in bozeman, montana where your rst is 559. weather is thunderstorm and my name is joe. <BT> my age is 28 and i am a sales manager. <BT> rig is drake zv625 and runs 690 watts to a log periodic antenna up 10 feet. how copy? <BT> wx2ovz de aq7zw/2 [sk]<AR>
VVV <KA> wx3euy de wz9vex/2 <BT> good copy jane. <BT> rig is heath pj171 and runs 360 watts to a inverted v antenna up 106 feet. <BT> weather is rainy and warm and my name is jane. <BT> i live in alamogordo, new mexico where your rst is 579. <BT> my age is 62 and i am a student. <BT> how copy? <BT> wx3euy de wz9vex/2<AR>
VVV <KA> wx3s de wv3wi wv3wi <BT> r r r ok nice to meet u rachel <BT> your rst 569 solid cpy <BT> name hr is tara <BT> im using an icom ic781 sending out 500 watts <BT> ant is yagi <BT> my qth is uniontown, pennsylvania <BT> here, the weather is pretty good, temp is 75 f <BT> i work as a cartographer <BT> been licenced for 5 years <BT> i have to shut down now rachel, 73 es gud dx <BT> wx3s de wv3wi [sk]<AR>
VVV <KA> wy0zq de wv3xzs/1 <BT> thanks for coming back claire. <BT> rig is kenwood sb725 and runs 140 watts to a dipole antenna up 15 feet. <BT> weather is foggy and my name is daniel. <BT> i live in hanna, wyoming where your rst is 478. <BT> my age is 72 and i am a mechanic. <BT> how copy? <BT> wy0zq de wv3xzs/1<AR>
VVV <KA> wy7yv de wq3wxy/0 <BT> good to talk to you again matthew. i live in charleston, south carolina where your rst is 478. weather is sunny and cold and my name is william. <BT> my age is 32 and i am a engineer. <BT> rig is kenwood zv739 and runs 375 watts to a colinear antenna up 51 feet. how copy? <BT> wy7yv de wq3wxy/0<AR>
VVV <KA> wz4pvz de w3qzu/7 <BT> good copy bill. <BT> rig is yaesu px492 and runs 900 watts to a monobander antenna up 41 feet. <BT> weather is overcast and warm and my name is julie. <BT> i live in winnemucca, nevada where your rst is 558. <BT> my age is 39 and i am a sales manager. <BT> how copy? <BT> wz4pvz de w3qzu/7<AR>
VVV <KA> wz9uzj de wg9zp/3 <BT> solid copy becky. i live in nashua, new hampshire where your rst is 558. weather is sunny and cold and my name is beth. <BT> my age is 68 and i am a architect. <BT> rig is kenwood xv242 and runs 160 watts to a inverted v antenna up 49 feet. how copy? <BT> wz9uzj de wg9zp/3`
},
{
    title: 'Bremer Stadtmusikanten',
    content: 
`\\cDie Bremer Stadtmusikanten
Bremer Stadtmusikanten
Autor: Gebrüder Grimm
Es war einmal ein Mann, der hatte einen Esel. Dieser hatte schon lange Jahre unverdrossen die Säcke in die Mühle getragen. Nun aber verließen den Esel die Kräfte, so dass er nicht mehr zur Arbeit taugte. Da dachte sein Herr daran, ihn wegzugehen. Aber der Esel merkte, dass sein Herr nichts Gutes im Sinn hatte und lief fort. Er machte sich auf den Weg nach Bremen, denn dort, so dachte er, könnte er ja ein Bremer Stadtmusikant werden.

Auf nach Bremen!
Als er schon eine Weile gegangen war, sah er einen Jagdhund am Wegesrand liegen, der jämmerlich jammerte.

"Warum jammerst du denn so, Packan?"
fragte der Esel.

"Ach",
sagte der Hund,

"ich bin alt und werde jeden Tag schwächer. Ich kann auch nicht mehr auf die Jagd und mein Herr will mich daher totschießen. Da bin ich davongelaufen. Aber womit soll ich nun mein Brot verdienen?"
"Weißt du, was",
sprach der Esel,

"ich gehe nach Bremen und werde dort ein Stadtmusikant. Komm mit mir und musiziere mit mir. Ich spiele die Laute, und du schlägst die Pauke."
Der Hund war einverstanden, und sie gingen zusammen weiter.

Es dauerte nicht lange, da sahen sie eine Katze am Wege sitzen, die machte ein Gesicht wie sieben Tage Regenwetter.

"Was ist denn dir in die Quere gekommen, alter Bartputzer?"
fragte der Esel.

"Wer kann da lustig sein, wenn es einem an den Kragen geht",
antwortete die Katze.

"Ich bin nun alt und weil meine Zähne stumpf werden und ich lieber hinter dem Ofen sitze und spinne, als nach Mäusen zu jagen, hat mich meine Frau ertränken wollen. Ich konnte mich zwar noch davonschleichen, aber nun ist guter Rat teuer. Was soll ich nun tun?"
"Geh mit uns nach Bremen! Du verstehst dich doch auf die Nachtmusik. Wir wollen zusammen Bremer Stadtmusikanten werden."
Die Katze hielt das für gut und ging mit ihnen fort.

Als die drei so miteinander gingen, kamen sie an einem Hof vorbei. Dotr saß der Haushahn auf dem Tor und krähte aus Leibeskräften.

"Dein Schreien geht einem ja durch Mark und Bein",
sprach der Esel,

"was ist mir dir?"
"Die Hausfrau hat der Köchin befohlen, mir heute abend den Kopf abzusschlagen. Morgen, am Sonntag, haben sie Gäste und da wollen sie mich in der Suppe essen. Nun schrei ich aus vollem Hals, solang ich noch kann."
"Ei was",
sagte der Esel,

"zieh lieber mit uns fort! Wir gehen nach Bremen, etwas Besseres als den Tod findest du dort in jedem Fall. Du hast eine gute Stimme, und wenn wir zusammen musizieren, wird es sicherlich herrlich klingen."
Dem Hahn gefiel der Vorschlag, und sie gingen alle vier mitsammen fort.

Die Bremer Stadtmusikanten
Aber die Stadt Bremen war weit und so kamen sie abends in einen Wald, wo sie übernachten wollten. Der Esel und der Hund legten sich unter einen großen Baum, die Katze kletterte auf einen Ast, und der Hahn flog bis in den Wipfel, wo es am sichersten für ihn war.

Bevor er einschlief, sah er sich noch einmal in alle Himmelsrichtungen um. Da bemerkte er einen Lichtschein in der Ferne. Er sagte seinen Gefährten, dass da wohl ein Haus sei, denn er sehe ein Licht. Der Esel antwortete:

"Dann wollen wir uns aufmachen und dort hingehen, denn hier ist die Herberge schlecht."
Und auch der Hund meinte, ein paar Knochen und mit etwas Fleisch täten ihm auch gut.

Das Räuberhaus
Also machten sie sich auf den Weg zu dem Flecken, wo das Licht war. Bald sahen sie es heller schimmern, und es wurde immer größer, bis sie vor ein hellerleuchtetes Räuberhaus kamen. Der Esel, als der größte, ging ans Fenster und schaute hinein.

"Was siehst du, Grauschimmel?"
fragte der Hahn.

"Was ich sehe?"
antwortete der Esel.

"Einen gedeckten Tisch mit schönem Essen und Trinken. Räuber sitzen rundherum und lassen sich es gutgehen!"
"Das wäre etwas für uns",
sprach der Hahn.

Da überlegten die Tiere, wie sie es anfangen könnten, die Räuber hinauszujagen. Endlich fanden sie einen Weg. Der Esel stellte sich mit den Vorderfüßen auf das Fenster, der Hund sprang auf seinen Rücken, die Katze kletterte auf den Hund, und zuletzt flog der Hahn hinauf und setzte sich auf den Kopf der. Als das geschehen war, fingen sie auf ein Zeichen an, ihre Musik zu machen: der Esel schrie, der Hund bellte, die Katze miaute und der Hahn krähte. Darauf stürzten sie durch das Fenster in die Stube hinein, dass die Scheiben klirrten.

Die Räuber fuhren bei dem entsetzlichen Lärm in die Höhe. Sie meinten, ein Gespenst käme herein und flohen voller Furcht in den Wald hinaus.

Nun setzten sich die vier Gesellen an den Tisch, und jeder aß nach Herzenslust.

Als sie fertig waren, löschten sie das Licht aus, und jeder suchte sich einen Schlafplatz nach seinem Geschmack. Der Esel legte sich auf den Mist, der Hund hinter die Tür, die Katze auf den Herd bei der warmen Asche, und der Hahn flog auf das Dach hinauf. Und weil sie müde waren von ihrem langen Weg, schliefen sie bald ein.

In der Nacht
Als Mitternacht vorbei war und die Räuber von weitem sahen, dass kein Licht mehr im Haus brannte und alles ruhig schien, sprach der Hauptmann:

"Wir hätten uns doch nicht ins Bockshorn jagen lassen sollen!"
und schickte einen Räuber zurück, um zu sehen, ob noch jemand im Hause wäre.

Der Räuber fand alles still. Er ging in die Küche und wollte ein Licht anzünden. Da sah er die feurigen Augen der Katze und meinte, es wären glühende Kohlen. Er hielt ein Streichholz dran, um sie zu entzünden.

Aber die Katze verstand keinen Spaß, sprang ihm ins Gesicht und kratzte ihn aus Leibeskräften. Da erschrak er gewaltig und wollte zur Hintertür hinauslaufen, doch der Hund, der da lag, sprang auf und biß ihn ins Bein. Als der Räuber über den Hof am Misthaufen vorbeirannte, gab ihm der Esel noch einen tüchtigen Tritt mit den Hufen. Der Hahn aber, der von dem Lärm aus dem Schlaf geweckt worden war, rief vom Dache herunter:

"Kikeriki!"
Da lief der Räuber, so schnell er konnte, zu seinem Hauptmann zurück und sprach:

"In dem Haus sitzt eine greuliche Hexe, die hat mich angehaucht und mir mit ihren langen Fingern das Gesicht zerkratzt. An der Tür steht ein Mann mit einem Messer, der hat mich ins Bein gestochen. Auf dem Hof aber liegt ein schwarzes Ungetüm, das hat mit einem Holzprügel auf mich eingeschlagen und oben auf dem Dache, da sitzt der Richter und rief: -Bringt mir den Schelm her!- Da machte ich, dass ich fortkam."
Von nun an getrauten sich die Räuber nicht mehr in das Haus. Den vier Bremer Stadtmusikanten aber gefiels darin so gut, dass sie nicht wieder hinaus wollten.
`
}

] 
    }

}
module.exports = { FileUploadUI }
