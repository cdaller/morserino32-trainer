
function translateMenu(menuName, language) {
    var translation = menuTranslations[menuName];
    if (!translation) {
        return menuName;
    }
    translation = translation[language];
    if (!translation) {
        return menuName;
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
    'Config Wifi': {'en': 'Configure Wifi'},
    'Update Firmw': {'en': 'Update Firmware'},
}

