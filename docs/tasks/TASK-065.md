# TASK-065 — Gli animali approvati nel catalogo (parole, AI, app)

**Stato**: In corso
**Fase**: 4 · **Branch**: `feat/TASK-065-animal-catalog` (parte da `main`,
che contiene TASK-073)

Assegnato dal coordinatore (2026-09-26). ADR-0061.

## Obiettivo

Farfalla, lumaca e testa di cane si scelgono nell'app, dalle tessere o con
una parola, e si chiedono all'API come le forme del catalogo di oggi.

## Contesto da leggere

- `docs/DECISIONS.md` ADR-0036 (catalogo), ADR-0060 (animali candidati),
  ADR-0065 (testa di cane)
- `docs/tasks/TASK-039.md` (come sono entrate luna, gatto e pesce)
- `samples/LOG.md`, righe di TASK-064 e TASK-068
- `docs/UI.md` «Forma e distanza», `docs/AI.md`

## Cosa c'è già

- I contorni `butterfly.json`, `snail.json`, `dog_head.json` in
  `route_engine/shapes/outlines/`, provabili solo dalla CLI (`--outline`).
- Giudizio dell'utente (`samples/LOG.md`), 15 km:

  | Forma | Trento | Levico | Milano |
  |---|---|---|---|
  | farfalla (`butterfly`) | quasi | quasi | sì |
  | lumaca (`snail`) | sì | no | sì |
  | testa di cane (`dog_head`) | sì | sì | sì |

## Decisioni

- **A. Entrano farfalla, lumaca e testa di cane**: scelto dall'utente
  (messaggio del coordinatore, 2026-09-26). Il cane intero (`dog`) e
  l'uccello (`bird`) restano contorni da CLI. La testa di coniglio
  (`rabbit_head`, TASK-078) forse dopo il merge di #91, se l'utente dice sì.
- **B. Il nome del contratto resta `dog_head`**, come il file. Sullo
  schermo si legge «dog head» (`shapeName`), e «cane», «dog», «dog head»
  portano tutte alla testa: chi chiede un cane vuole il cane che c'è
  (ADR-0061, deciso dall'agente su delega dell'utente).
- **C. Tessere**: emoji come gatto, pesce e cavallo (🦋 🐌 🐶), colore del
  testo da `tokens.ts`; quattro per riga, come oggi.

## Cosa fare

1. Motore: le tre forme in `SHAPES`; i test delle forme del catalogo tengono
   conto dei contorni con più di 64 vertici (lumaca 72, testa di cane 69:
   con i tratti ogni vertice resta).
2. Contratto: `SHAPES` di `shared-types` e `contract.json`.
3. App: parole in `shapeWords.ts`, `shapeName`, tessere, test.
4. AI: una riga per forma in `OUTLINES` (`prompt.py`); le liste di prova
   perdono «cane» e «farfalla» (ora parole della tabella) e prendono parole
   nuove per le tre forme; i test.
5. Verifica: le tre forme chieste come `RouteRequest` danno gli stessi punti
   dei campioni giudicati.
6. Documentazione: `UI.md`, `AI.md`, `ROUTE_ENGINE.md` §2, `DECISIONS.md`
   (ADR-0061), `STATUS.md`.
7. Prova sull'iPhone con l'utente: le tre forme dalle tessere, con una
   parola, un percorso a Trento o Milano.

## Criteri di accettazione

- [ ] Dalla radice `npm run lint`, `npm run format:check`,
      `npm run typecheck` e `npm test` passano; in `services/route-engine/`,
      `services/ai/` e `services/api/` `ruff`, `black --check` e
      `pytest -m "not network"` passano.
- [ ] Ogni forma del catalogo ha parole italiane e inglesi, e le nuove
      portano alla forma giusta (`shapeWords.test.ts`); «uccello» e «bird»
      no.
- [ ] `plan_route` con le tre forme dà gli stessi punti dei campioni
      giudicati di TASK-064 e TASK-068.
- [ ] Sull'iPhone le tre forme si scelgono dalle tessere e con una parola,
      e disegnano un percorso (prova dell'utente).
- [ ] I job della CI sono verdi sulla PR.
- [ ] `UI.md`, `AI.md`, `ROUTE_ENGINE.md`, `STATUS.md`, `DECISIONS.md`
      aggiornati.

## File toccati

```
services/route-engine/route_engine/shapes/__init__.py
services/route-engine/tests/test_shapes.py
packages/shared-types/src/index.ts
packages/shared-types/fixtures/contract.json
apps/mobile/src/route/shapeWords.ts
apps/mobile/src/route/shapeWords.test.ts
apps/mobile/src/route/ShapeTiles.tsx
apps/mobile/__tests__/App.test.tsx
services/ai/shaperoute_ai/prompt.py
services/ai/tests/phrases.json
services/ai/tests/phrases-holdout.json
services/ai/tests/test_ollama.py
services/ai/tests/test_reading.py
docs/UI.md
docs/AI.md
docs/ROUTE_ENGINE.md
docs/DECISIONS.md
docs/STATUS.md
docs/tasks/TASK-065.md
```

## Fuori scope

- Il cane intero e l'uccello: restano contorni da CLI.
- La testa di coniglio: solo dopo il merge di #91 e il sì dell'utente.
- Disegnare i contorni veri nelle tessere (`react-native-svg`, dipendenza
  non chiesta).
- `route_engine/__main__.py`, le partenze vicine (TASK-076),
  `apps/mobile/src/navigation/` (TASK-074), `words.py`, `letters*.json`,
  `optimizer.py`.

## Verifica: le forme del catalogo danno i percorsi giudicati (2026-09-26)

`plan_route` con `RouteRequest(shape=…, distance_m=15000)` dalle partenze
di `docs/TESTING.md`, con i grafi di zona in memoria come l'API
(`ZoneGraphs`, cache `D:\shaperoute-data\cache`, una zona alla volta).
Punti confrontati con 7 decimali, come nel GPX. Somiglianza · km · tempo.

| Forma | Trento | Levico | Milano |
|---|---|---|---|
| `butterfly` | uguale · 0,93 · 14,1 · 24 s | uguale · 0,84 · 15,0 · 20 s | uguale · 0,97 · 15,8 · 34 s |
| `snail` | uguale · 0,94 · 13,5 · 12 s | uguale · 0,94 · 15,8 · 10 s | uguale · 1,00 · 15,2 · 27 s |
| `dog_head` | uguale · 0,97 · 15,6 · 17 s | uguale · 0,95 · 15,4 · 4 s | uguale · 0,99 · 16,4 · 28 s |

Tutti e nove punto per punto uguali ai campioni di TASK-064 e TASK-068
(`samples/`). Lo script è fuori dal repository (scratchpad della sessione).

## Esito

*(a fine task)*
