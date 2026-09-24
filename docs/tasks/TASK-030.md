# TASK-030 — L'AI riconosce la parola scritta

**Stato**: In corso
**Fase**: 3 · **Branch**: `feat/TASK-030-ai-reads-the-word` (parte da
`main`, che contiene TASK-038)

## Obiettivo

Quando nel riquadro della forma l'utente scrive parole che la tabella non
conosce («stemma della Ferrari», «Nemo», «Garfield»), un modello AI le
legge e sceglie una forma del catalogo, oppure dice che non ce n'è una.
Il percorso resta del motore (ADR-0001). Si decide ADR-0012.

## Contesto da leggere

- `docs/DECISIONS.md` ADR-0001, ADR-0012, ADR-0036 (catalogo e tabella
  delle parole)
- `docs/AI.md` (stub: si scrive qui)
- `docs/API.md` «Endpoint», «Errori»; `docs/UI.md` il riquadro della forma
- `apps/mobile/src/route/shapeWords.ts`, `RoutePanel.tsx`, `App.tsx`,
  `src/api/gpx.ts` (come l'app chiama l'API)
- `services/api/shaperoute_api/app.py`, `schemas.py`, `__main__.py`

## Cosa c'è già

- La tabella `shapeWords.ts` porta alla forma i nomi del catalogo, in
  italiano e in inglese (ADR-0036). Una parola sconosciuta spegne
  «Draw route» con «Unknown shape. Try: …».
- `ARCHITECTURE.md` prevede `services/ai/`, con il provider dietro
  un'interfaccia. Non esiste ancora.
- Il PC che fa da server: 7 GB di RAM, Ryzen 5 3500U, nessuna GPU
  dedicata; 3,8 GB liberi su C:, 277 GB su D:.

## Decisioni

Il punto A è stato scelto dall'utente il 2026-09-24; gli altri, proposti
dall'agente, li ha approvati lo stesso giorno. Vanno in ADR-0012.

- **A. Provider: un modello aperto in locale con Ollama.** Gratis e open
  source, senza chiavi; il testo non esce dal PC. Il modello si sceglie
  misurando al massimo tre candidati da 1–3,5 GB (punto F). Ollama e i
  modelli stanno su D:.
- **B. Pacchetto `services/ai/`** (`shaperoute_ai`), solo libreria
  standard: Ollama si chiama via HTTP con `urllib`, quindi niente
  dipendenze nuove. Un'interfaccia `ShapeModel` (testo e forme ammesse in
  ingresso, una forma o nessuna in uscita); `OllamaModel` è l'unico
  provider vero, e nei test ce n'è uno finto. Il catalogo lo passa l'API
  (`SUPPORTED_SHAPES`): `services/ai/` non importa il motore, e il motore
  non cambia.
- **C. Risposta vincolata.** Il modello risponde con un JSON il cui schema
  ammette solo i nomi del catalogo o `none`, a temperatura 0. L'API
  controlla comunque la risposta: qualunque altra cosa vale come nessuna
  forma. Il testo accettato è di 60 caratteri al massimo: una parola o
  poche, non una frase.
- **D. API: `POST /shape-readings`**, `{text}` → `{text, shape}`, con
  `shape` una forma del catalogo o `null`. Un errore nuovo,
  `ai_unavailable` (503), quando Ollama non è acceso o non risponde in
  tempo. Una cache in memoria: la stessa parola non si chiede due volte.
  Modello e indirizzo di Ollama hanno un valore di partenza nel codice e
  si cambiano con `--ai-model` e `--ai-url`.
- **E. App: prima la tabella, poi l'AI.** Una parola della tabella vale
  subito, come oggi. Una parola sconosciuta si manda all'API quando
  l'utente preme Done sulla tastiera, non a ogni lettera. Sotto il
  riquadro compare «Reading…», poi «→ horse», e «Draw route» si accende.
  Se il modello non trova una forma: «No shape in the catalogue for …
  Try: …». Se l'AI è spenta: l'app lo dice, e le parole della tabella
  continuano a funzionare. L'app ricorda le letture della sessione.
- **F. Lista di prova.** Circa 40 parole e frasi, in italiano e in
  inglese, ciascuna con le risposte accettate: più di una per quelle
  ambigue («stella marina»: stella o pesce). Una decina deve dare nessuna
  forma («cane», «Batman», «Torre Eiffel», «casa»). Uno script
  `measure_phrases.py` la misura sul modello vero, come
  `measure_optimizer.py`. Si sceglie il modello con più risposte giuste;
  a parità, il più veloce.
- **G. Soglia.** Il modello scelto dà almeno il 90% di risposte giuste e,
  a modello caricato, risponde entro 10 s su questo PC. Se nessun
  candidato ci arriva, ci si ferma e si decide con l'utente: niente soglie
  abbassate in silenzio.

## Cosa fare

1. `services/ai/`: interfaccia, lettura con controllo e cache,
   `OllamaModel`, prompt; test deterministici con il modello finto e con
   un HTTP finto.
2. API: endpoint, errore `ai_unavailable`, opzioni di avvio; test.
3. Contratto: tipi in `shared-types`, fixture JSON, test dei due lati.
4. App: chiamata all'API, stati sotto il riquadro della forma; test.
5. CI: `services/ai/` con lint e test; l'API lo installa.
6. Ollama sul PC (lo installa l'utente, su D:) e i modelli candidati: si
   chiede prima di ogni download, con il peso. Misura della lista, scelta
   del modello.
7. Documentazione: `AI.md` pieno, ADR-0012, `API.md`, `UI.md`,
   `SETUP.md` (Ollama), `ARCHITECTURE.md`, `INDEX.md`, `ROADMAP.md`,
   `STATUS.md`, `.env.example`.
8. Prova sull'iPhone (utente): «stemma della Ferrari» diventa un cavallo
   sulla mappa.

## Criteri di accettazione

- [ ] Dalla radice `npm run lint`, `npm run format:check`,
      `npm run typecheck` e `npm test` passano; in `services/ai/` e in
      `services/api/` `ruff`, `black --check` e `pytest -m "not network"`
      passano.
- [ ] I test coprono: risposta fuori catalogo scartata, testo vuoto o
      troppo lungo rifiutato, cache, Ollama spento → `ai_unavailable`,
      corpo della richiesta a Ollama (schema, temperatura), fixture del
      contratto, stati dell'app.
- [ ] Nessun test della CI chiama un modello vero.
- [ ] La lista di prova è misurata con ogni candidato; il modello scelto
      rispetta la soglia G; i numeri sono in `AI.md`.
- [ ] Sull'iPhone «stemma della Ferrari» dà «→ horse» e il percorso.
- [ ] I job della CI sono verdi sulla PR.
- [ ] ADR-0012 attiva; documenti del punto 7 aggiornati.

## File toccati

```
services/ai/**
services/api/pyproject.toml
services/api/shaperoute_api/app.py
services/api/shaperoute_api/__main__.py
services/api/shaperoute_api/schemas.py
services/api/tests/**
packages/shared-types/src/index.ts
packages/shared-types/fixtures/**
packages/shared-types/test/**
apps/mobile/App.tsx
apps/mobile/src/api/**
apps/mobile/src/route/**
apps/mobile/__tests__/**
.github/workflows/ci.yml
.env.example
docs/AI.md
docs/API.md
docs/UI.md
docs/SETUP.md
docs/ARCHITECTURE.md
docs/INDEX.md
docs/DECISIONS.md
docs/ROADMAP.md
docs/STATUS.md
docs/tasks/TASK-030.md
```

## Fuori scope

- Cosa proporre quando la parola non ha una forma nel catalogo: qui solo
  il messaggio; il resto è TASK-031.
- Leggere nel riquadro della forma anche distanza o attività («un cuore da
  10 km»): hanno i loro riquadri.
- Far disegnare all'AI una forma che il catalogo non ha (ADR-0001).
- Provider a pagamento, hosting, cache su disco delle letture.
- Aggiungere alla tabella le parole lette dall'AI.

## Esito

*(si compila a fine task)*
