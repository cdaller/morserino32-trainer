
function translateMenu(key, language) {
    return translate(key, language, menuTranslations);
};

function translateConfig(key, language) {
    return translate(key, language, configTranslations);
};

function translate(key, language, i18nMap) {
    var translation = i18nMap[key.trim()];
    if (!translation) {
        return key;
    }
    translation = translation[language];
    if (!translation) {
        return key;
    }
    return translation;
};

menuTranslations = {
    'CW Abbrevs': {'en': 'CW Abbreviations'},
    'Learn New Chr': {'en': 'Learn new Character'},
    'LoRa Trx': {'en': 'LORA Transceiver'},
    'WiFi Trx': {'en': 'WiFi Transceiver'},
    'Ext Trx': {'en': 'External Transceiver'},
    'Disp MAC Addr': {'en': 'Display Mac Address'},
    'Config WiFi': {'en': 'Configure Wifi'},
    'Update Firmw': {'en': 'Update Firmware'},
}

configTranslations = {
    'Paddle Polar.': {'en': 'Paddle Polarity'},
    'External Pol.': {'en': 'External Polarity'},
    'CurtisB DahT%': {'en': 'Curtis B Mode dah Timing %'},
    'CurtisB DitT%': {'en': 'Curtis B Mode dit Timing %'},
    'AutoChar Spc': {'en': 'Auto Character Space'},
    'InterWord Spc': {'en': 'Inter word Space'},
    'Interchar Spc': {'en': 'Inter character Space'},
    'Length Rnd Gr': {'en': 'Length Random Groups'},
    'Length Abbrev': {'en': 'Length Abbreviations'},
    'Max # of Words': {'en': 'Maximum Number of Words'},
    'CW Gen Displ': {'en': 'CW Generator Display'},
    'Each Word 2x': {'en': 'Each Word 2 times'},
    'Confrm. Tone': {'en': 'Confirm Tone'},
    'Key ext TX': {'en': 'Kex External Transmit'},
    'Generator Tx': {'en': 'Generator Transmit'},
    'Adaptv. Speed': {'en': 'Adaptive Speed'},
    'Stop/Next/Rep': {'en': 'Stop Next Repeat'},
    // koch lessons
    '13 .': {'en': '13 dot'},
    '21 ,': {'en': '21 comma'},
    '24 /': {'en': '24 slash'},
    '32 ?': {'en': '32 questionmark'},
    '41 -': {'en': '41 minus'},
    '51 :': {'en': '51 colon'},
}