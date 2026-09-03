import sys
import json
import genanki
import random

def generate_apkg(input_json_path, output_apkg_path):
    with open(input_json_path, 'r', encoding='utf-8') as f:
        flashcards = json.load(f)

    # Define a basic Anki model
    my_model = genanki.Model(
        1607392319, # Random, unique ID
        'Simple Model',
        fields=[
            {'name': 'Question'},
            {'name': 'Answer'},
        ],
        templates=[
            {
                'name': 'Card 1',
                'qfmt': '{{Question}}',
                'afmt': '{{FrontSide}}<hr id="answer">{{Answer}}',
            },
        ])

    # Create a new Anki deck
    deck_id = random.randrange(1 << 30, 1 << 31)
    my_deck = genanki.Deck(deck_id, 'Transcribed Meeting Flashcards')

    for card in flashcards:
        note = genanki.Note(
            model=my_model,
            fields=[card.get('front', ''), card.get('back', '')]
        )
        my_deck.add_note(note)

    # Package and save
    genanki.Package(my_deck).write_to_file(output_apkg_path)
    print(output_apkg_path)

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python export_anki.py <input_json_path> <output_apkg_path>")
        sys.exit(1)
        
    generate_apkg(sys.argv[1], sys.argv[2])
