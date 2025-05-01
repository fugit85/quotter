import os
from flask import Flask, request, jsonify
import pymorphy3

app = Flask(__name__)
morph = pymorphy3.MorphAnalyzer()

@app.route('/inflector', methods=['POST'])
def inflector():
    data = request.get_json() or {}
    text = data.get('text', '').strip()
    if not text:
        return jsonify({'result': ''}), 200

    # Разбиваем на слова и склоняем каждое в родительный падеж
    tokens = text.split()
    declined = []
    for token in tokens:
        p = morph.parse(token)[0]
        inf = p.inflect({'gent'})
        declined.append(inf.word if inf else token)

    return jsonify({'result': ' '.join(declined)})

@app.route('/healthz', methods=['GET'])
def healthz():
    return 'OK', 200

if __name__ == "__main__":
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
