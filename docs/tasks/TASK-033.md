# TASK-033 — Catalogo di forme e riquadro della forma

**Stato**: In corso
**Fase**: 3 · **Branch**: `feat/TASK-033-shape-catalog`

## Obiettivo

L'utente scrive la forma in un riquadro, in italiano o in inglese
(«stella», «cavallo», «heart»), e il percorso la disegna. Le forme possibili
sono quelle del catalogo: cerchio, cuore, e le forme nuove che TASK-032 ha
mostrato riconoscibili sulle strade, stella e cavallo.

## Contesto da leggere

- `docs/ROADMAP.md` fase 3; `docs/DECISIONS.md` ADR-0016 (forme ammesse),
  ADR-0028 (contratto), ADR-0034 (campo km), ADR-0035 (forme da file)
- `docs/UI.md` «Forma e distanza»; `samples/LOG.md`, righe di TASK-032
- `services/route-engine/route_engine/shapes/`,
  `packages/shared-types/src/index.ts`, `apps/mobile/src/route/RoutePanel.tsx`

## Cosa c'è già

- Il contratto ammette `circle` e `heart` (ADR-0016), nel motore, nell'API e
  in `shared-types`, allineati da `contract.json`.
- Il motore segue un contorno da file, ma solo dalla CLI (ADR-0035). Giudizi
  dell'utente (`LOG.md`): stella `sì` ovunque; cavallo `sì` a Levico e
  Milano, `quasi` a Trento; casa `no` (v1), `quasi` solo a Milano (v2).
- Nell'app la forma si sceglie con due pulsanti.

## Decisioni

Prese dall'agente il 2026-09-24, su delega dell'utente («prendi tu le
decisioni migliori»); le motiva ADR-0036, e l'utente può rivederle.

- **A. Nel catalogo entra una forma solo se l'utente l'ha giudicata a occhio
  sulle strade**, con `sì` o `quasi` a Trento, Levico o Milano. Oggi:
  `circle`, `heart`, `star`, `horse`. La casa resta fuori.
- **B. Le forme del catalogo sono contratto**: `star` e `horse` entrano in
  `SUPPORTED_SHAPES`, nello schema dell'API, in `SHAPES` di `shared-types`
  e in `contract.json`. Supera la parte «forme» di ADR-0016.
- **C. I contorni stanno nel pacchetto del motore**,
  `route_engine/shapes/outlines/`, dichiarati come dati del pacchetto:
  l'API li trova anche senza i sorgenti accanto. Ci vanno anche i contorni
  di prova (la casa), che però non sono registrati come forme.
- **D. Il riquadro della forma** è un campo di testo al posto dei pulsanti,
  di partenza «heart». Una tabella di parole nell'app porta la parola alla
  forma: nomi in inglese e in italiano, singolare e plurale, con o senza
  articolo e accenti, maiuscole indifferenti. Niente AI: arriva con
  TASK-030.
- **E. Una parola sconosciuta** spegne «Draw route» e dice «Unknown shape.
  Try: circle, heart, star or horse.»; una parola riconosciuta diversa dal
  nome della forma lo conferma sotto il campo («→ horse»).
- **F. Forme e distanza nella stessa riga**: forma a sinistra, km a destra;
  i messaggi sotto.

## Cosa fare

1. **Motore**: contorni nel pacchetto, `star` e `horse` registrate, test
   delle forme adattati ai contorni con angoli.
2. **Contratto**: `SHAPES`, `contract.json`, test dei tre lati.
3. **App**: il riquadro della forma, la tabella delle parole in una funzione
   pura, i messaggi.
4. **Test**:
   - motore: ogni forma del catalogo è chiusa, in `[-1, 1]²`, a punti
     equispaziati lungo il contorno; `star` e `horse` passano per
     `RouteRequest` e `plan_route`; i contorni sono dati del pacchetto;
   - app (Jest): parole italiane, inglesi, plurali, articoli, accenti e
     maiuscole portano alla forma giusta; parola vuota o sconosciuta no;
     ogni forma del contratto ha almeno una parola italiana e una inglese;
     schermata: scrivere «cavallo» manda `horse` all'API, una parola
     sconosciuta spegne «Draw route» con il messaggio.
5. **Documentazione**: nuova ADR, `UI.md`, `ROUTE_ENGINE.md`, `API.md` se
   nomina le forme, `ROADMAP.md`, `STATUS.md`.
6. **Prova sull'iPhone** (utente): «stella» e «cavallo» a Trento e a
   Levico, una parola sconosciuta.

## Criteri di accettazione

- [ ] Dalla radice `npm run lint`, `npm run format:check`,
      `npm run typecheck` e `npm test` passano; in `services/route-engine/`
      e in `services/api/` `ruff`, `black --check` e
      `pytest -m "not network"` passano.
- [ ] Ogni caso del punto 4 ha il suo test.
- [ ] Sull'iPhone «stella» e «cavallo» disegnano il percorso; una parola
      sconosciuta mostra il messaggio e non parte nessuna richiesta.
- [ ] I job `mobile`, `api` e `route-engine` della CI sono verdi sulla PR.
- [ ] Nuova ADR; `UI.md`, `ROUTE_ENGINE.md`, `ROADMAP.md`, `STATUS.md`
      aggiornati.

## File toccati

```
services/route-engine/pyproject.toml
services/route-engine/route_engine/shapes/**
services/route-engine/route_engine/__main__.py
services/route-engine/tests/**
services/api/tests/**
packages/shared-types/src/index.ts
packages/shared-types/fixtures/contract.json
apps/mobile/App.tsx
apps/mobile/src/route/**
apps/mobile/__tests__/App.test.tsx
docs/UI.md
docs/ROUTE_ENGINE.md
docs/API.md
docs/DECISIONS.md
docs/ROADMAP.md
docs/STATUS.md
docs/tasks/TASK-033.md
```

## Fuori scope

- L'AI che riconosce frasi e parole fuori tabella: TASK-030 (ADR-0012).
- Forme nuove non ancora giudicate a occhio: si preparano come candidate,
  con i campioni, in un task a parte.
- Rivedere la somiglianza calcolata (ADR-0035): task a parte.
- Le finestre della casa (più pezzi): dopo il catalogo (`ROADMAP.md`).

## Esito

*(si compila a fine task)*
