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

@app.route('/decline', methods=['POST'])
def decline_api():
    data = request.get_json(silent=True) or {}
    text = data.get('text', '').strip()
    if not text:
        return jsonify({}), 200

    by_gender = data.get('byGender', True)
    by_number = data.get('byNumber', True)
    by_case   = data.get('byCase', True)

    tokens = text.split()
    result = {}

    for token in tokens:
        parsed = morph.parse(token)[0]
        key = parsed.normal_form

        forms = {}

        if by_case:
            for case in CASES:
                if by_number:
                    for number in NUMBERS:
                        tagset = {case, number}
                        inf = parsed.inflect(tagset)
                        label = f"{case}_{number}"
                        forms[label] = inf.word if inf else None
                else:
                    tagset = {case}
                    inf = parsed.inflect(tagset)
                    label = f"{case}"
                    forms[label] = inf.word if inf else None

                if ('ADJF' in parsed.tag or 'ADJS' in parsed.tag) and by_gender:
                    for gender in GENDERS:
                        if by_number:
                            tagset = {case, 'sing', gender}
                            label = f"{case}_sing_{gender}"
                        else:
                            tagset = {case, gender}
                            label = f"{case}_{gender}"
                        inf = parsed.inflect(tagset)
                        forms[label] = inf.word if inf else None

                    if by_number:
                        tagset = {case, 'plur'}
                        label = f"{case}_plur"
                        inf = parsed.inflect(tagset)
                        forms[label] = inf.word if inf else None

        result[key] = forms

    return jsonify(result), 200


@app.route('/', methods=['GET', 'HEAD'])
def root():
    return 'Service is up', 200

@app.route('/healthz', methods=['GET'])
def healthz():
    return 'OK', 200

if __name__ == "__main__":
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
