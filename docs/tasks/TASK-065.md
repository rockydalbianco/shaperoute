# TASK-065 — Gli animali approvati nel catalogo (parole, AI, app)

**Stato**: In corso
**Fase**: 4 · **Branch**: `feat/TASK-065-animal-catalog` (parte da `main`,
che contiene TASK-073; unito poi `main` con TASK-077 e TASK-078)

Assegnato dal coordinatore (2026-09-26). ADR-0061.

## Obiettivo

Farfalla, lumaca, testa di cane e testa di coniglio si scelgono nell'app,
dalle tessere o con una parola, e si chiedono all'API come le forme del
catalogo di oggi.

## Contesto da leggere

- `docs/DECISIONS.md` ADR-0036 (catalogo), ADR-0060 (animali candidati),
  ADR-0065 (testa di cane), ADR-0073 (testa di coniglio)
- `docs/tasks/TASK-039.md` (come sono entrate luna, gatto e pesce)
- `samples/LOG.md`, righe di TASK-064, TASK-068 e TASK-078
- `docs/UI.md` «Forma e distanza», `docs/AI.md`

## Cosa c'è già

- I contorni `butterfly.json`, `snail.json`, `dog_head.json`,
  `rabbit_head.json` in `route_engine/shapes/outlines/`, provabili solo
  dalla CLI (`--outline`).
- Giudizio dell'utente (`samples/LOG.md`), 15 km:

  | Forma | Trento | Levico | Milano |
  |---|---|---|---|
  | farfalla (`butterfly`) | quasi | quasi | sì |
  | lumaca (`snail`) | sì | no | sì |
  | testa di cane (`dog_head`) | sì | sì | sì |
  | testa di coniglio (`rabbit_head`) | sì | quasi | sì |

## Decisioni

- **A. Entrano farfalla, lumaca e testa di cane**: scelto dall'utente
  (messaggio del coordinatore, 2026-09-26). **Poi anche la testa di
  coniglio**, dopo il merge di #91 (sì dell'utente, riferito dal
  coordinatore lo stesso giorno). Il cane intero (`dog`), l'uccello
  (`bird`), la zucca (`pumpkin`) e l'albero di Natale (`christmas_tree`)
  restano contorni da CLI.
- **B. Nel contratto `dog_head` e `rabbit_head`**, come i file. Sullo
  schermo si legge «dog head» e «rabbit head» (`shapeName`): tessere, chip,
  conferma sotto il campo, attesa, nome del percorso. «cane», «dog»,
  «coniglio», «bunny» portano alle teste: chi chiede un cane vuole il cane
  che c'è (ADR-0061, deciso dall'agente su delega dell'utente; file in più
  approvati dal coordinatore).
- **C. Tessere**: emoji come gatto, pesce e cavallo (🦋 🐌 🐶 🐰), colore
  del testo da `tokens.ts`; quattro per riga, come oggi.

## Cosa fare

1. Motore: le quattro forme in `SHAPES`; i test delle forme del catalogo
   tengono conto dei contorni con più di 64 vertici (lumaca 72, testa di
   cane 69, testa di coniglio 81: con i tratti ogni vertice resta).
2. Contratto: `SHAPES` di `shared-types` e `contract.json`.
3. App: parole in `shapeWords.ts`, `shapeName`, tessere, chip, test.
4. AI: una riga per forma in `OUTLINES` (`prompt.py`); le liste di prova
   perdono «cane» e «farfalla» (ora parole della tabella) e prendono parole
   nuove per le quattro forme; i test.
5. Verifica: le quattro forme chieste come `RouteRequest` danno gli stessi
   punti dei campioni giudicati.
6. Documentazione: `UI.md`, `AI.md`, `ROUTE_ENGINE.md` §2, `DECISIONS.md`
   (ADR-0061), `STATUS.md`.
7. Prova sull'iPhone con l'utente: le forme nuove dalle tessere, con una
   parola, un percorso a Trento o Milano.

## Criteri di accettazione

- [x] Dalla radice `npm run lint`, `npm run format:check`,
      `npm run typecheck` e `npm test` passano (353 test nell'app, 14 in
      `shared-types`); in `services/route-engine/` (738), `services/ai/`
      (32) e `services/api/` (117) `ruff`, `black --check` e
      `pytest -m "not network"` passano.
- [x] Ogni forma del catalogo ha parole italiane e inglesi, e le nuove
      portano alla forma giusta (`shapeWords.test.ts`); «uccello» e «bird»
      no.
- [x] `plan_route` con le quattro forme dà gli stessi punti dei campioni
      giudicati di TASK-064, TASK-068 e TASK-078 (tabella sotto).
- [ ] Sull'iPhone le forme nuove si scelgono dalle tessere e con una
      parola, e disegnano un percorso (prova dell'utente).
- [ ] I job della CI sono verdi sulla PR.
- [x] `UI.md`, `AI.md`, `ROUTE_ENGINE.md`, `DECISIONS.md` aggiornati;
      `STATUS.md` a fine task.

## File toccati

```
services/route-engine/route_engine/shapes/__init__.py
services/route-engine/tests/test_shapes.py
packages/shared-types/src/index.ts
packages/shared-types/fixtures/contract.json
apps/mobile/App.tsx                          (una riga e l'import)
apps/mobile/__tests__/App.test.tsx
apps/mobile/src/route/shapeWords.ts
apps/mobile/src/route/shapeWords.test.ts
apps/mobile/src/route/ShapeTiles.tsx
apps/mobile/src/route/RoutePanel.tsx
apps/mobile/src/route/wordInput.ts
apps/mobile/src/route/wordInput.test.ts
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

`App.tsx`, `RoutePanel.tsx`, `wordInput.ts`, `wordInput.test.ts`,
`App.test.tsx` e `ROUTE_ENGINE.md` aggiunti con l'ok del coordinatore
(2026-09-26): non erano di nessun task in corso.

## Fuori scope

- Cane intero, uccello, zucca, albero di Natale: restano contorni da CLI.
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
| `rabbit_head` | uguale · 0,97 · 15,3 · 16 s | uguale · 0,88 · 15,1 · 19 s | uguale · 0,97 · 15,2 · 20 s |

Tutti e dodici punto per punto uguali ai campioni di TASK-064, TASK-068 e
TASK-078 (`samples/`). Lo script è fuori dal repository (scratchpad della
sessione).

## Dove siamo

Codice, test e documenti fatti, PR #95 aperta (legata alla sessione).
Worktree `D:\shaperoute-TASK-065` con il suo `node_modules`: **resta** fino
al merge, poi va rimosso. Nessun `.venv` nel worktree: si usa quello del
checkout principale con `PYTHONPATH` sui pacchetti del worktree.

Da fare: prova sull'iPhone con l'utente (passi sotto), misura dell'AI con
qwen3:4b (dopo la prova, a RAM libera: ~650 MB liberi oggi, il modello ne
chiede 3,2 GB), `STATUS.md`, «TASK-065 fatto» al coordinatore.

## Prova sull'iPhone: i passi

Windows PowerShell:

1. Fermare API ed Expo che girano (Ctrl+C nelle loro finestre).
2. Prima finestra, l'API:

   ```
   cd D:\shaperoute-TASK-065
   $env:PYTHONPATH = "D:\shaperoute-TASK-065\services\api;D:\shaperoute-TASK-065\services\route-engine;D:\shaperoute-TASK-065\services\ai"
   C:\Users\ricky\PycharmProjects\shaperoute\services\api\.venv\Scripts\python.exe -m shaperoute_api --lan --cache-dir D:\shaperoute-data\cache
   ```

3. Seconda finestra, Expo: `cd D:\shaperoute-TASK-065`, poi
   `npm.cmd run mobile`; QR con la fotocamera dell'iPhone, Expo Go.
4. Casi:
   - **Tessere**: undici, l'ultima riga con tre. 🦋 scrive «butterfly»,
     🐌 «snail», 🐶 «dog head», 🐰 «rabbit head», senza «→» sotto il campo.
   - **Parole**: «lumaca» mostra «→ snail», «cane» «→ dog head»,
     «coniglio» «→ rabbit head», «farfalla» «→ butterfly».
   - **Percorso**: start «Another place», Trento o Milano (zone in cache),
     «cane» 15 km, «Draw route»: l'attesa dice «Drawing a 15 km dog
     head…», poi il percorso sulla mappa. Se c'è tempo, anche un'altra forma
     nuova.
   - Facoltativo, l'AI: «Snoopy» e «Fine». Con poca RAM il modello si carica
     alla prima parola (fino a un minuto); deve dare «→ dog head».

Da raccogliere per ogni caso: va / non va, con quello che si vede.

## Esito

*(a fine task)*
