from flask import Flask, request, jsonify
import pymorphy3

app = Flask(__name__)

# Инициализируем pymorphy3
morph = pymorphy3.MorphAnalyzer()

# Функция для склонения слова
def decline_word(word, case):
    parsed_word = morph.parse(word)[0]
    return parsed_word.inflect({case}).word

# Эндпоинт для склонения
@app.route('/decline', methods=['POST'])
def decline():
    data = request.json  # Получаем данные из запроса
    word = data.get('word')  # Слово, которое нужно склонять
    case = data.get('case')  # Падеж, в который нужно склонять

    # Проверка на наличие данных
    if not word or not case:
        return jsonify({'error': 'Word and case are required'}), 400

    try:
        # Слово и падеж могут быть переданы в виде строк, поэтому добавим маппинг
        case_map = {
            'nominative': pymorphy3.case.NOMINATIVE,
            'genitive': pymorphy3.case.GENITIVE,
            'dative': pymorphy3.case.DATIVE,
            'accusative': pymorphy3.case.ACCUSATIVE,
            'instrumental': pymorphy3.case.INSTRUMENTAL,
            'prepositional': pymorphy3.case.PREPOSITIONAL
        }
        
        # Получаем падеж из маппинга
        case_enum = case_map.get(case.lower())
        if not case_enum:
            return jsonify({'error': 'Invalid case'}), 400

        # Склоняем слово
        declined_word = decline_word(word, case_enum)
        
        # Возвращаем склоненное слово в ответе
        return jsonify({'original': word, 'case': case, 'declined': declined_word})

    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
