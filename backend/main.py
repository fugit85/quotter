import os
from flask import Flask, request, jsonify
from flask_cors import CORS
import pymorphy3
import morfeusz2
import requests

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

    # Проверка reCAPTCHA
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


# Отдельные анализаторы: ru и uk не смешиваются
morph_ru = pymorphy3.MorphAnalyzer(lang="ru")
morph_uk = pymorphy3.MorphAnalyzer(lang="uk")
morph_pl = morfeusz2.Morfeusz()

# Русский:  «школьные» 6 падежей (без звательного в цикле — для большинства лексем совпадает с ном. или редко).
CASES_RU = ['nomn', 'gent', 'datv', 'accs', 'ablt', 'loct']
# Украинский: 7 падежей с кличным (voct) — pymorphy3-dicts-uk, граммемы OpenCorpora.
CASES_UK = ['nomn', 'gent', 'datv', 'accs', 'ablt', 'loct', 'voct']
# Польский (NKJP / Morfeusz): 7 падежей, включая wołacz (voc).
CASES_PL = ['nom', 'gen', 'dat', 'acc', 'inst', 'loc', 'voc']
PL_NUMBERS = ['sg', 'pl']
# Подроды мужского + женский + средний (NKJP); для прилагательных перебираем варианты согласования.
PL_ADJ_GENDERS = ['m1', 'm2', 'm3', 'f', 'n']
PL_DECL_POS = frozenset({'subst', 'adj', 'num'})

NUMBERS = ['sing', 'plur']
GENDERS = ['masc', 'femn', 'neut']


def _morph_for_lang(lang: str):
    if lang == "uk":
        return morph_uk
    return morph_ru


def _cases_for_lang(lang: str):
    if lang == "uk":
        return CASES_UK
    return CASES_RU


def _pl_lemma_tag_from_row(row):
    """Morfeusz2: элемент analyse — (start, end, (orth, lemma, tag, name, labels))."""
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
    """Польский NKJP в Morfeusz сливает совпадающие формы: nom.acc, gen.dat, ..."""
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
    """Morfeusz2.generate ожидает целочисленный tagId, не строку тега."""
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
    """rows: list of (lemma, tag) | None; None — токен без номинальной интерпретации Morfeusz."""
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


def _inflect_surface(parsed, tagset, original_token):
    """Поверхностная форма; для звательного без результата — None (не подставлять номинатив)."""
    inf = parsed.inflect(tagset)
    if inf:
        return inf.word
    if 'voct' in tagset:
        return None
    return original_token


def _append_unique(ordered, seen, value):
    if not value or value in seen:
        return
    seen.add(value)
    ordered.append(value)


def _collect_single_word_forms(token, parsed, by_gender, by_number, by_case, cases):
    out = []
    seen = set()
    is_adj = 'ADJF' in parsed.tag or 'ADJS' in parsed.tag
    cases_iter = cases if by_case else ['nomn']

    for case in cases_iter:
        if by_number:
            for number in NUMBERS:
                w = _inflect_surface(parsed, {case, number}, token)
                _append_unique(out, seen, w)
        else:
            w = _inflect_surface(parsed, {case}, token)
            _append_unique(out, seen, w)

        if is_adj and by_gender:
            for gender in GENDERS:
                if by_number:
                    w = _inflect_surface(parsed, {case, 'sing', gender}, token)
                    _append_unique(out, seen, w)
                else:
                    w = _inflect_surface(parsed, {case, gender}, token)
                    _append_unique(out, seen, w)

            if by_number:
                w = _inflect_surface(parsed, {case, 'plur'}, token)
                _append_unique(out, seen, w)

    return out


def _phrase_line_inflect(tokens, parsed_list, tagset, *, strict_voct: bool):
    """Собирает фразу; при strict_voct (кличный, укр.) любая неудача inflect — строка отбрасывается."""
    parts = []
    for token, parsed in zip(tokens, parsed_list):
        inflected = parsed.inflect(tagset)
        if not inflected:
            if strict_voct:
                return None
            parts.append(token)
        else:
            parts.append(inflected.word)
    return ' '.join(parts)


def _collect_phrase_forms(tokens, parsed_list, by_gender, by_number, by_case, cases, *, lang: str):
    out = []
    cases_iter = cases if by_case else ['nomn']
    has_adj = any('ADJF' in p.tag or 'ADJS' in p.tag for p in parsed_list)
    strict_voct = lang == 'uk'

    for case in cases_iter:
        is_voct = case == 'voct'
        if by_number:
            for number in NUMBERS:
                line = _phrase_line_inflect(
                    tokens, parsed_list, {case, number}, strict_voct=is_voct and strict_voct
                )
                if line is not None:
                    out.append(line)
        else:
            line = _phrase_line_inflect(tokens, parsed_list, {case}, strict_voct=is_voct and strict_voct)
            if line is not None:
                out.append(line)

        if has_adj and by_gender:
            for gender in GENDERS:
                if by_number:
                    line = _phrase_line_inflect(
                        tokens, parsed_list, {case, 'sing', gender}, strict_voct=is_voct and strict_voct
                    )
                    if line is not None:
                        out.append(line)
                else:
                    line = _phrase_line_inflect(
                        tokens, parsed_list, {case, gender}, strict_voct=is_voct and strict_voct
                    )
                    if line is not None:
                        out.append(line)
            if by_number:
                line = _phrase_line_inflect(
                    tokens, parsed_list, {case, 'plur'}, strict_voct=is_voct and strict_voct
                )
                if line is not None:
                    out.append(line)
    return out


@app.route('/decline', methods=['POST'])
def decline_api():
    data = request.get_json(silent=True) or {}
    raw = data.get('text', '') or ''
    if not raw.strip():
        return jsonify([]), 200

    lang = (data.get('lang') or 'ru').strip().lower()
    if lang not in ('uk', 'pl'):
        lang = 'ru'

    by_gender = data.get('byGender', True)
    by_number = data.get('byNumber', True)
    by_case = data.get('byCase', True)

    merged = []
    seen = set()

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
            parsed_list = [morph.parse(t)[0] for t in tokens]
            if len(tokens) == 1:
                chunk = _collect_single_word_forms(
                    tokens[0], parsed_list[0], by_gender, by_number, by_case, cases
                )
            else:
                chunk = _collect_phrase_forms(
                    tokens, parsed_list, by_gender, by_number, by_case, cases, lang=lang
                )

        for item in chunk:
            _append_unique(merged, seen, item)

    return jsonify(merged), 200


@app.route('/', methods=['GET', 'HEAD'])
def root():
    return 'Service is up', 200

@app.route('/healthz', methods=['GET', 'HEAD'])
def healthz():
    return 'OK', 200

if __name__ == "__main__":
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
