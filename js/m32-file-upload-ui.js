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

        document.getElementById("m32-file-upload-start-snapshot7-button").addEventListener('click', this.startSnapshot7.bind(this));
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
        this.m32CommunicationService.sendM32Command('PUT menu/stop', false);
        this.m32CommunicationService.sendM32Command('PUT menu/start/' + M32_MENU_CW_GENERATOR_FILE_PLAYER_ID);
    }

    startSnapshot7() {
        log.debug("starting snapshot 7");
        this.m32CommunicationService.sendM32Command('PUT menu/stop', false);
        this.m32CommunicationService.sendM32Command('PUT snapshot/recall/7', false);
        this.m32CommunicationService.sendM32Command('PUT menu/start', false);
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
            title: 'German Sayings (DE)', 
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
    title: 'ARRL Examination Texts (EN)', 
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
    title: 'Bremer Stadtmusikanten (DE)',
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
},
{
    title: 'Krambambuli (DE)',
    content: 
`\\cKrambambuli
Marie von Ebner-Eschenbach

Krambambuli

Vorliebe empfindet der Mensch für allerlei Dinge und Wesen. Liebe, die echte, unvergängliche, die lernt er – wenn überhaupt – nur einmal kennen. So wenigstens meint der Herr Revierjäger Hopp. Wie viele Hunde hat er schon gehabt, und auch gern gehabt; aber lieb, was man sagt lieb und unvergeßlich, ist ihm nur einer gewesen – der Krambambuli. Er hatte ihn im Wirtshause zum Löwen in Wischau von einem vazierenden Forstgehilfen gekauft oder eigentlich eingetauscht. Gleich beim ersten Anblick des Hundes war er von der Zuneigung ergriffen worden, die dauern sollte bis zu seinem letzten Atemzuge. Dem Herrn des schönen Tieres, der am Tische vor einem geleerten Branntweingläschen saß und über den Wirt schimpfte, weil dieser kein zweites umsonst hergeben wollte, sah der Lump aus den Augen. Ein kleiner Kerl, noch jung und doch so fahl wie ein abgestorbener Baum, mit gelbem Haar und spärlichem gelbem Barte. Der Jägerrock, vermutlich ein Überrest aus der vergangenen Herrlichkeit des letzten Dienstes, trug die Spuren einer im nassen Straßengraben zugebrachten Nacht. Obwohl sich Hopp ungern in schlechte Gesellschaft begab, nahm er trotzdem Platz neben dem Burschen und begann sogleich ein Gespräch mit ihm. Da bekam er es denn bald heraus, daß der Nichtsnutz den Stutzen und die Jagdtasche dem Wirt bereits als Pfänder ausgeliefert hatte und daß er jetzt auch den Hund als solches hergeben möchte; der Wirt jedoch, der schmutzige Leuteschinder, wollte von einem Pfand, das gefüttert werden muß, nichts hören.
Herr Hopp sagte vorerst kein Wort von dem Wohlgefallen, das er an dem Hunde gefunden hatte, ließ aber eine Flasche von dem guten Danziger Kirschbranntwein bringen, den der Löwenwirt damals führte, und schenkte dem Vazierenden fleißig ein. – Nun, in einer Stunde war alles in Ordnung. Der Jäger gab zwölf Flaschen von demselben Getränke, bei dem der Handel geschlossen worden – der Vagabund gab den Hund. Zu seiner Ehre muß man gestehen: nicht leicht. Die Hände zitterten ihm so sehr, als er dem Tiere die Leine um den Hals legte, daß es schien, er werde mit dieser Manipulation nimmermehr zurechtkommen. Hopp wartete geduldig und bewunderte im stillen den trotz der schlechten Kondition, in der er sich befand, wundervollen Hund. Höchstens zwei Jahre mochte er alt sein, und in der Farbe glich er dem Lumpen, der ihn hergab; doch war die seine um ein paar Schattierungen dunkler. Auf der Stirn hatte er ein Abzeichen, einen weißen Strich, der rechts und links in kleine Linien auslief, in der Art wie die Nadeln an einem Tannenreis. Die Augen waren groß, schwarz, leuchtend, von tauklaren, lichtgelben Reiflein umsäumt, die Ohren hoch angesetzt, lang, makellos. Und makellos war alles an dem ganzen Hunde von der Klaue bis zu der feinen Witternase: die kräftige, geschmeidige Gestalt, das über jedes Lob erhabene Piedestal. Vier lebende Säulen, die auch den Körper eines Hirsches getragen hätten und nicht viel dicker waren als die Läufe eines Hasen. Beim heiligen Hubertus! dieses Geschöpf mußte einen Stammbaum haben, so alt und rein wie der eines deutschen Ordensritters.
Dem Jäger lachte das Herz im Leibe über den prächtigen Handel, den er gemacht hatte. Er stand nun auf, ergriff die Leine, die zu verknoten dem Vazierenden endlich gelungen war, und fragte: Wie heißt er denn? – Er heißt wie das, wofür Ihr ihn kriegt: Krambambuli, lautete die Antwort. – Gut, gut, Krambambuli! So komm! Wirst gehen? Vorwärts! – Ja, er konnte lang rufen, pfeifen, zerren – der Hund gehorchte ihm nicht, wandte den Kopf dem zu, den er noch für seinen Herrn hielt, heulte, als dieser ihm zuschrie: Marsch! und den Befehl mit einem tüchtigen Fußtritt begleitete, suchte aber sich immer wieder an ihn heran zu drängen. Erst nach einem heißen Kampfe gelang es Herrn Hopp, die Besitzergreifung des Hundes zu vollziehen. Gebunden und geknebelt, mußte er zuletzt in einem Sacke auf die Schulter geladen und so bis in das mehrere Wegstunden entfernte Jägerhaus getragen werden.
Zwei volle Monate brauchte es, bevor Krambambuli, halb totgeprügelt, nach jedem Fluchtversuche mit dem Stachelhalsband an die Kette gelegt, endlich begriff, wohin er jetzt gehöre. Dann aber, als seine Unterwerfung vollständig geworden war, was für ein Hund wurde er da! Keine Zunge schildert, kein Wort ermißt die Höhe der Vollendung, die er erreichte, nicht nur in der Ausübung seines Berufes, sondern auch im täglichen Leben als eifriger Diener, guter Kamerad und treuer Freund und Hüter. Dem fehlt nur die Sprache, heißt es von andern intelligenten Hunden – dem Krambambuli fehlte sie nicht; sein Herr zum mindesten pflog lange Unterredungen mit ihm. Die Frau des Revierjägers wurde ordentlich eifersüchtig auf den Buli, wie sie ihn geringschätzig nannte. Manchmal machte sie ihrem Manne Vorwürfe. Sie hatte den ganzen Tag, in jeder Stunde, in der sie nicht aufräumte, wusch oder kochte, schweigend gestrickt. Am Abend, nach dem Essen, wenn sie wieder zu stricken begann, hätte sie gern eins dazu geplaudert.
Weißt denn immer nur dem Buli was zu erzählen, Hopp, und mir nie? Du verlernst vor lauter Sprechen mit dem Vieh das Sprechen mit den Menschen.
Der Revierjäger gestand sich, daß etwas Wahres an der Sache sei; aber zu helfen wußte er nicht. Wovon hätte er mit seiner Alten reden sollen? Kinder hatten sie nie gehabt, eine Kuh durften sie nicht halten, und das zahme Geflügel interessiert einen Jäger im lebendigen Zustande gar nicht und im gebratenen nicht sehr. Für Kulturen aber und für Jagdgeschichten hatte wieder die Frau keinen Sinn. Hopp fand zuletzt einen Ausweg aus diesem Dilemma; statt mit dem Krambambuli sprach er von dem Krambambuli, von den Triumphen, die er allenthalben mit ihm feierte, von dem Neide, den sein Besitz erregte, von den lächerlich hohen Summen, die ihm für den Hund geboten wurden und die er verächtlich von der Hand wies.
Zwei Jahre waren vergangen, da erschien eines Tages die Gräfin, die Frau seines Brotherrn, im Hause des Jägers. Er wußte gleich, was der Besuch zu bedeuten hatte, und als die gute, schöne Dame begann: Morgen, lieber Hopp, ist der Geburtstag des Grafen..., setzte er ruhig und schmunzelnd fort: Und da möchten hochgräfliche Gnaden dem Herrn Grafen ein Geschenk machen und sind überzeugt, mit nichts anderm soviel Ehre einlegen zu können wie mit dem Krambambuli. – Ja, ja, lieber Hopp. Die Gräfin errötete vor Vergnügen über dieses freundliche Entgegenkommen und sprach gleich von Dankbarkeit und bat, den Preis nur zu nennen, der für den Hund zu entrichten wäre. Der alte Fuchs von einem Revierjäger kicherte, tat sehr demütig und rückte auf einmal mit der Erklärung heraus. Hochgräfliche Gnaden! Wenn der Hund im Schlosse bleibt, nicht jede Leine zerbeißt, nicht jede Kette zerreißt, oder wenn er sie nicht zerreißen kann, sich bei den Versuchen, es zu tun, erwürgt, dann behalten ihn hochgräfliche Gnaden umsonst – dann ist er mir nichts mehr wert.
Die Probe wurde gemacht, aber zum Erwürgen kam es nicht; denn der Graf verlor früher die Freude an dem eigensinnigen Tiere. Vergeblich hatte man es durch Liebe zu gewinnen, mit Strenge zu bändigen gesucht. Er biß jeden, der sich ihm näherte, versagte das Futter und – viel hat der Hund eines Jägers ohnehin nicht zuzusetzen – kam ganz herunter. Nach einigen Wochen erhielt Hopp die Botschaft, er könne sich seinen Köter abholen. Als er eilends von der Erlaubnis Gebrauch machte und den Hund in seinem Zwinger aufsuchte, da gab's ein Wiedersehen unermeßlichen Jubels voll. Krambambuli erhob ein wahnsinniges Geheul, sprang an seinem Herrn empor, stemmte die Vorderpfoten auf dessen Brust und leckte die Freudentränen ab, die dem Alten über die Wangen liefen.
Am Abend dieses glücklichen Tages wanderten sie zusammen ins Wirtshaus. Der Jäger spielte Tarok mit dem Doktor und mit dem Verwalter, Krambambuli lag in der Ecke hinter seinem Herrn. Manchmal sah dieser sich nach ihm um, und der Hund, so tief er auch zu schlafen schien, begann augenblicklich mit dem Schwanze auf den Boden zu klopfen, als wollt er melden: Präsent! Und wenn Hopp, sich vergessend, recht wie einen Triumphgesang das Liedchen anstimmte: Was macht denn mein Krambambuli?, richtete der Hund sich würde- und respektvoll auf, und seine hellen Augen antworteten:
Es geht ihm gut!
Um dieselbe Zeit trieb, nicht nur in den gräflichen Forsten, sondern in der ganzen Umgebung, eine Bande Wildschützen auf wahrhaft tolldreiste Art ihr Wesen. Der Anführer sollte ein verlottertes Subjekt sein. Den Gelben nannten ihn die Holzknechte, die ihn in irgendeiner übelberüchtigten Spelunke beim Branntwein trafen, die Heger, die ihm hie und da schon auf der Spur gewesen waren, ihm aber nie hatten beikommen können, und endlich die Kundschafter, deren er unter dem schlechten Gesindel in jedem Dorfe mehrere besaß.
Er war wohl der frechste Gesell, der jemals ehrlichen Jägersmännern etwas aufzulösen gab, mußte auch selbst vom Handwerk gewesen sein, sonst hätte er das Wild nicht mit solcher Sicherheit aufspüren und nicht so geschickt jeder Falle, die ihm gestellt wurde, ausweichen können.
Die Wild- und Waldschäden erreichten eine unerhörte Höhe, das Forstpersonal befand sich in grimmigster Aufregung. Da begab es sich nur zu oft, daß die kleinen Leute, die bei irgendeinem unbedeutenden Waldfrevel ertappt wurden, eine härtere Behandlung erlitten, als zu andrer Zeit geschehen wäre und als gerade zu rechtfertigen war. Große Erbitterung herrschte darüber in allen Ortschaften. Dem Oberförster, gegen den der Haß sich zunächst wandte, kamen gutgemeinte Warnungen in Menge zu. Die Raubschützen, hieß es, hätten einen Eid darauf geschworen, bei der ersten Gelegenheit exemplarische Rache an ihm zu nehmen. Er, ein rascher, kühner Mann, schlug das Gerede in den Wind und sorgte mehr denn je dafür, daß weit und breit kund werde, wie er seinen Untergebenen die rücksichtsloseste Strenge anbefohlen und für etwaige schlimme Folgen die Verantwortung selbst übernommen habe. Am häufigsten rief der Oberförster dem Revierjäger Hopp die scharfe Handhabung seiner Amtspflicht ins Gedächtnis und warf ihm zuweilen Mangel an Schneid vor, wozu freilich der Alte nur lächelte. Der Krambambuli aber, den er bei solcher Gelegenheit von oben herunter anblinzelte, gähnte laut und wegwerfend. Übel nahmen er und sein Herr dem Oberförster nichts. Der Oberförster war ja der Sohn des Unvergeßlichen, bei dem Hopp das edle Weidwerk erlernt, und Hopp hatte wieder ihn als kleinen Jungen in die Rudimente des Berufs eingeweiht. Die Plage, die er einst mit ihm gehabt, hielt er heute noch für eine Freude, war stolz auf den ehemaligen Zögling und liebte ihn trotz der rauhen Behandlung, die er so gut wie jeder andre von ihm erfuhr.
Eines Junimorgens traf er ihn eben wieder bei einer Exekution.
Es war im Lindenrondell, am Ende des herrschaftlichen Parks, der an den Grafenwald grenzte, und in der Nähe der Kulturen, die der Oberförster am liebsten mit Pulverminen umgeben hätte. Die Linden standen just in schönster Blüte, und über diese hatte ein Dutzend kleiner Jungen sich hergemacht. Wie Eichkätzchen krochen sie auf den Ästen der herrlichen Bäume herum, brachen alle Zweige, die sie erwischen konnten, ab und warfen sie zur Erde. Zwei Weiber lasen die Zweige hastig auf und stopften sie in Körbe, die schon mehr als zur Hälfte mit dem duftenden Raub gefüllt waren. Der Oberförster raste in unermeßlicher Wut. Er ließ durch seine Heger die Buben nur so von den Bäumen schütteln, unbekümmert um die Höhe, aus der sie fielen. Während sie wimmernd und schreiend um seine Füße krochen, der eine mit zerschundenem Gesicht, der andere mit ausgerenktem Arm, ein dritter mit gebrochenem Bein, zerbläute er eigenhändig die beiden Weiber. In einer von ihnen erkannte Hopp die leichtfertige Dirne, die das Gerücht als die Geliebte des Gelben bezeichnete. Und als die Körbe und Tücher der Weiber und die Hüte der Buben in Pfand genommen wurden und Hopp den Auftrag bekam, sie aufs Gericht zu bringen, konnte er sich eines schlimmen Vorgefühls nicht erwehren.
Der Befehl, den ihm damals der Oberförster zurief, wild wie ein Teufel in der Hölle und wie ein solcher umringt von jammernden und gepeinigten Sündern, ist der letzte gewesen, den der Revierjäger im Leben von ihm erhalten hat. Eine Woche später traf er ihn wieder im Lindenrondell – tot. Aus dem Zustande, in dem die Leiche sich befand, war zu ersehen, daß sie hierher, und zwar durch Sumpf und Gerölle, geschleppt worden war, um an dieser Stelle aufgebahrt zu werden. Der Oberförster lag auf abgehauenen Zweigen, die Stirn mit einem dichten Kranz aus Lindenblüten umflochten, einen ebensolchen als Bandelier um die Brust gewunden. Sein Hut stand neben ihm, mit Lindenblüten gefüllt. Auch die Jagdtasche hatte der Mörder ihm gelassen, nur die Patronen herausgenommen und statt ihrer Lindenblüten hineingesteckt. Der schöne Hinterlader des Oberförsters fehlte und war durch einen elenden Schießprügel ersetzt. Als man später die Kugel, die seinen Tod verursacht hatte, in der Brust des Ermordeten fand, zeigte es sich, daß sie genau in den Lauf dieses Schießprügels paßte, der dem Förster gleichsam zum Hohne über die Schulter gelegt worden war. Hopp stand beim Anblick der entstellten Leiche regungslos vor Entsetzen. Er hätte keinen Finger heben können, und auch das Gehirn war ihm wie gelähmt; er starrte nur und starrte und dachte anfangs gar nichts, und erst nach einer Weile brachte er es zu einer Beobachtung, einer stummen Frage: – Was hat denn der Hund?
Krambambuli beschnüffelt den toten Mann, läuft wie nicht gescheit um ihn herum, die Nase immer am Boden. Einmal winselt er, einmal stößt er einen schrillen Freudenschrei aus, macht ein paar Sätze, bellt, und es ist gerade so, als erwache in ihm eine längst erstorbene Erinnerung...
Herein, ruft Hopp, da herein! Und Krambambuli gehorcht, sieht aber seinen Herrn in allerhöchster Aufregung an und – wie der Jäger sich auszudrücken pflegte – sagt ihm: Ich bitte dich um alles in der Welt, siehst du denn nichts? Riechst du denn nichts?... O lieber Herr, schau doch! riech doch! O Herr, komm! Daher komm!... Und tupft mit der Schnauze an des Jägers Knie und schleicht, sich oft umsehend, als frage er: Folgst du mir?, zu der Leiche zurück und fängt an, das schwere Gewehr zu heben und zu schieben und ins Maul zu fassen, in der offenbaren Absicht, es zu apportieren.
Dem Jäger läuft ein Schauer über den Rücken, und allerlei Vermutungen dämmern in ihm auf. Weil das Spintisieren aber nicht seine Sache ist, es ihm auch nicht zukommt, der Obrigkeit Lichter aufzustecken, sondern vielmehr den gräßlichen Fund, den er getan hat, unberührt zu lassen und seiner Wege – das heißt in dem Fall recte zu Gericht – zu gehen, so tut er denn einfach, was ihm zukommt.
Nachdem es geschehen und alle Förmlichkeiten, die das Gesetz bei solchen Katastrophen vorschreibt, erfüllt, der ganze Tag und auch ein Stück der Nacht darüber hingegangen sind, nimmt Hopp, ehe er schlafen geht, noch seinen Hund vor.
Mein Hund, spricht er, jetzt ist die Gendarmerie auf den Beinen, jetzt gibt's Streifereien ohne Ende. Wollen wir es andern überlassen, den Schuft, der unsern Oberförster erschossen hat, wegzuputzen aus der Welt? – Mein Hund kennt den niederträchtigen Strolch, kennt ihn, ja, ja! Aber das braucht niemand zu wissen, das habe ich nicht ausgesagt... Ich, hoho!... Ich werd meinen Hund hineinbringen in die Geschichte... Das könnt mir einfallen! Er beugte sich über Krambambuli, der zwischen seinen ausgespreizten Knien saß, drückte die Wange an den Kopf des Tieres und nahm seine dankbaren Liebkosungen in Empfang. Dabei summte er: Was macht denn mein Krambambuli?, bis der Schlaf ihn übermannte.
Seelenkundige haben den geheinmisvollen Drang zu erklären gesucht, der manchen Verbrecher stets wieder an den Schauplatz seiner Untat zurückjagt. Hopp wußte von diesen gelehrten Ausführungen nichts, strich aber dennoch ruh- und rastlos mit seinem Hunde in der Nähe des Lindenrondells herum.
Am zehnten Tage nach dem Tode des Oberförsters hatte er zum erstenmal ein paar Stunden lang an etwas andres gedacht als an seine Rache und sich im Grafenwald mit dem Bezeichnen der Bäume beschäftigt, die beim nächsten Schlag ausgenommen werden sollten.
Wie er nun mit seiner Arbeit fertig ist, hängt er die Flinte wieder um und schlägt den kürzesten Weg ein, quer durch den Wald gegen die Kulturen in der Nähe des Lindenrondells. Im Augenblick, in dem er auf den Fußsteig treten will, der längs des Buchenzaunes läuft, ist ihm, als höre er etwas im Laube rascheln. Gleich darauf herrscht jedoch tiefe Stille, tiefe, anhaltende Stille. Fast hätte er gemeint, es sei nichts Bemerkenswertes gewesen, wenn nicht der Hund so merkwürdig dreingeschaut hätte. Der stand mit gesträubtem Haar, den Hals vorgestreckt, den Schwanz aufrecht, und glotzte eine Stelle des Zaunes an. Oho! dachte Hopp, wart, Kerl, wenn du's bist! Trat hinter einen Baum und spannte den Hahn seiner Flinte. Wie rasend pochte ihm das Herz, und der ohnehin kurze Atem wollte ihm völlig versagen, als jetzt plötzlich – Gottes Wunder! – durch den Zaun der Gelbe auf den Fußsteig trat. Zwei junge Hasen hingen an seiner Weidtasche, und auf seiner Schulter, am wohlbekannten Juchtenriemen, der Hinterlader des Oberförsters. Nun wär's eine Passion gewesen, den Racker niederzubrennen aus sicherem Hinterhalt.
Aber nicht einmal auf den schlechtesten Kerl schießt der Jäger Hopp, ohne ihn angerufen zu haben. Mit einem Satze springt er hinter dem Baum hervor und auf den Fußsteig und schreit: Gib dich, Vermaledeiter! Und als der Wildschütz zur Antwort den Hinterlader von der Schulter reißt, gibt der Jäger Feuer... All ihr Heiligen – ein sauberes Feuer! Die Flinte knackst, anstatt zu knallen. Sie hat zu lang mit aufgesetzter Kapsel im feuchten Wald am Baum gelehnt – sie versagt.
Gute Nacht, so sieht das Sterben aus, denkt der Alte. Doch nein – er ist heil, sein Hut nur fliegt, von Schroten durchlöchert, ins Gras.
Der andre hat auch kein Glück; das war der letzte Schuß in seinem Gewehr, und zum nächsten zieht er eben erst die Patrone aus der Tasche...
Pack an! ruft Hopp seinem Hunde heiser zu: Pack an! Und:
Herein, zu mir! Herein, Krambambuli! lockt es drüben mit zärtlicher, liebevoller – ach, mit altbekannter Stimme...
Der Hund aber –
Was sich nun begab, begab sich viel rascher, als man es erzählen kann.
Krambambuli hatte seinen ersten Herrn erkannt und rannte auf ihn zu, bis – in die Mitte des Weges. Da pfeift Hopp, und der Hund macht kehrt, der Gelbe pfeift, und der Hund macht wieder kehrt und windet sich in Verzweiflung auf einem Fleck, in gleicher Distanz von dem Jäger wie von dem Wildschützen, zugleich hingerissen und gebannt...
Zuletzt hat das arme Tier den trostlos unnötigen Kampf aufgegeben und seinen Zweifeln ein Ende gemacht, aber nicht seiner Qual. Bellend, heulend, den Bauch am Boden, den Körper gespannt wie eine Sehne, den Kopf emporgehoben, als riefe es den Himmel zum Zeugen seines Seelenschmerzes an, kriecht es – seinem ersten Herrn zu.
Bei dem Anblick wird Hopp von Blutdurst gepackt. Mit zitternden Fingern hat er die neue Kapsel aufgesetzt – mit ruhiger Sicherheit legt er an. Auch der Gelbe hat den Lauf wieder auf ihn gerichtet. Diesmal gilt's! Das wissen die beiden, die einander auf dem Korn haben, und was auch in ihnen vorgehen möge, sie zielen so ruhig wie ein paar gemalte Schützen.
Zwei Schüsse fallen. Der Jäger trifft, der Wildschütze fehlt.
Warum? Weil er – vom Hunde mit stürmischer Liebkosung angesprungen – gezuckt hat im Augenblick des Losdrückens. Bestie! zischt er noch, stürzt rücklings hin und rührt sich nicht mehr.
Der ihn gerichtet, kommt langsam herangeschritten. Du hast genug, denkt er, um jedes Schrotkorn wär's schad bei dir. Trotzdem stellt er die Flinte auf den Boden und lädt von neuem. Der Hund sitzt aufrecht vor ihm, läßt die Zunge heraushängen, keucht kurz und laut und sieht ihm zu. Und als der Jäger fertig ist und die Flinte wieder zur Hand nimmt, halten sie ein Gespräch, von dem kein Zeuge ein Wort vernommen hätte, wenn es auch statt eines toten ein lebendiger gewesen wäre.
Weißt du, für wen das Blei gehört?
Ich kann es mir denken.
Deserteur, Kalfakter, pflicht- und treuvergessene Kanaille!
Ja, Herr, jawohl.
Du warst meine Freude. Jetzt ist's vorbei. Ich habe keine Freude mehr an dir.
Begreiflich, Herr, und Krambambuli legte sich hin, drückte den Kopf auf die ausgestreckten Vorderpfoten und sah den Jäger an.
Ja, hätte das verdammte Vieh ihn nur nicht angesehen! Da würde er ein rasches Ende gemacht und sich und dem Hunde viel Pein erspart haben. Aber so geht's nicht! Wer könnte ein Geschöpf niederknallen, das einen so ansieht? Herr Hopp murmelt ein halbes Dutzend Flüche zwischen den Zähnen, einer gotteslästerlicher als der andre, hängt die Flinte wieder um, nimmt dem Raubschützen noch die jungen Hasen ab und geht.
Der Hund folgte ihm mit den Augen, bis er zwischen den Bäumen verschwunden war, stand dann auf, und sein mark- und beinerschütterndes Wehgeheul durchdrang den Wald. Ein paarmal drehte er sich im Kreise und setzte sich wieder aufrecht neben den Toten hin. So fand ihn die gerichtliche Kommission, die, von Hopp geleitet, bei sinkender Nacht erschien, um die Leiche des Raubschützen in Augenschein zu nehmen und fortschaffen zu lassen. Krambambuli wich einige Schritte zurück, als die Herren herantraten. Einer von ihnen sagte zu dem Jäger: Das ist ja Ihr Hund. – Ich habe ihn hier als Schildwache zurückgelassen, antwortete Hopp, der sich schämte, die Wahrheit zu gestehen. – Was half's? Sie kam doch heraus, denn als die Leiche auf den Wagen geladen war und fortgeführt wurde, trottete Krambambuli gesenkten Kopfes und mit eingezogenem Schwanze hinterher. Unweit der Totenkammer, in der der Gelbe lag, sah ihn der Gerichtsdiener noch am folgenden Tage herumstreichen. Er gab ihm einen Tritt und rief ihm zu: Geh nach Hause! – Krambambuli fletschte die Zähne gegen ihn und lief davon, wie der Mann meinte, in der Richtung des Jägerhauses. Aber dorthin kam er nicht, sondern führte ein elendes Vagabundenleben.
Verwildert, zum Skelett abgemagert, umschlich er einmal die armen Wohnungen der Häusler am Ende des Dorfes. Plötzlich stürzte er auf ein Kind los, das vor der letzten Hütte stand, und entriß ihm gierig das Stück harten Brotes, an dem es nagte. Das Kind blieb starr vor Schrecken, aber ein kleiner Spitz sprang aus dem Hause und bellte den Räuber an. Dieser ließ sogleich seine Beute fahren und entfloh.
Am selben Abend stand Hopp vor dem Schlafengehen am Fenster und blickte in die schimmernde Sommernacht hinaus. Da war ihm, als sähe er jenseits der Wiese am Waldessaum den Hund sitzen, die Stätte seines ehemaligen Glückes unverwandt und sehnsüchtig betrachtend – der Treueste der Treuen, herrenlos!
Der Jäger schlug den Laden zu und ging zu Bett. Aber nach einer Weile stand er auf, trat wieder ans Fenster – der Hund war nicht mehr da. Und wieder wollte er sich zur Ruhe begeben und wieder fand er sie nicht.
Er hielt es nicht mehr aus. Sei es, wie es sei... Er hielt es nicht mehr aus ohne den Hund. – Ich hol ihn heim, dachte er, und fühlte sich wie neugeboren nach diesem Entschluß.
Beim ersten Morgengrauen war er angekleidet, befahl seiner Alten, mit dem Mittagessen nicht auf ihn zu warten, und sputete sich hinweg. Wie er aber aus dem Hause trat, stieß sein Fuß an denjenigen, den er in der Ferne zu suchen ausging. Krambambuli lag verendet vor ihm, den Kopf an die Schwelle gepreßt, die zu überschreiten er nicht mehr gewagt hatte.
Der Jäger verschmerzte ihn nie. Die Augenblicke waren seine besten, in denen er vergaß, daß er ihn verloren hatte. In freundliche Gedanken versunken, intonierte er dann sein berühmtes: Was macht denn mein Krambam... Aber mitten in dem Worte hielt er bestürzt inne, schüttelte das Haupt und sprach mit einem tiefen Seufzer: Schad um den Hund.
`
},
{
    title: 'Schneewittchen (DE)',
    content: 
`\\cSchneewittchen
Es war einmal mitten im Winter, und die Schneeflocken fielen wie Federn vom Himmel herab, da sass eine Koenigin an einem Fenster, das einen Rahmen von schwarzem Ebenholz hatte, und naehte. Und wie sie so naehte und nach dem Schnee aufblickte, stach sie sich mit der Nadel in den Finger, und es fielen drei Tropfen Blut in den Schnee. Und weil das Rote im weissen Schnee so schoen aussah, dachte sie bei sich haett ich ein Kind so weiss wie Schnee, so rot wie Blut, und so schwarz wie das Holz an dem Rahmen. Bald darauf bekam sie ein Toechterlein, das war so weiss wie Schnee, so rot wie Blut, und so schwarz haarig wie Ebenholz, und ward darum das Schneewittchen genannt. Und wie das Kind geboren war, starb die Koenigin.
ueber ein Jahr nahm sich der Koenig eine andere Gemahlin. Es war eine schoene Frau, aber sie war stolz und uebermuetig, und konnte nicht leiden, dass sie an Schoenheit von jemand sollte uebertroffen werden. Sie hatte einen wunderbaren Spiegel, wenn sie vor den trat und sich darin beschaute, sprach sie:
Spieglein, Spieglein an der Wand,
wer ist die schoenste im ganzen Land?
So antwortete der Spiegel: Frau Koenigin, ihr seid die schoenste im Land. Da war sie zufrieden, denn sie wusste dass der Spiegel die Wahrheit sagte.
Schneewittchen aber wuchs heran, und wurde immer schoener, und als es sieben Jahr alt war, war es so schoen, wie der klare Tag, und schoener als die Koenigin selbst. Als diese einmal ihren Spiegel fragte:
Spieglein, Spieglein an der Wand,
wer ist die schoenste im ganzen Land?
So antwortete er: Frau Koenigin, ihr seid die schoenste hier,
aber Schneewittchen ist tausendmal schoener als ihr.
Da erschrak die Koenigin, und ward gelb und gruen vor Neid. Von Stund an, wenn sie Schneewittchen erblickte, kehrte sich ihr das Herz im Leibe herum, so hasste sie das Maedchen. Und der Neid und Hochmut wuchsen wie Unkraut in ihrem Herzen immer hoeher, dass sie Tag und Nacht keine Ruhe mehr hatte. Da rief sie einen Jaeger und sprach: Bring das Kind hinaus in den Wald, ich willst nicht mehr vor meinen Augen sehen. Du sollst es toeten, und mir Lunge und Leber zum Wahrzeichen mitbringen. Der Jaeger gehorchte und fuehrte es hinaus, und als er den Hirschfaenger gezogen hatte und Schneewittchens unschuldiges Herz durchbohren wollte, fing es an zu weinen und sprach: Ach, lieber Jaeger, lass mir mein Leben; ich will in den wilden Wald laufen und nimmer mehr wieder heim kommen. Und weil es so schoen war, hatte der Jaeger Mitleiden und sprach: So lauf hin, du armes Kind. Die wilden Tiere werden dich bald gefressen haben dachte er, und doch wars ihm als waer ein Stein von seinem Herzen gewaelzt, weil er es nicht zu toeten brauchte. Und als gerade ein junger Frischling daher gesprungen kam, stach er ihn ab, nahm Lunge und Leber heraus, und brachte sie als Wahrzeichen der Koenigin mit. Der Koch musste sie in Salz kochen, und das boshafte Weib ass sie auf und meinte sie haette Schneewittchens Lunge und Leber gegessen.
Nun war das arme Kind in dem grossen Wald mutterseelen allein, und ward ihm so angst, dass es alle Blaetter an den Baeumen ansah und nicht wusste wie es sich helfen sollte. Da fing es an zu laufen und lief ueber die spitzen Steine und durch die Dornen, und die wilden Tiere sprangen an ihm vorbei, aber sie taten ihm nichts.
Es lief so lange die Fuesse noch fort konnten, bis es bald Abend werden wollte, da sah es ein kleines Haeuschen und ging hinein sich zu ruhen. In dem Haeuschen war alles klein, aber so zierlich und reinlich, dass es nicht zu sagen ist. Da stand ein weiss gedecktes Tischlein mit sieben kleinen Tellern, jedes Tellerlein mit seinem Loeffelein, ferner sieben Messerlein und Gaebelein, und sieben Becherlein. An der Wand waren sieben Bettlein neben einander aufgestellt und schneeweisse Laken darueber gedeckt. Schneewittchen, weil es so hungrig und durstig war, ass von jedem Tellerlein ein wenig Gemues' und Brot, und trank aus jedem Becherlein einen Tropfen Wein; denn es wollte nicht einem allein alles wegnehmen. Hernach, weil es so muede war, legte es sich in ein Bettchen, aber keins passte; das eine war zu lang, das andere zu kurz, bis endlich das siebente recht war. Und darin blieb es liegen, befahl sich Gott und schlief ein.
Als es dunkel geworden war, kamen die Herren von dem Haeuslein, das waren die sieben Zwerge, die in den Bergen nach Erz hackten und gruben. Sie zuendeten ihre sieben Lichtlein an, und wie es nun hell im Haeuslein ward, sahen sie dass jemand darin gewesen war, denn es stand nicht alles so in der Ordnung, wie sie es verlassen hatten. Der erste sprach: Wer hat auf meinem Stuehlchen gesessen? Der zweite: Wer hat von meinem Tellerchen gegessen? Der dritte: Wer hat von meinem Broetchen genommen? Der vierte: Wer hat von meinem Gemueschen gegessen? Der fuenfte: Wer hat mit meinem Gaebelchen gestochen? Der sechste: Wer hat mit meinem Messerchen geschnitten?. Der siebente: Wer hat aus meinem Becherlein getrunken? Dann sah sich der erste um und sah das auf seinem Bett eine kleine Delle war, da sprach er: Wer hat in meinem Bett getreten? Die andern kamen gelaufen und riefen: In meinem Bett hat auch jemand gelegen. Der siebente aber, als er in sein Bett sah, erblickte Schneewittchen, das lag darin und schlief. Nun rief er die andern, die kamen herbei gelaufen, und schrien vor Verwunderung, holten ihre sieben Lichtlein und beleuchteten Schneewittchen. Ei, du mein Gott! ei, du mein Gott! riefen sie, was ist das Kind so schoen! und hatten so grosse Freude, dass sie es nicht aufweckten, sondern im Bettlein fort schlafen liessen. Der siebente Zwerg aber schlief bei seinen Gesellen, bei jedem eine Stunde, da war die Nacht herum.
Als es Morgen war, erwachte Schneewittchen, und wie es die sieben Zwerge sah, erschrak es. Sie waren aber freundlich und sagten: Wie heisst du? Ich heisse Schneewittchen, antwortete es. Wie bist du in unser Haus gekommen? sprachen die Zwerge. Da erzaehlte es ihnen, dass seine Stiefmutter es haette wollen umbringen lassen, der Jaeger haette ihm aber das Leben geschenkt, und da waer es gelaufen den ganzen Tag, bis es endlich ihr Haeuslein gefunden haette. Die Zwerge sprachen. Willst du unsern Haushalt versehen, kochen, betten, waschen, naehen und stricken, und willst du alles ordentlich und reinlich halten, so kannst du bei uns bleiben, und es soll dir an nichts fehlen. Ja, sagte das Schneewittchen, von Herzen gern, und blieb bei ihnen. Es hielt ihnen das Haus in Ordnung: Morgens gingen sie in die Berge und suchten Erz und Gold, Abends kamen sie wieder, und da musste ihr Essen bereit sein. Den Tag ueber war das Maedchen allein, da warnten es die guten Zwerglein und sprachen: Huete dich vor deiner Stiefmutter, die wird bald wissen, dass du hier bist; lass ja niemand herein.
Die Koenigin aber, nachdem sie Schneewittchens Lunge und Leber glaubte gegessen zu haben, dachte nicht anders als sie waere wieder die erste und aller schoenste, trat vor ihren Spiegel und sprach:
Spieglein, Spieglein an der Wand,
wer ist die schoenste im ganzen Land?
Da antwortete der Spiegel:
Frau Koenigin, ihr seid die schoenste hier,
aber Schneewittchen ueber den Bergen
bei den sieben Zwergen
ist noch tausendmal schoener als ihr.
Da erschrak sie, denn sie wusste, dass der Spiegel keine Unwahrheit sprach, und merkte dass der Jaeger sie betrogen hatte, und Schneewittchen noch am Leben war. Und da sann und sann sie aufs neue, wie sie es umbringen wollte; denn so lange sie nicht die schoenste war im ganzen Land, liess ihr der Neid keine Ruhe. Und als sie sich endlich etwas ausgedacht hatte, faerbte sie sich das Gesicht, und kleidete sich wie eine alte Kraemerin, und war ganz unkenntlich. In dieser Gestalt ging sie ueber die sieben Berge zu den sieben Zwergen, klopfte an die Tuere, und rief: Schoene Ware, feil, feil! Schneewittchen guckte zum Fenster hinaus und rief: Guten Tag, liebe Frau, was habt ihr zu verkaufen? Gute Ware, schoene Ware, antwortete sie, Schnuerriemen von allen Farben, und holte einen hervor, der aus bunter Seide geflochten war. Die ehrliche Frau kann ich herein lassen dachte Schneewittchen. Kind, sprach die Alte, wie du aussiehst! komm, ich will dich einmal ordentlich schnueren. Schneewittchen hatte kein Arg, stellte sich vor sie, und liess sich mit dem neuen Schnuerriemen schnueren: aber die Alte schnuerte geschwind, und schnuerte so fest, dass dem Schneewittchen der Atem verging, und es fuer tot hinfiel. Nun bist du die schoenste gewesen sprach sie, und eilte hinaus.
Nicht lange darauf, zur Abendzeit, kamen die sieben Zwerge nach Haus, aber wie erschraken sie, als sie ihr liebes Schneewittchen auf der Erde liegen sahen; und es regte und bewegte sich nicht, als waere es tot. Sie hoben es in die Hoehe, und weil sie sahen, dass es zu fest geschnuert war, schnitten sie den Schnuerriemen entzwei: da fing es an ein wenig zu atmen, und ward nach und nach wieder lebendig. Als die Zwerge hoerten was geschehen war, sprachen sie: Die alte Kraemerfrau war niemand als die gottlose Koenigin: huete dich und lass keinen Menschen herein, wenn wir nicht bei dir sind. Das boese Weib aber, als es nach Haus gekommen war, ging vor den Spiegel und fragte:
Spieglein, Spieglein an der Wand,
wer ist die schoenste im ganzen Land?
Da antwortete der Spiegel:
Frau Koenigin, ihr seid die schoenste hier,
aber Schneewittchen ueber den Bergen
bei den sieben Zwergen
ist noch tausendmal schoener als ihr.
Als sie das hoerte, lief ihr alles Blut zum Herzen, so erschrak sie, denn sie sah wohl dass Schneewittchen wieder lebendig geworden war. Nun aber, sprach sie, will ich etwas aussinnen, das dich zu Grunde richten soll, und mit Hexenkuensten, die sie verstand, machte sie einen giftigen Kamm. Dann verkleidete sie sich und nahm die Gestalt eines anderen alten Weibes an.
So ging sie hin ueber die sieben Berge zu den sieben Zwergen, klopfte an die Tuere, und rief: Gute Ware fei!, feil! Schneewittchen schaute heraus und sprach: Geht nur weiter, ich darf niemand hereinlassen. Das Ansehen wird dir noch erlaubt sein, sprach die Alte, zog den giftigen Kamm heraus und hielt ihn in die Hoehe. Da gefiel er dem Kinde so gut, dass es sich betoeren liess und die Tuer oeffnete. Als sie des Kaufs einig waren, sprach die Alte: Nun will ich dich einmal ordentlich kaemmen. Das arme Schneewittchen dachte an nichts, und liess die Alte gewaehren, aber kaum hatte sie den Kamm in die Haare gesteckt, als das Gift darin wirkte, und das Maedchen ohne Besinnung niederfiel. Du Ausbund von Schoenheit, sprach das boshafte Weib, jetzt ist's um dich geschehen, und ging fort. Zum Glueck aber war es bald Abend, wo die sieben Zwerglein nach Hause kamen. Als sie Schneewittchen wie tot auf der Erde liegen sahen, hatten sie gleich die Stiefmutter in Verdacht, suchten nach, und fanden den giftigen Kamm, und kaum hatte sie ihn herausgezogen, so kam Schneewittchen wieder zu sich, und erzaehlte was vorgegangen war. Da warnten sie es noch einmal auf seiner Hut zu sein und niemals die Tuere zu oeffnen.
Die Koenigin stellte sich daheim vor den Spiegel und sprach:
Spieglein, Spieglein an der Wand,
wer ist die schoenste im ganzen Land?
Da antwortete er, wie vorher:
Frau Koenigin, ihr seid die schoenste hier,
aber Schneewittchen ueber den Bergen
bei den sieben Zwergen
ist doch noch tausendmal schoener als ihr.
Als sie den Spiegel so reden hoerte, zitterte und bebte sie vor Zorn. Schneewittchen soll sterben, rief sie, und wenn es mein eigenes Leben kostet. Darauf ging sie in eine ganz verborgene einsame Kammer, wo niemand hin kam, und machte da einen giftigen, giftigen Apfel. aeusserlich sah er schoen aus, weiss mit roten Backen, dass jeder, der ihn erblickte, Lust danach bekam, aber wer ein Stueckchen davon ass, der musste sterben. Als der Apfel fertig war, faerbte sie sich das Gesicht, und verkleidete sich in eine Bauersfrau, und so ging sie ueber die sieben Berge zu den sieben Zwergen. Sie klopfte an, Schneewittchen streckte den Kopf zum Fenster heraus, und sprach. Ich darf keinen Menschen einlassen, die sieben Zwerge haben's mir verboten. Mir auch recht, antwortete die Baeuerin, meine aepfel will ich schon los werden. Da, einen will ich dir schenken. Nein, sprach Schneewittchen, ich darf nichts annehmen. Fuerchtest du dich vor Gift? sprach die Alte, siehst du, da schneide ich den Apfel in zwei Teile; den roten Backen isst du, den weissen will ich essen. Der Apfel war aber so kuenstlich gemacht, dass der rote Backen allein vergiftet war. Schneewittchen luesterte den schoenen Apfel an, und als es sah, dass die Baeuerin davon ass, so konnte es nicht laenger widerstehen, streckte die Hand hinaus und nahm die giftige Haelfte. Kaum aber hatte es einen Bissen davon in ihrem Mund, so fiel es tot zur Erde nieder. Da betrachtete es die Koenigin mit grausigen Blicken und lachte ueberlaut, und sprach: Weiss wie Schnee, rot wie Blut, schwarz wie Ebenholz diesmal koennen dich die Zwerge nicht wieder erwecken. Und als sie daheim den Spiegel befragte:
Spieglein, Spieglein an der Wand,
wer ist die schoenste im ganzen Land?
So antwortete er endlich:
Frau Koenigin, ihr seid die schoenste im Land. 
Da hatte ihr neidisches Herz Ruhe, so gut ein neidisches Herz Ruhe haben kann.
Die Zwerglein, wie sie abends nach Hause kamen, fanden Schneewittchen auf der Erde liegen, und es ging kein Atem mehr aus seinem Mund, und es war tot. Sie hoben es auf, suchten ob sie was giftiges faenden, schnuerten es auf, kaemmten ihm die Haare, wuschen es mit Wasser und Wein, aber es half alles nichts; das liebe Kind war tot und blieb tot. sie legten es auf eine Bahre und setzten sich alle siebene daran und beweinten es, und weinten drei Tage lang. Da wollten sie es begraben, aber es sah noch so frisch aus wie ein lebender Mensch, und hatte noch seine schoenen roten Backen. Sie sprachen: Das koennen wir nicht in die schwarze Erde versenken, und liessen einen durchsichtigen Sarg von Glas machen, dass man es von allen Seiten sehen konnte, legten es hinein, und schrieben mit goldenen Buchstaben seinen Namen darauf, und das es eine Koenigstochter waere. Dann setzte sie den Sarg hinaus auf den Berg, und einer von ihnen blieb immer dabei, und bewachte ihn. Und die Tiere kamen auch und beweinten Schneewittchen, erst eine Eule, dann ein Rabe, zuletzt ein Taeubchen.
Nun lag Schneewittchen lange Zeit in dem Sarg und verweste nicht, sondern sah aus als wenn es schliefe, denn es war noch so weiss als Schnee, so rot als Blut, und so schwarz haarig wie Ebenholz. Es geschah aber, dass ein Koenigssohn in den Wald geriet und zu dem Zwergenhaus kam, da zu uebernachten. Er sah auf dem Berg den Sarg, und das schoene Schneewittchen darin, und las, was mit goldenen Buchstaben darauf geschrieben war. Da sprach er zu den Zwergen: Lasst mir den Sarg, ich will euch geben, was ihr dafuer haben wollt. Aber die Zwerge antworteten: Wir geben ihn nicht, um alles Gold in der Welt. Da sprach er: So schenkt mir ihn, denn ich kann nicht leben ohne Schneewittchen zu sehen, ich will es ehren und hochachten wie mein Liebstes. Wie er so sprach, empfanden die guten Zwerglein Mitleiden mit ihm und gaben ihm den Sarg. Der Koenigssohn liess ihn nun von seinen Dienern auf den Schultern fort tragen. Da geschah es, dass sie ueber einen Strauch stolperten, und von dem Schuettern fuhr der giftige Apfelgruetz, den Schneewittchen abgebissen hatte, aus dem Hals. Und nicht lange so oeffnete es die Augen, hob den Deckel vom Sarg in die Hoehe, und richtete sich auf, und war wieder lebendig. Ach Gott, wo bin ich? rief es. Der Koenigssohn sagte voll Freude: Du bist bei mir, und erzaehlte was sich zugetragen hatte und sprach: Ich habe dich lieber als alles auf der Welt; komm mit mir in mein Vaters Schloss, du sollst meine Gemahlin werden. Da war ihm Schneewittchen gut und ging mit ihm, und ihre Hochzeit ward mit grosser Pracht und Herrlichkeit angeordnet. Zu dem Fest wurde aber auch Schneewittchens gottlose Stiefmutter eingeladen. Wie sie sich nun mit schoenen Kleidern angetan hatte, trat sie vor den Spiegel und sprach:
Spieglein, Spieglein an der Wand,
wer ist die schoenste im ganzen Land?
Der Spiegel antwortete:
Frau Koenigin, ihr seid die schoenste hier,
aber die junge Koenigin ist tausendmal schoener als ihr. 
Da stiess das boese Weib einen Fluch aus, und ward ihr so angst, so angst, dass sie sich nicht zu lassen wusste. Sie wollte zuerst gar nicht auf die Hochzeit kommen: doch liess es ihr keine Ruhe, sie musste fort und die junge Koenigin sehen. Und wie sie hinein trat, erkannte sie Schneewittchen, und vor Angst und Schrecken stand sie da und konnte sich nicht regen. Aber es waren schon eiserne Pantoffeln ueber Kohlefeuer gestellt und wurden mit Zangen herein getragen und vor sie hingestellt. Da musste sie in die rot gluehenden Schuhe treten und so lange tanzen, bis sie tot zur Erde fiel. 
`
},
{
    title: 'Gefährliches Spiel (DE)',
    content: 
`\\cGefährliches Spiel
Theodor Fontane

Gefährliches Spiel

Wir hatten in Swinemünde verschiedene Spielplätze. Der uns liebste war aber wohl der am Bollwerk, und zwar gerade da, wo die von unserem Hause abzweigende Seitenstraße einmündete. Die ganze Stelle war sehr malerisch, besonders auch im Winter, wo hier die festgelegten, ihrer Obermasten entkleideten Schiffe lagen, oft drei hintereinander, also bis ziemlich weit in den Strom hinein. Uns hier am Bollwerk herumzutummeln und auf den ausgespannten Tauen, so weit sie dicht über dem Erdboden hinliefen, unsere Seiltänzerkünste zu üben, war uns gestattet, und nur eines stand unter Verbot: Wir durften nicht auf die Schiffe gehen und am wenigsten die Strickleiter hinauf bis in den Mastkorb klettern. Ein sehr vernünftiges Verbot. Aber je vernünftiger es war, desto größer war unser Verlangen, es zu übertreten, und bei Räuber und Wandersmann, das wir alle sehr liebten, verstand sich diese Übertretung beinahe von selbst. Entdeckung lag überdies außerhalb der Wahrscheinlichkeit; die Eltern waren entweder bei ihrer Partie oder zu Tisch eingeladen. Also nur vorwärts. Und petzt einer, so kommt er noch schlimmer weg als wir.
So dachten wir auch eines Sonntags im April 1831. Es muß um diese Jahreszeit gewesen sein, weil mir noch der klare und kalte Luftstrom deutlich vor Augen steht. Auf dem Schiff war keine Spur von Leben und am Bollwerk keine Menschenseele zu sehen.
Ich, als der älteste und stärkste, war natürlich Räuber, und acht oder zehn kleinere Jungens – unter denen nur ein einziger, Fritz Ehrlich, es einigermaßen mit mir aufnehmen konnte – waren schon vom Kirchplatz her, wo wie gewöhnlich die Jagd begonnen hatte, dicht hinter mir her. Ziemlich abgejagt kam ich am Bollwerk an, und weil es hier keinen anderen Ausweg für mich gab, lief ich über eine breite und feste Bohlenlage fort auf das zunächst liegende Schiff hinauf. Die ganze Meute mir nach, was natürlich zur Folge hatte, daß ich vom ersten Schiff bald aufs zweite und vom zweiten aufs dritte mußte. Da ging es nun nicht weiter, und wenn ich mich meiner Feinde trotzdem erwehren wollte, so blieb mir nichts anderes übrig, als auf dem Schiff selbst nach einem Versteck oder wenigstens nach einer schwer zugänglichen Stelle zu suchen. Und ich fand auch so was und kletterte auf den etwa mannshohen, neben der Kajüte befindlichen Oberbau hinauf, darin sich neben anderen Räumlichkeiten gemeinhin auch die Schiffsküche zu befinden pflegte. Etliche in der steilen Wandung eingelegte Stufen erleichterten es mir. Und da stand ich nun oben, momentan geborgen, und sah als Sieger auf meine Verfolger. Aber das Siegergefühl konnte nicht lange dauern; die Stufen waren wie für mich, so auch für andre da, und in kürzester Frist stand Fritz Ehrlich ebenfalls oben. Ich war verloren, wenn ich nicht auch jetzt noch einen Ausweg fand, und mit aller Kraft und, soweit der schmale Raum es zuließ, einen Anlauf nehmend, sprang ich von dem Küchenbau her über die zwischenliegende Wasserspalte hinweg auf das zweite Schiff zurück und jagte nun, wie von allen Furien verfolgt, wieder aufs Ufer zu. Und nun hatt' ich's, und den Freiplatz vor unserm Haus zu gewinnen, war nur noch ein kleines für mich. Aber ich sollte meiner Freude darüber nicht lange froh werden, denn im selben Augenblick fast, wo ich wieder festen Boden unter meinen Füßen hatte, hörte ich auch schon von dem dritten und zweiten Schiff her ein jämmerliches Schreien und dazwischen meinen Namen, so daß ich wohl merkte, da müsse was passiert sein. Und so schnell wie ich eben über die polternde Bohlenlage ans Ufer gekommen, ebenso schnell ging es wieder über dieselbe zurück.
Es war höchste Zeit. Fritz Ehrlich hatte mir den Sprung von der Küche her nachmachen wollen und war dabei, weil er zu kurz sprang, in die zwischen dem dritten und zweiten Schiff befindliche Wasserspalte gefallen. Da steckte nun der arme Junge, mit seinen Nägeln in die Schiffsritzen hineingreifend; denn an Schwimmen, wenn er überhaupt schwimmen konnte, war nicht zu denken. Dazu das eiskalte Wasser. Ihn von oben her so ohne weiteres zu erreichen, war unmöglich, und so griff ich denn nach einem von der einen Strickleiter etwas herabhängenden Tau und ließ mich, meinen Körper durch allerlei Künste und Möglichkeiten verlängernd, an der Schiffswand so weit herab, daß Fritz Ehrlich meinen am weitesten nach unten reisenden linken Fuß gerade noch fassen konnte. Oben hielt ich mich mit der rechten Hand. Pack zu, Fritz! Aber der brave Junge, der wohl einsehen mochte, daß wir beide verloren waren, wenn er wirklich fest zupackte, beschränkte sich darauf, seine Hand leise auf meine Stiefelspitze zu legen, und so wenig dies war, so war es doch gerade genug für ihn, sich über Wasser zu halten. Er blieb in der Schwebe, bis Leute vom Ufer herankamen und ihm einen Bootshaken herunterreichten, während andere ein Boot losmachten und in den Zwischenraum hineinfuhren, um ihn da herauszufischen. Ich meinerseits war in dem Augenblick, wo der rettende Bootshaken kam, von einem mir Unbekannten von oben her am Kragen gepackt und mit einem strammen Ruck wieder auf Deck gehoben worden. Von Vorwürfen, die sonst bei solchen Gelegenheiten nicht ausbleiben, war diesmal keine Rede. Den triefenden, von Schüttelfrost gepackten Fritz Ehrlich brachten die Leute nach einem ganz in der Nähe gelegenen Hause, während wir anderen in kleinlauter Stimmung unsern Heimweg antraten. Ich freilich auch gehoben, trotzdem ich wenig Gutes von der Zukunft erwartete. – Meine Befürchtungen erfüllten sich aber nicht. Im Gegenteil.
Am andern Vormittag, als ich in die Schule wollte, stand mein Vater schon im Hausflur und hielt mich fest, denn der Nachbar Pietzker hatte wieder geplaudert. Freilich mehr denn je in guter Absicht.
Habe von der Geschichte gehört..., sagte mein Vater. Alle Wetter, daß du nicht gehorchen kannst. Aber es soll hingehen, weil du dich gut benommen hast. Weiß alles. Pietzker drüben... Und damit war ich entlassen.
Wie gern denk' ich daran zurück, nicht um mich in meiner Heldentat zu sonnen, sondern in Dank und Liebe zu meinem Vater.
`
},
{
    title: 'Nouvelle von Goethe (DE)',
    content: 
`\\cNouvelle
Johann Wolfgang von Goethe

Novelle


Ein dichter Herbstnebel verhüllte noch in der Frühe die weiten Räume des fürstlichen Schloßhofes, als man schon mehr oder weniger durch den sich lichtenden Schleier die ganze Jägerei zu Pferde und zu Fuß durcheinander bewegt sah.
Die eiligen Beschäftigungen der Nächsten ließen sich erkennen: man verlängerte, man verkürzte die Steigbügel, man reichte sich Büchse und Patrontäschchen, man schob die Dachsranzen zurecht, indes die Hunde ungeduldig am Riemen den Zurückhaltenden mit fortzuschleppen drohten.
Auch hie und da gebärdete ein Pferd sich mutiger, von feuriger Natur getrieben oder von dem Sporn des Reiters angeregt, der selbst hier in der Halbhelle eine gewisse Eitelkeit, sich zu zeigen, nicht verleugnen konnte.
Alle jedoch warteten auf den Fürsten, der, von seiner jungen Gemahlin Abschied nehmend, allzulange zauderte.
Erst vor kurzer Zeit zusammen getraut, empfanden sie schon das Glück übereinstimmender Gemüter, beide waren von tätig lebhaftem Charakter, eines nahm gern an des andern Neigungen und Bestrebungen Anteil.
Des Fürsten Vater hatte noch den Zeitpunkt erlebt und genutzt, wo es deutlich wurde, daß alle Staatsglieder in gleicher Betriebsamkeit ihre Tage zubringen, in gleichem Wirken und Schaffen jeder nach seiner Art erst gewinnen und dann genießen sollte.
Wie sehr dieses gelungen war, ließ sich in diesen Tagen gewahr werden, als eben der Hauptmarkt sich versammelte, den man gar wohl eine Masse nennen konnte.
Der Fürst hatte seine Gemahlin gestern durch das Gewimmel der aufgehäuften Waren zu Pferde geführt und sie bemerken lassen, wie gerade hier das Gebirgsland mit dem flachen Lande einen glücklichen Umtausch treffe, er wußte sie an Ort und Stelle auf die Betriebsamkeit seines Länderkreises aufmerksam zu machen.
Wenn sich nun der Fürst fast ausschließlich in diesen Tagen mit den Seinigen über diese zudringenden Gegenstände unterhielt, auch besonders mit dem Finanzminister anhaltend arbeitete, so behielt doch auch der Landjägermeister sein Recht, auf dessen Vorstellung es unmöglich war, der Versuchung zu widerstehen, an diesen günstigen Herbsttagen eine schon verschobene Jagd zu unternehmen, sich selbst und den vielen angekommenen Fremden ein eignes und seltnes Fest zu eröffnen.
Die Fürstin blieb ungern zurück, man hatte sich vorgenommen, weit in das Gebirg hineinzudringen, um die friedlichen Bewohner der dortigen Wälder durch einen unerwarteten Kriegszug zu beunruhigen.
Scheidend versäumte der Gemahl nicht, einen Spazierritt vorzuschlagen, den sie im Geleit Friedrichs, des fürstlichen Oheims, unternehmen sollte .
Auch lasse ich, sagte er, dir unsern Honorio als Stall- und Hofjunker, der für alles sorgen wird.
Und im Gefolg dieser Worte gab er im Hinabsteigen einem wohlgebildeten jungen Mann die nötigen Aufträge, verschwand sodann bald mit Gästen und Gefolge.
Die Fürstin, die ihrem Gemahl noch in den Schloßhof hinab mit dem Schnupftuch nachgewinkt hatte, begab sich in die hintern Zimmer, welche nach dem Gebirg eine freie Aussicht ließen, die um desto schöner war, als das Schloß selbst von dem Flusse herauf in einiger Höhe stand und so vor- als hinterwärts mannigfaltige bedeutende Ansichten gewährte.
Sie fand das treffliche Teleskop noch in der Stellung, wo man es gestern abend gelassen hatte, als man, über Busch, Berg und Waldgipfel die hohen Ruinen der uralten Stammburg betrachtend, sich unterhielt, die in der Abendbeleuchtung merkwürdig hervortraten, indem alsdann die größten Licht- und Schattenmassen den deutlichsten Begriff von einem so ansehnlichen Denkmal alter Zeit verleihen konnten.
Auch zeigte sich heute früh durch die annähernden Gläser recht auffallend die herbstliche Färbung jener mannigfaltigen Baumarten, die zwischen dem Gemäuer ungehindert und ungestört durch lange Jahre emporstrebten.
Die schöne Dame richtete jedoch das Fernrohr etwas tiefer nach einer öden, steinigen Fläche, über welche der Jagdzug weggehen mußte.
Sie erharrte den Augenblick mit Geduld und betrog sich nicht, denn bei der Klarheit und Vergrößerungsfähigkeit des Instruments erkannten ihre glänzenden Augen deutlich den Fürsten und den Oberstallmeister, ja sie enthielt sich nicht, abermals mit dem Schnupftuche zu winken, als sie ein augenblickliches Stillhalten und Rückblicken mehr vermutete als gewahr ward.
Fürst Oheim, Friedrich mit Namen, trat sodann, angemeldet, mit seinem Zeichner herein, der ein großes Portefeuille unter dem Arm trug.
Liebe Cousine, sagte der alte, rüstige Herr, hier legen wir die Ansichten der Stammburg vor, gezeichnet, um von verschiedenen Seiten anschaulich zu machen, wie der mächtige Trutz- und Schutzbau von alten Zeiten her dem Jahr und seiner Witterung sich entgegenstemmte und wie doch hie und da sein Gemäuer weichen, da und dort in wüste Ruinen zusammenstürzen mußte.
Nun haben wir manches getan, um diese Wildnis zugänglicher zu machen, denn mehr bedarf es nicht, um jeden Wanderer, jeden Besuchenden in Erstaunen zu setzen, zu entzücken.
Indem nun der Fürst die einzelnen Blätter deutete, sprach er weiter: hier, wo man, den Hohlweg durch die äußern Ringmauern heraufkommend, vor die eigentliche Burg gelangt, steigt uns ein Felsen entgegen von den festesten des ganzen Gebirgs, hierauf nun steht gemauert ein Turm, doch niemand wüßte zu sagen, wo die Natur aufhört, Kunst und Handwerk aber anfangen.
Ferner sieht man seitwärts Mauern angeschlossen und Zwinger terrassenmäßig herab sich erstreckend.
Doch ich sage nicht recht, denn es ist eigentlich ein Wald, der diesen uralten Gipfel umgibt.
Seit hundertundfunfzig Jahren hat keine Axt hier geklungen, und überall sind die mächtigsten Stämme emporgewachsen.
Wo Ihr Euch an den Mauern andrängt, stellt sich der glatte Ahorn, die rauhe Eiche, die schlanke Fichte mit Schaft und Wurzeln entgegen, um diese müssen wir uns herumschlängeln und unsere Fußpfade verständig führen.
Seht nur, wie trefflich unser Meister dies Charakteristische auf dem Papier ausgedrückt hat, wie kenntlich die verschiedenen Stamm- und Wurzelarten zwischen das Mauerwerk verflochten und die mächtigen Äste durch die Lücken durchgeschlungen sind .
Es ist eine Wildnis wie keine, ein zufällig einziges Lokal, wo die alten Spuren längst verschwundener Menschenkraft mit der ewig lebenden und fortwirkenden Natur sich in dem ernstesten Streit erblicken lassen.
Ein anderes Blatt aber vorlegend, fuhr er fort: was sagt Ihr nun zum Schloßhofe, der, durch das Zusammenstürzen des alten Torturmes unzugänglich, seit und undenklichen Jahren von niemand betreten ward?
Wir suchten ihm von der Seite beizukommen, haben Mauern durchbrochen, Gewölbe gesprengt und so einen bequemen, aber geheimen Weg bereitet.
Inwendig bedurft es keines Aufräumens, hier findet sich ein flacher Felsgipfel von der Natur geplättet, aber doch haben mächtige Bäume hie und da zu wurzeln Glück und Gelegenheit gefunden, sie sind sachte, aber entschieden aufgewachsen, nun erstrecken sie ihre Äste bis in die Galerien hinein, auf denen der Ritter sonst auf und ab schritt, ja durch Türen durch und Fenster in die gewölbten Säle, aus denen wir sie nicht vertreiben wollen, sie sind eben Herr geworden und mögens bleiben.
Tiefe Blätterschichten wegräumend, haben wir den merkwürdigsten Platz geebnet gefunden, dessengleichen in der Welt vielleicht nicht wieder zu sehen ist.
Nach allem diesem aber ist es immer noch bemerkenswert und an Ort und Stelle zu beschauen, daß auf den Stufen, die in den Hauptturm hinaufführen, ein Ahorn Wurzel geschlagen und sich zu einem so tüchtigen Baume gebildet hat, daß man nur mit Not daran vorbeidringen kann, um die Zinne, der unbegrenzten Aussicht wegen, zu besteigen.
Aber auch hier verweilt man bequem im Schatten, denn dieser Baum ist es, der sich über das Ganze wunderbar hoch in die Luft hebt.
Danken wir also dem wackern Künstler, der uns so löblich in verschiedenen Bildern von allem überzeugt, als wenn wir gegenwärtig wären, er hat die schönsten Stunden des Tages und der Jahrszeit dazu angewendet und sich wochenlang um diese Gegenstände herumbewegt.
In dieser Ecke ist für ihn und den Wächter, den wir ihm zugegeben, eine kleine, angenehme Wohnung eingerichtet.
Sie sollten nicht glauben, meine Beste, welch eine schöne Aus- und Ansicht er ins Land, in Hof und Gemäuer sich dort bereitet hat. Nun aber, da alles so rein und charakteristisch umrissen ist, wird er es hier unten mit Bequemlichkeit ausführen.
wir wollen mit diesen Bildern unsern Gartensaal zieren, und niemand soll über unsere regelmäßigen Parterre, Lauben und schattigen Gänge seine Augen spielen lassen, der nicht wünschte, dort oben in dem wirklichen Anschauen des Alten und Neuen, des Starren, Unnachgiebigen, Unzerstörlichen und des Frischen, Schmiegsamen, Unwiderstehlichen seine Betrachtungen anzustellen.
Honorio trat ein und meldete, die Pferde seien vorgeführt, da sagte die Fürstin, zum Oheim gewendet: reiten wir hinauf, und lassen Sie mich in der Wirklichkeit sehen, was Sie mir hier im Bilde zeigten .
Seit ich hier bin, hör ich von diesem Unternehmen und werde jetzt erst recht verlangend, mit Augen zu sehen, was mir in der Erzählung unmöglich schien und in der Nachbildung unwahrscheinlich bleibt.
- Noch nicht, meine Liebe, versetzte der Fürst, was Sie hier sahen, ist, was es werden kann und wird, jetzt stockt noch manches, die Kunst muß erst vollenden, wenn sie sich vor der Natur nicht schämen soll.
- Und so reiten wir wenigstens hinaufwärts, und wär es nur bis an den Fuß, ich habe große Lust, mich heute weit in der Welt umzusehen.
- Ganz nach Ihrem Willen, versetzte der Fürst.
- Lassen Sie uns aber durch die Stadt reiten, fuhr die Dame fort, über den großen Marktplatz, wo eine zahllose Menge von Buden die Gestalt einer kleinen Stadt, eines Feldlagers angenommen hat.
Es ist, als wären die Bedürfnisse und Beschäftigungen sämtlicher Familien des Landes umher nach außen gekehrt, in diesem Mittelpunkt versammelt, an das Tageslicht gebracht worden, denn hier sieht der aufmerksame Beobachter alles, was der Mensch leistet und bedarf, man bildet sich einen Augenblick ein, es sei kein Geld nötig, jedes Geschäft könne hier durch Tausch abgetan werden, und so ist auch im Grunde.
Seitdem der Fürst gestern mir Anlaß zu diesem Übersichten gegeben, ist es mir gar angenehm zu denken, wie hier, wo Gebirg und flaches Land aneinandergrenzen, beide so deutlich aussprechen, was sie brauchen und was sie wünschen.
Wie nun der Hochländer das Holz seiner Wälder in hundert Formen umzubilden weiß, das Eisen zu einem jeden Gebrauch zu vermannigfaltigen, so kommen jene drüben mit den vielfältigsten Waren ihm entgegen, an denen man den Stoff kaum unterscheiden und den Zweck oft nicht erkennen mag.
Ich weiß, versetzte der Fürst, daß mein Neffe hierauf die größte Aufmerksamkeit wendet, denn gerade zu dieser Jahrszeit kommt es hauptsächlich darauf an, daß man mehr empfange als gebe, dies zu bewirken, ist am Ende die Summe des ganzen Staatshaushaltes so wie der kleinsten häuslichen Wirtschaft.
Verzeihen Sie aber, meine Beste, ich reite niemals gern durch den Markt und Messe, bei jedem Schritt ist man gehindert und aufgehalten, und dann flammt mir das ungeheure Unglück wieder in die Einbildungskraft, das sich mir gleichsam in die Augen eingebrannt, als ich eine solche Güter- und Warenbreite in Feuer aufgehen sah.
Ich hatte mich kaum -.
Lassen Sie uns die schönen Stunden nicht versäumen. fiel ihm die Fürstin ein, da der würdige Mann sie schon einigemal mit ausführlicher Beschreibung jenes Unheils geängstigt hatte, wie er sich nämlich, auf einer großen Reise begriffen, abends im besten Wirtshause auf dem Markte, der eben von einer Hauptmesse wimmelte, höchst ermüdet zu Bette gelegt und nachts durch Geschrei und Flammen, die sich gegen seine Wohnung wälzten, gräßlich aufgeweckt worden.
Die Fürstin eilte, das Lieblingspferd zu besteigen, und führte, statt zum Hintertore bergauf, zum Vordertore bergunter ihren widerwillig bereiten Begleiter, denn wer wäre nicht gern an ihrer Seite geritten, wer wäre ihr nicht gern gefolgt .
Und so war auch Honorio von der sonst so ersehnten Jagd willig zurückgeblieben, um ihr ausschließlich dienstbar zu sein.
Wie vorauszusehen, durften sie auf dem Markte nur Schritt vor Schritt reiten, aber die schöne Liebenswürdige erheiterte jeden Aufenthalt durch eine geistreiche Bemerkung.
Ich wiederhole, sagte sie, meine gestrige Lektion, da denn doch die Notwendigkeit unsere Geduld prüfen will.
Und wirklich drängte sich die ganze Menschenmasse dergestalt an die Reitenden heran, daß sie ihren Weg nur langsam fortsetzen konnten. Das Volk schaute mit Freuden die junge Dame, und auf so viel lächelnden Gesichtern zeigte sich das entschiedene Behagen, zu sehen, daß die erste Frau im Lande auch die schönste und anmutigste sei.
Untereinander gemischt standen Bergbewohner, die zwischen Felsen, Fichten und Föhren ihre stillen Wohnsitze hegten, Flachländer von Hügeln, Auen und Wiesen her, Gewerbsleute der kleinen Städte, und was sich alles versammelt hatte.
Nach einem ruhigen Überblick bemerkte die Fürstin ihrem Begleiter, wie alle diese, woher sie auch seien, mehr Stoff als nötig zu ihren Kleidern genommen, mehr Tuch und Leinwand, mehr Band zum Besatz.
Ist es doch, als ob die Weiber nicht brauschig und die Männer nicht pausig genug sich gefallen könnten.
Wir wollen ihnen das ja lassen, versetzte der Oheim, wo auch der Mensch seinen Überfluß hinwendet, ihm ist wohl dabei, am wohlsten, wenn er sich damit schmückt und aufputzt.
Die schöne Dame winkte Beifall.
So waren sie nach und nach auf einen freiern Platz gelangt, der zur Vorstadt hinführte, wo am Ende vieler kleiner Buden und Kramstände ein größeres Brettergebäude in die Augen fiel, das sie kaum erblickten, als ein ohrzerreißendes Gebrülle ihnen entgegentönte.
Die Fütterungsstunde der dort zur Schau stehenden wilden Tiere schien herangekommen, der Löwe ließ seine Wald- und Wüstenstimme aufs kräftigste hören, die Pferde schauderten, und man konnte der Bemerkung nicht entgehen, wie in dem friedlichen Wesen und Wirken der gebildeten Welt der König der Einöde sich so furchtbar verkündige.
Zur Bude näher gelangt, durften sie die bunten, kolossalen Gemälde nicht übersehen, die mit heftigen Farben und kräftigen Bildern jene fremden Tiere darstellten, welche der friedliche Staatsbürger zu schauen unüberwindliche Lust empfinden sollte.
Der grimmig ungeheure Tiger sprang auf einen Mohren los, im Begriff ihn zu zerreißen, ein Löwe stand ernsthaft majestätisch, als wenn er keine Beute seiner würdig vor sich sähe, andere wunderliche, bunte Geschöpfe verdienten neben diesen mächtigen weniger Aufmerksamkeit.
Wir wollen, sagte die Fürstin, bei unserer Rückkehr absteigen und die seltenen Gäste näher betrachten. - Es ist wunderbar, versetzte der Fürst, daß der Mensch durch Schreckliches immer aufgeregt sein will.
Drinnen liegt der Tiger ganz ruhig in seinem Kerker, und hier muß er grimmig auf einen Mohren losfahren, damit man glaube, dergleichen inwendig ebenfalls zu sehen, es ist an Mord und Totschlag noch nicht genug, an Brand und Untergang: die Bänkelsänger müssen es an jeder Ecke wiederholen.
Die guten Menschen wollen eingeschüchtert sein, um hinterdrein erst recht zu fühlen, wie schön und löblich es sei, frei Atem zu holen.
Was denn aber auch Bängliches von solchen Schreckensbildern mochte übriggeblieben sein, alles und jedes war sogleich ausgelöscht, als man, zum Tore hinausgelangt, in die heiterste Gegend eintrat.
Der Weg führte zuerst am Flusse hinan, an einem zwar noch schmalen, nur leichte Kähne tragenden Wasser, das aber nach und nach als größter Strom seinen Namen behalten und ferne Länder beleben sollte.
Dann ging es weiter durch wohlversorgte Frucht- und Lustgärten sachte hinaufwärts, und man sah sich nach und nach in der aufgetanen, wohlbewohnten Gegend um, bis erst ein Busch, sodann ein Wäldchen die Gesellschaft aufnahm und die anmutigsten Örtlichkeiten ihren Blick begrenzten und erquickten.
Ein aufwärts leitendes Wiesental, erst vor kurzem zum zweiten Male gemäht, sammetähnlich anzusehen, von einer oberwärts lebhaft auf einmal reich entspringenden Quelle gewässert, empfing sie freundlich, und so zogen sie einem höheren, freieren Standpunkt entgegen, den sie, aus dem Walde sich bewegend, nach einem lebhaften Stieg erreichten, alsdann aber vor sich noch in bedeutender Entfernung über neuen Baumgruppen das alte Schloß, den Zielpunkt ihrer Wallfahrt, als Fels- und Waldgipfel hervorragen sahen.
Rückwärts aber - denn niemals gelangte man hierher, ohne sich umzukehren - erblickten sie durch zufällige Lücken der hohen Bäume das fürstliche Schloß links, von der Morgensonne beleuchtet, den wohlgebauten höhern Teil der Stadt, von leichten Rauchwolken gedämpft, und so fort nach der Rechten zu die untere Stadt, den Fluß in einigen Krümmungen mit seinen Wiesen und Mühlen, gegenüber eine weite nahrhafte Gegend.
nachdem sie sich an dem Anblick ersättigt oder vielmehr, wie es uns bei dem Umblick auf so hoher Stelle zu geschehen pflegt, erst recht verlangend geworden nach einer weitern, weniger begrenzten Aussicht, ritten sie eine steinige, breite Fläche hinan, wo ihnen die mächtige Ruine als ein grüngekrönter Gipfel entgegenstand, wenig alte Bäume tief unten um seinen Fuß, sie ritten hindurch, und so fanden sie sich gerade vor der steilsten, unzugänglichsten Seite.
Mächtige Felsen standen von Urzeiten her, jedem Wechsel unangetastet, fest, wohlgegründet voran, und so türmte sichs aufwärts, das sazwischen Herabgestürzte lag in mächtigen Platten und Trümmern unregelmäßig übereinander und schien dem Kühnsten jeden Angriff zu verbieten.
Aber das Steile, Jähe scheint der Jugend zuzusagen, dies zu unternehmen, zu erstürmen, zu erobern, ist jungen Gliedern ein Genuß.
Die Fürstin bezeigte Neigung zu einem Versuch, Honorio war bei der Hand, der fürstliche Oheim, wenn schon bequemer, ließ sichs gefallen und wollte sich doch auch nicht unkräftig zeigen, die Pferde sollten am Fuß unter den Bäumen halten, und man wollte bis zu einem gewissen Punkte gelangen, wo ein vorstehender mächtiger Fels einen Flächenraum darbot, von wo man eine Aussicht hatte, die zwar schon in den Blick des Vogels überging, aber sich doch noch malerisch genug hintereinander schob.
Die Sonne, beinahe auf ihrer höchsten Stelle, verlieh die klarste Beleuchtung, das fürstliche Schloß mit seinen Teilen, Hauptgebäuden, Flügeln, Kuppeln und Türmen erschien gar stattlich, die obere Stadt in ihrer völligen Ausdehnung, auch in die untere konnte man bequem hineinsehen, ja durch das Fernrohr auf dem Markte sogar die Buden unterscheiden.
Honorio war immer gewohnt, ein so förderliches Werkzeug überzuschnallen, man schaute den Fluß hinauf und hinab, diesseits das bergartig terrassenweis unterbrochene, jenseits das aufgleitende flache und in mäßigen Hügeln abwechselnde fruchtbare Land, Ortschaften unzählige, denn es war längst herkömmlich, über die Zahl zu streiten, wieviel man deren von hier oben gewahr werde.
Über die große Weite lag eine heitere Stille, wie es am Mittag zu sein pflegt, wo die Alten sagten, Pan schlafe und alle Natur halte den Atem an, um ihn nicht aufzuwecken.
Es ist nicht das erstemal, sagte die Fürstin, daß ich auf so hoher, weitumschauender Stelle die Betrachtung machte, wie doch die klare Natur so reinlich und friedlich aussieht und den Eindruck verleiht, als wenn gar nichts Widerwärtiges in der Welt sein könne, und wenn man denn wieder in die Menschenwohnung zurückkehrt, sie sei hoch oder niedrig, weit oder eng, so gibts immer etwas zu kämpfen, zu streiten, zu schlichten und zurechtzulegen.
Honorio, der indessen durch das Sehrohr nach der Stadt geschaut hatte, rief: seht hin. Seht hin. Auf dem Markte fängt es an zu brennen.. Sie sahen hin und bemerkten wenigen Rauch, die Flamme dämpfte der Tag.
Das Feuer greift weiter um sich. rief man, immer durch die Gläser schauend, auch wurde das Unheil den guten, unbewaffneten Augen der Fürstin bemerklich.
Von Zeit zu Zeit erkannte man eine rote Flammenglut, der Dampf stieg empor, und Fürst Oheim sprach: laßt uns zurückkehren. Das ist nicht gut . Ich fürchtete immer, das Unglück zum zweiten Male zu erleben.
Als sie, herabgekommen, den Pferden wieder zugingen, sagte die Fürstin zu dem alten Herrn: reiten Sie hinein, eilig, aber nicht ohne den Reitknecht. Lassen Sie mir Honorio. Wir folgen sogleich.
Der Oheim fühlte das Vernünftige, ja das Notwendige dieser Worte und ritt, so eilig als der Boden erlaubte, den wüsten, steinigen Hang hinunter.
Als die Fürstin aufsaß, sagte Honorio: reiten Euer Durchlaucht, ich bitte, langsam .
In der Stadt wie auf dem Schloß sind die Feueranstalten in bester Ordnung, man wird sich durch einen so unerwartet außerordentlichen Fall nicht irre machen lassen.
Hier aber ist ein böser Boden, kleine Steine und kurzes Gras, schnelles Reiten ist unsicher, ohnehin, bis wir hineinkommen, wird das Feuer schon nieder sein.
Die Fürstin glaube nicht daran, sie sah den Rauch sich verbreiten, sie glaubte einen aufflammenden Blitz gesehen, einen Schlag gehört zu haben, und nun bewegten sich in ihrer Einbildungskraft alle die Schreckbilder, welche des trefflichen Oheims wiederholte Erzählung von dem erlebten Jahrmarktsbrande leider nur zu tief eingesenkt hatte.
Fürchterlich wohl war jener Fall, überraschend und eindringlich genug, um zeitlebens eine Ahnung und Vorstellung wiederkehrenden Unglücks ängstlich zurückzulassen, als zur Nachtzeit auf dem großen, budenreichen Marktraum ein plötzlicher Brand Laden auf Laden ergriffen hatte, ehe noch die in und an diesen leichten Hütten Schlafenden aus tiefen Träumen geschüttelt wurden, der Fürst selbst als ein ermüdet angelangter, erst eingeschlafener Fremder ans Fenster sprang, alles fürchterlich erleuchtet sah, Flamme nach Flamme, rechts und links sich überspringend, ihm entgegenzüngelte.
Die Häuser des Marktes, vom Widerschein gerötet, schienen schon zu glühen, drohend sich jeden Augenblick zu entzünden und in Flammen aufzuschlagen, unten wütete das Element unaufhaltsam, die Bretter prasselten, die Latten knackten, Leinwand flog auf, und ihre düstern, an den Enden flammend ausgezackten Fetzen trieben in der Höhe sich umher, als wenn die bösen Geister in ihrem Elemente, um und um gestaltet, sich mutwillig tanzend verzehren und da und dort aus den Gluten wieder auftauchen wollten.
Dann aber mit kreischendem Geheul rettete jeder, was zur Hand lag, Diener und Knechte mit den Herren bemühten sich, von Flammen ergriffene Ballen fortzuschleppen, von dem brennenden Gestell noch einiges wegzureißen, um es in die Kiste zu packen, die sie denn doch zuletzt den eilenden Flammen zum Raube lassen mußten.
Wie mancher wünschte nur einen Augenblick Stillstand dem heranprasselnden Feuer, nach der Möglichkeit einer Besinnung sich umsehend, und er war mit aller seiner Habe schon ergriffen, an der einen Seite brannte, glühte schon, was an der andern noch in finsterer Nacht stand.
Hartnäckige Charaktere, willensstarke Menschen widersetzten sich grimmig dem grimmigen Feinde und retteten manches mit Verlust ihrer Augenbraunen und Haare.
Leider nun erneuerte sich vor dem schönen Geiste der Fürstin der wüste Wirrwarr, nun schien der heitere morgendliche Gesichtskreis umnebelt, ihre Augen verdüstert, Wald und Wiese hatten einen wunderbaren, bänglichen Anschein.
In das friedliche Tal einreitend, seiner labenden Kühle nicht achtend, waren sie kaum einige Schritte von der lebhaften Quelle des nahen fließenden Baches herab, als die Fürstin ganz unten im Gebüsche des Wiesentals etwas Seltsames erblickte, das sie alsobald für den Tiger erkannte, heranspringend, wie sie ihn vor kurzem gemalt gesehen, kam er entgegen, und dieses Bild zu den furchtbaren Bildern, die sie soeben beschäftigten, machte den wundersamsten Eindruck.
Flieht. Gnädige Frau, rief Honorio, flieht.. Sie wandte das Pferd um, dem steilen Berg zu, wo sie herabgekommen waren.
Der Jüngling aber, dem Untier entgegen, zog die Pistole und schoß, als er sich nahe genug glaubte.
Leider jedoch war gefehlt, der Tiger sprang seitwärts, das Pferd stutzte, das ergrimmte Tier aber verfolgte seinen Weg aufwärts, unmittelbar der Fürstin nach.
Sie sprengte, was das Pferd vermochte, die steile, steinige Strecke hinan, kaum fürchtend, daß ein zartes Geschöpf, solcher Anstrengung ungewohnt, sie nicht aushalten werde.
Es übernahm sich, von der bedrängten Reiterin angeregt, stieß am kleinen Gerölle des Hanges an und wieder an und stürzte zuletzt nach heftigem Bestreben kraftlos zu Boden.
Die schöne Dame, entschlossen und gewandt, verfehlte nicht, sich strack auf ihre Füße zu stellen, auch das Pferd richtete sich auf, aber der Tiger nahte schon, obgleich nicht mit heftiger Schnelle, der ungleiche Boden, die scharfen Steine schienen seinen Antrieb zu hindern, und nur daß Honorio unmittelbar hinter ihm herflog, neben ihm gemäßigt heraufritt, schien seine Kraft aufs neue anzuspornen und zu reizen.
Beide Renner erreichten zugleich den Ort, wo die Fürstin am Pferde stand, der Ritter beugte sich herab, schoß und traf mit der zweiten Pistole das Ungeheuer durch den Kopf, daß es sogleich niederstürzte und ausgestreckt in seiner Länge erst recht die Macht und Furchtbarkeit sehen ließ, von der nur noch das Körperliche übriggeblieben dalag.
Honorio war vom Pferde gesprungen und kniete schon auf dem Tiere, dämpfte seine letzten Bewegungen und hielt den gezogenen Hirschfänger in der rechten Hand.
Der Jüngling war schön, er war herangesprengt, wie ihn die Fürstin oft im Lanzen- und Ringelspiel gesehen hatte.
Ebenso traf in der Reitbahn seine Kugel im Vorbeisprengen den Türkenkopf auf dem Pfahl gerade unter dem Turban in die Stirne, ebenso spießte er, flüchtig heransprengend, mit dem blanken Säbel das Mohrenhaupt vom Boden auf.
In allen solchen Künsten war er gewandt und glücklich, hier kam beides zustatten.
Gebt ihm den Rest, sagte die Fürstin, ich fürchte, er beschädigt Euch noch mit den Krallen.
- Verzeiht. erwiderte der Jüngling, er ist schon tot genug, und ich mag das Fell nicht verderben, das nächsten Winter auf Eurem Schlitten glänzen soll.
- Frevelt nicht. sagte die Fürstin, alles, was von Frömmigkeit im tiefen Herzen wohnt, entfaltet sich in solchem Augenblick.
- Auch ich, rief Honorio, war nie frömmer als jetzt eben, deshalb aber denk ich ans Freudigste, ich blicke dieses Fell nur an, wie es Euch zur Lust begleiten kann.
- Es würde mich immer an diesen schrecklichen Augenblick erinnern, versetzte sie.
Ist es doch, erwiderte der Jüngling mit glühender Wange, ein unschuldigeres Triumphzeichen, als wenn die Waffen erschlagener Feinde vor dem Sieger her zur Schau getragen wurden.
- Ich werde mich an Eure Kühnheit und Gewandtheit dabei erinnern und darf nicht hinzusetzen, daß Ihr auf meinen Dank und auf die Gnade des Fürsten lebenslänglich rechnen könnt.
Aber steht auf .
Schon ist kein Leben mehr im Tiere.
Bedenken wir das Weitere .
Vor allen Dingen steht auf. - Da ich nun einmal kniee, versetzte der Jüngling, da ich mich in einer Stellung befinde, die mir auf jede andere Weise untersagt wäre, so laßt mich bitten, von der Gunst und von der Gnade, die Ihr mir zuwendet, in diesem Augenblick versichert zu werden.
Ich habe schon so oft Euren hohen Gemahl gebeten um Urlaub und Vergünstigung einer weitern Reise.
Wer das Glück hat, an Eurer Tafel zu sitzen, wen Ihr beehrt, Eure Gesellschaft unterhalten zu dürfen, der muß die Welt gesehen haben. Reisende strömen von allen Orten her, und wenn von einer Stadt, von einem wichtigen Punkte irgendeines Weltteils gesprochen wird, ergeht an den Eurigen jedesmal die Frage, ob er daselbst gewesen sei.
Niemanden traut man Verstand zu, als wer das alles gesehen hat, es ist, als wenn man sich nur für andere zu unterrichten hätte.
Steht auf. wiederholte die Fürstin, ich möchte nicht gern gegen die Überzeugung meines Gemahls irgend etwas wünschen und bitten, allein wenn ich nicht irre, so ist die Ursache, warum er Euch bisher zurückhielt, bald gehoben.
Seine Absicht war, Euch zum selbständigen Edelmann herangereift zu sehen, der sich und ihm auch auswärts Ehre machte wie bisher am Hofe, und ich dächte, Eure Tat wäre ein so empfehlender Reisepaß, als ein junger Mann nur in die Welt mitnehmen kann.
Daß anstatt einer jugendlichen Freude eine gewisse Trauer über sein Gesicht zog, hatte die Fürstin nicht Zeit zu bemerken, noch er seiner Empfindung Raum zu geben, denn hastig den Berg herauf, einen Knaben an der Hand, kam eine Frau geradezu auf die Gruppe los, die wir kennen, und kaum war Honorio, sich besinnend, aufgestanden, als sie sich heulend und schreiend über den Leichnam herwarf und an dieser Handlung sowie an einer obgleich reinlich anständigen, doch bunten und seltsamen Kleidung sogleich erraten ließ, sie sei die Meisterin und Wärterin dieses dahingestreckten Geschöpfes, wie denn der schwarzaugige, schwarzlockige Knabe, der eine Flöte in der Hand hielt, gleich der Mutter weinend, weniger heftig, aber tief gerührt neben ihr kniete.
Den gewaltsamen Ausbrüchen der Leidenschaft dieses unglücklichen Weibes folgte, zwar unterbrochen, stoßweise ein Strom von Worten, wie ein Bach sich in Absätzen von Felsen zu Felsen stürzt.
Eine natürliche Sprache, kurz und abgebrochen, machte sich eindringlich und rührend.
Vergebens würde man sie in unsern Mundarten übersetzen wollen, den ungefähren Inhalt dürfen wir nicht verfehlen: sie haben dich ermordet, armes Tier.
Ermordet ohne Not.
Du warst zahm und hättest dich gern ruhig niedergelassen und auf uns gewartet, denn deine Fußballen schmerzten dich, und deine Krallen hatten keine Kraft mehr.
Die heiße Sonne fehlte dir, sie zu reifen.
Du warst der Schönste deinesgleichen, wer hat je einen königlichen Tiger so herrlich ausgestreckt im Schlaf gesehen, wie du nun hier liegst, tot, um nicht wieder aufzustehen.
Wenn du des Morgens aufwachtest beim frühen Tagschein und den Rachen aufsperrtest, ausstreckend die rote Zunge, so schienst du uns zu lächeln, und wenn schon brüllend, nahmst du doch spielend dein Futter aus den Händen einer Frau, von den Fingern eines Kindes.
Wie lange begleiteten wir dich auf deinen Fahrten, wie lange war deine Gesellschaft uns wichtig und fruchtbar.
Uns, uns ganz eigentlich kam die Speise von den Fressern und süße Labung von den Starken.
So wird es nicht mehr sein.
Wehe.
Wehe. Sie hatte nicht ausgeklagt, als über die mittlere Höhe des Bergs am Schlosse herab Reiter heransprengten, die alsobald für das Jagdgefolge des Fürsten erkannt wurden, er selbst voran.
Sie hatten, in den hintern Gebirgen jagend, die Brandwolken aufsteigen sehen und durch Täler und Schluchten, wie auf gewaltsam hetzender Jagd, den geraden Weg nach diesem traurigen Zeichen genommen.
Über die steinige Blöße einhersprengend, stutzten und starrten sie, nun die unerwartete Gruppe gewahr werdend, die sich auf der leeren Fläche merkwürdig auszeichnete.
Nach dem ersten Erkennen verstummte man, und nach einigem Erholen ward, was der Anblick nicht selbst ergab, mit wenigen Worten erläutert.
So stand der Fürst vor dem seltsamen, unerhörten Ereignis, einen Kreis umher von Reitern und Nacheilenden zu Fuße.
Unschlüssig war man nicht, was zu tun sei, anzuordnen, auszuführen war der Fürst beschäftigt, als ein Mann sich in den Kreis drängte, groß von Gestalt, bunt und wunderlich gekleidet wie Frau und Kind.
Und nun gab die Familie zusammen Schmerz und Überraschung zu erkennen.
Der Mann aber, gefaßt, stand in ehrfurchtsvoller Entfernung vor dem Fürsten und sagte: es ist nicht Klagenszeit, ach, mein Herr und mächtiger Jäger, auch der Löwe ist los, auch hier nach dem Gebirg ist er hin, aber schont ihn, habt Barmherzigkeit, daß er nicht umkomme wie dies gute Tier.
Der Löwe ? sagte der Fürst,hast du seine Spur?
Ja, Herr. Ein Bauer dort unten, der sich ohne Not auf einen Baum gerettet hatte, wies mich weiter hier links hinauf, aber ich sah den großen Trupp Menschen und Pferde vor mir, neugierig und hilfsbedürftig eilt ich hierher.
- Also, beorderte der Fürst, muß die Jagd sich auf diese Seite ziehen, ihr ladet eure Gewehre, geht sachte zu Werk, es ist kein Unglück, wenn ihr ihn in die tiefen Wälder treibt.
- Aber am Ende, guter Mann, werden wir euer Geschöpf nicht schonen können, warum wart ihr unvorsichtig genug, sie entkommen zu lassen. - Das Feuer brach aus, versetzte jener, wir hielten uns still und gespannt, es verbreitete sich schnell, aber fern von uns.
Wir hatten Wasser genug zu unserer Verteidigung, aber ein Pulverschlag flog auf und warf die Brände bis an uns heran, über uns weg , wir übereilten uns und sind nun unglückliche Leute.
Noch war der Fürst mit Anordnungen beschäftigt, aber einen Augenblick schien alles zu stocken, als oben vom alten Schloß herab eilig ein Mann heranspringend gesehen ward, den man bald für den angestellten Wächter erkannte, der die Werkstätte des Malers bewachte, indem er darin seine Wohnung nahm und die Arbeiter beaufsichtigte.
Er kam außer Atem springend, doch hatte er bald mit wenigen Worten angezeigt: oben hinter der höhern Ringmauer habe sich der Löwe im Sonnenschein gelagert, am Fuße einer hundertjährigen Buche, und verhalte sich ganz ruhig.
Ärgerlich aber schloß der Mann: warum habe ich gestern meine Büchse in die Stadt getragen, um sie ausputzen zu lassen.
Hätte ich sie bei der Hand gehabt, er wäre nicht wieder aufgestanden, das Fell wäre doch mein gewesen, und ich hätte mich dessen, wie billig, zeitlebens gebrüstet.
Der Fürst, dem seine militärischen Erfahrungen auch hier zustatten kamen, da er sich wohl schon in Fällen gefunden hatte, wo von mehreren Seiten unvermeidliches Übel herandrohte, sagte hierauf: welche Bürgschaft gebt Ihr mir, daß, wenn wir Eures Löwen schonen, er nicht im Lande unter den Meinigen Verderben anrichtet?
Hier diese Frau und dieses Kind, erwiderte der Vater hastig, erbieten sich, ihn zu zähmen, ihn ruhig zu erhalten, bis ich den beschlagenen Kasten heraufschaffe, da wir ihn denn unschädlich und unbeschädigt wieder zurückbringen werden.
Der Knabe schien seine Flöte versuchen zu wollen, ein Instrument von der Art, das man sonst die sanfte, süße Flöte zu nennen pflegte, sie war kurz geschnäbelt wie die Pfeifen, wer es verstand, wußte die anmutigsten Töne daraus hervorzulocken.
Indes hatte der Fürst den Wärtel gefragt, wie der Löwe hinaufgekommen.
Dieser aber versetzte: durch den Hohlweg, der, auf beiden Seiten vermauert, von jeher der einzige Zugang war und der einzige bleiben soll, zwei Fußpfade, die noch hinaufführten, haben wir dergestalt entstellt, daß niemand als durch jenen ersten engen Anweg zu dem Zauberschlosse gelangen könne, wozu es Fürst Friedrichs Geist und Geschmack ausbilden will.
Nach einigem Nachdenken, wobei sich der Fürst nach dem Kinde umsah, das immer sanft gleichsam zu präludieren fortgefahren hatte, wendete er sich zu Honorio und sagte: du hast heute viel geleistet, vollende das Tagwerk.
Besetze den schmalen Weg.
- Haltet eure Büchsen bereit, aber schießt nicht eher, als bis ihr das Geschöpf nicht sonst zurückscheuchen könnt, allenfalls macht ein Feuer an, vor dem er sich fürchtet, wenn er herunter will.
Mann und Frau möge für das übrige stehen.
Eilig schickte Honorio sich an, die Befehle zu vollführen.
Das Kind verfolgte seine Melodie, die keine war, eine Tonfolge ohne Gesetz, und vielleicht eben deswegen so herzergreifend, die Umstehenden schienen wie bezaubert von der Bewegung einer liederartigen Weise, als der Vater mit anständigem Enthusiasmus zu reden anfing und fortfuhr: Gott hat dem Fürsten Weisheit gegeben und zugleich die Erkenntnis, daß alle Gotteswerke weise sind, jedes nach seiner Art.
Seht den Felsen, wie er fest steht und sich nicht rührt, der Witterung trotzt und dem Sonnenschein.
Uralte Bäume zieren sein Haupt, und so gekrönt schaut er weit umher, stürzt aber ein Teil herunter, so will es nicht bleiben, was es war: es fällt zertrümmert in viele Stücke und bedeckt die Seite des Hanges.
Aber auch da wollen sie nicht verharren, mutwillig springen sie tief hinab, der Bach nimmt sie auf, zum Flusse trägt er sie.
Nicht widerstehend, nicht widerspenstig, eckig, nein, glatt und abgerundet gewinnen sie schneller ihren Weg und gelangen von Fluß zu Fluß, endlich zum Ozean, wo die Riesen in Scharen daherziehen und in der Tiefe die Zwerge wimmeln.
Doch wer preist den Ruhm des Herrn, den die Sterne loben von Ewigkeit zu Ewigkeit.
Warum seht ihr aber im Fernen umher?
Betrachtet hier die Biene.
Noch spät im Herbst sammelt sie emsig und baut sich ein Haus, winkel- und waagerecht, als Meister und Geselle.
Schaut die Ameise da.
Sie kennt ihren Weg und verliert ihn nicht, sie baut sich eine Wohnung aus Grashalmen, Erdbröslein und Kiefernadeln, sie baut es in die Höhe und wölbet es zu, aber sie hat umsonst gearbeitet, denn das Pferd stampft und scharrt alles auseinander.
Sehr hin.
Es zertritt ihre Balken und zerstreut ihre Planken, ungeduldig schnaubt es und kann nicht rasten, denn der Herr hat das Roß zum Gesellen des Windes gemacht und zum Gefährten des Sturmes, daß es den Mann dahin trage, wohin er will, und die Frau, wohin sie begehrt.
Aber im Palmenwald trat er auf, der Löwe, ernsten Schrittes durchzog er die Wüste, dort herrscht er über alles Getier, und nichts widersteht ihm.
Doch der Mensch weiß ihn zu zähmen, und das grausamste der Geschöpfe hat Ehrfurcht vor dem Ebenbilde Gottes, wornach auch die Engel gemacht sind, die dem Herrn dienen und seinen Dienern.
Denn in der Löwengrube scheute sich Daniel nicht, er blieb fest und getrost, und das wilde Brüllen unterbrach nicht seinen frommen Gesang.
Diese mit dem Ausdruck eines natürlichen Enthusiasmus gehaltene Rede begleitete das Kind hie und da mit anmutigen Tönen, als aber der Vater geendigt hatte, fing es mit reiner Kehle, heller Stimme und geschickten Läufen zu intonieren an, worauf der Vater die Flöte ergriff, im Einklang sich hören ließ, das Kind aber sang: aus den Gruben, hier im Graben hör ich des Propheten Sang, Engel schweben, ihn zu laben, wäre da dem Guten bang?
Löw und Löwin, hin und wider, schmiegen sich um ihn heran, ja, die sanften, frommen Lieder habens ihnen angetan. Der Vater fuhr fort, die Strophe mit der Flöte zu begleiten, die Mutter trat hie und da als zweite Stimme mit ein.
Eindringlich aber ganz besonders war, daß das Kind die Zeilen der Strophe nunmehr zu anderer Ordnung durcheinander schob und dadurch, wo nicht einen neuen Sinn hervorbrachte, doch das Gefühl in und durch sich selbst aufregend erhöhte.
Engel schweben auf und nieder, uns in Tönen zu erlaben, welch ein himmlischer Gesang .
In den Gruben, in dem Graben wäre da dem Kinde bang ?
Diese sanften, frommen Lieder lassen Unglück nicht heran, Engel schweben hin und wider, und so ist es schon getan.
Hierauf mit Kraft und Erhebung begannen alle drei: denn der Ewge herrscht auf Erden, über Meere herrscht sein Blick, Löwen sollen Lämmer werden, und die Welle schwankt zurück.
Blankes Schwert erstarrt im Hiebe, Glaub und Hoffnung sind erfüllt, wundertätig ist die Liebe, die sich im Gebet enthüllt.
Alles war still, hörte, horchte, und nur erst, als die Töne verhallten, konnte man den Eindruck bemerken und allenfalls beobachten.
Alles war wie beschwichtigt, jeder in seiner Art gerührt.
Der Fürst, als wenn er erst jetzt das Unheil übersähe, das ihn vor kurzem bedroht hatte, blickte nieder auf seine Gemahlin, die, an ihn gelehnt, sich nicht versagte, das gestickte Tüchlein hervorzuziehen und die Augen damit zu bedecken.
Es tat ihr wohl, die jugendliche Brust von dem Druck erleichtert zu fühlen, mit dem die vorhergehenden Minuten sie belastet hatten.
Eine vollkommene Stille beherrschte die Menge, man schien die Gefahren vergessen zu haben, unten den Brand und von oben das Erstehen eines bedenklich ruhenden Löwen.
Durch einen Wink, die Pferde näher herbeizuführen, brachte der Fürst zuerst wieder in die Gruppe Bewegung, dann wendete er sich zu dem Weibe und sagte: Ihr glaubt also, daß Ihr den entsprungenen Löwen, wo Ihr ihn antrefft, durch Euren Gesang, durch den Gesang dieses Kindes, mit Hülfe dieser Flötentöne beschwichtigen und ihn sodann unschädlich sowie unbeschädigt in seinem Verschluß wieder zurückbringen könntet? Sie bejahten es, versichernd und beteuernd, der Kastellan wurde ihnen als Wegweiser zugegeben.
Nun entfernte der Fürst mit wenigen sich eiligst, die Fürstin folgte langsamer mit dem übrigen Gefolge, Mutter aber und Sohn stiegen, von dem Wärtel, der sich eines Gewehrs bemächtigt hatte, begleitet, steiler gegen den Berg hinan.
Vor dem Eintritt in den Hohlweg, der den Zugang zu dem Schloß eröffnete, fanden sie die Jäger beschäftigt, dürres Reisig zu häufen, damit sie auf jeden Fall ein großes Feuer anzünden könnten.
Es ist nicht not, sagte die Frau, es wird ohne das alles in Güte geschehen.
Weiter hin, auf einem Mauerstücke sitzend, erblickten sie Honorio, seine Doppelbüchse in den Schoß gelegt, auf einem Posten als wie zu jedem Ereignis gefaßt.
Aber die Herankommenden schien er kaum zu bemerken, er saß wie in tiefen Gedanken versunken, er sah umher wie zerstreut.
Die Frau sprach ihn an mit Bitte, das Feuer nicht anzünden zu lassen, er schien jedoch ihrer Rede wenig Aufmerksamkeit zu schenken.
Sie redete lebhaft fort und rief: schöner junger Mann, du hast meinen Tiger erschlagen, ich fluche dir nicht, schone meinen Löwen, guter junger Mann.
Ich segne dich.
Honorio schaute gerad vor sich hin, dorthin, wo die Sonne auf ihrer Bahn sich zu senken begann.
Du schaust nach Abend, rief die Frau, du tust wohl daran, dort gibts viel zu tun, eile nur, säume nicht, du wirst überwinden.
Aber zuerst überwinde dich selbst. Hierauf schien er zu lächeln, die Frau stieg weiter, konnte sich aber nicht enthalten, nach dem Zurückbleibenden nochmals umzublicken, eine rötliche Sonne überschien sein Gesicht, sie glaubte nie einen schöhern Jüngling gesehen zu haben.
Wenn Euer Kind, sagte nunmehr der Wärtel, flötend und singend, wie Ihr überzeugt seid, den Löwen anlocken und beruhigen kann, so werden wir uns desselben sehr leicht bemeistern, da sich das gewaltige Tier ganz nah an die durchbrochenen Gewölbe hingelagert hat, durch die wir, da das Haupttor verschüttet ist, einen Eingang in den Schloßhof gewonnen haben.
Lockt ihn das Kind hinein, so kann ich die Öffnung mit leichter Mühe schließen, und der Knabe, wenn es ihm gut deucht, durch eine der kleinen Wendeltreppen, die er in der Ecke sieht, dem Tiere entschlüpfen.
Wir wollen uns verbergen, aber ich werde mich so stellen, daß meine Kugel jeden Augenblick dem Kinde zu Hülfe kommen kann.
Die Umstände sind alle nicht nötig, Gott und Kunst, Frömmigkeit und Glück müssen das Beste tun.
- Es sei, versetzte der Wärtel, aber ich kenne meine Pflichten.
Erst führ ich Euch durch einen beschwerlichen Stieg auf das Gemäuer hinauf, gerade dem Eingang gegenüber, den ich erwähnt habe, das Kind mag hinabsteigen, gleichsam in die Arena des Schauspiels, und das besänftigte Tier dort hereinlocken. Das geschah, Wärtel und Mutter sahen versteckt von oben herab, wie das Kind die Wendeltreppen hinunter in dem klaren Hofraum sich zeigte und in der düstern Öffnung gegenüber verschwand, aber sogleich seinen Flötenton hören ließ, der sich nach und nach verlor und verstummte.
Die Pause war ahnungsvoll genug, den alten, mit Gefahr bekannten Jäger beengte der seltene menschliche Fall.
Er sagte sich, daß er lieber persönlich dem gefährlichen Tiere entgegenginge, die Mutter jedoch, mit heiterem Gesicht, übergebogen horchend, ließ nicht die mindeste Unruhe bemerken.
Endlich hörte man die Flöte wieder, das Kind trat aus der Höhle hervor mit glänzend befriedigten Augen, der Löwe hinter ihm drein, aber langsam und, wie es schien, mit einiger Beschwerde.
Er zeigte hie und da Lust, sich niederzulegen, doch der Knabe führte ihn im Halbkreise durch die wenig entblätterten, buntbelaubten Bäume, bis er sich endlich in den letzten Strahlen der Sonne, die sie durch eine Ruinenlücke hereinsandte, wie verklärt niedersetzte und sein beschwichtigendes Lied abermals begann, dessen Wiederholung wir uns auch nicht entziehen können: aus den Gruben, hier im Graben hör ich des Propheten Sang, Engel schweben, ihn zu laben, wäre da dem Guten bang?
Löw und Löwin, hin und wider, schmiegen sich um ihn heran, ja, die sanften, frommen Lieder habens ihnen angetan. Indessen hatte sich der Löwe ganz knapp an das Kind hingelegt und ihm die schwere rechte Vordertatze auf dem Schoß gehoben, die der Knabe fortsingend anmutig streichelte, aber gar bald bemerkte, daß ein scharfer Dornzweig zwischen die Ballen eingestochen war.
Sorgfältig zog er die verletzende Spitze hervor, nahm lächelnd sein buntseidenes Halstuch vom Nacken und verband die greuliche Tatze des Untiers, sodaß die Mutter sich vor Freuden mit ausgestreckten Armen zurückbog und vielleicht angewohnterweise Beifall gerufen und geklatscht hätte, wäre sie nicht durch einen derben Faustgriff des Wärtels erinnert worden, daß die Gefahr nicht vorüber sei.
Glorreich sang das Kind weiter, nachdem es mit wenigen Tönen vorgespielt hatte: denn der Ewge herrscht auf Erden, über Meere herrscht sein Blick, Löwen sollen Lämmer werden, und die Welle schwankt zurück.
Blankes Schwert erstarrt im Hiebe, Glaub und Hoffnung sind erfüllt, wundertätig ist die Liebe, die sich im Gebet enthüllt.
Ist es möglich zu denken, daß man in den Zügen eines so grimmigen Geschöpfes, des Tyrannen der Wälder, des Despoten des Tierreiches, einen Ausdruck von Freundlichkeit, von dankbarer Zufriedenheit habe spüren können, so geschah es hier, und wirklich sah das Kind in seiner Verklärung aus wie ein mächtiger, siegreicher Überwinder, jener zwar nicht wie der Überwundene, denn seine Kraft blieb in ihm verborgen, aber doch wie der Gezähmte, wie der dem eigenen friedlichen Willen Anheimgegebene.
Das Kind flötete und sang so weiter, nach seiner Art die Zeilen verschränkend und neue hinzufügend: und so geht mit guten Kindern selger Engel gern zu Rat, böses Wollen zu verhindern, zu befördern schöne Tat.
So beschwören, fest zu bannen liebem Sohn ans zarte Knie ihn, des Waldes Hochtyrannen, frommer Sinn und Melodie.
`
},
// {
//     title: 'new',
//     content: 
// `\\cnew
// `
// },

] 
    }

}
module.exports = { FileUploadUI }
