'use strict';

var CONFIG = {
    declineApiUrl: 'https://declination-rus.onrender.com/decline',
    feedbackSubmitUrl: 'https://feedback-service-ykt7.onrender.com/submit',
    recaptchaSiteKey: '6Lch7H8sAAAAAK9ayTdPK7pwgOcCnm3DJLoI15Mk'
};

var DOC_LANG = (document.documentElement.getAttribute('lang') || 'ru').split('-')[0].toLowerCase();

var UI_STRINGS = {
    en: {
        themeLight: 'Light',
        themeDark: 'Dark',
        lineLabel: function (n) { return n + (n === 1 ? ' line' : ' lines'); },
        copy: '⎘ Copy',
        copied: '✓ Copied',
        exportCsv: '↓ Export CSV',
        exportSaved: '✓ Saved',
        declineEmpty: 'Enter text to inflect',
        serverError: function (s) { return 'Server error: ' + s; },
        connectionError: 'Could not reach the server',
        csvAlertMinus: 'Could not find keywords. Make sure the file is exported from Google Keyword Planner.',
        csvAlertQuote: 'Could not find keywords.',
        verify: 'Verifying…',
        sending: 'Sending…',
        thanks: 'Thanks!',
        feedbackOk: 'Your message was sent — we will read it.',
        feedbackErr: 'Could not send. Please try again later.',
        submit: 'Send'
    },
    ru: {
        themeLight: 'Светлая',
        themeDark: 'Тёмная',
        lineLabel: function (n) {
            return n + (
                n % 10 === 1 && n !== 11 ? ' строка' :
                    n % 10 >= 2 && n % 10 <= 4 && (n < 10 || n > 20) ? ' строки' : ' строк'
            );
        },
        copy: '⎘ Копировать',
        copied: '✓ Скопировано',
        exportCsv: '↓ Экспорт CSV',
        exportSaved: '✓ Сохранено',
        declineEmpty: 'Введите текст для склонения',
        serverError: function (s) { return 'Ошибка сервера: ' + s; },
        connectionError: 'Ошибка при соединении с сервером',
        csvAlertMinus: 'Не удалось найти ключевые слова. Убедитесь что файл выгружен из Планировщика Google.',
        csvAlertQuote: 'Не удалось найти ключевые слова.',
        verify: 'Проверка...',
        sending: 'Отправляем...',
        thanks: 'Спасибо!',
        feedbackOk: 'Ваш комментарий отправлен — обязательно посмотрим',
        feedbackErr: 'Ошибка отправки. Попробуйте позже.',
        submit: 'Отправить'
    },
    be: {
        themeLight: 'Светлая',
        themeDark: 'Цёмная',
        lineLabel: function (n) {
            var m = n % 10;
            var m100 = n % 100;
            if (m100 >= 11 && m100 <= 14) {
                return n + ' радкоў';
            }
            if (m === 1) {
                return n + ' радок';
            }
            if (m >= 2 && m <= 4) {
                return n + ' радкі';
            }
            return n + ' радкоў';
        },
        copy: '⎘ Капіяваць',
        copied: '✓ Скапіявана',
        exportCsv: '↓ Экспарт CSV',
        exportSaved: '✓ Захавана',
        declineEmpty: 'Увядзіце тэкст для скланення',
        serverError: function (s) { return 'Памылка сервера: ' + s; },
        connectionError: 'Не атрымалася звязацца з серверам',
        csvAlertMinus: 'Не знойдзены ключавыя словы. Пераканайцеся, што файл з Планіроўшчыка Google.',
        csvAlertQuote: 'Не знойдзены ключавыя словы.',
        verify: 'Праверка...',
        sending: 'Адпраўляем...',
        thanks: 'Дзякуй!',
        feedbackOk: 'Ваш каментар адпраўлены — абавязкова праглядзім',
        feedbackErr: 'Памылка адпраўкі. Паспрабуйце пазней.',
        submit: 'Адправіць'
    },
    uk: {
        themeLight: 'Світла',
        themeDark: 'Темна',
        lineLabel: function (n) {
            var m = n % 10;
            var m100 = n % 100;
            if (m100 >= 11 && m100 <= 14) {
                return n + ' рядків';
            }
            if (m === 1) {
                return n + ' рядок';
            }
            if (m >= 2 && m <= 4) {
                return n + ' рядки';
            }
            return n + ' рядків';
        },
        copy: '⎘ Копіювати',
        copied: '✓ Скопійовано',
        exportCsv: '↓ Експорт CSV',
        exportSaved: '✓ Збережено',
        declineEmpty: 'Введіть текст для відмінювання',
        serverError: function (s) { return 'Помилка сервера: ' + s; },
        connectionError: 'Не вдалося зв’язатися з сервером',
        csvAlertMinus: 'Не знайдено ключові слова. Переконайтеся, що файл з Планувальника Google.',
        csvAlertQuote: 'Не знайдено ключові слова.',
        verify: 'Перевірка...',
        sending: 'Надсилаємо...',
        thanks: 'Дякуємо!',
        feedbackOk: 'Ваш коментар надіслано — обов’язково переглянемо',
        feedbackErr: 'Помилка надсилання. Спробуйте пізніше.',
        submit: 'Надіслати'
    },
    pl: {
        themeLight: 'Jasny',
        themeDark: 'Ciemny',
        lineLabel: function (n) {
            if (n === 1) {
                return '1 wiersz';
            }
            var m = n % 10;
            var m100 = n % 100;
            if (m100 >= 12 && m100 <= 14) {
                return n + ' wierszy';
            }
            if (m >= 2 && m <= 4) {
                return n + ' wiersze';
            }
            return n + ' wierszy';
        },
        copy: '⎘ Kopiuj',
        copied: '✓ Skopiowano',
        exportCsv: '↓ Eksport CSV',
        exportSaved: '✓ Zapisano',
        declineEmpty: 'Wpisz tekst do odmiany',
        serverError: function (s) { return 'Błąd serwera: ' + s; },
        connectionError: 'Nie udało się połączyć z serwerem',
        csvAlertMinus: 'Nie znaleziono słów kluczowych. Upewnij się, że plik pochodzi z Planera słów kluczowych Google.',
        csvAlertQuote: 'Nie znaleziono słów kluczowych.',
        verify: 'Weryfikacja…',
        sending: 'Wysyłanie…',
        thanks: 'Dziękujemy!',
        feedbackOk: 'Wiadomość wysłana — na pewno ją przeczytamy',
        feedbackErr: 'Nie udało się wysłać. Spróbuj później.',
        submit: 'Wyślij'
    },
    kk: {
        themeLight: 'Жарық',
        themeDark: 'Қараңғы',
        lineLabel: function (n) { return n + ' жол'; },
        copy: '⎘ Көшіру',
        copied: '✓ Көшірілді',
        exportCsv: '↓ CSV экспорт',
        exportSaved: '✓ Сақталды',
        declineEmpty: 'Септіру үшін мәтінді енгізіңіз',
        serverError: function (s) { return 'Сервер қатесі: ' + s; },
        connectionError: 'Серверге қосылу мүмкін болмады',
        csvAlertMinus: 'Кілт сөздер табылмады. Файл Google сөз жоспарлаушысынан шығарылғанына көз жеткізіңіз.',
        csvAlertQuote: 'Кілт сөздер табылмады.',
        verify: 'Тексеру…',
        sending: 'Жіберілуде…',
        thanks: 'Рахмет!',
        feedbackOk: 'Хабарлама жіберілді — міндетті түрде оқимыз',
        feedbackErr: 'Жіберу сәтсіз аяқталды. Кейінірек қайталаңыз.',
        submit: 'Жіберу'
    }
};

var L = UI_STRINGS[DOC_LANG] || UI_STRINGS.ru;

var originalForms = [];

function setTextareaValue(el, value) {
    if (el && String(el.tagName).toUpperCase() === 'TEXTAREA') {
        el.value = value == null ? '' : value;
    }
}

function decodePlannerFileBuffer(raw) {
    if (raw instanceof ArrayBuffer) {
        var bytes = new Uint8Array(raw);
        if (bytes[0] === 0xFF && bytes[1] === 0xFE) {
            return new TextDecoder('utf-16le').decode(raw);
        }
        return new TextDecoder('utf-8').decode(raw);
    }
    return String(raw);
}

function extractKeywordsFromPlannerTsv(text) {
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
        if (kw) {
            keywords.push(kw);
        }
    }
    return keywords;
}

function escapeCsvField(line) {
    if (line.indexOf(',') !== -1 || line.indexOf('"') !== -1) {
        return '"' + line.replace(/"/g, '""') + '"';
    }
    return line;
}

function downloadKeywordCsv(filename, bodyLines) {
    var csvContent = 'Keyword\n' + bodyLines.map(escapeCsvField).join('\n');
    var blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function fallbackCopyToClipboard(text) {
    try {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        ta.style.top = '0';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        ta.setSelectionRange(0, text.length);
        var ok = document.execCommand('copy');
        document.body.removeChild(ta);
        return ok;
    } catch (e) {
        return false;
    }
}

function copyTextToClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
        return navigator.clipboard.writeText(text).then(function () {
            return true;
        }).catch(function () {
            return fallbackCopyToClipboard(text);
        });
    }
    return Promise.resolve(fallbackCopyToClipboard(text));
}

function flashCopyButton(button, resultEl) {
    if (!button) {
        return;
    }
    var prev = button.textContent;
    button.textContent = L.copied;
    button.classList.add('copied');
    if (resultEl) {
        resultEl.classList.add('flash');
    }
    setTimeout(function () {
        button.textContent = prev;
        button.classList.remove('copied');
        if (resultEl) {
            resultEl.classList.remove('flash');
        }
    }, 1800);
}

var html = document.documentElement;
var themeIcon = document.getElementById('themeIcon');
var themeLabel = document.getElementById('themeLabel');

function applyTheme(theme) {
    html.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    if (themeIcon) {
        themeIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
    }
    if (themeLabel) {
        themeLabel.textContent = theme === 'dark' ? L.themeLight : L.themeDark;
    }
}

var savedTheme = localStorage.getItem('theme');
if (!savedTheme) {
    savedTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
applyTheme(savedTheme);

var themeToggleEl = document.getElementById('themeToggle');
if (themeToggleEl) {
    themeToggleEl.addEventListener('click', function () {
        applyTheme(html.getAttribute('data-theme') === 'light' ? 'dark' : 'light');
    });
}

var counterEl = document.getElementById('counter');
var inputForCounter = document.getElementById('input');
if (counterEl && inputForCounter) {
    inputForCounter.addEventListener('input', function () {
        var n = this.value.split('\n').filter(function (l) { return l.trim(); }).length;
        counterEl.textContent = L.lineLabel(n);
    });
}

var scrollBtn = document.getElementById('scrollTop');
if (scrollBtn) {
    window.addEventListener('scroll', function () {
        scrollBtn.classList.toggle('visible', window.scrollY > window.innerHeight * 0.5);
    });
    scrollBtn.addEventListener('click', function () {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

function wireQuoteTool() {
    var modeElement = document.getElementById('mode');
    var buttonQuote = document.getElementById('button-quote');
    var inputElement = document.getElementById('input');
    var resultElement = document.getElementById('result');
    var customWrap = document.getElementById('customWrap');

    if (modeElement && customWrap) {
        modeElement.addEventListener('change', function () {
            customWrap.style.display = modeElement.value === 'custom' ? 'flex' : 'none';
        });
    }

    if (!(modeElement && buttonQuote && inputElement && resultElement)) {
        return;
    }

    buttonQuote.addEventListener('click', function () {
        var mode = modeElement.value;
        var caseModeEl = document.querySelector('input[name="caseMode"]:checked');
        var caseMode = caseModeEl ? caseModeEl.value : 'original';
        var cleanModeEl = document.querySelector('input[name="cleanMode"]:checked');
        var cleanMode = cleanModeEl ? cleanModeEl.value : 'keep';
        var dedupModeEl = document.querySelector('input[name="dedupMode"]:checked');
        var dedupMode = dedupModeEl ? dedupModeEl.value : 'keep';

        var customOpen = document.getElementById('customOpen');
        var customClose = document.getElementById('customClose');
        var openSym = customOpen ? customOpen.value : '';
        var closeSym = customClose ? customClose.value : '';

        var splitModeEl = document.querySelector('input[name="splitMode"]:checked');
        var splitMode = splitModeEl ? splitModeEl.value : 'lines';

        var text = inputElement.value.trimEnd();
        var lines;

        if (splitMode === 'words') {
            lines = text.split(/\s+/).filter(function (w) { return w.trim(); });
        } else {
            lines = text.split('\n').map(function (line) {
                return line.trim().replace(/\s+/g, ' ');
            }).filter(function (line) { return line !== ''; });
        }

        if (dedupMode === 'remove') {
            var seen = {};
            lines = lines.filter(function (line) {
                var key = line.toLowerCase().split(' ').sort().join(' ');
                if (seen[key]) {
                    return false;
                }
                seen[key] = true;
                return true;
            });
        }

        var result = lines.map(function (line) {
            if (cleanMode === 'clean') {
                line = line.replace(/[^\wа-яёА-ЯЁ\s\d]/g, '').replace(/\s+/g, ' ').trim();
            }
            if (caseMode === 'lower') {
                line = line.toLowerCase();
            } else if (caseMode === 'upper') {
                line = line.toUpperCase();
            } else if (caseMode === 'first') {
                line = line.charAt(0).toUpperCase() + line.slice(1).toLowerCase();
            } else if (caseMode === 'each') {
                line = line.split(' ').map(function (w) {
                    return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
                }).join(' ');
            }
            if (mode === 'phrase') {
                return '"' + line + '"';
            }
            if (mode === 'exact') {
                return '[' + line + ']';
            }
            if (mode === 'custom') {
                return openSym + line + closeSym;
            }
            return line;
        }).filter(function (line) {
            return line.trim() !== '' && line !== '""' && line !== '[]';
        }).join('\n');

        setTextareaValue(resultElement, result);

        var counterResult = document.getElementById('counter-result');
        if (counterResult) {
            var n = result ? result.split('\n').filter(function (l) { return l.trim(); }).length : 0;
            counterResult.textContent = L.lineLabel(n);
        }
    });
}

var optionsToggle = document.getElementById('optionsToggle');
var optionsBody = document.getElementById('optionsBody');
if (optionsToggle && optionsBody) {
    optionsToggle.addEventListener('click', function () {
        optionsToggle.classList.toggle('open');
        optionsBody.classList.toggle('open');
    });
}

wireQuoteTool();

function wireCapitalizer() {
    var buttonCapital = document.getElementById('button-capital');
    var inputElement = document.getElementById('input');
    var resultElement = document.getElementById('result');
    var typeElement = document.getElementById('type');
    if (!(buttonCapital && inputElement && resultElement && typeElement)) {
        return;
    }
    buttonCapital.addEventListener('click', function () {
        var text = inputElement.value;
        var type = typeElement.value;
        var out;
        if (type === 'first-letters') {
            out = text.split(' ').map(function (word) {
                return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
            }).join(' ');
        } else if (type === 'all-letters') {
            out = text.split(' ').map(function (word) { return word.toUpperCase(); }).join(' ');
        } else {
            out = text;
        }
        setTextareaValue(resultElement, out);
    });
}
wireCapitalizer();

function wireClear() {
    var buttonClear = document.getElementById('clear');
    var inputElement = document.getElementById('input');
    var resultElement = document.getElementById('result');
    var fieldsetElement = document.getElementById('fieldset');
    if (!(buttonClear && inputElement && resultElement)) {
        return;
    }
    buttonClear.addEventListener('click', function () {
        inputElement.value = '';
        setTextareaValue(resultElement, '');
        if (document.getElementById('addTranslit')) {
            originalForms = [];
        }
        if (fieldsetElement) {
            fieldsetElement.innerHTML = '';
        }
    });
}
wireClear();

var copyButton = document.getElementById('copy');
if (copyButton) {
    copyButton.addEventListener('click', function () {
        var result = document.getElementById('result');
        if (!result) {
            return;
        }
        var text = (result.value || '').trim();
        if (!text) {
            return;
        }
        copyTextToClipboard(text).then(function (ok) {
            if (!ok) {
                return;
            }
            window.dataLayer = window.dataLayer || [];
            window.dataLayer.push({ event: 'copy_success' });
            flashCopyButton(copyButton, result);
        });
    });
}

function wireDeduplicator() {
    var buttonDuplicate = document.getElementById('button-dublicate');
    var inputElement = document.getElementById('input');
    var resultElement = document.getElementById('result');
    var typeElement = document.getElementById('type');
    if (!(buttonDuplicate && inputElement && resultElement && typeElement)) {
        return;
    }
    buttonDuplicate.addEventListener('click', function () {
        var text = inputElement.value.trim();
        var type = typeElement.value;
        var ignoreOrderEl = document.getElementById('ignoreOrder');
        var ignoreOrder = ignoreOrderEl ? ignoreOrderEl.checked : false;
        var out = '';

        if (type === 'string') {
            var lines = text.split('\n').map(function (l) { return l.trim(); }).filter(Boolean);
            var seen = {};
            var uniqueLines = lines.filter(function (line) {
                var key = ignoreOrder
                    ? line.toLowerCase().split(' ').sort().join(' ')
                    : line.toLowerCase();
                if (seen[key]) {
                    return false;
                }
                seen[key] = true;
                return true;
            });
            out = uniqueLines.join('\n');
        } else if (type === 'words') {
            var words = text.split(/\s+/).filter(Boolean);
            var uniqueWords = Array.from(new Set(words.map(function (w) { return w.toLowerCase(); })));
            out = uniqueWords.join('\n');
        }

        setTextareaValue(resultElement, out);

        var counterResult = document.getElementById('counter-result');
        if (counterResult) {
            var n = out ? out.split('\n').filter(function (l) { return l.trim(); }).length : 0;
            counterResult.textContent = L.lineLabel(n);
        }
    });
}
wireDeduplicator();

function wireMinusTool() {
    var buttonStartMinus = document.getElementById('start-minus');
    var buttonGetMinusWords = document.getElementById('get-minus-words');
    var inputElement = document.getElementById('input');
    var resultElement = document.getElementById('result');
    var fieldsetElement = document.getElementById('fieldset');

    if (!(buttonStartMinus && buttonGetMinusWords && inputElement && resultElement && fieldsetElement)) {
        return;
    }

    buttonStartMinus.addEventListener('click', function () {
        fieldsetElement.innerHTML = '';
        var text = inputElement.value.trim();
        var lines = text.split('\n');
        lines = lines.filter(function (line) { return line.trim() !== ''; });

        lines.forEach(function (line) {
            var div = document.createElement('div');
            var checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            div.appendChild(checkbox);

            line.split(' ').forEach(function (rawWord) {
                var word = rawWord.trim();
                if (!word) {
                    return;
                }
                var span = document.createElement('span');
                span.textContent = word + ' ';

                span.addEventListener('click', function () {
                    var pick = word;
                    fieldsetElement.querySelectorAll('span').forEach(function (s) {
                        if (s.textContent.trim() !== pick) {
                            return;
                        }
                        s.classList.toggle('highlighted');
                    });
                });

                div.appendChild(span);
            });

            checkbox.addEventListener('change', function () {
                div.classList.toggle('highlighted', checkbox.checked);
            });

            fieldsetElement.appendChild(div);
        });
    });

    buttonGetMinusWords.addEventListener('click', function () {
        var checkedLines = Array.from(fieldsetElement.querySelectorAll('input[type="checkbox"]:checked'))
            .map(function (checkedBox) {
                var line = Array.from(checkedBox.parentElement.querySelectorAll('span'))
                    .map(function (span) { return span.textContent.trim(); })
                    .join(' ');
                return '[' + line + ']';
            });

        var selectedWords = Array.from(fieldsetElement.querySelectorAll('span.highlighted'))
            .map(function (s) { return s.textContent.trim(); });
        var uniqueWords = Array.from(new Set(selectedWords));

        setTextareaValue(resultElement, checkedLines.concat(uniqueWords).join('\n'));
    });
}
wireMinusTool();

function wireWhitelistButton() {
    var buttonGetWhiteList = document.getElementById('get-white-list');
    var fieldsetElement = document.getElementById('fieldset');
    var resultElement = document.getElementById('result');
    if (!(buttonGetWhiteList && fieldsetElement && resultElement)) {
        return;
    }
    buttonGetWhiteList.addEventListener('click', function () {
        var whiteList = Array.from(fieldsetElement.children).filter(function (div) {
            var hasChecked = div.querySelector('input[type="checkbox"]:checked');
            var hasHighlighted = div.querySelector('span.highlighted');
            return !hasChecked && !hasHighlighted;
        }).map(function (div) {
            return Array.from(div.querySelectorAll('span'))
                .map(function (span) { return span.textContent.trim(); })
                .join(' ');
        });
        setTextareaValue(resultElement, whiteList.join('\n'));
    });
}
wireWhitelistButton();

function toTranslit(text) {
    var s = text == null ? '' : String(text);
    var map = {
        'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo',
        'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'j', 'к': 'k', 'л': 'l', 'м': 'm',
        'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
        'ф': 'f', 'х': 'kh', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch',
        'ъ': '\'', 'ы': 'y', 'ь': '\'', 'э': 'e', 'ю': 'yu', 'я': 'ya',
        'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'G', 'Д': 'D', 'Е': 'E', 'Ё': 'Yo',
        'Ж': 'Zh', 'З': 'Z', 'И': 'I', 'Й': 'J', 'К': 'K', 'Л': 'L', 'М': 'M',
        'Н': 'N', 'О': 'O', 'П': 'P', 'Р': 'R', 'С': 'S', 'Т': 'T', 'У': 'U',
        'Ф': 'F', 'Х': 'Kh', 'Ц': 'Ts', 'Ч': 'Ch', 'Ш': 'Sh', 'Щ': 'Sch',
        'Ъ': '\'', 'Ы': 'Y', 'Ь': '\'', 'Э': 'E', 'Ю': 'Yu', 'Я': 'Ya'
    };
    return s.split('').map(function (c) { return map[c] || c; }).join('');
}

function toLayout(text) {
    var s = text == null ? '' : String(text);
    var map = {
        'й': 'q', 'ц': 'w', 'у': 'e', 'к': 'r', 'е': 't', 'н': 'y', 'г': 'u',
        'ш': 'i', 'щ': 'o', 'з': 'p', 'х': '[', 'ъ': ']', 'ф': 'a', 'ы': 's',
        'в': 'd', 'а': 'f', 'п': 'g', 'р': 'h', 'о': 'j', 'л': 'k', 'д': 'l',
        'ж': ';', 'э': '\'', 'я': 'z', 'ч': 'x', 'с': 'c', 'м': 'v', 'и': 'b',
        'т': 'n', 'ь': 'm', 'б': ',', 'ю': '.',
        'Й': 'Q', 'Ц': 'W', 'У': 'E', 'К': 'R', 'Е': 'T', 'Н': 'Y', 'Г': 'U',
        'Ш': 'I', 'Щ': 'O', 'З': 'P', 'Х': '{', 'Ъ': '}', 'Ф': 'A', 'Ы': 'S',
        'В': 'D', 'А': 'F', 'П': 'G', 'Р': 'H', 'О': 'J', 'Л': 'K', 'Д': 'L',
        'Ж': ':', 'Э': '"', 'Я': 'Z', 'Ч': 'X', 'С': 'C', 'М': 'V', 'И': 'B',
        'Т': 'N', 'Ь': 'M', 'Б': '<', 'Ю': '>'
    };
    return s.split('').map(function (c) { return map[c] || c; }).join('');
}

function normalizeDeclineResponseData(data) {
    if (Array.isArray(data)) {
        return data;
    }
    if (data && typeof data === 'object') {
        if (Array.isArray(data.forms)) {
            return data.forms;
        }
        if (Array.isArray(data.result)) {
            return data.result;
        }
    }
    return [];
}

function buildDeclineOutput(forms, wantTranslit, wantLayout) {
    var linesOut = [];
    forms.forEach(function (form) {
        if (form == null || !String(form).trim()) {
            return;
        }
        var group = [];
        function pushUnique(x) {
            if (x == null || !String(x).trim()) {
                return;
            }
            var v = String(x);
            if (group.indexOf(v) === -1) {
                group.push(v);
            }
        }
        pushUnique(form);
        if (wantTranslit) {
            pushUnique(toTranslit(form));
        }
        if (wantLayout) {
            pushUnique(toLayout(form));
        }
        linesOut.push.apply(linesOut, group);
    });
    return linesOut.join('\n');
}

function declineTransformOptionChecked(id) {
    var el = document.getElementById(id);
    return !!(el && el.checked);
}

function applyTransforms() {
    var resultEl = document.getElementById('result');
    if (!resultEl) {
        return;
    }
    if (!originalForms.length) {
        return;
    }
    var wantTranslit = declineTransformOptionChecked('addTranslit');
    var wantLayout = declineTransformOptionChecked('addLayout');
    setTextareaValue(resultEl, buildDeclineOutput(originalForms, wantTranslit, wantLayout));
}

document.addEventListener('change', function (e) {
    var t = e.target;
    if (!t || t.type !== 'checkbox') {
        return;
    }
    if (t.id !== 'addTranslit' && t.id !== 'addLayout') {
        return;
    }
    applyTransforms();
});

function syncDeclineCheckboxes(allCheckbox) {
    var byAll = document.getElementById('byAll');
    var byGender = document.getElementById('byGender');
    var byNumber = document.getElementById('byNumber');
    var byCase = document.getElementById('byCase');

    if (!byAll || !byGender || !byNumber || !byCase) {
        return;
    }

    if (allCheckbox && allCheckbox.id === 'byAll') {
        if (byAll.checked) {
            byGender.checked = false;
            byNumber.checked = false;
            byCase.checked = false;
        }
        return;
    }

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

function initDeclineCheckboxes() {
    var byAll = document.getElementById('byAll');
    var byGender = document.getElementById('byGender');
    var byNumber = document.getElementById('byNumber');
    var byCase = document.getElementById('byCase');
    if (!byAll || !byGender || !byNumber || !byCase) {
        return;
    }
    byAll.addEventListener('change', function () { syncDeclineCheckboxes(byAll); });
    byGender.addEventListener('change', function () { syncDeclineCheckboxes(null); });
    byNumber.addEventListener('change', function () { syncDeclineCheckboxes(null); });
    byCase.addEventListener('change', function () { syncDeclineCheckboxes(null); });
    syncDeclineCheckboxes(byAll);
}

function wireInflect() {
    fetch(CONFIG.declineApiUrl.replace('/decline', '/healthz')).catch(function(){});
    var button = document.getElementById('button-inflect');
    var inputEl = document.getElementById('input');
    var resultEl = document.getElementById('result');
    if (!(button && inputEl && resultEl)) {
        return;
    }  
    
    button.addEventListener('click', function () {
        var text = inputEl.value.trim();
        if (!text) {
            originalForms = [];
            setTextareaValue(resultEl, L.declineEmpty);
            return;
        }

        var byAllCheckbox = document.getElementById('byAll');
        var byGender = true;
        var byNumber = true;
        var byCase = true;

        if (byAllCheckbox) {
            var byAll = byAllCheckbox.checked;
            var g = document.getElementById('byGender');
            var n = document.getElementById('byNumber');
            var c = document.getElementById('byCase');
            byGender = byAll || !!(g && g.checked);
            byNumber = byAll || !!(n && n.checked);
            byCase = byAll || !!(c && c.checked);
        }

        fetch(CONFIG.declineApiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: text, byGender: byGender, byNumber: byNumber, byCase: byCase })
        })
            .then(function (res) {
                if (!res.ok) {
                    originalForms = [];
                    setTextareaValue(resultEl, L.serverError(res.status));
                    return Promise.reject(new Error('http'));
                }
                return res.json();
            })
            .then(function (data) {
                var arr = normalizeDeclineResponseData(data);
                var uniqueForms = Array.from(new Set(arr.filter(function (f) { return f; })));
                originalForms = uniqueForms.map(function (f) {
                    return f == null ? '' : String(f);
                });
                if (!originalForms.length) {
                    setTextareaValue(resultEl, '');
                    return;
                }
                applyTransforms();
            })
            .catch(function (err) {
                if (err && err.message === 'http') {
                    return;
                }
                originalForms = [];
                console.error('Decline API error:', err);
                setTextareaValue(resultEl, L.connectionError);
            });
    });
}
wireInflect();

initDeclineCheckboxes();

function initLangPicker() {
    var root = document.querySelector('.lang-picker');
    var btn = root && root.querySelector('.lang-picker-toggle');
    var panel = root && root.querySelector('.lang-picker-panel');
    if (!root || !btn || !panel) {
        return;
    }

    function close() {
        panel.hidden = true;
        btn.setAttribute('aria-expanded', 'false');
    }

    function open() {
        panel.hidden = false;
        btn.setAttribute('aria-expanded', 'true');
    }

    function toggle() {
        if (panel.hidden) {
            open();
        } else {
            close();
        }
    }

    btn.addEventListener('click', function (e) {
        e.stopPropagation();
        toggle();
    });

    document.addEventListener('click', function () {
        close();
    });

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            close();
        }
    });

    window.addEventListener(
        'scroll',
        function () {
            if (!panel.hidden) {
                close();
            }
        },
        true
    );
}
initLangPicker();

function wireCsvUpload(inputId, alertFn) {
    var csvUpload = document.getElementById(inputId);
    if (!csvUpload) {
        return;
    }
    csvUpload.addEventListener('change', function (e) {
        var file = e.target.files && e.target.files[0];
        if (!file) {
            return;
        }
        var reader = new FileReader();
        reader.onload = function (ev) {
            var text = decodePlannerFileBuffer(ev.target.result);
            var keywords = extractKeywordsFromPlannerTsv(text);
            var inputTarget = document.getElementById('input');
            if (keywords.length > 0 && inputTarget) {
                inputTarget.value = keywords.join('\n');
            } else {
                alertFn();
            }
            csvUpload.value = '';
        };
        reader.readAsArrayBuffer(file);
    });
}
wireCsvUpload('csvUpload', function () { alert(L.csvAlertMinus); });
wireCsvUpload('csvUploadQuote', function () { alert(L.csvAlertQuote); });

var exportBtn = document.getElementById('export-csv');
if (exportBtn) {
    exportBtn.addEventListener('click', function () {
        var result = document.getElementById('result');
        if (!result || !result.value.trim()) {
            return;
        }
        var lines = result.value.trim().split('\n');
        downloadKeywordCsv('minus_words.csv', lines);
        var prev = exportBtn.textContent;
        exportBtn.textContent = L.exportSaved;
        setTimeout(function () { exportBtn.textContent = prev || L.exportCsv; }, 1800);
    });
}

var exportCsvQuote = document.getElementById('export-csv-quote');
if (exportCsvQuote) {
    exportCsvQuote.addEventListener('click', function () {
        var result = document.getElementById('result');
        if (!result || !result.value.trim()) {
            return;
        }
        var lines = result.value.trim().split('\n');
        downloadKeywordCsv('keywords.csv', lines);
        var prev = exportCsvQuote.textContent;
        exportCsvQuote.textContent = L.exportSaved;
        setTimeout(function () { exportCsvQuote.textContent = prev || L.exportCsv; }, 1800);
    });
}

var navMenuBtn = document.getElementById('navMenuBtn');
var navDropdown = document.getElementById('navDropdown');
if (navMenuBtn && navDropdown) {
    navMenuBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        var open = navDropdown.classList.toggle('open');
        navMenuBtn.textContent = open ? '✕' : '≡';
    });
    document.addEventListener('click', function (e) {
        if (!navMenuBtn.contains(e.target) && !navDropdown.contains(e.target)) {
            navDropdown.classList.remove('open');
            navMenuBtn.textContent = '≡';
        }
    });
}

var navLogo = document.querySelector('.nav-logo');
if (navLogo) {
    navLogo.addEventListener('click', function () {
        var base = ['[ ]', '" "', 'keyword', 'ppc', 'ads', 'search', 'minus', 'cpc', 'ctr'];
        var particles = base.concat(base);
        var rect = navLogo.getBoundingClientRect();
        var cx = rect.left + rect.width / 2;
        var cy = rect.top + rect.height / 2;

        particles.forEach(function (text) {
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
    });
}

var feedbackModal = document.getElementById('feedbackModal');
var feedbackClose = document.getElementById('feedbackClose');
var feedbackForm = document.getElementById('feedbackForm');
var feedbackMsgBox = document.getElementById('feedbackMessage');

function loadRecaptchaScript(onLoad) {
    if (typeof grecaptcha !== 'undefined' && grecaptcha.execute) {
        if (onLoad) {
            onLoad();
        }
        return;
    }
    var existing = document.getElementById('recaptcha-sdk');
    if (existing) {
        if (onLoad) {
            existing.addEventListener('load', onLoad, { once: true });
        }
        return;
    }
    var script = document.createElement('script');
    script.id = 'recaptcha-sdk';
    script.async = true;
    script.src = 'https://www.google.com/recaptcha/api.js?render=' + encodeURIComponent(CONFIG.recaptchaSiteKey);
    if (onLoad) {
        script.addEventListener('load', onLoad, { once: true });
    }
    document.head.appendChild(script);
}

if (feedbackModal && feedbackClose && feedbackForm && feedbackMsgBox) {
    feedbackForm.addEventListener('focusin', function () {
        loadRecaptchaScript();
    }, { once: true });

    var origOpen = window.openFeedbackForm;
    window.openFeedbackForm = function () {
        loadRecaptchaScript();
        if (typeof origOpen === 'function') {
            origOpen();
        }
        feedbackModal.classList.remove('hidden');
    };

    feedbackClose.addEventListener('click', function () {
        feedbackModal.classList.add('hidden');
    });

    feedbackModal.addEventListener('click', function (e) {
        if (e.target === feedbackModal) {
            feedbackModal.classList.add('hidden');
        }
    });

    feedbackForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var commentEl = document.getElementById('feedbackComment');
        var contactEl = document.getElementById('feedbackContact');
        var comment = commentEl ? commentEl.value.trim() : '';
        var contact = contactEl ? contactEl.value.trim() : '';
        if (!comment) {
            return;
        }

        var hint = document.getElementById('gtm-bottom-right-hint');
        if (hint) {
            hint.remove();
        }

        var submitBtn = feedbackForm.querySelector('.feedback-submit');
        if (!submitBtn) {
            return;
        }
        submitBtn.disabled = true;
        submitBtn.textContent = L.verify;

        function submitWithToken(token) {
            submitBtn.textContent = L.sending;
            fetch(CONFIG.feedbackSubmitUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    comment: comment,
                    contact: contact,
                    url: window.location.href,
                    recaptcha_token: token
                })
            })
                .then(function (res) {
                    if (!res.ok) {
                        throw new Error('http');
                    }
                    return res.json();
                })
                .then(function (data) {
                    if (!data || data.ok === false) {
                        throw new Error('api');
                    }
                    feedbackForm.style.display = 'none';
                    feedbackMsgBox.innerHTML =
                        '<div class="feedback-success">' +
                        '<div class="feedback-success-icon">✓</div>' +
                        '<div class="feedback-success-title">' + L.thanks + '</div>' +
                        '<div class="feedback-success-text">' + L.feedbackOk + '</div>' +
                        '</div>';
                    setTimeout(function () {
                        feedbackModal.classList.add('hidden');
                        setTimeout(function () {
                            feedbackForm.style.display = '';
                            feedbackMsgBox.innerHTML = '';
                            feedbackForm.reset();
                            submitBtn.disabled = false;
                            submitBtn.textContent = L.submit;
                        }, 300);
                    }, 2500);
                })
                .catch(function () {
                    feedbackMsgBox.textContent = L.feedbackErr;
                    submitBtn.disabled = false;
                    submitBtn.textContent = L.submit;
                });
        }

        loadRecaptchaScript(function () {
            if (typeof grecaptcha === 'undefined' || !grecaptcha.execute) {
                feedbackMsgBox.textContent = L.feedbackErr;
                submitBtn.disabled = false;
                submitBtn.textContent = L.submit;
                return;
            }
            grecaptcha.ready(function () {
                grecaptcha.execute(CONFIG.recaptchaSiteKey, { action: 'feedback' })
                    .then(submitWithToken)
                    .catch(function () {
                        feedbackMsgBox.textContent = L.feedbackErr;
                        submitBtn.disabled = false;
                        submitBtn.textContent = L.submit;
                    });
            });
        });
    });
}
