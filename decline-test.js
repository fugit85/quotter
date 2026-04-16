'use strict';

(function () {
    var API_ORIGIN = 'https://quotter-api-923883205237.europe-west1.run.app';
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

    function initDeclineTestSimilar() {
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
        function hideBubble() { bubble.hidden = true; }

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
                body: JSON.stringify({ words: words, limit: 10 })
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
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initDeclineTestSimilar);
    } else {
        initDeclineTestSimilar();
    }
})();
