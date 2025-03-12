function setButtonClickHandler() {
    let modeElement = document.getElementById('mode');
    let buttonQuote = document.getElementById('button-quote');
    let inputElement = document.getElementById('input');
    let resultElement = document.getElementById('result');

    if (modeElement && buttonQuote && inputElement && resultElement) {
        let mode = modeElement.value;
        buttonQuote.onclick = function() {
            let text = inputElement.value.trimEnd();
            text = text.split('\n').map(line => line.trimStart().replace(/\s+/g, ' ')).join('\n');
            let lines = text.split('\n');
            let quotedLines = lines.map(line => {
                if (mode === 'phrase') {
                    return `"${line}"`;
                } else if (mode === 'exact') {
                    return `[${line}]`;
                } else {
                    return line;
                }
            });
            let result = quotedLines.filter(line => line !== '""' && line !== '[]' && line.trim() !== '').join('\n');
            resultElement.textContent = result;
        }
    }
}

function setCapitalButtonClickHandler() {
    let buttonCapital = document.getElementById('button-capital');
    let inputElement = document.getElementById('input');
    let resultElement = document.getElementById('result');

    if (buttonCapital && inputElement && resultElement) {
        buttonCapital.onclick = function() {
            let text = inputElement.value;
            let capitalizedText = text.split(' ').map(word => {
                return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
            }).join(' ');
            resultElement.textContent = capitalizedText;
        }
    }
}

function setClearButtonClickHandler() {
    let buttonClear = document.getElementById('clear');
    let inputElement = document.getElementById('input');
    let resultElement = document.getElementById('result');

    if (buttonClear && inputElement && resultElement) {
        buttonClear.onclick = function() {
            inputElement.value = '';
            resultElement.textContent = '';
        }
    }
}

setCapitalButtonClickHandler();
setClearButtonClickHandler();

let modeElement = document.getElementById('mode');
if (modeElement) {
    modeElement.onchange = setButtonClickHandler;
}
setButtonClickHandler();

let copyButton = document.getElementById('copy');
if (copyButton) {
    copyButton.onclick = function() {
        let result = document.getElementById('result');
        if (result) {
            result.select();
            document.execCommand('copy');
        }
    }
}
