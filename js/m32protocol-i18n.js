'use strict';

const log  = require ('loglevel');

class M32Translations {

  constructor() {
    this.m32ProtocolFallbackLanguage = 'en';
    this.menuTranslations = this.getMenuTranslations();
    this.configTranslations = this.getConfigTranslations();
    this.characterTranslations = this.getAlphabetTranslations();
  }

  phonetisize(text) {
    return [...text].map(char => this.translateCharacter(char)).join(' '); 
  }

  translateMenu(key, language, languageVariant = '') {
    return this.translate(key, language, languageVariant, this.menuTranslations);
  }

  translateConfig(key, language, languageVariant = '') {
    return this.translate(key, language, languageVariant, this.configTranslations);
  }

  translateCharacter(key) {
    return this.translate(key, this.m32ProtocolFallbackLanguage, '', this.characterTranslations);
  }


  translate(key, language, languageVariant = '', i18nMap) {
    log.debug("Translate key", key, "to language", language);
    var translationMap = i18nMap[key.trim().toLowerCase()];
    if (!translationMap) {
      return key;
    }

    var translation;
    if (languageVariant) {
      translation = translationMap[language + '_' + languageVariant];
      if (translation) {
        return translation;
      }
    }

    translation = translationMap[language];
    if (translation) {
      return translation;
    }
    if (language === this.m32ProtocolFallbackLanguage) {
      return key; // no fallback
    }
    // try fallback language
    return this.translate(key, this.m32ProtocolFallbackLanguage, languageVariant, i18nMap);
  }

  getMenuTranslations() {
      return {
        'koch trainer': {de: 'Koch Trainer'},
          'adapt. rand.': {en: 'Adaptive Random', de: 'Adaptiver Zufall'},
        // koch lessons
        '1 char m':  {en: '1 m', en_speak: '1--mike'},
        '2 char k':  {en: '2 k', en_speak: '2--kilo'},
        '3 char r':  {en: '3 r', en_speak: '3--romeo'},
        '4 char s':  {en: '4 s', en_speak: '4--sierra'},
        '5 char u':  {en: '5 u', en_speak: '5--uniform'},
        '6 char a':  {en: '6 a', en_speak: '6--alpha'},
        '7 char p':  {en: '7 p', en_speak: '7--papa'},
        '8 char t':  {en: '8 t', en_speak: '8--tango'},
        '9 char l':  {en: '9 l', en_speak: '9--lima'},
        '10 char o': {en: '10 o', en_speak: '10--oscar'},
        '11 char w': {en: '11 w', en_speak: '11--whiskey'},
        '12 char i': {en: '12 i', en_speak: '12--india'},
        '13 char .': {en: '13 .', en_speak: '13--dot'},
        '14 char n': {en: '14 n', en_speak: '14--november'},
        '15 char j': {en: '15 j', en_speak: '15--juliet'},
        '16 char e': {en: '16 e', en_speak: '16--echo'},
        '17 char f': {en: '17 f', en_speak: '17--foxtrott'},
        '18 char 0': {en: '18 0', en_speak: '18--0'},
        '19 char y': {en: '19 y', en_speak: '19--yankee'},
        '20 char v': {en: '20 v', en_speak: '20--victor'},
        '21 char ,': {en: '21 ,', en_speak: '21--comma'},
        '22 char g': {en: '22 g', en_speak: '22--golf'},
        '23 char 5': {en: '23 5', en_speak: '23--5'},
        '24 char':   {en: '24 /', en_speak: '24--slash'}, // "/" is used as menu separator
        '25 char q': {en: '25 q', en_speak: '25--quebec'},
        '26 char 9': {en: '26 9', en_speak: '26--9'},
        '27 char z': {en: '27 z', en_speak: '27--zulu'},
        '28 char h': {en: '28 h', en_speak: '28--hotel'},
        '29 char 3': {en: '29 3', en_speak: '29--3'},
        '30 char 8': {en: '30 8', en_speak: '30--8'},
        '31 char b': {en: '31 b', en_speak: '31--bravo'},
        '32 char ?': {en: '32 ?', en_speak: '32--questionmark'},
        '33 char 4': {en: '33 4', en_speak: '33--4'},
        '34 char 2': {en: '34 2', en_speak: '34--2'},
        '35 char 7': {en: '35 7', en_speak: '35--7'},
        '36 char c': {en: '36 c', en_speak: '36--charly'},
        '37 char 1': {en: '37 1', en_speak: '37--1'},
        '38 char d': {en: '38 d', en_speak: '38--delta'},
        '39 char 6': {en: '39 6', en_speak: '39--6'},
        '40 char x': {en: '40 x', en_speak: '40--x-ray'},
        '41 char -': {en: '41 -', en_speak: '41--minus'},
        '42 char =': {en: '42 =', en_speak: '42--='},
        '43 char <sk>': {en: '43 <sk>', en_speak: '43--silent key'},
        '44 char +': {en: '44 +', en_speak: '44--+'},
        '45 char <as>': {en: '45 <as>', en_speak: '45--alpha sierra'},
        '46 char <kn>': {en: '46 <kn>', en_speak: '46--kilo november'},
        '47 char <ka>': {en: '47 <ka>', en_speak: '47--kilo alpha'},
        '48 char <ve>': {en: '48 <ve>', en_speak: '48--victor echo'},
        '49 char <bk>': {en: '49 <bk>', en_speak: '49--bravo kilo'},
        '50 char @': {en: '50 @', en_speak: '50--@'},
        '51 char :': {en: '51 :', en_speak: '51--colon'},
      'cw generator': {de: 'CW Generator'},
        'random': {de: 'Zufall'},
        'cw abbrevs': {en: 'CW Abbreviations', de: 'CW Abkürzungen'},
        'english words': {de: 'Englische Worte'},
        'mixed': {de: 'Gemischt'},
      'select lesson': {de: 'Auswahl Lektion'},
      'learn new chr': {en: 'Learn new Character', de: 'Lerne neue Buchstaben'},
      'echo trainer': {},
        'call signs': {de: 'Rufzeichen'},
        'file player': {de: 'Datei abspielen'},
    'tranceiver': {en: 'Transceiver', de: 'Transceiver'},
      'lora trx': {en: 'Lora Transceiver', de: 'Lora Transceiver'},
      'wifi trx': {en: 'WiFi Transceiver', de: 'WLAN Tranceiver'},
      'icw/ext trx': {en: 'iCW/External Tranceiver', de: 'iCW/Externer Tranceiver'},
    'cw decoder': {},
    'wifi functions': {de: 'WLAN Funktionen'},
      'check wifi': {de: 'WLAN Prüfen'},
      'upload file': {de: 'Datei hochladen'},
      'config wifi': {en: 'Configure Wifi', de: 'Konfiguriere WLAN'},
      'update firmw': {en: 'Update Firmware', de: 'Firmware aktualisieren'},
      'wifi select': {de: 'WLAN auswählen'},
      'disp mac addr': {en: 'Display Mac Address', de: 'Zeige Mac Adresse'},
    'go to sleep': {de: 'Geh Schlafen'},
    'cw keyer': {},
      'ext trx': {en: 'External Transceiver', de: 'Externer Tranceiver'},
    }
  }

  getConfigTranslations() {
    return {
      'paddle polar.': { en: 'Paddle Polarity' },
      'external pol.': { en: 'External Polarity' },
      'curtisb daht%': { en: 'Curtis B Mode dah Timing Percentage' },
      'curtisb ditt%': { en: 'Curtis B Mode dit Timing Percentage' },
      'autochar spc': { en: 'Auto Character Space' },
      'interword spc': { en: 'Inter word Space' },
      'interchar spc': { en: 'Inter character Space' },
      'length rnd gr': { en: 'Length Random Groups' },
      'length abbrev': { en: 'Length Abbreviations' },
      'max # of words': { en: 'Maximum Number of Words' },
      'cw gen displ': { en: 'CW Generator Display' },
      'each word 2x': { en: 'Each Word 2 times' },
      'confrm. tone': { en: 'Confirm Tone' },
      'key ext tx': { en: 'Key External Transmit' },
      'generator tx': { en: 'Generator Transmit' },
      'adaptv. speed': { en: 'Adaptive Speed' },
      'stop<next>rep': { en: 'Stop Next Repeat' },
      // values
      'custom chars': { en: 'Custom Characters' },
      'bc1: r e a': { en: 'BC1: r. e. a' },
    }
  }

  getAlphabetTranslations() {
    return {
      'a': {en: 'alpha'},
      'b': {en: 'beta'},
      'c': {en: 'charly'},
      'd': {en: 'delta'},
      'e': {en: 'echo'},
      'f': {en: 'foxtrott'},
      'g': {en: 'gamma'},
      'h': {en: 'hotel'},
      'i': {en: 'india'},
      'j': {en: 'juliet'},
      'k': {en: 'kilo'},
      'l': {en: 'lima'},
      'm': {en: 'mike'},
      'n': {en: 'november'},
      'o': {en: 'oscar'},
      'p': {en: 'papa'},
      'q': {en: 'quebec'},
      'r': {en: 'romeo'},
      's': {en: 'sierra'},
      't': {en: 'tango'},
      'u': {en: 'uniform'},
      'v': {en: 'victor'},
      'x': {en: 'x-ray'},
      'y': {en: 'yankee'},
      'z': {en: 'zulu}'}
    } 
  }
}

module.exports = { M32Translations }
