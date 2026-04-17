import os
import re
import sys
import threading
import unicodedata
from flask import Flask, request, jsonify
from flask_cors import CORS
import pymorphy3
import morfeusz2
import requests

from natasha import (
    MorphVocab,
    NamesExtractor,
    DatesExtractor,
    MoneyExtractor,
    AddrExtractor,
)

app = Flask(__name__)
CORS(app)

BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN")
CHAT_ID = os.environ.get("TELEGRAM_CHAT_ID")

@app.route("/submit", methods=["POST"])
def submit():
    data = request.get_json(silent=True) or {}
    comment = data.get("comment", "")
    contact = data.get("contact", "")
    url = data.get("url", "")
    token = data.get("recaptcha_token", "")
    rating_raw = data.get("rating", 0)
    try:
        rating = int(rating_raw)
    except (TypeError, ValueError):
        rating = 0
    if rating < 0 or rating > 5:
        rating = 0

    if not comment:
        return jsonify({"ok": False}), 400

    secret = os.environ.get("RECAPTCHA_SECRET")
    if secret and token:
        r = requests.post(
            "https://www.google.com/recaptcha/api/siteverify",
            data={"secret": secret, "response": token},
            timeout=10,
        )
        result = r.json()
        score = result.get("score", 0)
        if not result.get("success") or score < 0.5:
            return jsonify({"ok": False, "error": "Проверка не пройдена"}), 400

    rating_line = f"Оценка: {rating} из 5" if 1 <= rating <= 5 else "Оценка: не указана"

    text = f"""
Новый отзыв:

{rating_line}

Комментарий:
{comment}

Контакт:
{contact}

Страница:
{url}
"""

    if BOT_TOKEN and CHAT_ID:
        try:
            requests.post(
                f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage",
                json={"chat_id": CHAT_ID, "text": text},
                timeout=10,
            )
        except Exception as e:
            print("Ошибка отправки в Telegram:", e)

    return jsonify({"ok": True})


morph_ru = pymorphy3.MorphAnalyzer(lang="ru")
morph_uk = pymorphy3.MorphAnalyzer(lang="uk")
morph_pl = morfeusz2.Morfeusz()

_navec_kv = None
_navec_lock = threading.Lock()
_navec_init_attempted = False

CASES_RU = ['nomn', 'gent', 'datv', 'accs', 'ablt', 'loct']
CASES_UK = ['nomn', 'gent', 'datv', 'accs', 'ablt', 'loct', 'voct']
CASES_PL = ['nom', 'gen', 'dat', 'acc', 'inst', 'loc', 'voc']
PL_NUMBERS = ['sg', 'pl']
PL_ADJ_GENDERS = ['m1', 'm2', 'm3', 'f', 'n']
PL_DECL_POS = frozenset({'subst', 'adj', 'num'})

NUMBERS = ['sing', 'plur']
GENDERS = ['masc', 'femn', 'neut']


def _pymorphy_is_adjective(parsed) -> bool:
    try:
        pos = parsed.tag.POS
        if pos in ('ADJF', 'ADJS'):
            return True
    except (AttributeError, TypeError, ValueError):
        pass
    t = str(parsed.tag)
    return 'ADJF' in t or 'ADJS' in t


_DECLINE_POS_DEPRIORITIZED = frozenset({
    'GRND', 'VERB', 'INFN', 'ADVP', 'PREP', 'CONJ', 'PRCL', 'INTJ', 'PRED',
})


def _pymorphy_pos(parsed):
    try:
        return parsed.tag.POS
    except (AttributeError, TypeError, ValueError):
        return None


def _pymorphy_decline_pos_priority(pos):
    """Lower value = preferred for /decline when several parses exist."""
    if pos == 'NOUN':
        return 0
    if pos in ('NUMR', 'NPRO'):
        return 1
    if pos in ('ADJF', 'ADJS', 'COMP', 'PRTF', 'PRTS'):
        return 2
    if pos in _DECLINE_POS_DEPRIORITIZED:
        return 10
    return 5


def _pick_pymorphy_parse_for_decline(morph, token: str):
    normalized = unicodedata.normalize('NFC', token)
    parses = morph.parse(normalized)
    best_i = min(
        range(len(parses)),
        key=lambda i: (_pymorphy_decline_pos_priority(_pymorphy_pos(parses[i])), i),
    )
    return parses[best_i]


def _pymorphy_is_finite_verb_or_infinitive(parsed) -> bool:
    return _pymorphy_pos(parsed) in ('VERB', 'INFN')


def _pymorphy_skip_phrase_case(parsed) -> bool:
    pos = _pymorphy_pos(parsed)
    return pos in ('VERB', 'INFN')


def _verbal_lemma_parse(morph, parsed):
    nf = unicodedata.normalize('NFC', parsed.normal_form)
    for c in morph.parse(nf):
        if c.tag.POS == 'INFN':
            return c
    for c in morph.parse(nf):
        if c.tag.POS == 'VERB':
            try:
                st = str(c.tag).lower()
            except (TypeError, ValueError):
                st = ''
            if 'infn' in st:
                return c
    return parsed


def _try_verbal_inflect(parsed, grams: set, original_token: str, lang: str):
    inf = parsed.inflect(grams)
    if not inf:
        return None
    w = inf.word
    if lang == 'ru':
        w = _ru_match_input_ye_spelling(w, original_token)
    return w


def _collect_verbal_forms(parsed, token, by_gender, by_number, by_tense, morph, lang):
    base = _verbal_lemma_parse(morph, parsed)
    out = []
    seen = set()
    orig_nfc = unicodedata.normalize('NFC', token)

    def add_from_base(grams):
        w = _try_verbal_inflect(base, set(grams), token, lang)
        if w:
            _append_unique(out, seen, w)

    def add_from_parsed(grams):
        w = _try_verbal_inflect(parsed, set(grams), token, lang)
        if w:
            _append_unique(out, seen, w)

    if by_tense:
        persons = ('1per', '2per', '3per')
        numbers = ('sing', 'plur') if by_number else ('sing',)
        if lang == 'uk':
            for num in numbers:
                for per in persons:
                    add_from_base({'pres', num, per})
            if by_gender:
                for g in ('masc', 'femn', 'neut'):
                    add_from_base({'past', g})
            else:
                add_from_base({'past', 'masc'})
            if by_number:
                add_from_base({'past', 'plur'})
            for num in numbers:
                for per in persons:
                    add_from_base({'futr', num, per})
        else:
            for num in numbers:
                for per in persons:
                    add_from_base({'pres', num, per})
            if by_gender:
                for g in GENDERS:
                    add_from_base({'past', 'sing', g})
            else:
                add_from_base({'past', 'sing', 'masc'})
            if by_number:
                add_from_base({'past', 'plur'})
            for num in numbers:
                for per in persons:
                    add_from_base({'futr', num, per})
    else:
        _append_unique(out, seen, orig_nfc)
        if by_number and _pymorphy_pos(parsed) == 'VERB':
            try:
                num = parsed.tag.number
            except (AttributeError, TypeError, ValueError):
                num = None
            if num == 'sing':
                add_from_parsed({'plur'})
            elif num == 'plur':
                add_from_parsed({'sing'})
        if by_gender and _pymorphy_pos(parsed) == 'VERB':
            try:
                tense = parsed.tag.tense
                n = parsed.tag.number
            except (AttributeError, TypeError, ValueError):
                tense, n = None, None
            if tense == 'past':
                if lang == 'uk':
                    if n == 'sing':
                        for g in ('masc', 'femn', 'neut'):
                            add_from_parsed({'past', g})
                    elif n == 'plur':
                        add_from_parsed({'past', 'plur'})
                else:
                    if n == 'sing':
                        for g in GENDERS:
                            add_from_parsed({'past', 'sing', g})
                    elif n == 'plur':
                        add_from_parsed({'past', 'plur'})

    if not out:
        _append_unique(out, seen, orig_nfc)
    return out


def _morph_for_lang(lang: str):
    if lang == "uk":
        return morph_uk
    return morph_ru


def _cases_for_lang(lang: str):
    if lang == "uk":
        return CASES_UK
    return CASES_RU


def _ru_match_input_ye_spelling(surface: str, original_token: str) -> str:
    if not surface:
        return surface
    surf = unicodedata.normalize('NFC', str(surface))
    orig = unicodedata.normalize('NFC', original_token)
    if 'ё' in orig or 'Ё' in orig:
        return surf
    return surf.replace('Ё', 'Е').replace('ё', 'е')


def _pl_lemma_tag_from_row(row):
    if len(row) >= 3 and isinstance(row[2], (list, tuple)) and len(row[2]) >= 3:
        inner = row[2]
        lemma, tag = inner[1], inner[2]
        if isinstance(lemma, str) and isinstance(tag, str) and ':' in tag:
            return lemma, tag
    for i, cell in enumerate(row):
        if not isinstance(cell, str) or ':' not in cell:
            continue
        pos = cell.split(':')[0]
        if pos in PL_DECL_POS and i > 0 and isinstance(row[i - 1], str):
            return row[i - 1], cell
    return None, None


def _pl_case_slot_ok(case_slot: str) -> bool:
    if not case_slot:
        return False
    for piece in case_slot.split('.'):
        if piece in CASES_PL:
            return True
    return False


def _pl_is_declinable_nominal_tag(tag: str) -> bool:
    parts = tag.split(':')
    if len(parts) < 4:
        return False
    pos, num, case, gender = parts[0], parts[1], parts[2], parts[3]
    if pos not in PL_DECL_POS:
        return False
    if num not in PL_NUMBERS:
        return False
    if not _pl_case_slot_ok(case):
        return False
    if gender not in PL_ADJ_GENDERS:
        return False
    return True


def _pl_analyses(m, token: str):
    a = m.analyse(token)
    if not a and token != token.lower():
        a = m.analyse(token.lower())
    return a or []


def _pl_pick_row(m, token: str):
    for row in _pl_analyses(m, token):
        lemma, tag = _pl_lemma_tag_from_row(row)
        if lemma and tag and _pl_is_declinable_nominal_tag(tag):
            return lemma, tag
    return None


def _pl_build_tag(base_tag: str, case: str, number: str, adj_gender: str | None) -> str | None:
    parts = base_tag.split(':')
    if len(parts) < 4:
        return None
    pos = parts[0]
    if pos not in PL_DECL_POS:
        return None
    out = list(parts)
    out[1] = number
    out[2] = case
    if adj_gender is not None and pos == 'adj':
        out[3] = adj_gender
    return ':'.join(out)


def _pl_synthesize(m, lemma: str, tag: str):
    try:
        tid = m._morfeusz_obj.getIdResolver().getTagId(tag)
    except Exception:
        return []
    try:
        if tid is None or tid < 0:
            return []
    except TypeError:
        return []

    def _forms_from_gen(gen):
        if gen is None:
            return []
        out = []
        for item in gen:
            if isinstance(item, (list, tuple)) and len(item) >= 1:
                w = item[0]
            elif isinstance(item, str):
                w = item
            else:
                continue
            if isinstance(w, str) and w:
                out.append(w)
        return out

    for lem in (lemma, lemma.lower()):
        try:
            gen = m.generate(lem, tid)
        except Exception:
            continue
        got = _forms_from_gen(gen)
        if got:
            return got
    return []


def _pl_inflect_one(m, lemma: str, base_tag: str, case: str, number: str, adj_gender: str | None, fallback: str):
    new_tag = _pl_build_tag(base_tag, case, number, adj_gender)
    if not new_tag:
        return fallback
    forms = _pl_synthesize(m, lemma, new_tag)
    return forms[0] if forms else fallback


def _collect_single_word_forms_pl(token, lemma, tag, by_gender, by_number, by_case, cases):
    out = []
    seen = set()
    is_adj = tag.split(':')[0] == 'adj'
    cases_iter = cases if by_case else ['nom']

    for case in cases_iter:
        if by_number:
            for number in PL_NUMBERS:
                w = _pl_inflect_one(morph_pl, lemma, tag, case, number, None, token)
                _append_unique(out, seen, w)
                if is_adj and by_gender:
                    for g in PL_ADJ_GENDERS:
                        w = _pl_inflect_one(morph_pl, lemma, tag, case, number, g, token)
                        _append_unique(out, seen, w)
        else:
            num0 = tag.split(':')[1] if len(tag.split(':')) > 1 and tag.split(':')[1] in PL_NUMBERS else 'sg'
            w = _pl_inflect_one(morph_pl, lemma, tag, case, num0, None, token)
            _append_unique(out, seen, w)
            if is_adj and by_gender:
                for g in PL_ADJ_GENDERS:
                    w = _pl_inflect_one(morph_pl, lemma, tag, case, num0, g, token)
                    _append_unique(out, seen, w)

    if not out:
        _append_unique(out, seen, token)
    return out


def _collect_phrase_forms_pl(tokens, rows, by_gender, by_number, by_case, cases):
    out = []
    has_adj = any(r and r[1].split(':')[0] == 'adj' for r in rows)
    cases_iter = cases if by_case else ['nom']

    def line(case, number_override, adj_gender):
        parts = []
        for tok, r in zip(tokens, rows):
            if not r:
                parts.append(tok)
                continue
            lem, t = r
            ag = adj_gender if (t.split(':')[0] == 'adj') else None
            if by_number and number_override is not None:
                num = number_override
            else:
                tp = t.split(':')
                num = tp[1] if len(tp) > 1 and tp[1] in PL_NUMBERS else 'sg'
            parts.append(_pl_inflect_one(morph_pl, lem, t, case, num, ag, tok))
        return ' '.join(parts)

    for case in cases_iter:
        if by_number:
            for number in PL_NUMBERS:
                out.append(line(case, number, None))
                if has_adj and by_gender:
                    for g in PL_ADJ_GENDERS:
                        out.append(line(case, number, g))
        else:
            out.append(line(case, None, None))
            if has_adj and by_gender:
                for g in PL_ADJ_GENDERS:
                    out.append(line(case, None, g))
    return out


def _inflect_surface(parsed, tagset, original_token, *, lang: str):
    inf = parsed.inflect(tagset)
    if inf:
        w = inf.word
        if lang == 'ru':
            w = _ru_match_input_ye_spelling(w, original_token)
        return w
    if 'voct' in tagset:
        return None
    return original_token


def _append_unique(ordered, seen, value):
    if not value or value in seen:
        return
    seen.add(value)
    ordered.append(value)


def _collect_single_word_forms(token, parsed, by_gender, by_number, by_case, cases, *, lang: str):
    out = []
    seen = set()
    is_adj = _pymorphy_is_adjective(parsed)
    cases_iter = cases if by_case else ['nomn']

    for case in cases_iter:
        if by_number:
            for number in NUMBERS:
                w = _inflect_surface(parsed, {case, number}, token, lang=lang)
                _append_unique(out, seen, w)
        else:
            w = _inflect_surface(parsed, {case}, token, lang=lang)
            _append_unique(out, seen, w)

        if is_adj and by_gender:
            for gender in GENDERS:
                if by_number:
                    w = _inflect_surface(parsed, {case, 'sing', gender}, token, lang=lang)
                    _append_unique(out, seen, w)
                else:
                    w = _inflect_surface(parsed, {case, gender}, token, lang=lang)
                    _append_unique(out, seen, w)

            if by_number:
                w = _inflect_surface(parsed, {case, 'plur'}, token, lang=lang)
                _append_unique(out, seen, w)

    return out


def _phrase_line_inflect(tokens, parsed_list, tagset, *, strict_voct: bool, lang: str):
    parts = []
    for token, parsed in zip(tokens, parsed_list):
        if _pymorphy_skip_phrase_case(parsed):
            w = parsed.word
            if lang == 'ru':
                w = _ru_match_input_ye_spelling(w, token)
            parts.append(w)
            continue
        inflected = parsed.inflect(tagset)
        if not inflected:
            if strict_voct:
                return None
            parts.append(token)
        else:
            w = inflected.word
            if lang == 'ru':
                w = _ru_match_input_ye_spelling(w, token)
            parts.append(w)
    return ' '.join(parts)


def _collect_phrase_forms(tokens, parsed_list, by_gender, by_number, by_case, cases, *, lang: str):
    out = []
    cases_iter = cases if by_case else ['nomn']
    has_adj = any(_pymorphy_is_adjective(p) for p in parsed_list)
    strict_voct = lang == 'uk'

    for case in cases_iter:
        is_voct = case == 'voct'
        if by_number:
            for number in NUMBERS:
                line = _phrase_line_inflect(
                    tokens, parsed_list, {case, number},
                    strict_voct=is_voct and strict_voct, lang=lang,
                )
                if line is not None:
                    out.append(line)
        else:
            line = _phrase_line_inflect(
                tokens, parsed_list, {case}, strict_voct=is_voct and strict_voct, lang=lang,
            )
            if line is not None:
                out.append(line)

        if has_adj and by_gender:
            for gender in GENDERS:
                if by_number:
                    line = _phrase_line_inflect(
                        tokens, parsed_list, {case, 'sing', gender},
                        strict_voct=is_voct and strict_voct, lang=lang,
                    )
                    if line is not None:
                        out.append(line)
                else:
                    line = _phrase_line_inflect(
                        tokens, parsed_list, {case, gender},
                        strict_voct=is_voct and strict_voct, lang=lang,
                    )
                    if line is not None:
                        out.append(line)
            if by_number:
                line = _phrase_line_inflect(
                    tokens, parsed_list, {case, 'plur'},
                    strict_voct=is_voct and strict_voct, lang=lang,
                )
                if line is not None:
                    out.append(line)
    return out


@app.route('/decline', methods=['POST'])
def decline_api():
    data = request.get_json(silent=True) or {}
    raw = data.get('text', '') or ''
    if not raw.strip():
        return jsonify({'lines': []}), 200

    lang = (data.get('lang') or 'ru').strip().lower()
    if lang not in ('uk', 'pl'):
        lang = 'ru'

    by_gender = data.get('byGender', True)
    by_number = data.get('byNumber', True)
    by_case = data.get('byCase', True)
    by_tense = bool(data.get('byTense', False))

    line_results = []

    for line in raw.split('\n'):
        line = line.strip()
        if not line:
            continue
        tokens = line.split()
        if not tokens:
            continue

        if lang == 'pl':
            cases = CASES_PL
            rows = [_pl_pick_row(morph_pl, t) for t in tokens]
            if len(tokens) == 1:
                pr = rows[0]
                if not pr:
                    chunk = [tokens[0]]
                else:
                    lem, tag = pr
                    chunk = _collect_single_word_forms_pl(
                        tokens[0], lem, tag, by_gender, by_number, by_case, cases
                    )
            else:
                chunk = _collect_phrase_forms_pl(
                    tokens, rows, by_gender, by_number, by_case, cases
                )
        else:
            morph = _morph_for_lang(lang)
            cases = _cases_for_lang(lang)
            parsed_list = [_pick_pymorphy_parse_for_decline(morph, t) for t in tokens]
            if len(tokens) == 1:
                p0 = parsed_list[0]
                if _pymorphy_is_finite_verb_or_infinitive(p0):
                    # Клиент шлёт byCase и для глагола; падежи у глагола не используем.
                    chunk = _collect_verbal_forms(
                        p0, tokens[0], by_gender, by_number, by_tense, morph, lang,
                    )
                else:
                    # Имена, прилагательные, деепричастия и т.д.; byTense для них не используется.
                    chunk = _collect_single_word_forms(
                        tokens[0], p0, by_gender, by_number, by_case, cases,
                        lang=lang,
                    )
            else:
                chunk = _collect_phrase_forms(
                    tokens, parsed_list, by_gender, by_number, by_case, cases, lang=lang
                )

        line_results.append(list(chunk))

    return jsonify({'lines': line_results}), 200


_navec_data = None


def _load_navec():
    try:
        import numpy as np
        from navec import Navec
    except ImportError as e:
        print('similar: import failed', e)
        return None
    path = os.environ.get('NAVEC_PATH', '/app/navec.tar')
    if not os.path.isfile(path):
        print('similar: navec file missing', path)
        return None
    try:
        navec = Navec.load(path)
        words = list(navec.vocab.words)
        word2idx = {w: i for i, w in enumerate(words)}
        matrix = navec.pq.unpack()
        norms = np.linalg.norm(matrix, axis=1, keepdims=True)
        norms[norms == 0] = 1.0
        normed = matrix / norms
        data = {
            'words': words,
            'word2idx': word2idx,
            'normed': normed,
            'np': np,
        }
        print('similar: navec loaded,', len(words), 'words')
        return data
    except Exception as e:
        print('similar: navec load error', e)
        return None


def _get_navec():
    global _navec_data, _navec_init_attempted
    with _navec_lock:
        if _navec_data is not None:
            return _navec_data
        if _navec_init_attempted:
            return None
        _navec_init_attempted = True
        _navec_data = _load_navec()
        return _navec_data


print('similar: preloading navec model…')
_navec_data = _load_navec()
if _navec_data:
    _navec_init_attempted = True


def _navec_most_similar(nd, word: str, topn: int):
    np = nd['np']
    idx = nd['word2idx'].get(word)
    if idx is None:
        return []
    vec = nd['normed'][idx]
    scores = nd['normed'].dot(vec)
    best = np.argpartition(-scores, topn + 1)[:topn + 1]
    best = best[np.argsort(-scores[best])]
    out = []
    for i in best:
        i = int(i)
        if i == idx:
            continue
        out.append((nd['words'][i], float(scores[i])))
        if len(out) >= topn:
            break
    return out


def _similar_query_variants(word: str) -> list[str]:
    w = unicodedata.normalize('NFC', (word or '').strip()).lower()
    out = []
    if w:
        out.append(w)
    try:
        p = morph_ru.parse(w)[0]
        nf = p.normal_form.lower()
        if nf and nf not in out:
            out.append(nf)
    except (AttributeError, TypeError, ValueError):
        pass
    return out


def _pymorphy_lemma(word: str) -> str:
    try:
        return morph_ru.parse(word)[0].normal_form.lower()
    except (AttributeError, TypeError, ValueError, IndexError):
        return word.lower()


def _find_similar_for_word(nd, raw: str, limit: int) -> dict:
    used = None
    ms = []
    for cand in _similar_query_variants(raw):
        if cand in nd['word2idx']:
            used = cand
            ms = _navec_most_similar(nd, cand, limit + 20)
            break
    if not used:
        return {'word': raw, 'used': None, 'similar': []}
    query_lemma = _pymorphy_lemma(used)
    seen = {used}
    seen_lemmas = {query_lemma}
    similar = []
    for w, score in ms:
        if w in seen:
            continue
        lemma = _pymorphy_lemma(w)
        if lemma in seen_lemmas:
            continue
        seen.add(w)
        seen_lemmas.add(lemma)
        similar.append({'word': w, 'score': score})
        if len(similar) >= limit:
            break
    return {'word': raw, 'used': used, 'similar': similar}


@app.route('/similar', methods=['POST'])
def similar_words():
    nd = _get_navec()
    if nd is None:
        return jsonify({
            'ok': False,
            'error': 'navec_unavailable',
            'results': [],
        }), 503

    data = request.get_json(silent=True) or {}

    words = data.get('words')
    if words is None:
        single = (data.get('word') or '').strip()
        words = [single] if single else []
    if not isinstance(words, list):
        words = []
    words = [str(w).strip() for w in words if str(w).strip()]
    words = words[:20]

    try:
        limit = int(data.get('limit', 12))
    except (TypeError, ValueError):
        limit = 12
    limit = max(3, min(limit, 40))

    if not words:
        return jsonify({'ok': True, 'results': []}), 200

    results = [_find_similar_for_word(nd, w, limit) for w in words]
    return jsonify({'ok': True, 'results': results}), 200


_natasha_morph_vocab = MorphVocab()
_natasha_names = NamesExtractor(_natasha_morph_vocab)
_natasha_dates = DatesExtractor(_natasha_morph_vocab)
_natasha_money = MoneyExtractor(_natasha_morph_vocab)
_natasha_addr = AddrExtractor(_natasha_morph_vocab)


_EMAIL_RE = re.compile(r'[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}')
_URL_RE = re.compile(
    r'(?:(?:https?|ftp)://[^\s<>"\'`]+|(?:www\.|[a-z0-9-]+\.)'
    r'(?:ru|com|net|org|io|co|kz|ua|by|pl|info|biz|me|dev|app|xyz|site|store|shop|online|tech|cloud|ai)'
    r'(?:/[^\s<>"\'`]*)?)',
    re.IGNORECASE,
)
# NB: separators are [ \t\-\.] — not \s. Using \s would let the regex jump
# across newlines and glue a trailing digit from the next line to a valid
# phone (e.g. "87474776246\n8" being captured as one match).
_PHONE_RE = re.compile(
    r'(?:\+?\d{1,3}[ \t\-\.]?)?(?:\(\d{2,5}\)|\d{2,5})[ \t\-\.]?\d{2,4}[ \t\-\.]?\d{2,4}(?:[ \t\-\.]?\d{1,4})?'
)
_HASHTAG_RE = re.compile(r'#[\wа-яёА-ЯЁ_-]+', re.UNICODE)
_NUMBER_RE = re.compile(r'\b\d+(?:[.,]\d+)?\b')


# === Supplementary extractors for lowercase PPC-style keyword lists ===
# Natasha/Yargy grammars rely heavily on Russian capitalization and structural
# markers ("г. Москва", "ул. Тверская"), so they miss most entities in raw
# lowercase keyword exports. The lookups and regexes below fill that gap.

_RU_GEO_SINGLE_LEMMAS = frozenset({
    # Russian cities (nominative lemmas — pymorphy normalises inflected forms)
    'москва', 'петербург', 'питер', 'новосибирск', 'екатеринбург', 'казань',
    'челябинск', 'самара', 'омск', 'уфа', 'красноярск', 'воронеж', 'пермь',
    'волгоград', 'краснодар', 'саратов', 'тюмень', 'тольятти', 'ижевск',
    'барнаул', 'ульяновск', 'иркутск', 'хабаровск', 'ярославль', 'владивосток',
    'махачкала', 'томск', 'оренбург', 'кемерово', 'рязань', 'астрахань', 'киров',
    'пенза', 'липецк', 'балашиха', 'чебоксары', 'калининград', 'курск', 'тула',
    'ставрополь', 'тверь', 'магнитогорск', 'сочи', 'брянск', 'иваново',
    'белгород', 'владимир', 'сургут', 'калуга', 'архангельск', 'симферополь',
    'чита', 'смоленск', 'курган', 'орёл', 'орел', 'волжский', 'мурманск',
    'саранск', 'подольск', 'стерлитамак', 'грозный', 'якутск', 'кострома',
    'севастополь', 'тамбов', 'петрозаводск', 'нижневартовск', 'новороссийск',
    'таганрог', 'сыктывкар', 'нижнекамск', 'нальчик', 'орск', 'дзержинск',
    'братск', 'ангарск', 'королёв', 'королев', 'энгельс', 'люберцы',
    'красногорск', 'пушкино', 'одинцово', 'домодедово', 'щёлково', 'щелково',
    'раменское', 'реутов', 'жуковский', 'долгопрудный', 'лобня', 'ногинск',
    'видное', 'троицк', 'дмитров', 'клин', 'серпухов', 'коломна',
    'воскресенск', 'зеленоград', 'чехов', 'ступино', 'егорьевск',
    'электросталь', 'ивантеевка', 'мытищи', 'химки', 'фрязино', 'дубна',
    'лыткарино', 'абакан', 'арзамас', 'армавир', 'балаково', 'бердск',
    'березники', 'бийск', 'вологда', 'воркута', 'глазов', 'димитровград',
    'евпатория', 'ейск', 'ессентуки', 'железногорск', 'златоуст', 'зеленодольск',
    'кисловодск', 'копейск', 'кызыл', 'майкоп', 'миасс', 'михайловск',
    'находка', 'невинномысск', 'нефтекамск', 'нефтеюганск', 'норильск',
    'ноябрьск', 'обнинск', 'первоуральск', 'пятигорск', 'ревда', 'салават',
    'салехард', 'саров', 'серов', 'северодвинск', 'сызрань', 'тобольск',
    'туапсе', 'уссурийск', 'ухта', 'феодосия', 'элиста', 'геленджик', 'анапа',
    'адлер', 'сочи',
    # World cities (Russian transliteration)
    'лондон', 'париж', 'берлин', 'рим', 'мадрид', 'амстердам', 'прага', 'вена',
    'варшава', 'будапешт', 'киев', 'минск', 'алматы', 'астана', 'ташкент',
    'баку', 'тбилиси', 'ереван', 'бишкек', 'душанбе', 'ашхабад', 'стамбул',
    'анкара', 'анталия', 'анталья', 'дубай', 'каир', 'токио', 'сеул', 'пекин',
    'шанхай', 'бангкок', 'паттайя', 'пхукет', 'сингапур', 'джакарта', 'ханой',
    'чикаго', 'майами', 'бостон', 'сиэтл', 'вашингтон', 'атланта', 'торонто',
    'монреаль', 'ванкувер', 'мехико', 'гавана', 'лиссабон', 'барселона',
    'милан', 'неаполь', 'флоренция', 'цюрих', 'женева', 'копенгаген',
    'стокгольм', 'осло', 'хельсинки', 'рига', 'вильнюс', 'таллин', 'дублин',
    'брюссель', 'лион', 'марсель', 'ницца', 'венеция', 'афины', 'салоники',
    # Countries
    'россия', 'украина', 'беларусь', 'казахстан', 'узбекистан', 'таджикистан',
    'туркмения', 'армения', 'грузия', 'азербайджан', 'молдова', 'литва',
    'латвия', 'эстония', 'польша', 'германия', 'франция', 'италия', 'испания',
    'португалия', 'нидерланды', 'бельгия', 'австрия', 'швейцария', 'швеция',
    'норвегия', 'финляндия', 'дания', 'исландия', 'ирландия',
    'великобритания', 'англия', 'шотландия', 'уэльс', 'греция', 'турция',
    'кипр', 'египет', 'марокко', 'тунис', 'оаэ', 'иран', 'израиль', 'китай',
    'япония', 'корея', 'индия', 'пакистан', 'бангладеш', 'таиланд', 'вьетнам',
    'лаос', 'камбоджа', 'мьянма', 'малайзия', 'индонезия', 'филиппины', 'сша',
    'америка', 'канада', 'мексика', 'бразилия', 'аргентина', 'чили', 'перу',
    'колумбия', 'венесуэла', 'куба', 'австралия',
    # Regions / macro-geo
    'крым', 'кавказ', 'сибирь', 'урал', 'алтай', 'камчатка', 'байкал',
    'поволжье', 'кубань', 'забайкалье', 'приморье', 'сахалин',
})

_RU_GEO_MULTI = (
    'санкт-петербург', 'санкт петербург',
    'нижний новгород', 'ростов-на-дону', 'ростов на дону',
    'улан-удэ', 'улан удэ', 'йошкар-ола', 'йошкар ола',
    'комсомольск-на-амуре', 'комсомольск на амуре',
    'петропавловск-камчатский', 'петропавловск камчатский',
    'каменск-уральский', 'каменск уральский',
    'орехово-зуево', 'орехово зуево',
    'сергиев посад', 'наро-фоминск', 'наро фоминск',
    'великие луки', 'великий новгород',
    'старый оскол', 'набережные челны',
    'южно-сахалинск', 'южно сахалинск',
    'ханты-мансийск', 'ханты мансийск',
    'новый уренгой', 'минеральные воды', 'красная поляна', 'роза хутор',
    'московская область', 'ленинградская область',
    'нью-йорк', 'нью йорк', 'лос-анджелес', 'лос анджелес',
    'сан-франциско', 'сан франциско', 'куала-лумпур', 'куала лумпур',
    'абу-даби', 'абу даби', 'нур-султан', 'нур султан',
    'саудовская аравия', 'южная корея', 'северная корея',
    'новая зеландия', 'рио-де-жанейро', 'буэнос-айрес',
)
_RU_GEO_MULTI_SORTED = tuple(sorted(set(_RU_GEO_MULTI), key=len, reverse=True))

_RU_FIRST_NAME_LEMMAS = frozenset({
    # Male
    'александр', 'алексей', 'анатолий', 'андрей', 'антон', 'аркадий', 'арсений',
    'артём', 'артем', 'артур', 'богдан', 'борис', 'вадим', 'валентин',
    'валерий', 'василий', 'виктор', 'виталий', 'владимир', 'владислав',
    'вячеслав', 'геннадий', 'георгий', 'герман', 'глеб', 'григорий', 'даниил',
    'данил', 'денис', 'дмитрий', 'евгений', 'егор', 'иван', 'игорь', 'илья',
    'кирилл', 'константин', 'лев', 'леонид', 'максим', 'марк', 'матвей',
    'михаил', 'никита', 'николай', 'олег', 'павел', 'пётр', 'петр', 'роман',
    'руслан', 'святослав', 'сергей', 'станислав', 'степан', 'тимофей', 'тимур',
    'фёдор', 'федор', 'филипп', 'юрий', 'ярослав',
    # Female
    'александра', 'алёна', 'алена', 'алина', 'алла', 'альбина', 'анастасия',
    'ангелина', 'анна', 'антонина', 'арина', 'валентина', 'валерия', 'варвара',
    'вера', 'вероника', 'виктория', 'галина', 'дарья', 'диана', 'екатерина',
    'елена', 'елизавета', 'жанна', 'зинаида', 'зоя', 'инна', 'ирина', 'карина',
    'кира', 'ксения', 'лариса', 'лидия', 'лилия', 'любовь', 'людмила',
    'маргарита', 'марина', 'мария', 'надежда', 'наталья', 'наталия', 'нина',
    'оксана', 'ольга', 'полина', 'раиса', 'регина', 'светлана', 'снежана',
    'софия', 'софья', 'таисия', 'тамара', 'татьяна', 'ульяна', 'элеонора',
    'эльвира', 'юлия', 'яна',
    # Kazakh / Central-Asian / CIS
    'арман', 'ержан', 'ерлан', 'ерик', 'ердаулет', 'асет', 'айбар', 'нурлан',
    'султан', 'даулет', 'болат', 'мейрам', 'самат', 'чингиз', 'нурсултан',
    'амирхан', 'арсен',
    'айгуль', 'айгерим', 'гульжан', 'зарина', 'зульфия', 'лейла', 'мадина',
    'карлыгаш', 'нурия', 'дарина', 'бота', 'алтынай',
})

_RU_SURNAME_SUFFIX_RE = re.compile(
    r'(?:ов|ова|ев|ева|ёв|ёва|ин|ина|ын|ына|ский|ская|цкий|цкая|ской|ской|'
    r'чук|енко|ян|янц|дзе|адзе|швили|иани)$',
    re.IGNORECASE | re.UNICODE,
)
_RU_PATRONYMIC_RE = re.compile(
    r'(?:ович|евич|ьевич|иевич|ьич|евна|овна|ична|ьевна|иевна)$',
    re.IGNORECASE | re.UNICODE,
)
_CYR_WORD_RE = re.compile(r'[а-яёА-ЯЁ]+(?:-[а-яёА-ЯЁ]+)*', re.UNICODE)

# Names that collide with common Russian nouns — only emit them if followed
# by a patronymic or surname, so "купить веру" (buy faith) and similar PPC
# queries don't produce a false name match.
_AMBIGUOUS_SOLO_NAMES = frozenset({
    'вера', 'любовь', 'надежда', 'слава', 'роман', 'мир', 'злата',
    'рада', 'лев', 'ева', 'ян', 'аврора', 'серафим', 'марк',
    'соня', 'соломон', 'кира',
})

# NB: whitespace classes use [ \t] rather than \s throughout, so a match
# cannot slip across a newline and glue digits from the next keyword-list
# line into the current one (same reason as _PHONE_RE above).
_DATE_SUPPLEMENT_RE = re.compile(
    r'\b\d{1,2}[ \t]+(?:январ[яь]|феврал[яь]|март[ая]?|апрел[яь]|ма[йя]|'
    r'июн[яь]|июл[яь]|август[а]?|сентябр[яь]|октябр[яь]|ноябр[яь]|декабр[яь])'
    r'(?:[ \t]+\d{2,4})?\b'
    r'|\b\d{1,2}[.\-/]\d{1,2}[.\-/]\d{2,4}\b'
    r'|\b\d{4}[.\-/]\d{1,2}[.\-/]\d{1,2}\b'
    r'|\b(?:0?[1-9]|[12]\d|3[01])[ \t](?:0?[1-9]|1[0-2])[ \t](?:19|20)\d{2}\b',
    re.IGNORECASE | re.UNICODE,
)

_MONEY_SUPPLEMENT_RE = re.compile(
    r'[\$€£¥₽₴₸][ \t]?\d+(?:[.,\t ]\d+)*'
    r'|\d+(?:[.,\t ]\d+)*[ \t]?(?:[\$€£¥₽₴₸]|руб(?:лей|ля|ль|\.)?|р(?![а-яё])|'
    r'коп(?:еек|ейки|\.)?|доллар(?:ов|а|)?|евро|тенге|тг(?![а-яё])|'
    r'грн(?![а-яё])|гривен|гривн[яи]|юан(?:ей|я|ь)?|злот(?:ых|ый)?|'
    r'zł|pln|usd|eur|gbp|cny|kzt|uah|byn)'
    r'(?![a-zа-яё])'
    r'|\b\d+(?:[.,]\d+)?[ \t]?%(?!\w)',
    re.IGNORECASE | re.UNICODE,
)


# --- External dictionaries (built by tools/build_dicts.py) ------------------
# If present, they extend the hardcoded lookups above with ~10k cities from
# GeoNames (RU/UA/BY/KZ), ~1k first names, and currency words across languages.
# Absence is harmless — the hardcoded baseline keeps the extractor working.
_HERE_DIR = os.path.dirname(os.path.abspath(__file__))
if _HERE_DIR not in sys.path:
    sys.path.insert(0, _HERE_DIR)

_GEO_MULTI_RE = None
_CURRENCY_EXTRA_RE = None
_STREET_NAMES_SINGLE: frozenset[str] = frozenset()
_STREET_NAMES_MULTI_RE = None
_STREET_MARKER_RE = None
_STREET_MARKER_ANY_RE = None
try:
    import dict_loader as _extract_dicts  # type: ignore

    _RU_GEO_SINGLE_LEMMAS = frozenset(
        _RU_GEO_SINGLE_LEMMAS | _extract_dicts.CITY_SINGLE_LEMMAS
    )
    _RU_FIRST_NAME_LEMMAS = frozenset(
        _RU_FIRST_NAME_LEMMAS | _extract_dicts.NAME_LEMMAS
    )
    _GEO_MULTI_RE = _extract_dicts.CITY_MULTI_RE
    _CURRENCY_EXTRA_RE = _extract_dicts.CURRENCY_WORDS_RE
    _STREET_NAMES_SINGLE = _extract_dicts.STREET_NAMES_SINGLE
    _STREET_NAMES_MULTI_RE = _extract_dicts.STREET_NAMES_MULTI_RE
    _STREET_MARKER_RE = _extract_dicts.STREET_MARKER_RE
    _STREET_MARKER_ANY_RE = _extract_dicts.STREET_MARKER_ANY_RE
    print(f"[extractor] external dicts loaded: {_extract_dicts.stats()}")
except ImportError:
    print("[extractor] external dicts not available — using built-in baseline")
except Exception as _exc:  # pragma: no cover - defensive
    print(f"[extractor] dict merge skipped due to error: {_exc!r}")


# Fallback street-marker regex when external dicts are unavailable — keeps
# the extractor useful in that degraded mode. Covers the most common RU
# markers; UA/BE/KK shorthand only available via the external dict.
# NB: inter-token separators are [ \t]+ rather than \s+ so the match cannot
# jump across a newline and glue the next keyword-list line into one street
# ("улица жандосова\nул береке" → two streets, not one).
_STREET_MARKER_FALLBACK_RE = re.compile(
    r"(?<![\w\-])(?:улица|ул|проспект|пр-т|пр-кт|пр|переулок|пер|"
    r"шоссе|ш|бульвар|б-р|набережная|наб|площадь|пл|проезд|тупик|аллея|"
    r"микрорайон|мкр|мкрн|квартал)\.?[ \t]+"
    r"[А-Яа-яЁё][\w\-]*(?:[ \t]+[А-Яа-яЁё][\w\-]*){0,3}"
    r"(?:[ \t]*,?[ \t]*(?:д\.?|дом)?[ \t]*\d+[а-я]?(?:/\d+[а-я]?)?)?",
    re.IGNORECASE | re.UNICODE,
)

# House number right after a single word — used to lift bare street names out
# of a sentence ("Ленина 15", "на Садовой 4"). Multi-word names are covered by
# STREET_NAMES_MULTI_RE, so the pattern deliberately captures exactly one word
# to avoid greedy matches like "дома на Ленина 7" that mask the real street.
# [ \t]* (not \s*) keeps the street name and its house number on the same
# line — otherwise "садовая\n15 ремонт" would be captured as one street.
_STREET_WITH_NUMBER_RE = re.compile(
    r"(?<![\w\-])([А-Яа-яЁёІіЇїЄєҐґЎўӘәҒғҚқҢңӨөҰұҮүҺһ][\w\-]+)"
    r"[ \t]*,?[ \t]*(?:д\.?|дом|буд\.?|үй)?[ \t]*(\d+[а-яA-Za-z]?(?:/\d+[а-яA-Za-z]?)?)(?!\d)",
    re.IGNORECASE | re.UNICODE,
)


def _extract_natasha_spans(extractor, text):
    out = []
    try:
        matches = list(extractor(text))
    except Exception:
        return out
    for match in matches:
        try:
            start, stop = match.span
        except (AttributeError, TypeError, ValueError):
            continue
        raw = text[start:stop].strip(' \t\r\n.,;:!?"\'()[]{}«»')
        # Drop matches that span a newline: in a PPC keyword list every
        # line is an independent phrase, so "москва\nпитер" must not come
        # back as one geo entity.
        if not raw or '\n' in raw:
            continue
        out.append(raw)
    return out


def _dedup_preserve(seq):
    seen = set()
    out = []
    for raw in seq:
        v = raw.strip() if isinstance(raw, str) else str(raw).strip()
        if not v:
            continue
        key = v.lower()
        if key in seen:
            continue
        seen.add(key)
        out.append(v)
    return out


def _filter_digit_only(items):
    return [x for x in items if not re.fullmatch(r'[\d\s.,\-]+', x or '')]


def _extract_phones(text):
    out = []
    for m in _PHONE_RE.findall(text):
        digits = re.sub(r'\D', '', m)
        # ITU caps international numbers at 15 digits. Below 7 is noise.
        if not (7 <= len(digits) <= 15):
            continue
        out.append(re.sub(r'[ \t]+', ' ', m).strip())
    return out


_LEMMA_CACHE: dict[str, str] = {}


def _cached_lemma(word: str) -> str:
    key = word.lower()
    cached = _LEMMA_CACHE.get(key)
    if cached is not None:
        return cached
    try:
        lemma = morph_ru.parse(key)[0].normal_form.lower()
    except (AttributeError, TypeError, ValueError, IndexError):
        lemma = key
    if len(_LEMMA_CACHE) < 20000:
        _LEMMA_CACHE[key] = lemma
    return lemma


def _tokenize_cyrillic(text: str):
    """Return [(surface, lemma, start, end), …] for Cyrillic word tokens."""
    out = []
    for m in _CYR_WORD_RE.finditer(text):
        surface = m.group()
        out.append((surface, _cached_lemma(surface), m.start(), m.end()))
    return out


def _extract_names_lookup(text: str):
    """Detect personal names in lowercase text: first [+patronymic] [+surname].

    Solo first names are emitted unless they collide with a common Russian
    noun (listed in _AMBIGUOUS_SOLO_NAMES) — those still require a
    patronymic or surname for context.

    Tokens are chained only within the same line: in PPC keyword lists a
    newline separates independent phrases, so "иван\nпетров" must not be
    emitted as a single "иван петров" name.
    """
    tokens = _tokenize_cyrillic(text)
    out = []
    i = 0
    while i < len(tokens):
        surface, lemma, _start, end = tokens[i]
        if lemma not in _RU_FIRST_NAME_LEMMAS:
            i += 1
            continue
        parts = [surface]
        prev_end = end
        j = i + 1
        if j < len(tokens):
            nxt_surface = tokens[j][0].lower()
            nxt_lemma = tokens[j][1]
            nxt_start = tokens[j][2]
            same_line = '\n' not in text[prev_end:nxt_start]
            if same_line and (
                _RU_PATRONYMIC_RE.search(nxt_lemma) or _RU_PATRONYMIC_RE.search(nxt_surface)
            ):
                parts.append(tokens[j][0])
                prev_end = tokens[j][3]
                j += 1
        if j < len(tokens):
            nxt_lemma = tokens[j][1]
            nxt_start = tokens[j][2]
            same_line = '\n' not in text[prev_end:nxt_start]
            if same_line and _RU_SURNAME_SUFFIX_RE.search(nxt_lemma):
                parts.append(tokens[j][0])
                j += 1
        if len(parts) >= 2 or lemma not in _AMBIGUOUS_SOLO_NAMES:
            out.append(' '.join(parts))
        i = max(j, i + 1)
    return out


def _extract_geo_lookup(text: str):
    """Find known cities/countries/regions, matching inflected forms via pymorphy.

    Multi-token phrases use a single precompiled alternation regex (from the
    external dict) when available — an order of magnitude faster than iterating
    hundreds of phrases. Falls back to the built-in hardcoded list otherwise.
    """
    out: list[str] = []
    matched_spans: list[tuple[int, int]] = []

    def _overlaps(a: int, b: int) -> bool:
        for s, e in matched_spans:
            if a < e and b > s:
                return True
        return False

    if _GEO_MULTI_RE is not None:
        for m in _GEO_MULTI_RE.finditer(text):
            start, end = m.start(), m.end()
            if not _overlaps(start, end):
                out.append(text[start:end])
                matched_spans.append((start, end))
    else:
        lower = text.lower()
        for phrase in _RU_GEO_MULTI_SORTED:
            plen = len(phrase)
            start = 0
            while True:
                pos = lower.find(phrase, start)
                if pos < 0:
                    break
                end = pos + plen
                left_ok = pos == 0 or not (lower[pos - 1].isalpha() or lower[pos - 1].isdigit())
                right_ok = end >= len(lower) or not (lower[end].isalpha() or lower[end].isdigit())
                if left_ok and right_ok and not _overlaps(pos, end):
                    out.append(text[pos:end])
                    matched_spans.append((pos, end))
                    start = end
                else:
                    start = pos + 1

    for surface, lemma, start, end in _tokenize_cyrillic(text):
        if _overlaps(start, end):
            continue
        if lemma in _RU_GEO_SINGLE_LEMMAS:
            out.append(surface)
            matched_spans.append((start, end))
    return out


_STREET_LEMMA_SET: frozenset[str] | None = None


def _get_street_lemma_set() -> frozenset[str]:
    """Lazily build a lemma set from STREET_NAMES_SINGLE so inflected forms
    ("на садовой 3" → lemma "садовый") still match the dictionary."""
    global _STREET_LEMMA_SET
    if _STREET_LEMMA_SET is None:
        if not _STREET_NAMES_SINGLE:
            _STREET_LEMMA_SET = frozenset()
        else:
            _STREET_LEMMA_SET = frozenset(_cached_lemma(s) for s in _STREET_NAMES_SINGLE)
    return _STREET_LEMMA_SET


def _extract_streets(text: str):
    """Find streets using three passes:

    1) Marker-based regex ("ул. Ленина", "просп. Мира 15") — high precision;
       emits the full marker+name[+house number] span.
    2) Multi-token dictionary lookup ("богдана хмельницкого", "толе би") —
       requires a known street phrase, independent of markers.
    3) Single-word + adjacent house number ("Ленина 15", "на садовой 4"):
       matches any Cyrillic word followed by a house number and accepts it
       when either the surface form OR its pymorphy lemma is a known street.

    All three passes contribute to one deduplicated list. Spans that overlap
    an earlier match are skipped to avoid double-counting fragments.
    """
    out: list[str] = []
    spans: list[tuple[int, int]] = []

    def _overlaps(a: int, b: int) -> bool:
        for s, e in spans:
            if a < e and b > s:
                return True
        return False

    marker_re = _STREET_MARKER_RE or _STREET_MARKER_FALLBACK_RE
    for m in marker_re.finditer(text):
        s, e = m.start(), m.end()
        if _overlaps(s, e):
            continue
        raw = text[s:e].strip(' \t\r\n.,;:!?"\'()[]{}«»')
        if raw:
            out.append(raw)
            spans.append((s, e))

    if _STREET_NAMES_MULTI_RE is not None:
        for m in _STREET_NAMES_MULTI_RE.finditer(text):
            s, e = m.start(), m.end()
            if _overlaps(s, e):
                continue
            raw = text[s:e].strip(' \t\r\n.,;:!?"\'()[]{}«»')
            if raw:
                out.append(raw)
                spans.append((s, e))

    if _STREET_NAMES_SINGLE:
        lemma_set = _get_street_lemma_set()
        for m in _STREET_WITH_NUMBER_RE.finditer(text):
            s, e = m.start(), m.end()
            if _overlaps(s, e):
                continue
            word = m.group(1).strip().lower()
            if word in _STREET_NAMES_SINGLE or _cached_lemma(word) in lemma_set:
                raw = text[s:e].strip(' \t\r\n.,;:!?"\'()[]{}«»')
                if raw:
                    out.append(raw)
                    spans.append((s, e))

    return out, spans


# [ \t] (not \s) keeps the thousands-separator lookback from crossing into
# the previous keyword-list line.
_MONEY_EXTRA_NUM_RE = re.compile(r'\d+(?:[.,\t ]\d+)*[ \t]*$')


def _extract_money_with_dict(text: str):
    """Catch '<number> <currency-word>' patterns using the loaded multilingual
    currency dictionary (covers UAH/BYN/KZT/etc. inflections the main regex
    may not list)."""
    if _CURRENCY_EXTRA_RE is None:
        return []
    out = []
    for m in _CURRENCY_EXTRA_RE.finditer(text):
        word_start = m.start()
        num_m = _MONEY_EXTRA_NUM_RE.search(text[:word_start])
        if not num_m:
            continue
        span = text[num_m.start():m.end()].strip()
        if span:
            out.append(span)
    return out


@app.route('/extract', methods=['POST'])
def extract_api():
    data = request.get_json(silent=True) or {}
    text = data.get('text', '') or ''
    if not text.strip():
        return jsonify({'groups': []}), 200

    if len(text) > 500_000:
        text = text[:500_000]

    streets, street_spans = _extract_streets(text)

    def _span_collides_with_streets(raw: str) -> bool:
        if not raw or not street_spans:
            return False
        # Cheap check: if the phrase appears inside any street span's text, skip.
        # Streets already carry the full phrase ("ул. Ленина"), so emitting
        # "Ленина" again in geo/names would just duplicate the signal.
        for s, e in street_spans:
            if raw in text[s:e]:
                return True
        return False

    names = _extract_natasha_spans(_natasha_names, text)
    names += _extract_names_lookup(text)
    names = _filter_digit_only(names)
    names = [n for n in names if not _span_collides_with_streets(n)]

    # "Города и страны" — single-token (moscow/kyiv/...) and multi-token
    # ("нижний новгород") lookups over the loaded city/country dictionary.
    # Natasha's AddrExtractor captures full street addresses ("ул. Ленина, 5",
    # "г. Москва, проспект Мира 10"), so it's routed into the streets group
    # below — geo stays clean as "just cities and countries".
    geo = _extract_geo_lookup(text)
    geo = [g for g in geo if not _span_collides_with_streets(g)]

    natasha_addr = _extract_natasha_spans(_natasha_addr, text)
    natasha_addr = [a for a in natasha_addr if not _span_collides_with_streets(a)]
    streets = streets + natasha_addr

    dates = _extract_natasha_spans(_natasha_dates, text)
    dates += [m.group(0) for m in _DATE_SUPPLEMENT_RE.finditer(text)]

    money = _extract_natasha_spans(_natasha_money, text)
    money += [m.group(0).strip() for m in _MONEY_SUPPLEMENT_RE.finditer(text)]
    money += _extract_money_with_dict(text)

    emails = _EMAIL_RE.findall(text)
    urls = [u.rstrip('.,;:!?)]}') for u in _URL_RE.findall(text)]
    phones = _extract_phones(text)
    hashtags = _HASHTAG_RE.findall(text)
    numbers = _NUMBER_RE.findall(text)

    groups = [
        {'id': 'names', 'label': 'Имена', 'items': _dedup_preserve(names)},
        {'id': 'geo', 'label': 'Города и страны', 'items': _dedup_preserve(geo)},
        {'id': 'streets', 'label': 'Улицы и адреса', 'items': _dedup_preserve(streets)},
        {'id': 'dates', 'label': 'Даты', 'items': _dedup_preserve(dates)},
        {'id': 'money', 'label': 'Цены и суммы', 'items': _dedup_preserve(money)},
        {'id': 'emails', 'label': 'Email', 'items': _dedup_preserve(emails)},
        {'id': 'phones', 'label': 'Телефоны', 'items': _dedup_preserve(phones)},
        {'id': 'urls', 'label': 'Ссылки и домены', 'items': _dedup_preserve(urls)},
        {'id': 'hashtags', 'label': 'Хэштеги', 'items': _dedup_preserve(hashtags)},
        {'id': 'numbers', 'label': 'Числа', 'items': _dedup_preserve(numbers)},
    ]
    groups = [g for g in groups if g['items']]

    return jsonify({'groups': groups}), 200


@app.route('/', methods=['GET', 'HEAD'])
def root():
    return 'Service is up', 200

@app.route('/healthz', methods=['GET', 'HEAD'])
def healthz():
    return 'OK', 200

if __name__ == "__main__":
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
