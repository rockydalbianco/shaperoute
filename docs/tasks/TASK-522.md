# TASK-522 — La A a penna alzata senza punta

**Stato**: Done · **Coordinatore**: fork 3 · 2026-11-27 · ADR-0418

**Esito**: #1696 in `main` (`b2a6ff46`). A penna alzata la A tonda ha la
punta e la Q tonda l'anello; le parole chiuse sono le stesse punto per
punto. Restano il passo 27 sul server e l'OTA sulla 1.2.0.

## Il difetto

Trovato da TASK-521 (`out/TASK-521/analisi.md` della copia principale):
nelle parole a penna alzata la A sembra una «n», «VAI» si legge «VnI».
Riguardava circa 140 parole del catalogo.

## La causa (parte 0)

Analisi in `out/TASK-522/PARTE-0.md` della copia principale.

- `route_engine/letters.json` è disegnato per la parola chiusa: ogni
  lettera è `out` (dall'ingresso all'uscita sulla base) più `back`
  (dall'uscita all'ingresso). La A tonda ha in `out` solo la parte bassa
  con la stanghetta, alta 0,4: la punta sta solo in `back`.
- `words._pen_up` (TASK-197) componeva la parola a penna alzata con il solo
  `out` di ogni lettera.
- Il motore non taglia niente nelle parole: `pen_up._lifted` e `_spike`
  valgono solo per i pezzi delle forme.

Stessa causa per altre lettere: la Q tonda (di lei restava solo la coda),
R, B, D tonde (un tratto corto) e A, B, D, O, Q, R squadrate. Per scelta del
Coordinatore qui solo la A e la Q tonde; le altre sono un seguito da
proporre all'utente.

## La correzione

- `letters.json`: una chiave facoltativa `pen`, la linea aperta disegnata a
  penna alzata dallo stesso ingresso alla stessa uscita. La A:
  0/0 → 0,12/0,4 → 0,3/1 → 0,48/0,4 → 0,12/0,4 → 0,48/0,4 → 0,6/0 (con
  quattro nodi dispari un tratto va ripassato: la stanghetta, il più
  corto). La Q: l'anello dall'ingresso, poi la coda come la disegna `out`.
- `words.py`: `Letter.pen` e `Letter.pen_line` (`pen`, altrimenti `out`);
  `parse_letters` controlla che `pen` abbia gli estremi di `out` e resti
  dentro la lettera; `_pen_up` usa `pen_line`. `out` e `back` non cambiano.
- I percorsi tenuti (ADR-0418): impronta del motore nuova con prova degli
  stessi percorsi (`SAME_ROUTES_AS` 71c18b07221b → 030243086cea,
  be0cdba04cc4 → da3da1914fdf, 6dffc96ddaf5 → f01152178efe; prova sul Mac).
  Le parole a penna alzata con la A o la Q cambiano davvero:
  `route_store.kept_engine` le tiene sotto l'impronta con «+L2», sia nei
  file di `route_store` sia nelle righe di `route_archive`.
- `engine.zip` ricostruito per ultimo: cambiano solo `words.py` e
  `letters.json`.

Due hash fissati cambiano apposta, perché CIAO ha la A:
`test_kept_per_graph.py` «town CIAO pen up 12000» (`7e88ef490a83b5e3` →
`22195c9b1b48dc11`) e `test_pieces_before.py` «penup:ciao»
(`e54d4d83296c6a06`, 157 punti → `4738f558c0a7d066`, 151 punti).

## File toccati

- `services/route-engine/route_engine/letters.json`
- `services/route-engine/route_engine/words.py`
- `services/route-engine/tests/test_words.py`
- `services/route-engine/tests/test_pen_up.py`
- `services/route-engine/tests/test_kept_per_graph.py` (una riga, sì del Coordinatore)
- `services/route-engine/tests/test_pieces_before.py` (una riga, sì del Coordinatore)
- `services/api/shaperoute_api/route_store.py`
- `services/api/shaperoute_api/route_archive.py` (una riga, sì del Coordinatore)
- `services/api/tests/test_route_store.py`
- `services/api/tests/fixtures/same_routes/71c18b07221b.json` (nuovo)
- `apps/mobile/assets/engine/engine.zip`
- Documenti: `docs/tasks/TASK-522.md` (nuovo), `docs/ROUTE_ENGINE.md`,
  `docs/DECISIONS.md`, `docs/archive/COMPLETATI.md`

## Resta

- [ ] **Passo 27 sul server** (Coordinatore, col sì dell'utente): il deploy
  di `b2a6ff46` o successivo. Nessun lavoro ridisegna in background: le
  parole a penna alzata con A o Q si ridisegnano alla prossima richiesta
  (le righe vecchie di `drawn_routes` diventano stale, i file vecchi non si
  trovano più). Conteggio in sola lettura, prima e dopo:
  `SELECT count(*) FROM drawn_routes WHERE pen_up AND style = 'round' AND (word LIKE '%A%' OR word LIKE '%Q%');`
  Gli esempi delle città CIAO e AMORE (2 delle 6 parole di
  `city_examples.WORDS`) si possono rifare prima con
  `python -m shaperoute_api.draw_examples --api … --all <città>`, se
  l'utente vuole.
- [ ] **OTA sulla 1.2.0** (Coordinatore): il motore sul telefono
  (`engine.zip`) con la A e la Q nuove.
- Le 140 parole del catalogo con la A: le toglie TASK-521 (#1685).
- Seguito da proporre all'utente: R, B, D tonde e le lettere squadrate.
