var html = document.documentElement;
var themeIcon = document.getElementById('themeIcon');
var themeLabel = document.getElementById('themeLabel');

var saved = localStorage.getItem('theme');
if (!saved) {
    saved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
applyTheme(saved);

document.getElementById('themeToggle').onclick = function () {
    applyTheme(html.getAttribute('data-theme') === 'light' ? 'dark' : 'light');
};

function applyTheme(theme) {
    html.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    themeIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
    themeLabel.textContent = theme === 'dark' ? 'Светлая' : 'Тёмная';
}

var counter = document.getElementById('counter');
if (counter) {
    document.getElementById('input').addEventListener('input', function () {
        var n = this.value.split('\n').filter(function (l) { return l.trim(); }).length;
        counter.textContent = n + (
            n % 10 === 1 && n !== 11 ? ' строка' :
                n % 10 >= 2 && n % 10 <= 4 && (n < 10 || n > 20) ? ' строки' : ' строк'
        );
    });
}

var scrollBtn = document.getElementById('scrollTop');
if (scrollBtn) {
    window.addEventListener('scroll', function () {
        if (window.scrollY > window.innerHeight * 0.5) {
            scrollBtn.classList.add('visible');
        } else {
            scrollBtn.classList.remove('visible');
        }
    });

    scrollBtn.onclick = function () {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };
}


function setButtonClickHandler() {
    let modeElement = document.getElementById('mode');
    let buttonQuote = document.getElementById('button-quote');
    let inputElement = document.getElementById('input');
    let resultElement = document.getElementById('result');

    if (modeElement && buttonQuote && inputElement && resultElement) {
        let mode = modeElement.value;
        buttonQuote.onclick = function () {
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
        buttonCapital.onclick = function () {
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
        buttonClear.onclick = function () {
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
    copyButton.onclick = function () {
        let result = document.getElementById('result');
        if (result && result.value) {
            result.select();
            document.execCommand('copy');
            
            window.dataLayer = window.dataLayer || [];
            window.dataLayer.push({ event: 'copy_success' });

            copyButton.textContent = '✓ Скопировано';
            copyButton.classList.add('copied');
            result.classList.add('flash');
            setTimeout(function () {
                copyButton.textContent = '⎘ Копировать';
                copyButton.classList.remove('copied');
                result.classList.remove('flash');
            }, 1800);
        }
    }
}

function setDuplicateButtonClickHandler() {
    let buttonDuplicate = document.getElementById('button-dublicate');
    let inputElement = document.getElementById('input');
    let resultElement = document.getElementById('result');
    let typeElement = document.getElementById('type');

    if (buttonDuplicate && inputElement && resultElement && typeElement) {
        buttonDuplicate.onclick = function () {
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
        buttonStartMinus.onclick = function () {
            fieldsetElement.innerHTML = '';
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

                        span.onclick = function () {
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

                checkbox.onchange = function () {
                    if (checkbox.checked) {
                        div.classList.add('highlighted');
                    } else {
                        div.classList.remove('highlighted');
                    }
                };

                fieldsetElement.appendChild(div);
            });
        };

        buttonGetMinusWords.onclick = function () {
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
        buttonGetWhiteList.onclick = function () {
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

function toggleOptions(allCheckbox) {
    var byAll = document.getElementById('byAll');
    var byGender = document.getElementById('byGender');
    var byNumber = document.getElementById('byNumber');
    var byCase = document.getElementById('byCase');

    if (!byAll || !byGender || !byNumber || !byCase) return;

    if (allCheckbox && allCheckbox.id === 'byAll') {
        if (byAll.checked) {
            byGender.checked = false;
            byNumber.checked = false;
            byCase.checked = false;
        }
    } else {
        var allThreeChecked = byGender.checked && byNumber.checked && byCase.checked;
        if (allThreeChecked) {
            byAll.checked = true;
            byGender.checked = false;
            byNumber.checked = false;
            byCase.checked = false;
        } else if (byGender.checked || byNumber.checked || byCase.checked) {
            byAll.checked = false;
        } else {
            byAll.checked = true;
        }
    }
}

document.addEventListener('DOMContentLoaded', function () {
    toggleOptions(document.getElementById('byAll'));
});


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

        const byAllCheckbox = document.getElementById('byAll');
        let byGender = true, byNumber = true, byCase = true;

        if (byAllCheckbox) {
            const byAll = byAllCheckbox.checked;
            byGender = byAll || document.getElementById('byGender')?.checked;
            byNumber = byAll || document.getElementById('byNumber')?.checked;
            byCase = byAll || document.getElementById('byCase')?.checked;
        }

        try {
            const res = await fetch('https://declination-rus.onrender.com/decline', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text, byGender, byNumber, byCase })
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

var csvUpload = document.getElementById('csvUpload');
if (csvUpload) {
    csvUpload.onchange = function (e) {
        var file = e.target.files[0];
        if (!file) return;

        var reader = new FileReader();
        reader.onload = function (ev) {
            var raw = ev.target.result;

            var text;
            if (raw instanceof ArrayBuffer) {
                var bytes = new Uint8Array(raw);
                if (bytes[0] === 0xFF && bytes[1] === 0xFE) {
                    text = new TextDecoder('utf-16le').decode(raw);
                } else {
                    text = new TextDecoder('utf-8').decode(raw);
                }
            } else {
                text = raw;
            }

            var lines = text.split('\n');
            var keywords = [];
            var headerFound = false;
            var kwIndex = 0;

            for (var i = 0; i < lines.length; i++) {
                var cols = lines[i].split('\t');

                if (!headerFound) {
                    for (var c = 0; c < cols.length; c++) {
                        if (cols[c].trim().toLowerCase() === 'keyword') {
                            kwIndex = c;
                            headerFound = true;
                            break;
                        }
                    }
                    continue;
                }

                var kw = cols[kwIndex] ? cols[kwIndex].trim() : '';
                if (kw && kw !== '') {
                    keywords.push(kw);
                }
            }

            if (keywords.length > 0) {
                document.getElementById('input').value = keywords.join('\n');
            } else {
                alert('Не удалось найти ключевые слова. Убедитесь что файл выгружен из Планировщика Google.');
            }
            csvUpload.value = '';
        };

        reader.readAsArrayBuffer(file);
    };
}

var exportBtn = document.getElementById('export-csv');
if (exportBtn) {
    exportBtn.onclick = function () {
        var result = document.getElementById('result');
        if (!result || !result.value.trim()) return;

        var lines = result.value.trim().split('\n');
        var csvContent = 'Keyword\n' + lines.map(function (l) {
            if (l.indexOf(',') !== -1 || l.indexOf('"') !== -1) {
                return '"' + l.replace(/"/g, '""') + '"';
            }
            return l;
        }).join('\n');

        var blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'minus_words.csv';
        a.click();
        URL.revokeObjectURL(url);

        exportBtn.textContent = '✓ Сохранено';
        setTimeout(function () { exportBtn.textContent = '↓ Экспорт CSV'; }, 1800);
    };
}

var navMenuBtn = document.getElementById('navMenuBtn');
var navDropdown = document.getElementById('navDropdown');
if (navMenuBtn && navDropdown) {
    navMenuBtn.onclick = function () {
        navDropdown.classList.toggle('open');
        navMenuBtn.textContent = navDropdown.classList.contains('open') ? '✕' : '≡';
    };
    document.addEventListener('click', function (e) {
        if (!navMenuBtn.contains(e.target) && !navDropdown.contains(e.target)) {
            navDropdown.classList.remove('open');
            navMenuBtn.textContent = '≡';
        }
    });
}

var navLogo = document.querySelector('.nav-logo');
if (navLogo) {
    navLogo.onclick = function () {
        var base = ['[ ]', '" "', 'keyword', 'ppc', 'ads', 'search', 'minus', 'cpc', 'ctr'];
        var particles = base.concat(base);
        var rect = navLogo.getBoundingClientRect();
        var cx = rect.left + rect.width / 2;
        var cy = rect.top + rect.height / 2;

        particles.forEach(function (text, i) {
            var el = document.createElement('span');
            el.className = 'logo-particle';
            el.textContent = text;

            var angle = Math.random() * 360;
            var dist = 300 + Math.random() * 1200;
            var tx = Math.cos(angle * Math.PI / 180) * dist;
            var ty = Math.sin(angle * Math.PI / 180) * dist;

            el.style.left = cx + 'px';
            el.style.top = cy + 'px';
            el.style.setProperty('--tx', tx + 'px');
            el.style.setProperty('--ty', ty + 'px');
            el.style.animationDelay = (Math.random() * 80) + 'ms';

            document.body.appendChild(el);
            setTimeout(function () { el.remove(); }, 2200);
        });
    };

}

var feedbackModal   = document.getElementById('feedbackModal');
var feedbackClose   = document.getElementById('feedbackClose');
var feedbackForm    = document.getElementById('feedbackForm');
var feedbackMsgBox  = document.getElementById('feedbackMessage');

if (feedbackModal && feedbackClose && feedbackForm) {
    window.openFeedbackForm = function() {
        feedbackModal.classList.remove('hidden');
    };

    feedbackClose.addEventListener('click', function() {
        feedbackModal.classList.add('hidden');
    });

    feedbackModal.addEventListener('click', function(e) {
        if (e.target === feedbackModal) feedbackModal.classList.add('hidden');
    });

    feedbackForm.addEventListener('submit', function(e) {
        e.preventDefault();

        var comment = document.getElementById('feedbackComment').value.trim();
        var contact = document.getElementById('feedbackContact').value.trim();
        if (!comment) return;

        var submitBtn = feedbackForm.querySelector('.feedback-submit');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Отправляем...';

        fetch('https://feedback-service-ykt7.onrender.com/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                comment: comment,
                contact: contact,
                url: window.location.href
            })
        })
        .then(function(res) { return res.json(); })
        .then(function(data) {
            feedbackForm.style.display = 'none';
            feedbackMsgBox.innerHTML =
                '<div class="feedback-success">' +
                    '<div class="feedback-success-icon">✓</div>' +
                    '<div class="feedback-success-title">Спасибо!</div>' +
                    '<div class="feedback-success-text">Ваш коментарий отправлен — обязательно посмотрим</div>' +
                '</div>';

            setTimeout(function() {
                feedbackModal.classList.add('hidden');
                setTimeout(function() {
                    feedbackForm.style.display = '';
                    feedbackMsgBox.innerHTML = '';
                    feedbackForm.reset();
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Отправить';
                }, 300);
            }, 2500);
        })
        .catch(function() {
            feedbackMsgBox.textContent = 'Ошибка отправки. Попробуйте позже.';
            submitBtn.disabled = false;
            submitBtn.textContent = 'Отправить';
        });
    });
}



