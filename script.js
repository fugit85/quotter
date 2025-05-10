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
    let typeElement = document.getElementById('type');

    if (buttonCapital && inputElement && resultElement && typeElement) {
        buttonCapital.onclick = function() {
            let text = inputElement.value;
            let type = typeElement.value;

            let capitalizedText;
            if (type === 'first-letters') {
                capitalizedText = text.split(' ').map(word => {
                    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
                }).join(' ');
            } else if (type === 'all-letters') {
                capitalizedText = text.split(' ').map(word => word.toUpperCase()).join(' ');
            } else {
                capitalizedText = text; 
            }

            resultElement.textContent = capitalizedText;
        }
    }
}

function setClearButtonClickHandler() {
    let buttonClear = document.getElementById('clear');
    let inputElement = document.getElementById('input');
    let resultElement = document.getElementById('result');
    let fieldsetElement = document.getElementById('fieldset');

    if (buttonClear && inputElement && resultElement) {
        buttonClear.onclick = function() {
            inputElement.value = '';
            resultElement.textContent = '';
            if (fieldsetElement) {
                fieldsetElement.innerHTML = '';
            }
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

function setDuplicateButtonClickHandler() {
    let buttonDuplicate = document.getElementById('button-dublicate');
    let inputElement = document.getElementById('input');
    let resultElement = document.getElementById('result');
    let typeElement = document.getElementById('type');

    if (buttonDuplicate && inputElement && resultElement && typeElement) {
        buttonDuplicate.onclick = function() {
            let text = inputElement.value.trim();
            let type = typeElement.value;
            let result;

            if (type === 'string') {
                let lines = text.split('\n').map(line => line.trim());
                let uniqueLines = [...new Set(lines)];
                result = uniqueLines.join('\n');
            } else if (type === 'words') {
                let words = text.split(/\s+/);
                let uniqueWords = [...new Set(words)];
                result = uniqueWords.join('\n');
            }

            resultElement.textContent = result;
        }
    }
}

setDuplicateButtonClickHandler();

function setStartMinusButtonClickHandler() {
    let buttonStartMinus = document.getElementById('start-minus');
    let buttonGetMinusWords = document.getElementById('get-minus-words');
    let inputElement = document.getElementById('input');
    let resultElement = document.getElementById('result');
    let fieldsetElement = document.getElementById('fieldset');

    if (buttonStartMinus && buttonGetMinusWords && inputElement && resultElement && fieldsetElement) {
        buttonStartMinus.onclick = function() {
            fieldsetElement.innerHTML = ''; // Clear previous content
            let text = inputElement.value.trim();
            let lines = text.split('\n');

            lines.forEach(line => {
                let div = document.createElement('div');
                let checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.style.marginRight = '5px';

                div.appendChild(checkbox);

                let words = line.split(' ');
                words.forEach(word => {
                    word = word.trim();
                    if (word) {
                        let span = document.createElement('span');
                        span.textContent = word + ' ';
                        span.style.cursor = 'pointer';

                        span.onclick = function() {
                            let allSpans = fieldsetElement.querySelectorAll('span');
                            allSpans.forEach(s => {
                                if (s.textContent.trim() === word) {
                                    if (s.classList.contains('highlighted')) {
                                        s.classList.remove('highlighted');
                                        s.style.backgroundColor = '';
                                    } else {
                                        s.classList.add('highlighted');
                                        s.style.backgroundColor = 'SlateBlue';
                                    }
                                }
                            });
                        };

                        div.appendChild(span);
                    }
                });

                div.style.margin = '5px 0';

                checkbox.onchange = function() {
                    if (checkbox.checked) {
                        div.classList.add('highlighted');
                    } else {
                        div.classList.remove('highlighted');
                    }
                };

                fieldsetElement.appendChild(div);
            });
        };

        buttonGetMinusWords.onclick = function() {
            let checkedLines = Array.from(fieldsetElement.querySelectorAll('input[type="checkbox"]:checked'))
                .map(checkedBox => {
                    let line = Array.from(checkedBox.parentElement.querySelectorAll('span'))
                        .map(span => span.textContent.trim())
                        .join(' ');
                    return `[${line}]`;
                });

            let selectedWords = Array.from(fieldsetElement.querySelectorAll('span.highlighted'))
                .map(selectedSpan => selectedSpan.textContent.trim());
            let uniqueSelectedWords = [...new Set(selectedWords)];

            resultElement.textContent = [...checkedLines, ...uniqueSelectedWords].join('\n');
        };
    }
}

setStartMinusButtonClickHandler();

function setGetWhiteListButtonClickHandler() {
    let buttonGetWhiteList = document.getElementById('get-white-list');
    let fieldsetElement = document.getElementById('fieldset');
    let resultElement = document.getElementById('result');

    if (buttonGetWhiteList && fieldsetElement && resultElement) {
        buttonGetWhiteList.onclick = function() {
            let lines = Array.from(fieldsetElement.children);
            let whiteList = lines.filter(div => {
                let hasChecked = div.querySelector('input[type="checkbox"]:checked');
                let hasHighlighted = div.querySelector('span.highlighted');
                return !hasChecked && !hasHighlighted;
            }).map(div => {
                return Array.from(div.querySelectorAll('span'))
                    .map(span => span.textContent.trim())
                    .join(' ');
            });

            resultElement.textContent = whiteList.join('\n');
        };
    }
}

setGetWhiteListButtonClickHandler();

function setInflectButtonClickHandler() {
    const button = document.getElementById('button-inflect');
    const inputEl = document.getElementById('input');
    const resultEl = document.getElementById('result');

    if (!button || !inputEl || !resultEl) return;

    button.onclick = async () => {
        const text = inputEl.value.trim();
        if (!text) {
            resultEl.value = 'Введите текст для склонения';
            return;
        }

        try {
            const res = await fetch('https://declination-rus.onrender.com/decline', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text })
            });
            if (!res.ok) {
                resultEl.value = `Ошибка сервера: ${res.status}`;
                return;
            }
            const data = await res.json();

            const allForms = [];
            Object.values(data).forEach(formsObj => {
                Object.values(formsObj).forEach(form => {
                    if (form) allForms.push(form);
                });
            });

            const uniqueForms = Array.from(new Set(allForms));

            resultEl.value = uniqueForms.join('\n');
        } catch (err) {
            console.error('Fetch error:', err);
            resultEl.value = 'Ошибка при соединении с сервером';
        }
    };
}

setInflectButtonClickHandler();

