from flask import Flask, render_template, request, jsonify
import nltk
from nltk.corpus import words

import string

nltk.download('words', quiet=True)
word_set = set(w.lower() for w in words.words())

app = Flask(__name__)

STATE_FORBIDDEN = 0
STATE_PRESENT = 1
STATE_CORRECT = 2

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/analyze', methods=['POST'])
def analyze():
    data = request.json
    # Data: list of 6 rows; each row list of dicts {letter:str, state:int}

    forbidden_letters = set()
    conditions = {i: [] for i in range(5)}
    correct_letters = {}
    present_letters = set()

    for row in data:
        for i, cell in enumerate(row):
            letter = cell.get('letter', '').lower()
            state = cell.get('state', 0)
            if letter:
                if state == STATE_FORBIDDEN:
                    forbidden_letters.add(letter)
                elif state == STATE_PRESENT:
                    conditions[i].append(letter)
                    present_letters.add(letter)
                elif state == STATE_CORRECT:
                    correct_letters[i] = letter
                    present_letters.add(letter)

    # Validate partial words: if any entered row has between 1 and 4 letters → error
    for row in data:
        letters_in_row = [cell.get('letter', '') for cell in row if cell.get('letter', '')]
        if 0 < len(letters_in_row) < 5:
            return jsonify({'error': 'All entered words must have exactly 5 letters.'}), 400

    valid_words = search_words(forbidden_letters, conditions, correct_letters, present_letters)

    if not valid_words:
        return jsonify({'probability': 0, 'valid_words': []})

    probability = 1 / len(valid_words)
    return jsonify({
        'probability': probability,
        'valid_words': valid_words
    })

def search_words(forbiddenLetters, conditions, correctLetters, presentLetters):
    results = set()
    for word in word_set:
        if len(word) != 5:
            continue
        # Forbidden letters filtering only applies to letters NOT in presentLetters
        if any(l in forbiddenLetters for l in word if l not in presentLetters):
            continue
        # Letters that are known to be present elsewhere must NOT be at these positions
        if any(word[pos] in letters for pos, letters in conditions.items()):
            continue
        # All present letters must be somewhere in the word
        if not all(letter in word for letter in presentLetters):
            continue
        # Correct letters must be at exact positions
        if any(word[pos] != letter for pos, letter in correctLetters.items()):
            continue
        results.add(word)
    return sorted(results)

if __name__ == '__main__':
    app.run(debug=True)
