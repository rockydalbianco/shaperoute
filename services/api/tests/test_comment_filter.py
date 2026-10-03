"""No negative comments (TASK-213, ADR-0176): the words a comment is refused
for, the ways they get written, and the harmless words and places that must
pass."""

from __future__ import annotations

import pytest

from shaperoute_api.comment_filter import (
    ALSO_PLACES,
    INSULTS,
    NEGATIONS,
    NEGATIVE,
    NEGATIVE_WORDS,
    PHRASES,
    _plain,
    check_comment,
)


@pytest.mark.parametrize(
    "text",
    [
        "",
        "Che bel percorso!",
        "Bellissimo cuore, complimenti 👏",
        "Grande! La prossima la facciamo insieme",
        "Non male per essere la prima volta",
        "Oddio che bello, lo rifaccio domani",
        "Ne vale la pena, anche con la salita",
        "Partenza ritardata ma corsa stupenda",
        "Great run, well done!",
        "As fast as last week, nice pace",
        "Killer climb at km 7 🔥❤️👍",
        "21 km in 1:45, 5:00/km",
    ],
)
def test_kind_comments_pass(text: str) -> None:
    assert check_comment(text) is None


@pytest.mark.parametrize(
    "text",
    [
        "Che brutto percorso",
        "Fa schifo",
        "Sei uno stronzo",
        "pessimo disegno, sembra una patata",
        "che palle questa salita",
        "This route is ugly",
        "Worst run ever",
        "You're an idiot",
        "boring",
        "Bad route.",
        "I hate this shape",
        "porco dio che caldo",
        "go to hell",
    ],
)
def test_negative_comments_are_refused(text: str) -> None:
    assert check_comment(text) == NEGATIVE


@pytest.mark.parametrize(
    "text",
    [
        "BRUTTO",
        "bruttttto davvero",
        "schifoooooo",
        "Brùttò",
        "str0nz0",
        "$hit",
        "sh1t route",
        "stron_zo",
        "ｓｈｉｔ",
        "m e r d a",
        "è s.t.r.o.n.z.o",
        "che c-a-z-z-o",
    ],
)
def test_disguised_words_are_refused(text: str) -> None:
    assert check_comment(text) == NEGATIVE


@pytest.mark.parametrize(
    "text",
    [
        "Non è affatto brutto",
        "Non è stato per niente noioso",
        "not bad at all",
        "Not that boring after all",
        "It isn't ugly, it's a cat",
        "I don't hate hills anymore",
    ],
)
def test_a_negation_turns_a_negative_word_around(text: str) -> None:
    assert check_comment(text) is None


@pytest.mark.parametrize(
    "text",
    [
        "Non mi è piaciuto, brutto",
        "non sei uno stronzo, sei un idiota",
        "not an idiot",
        "Bello? No, brutto",
    ],
)
def test_a_negation_far_away_or_before_an_insult_does_not(text: str) -> None:
    assert check_comment(text) == NEGATIVE


@pytest.mark.parametrize(
    "text",
    [
        # places
        "Bel giro a Troia, in Puglia",
        "Da Bastardo a Giano dell'Umbria, che corsa",
        "Weekend run in Bad Ischl",
        "Spa run around Bad Gastein and Bad Hofgastein",
        "Up to Crap Sogn Gion before the lifts open",
        "Running in Boring, Oregon",
        "Corsa da Cazzago San Martino a Rovato",
        "Palazzo Schifanoia a Ferrara",
        "Cogliate, Porcari, Porcia, Coglio",
        "Scunthorpe, Shitterton, Bitche, Twatt, Ugley",
        "Merdrignac to Fugging and the Wank",
        # everyday words
        "Spaghetti alla puttanesca dopo la corsa",
        "Risotto ai funghi porcini",
        "Ho corso con gli zoccoli? No, con le scarpe nuove",
        "Finocchio e arance per cena",
        "Dumbbell session before, run after",
        "Cocktail at the end of the class",
        "Ci siamo ammazzati di fatica ma che bello",
        "Scarsa visibilità ma percorso stupendo",
        "Assist da campione",
    ],
)
def test_places_and_harmless_words_pass(text: str) -> None:
    assert check_comment(text) is None


@pytest.mark.parametrize(
    "text",
    ["sei una troia", "Troia!", "You are BAD", "What a bad route", "crap"],
)
def test_a_place_name_is_a_place_only_with_a_capital_mid_sentence(
    text: str,
) -> None:
    assert check_comment(text) == NEGATIVE


@pytest.mark.parametrize("emoji", ["🖕", "👎🏻", "💩", "🤮", "🤬"])
def test_negative_emoji_are_refused(emoji: str) -> None:
    assert check_comment(f"Nice {emoji}") == NEGATIVE


def test_every_listed_word_is_refused_alone() -> None:
    for word in sorted(INSULTS | NEGATIVE_WORDS):
        assert check_comment(word) == NEGATIVE, word
    for phrase in PHRASES:
        assert check_comment(" ".join(phrase)) == NEGATIVE, phrase


def test_the_lists_are_written_as_they_are_compared() -> None:
    """Lower case, no accents, no digits: a word written otherwise in a list
    would never match."""
    listed = INSULTS | NEGATIVE_WORDS | NEGATIONS | ALSO_PLACES
    listed |= {part for phrase in PHRASES for part in phrase}
    for word in listed:
        assert word == _plain(word) and word.isalpha(), word
    assert ALSO_PLACES <= INSULTS | NEGATIVE_WORDS
