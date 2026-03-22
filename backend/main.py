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
    data = request.get_json()
    comment = data.get("comment", "")
    contact = data.get("contact", "")
    url = data.get("url", "")
    token = data.get("recaptcha_token", "")

    if not comment:
        return jsonify({"ok": False}), 400

    # Проверка reCAPTCHA
    secret = os.environ.get("RECAPTCHA_SECRET")
    if secret and token:
        r = requests.post("https://www.google.com/recaptcha/api/siteverify", data={
            "secret": secret,
            "response": token
        })
        result = r.json()
        score = result.get("score", 0)
        if not result.get("success") or score < 0.5:
            return jsonify({"ok": False, "error": "Проверка не пройдена"}), 400

    text = f"""
Новый отзыв:

Комментарий:
{comment}

Контакт:
{contact}

Страница:
{url}
"""

    try:
        requests.post(
            f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage",
            json={"chat_id": CHAT_ID, "text": text}
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
    """Та же схема меток/циклов, что в старом API, но плоский список строк."""
    out = []
    seen = set()
    is_adj = 'ADJF' in parsed.tag or 'ADJS' in parsed.tag

    if not by_case:
        return out

    for case in CASES:
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


def _collect_phrase_forms(tokens, parsed_list, by_number, by_case):
    """Склоняет всю фразу целиком: каждое слово в одном падеже (и числе)."""
    out = []
    if not by_case:
        return out
    for case in CASES:
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
            chunk = _collect_phrase_forms(tokens, parsed_list, by_number, by_case)

        for item in chunk:
            _append_unique(merged, seen, item)

    return jsonify(merged), 200


@app.route('/', methods=['GET', 'HEAD'])
def root():
    return 'Service is up', 200

@app.route('/healthz', methods=['GET'])
def healthz():
    return 'OK', 200

if __name__ == "__main__":
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
