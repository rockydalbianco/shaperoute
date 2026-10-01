# TASK-088 — Zucca e albero di Natale nel catalogo (parole, AI, app)

**Stato**: Done
**Fase**: 4 · **Branch**: `feat/TASK-088-seasonal-catalog` (parte da `main`)

Approvato dall'utente il 2026-09-30. ADR-0084 (era 0083, preso intanto da TASK-089). Numeri presi senza
coordinatore: primi liberi fra branch remoti e worktree (087/ADR-0082 sono
del ritaglio della zona, 089 e seguenti già presi).

## Obiettivo

La zucca di Halloween (`pumpkin`) e l'albero di Natale (`christmas_tree`)
si scelgono nell'app, dalle tessere o con una parola, e si chiedono
all'API come le altre forme del catalogo.

## Contesto da leggere

- `docs/DECISIONS.md` ADR-0036 (catalogo), ADR-0073 (i due contorni),
  ADR-0061 (come sono entrati gli animali)
- `docs/tasks/TASK-065.md` (il modello), `docs/tasks/TASK-078.md`
- `docs/UI.md` «Forma e distanza», `docs/AI.md`

## Cosa c'è già

- I contorni `pumpkin.json` e `christmas_tree.json` in
  `route_engine/shapes/outlines/` (TASK-078), finora solo dalla CLI.
- Giudizio dell'utente a 15 km (`samples/LOG.md`): zucca `no` a Trento,
  `quasi` a Levico, `sì` a Milano; albero di Natale `quasi` a Trento, `no`
  a Levico, `sì` a Milano. L'utente lo sa e le vuole nel catalogo.
- `tree.json` (TASK-034/037): un altro contorno, non nel catalogo.

## Decisioni

- **A. Entrano tutte e due**: scelta dell'utente, da non ridiscutere.
- **B. «albero» e «tree» da soli non cambiano significato** (chiesto
  dall'utente): fuori dalla tabella, e «nessuna forma» per l'AI. Le parole
  della tabella sono in ADR-0084.
- **C. Tessere** 🎃 e 🎄, in una riga sola che scorre di lato (chiesto
  dall'utente il 2026-10-01, ADR-0084); la forma scritta nel campo porta la
  sua tessera in vista.

## Cosa fare

1. Motore: le due forme in `SHAPES`; test.
2. AI: due righe in `OUTLINES`; liste di prova; misura con qwen3:4b.
3. App: parole, tessere, test.
4. Contratto: `SHAPES` di `shared-types` e `contract.json` — **dopo
   TASK-084**, che ha quei file, o con l'ok dell'utente.
5. Verifica: le due forme chieste all'API danno i campioni di TASK-078.
6. Documenti: `UI.md`, `AI.md`, `ROUTE_ENGINE.md`, `DECISIONS.md`, `STATUS.md`.
7. Prova sull'iPhone con l'utente, a Milano.

## Criteri di accettazione

- [x] Dalla radice `npm run lint`, `npm run format:check`,
      `npm run typecheck` e `npm test` passano (451 test); in
      `services/route-engine/` (865), `services/ai/` (32) e `services/api/`
      (162) `ruff`, `black --check` e `pytest -m "not network"` passano.
- [x] «zucca», «pumpkin», «albero di Natale», «christmas tree» portano
      alla forma giusta; «albero» e «tree» a nessuna (`shapeWords.test.ts`).
- [x] L'API accetta le due forme e rifiuta `tree`; a Milano a 15 km i
      percorsi sono uguali punto per punto ai campioni di TASK-078
      (zucca 16,0 km · 1,00; albero 15,7 km · 1,00; 3–4 s a zona caricata).
- [x] L'AI le riconosce: le 13 voci nuove delle due liste sono giuste,
      «albero» e «tree» restano nessuna forma (numeri in `AI.md`).
- [x] `packages/shared-types` nel commit: ok dell'utente (2026-09-30) prima
      del merge di TASK-084, che tocca `index.ts` dalla riga 239 in poi e
      non `contract.json`; le due righe qui sono in `SHAPES`, riga 26.
- [x] Prova dell'utente sull'iPhone, a Milano (2026-10-01): «va tutto».
- [x] I job della CI sono verdi sulla PR #112.

## File toccati

```
services/route-engine/route_engine/shapes/__init__.py
services/route-engine/tests/test_shapes.py
services/route-engine/tests/test_seasonal_outlines.py   (solo il commento in testa)
packages/shared-types/src/index.ts                      (due righe in SHAPES)
packages/shared-types/fixtures/contract.json
apps/mobile/__tests__/App.test.tsx
apps/mobile/src/route/shapeWords.ts
apps/mobile/src/route/shapeWords.test.ts
apps/mobile/src/route/ShapeTiles.tsx
apps/mobile/src/route/ShapeTiles.test.tsx                (nuovo)
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
docs/tasks/TASK-088.md
```

## Fuori scope

- `tree` nel catalogo, e «albero»/«tree» verso una forma: scelta di
  prodotto, dell'utente.
- Ridisegnare i due contorni o rigiudicarli a Trento e Levico.
- Annotato, non fatto: su questo Mac «Scooby-Doo» dà all'AI una risposta
  troncata a 64 token (`MAX_ANSWER_TOKENS`), già su `main`; l'API risponde
  `ai_unavailable` e `tests/measure_phrases.py` si ferma con un errore.
  Le misure di questo task vengono da uno script usa-e-getta che salta la
  voce rotta.

## Dove siamo

Fatto e provato; PR #112.

## Prova sull'iPhone: i passi

API ed Expo dal worktree di questo task al posto di quelli del checkout
principale, poi si rimettono com'erano. Partenza «Another place», Milano.

- **Tessere**: una riga che scorre di lato col dito; in fondo 🎃 e 🎄.
  Scrivendo «zucca» la riga si sposta da sola sulla zucca.
  🎃 scrive «pumpkin», 🎄 «christmas tree».
- **Parole**: «zucca» mostra «→ pumpkin», «albero di Natale»
  «→ christmas tree»; «albero» da solo non dà l'albero di Natale.
- **Percorso**: «zucca» 15 km e «albero di Natale» 15 km, «Draw route».
- Facoltativo, l'AI: «Halloween» → pumpkin, «Natale» → christmas tree.

## Esito

Zucca e albero di Natale si scelgono nell'app dalle tessere e con le
parole, l'API le disegna e l'AI le riconosce; provate dall'utente
sull'iPhone a Milano: si vedono e si disegnano. Le tessere sono diventate
una riga che scorre di lato, chiesto durante la prova. Emerso e lasciato
all'utente: più forme nella riga, a partire dai contorni già disegnati
(uccello, cane intero, albero, freccia, corona). Annotato: «Scooby-Doo»
rompe la risposta dell'AI su questo Mac (sopra, «Fuori scope»).
