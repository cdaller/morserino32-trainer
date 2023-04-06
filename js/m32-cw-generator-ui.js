'use strict';

class M32CwGeneratorUI {

    constructor() {

        // define the elements
        this.receiveText = document.getElementById("receiveText");
        this.inputText = document.getElementById("inputText");

        this.showReceivedCheckbox = document.getElementById("showReceivedCheckbox");
        this.ignoreWhitespaceCheckbox = document.getElementById("ignoreWhitespaceCheckbox");
        this.autoHideCheckbox = document.getElementById("autoHideCheckbox");
        this.clearAllButton = document.getElementById("clearAllButton");
        this.clearReceivedButton = document.getElementById("clearReceivedButton");
        this.saveButton = document.getElementById("saveButton");

        this.resultComparison = document.getElementById("resultComparison");
        this.inputComparator = document.getElementById("inputComparator");
        this.correctPercentage = document.getElementById("correctPercentage");
        this.compareTextsButton = document.getElementById("compareTextsButton");

        this.lastPercentage;
        this.ignoreWhitespace = false;
        this.ignoreWhitespaceCheckbox.checked = this.ignoreWhitespace;
    }
}

module.exports = { M32CwGeneratorUI };