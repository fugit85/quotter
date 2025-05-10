import os
from flask import Flask, request, jsonify
from flask_cors import CORS
import pymorphy3

app = Flask(__name__)
CORS(app)

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

    # Получаем настройки пользователя с фронтенда (по умолчанию True)
    by_gender = data.get('byGender', True)
    by_number = data.get('byNumber', True)
    by_case   = data.get('byCase', True)

    tokens = text.split()
    result = {}

    for token in tokens:
        parsed = morph.parse(token)[0]
        key = parsed.normal_form  # ключ — начальная форма слова

        forms = {}

        if by_case:
            for case in CASES:
                # Если разрешено склонять по числам
                if by_number:
                    for number in NUMBERS:
                        tagset = {case, number}
                        inf = parsed.inflect(tagset)
                        label = f"{case}_{number}"
                        forms[label] = inf.word if inf else None
                else:
                    # Только по падежам без учета числа
                    tagset = {case}
                    inf = parsed.inflect(tagset)
                    label = f"{case}"
                    forms[label] = inf.word if inf else None

                # Если это прилагательное и разрешено склонять по родам
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

                    # Множественное число при включенном числе
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
