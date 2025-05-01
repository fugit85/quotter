from flask import Flask, request, jsonify
from pymorphy3 import MorphAnalyzer

app = Flask(__name__)
morph = MorphAnalyzer()

@app.route('/inflect', methods=['POST'])
def inflect():
    data = request.get_json()
    text = data.get('text')
    cases = data.get('cases')
    
    if not text or not cases:
        return jsonify({'error': 'Invalid input'}), 400
    
    words = text.split()
    result = {}
    
    for word in words:
        base_form = morph.parse(word)[0].normal_form  # Получаем базовую форму
        inflected_forms = {}
        
        for case in cases:
            try:
                inflected_forms[case] = morph.parse(base_form)[0].inflect({case}).word
            except AttributeError:
                inflected_forms[case] = None  # Если склонение невозможно
        
        result[base_form] = inflected_forms

    return jsonify(result)

@app.route('/healthz', methods=['GET'])
def healthz():
    return "OK", 200

if __name__ == '__main__':
    app.run(debug=True)
