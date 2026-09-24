# TASK-038 — Trova dove la forma ci sta

**Stato**: In corso
**Fase**: 3 · **Branch**: `feat/TASK-038-find-the-place` (parte da `main`,
che contiene TASK-039)

## Obiettivo

Quando la forma non ci sta attorno alla partenza chiesta, il motore cerca
un posto vicino, fino a qualche km, dove ci sta, e l'app dice all'utente
dove andare. Serve a Levico, dove gatto e pesce oggi non sono disponibili
e la casa non si riconosce.

## Contesto da leggere

- `docs/DECISIONS.md` ADR-0023 (ricerca), ADR-0025 (partenza spostabile
  fino a 500 m), ADR-0039
- `docs/ROUTE_ENGINE.md` §5 (parametri e strategia di ricerca)
- `docs/UI.md` «Il risultato»; `docs/API.md` «Tempi»
- `services/route-engine/route_engine/optimizer.py` (`candidate_starts`,
  `zone_area`, `search`, `plan_shape`)
- `apps/mobile/src/` la mappa e il pannello del risultato

## Cosa c'è già

- La partenza si sposta fino a 500 m (anelli a 250 e 500 m, 8 direzioni);
  spostarla costa quanto 5 punti di copertura ogni 500 m. Il percorso parte
  dalla partenza spostata, e un avviso lo dice («start moved 250 m north of
  the requested point, …»).
- Il grafo di zona copre la forma a ogni rotazione, fase e scala, più
  500 m di spostamento e 500 m di margine.
- Levico 15 km (TASK-037): gatto e pesce non disponibili, casa `no` (0,81);
  l'albero `no` a occhio ma 0,96 per il motore.
- Nell'app il segnaposto resta sulla partenza chiesta.

## Decisioni

Proposte dall'agente e approvate dall'utente il 2026-09-24, compreso il
download della zona di Levico (punto D). Registrate in ADR-0040.

- **A. Due tempi.** Prima la ricerca di oggi (partenza entro 500 m). Solo
  se non trova un percorso buono (distanza entro il 10% e somiglianza
  almeno 0,90), o la forma non è disponibile, cerca più lontano. Dove la
  forma ci sta già, niente cambia: stessi percorsi, stessi tempi.
- **B. Fino a 2 km**: nel secondo tempo, partenze su anelli a 1, 1,5 e
  2 km, in 12 direzioni. Stessa ricerca (conteggio delle strade, poi
  tracciamenti), con altri 20 tracciamenti al massimo.
- **C. Quale vince.** Un percorso lontano sostituisce quello vicino solo se
  è buono, o se quello vicino non c'era. Fra quelli lontani conta il costo
  di oggi: spostarsi continua a costare, quindi a parità di forma vince il
  posto più vicino.
- **D. Zona più grande solo nel secondo tempo**: il grafo copre anche le
  partenze a 2 km. Dove la cache non basta si scarica una zona nuova: a
  Levico 15 km per luna, pesce, stella e cavallo; casa, albero, gatto e
  Trento sono già coperti.
- **E. Contratto invariato.** Il percorso comincia dove comincia la forma
  (`points[0]`), e l'avviso del motore dice già quanto e dove si è spostato.
- **F. L'app mostra dove andare**: quando la partenza del percorso dista
  più di 500 m da quella chiesta, un secondo segnaposto «Start here» sul
  primo punto del percorso, e l'inquadratura li comprende tutti e due. Lo
  stesso segnaposto con qualunque spostamento, se è più semplice: da
  decidere guardando il codice della mappa.
- **G. Campioni**: Levico 15 km per casa, gatto e pesce (l'albero non
  cambia, perché per il motore è già buono), più un caso di Trento che non
  deve cambiare. Giudizio dell'utente in `samples/LOG.md`.

## Cosa fare

1. Motore: il secondo tempo in `search`/`plan_shape`, le partenze lontane,
   la zona del secondo tempo.
2. Test: una forma che ci sta vicino non cerca lontano; una che non ci sta
   trova il posto sulla griglia di prova; nessuna partenza oltre 2 km; il
   percorso lontano vince solo se è buono.
3. App: il segnaposto della partenza del percorso, con test.
4. Campioni e giudizio (punto G); tempi misurati.
5. Documentazione: `ROUTE_ENGINE.md` §5, `UI.md`, `API.md` «Tempi», nuova
   ADR, `ROADMAP.md`, `STATUS.md`.
6. Prova sull'iPhone (utente): una forma a Levico che si sposta.

## Criteri di accettazione

- [x] Dalla radice `npm run lint`, `npm run format:check`,
      `npm run typecheck` e `npm test` passano (173 test nell'app, 7 in
      `shared-types`); in `services/route-engine/` (276 test) e in
      `services/api/` (54) `ruff`, `black --check` e
      `pytest -m "not network"` passano.
- [x] Ogni caso del punto 2 ha il suo test (`test_optimizer.py`), e il
      segnaposto i suoi (`messages.test.ts`, `MapView.test.tsx`,
      `mapPage.test.ts`, `coordinates.test.ts`).
- [x] Le forme del catalogo che oggi sono buone danno gli stessi percorsi:
      stesso hash di `main` per cerchio 10 km a Trento e cavallo 15 km a
      Levico. Cuore di Trento 15 km e stella di Levico 10 km non erano
      buoni per il motore: si spostano, e l'utente li giudica `sì`.
- [x] I campioni del punto G hanno il giudizio dell'utente in `LOG.md`:
      gatto e pesce di Levico, cuore di Trento e stella di Levico tutti
      `sì`. Casa e albero di Levico e gatto di Trento non cambiano (nessun
      campione nuovo).
- [ ] Sull'iPhone il segnaposto mostra dove andare.
- [ ] I job della CI sono verdi sulla PR.
- [x] ADR-0040; `ROUTE_ENGINE.md`, `UI.md`, `API.md`, `ROADMAP.md`,
      `STATUS.md` aggiornati.

## File toccati

```
services/route-engine/route_engine/optimizer.py
services/route-engine/tests/test_optimizer.py
services/api/shaperoute_api/jobs.py
apps/mobile/src/**
apps/mobile/__tests__/**
samples/TASK-038_*.gpx
samples/LOG.md
docs/ROUTE_ENGINE.md
docs/UI.md
docs/API.md
docs/DECISIONS.md
docs/ROADMAP.md
docs/STATUS.md
docs/tasks/TASK-038.md
```

## Fuori scope

- Il percorso a piedi dalla partenza chiesta al posto trovato: l'app
  mostra dove andare, non come arrivarci.
- Cercare oltre 2 km, o scegliere fra più posti.
- Correggere la somiglianza dove l'occhio non è d'accordo (l'albero di
  Levico): il posto si cerca solo quando il motore sa che la forma non va.
- Tag nuovi e download di altre zone oltre quelle del punto D.

## Esito

*(da compilare a fine task)*
