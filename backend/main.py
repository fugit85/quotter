import os
from flask import Flask, request, jsonify
from flask_cors import CORS
import pymorphy3
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


morph = pymorphy3.MorphAnalyzer()

CASES   = ['nomn', 'gent', 'datv', 'accs', 'ablt', 'loct']
NUMBERS = ['sing', 'plur']
GENDERS = ['masc', 'femn', 'neut']


def _inflect_surface(parsed, tagset, original_token):
    inf = parsed.inflect(tagset)
    return inf.word if inf else original_token


def _append_unique(ordered, seen, value):
    if not value or value in seen:
        return
    seen.add(value)
    ordered.append(value)


def _collect_single_word_forms(token, parsed, by_gender, by_number, by_case):
    """Плоский список словоформ; без падежей перебирается только именительный."""
    out = []
    seen = set()
    is_adj = 'ADJF' in parsed.tag or 'ADJS' in parsed.tag
    cases_iter = CASES if by_case else ['nomn']

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


def _collect_phrase_forms(tokens, parsed_list, by_gender, by_number, by_case):
    """Склоняет фразу целиком: одни и те же падеж/число/род на всех словах."""
    out = []
    cases_iter = CASES if by_case else ['nomn']
    has_adj = any('ADJF' in p.tag or 'ADJS' in p.tag for p in parsed_list)

    for case in cases_iter:
        if by_number:
            for number in NUMBERS:
                phrase_form = []
                for token, parsed in zip(tokens, parsed_list):
                    inflected = parsed.inflect({case, number})
                    phrase_form.append(inflected.word if inflected else token)
                out.append(' '.join(phrase_form))
        else:
            phrase_form = []
            for token, parsed in zip(tokens, parsed_list):
                inflected = parsed.inflect({case})
                phrase_form.append(inflected.word if inflected else token)
            out.append(' '.join(phrase_form))

        if has_adj and by_gender:
            for gender in GENDERS:
                if by_number:
                    phrase_form = []
                    for token, parsed in zip(tokens, parsed_list):
                        inflected = parsed.inflect({case, 'sing', gender})
                        phrase_form.append(inflected.word if inflected else token)
                    out.append(' '.join(phrase_form))
                else:
                    phrase_form = []
                    for token, parsed in zip(tokens, parsed_list):
                        inflected = parsed.inflect({case, gender})
                        phrase_form.append(inflected.word if inflected else token)
                    out.append(' '.join(phrase_form))
            if by_number:
                phrase_form = []
                for token, parsed in zip(tokens, parsed_list):
                    inflected = parsed.inflect({case, 'plur'})
                    phrase_form.append(inflected.word if inflected else token)
                out.append(' '.join(phrase_form))
    return out


@app.route('/decline', methods=['POST'])
def decline_api():
    data = request.get_json(silent=True) or {}
    raw = data.get('text', '') or ''
    if not raw.strip():
        return jsonify([]), 200

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
        parsed_list = [morph.parse(t)[0] for t in tokens]

        if len(tokens) == 1:
            chunk = _collect_single_word_forms(
                tokens[0], parsed_list[0], by_gender, by_number, by_case
            )
        else:
            chunk = _collect_phrase_forms(
                tokens, parsed_list, by_gender, by_number, by_case
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
