'use strict';

// API_ORIGIN can be overridden per-page via <meta name="api-origin" content="…">
// — handy for local/staging overrides without editing this file. The default
// points at our own Cloudflare-proxied custom domain, not the raw Cloud Run URL,
// so the URL stays stable even if we move the backend.
var API_ORIGIN = (function () {
    try {
        var meta = document.querySelector('meta[name="api-origin"]');
        if (meta && meta.content) {
            return meta.content.trim().replace(/\/+$/, '');
        }
    } catch (e) { /* ignore */ }
    return 'https://api.qoutter.cloud';
})();

var CONFIG = {
    declineApiUrl: API_ORIGIN + '/decline',
    extractApiUrl: API_ORIGIN + '/extract',
    feedbackSubmitUrl: API_ORIGIN + '/submit',
    recaptchaSiteKey: '6Lch7H8sAAAAAK9ayTdPK7pwgOcCnm3DJLoI15Mk'
};

var DOC_LANG = (document.documentElement.getAttribute('lang') || 'ru').split('-')[0].toLowerCase();

var DECLINE_LANG = DOC_LANG === 'uk' ? 'uk' : (DOC_LANG === 'pl' ? 'pl' : 'ru');

function declineMorphLang() {
    var p = (typeof window !== 'undefined' && window.location && window.location.pathname) ? window.location.pathname : '';
    if (p.indexOf('/pl/') !== -1) {
        return 'pl';
    }
    if (p.indexOf('/uk/') !== -1) {
        return 'uk';
    }
    return DECLINE_LANG;
}

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
        inflectLoading: 'Inflecting…',
        serverError: function (s) { return 'Server error: ' + s; },
        connectionError: 'Could not reach the server',
        tooManyRequests: 'Too many requests — take a short break and try again.',
        tooLong: 'The text is too long. Try splitting it into smaller parts.',
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
        inflectLoading: 'Склоняем…',
        serverError: function (s) { return 'Ошибка сервера: ' + s; },
        connectionError: 'Ошибка при соединении с сервером',
        tooManyRequests: 'Слишком много запросов — подождите минуту и попробуйте снова.',
        tooLong: 'Текст слишком длинный. Попробуйте разбить его на части.',
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
        inflectLoading: 'Склонім…',
        serverError: function (s) { return 'Памылка сервера: ' + s; },
        connectionError: 'Не атрымалася звязацца з серверам',
        tooManyRequests: 'Занадта шмат запытаў — пачакайце хвіліну і паспрабуйце зноў.',
        tooLong: 'Тэкст занадта доўгі. Паспрабуйце разбіць яго на часткі.',
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
        inflectLoading: 'Відмінюємо…',
        serverError: function (s) { return 'Помилка сервера: ' + s; },
        connectionError: 'Не вдалося зв’язатися з сервером',
        tooManyRequests: 'Забагато запитів — зачекайте хвилину і спробуйте знову.',
        tooLong: 'Текст задовгий. Спробуйте розбити його на частини.',
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
        inflectLoading: 'Odmieniamy…',
        serverError: function (s) { return 'Błąd serwera: ' + s; },
        connectionError: 'Nie udało się połączyć z serwerem',
        tooManyRequests: 'Za dużo zapytań — poczekaj chwilę i spróbuj ponownie.',
        tooLong: 'Tekst jest za długi. Spróbuj podzielić go na mniejsze części.',
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
        inflectLoading: 'Септіреміз…',
        serverError: function (s) { return 'Сервер қатесі: ' + s; },
        connectionError: 'Серверге қосылу мүмкін болмады',
        tooManyRequests: 'Сұрау саны тым көп — бір минут күтіп, қайталап көріңіз.',
        tooLong: 'Мәтін тым ұзын. Оны бөліктерге бөліп көріңіз.',
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

function lineWordUnit(n) {
    var lang = DOC_LANG || 'ru';
    if (lang === 'ru') {
        var n100ru = n % 100;
        var n10ru = n % 10;
        if (n100ru >= 11 && n100ru <= 14) {
            return 'слов';
        }
        if (n10ru === 1) {
            return 'слово';
        }
        if (n10ru >= 2 && n10ru <= 4) {
            return 'слова';
        }
        return 'слов';
    }
    if (lang === 'uk') {
        var n100uk = n % 100;
        var n10uk = n % 10;
        if (n100uk >= 11 && n100uk <= 14) {
            return 'слів';
        }
        if (n10uk === 1) {
            return 'слово';
        }
        if (n10uk >= 2 && n10uk <= 4) {
            return 'слова';
        }
        return 'слів';
    }
    if (lang === 'pl') {
        if (n === 1) {
            return 'słowo';
        }
        var n100pl = n % 100;
        var n10pl = n % 10;
        if (n100pl >= 12 && n100pl <= 14) {
            return 'słów';
        }
        if (n10pl >= 2 && n10pl <= 4) {
            return 'słowa';
        }
        return 'słów';
    }
    if (lang === 'be') {
        return 'слоў';
    }
    if (lang === 'kk') {
        return 'сөз';
    }
    return n === 1 ? 'word' : 'words';
}

function countLinesAndWords(text) {
    var value = text == null ? '' : String(text);
    var lines = value.split(/\r?\n/).map(function (line) {
        return line.trim();
    }).filter(Boolean);
    var words = 0;
    lines.forEach(function (line) {
        words += line.split(/\s+/).filter(Boolean).length;
    });
    return {
        lines: lines.length,
        words: words
    };
}

function formatLineWordCounter(text) {
    var stats = countLinesAndWords(text);
    return L.lineLabel(stats.lines) + ' : ' + stats.words + ' ' + lineWordUnit(stats.words);
}

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

var KEYWORD_COLUMN_ALIASES = [
    'keyword', 'keywords',
    'search term', 'search terms', 'search query', 'search queries',
    'поисковый запрос', 'поисковые запросы',
    'ключевое слово', 'ключевые слова',
    'пошуковий запит', 'пошукові запити',
    'ключове слово', 'ключові слова',
    'słowo kluczowe', 'słowa kluczowe',
    'wyszukiwane hasło', 'hasła wyszukiwania', 'zapytanie', 'zapytania',
    'ключавое слова', 'ключавыя словы', 'пошукавы запыт',
    'кілт сөз', 'кілт сөздер', 'іздеу сұранысы', 'іздеу сұраныстары'
];

var TOTAL_ROW_RE = /^(итого|итог|total|totals|загалом|разом|всього|сума|suma|sumie|łącznie|yhteensä|барлығы|жиынтығы)\s*[\(:]/i;

function parseCsvRow(line, delimiter) {
    var out = [];
    var cur = '';
    var inQuote = false;
    for (var i = 0; i < line.length; i++) {
        var ch = line.charAt(i);
        if (inQuote) {
            if (ch === '"') {
                if (i + 1 < line.length && line.charAt(i + 1) === '"') {
                    cur += '"';
                    i++;
                } else {
                    inQuote = false;
                }
            } else {
                cur += ch;
            }
        } else if (ch === '"') {
            inQuote = true;
        } else if (ch === delimiter) {
            out.push(cur);
            cur = '';
        } else {
            cur += ch;
        }
    }
    out.push(cur);
    return out;
}

function detectPlannerDelimiter(lines) {
    var candidates = ['\t', ',', ';'];
    var best = null;
    var bestScore = 0;
    var sampleLimit = 0;
    for (var c = 0; c < candidates.length; c++) {
        var d = candidates[c];
        var maxInLine = 0;
        sampleLimit = 0;
        for (var i = 0; i < lines.length && sampleLimit < 30; i++) {
            var line = lines[i];
            if (!line.trim()) {
                continue;
            }
            sampleLimit++;
            var count = 0;
            var inQuote = false;
            for (var j = 0; j < line.length; j++) {
                var ch = line.charAt(j);
                if (ch === '"') {
                    inQuote = !inQuote;
                } else if (!inQuote && ch === d) {
                    count++;
                }
            }
            if (count > maxInLine) {
                maxInLine = count;
            }
        }
        if (maxInLine > bestScore) {
            bestScore = maxInLine;
            best = d;
        }
    }
    return { delimiter: best, score: bestScore };
}

function findKeywordColumnIndex(cells) {
    for (var i = 0; i < cells.length; i++) {
        var v = String(cells[i] || '').trim().toLowerCase().replace(/^\uFEFF/, '');
        if (KEYWORD_COLUMN_ALIASES.indexOf(v) !== -1) {
            return i;
        }
    }
    return -1;
}

function collectPlainKeywordList(lines) {
    var out = [];
    for (var i = 0; i < lines.length; i++) {
        var raw = String(lines[i] || '').trim();
        if (!raw) {
            continue;
        }
        if (TOTAL_ROW_RE.test(raw)) {
            continue;
        }
        out.push(raw);
    }
    return out;
}

function extractKeywordsFromRows(rows) {
    var keywords = [];
    var headerFound = false;
    var kwIndex = -1;

    for (var i = 0; i < rows.length; i++) {
        var cells = rows[i];
        if (!cells || !cells.length) {
            continue;
        }
        var anyCell = false;
        for (var a = 0; a < cells.length; a++) {
            if (String(cells[a] || '').trim()) {
                anyCell = true;
                break;
            }
        }
        if (!anyCell) {
            continue;
        }
        if (!headerFound) {
            var idx = findKeywordColumnIndex(cells);
            if (idx !== -1) {
                kwIndex = idx;
                headerFound = true;
            }
            continue;
        }
        var kw = String(cells[kwIndex] || '').trim();
        if (!kw) {
            continue;
        }
        if (TOTAL_ROW_RE.test(kw)) {
            continue;
        }
        keywords.push(kw);
    }

    if (headerFound) {
        return keywords;
    }

    var fallback = [];
    for (var j = 0; j < rows.length; j++) {
        var row = rows[j];
        if (!row || !row.length) {
            continue;
        }
        var first = String(row[0] || '').trim();
        if (!first) {
            continue;
        }
        if (TOTAL_ROW_RE.test(first)) {
            continue;
        }
        fallback.push(first);
    }
    return fallback;
}

function extractKeywordsFromPlannerTsv(text) {
    var clean = (text || '').replace(/^\uFEFF/, '');
    var lines = clean.split(/\r?\n/);
    var detection = detectPlannerDelimiter(lines);

    if (!detection.delimiter || detection.score === 0) {
        return collectPlainKeywordList(lines);
    }

    var rows = [];
    for (var i = 0; i < lines.length; i++) {
        if (!lines[i].trim()) {
            continue;
        }
        rows.push(parseCsvRow(lines[i], detection.delimiter));
    }
    return extractKeywordsFromRows(rows);
}

var _xlsxLibPromise = null;
function loadXlsxLib() {
    if (typeof window !== 'undefined' && window.XLSX) {
        return Promise.resolve(window.XLSX);
    }
    if (_xlsxLibPromise) {
        return _xlsxLibPromise;
    }
    _xlsxLibPromise = new Promise(function (resolve, reject) {
        var script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
        script.async = true;
        script.onload = function () {
            if (window.XLSX) {
                resolve(window.XLSX);
            } else {
                reject(new Error('XLSX library failed to initialise'));
            }
        };
        script.onerror = function () {
            _xlsxLibPromise = null;
            reject(new Error('XLSX library failed to load'));
        };
        document.head.appendChild(script);
    });
    return _xlsxLibPromise;
}

function extractKeywordsFromXlsxBuffer(arrayBuffer) {
    return loadXlsxLib().then(function (XLSX) {
        var wb = XLSX.read(arrayBuffer, { type: 'array' });
        if (!wb || !wb.SheetNames || !wb.SheetNames.length) {
            return [];
        }
        var sheet = wb.Sheets[wb.SheetNames[0]];
        if (!sheet) {
            return [];
        }
        var rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' });
        return extractKeywordsFromRows(rows);
    });
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
        ta.className = 'clipboard-fallback-textarea';
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
            customWrap.classList.toggle('is-hidden', modeElement.value !== 'custom');
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
        if (typeof window !== 'undefined' && typeof window.updateDeclineCounters === 'function') {
            window.updateDeclineCounters();
        }
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

var selectAllResultBtn = document.getElementById('selectAllResult');
if (selectAllResultBtn) {
    selectAllResultBtn.addEventListener('click', function () {
        var result = document.getElementById('result');
        if (!result) {
            return;
        }
        result.focus();
        result.select();
        if (typeof result.setSelectionRange === 'function') {
            result.setSelectionRange(0, result.value.length);
        }
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
    try {
        s = s.normalize('NFC');
    } catch (err) {
    }
    var map = {
        'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo',
        'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'j', 'к': 'k', 'л': 'l', 'м': 'm',
        'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
        'ф': 'f', 'х': 'kh', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch',
        'ъ': '\'', 'ы': 'y', 'ь': '\'', 'э': 'e', 'ю': 'yu', 'я': 'ya',
        'і': 'i', 'ї': 'yi', 'є': 'ye', 'ґ': 'g',
        'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'G', 'Д': 'D', 'Е': 'E', 'Ё': 'Yo',
        'Ж': 'Zh', 'З': 'Z', 'И': 'I', 'Й': 'J', 'К': 'K', 'Л': 'L', 'М': 'M',
        'Н': 'N', 'О': 'O', 'П': 'P', 'Р': 'R', 'С': 'S', 'Т': 'T', 'У': 'U',
        'Ф': 'F', 'Х': 'Kh', 'Ц': 'Ts', 'Ч': 'Ch', 'Ш': 'Sh', 'Щ': 'Sch',
        'Ъ': '\'', 'Ы': 'Y', 'Ь': '\'', 'Э': 'E', 'Ю': 'Yu', 'Я': 'Ya',
        'І': 'I', 'Ї': 'Yi', 'Є': 'Ye', 'Ґ': 'G',
        'ą': 'a', 'ć': 'c', 'ę': 'e', 'ł': 'l', 'ń': 'n', 'ó': 'o', 'ś': 's', 'ź': 'z', 'ż': 'z',
        'Ą': 'A', 'Ć': 'C', 'Ę': 'E', 'Ł': 'L', 'Ń': 'N', 'Ó': 'O', 'Ś': 'S', 'Ź': 'Z', 'Ż': 'Z'
    };
    return s.split('').map(function (c) { return map[c] || c; }).join('');
}

var RU_KEYBOARD_LAYOUT_MAP = {
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

var _ruLayoutLatToCyrCache = null;
function ruLayoutLatToCyrMap() {
    if (_ruLayoutLatToCyrCache) {
        return _ruLayoutLatToCyrCache;
    }
    var inv = {};
    for (var cyr in RU_KEYBOARD_LAYOUT_MAP) {
        if (!Object.prototype.hasOwnProperty.call(RU_KEYBOARD_LAYOUT_MAP, cyr)) {
            continue;
        }
        var lat = RU_KEYBOARD_LAYOUT_MAP[cyr];
        if (!(lat in inv)) {
            inv[lat] = cyr;
        }
    }
    _ruLayoutLatToCyrCache = inv;
    return inv;
}

function toLayoutLatinAsRuKeys(text) {
    var s = text == null ? '' : String(text);
    try {
        s = s.normalize('NFC');
    } catch (err) {
    }
    var inv = ruLayoutLatToCyrMap();
    return s.split('').map(function (c) { return inv[c] || c; }).join('');
}

function toLayout(text) {
    var s = text == null ? '' : String(text);
    return s.split('').map(function (c) { return RU_KEYBOARD_LAYOUT_MAP[c] || c; }).join('');
}

function normalizeDeclineResponseData(data, sourceText) {
    var inputLines = [];
    if (sourceText != null && String(sourceText).trim()) {
        inputLines = String(sourceText).split(/\r?\n/).map(function (l) {
            return l.trim();
        }).filter(Boolean);
    }
    var langIsRu = declineMorphLang() === 'ru';

    if (data && typeof data === 'object' && !Array.isArray(data) && Array.isArray(data.lines)) {
        var flat = [];
        data.lines.forEach(function (chunk, i) {
            if (!chunk || !chunk.length) {
                return;
            }
            var row = chunk.map(function (f) {
                return f == null ? '' : String(f);
            }).filter(function (s) {
                return s;
            });
            if (langIsRu && i < inputLines.length) {
                var lt = inputLines[i];
                if (lt.indexOf('ё') === -1 && lt.indexOf('Ё') === -1) {
                    row = row.map(function (s) {
                        return s.replace(/Ё/g, 'Е').replace(/ё/g, 'е');
                    });
                }
            }
            row.forEach(function (s) {
                if (flat.indexOf(s) === -1) {
                    flat.push(s);
                }
            });
        });
        return flat;
    }
    if (Array.isArray(data)) {
        return data;
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
            if (DOC_LANG === 'pl') {
                pushUnique(toLayoutLatinAsRuKeys(form));
            } else {
                pushUnique(toLayout(form));
            }
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
    if (typeof window !== 'undefined' && typeof window.updateDeclineCounters === 'function') {
        window.updateDeclineCounters();
    }
}

function initDeclineCounters() {
    var inputEl = document.getElementById('input');
    var resultEl = document.getElementById('result');
    var inputStatsEl = document.getElementById('declineInputStats');
    var resultStatsEl = document.getElementById('declineResultStats');
    var inflectBtn = document.getElementById('button-inflect');
    if (!(inputEl && resultEl && inputStatsEl && resultStatsEl && inflectBtn)) {
        return;
    }

    function update() {
        inputStatsEl.textContent = formatLineWordCounter(inputEl.value);
        resultStatsEl.textContent = formatLineWordCounter(resultEl.value);
    }

    inputEl.addEventListener('input', update);
    resultEl.addEventListener('input', update);
    window.updateDeclineCounters = update;
    update();
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
    var byTense = document.getElementById('byTense');

    if (!byAll || !byGender || !byNumber || !byCase) {
        return;
    }

    if (allCheckbox && allCheckbox.id === 'byAll') {
        if (byAll.checked) {
            byGender.checked = false;
            byNumber.checked = false;
            byCase.checked = false;
            if (byTense) {
                byTense.checked = false;
            }
        } else {
            byAll.checked = true;
        }
        return;
    }

    var tenseOn = byTense ? byTense.checked : false;
    var allOptionsChecked = byGender.checked && byNumber.checked && byCase.checked && tenseOn;
    if (!byTense) {
        allOptionsChecked = byGender.checked && byNumber.checked && byCase.checked;
    }
    if (allOptionsChecked) {
        byAll.checked = true;
        byGender.checked = false;
        byNumber.checked = false;
        byCase.checked = false;
        if (byTense) {
            byTense.checked = false;
        }
    } else if (byGender.checked || byNumber.checked || byCase.checked || tenseOn) {
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
    var byTense = document.getElementById('byTense');
    if (!byAll || !byGender || !byNumber || !byCase) {
        return;
    }
    byAll.addEventListener('change', function () { syncDeclineCheckboxes(byAll); });
    byGender.addEventListener('change', function () { syncDeclineCheckboxes(null); });
    byNumber.addEventListener('change', function () { syncDeclineCheckboxes(null); });
    byCase.addEventListener('change', function () { syncDeclineCheckboxes(null); });
    if (byTense) {
        byTense.addEventListener('change', function () { syncDeclineCheckboxes(null); });
    }
    syncDeclineCheckboxes(byAll);
}

function setDeclineInflectBusy(button, busy, statusLabel) {
    if (!button) {
        return;
    }
    var labelEl = button.querySelector('.btn-inflect-label');
    if (busy) {
        button.disabled = true;
        button.classList.add('is-loading');
        button.setAttribute('aria-busy', 'true');
        if (labelEl) {
            labelEl.textContent = statusLabel || L.inflectLoading;
        }
    } else {
        button.disabled = false;
        button.classList.remove('is-loading');
        button.setAttribute('aria-busy', 'false');
        var defLabel = button.getAttribute('data-label-default');
        if (labelEl) {
            labelEl.textContent = defLabel || '✦ Склонять';
        }
    }
}

function pushDeclineApiResult(payload) {
    if (typeof window === 'undefined') {
        return;
    }
    var p = payload || {};
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
        event: 'decline_api_result',
        endpoint: 'decline',
        page_lang: DOC_LANG || 'ru',
        ok: p.ok,
        status: p.status,
        error_type: p.error_type,
        error_message: p.error_message,
        text_len: p.text_len,
        by_gender: p.by_gender,
        by_number: p.by_number,
        by_case: p.by_case,
        by_tense: p.by_tense,
        payload: p
    });
}

function wireInflect() {
    var button = document.getElementById('button-inflect');
    var inputEl = document.getElementById('input');
    var resultEl = document.getElementById('result');
    if (!(button && inputEl && resultEl)) {
        return;
    }

    button.addEventListener('click', function () {
        if (button.disabled) {
            return;
        }

        var text = inputEl.value.trim();
        if (!text) {
            originalForms = [];
            setTextareaValue(resultEl, L.declineEmpty);
            if (typeof window !== 'undefined' && typeof window.updateDeclineCounters === 'function') {
                window.updateDeclineCounters();
            }
            return;
        }

        var byAllCheckbox = document.getElementById('byAll');
        var byGender = true;
        var byNumber = true;
        var byCase = true;
        var byTense = true;

        if (byAllCheckbox) {
            var byAll = byAllCheckbox.checked;
            var g = document.getElementById('byGender');
            var n = document.getElementById('byNumber');
            var c = document.getElementById('byCase');
            var t = document.getElementById('byTense');
            byGender = byAll || !!(g && g.checked);
            byNumber = byAll || !!(n && n.checked);
            byCase = byAll || !!(c && c.checked);
            byTense = byAll || !!(t && t.checked);
        }

        setDeclineInflectBusy(button, true, L.inflectLoading);

        fetch(CONFIG.declineApiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: text,
                lang: declineMorphLang(),
                byGender: byGender,
                byNumber: byNumber,
                byCase: byCase,
                byTense: byTense
            })
        })
            .then(function (res) {
                if (!res.ok) {
                    originalForms = [];
                    pushDeclineApiResult({
                        ok: false,
                        status: res.status,
                        error_type: 'http_error',
                        text_len: text.length,
                        by_gender: byGender,
                        by_number: byNumber,
                        by_case: byCase,
                        by_tense: byTense
                    });
                    var msg = res.status === 429 ? L.tooManyRequests
                        : res.status === 413 ? L.tooLong
                        : L.serverError(res.status);
                    setTextareaValue(resultEl, msg);
                    if (typeof window !== 'undefined' && typeof window.updateDeclineCounters === 'function') {
                        window.updateDeclineCounters();
                    }
                    return Promise.reject(new Error('http'));
                }
                pushDeclineApiResult({
                    ok: true,
                    status: res.status,
                    error_type: '',
                    text_len: text.length,
                    by_gender: byGender,
                    by_number: byNumber,
                    by_case: byCase,
                    by_tense: byTense
                });
                return res.json();
            })
            .then(function (data) {
                var arr = normalizeDeclineResponseData(data, text);
                var uniqueForms = Array.from(new Set(arr.filter(function (f) { return f; })));
                originalForms = uniqueForms.map(function (f) {
                    return f == null ? '' : String(f);
                });
                if (!originalForms.length) {
                    setTextareaValue(resultEl, '');
                    if (typeof window !== 'undefined' && typeof window.updateDeclineCounters === 'function') {
                        window.updateDeclineCounters();
                    }
                    return;
                }
                applyTransforms();
            })
            .catch(function (err) {
                if (err && err.message === 'http') {
                    return;
                }
                pushDeclineApiResult({
                    ok: false,
                    status: 'network_error',
                    error_type: 'network_error',
                    text_len: text.length,
                    by_gender: byGender,
                    by_number: byNumber,
                    by_case: byCase,
                    by_tense: byTense,
                    error_message: err && err.message ? String(err.message) : ''
                });
                originalForms = [];
                console.error('Decline API error:', err);
                setTextareaValue(resultEl, L.connectionError);
                if (typeof window !== 'undefined' && typeof window.updateDeclineCounters === 'function') {
                    window.updateDeclineCounters();
                }
            })
            .finally(function () {
                setDeclineInflectBusy(button, false);
            });
    });
}
wireInflect();
initDeclineCounters();

initDeclineCheckboxes();

function initNavMore() {
    var root = document.querySelector('.nav-more');
    var btn = root && root.querySelector('.nav-more-toggle');
    var panel = root && root.querySelector('.nav-more-panel');
    if (!root || !btn || !panel) {
        return;
    }

    var hasActiveItem = !!panel.querySelector('a.active');
    if (hasActiveItem) {
        btn.classList.add('is-active');
    }

    function close() {
        panel.hidden = true;
        btn.setAttribute('aria-expanded', 'false');
    }

    function open() {
        panel.hidden = false;
        btn.setAttribute('aria-expanded', 'true');
    }

    btn.addEventListener('click', function (e) {
        e.stopPropagation();
        if (panel.hidden) {
            open();
        } else {
            close();
        }
    });

    document.addEventListener('click', function (e) {
        if (!root.contains(e.target)) {
            close();
        }
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
initNavMore();

function wireExtractor() {
    var input = document.getElementById('input');
    var extractBtn = document.getElementById('button-extract');
    var groupsRoot = document.getElementById('extractGroups');
    var masterWrap = document.getElementById('extractMaster');
    var masterCheckbox = document.getElementById('extractMasterCheckbox');
    var masterCount = document.getElementById('extractMasterCount');
    var actionsRoot = document.getElementById('extractActions');
    var copyBtn = document.getElementById('extract-copy-selected');
    var removeBtn = document.getElementById('extract-remove-selected');
    var cleanResult = document.getElementById('clean-result');
    var cleanSection = document.getElementById('cleanSection');
    var busyEl = document.getElementById('extractBusy');
    var emptyEl = document.getElementById('extractEmpty');
    var counterEl = document.getElementById('counter-clean');

    if (!(input && extractBtn && groupsRoot)) {
        return;
    }

    var state = {
        groups: []
    };

    function updateUiState() {
        var totalSelected = 0;
        var totalItems = 0;
        state.groups.forEach(function (g) {
            totalItems += g.items.length;
            g.items.forEach(function (it) {
                if (it.selected) {
                    totalSelected++;
                }
            });
        });

        state.groups.forEach(function (g) {
            var allSel = g.items.length > 0 && g.items.every(function (it) { return it.selected; });
            var anySel = g.items.some(function (it) { return it.selected; });
            g.groupEl.classList.toggle('is-active', anySel);
            if (g.checkbox) {
                g.checkbox.checked = allSel;
                g.checkbox.indeterminate = !allSel && anySel;
            }
            if (g.selectedEl) {
                var count = g.items.filter(function (it) { return it.selected; }).length;
                g.selectedEl.textContent = count > 0 ? (count + ' из ' + g.items.length) : '';
            }
        });

        if (masterCheckbox) {
            var allAllSel = totalItems > 0 && totalSelected === totalItems;
            var anyAllSel = totalSelected > 0;
            masterCheckbox.checked = allAllSel;
            masterCheckbox.indeterminate = !allAllSel && anyAllSel;
            masterWrap.classList.toggle('is-active', anyAllSel);
            if (masterCount) {
                masterCount.textContent = totalSelected + ' / ' + totalItems + ' выбрано';
            }
        }

        if (removeBtn) {
            removeBtn.disabled = totalSelected === 0;
        }
        if (copyBtn) {
            copyBtn.disabled = totalSelected === 0;
        }
    }

    function toggleItem(item) {
        item.selected = !item.selected;
        item.chipEl.classList.toggle('is-selected', item.selected);
        updateUiState();
    }

    function setGroupSelected(g, selected) {
        g.items.forEach(function (it) {
            it.selected = selected;
            it.chipEl.classList.toggle('is-selected', it.selected);
        });
        updateUiState();
    }

    function setAllSelected(selected) {
        state.groups.forEach(function (g) {
            setGroupSelected(g, selected);
        });
    }

    function renderGroups(apiGroups) {
        groupsRoot.innerHTML = '';
        state.groups = [];

        var hasGroups = !!(apiGroups && apiGroups.length);

        if (!hasGroups) {
            if (emptyEl) {
                emptyEl.style.display = 'block';
                emptyEl.textContent = 'Ничего не нашли. Попробуйте другой текст или уточните формулировку.';
            }
            updateUiState();
            return;
        }

        if (emptyEl) emptyEl.style.display = 'none';

        apiGroups.forEach(function (g) {
            if (!g.items || !g.items.length) {
                return;
            }

            var groupEl = document.createElement('div');
            groupEl.className = 'extract-group';

            var header = document.createElement('label');
            header.className = 'extract-group-header';

            var cb = document.createElement('input');
            cb.type = 'checkbox';

            var title = document.createElement('span');
            title.className = 'extract-group-title';
            title.textContent = g.label;

            var count = document.createElement('span');
            count.className = 'extract-group-count';
            count.textContent = g.items.length;

            var selectedEl = document.createElement('span');
            selectedEl.className = 'extract-group-selected';

            header.appendChild(cb);
            header.appendChild(title);
            header.appendChild(count);
            header.appendChild(selectedEl);

            var items = document.createElement('div');
            items.className = 'extract-group-items';

            var itemStates = g.items.map(function (value) {
                var chip = document.createElement('button');
                chip.type = 'button';
                chip.className = 'extract-chip';
                chip.textContent = value;
                items.appendChild(chip);
                var item = {
                    value: value,
                    selected: false,
                    chipEl: chip
                };
                chip.addEventListener('click', function () {
                    toggleItem(item);
                });
                return item;
            });

            groupEl.appendChild(header);
            groupEl.appendChild(items);
            groupsRoot.appendChild(groupEl);

            var groupState = {
                id: g.id,
                label: g.label,
                items: itemStates,
                groupEl: groupEl,
                checkbox: cb,
                selectedEl: selectedEl
            };
            state.groups.push(groupState);

            cb.addEventListener('click', function (e) {
                e.stopPropagation();
            });
            cb.addEventListener('change', function () {
                setGroupSelected(groupState, cb.checked);
            });
        });

        updateUiState();
    }

    if (masterCheckbox) {
        masterCheckbox.addEventListener('change', function () {
            setAllSelected(masterCheckbox.checked);
        });
    }

    extractBtn.addEventListener('click', function () {
        var text = input.value.trim();
        if (!text) {
            if (emptyEl) {
                emptyEl.style.display = 'block';
                emptyEl.textContent = 'Введите текст, чтобы извлечь данные.';
            }
            groupsRoot.innerHTML = '';
            state.groups = [];
            updateUiState();
            return;
        }

        extractBtn.disabled = true;
        if (busyEl) busyEl.classList.add('is-visible');
        if (emptyEl) emptyEl.style.display = 'none';
        groupsRoot.innerHTML = '';

        fetch(CONFIG.extractApiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: text })
        })
            .then(function (res) {
                if (!res.ok) {
                    var err = new Error('http_' + res.status);
                    err.status = res.status;
                    return res.text().then(function () { throw err; });
                }
                return res.json();
            })
            .then(function (data) {
                var apiGroups = (data && data.groups) || [];
                renderGroups(apiGroups);
            })
            .catch(function (err) {
                if (emptyEl) {
                    emptyEl.style.display = 'block';
                    var status = err && err.status;
                    emptyEl.textContent = status === 429 ? L.tooManyRequests
                        : status === 413 ? L.tooLong
                        : L.connectionError;
                }
                console.error('Extract API error:', err);
            })
            .finally(function () {
                extractBtn.disabled = false;
                if (busyEl) busyEl.classList.remove('is-visible');
            });
    });

    function collectSelectedTokens() {
        var out = [];
        state.groups.forEach(function (g) {
            g.items.forEach(function (it) {
                if (it.selected) {
                    out.push(it.value);
                }
            });
        });
        return out;
    }

    function escapeRegex(s) {
        return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    function removeTokensWords(sourceText, tokens) {
        if (!tokens.length) return sourceText;
        var sorted = tokens.slice().sort(function (a, b) { return b.length - a.length; });
        var patterns = sorted.map(function (t) {
            return '(?:' + escapeRegex(t) + ')';
        });
        var re = new RegExp('(?<![\\wа-яёА-ЯЁ])(?:' + patterns.join('|') + ')(?![\\wа-яёА-ЯЁ])', 'giu');
        var cleaned = sourceText.replace(re, '');
        cleaned = cleaned.split('\n').map(function (line) {
            return line.replace(/[ \t]{2,}/g, ' ').replace(/^\s+|\s+$/g, '');
        }).join('\n');
        return cleaned;
    }

    function removeTokensLines(sourceText, tokens) {
        if (!tokens.length) return sourceText;
        var sorted = tokens.slice().sort(function (a, b) { return b.length - a.length; });
        var patterns = sorted.map(function (t) {
            return '(?:' + escapeRegex(t) + ')';
        });
        var re = new RegExp('(?<![\\wа-яёА-ЯЁ])(?:' + patterns.join('|') + ')(?![\\wа-яёА-ЯЁ])', 'iu');
        var lines = sourceText.split('\n');
        var kept = lines.filter(function (line) {
            return !re.test(line);
        });
        return kept.join('\n');
    }

    function currentMode() {
        var el = document.querySelector('input[name="extractMode"]:checked');
        return el ? el.value : 'words';
    }

    if (removeBtn) {
        removeBtn.addEventListener('click', function () {
            var tokens = collectSelectedTokens();
            if (!tokens.length) return;
            var sourceText = input.value;
            var mode = currentMode();
            var cleaned;
            if (mode === 'lines') {
                cleaned = removeTokensLines(sourceText, tokens);
            } else {
                cleaned = removeTokensWords(sourceText, tokens);
            }
            cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
            if (cleanResult) {
                setTextareaValue(cleanResult, cleaned);
                cleanResult.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
            if (counterEl) {
                var n = cleaned ? cleaned.split('\n').filter(function (l) { return l.trim(); }).length : 0;
                counterEl.textContent = L.lineLabel(n);
            }
        });
    }

    if (copyBtn) {
        copyBtn.addEventListener('click', function () {
            var tokens = collectSelectedTokens();
            if (!tokens.length) return;
            var text = tokens.join('\n');
            copyTextToClipboard(text).then(function (ok) {
                if (!ok) return;
                window.dataLayer = window.dataLayer || [];
                window.dataLayer.push({ event: 'copy_success' });
                flashCopyButton(copyBtn, null);
            });
        });
    }

    var copyCleanBtn = document.getElementById('copy-clean');
    if (copyCleanBtn && cleanResult) {
        copyCleanBtn.addEventListener('click', function () {
            var text = (cleanResult.value || '').trim();
            if (!text) return;
            copyTextToClipboard(text).then(function (ok) {
                if (!ok) return;
                window.dataLayer = window.dataLayer || [];
                window.dataLayer.push({ event: 'copy_success' });
                flashCopyButton(copyCleanBtn, cleanResult);
            });
        });
    }

    var exportCleanBtn = document.getElementById('export-csv-clean');
    if (exportCleanBtn && cleanResult) {
        exportCleanBtn.addEventListener('click', function () {
            var text = (cleanResult.value || '').trim();
            if (!text) return;
            var lines = text.split('\n').filter(function (l) { return l.trim(); });
            downloadKeywordCsv('cleaned_keywords.csv', lines);
            var prev = exportCleanBtn.textContent;
            exportCleanBtn.textContent = L.exportSaved;
            setTimeout(function () {
                exportCleanBtn.textContent = prev || L.exportCsv;
            }, 1800);
        });
    }

    var clearCleanBtn = document.getElementById('clear-clean');
    if (clearCleanBtn && cleanResult) {
        clearCleanBtn.addEventListener('click', function () {
            setTextareaValue(cleanResult, '');
            if (counterEl) {
                counterEl.textContent = L.lineLabel(0);
            }
        });
    }

    var clearInputBtn = document.getElementById('clear-input');
    if (clearInputBtn) {
        clearInputBtn.addEventListener('click', function () {
            input.value = '';
            input.dispatchEvent(new Event('input', { bubbles: true }));
            groupsRoot.innerHTML = '';
            state.groups = [];
            if (emptyEl) {
                emptyEl.style.display = 'block';
                emptyEl.textContent = 'Нажмите «Извлечь», чтобы увидеть списки имён, гео, дат и других сущностей.';
            }
            if (cleanResult) setTextareaValue(cleanResult, '');
            if (counterEl) counterEl.textContent = L.lineLabel(0);
            updateUiState();
        });
    }
}
wireExtractor();

wireCsvUpload('csvUploadExtract', function () { alert(L.csvAlertQuote); });

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
        var inputTarget = document.getElementById('input');
        var fileName = String(file.name || '').toLowerCase();
        var isExcel = /\.(xlsx|xlsm|xlsb|xls|ods)$/i.test(fileName);

        var applyKeywords = function (keywords) {
            if (keywords && keywords.length > 0 && inputTarget) {
                inputTarget.value = keywords.join('\n');
                try {
                    inputTarget.dispatchEvent(new Event('input', { bubbles: true }));
                } catch (err) {
                    var evt = document.createEvent('Event');
                    evt.initEvent('input', true, true);
                    inputTarget.dispatchEvent(evt);
                }
            } else {
                alertFn();
            }
            csvUpload.value = '';
        };

        var reader = new FileReader();
        reader.onload = function (ev) {
            if (isExcel) {
                extractKeywordsFromXlsxBuffer(ev.target.result)
                    .then(applyKeywords)
                    .catch(function (err) {
                        if (window.console && console.error) {
                            console.error('Excel parse failed:', err);
                        }
                        alertFn();
                        csvUpload.value = '';
                    });
            } else {
                var text = decodePlannerFileBuffer(ev.target.result);
                applyKeywords(extractKeywordsFromPlannerTsv(text));
            }
        };
        reader.onerror = function () {
            alertFn();
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

function initFeedbackStarRating() {
    var form = document.getElementById('feedbackForm');
    if (!form) {
        return;
    }
    var wrap = form.querySelector('.feedback-stars');
    var hidden = document.getElementById('feedbackRating');
    if (!wrap || !hidden) {
        return;
    }
    var stars = wrap.querySelectorAll('.feedback-star');
    function clearHover() {
        stars.forEach(function (btn) {
            btn.classList.remove('is-hover');
        });
    }
    function setHoverUpTo(n) {
        stars.forEach(function (btn, idx) {
            btn.classList.toggle('is-hover', idx < n);
        });
    }
    function applyVisual(value) {
        var v = value >= 1 && value <= 5 ? value : 0;
        hidden.value = v ? String(v) : '';
        stars.forEach(function (btn, idx) {
            btn.classList.toggle('is-on', idx < v);
        });
    }
    function currentValue() {
        var n = parseInt(hidden.value, 10);
        return n >= 1 && n <= 5 ? n : 0;
    }
    wrap.addEventListener('mouseleave', clearHover);
    wrap.addEventListener('focusin', function (e) {
        var t = e.target;
        if (!t.classList || !t.classList.contains('feedback-star')) {
            return;
        }
        var n = parseInt(t.getAttribute('data-value'), 10);
        if (n >= 1 && n <= 5) {
            setHoverUpTo(n);
        }
    });
    wrap.addEventListener('focusout', function (e) {
        if (!wrap.contains(e.relatedTarget)) {
            clearHover();
        }
    });
    stars.forEach(function (btn, idx) {
        var n = idx + 1;
        btn.addEventListener('mouseenter', function () {
            setHoverUpTo(n);
        });
        btn.addEventListener('click', function () {
            var rating = this.getAttribute('data-value');
            if (currentValue() === n) {
                applyVisual(0);
            } else {
                applyVisual(n);
                window.dataLayer = window.dataLayer || [];
                window.dataLayer.push({ feedbackRating: rating });
            }
        });
    });
    form.addEventListener('reset', function () {
        clearHover();
        applyVisual(0);
    });
}
initFeedbackStarRating();

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
        var ratingEl = document.getElementById('feedbackRating');
        var rating = 0;
        if (ratingEl && ratingEl.value) {
            var rv = parseInt(ratingEl.value, 10);
            if (rv >= 1 && rv <= 5) {
                rating = rv;
            }
        }
        if (!comment) {
            return;
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
                    rating: rating,
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
                    feedbackForm.classList.add('feedback-form--hidden');
                    feedbackMsgBox.innerHTML =
                        '<div class="feedback-success">' +
                        '<div class="feedback-success-icon">✓</div>' +
                        '<div class="feedback-success-title">' + L.thanks + '</div>' +
                        '<div class="feedback-success-text">' + L.feedbackOk + '</div>' +
                        '</div>';
                    setTimeout(function () {
                        feedbackModal.classList.add('hidden');
                        setTimeout(function () {
                            feedbackForm.classList.remove('feedback-form--hidden');
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

(function () {
    var SIMILAR_URL = API_ORIGIN + '/similar';
    var RU_RE = /^[а-яА-ЯёЁ-]+$/;

    function extractAllRuWords(text) {
        var seen = {};
        var out = [];
        var lines = String(text || '').split(/\r?\n/);
        for (var i = 0; i < lines.length; i++) {
            var tokens = lines[i].trim().split(/\s+/).filter(Boolean);
            for (var j = 0; j < tokens.length; j++) {
                var w = tokens[j];
                if (!RU_RE.test(w)) continue;
                var key = w.toLowerCase();
                if (seen[key]) continue;
                seen[key] = true;
                out.push(w);
            }
        }
        return out;
    }

    function wordInInput(textarea, word) {
        var text = ' ' + textarea.value.toLowerCase().replace(/\n/g, ' ') + ' ';
        return text.indexOf(' ' + word.toLowerCase() + ' ') >= 0;
    }

    function appendWordToEnd(textarea, word) {
        if (wordInInput(textarea, word)) return;
        var v = textarea.value.replace(/\s+$/, '');
        textarea.value = v ? (v + '\n' + word) : word;
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
    }

    function toggleWordInInput(textarea, word) {
        if (wordInInput(textarea, word)) {
            var lines = textarea.value.split(/\r?\n/);
            var out = [];
            for (var i = 0; i < lines.length; i++) {
                var tokens = lines[i].trim().split(/\s+/).filter(Boolean);
                var filtered = tokens.filter(function (t) {
                    return t.toLowerCase() !== word.toLowerCase();
                });
                if (filtered.length) {
                    out.push(filtered.join(' '));
                } else if (lines[i].trim() === '') {
                    out.push('');
                }
            }
            textarea.value = out.join('\n');
        } else {
            appendWordToEnd(textarea, word);
        }
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
    }

    function refreshAllChipStates(textarea, container) {
        var btns = container.querySelectorAll('.decline-suggest-chip');
        for (var i = 0; i < btns.length; i++) {
            var w = btns[i].getAttribute('data-word');
            if (w) {
                btns[i].classList.toggle('is-in-input', wordInInput(textarea, w));
            }
        }
    }

    function initSimilarWords() {
        var input = document.getElementById('input');
        var btn = document.getElementById('suggestWordsBtn');
        var bubble = document.getElementById('suggestBubble');
        var closeBtn = document.getElementById('suggestBubbleClose');
        var chipsRoot = document.getElementById('suggestChips');
        var statusEl = document.getElementById('suggestStatus');
        var addAll = document.getElementById('suggestAddAll');
        if (!input || !btn || !bubble || !chipsRoot || !statusEl) return;

        var allSuggestionWords = [];

        function setStatus(t) { statusEl.textContent = t || ''; }
        function setBusy(busy) {
            btn.disabled = !!busy;
            btn.classList.toggle('is-loading', !!busy);
            btn.setAttribute('aria-busy', busy ? 'true' : 'false');
        }

        function showBubble() { bubble.hidden = false; }
        function hideBubble() {
            bubble.hidden = true;
            chipsRoot.innerHTML = '';
            setStatus('');
            allSuggestionWords = [];
        }

        function renderResults(results) {
            chipsRoot.innerHTML = '';
            allSuggestionWords = [];
            var hasAny = false;

            results.forEach(function (group) {
                var similar = group.similar || [];
                if (!similar.length) return;
                hasAny = true;

                var section = document.createElement('div');
                section.className = 'decline-suggest-group';

                var heading = document.createElement('div');
                heading.className = 'decline-suggest-group-label';
                heading.textContent = group.used || group.word;
                section.appendChild(heading);

                var wrap = document.createElement('div');
                wrap.className = 'decline-suggest-chips-inner';

                similar.forEach(function (item) {
                    var w = item.word;
                    allSuggestionWords.push(w);
                    var chip = document.createElement('button');
                    chip.type = 'button';
                    chip.className = 'decline-suggest-chip';
                    chip.setAttribute('data-word', w);
                    chip.title = 'Близость: ' + (typeof item.score === 'number' ? item.score.toFixed(3) : '');
                    chip.textContent = w;
                    chip.addEventListener('click', function () {
                        toggleWordInInput(input, w);
                        refreshAllChipStates(input, chipsRoot);
                    });
                    wrap.appendChild(chip);
                });

                section.appendChild(wrap);
                chipsRoot.appendChild(section);
            });

            if (!hasAny) {
                setStatus('Ни одно слово не найдено в модели.');
            }
            refreshAllChipStates(input, chipsRoot);
        }

        input.addEventListener('input', function () {
            refreshAllChipStates(input, chipsRoot);
        });

        if (closeBtn) {
            closeBtn.addEventListener('click', function () {
                hideBubble();
            });
        }

        btn.addEventListener('click', function () {
            var words = extractAllRuWords(input.value).filter(function (w) {
                return w.length >= 2;
            });
            if (!words.length) {
                showBubble();
                setStatus('Введите хотя бы одно русское слово (от 2 букв).');
                chipsRoot.innerHTML = '';
                allSuggestionWords = [];
                return;
            }

            showBubble();
            setBusy(true);
            setStatus('Запрос (' + words.length + ' ' + (words.length === 1 ? 'слово' : 'слов') + ')…');

            fetch(SIMILAR_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ words: words, limit: 15 })
            })
                .then(function (res) {
                    return res.json().then(function (data) {
                        return { ok: res.ok, status: res.status, data: data };
                    });
                })
                .then(function (pack) {
                    if (!pack.ok) {
                        if (pack.status === 503 && pack.data && pack.data.error === 'navec_unavailable') {
                            setStatus('Сервис подсказок недоступен (модель не загружена на сервере).');
                        } else if (pack.status === 429) {
                            setStatus(L.tooManyRequests);
                        } else if (pack.status === 413) {
                            setStatus(L.tooLong);
                        } else {
                            setStatus('Ошибка ' + pack.status);
                        }
                        chipsRoot.innerHTML = '';
                        allSuggestionWords = [];
                        return;
                    }
                    var results = (pack.data && pack.data.results) || [];
                    setStatus('');
                    renderResults(results);
                })
                .catch(function () {
                    setStatus('Нет соединения с сервером.');
                    chipsRoot.innerHTML = '';
                    allSuggestionWords = [];
                })
                .finally(function () {
                    setBusy(false);
                });
        });

        if (addAll) {
            addAll.addEventListener('click', function () {
                allSuggestionWords.forEach(function (w) {
                    appendWordToEnd(input, w);
                });
                refreshAllChipStates(input, chipsRoot);
            });
        }

        var clearBtn = document.getElementById('clear');
        if (clearBtn) {
            clearBtn.addEventListener('click', function () {
                hideBubble();
            });
        }

        var inflectBtn = document.getElementById('button-inflect');
        if (inflectBtn) {
            inflectBtn.addEventListener('click', function () {
                hideBubble();
            });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSimilarWords);
    } else {
        initSimilarWords();
    }
})();
