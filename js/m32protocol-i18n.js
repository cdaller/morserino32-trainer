'use strict';

const log  = require ('loglevel');

class M32Translations {

  constructor() {
    this.m32ProtocolFallbackLanguage = 'en';
    this.menuTranslations = this.getMenuTranslations();
    this.configTranslations = this.getConfigTranslations();
  }

  translateMenu(key, language) {
    return this.translate(key, language, this.menuTranslations);
  }

  translateConfig(key, language) {
    return this.translate(key, language, this.configTranslations);
  }

  translate(key, language, i18nMap) {
    log.debug("Translate key", key, "to language", language);
    var translationMap = i18nMap[key.trim().toLowerCase()];
    if (!translationMap) {
      return key;
    }
    var translation = translationMap[language];
    if (translation) {
      return translation;
    }
    if (language === this.m32ProtocolFallbackLanguage) {
      return key; // no fallback
    }
    // try fallback language
    translation = translationMap[this.m32ProtocolFallbackLanguage];
    if (translation) {
      return translation;
    }
    return key;
  }

  getMenuTranslations() {
    return {
      'koch trainer': { de: 'Koch Trainer' },
        // koch lessons
        '13 char .': { en: '13 dot' },
        '21 char ,': { en: '21 comma' },
        '24 char /': { en: '24 slash' },
        '32 char ?': { en: '32 questionmark' },
        '41 char -': { en: '41 minus' },
        '51 char :': { en: '51 colon' },
      'cw generator': { de: 'CW Generator' },
      'random': { de: 'Zufall' },
      'cw abbrevs': { en: 'CW Abbreviations', de: 'CW Abkürzungen' },
      'english words': { de: 'Englische Worte' },
      'mixed': { de: 'Gemischt' },
      'select lesson': { de: 'Auswahl Lektion' },
      'learn new chr': { en: 'Learn New Character', de: 'Lerne neue Buchstaben' },
      'echo trainer': {},
      'call signs': { de: 'Rufzeichen' },
      'file player': { de: 'Datei abspielen' },
      'tranceiver': { en: 'Transceiver', de: 'Transceiver' },
      'lora trx': { en: 'Lora Transceiver', de: 'Lora Transceiver' },
      'wifi trx': { en: 'WiFi Transceiver', de: 'WLAN Tranceiver' },
      'icw/ext trx': { en: 'iCW/External Tranceiver', de: 'iCW/Externer Tranceiver' },
      'cw decoder': {},
      'wifi functions': { de: 'WLAN Funktionen' },
      'check wifi': { de: 'WLAN Prüfen' },
      'upload file': { de: 'Datei hochladen' },
      'config wifi': { en: 'Configure Wifi', de: 'Konfiguriere WLAN' },
      'update firmw': { en: 'Update Firmware', de: 'Firmware aktualisieren' },
      'wifi select': { de: 'WLAN auswählen' },
      'disp mac addr': { en: 'Display Mac Address', de: 'Zeige Mac Adresse' },
      'go to sleep': { de: 'Geh Schlafen' },
      'cw keyer': {},
      'ext trx': { en: 'External Transceiver', de: 'Externer Tranceiver' },
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
}

module.exports = { M32Translations }