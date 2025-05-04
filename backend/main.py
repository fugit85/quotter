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

    tokens = text.split()
    result = {}

    for token in tokens:
        parsed = morph.parse(token)[0]
        key = parsed.normal_form  # ключем будет начальная форма

        forms = {}

        for case in CASES:
            for number in NUMBERS:
                tagset = {case, number}
                inf = parsed.inflect(tagset)
                label = f"{case}_{number}"
                forms[label] = inf.word if inf else None
                
        if 'ADJF' in parsed.tag.POS or 'ADJS' in parsed.tag.POS:
            for case in CASES:
                # единственное число
                for gender in GENDERS:
                    tagset = {case, 'sing', gender}
                    inf = parsed.inflect(tagset)
                    label = f"{case}_sing_{gender}"
                    forms[label] = inf.word if inf else None
                tagset = {case, 'plur'}
                inf = parsed.inflect(tagset)
                label = f"{case}_plur"
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
