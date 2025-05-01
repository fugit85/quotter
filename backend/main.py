import os
from flask import Flask, request, jsonify
from flask_cors import CORS
import pymorphy3

app = Flask(__name__)
CORS(app)  # разрешаем запросы со страниц на GitHub Pages

morph = pymorphy3.MorphAnalyzer()

@app.route('/decline', methods=['POST'])
def decline_api():
    data = request.get_json(silent=True) or {}
    text = data.get('text', '').strip()
    if not text:
        return jsonify({'result': ''}), 200

    tokens = text.split()
    declined = []
    for token in tokens:
        p = morph.parse(token)[0]
        inf = p.inflect({'gent'})
        declined.append(inf.word if inf else token)

    return jsonify({'result': ' '.join(declined)}), 200

@app.route('/healthz', methods=['GET'])
def healthz():
    return 'OK', 200

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
