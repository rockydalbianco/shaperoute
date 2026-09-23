# TASK-032 — Il motore segue un contorno qualunque

**Stato**: Todo
**Fase**: 3 · **Branch**: `feat/TASK-032-any-outline`

## Obiettivo

Sapere se le strade reggono forme più complesse di cerchio e cuore, prima
di costruire catalogo e AI. Il motore impara a seguire un contorno letto da
un file: una stella, una casa e la sagoma di un animale. I percorsi si
guardano a occhio, come nella fase 1. Se la sagoma dell'animale non si
riconosce, la fase 3 si ripensa (`ROADMAP.md`).

## Contesto da leggere

- `docs/ROADMAP.md` fase 3, «Deciso con l'utente (2026-09-24)»
- `docs/ROUTE_ENGINE.md` §2 (forme), §5 (ottimizzazione e somiglianza),
  §6 (validazione)
- `samples/README.md`; `docs/TESTING.md` (le partenze delle zone)
- `docs/DECISIONS.md` ADR-0001, ADR-0017, ADR-0023, ADR-0025, ADR-0026
- `docs/MAPS.md` «Overpass: come si scarica», solo se una zona va scaricata
- `services/route-engine/route_engine/shapes/`, `__main__.py`,
  `optimizer.py` (`zone_area`, `reach`, `plan_route`)

## Cosa c'è già

- Una forma è una funzione in `shapes/` registrata in `SHAPES`: produce 64
  punti (`SHAPE_POINTS`) equispaziati in lunghezza d'arco, in `[-1, 1]²`,
  con il primo ripetuto in fondo (ADR-0017). Oggi solo `circle` e `heart`.
- Il nome della forma è **contratto**: `SUPPORTED_SHAPES` valida il
  `RouteRequest` del motore e si ritrova nello schema dell'API e in
  `shared-types`, con un test che le tiene uguali. Una forma nuova
  registrata lì comparirebbe anche fra i pulsanti dell'app.
- L'ottimizzatore ruota, scala e sposta la forma e la partenza fino a
  500 m (ADR-0023, ADR-0025). Un vertice dove il contorno gira più di 60°
  è un angolo, come la punta del cuore (`CORNER_TURN_DEG`). La validazione
  scarta le andate e ritorno oltre il 15% del percorso (ADR-0026): i
  bracci stretti di una stella potrebbero cadere lì.
- La zona scaricata dipende da quanto la forma si allontana dalla partenza
  (`reach`): una forma nuova può chiedere una zona che la cache non ha. In
  cache ci sono Trento (fino a 30 km), Levico e Milano.

## Cosa fare

1. **Confermato dall'utente il 2026-09-24**: A–F come proposte. La nuova
   ADR si scrive nella PR che implementa.
   - **A. Il contorno sta in un file JSON**: un solo contorno chiuso, senza
     buchi e senza incroci, più nome, fonte e licenza. Il motore lo porta
     in `[-1, 1]²` e lo ricampiona a 64 punti, come le forme di oggi.
     Rifiuta con un messaggio chiaro un contorno aperto, che si incrocia o
     con meno di 3 punti. Nessuna dipendenza nuova: `json` è nella libreria
     standard.
   - **B. Solo dalla CLI**: `--outline FILE` al posto di `--shape`.
     `RouteRequest`, contratto, API e app non cambiano: le forme nuove
     entrano nel contratto con il catalogo (TASK-033). Come il contorno
     arriva a `plan_route` si decide nel task e va nella nuova ADR.
   - **C. Tre forme di prova**, in `services/route-engine/outlines/`:
     - **stella** a 5 punte e **casa**, disegnate da noi con pochi vertici:
       nessuna licenza da rispettare;
     - la **sagoma di un cavallo**, per capire quanto ci si avvicina a
       uno stemma: da una raccolta con licenza aperta (CC0 o MIT),
       convertita una volta in punti con uno script usa-e-getta fuori dal
       repository, solo il contorno esterno. Fonte, autore e licenza nel
       file. Il download si chiede prima all'utente. Nessun logo di marchi.
   - **D. Dove e quanto**: Trento e Levico, più Milano come confronto
     (`TESTING.md`); 10 e 15 km; le tre forme. Sono 18 campioni in
     `samples/`, per esempio `TASK-032_star_10km_trento_v1.gpx`, guardati
     con `tools/preview_samples.py`; il giudizio lo dà l'utente, in
     `samples/LOG.md`. La Valsugana resta sospesa (ADR-0027). Se una
     zona manca, si scarica con lo script di TASK-026 (`MAPS.md`).
   - **E. Tarature solo senza peggiorare**: se servono più punti, un'altra
     soglia per gli angoli o regole diverse sulle andate e ritorno, si
     cambiano solo se cuore e cerchio dei casi di riferimento
     (`tests/measure_optimizer.py`) non peggiorano. Numeri prima e dopo
     nella PR.
   - **F. Il cancello**: la stella e il cavallo devono avere almeno un
     `sì` o un `quasi` a Trento a 15 km. Se no, ci si ferma e si ripensa la
     fase 3 con l'utente, per esempio con un catalogo di sole forme
     semplici.
2. **Motore**: lettura e controllo del contorno, `--outline` nella CLI, il
   passaggio del contorno a `plan_route`.
3. **Forme**: i tre file JSON; lo script per il cavallo resta fuori dal
   repository.
4. **Test** (pytest, deterministici, senza rete):
   - lettura: un contorno viene portato in `[-1, 1]²`, chiuso, a 64 punti
     equispaziati; aperto, che si incrocia, con meno di 3 punti o con JSON
     sbagliato viene rifiutato con il suo messaggio;
   - stella e casa: vertici e simmetria attesi;
   - CLI: `--outline` scrive il GPX sul grafo di prova già usato dai test;
     `--shape` e `--outline` insieme, o nessuno dei due, sono un errore.
5. **Campioni**: i 18 GPX del punto D, poi l'utente li guarda e il giudizio
   va in `samples/LOG.md`.
6. **Documentazione**: `ROUTE_ENGINE.md` §2 (forme da file), nuova ADR,
   `ROADMAP.md` (esito del cancello), `STATUS.md`.

## Criteri di accettazione

- [ ] In `services/route-engine/` `ruff`, `black --check` e
      `pytest -m "not network"` passano.
- [ ] Ogni caso del punto 4 ha il suo test.
- [ ] 18 campioni in `samples/`, ognuno con la sua riga in `LOG.md`:
      somiglianza, distanza reale e giudizio dell'utente.
- [ ] Cuore e cerchio dei casi di riferimento non peggiorano (numeri nella
      PR).
- [ ] Esito del cancello (punto F) scritto in `ROADMAP.md`.
- [ ] I job `mobile`, `api` e `route-engine` della CI sono verdi sulla PR.
- [ ] Nuova ADR; `ROUTE_ENGINE.md`, `ROADMAP.md`, `STATUS.md` aggiornati.

## File toccati

```
services/route-engine/route_engine/shapes/**
services/route-engine/route_engine/__main__.py
services/route-engine/route_engine/optimizer.py
services/route-engine/outlines/**
services/route-engine/tests/**
samples/TASK-032_*.gpx
samples/LOG.md
docs/ROUTE_ENGINE.md
docs/DECISIONS.md
docs/ROADMAP.md
docs/STATUS.md
docs/tasks/TASK-032.md
```

## Fuori scope

- App, API e contratto: il riquadro della forma e il catalogo sono
  TASK-033.
- L'AI che riconosce la parola: TASK-030, con ADR-0012.
- Disegni generati da un'AI: vanno contro ADR-0001, e cambiarla lo decide
  l'utente dopo questo task.
- Scritte e lettere: fase 4.
- Forme con buchi o fatte di più pezzi; loghi di marchi.
- La Valsugana (ADR-0027).

## Esito

*(si compila a fine task)*
