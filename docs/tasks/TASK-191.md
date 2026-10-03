# TASK-191 — Percorsi in canoa e paddle

**Stato**: In corso (A1 e A2 fatte, PR #216 e #235; B fatta, in
revisione; il punto 5 di A2 e C da fare)
**Fase**: 4 · **Branch**: `feat/TASK-191-paddle-routes` (A1),
`feat/TASK-191-paddle-a2` (A2), `feat/TASK-191-paddle-api` (B)
**Dipende da**: TASK-189 («Sport» in «Settings»: la riga «Paddle» da
accendere), TASK-177 (la pagina «Settings»). Meglio dopo la parte A e B
di TASK-190, che aprono `activity` a un secondo valore.

## Obiettivo

Chi sceglie «Paddle» riceve un percorso che disegna la forma **sull'acqua**
di un lago o lungo la costa, con partenza e arrivo dalla riva. Chiesto
dall'utente il 2026-10-02: «anche per la canoa […] da fare esempi anche
in base alle varie località marittime e dove ci sono laghi; terrai come
esempio Lago di Garda, Lago di Como, Jesolo, Riccione».

## Scelte dell'utente (2026-10-02)

- **Il disegno resta entro circa 1 km dalla riva**, con un avviso di
  sicurezza prima di partire.
- Luoghi d'esempio: **Lago di Garda, Lago di Como, Jesolo, Riccione**.
- In «Settings» la riga «Paddle» resta «Soon» finché questo task non è
  finito (ADR-0152).

## Scelte dell'utente (2026-10-03, dopo i campioni di A1)

- I nove campioni: «buoni, ma troppo vicini alla riva».
- **Le distanze: 1–5 km ovunque**; al mare, oltre circa 3 km, l'errore
  dice a quanti km la forma ci sta (proposte anche 1–3 km al mare e 5 sui
  laghi, o 1–3 km ovunque).
- **Al mare la forma sta oltre 200 m dalla riva, sui laghi a 50 m**
  (proposte anche 200 m ovunque, 100 m ovunque, o 50 m come in A1).

## Contesto da leggere

- `docs/ROUTE_ENGINE.md` §1, §2 (la forma), §3 (la proiezione), §5
  (rotazione, scala, «Trova dove la forma ci sta»), §6
- `docs/MAPS.md` «Sorgente», «Overpass: come si scarica», «Cache»
- `docs/DECISIONS.md` ADR-0008, ADR-0023, ADR-0119, ADR-0136 (gli esempi
  tenuti), ADR-0152
- `docs/API.md`: la richiesta di percorso e il campo `activity`
- `services/route-engine/route_engine/models.py`, `optimizer.py`,
  `projection.py`, `export_gpx.py`
- `services/api/shaperoute_api/draw_examples.py`, `prefetch_zones.py`

## Il punto

Sull'acqua non c'è una rete di strade: la forma proiettata **è** il
percorso, se sta tutta nell'acqua. Il lavoro non è agganciare la forma a
un grafo, è **trovare dove la forma ci sta**: rotazione, scala e
posizione in cui la linea resta nell'acqua, entro 1 km dalla riva, senza
attraversare terra, isole e porti. Resta il principio di `CLAUDE.md`: la
forma la decide il motore, mai l'AI.

Serve una **fonte nuova** nel motore: l'acqua da OpenStreetMap.

- **Laghi**: poligoni `natural=water` (Garda e Como sono relazioni
  grandi: il lago intero pesa, serve il ritaglio attorno alla partenza).
- **Mare**: OSM non ha un poligono del mare, ha la linea
  `natural=coastline`. L'acqua è «il riquadro meno la terra»: la terra va
  costruita dalla linea di costa dentro il riquadro. È la parte meno
  ovvia del task: va provata per prima su Jesolo (laguna, foci, canali) e
  Riccione (costa dritta, scogliere frangiflutti e moli).
- **Dipendenze**: `shapely` è già del motore; OSMnx scarica anche gli
  elementi (`features_from_bbox`), con `geopandas`, che OSMnx installa
  già. **Controllare che basti**: se serve una dipendenza nuova, fermarsi
  e chiedere all'utente.

## Cosa fare

`activity` ha già il posto nel contratto: si aggiunge il valore
`"paddling"`, e l'app traduce «Paddle» in `"paddling"`. Nessun campo
`sport` nuovo.

In tre PR, in quest'ordine (se il coordinatore preferisce, tre task).

**A. Route Engine**

1. Un modulo nuovo per l'acqua: scarica e tiene in cache (separata dalle
   strade) l'acqua attorno a un punto, lago o mare, come geometria in
   metri sul piano proiettato.
2. La fascia navigabile: l'acqua entro 1 km dalla riva, meno un margine
   dalla riva stessa e da moli e scogliere (il margine va deciso sui dati
   e scritto nell'ADR-0154).
3. La ricerca: per una forma e una distanza, la rotazione, la scala e la
   posizione in cui la linea sta tutta nella fascia; la somiglianza è
   quella della forma con sé stessa, quindi il punteggio misura quanto si
   è dovuto rimpicciolire o spostare. Se la forma non ci sta, è un errore
   che lo dice, non un percorso che attraversa la terra.
4. Partenza e arrivo: il punto della riva più vicino alla forma dove si
   arriva a piedi (spiaggia, molo, strada sul lungolago), con il tratto
   dalla riva alla forma e ritorno. Come si sceglie va nell'ADR.
5. La validazione di §6 per l'acqua: la linea non tocca terra; la
   distanza massima dalla riva; la distanza totale. Niente scale, strade
   principali e ripercorrenza: non hanno senso sull'acqua.
6. Limiti di distanza per l'attività (proposta: 1–10 km, da confermare
   con la fascia di 1 km sui quattro luoghi d'esempio).
7. CLI `--activity paddling`, fixture senza rete per i test (un pezzo di
   lago e un pezzo di costa), campioni in `samples/` per Garda, Como,
   Jesolo e Riccione, da far giudicare all'utente.

**B. API**

8. `activity: "paddling"` nelle richieste e in `shared-types`; gli errori
   nuovi («qui non c'è acqua», «la forma non ci sta»).
9. Gli esempi dei quattro luoghi disegnati prima (`draw_examples.py`),
   con il punto di partenza di ognuno scelto a mano e scritto nel task
   (per i laghi: quale paese della riva).

**C. App**

10. `ready: true` per «Paddle» in `sport.ts`; «Draw» manda `activity`
    secondo lo sport e propone le distanze della canoa; l'avviso di
    sicurezza prima di partire (testo da far approvare all'utente).
11. La mappa: il percorso è sull'acqua, dove la mappa scura ha poco
    contrasto (`color.map.water`): controllare che la linea si legga.
12. Dove si trovano gli esempi dei laghi e del mare in «Explore» **è una
    scelta di prodotto**: proporla all'utente prima di toccare «Explore».

## Criteri di accettazione

- [ ] Dalla CLI, senza rete e senza chiavi, sulle fixture: un percorso
      `paddling` chiuso, che parte e arriva sulla riva e non tocca terra
      in nessun punto.
- [ ] Nessun punto del percorso è oltre 1 km dalla riva.
- [ ] Una richiesta `paddling` lontano dall'acqua è un errore che lo
      dice; una forma che non sta nella fascia è un errore che lo dice.
- [ ] Una richiesta `running` si comporta come prima.
- [ ] Campioni di Garda, Como, Jesolo e Riccione in `samples/`, giudicati
      dall'utente.
- [ ] Nell'app, con «Paddle» scelto, «Draw» chiede un percorso
      `paddling` e mostra l'avviso di sicurezza; con «Run» tutto è come
      prima.
- [ ] Test deterministici per motore, API e app; nessuna dipendenza nuova
      senza l'ok dell'utente.

## File toccati

Elenco previsto; ogni PR dichiara i suoi.

**Parte A1** (2026-10-02, solo file nuovi del motore più i documenti):

```
services/route-engine/route_engine/water.py                    (nuovo)
services/route-engine/route_engine/water_fit.py                (nuovo)
services/route-engine/tests/test_water.py                      (nuovo)
services/route-engine/tests/fixtures/make_water_fixtures.py    (nuovo)
services/route-engine/tests/fixtures/water_coast.json          (nuovo)
services/route-engine/tests/fixtures/water_lake.json           (nuovo)
samples/TASK-191_{heart,circle}_2km_{riccione,jesolo,garda}_v1.gpx (nuovi)
samples/TASK-191_star_3km_{riccione,jesolo,garda}_v1.gpx       (nuovi)
samples/LOG.md
docs/ROUTE_ENGINE.md
docs/MAPS.md
docs/DECISIONS.md
docs/STATUS.md
docs/tasks/TASK-191.md
```

**Parte A2** (2026-10-03, ADR-0161):

```
services/route-engine/route_engine/models.py
services/route-engine/route_engine/__main__.py
services/route-engine/route_engine/validation.py
services/route-engine/route_engine/water.py
services/route-engine/route_engine/water_fit.py
services/route-engine/route_engine/paddling.py                 (nuovo)
services/route-engine/tests/test_paddling.py                   (nuovo)
services/route-engine/tests/test_water.py
services/route-engine/tests/test_bike_network.py
services/route-engine/tests/fixtures/make_water_fixtures.py
services/route-engine/tests/fixtures/water_coast.json
samples/LOG.md
docs/ROUTE_ENGINE.md
docs/DECISIONS.md
docs/STATUS.md
docs/tasks/TASK-191.md
```

Non nell'elenco previsto di A2, e perché: `water.py` per i 200 m al mare
(scelta dell'utente), `water_fit.py` per scegliere i centri da cui si
arriva alla riva (con i 200 m, dietro un frangiflutti la forma non ci
stava più), `paddling.py` per il piano di una richiesta che la parte B
chiamerà uguale, `test_bike_network.py` (di TASK-190, con l'ok del
coordinatore) perché diceva che ogni attività ha una rete in `NETWORKS`.

**Parte B** (2026-10-03, ADR-0164; fuori da `services/api/` e
`shared-types`, col permesso del coordinatore: una riga del motore e i
due test che la fissano, tre righe dell'app):

```
services/api/shaperoute_api/paddling.py                        (nuovo)
services/api/shaperoute_api/activity_graphs.py
services/api/shaperoute_api/app.py
services/api/shaperoute_api/errors.py
services/api/shaperoute_api/images.py
services/api/shaperoute_api/jobs.py
services/api/shaperoute_api/prefetch_zones.py
services/api/shaperoute_api/replay.py
services/api/shaperoute_api/schemas.py
services/api/migrations/0010_favorite_paddling.sql             (nuovo)
services/api/tests/test_paddling.py                            (nuovo)
services/api/tests/test_contract.py
services/api/tests/test_cycling.py
services/api/tests/test_favorites.py
services/route-engine/route_engine/models.py
services/route-engine/tests/test_paddling.py
services/route-engine/tests/test_bike_network.py
packages/shared-types/src/index.ts
packages/shared-types/fixtures/contract.json
packages/shared-types/fixtures/route-request-paddling.json     (nuovo)
packages/shared-types/test/contract.test.ts
apps/mobile/src/route/distance.ts
apps/mobile/src/api/favorites.test.ts
apps/mobile/src/favorites/favoriteRoute.test.ts
docs/API.md
docs/DATABASE.md
docs/DECISIONS.md
docs/STATUS.md
docs/tasks/TASK-191.md
```

Perché fuori dall'elenco previsto: `SUPPORTED_ACTIVITIES` sta in
`models.py` del motore, e `test_paddling.py` (A2) e `test_bike_network.py`
(TASK-190) lo fissano; la `0008` vuole una migrazione che allarghi il suo
vincolo; con `paddling` in `ACTIVITIES` l'app non compila senza la sua
riga in `APP_DISTANCE_LIMITS_KM` (`Record<Activity, …>`), e due suoi test
usavano `"paddling"` come attività sconosciuta; `test_cycling.py` e
`test_favorites.py` (TASK-190, TASK-200) idem. Il coordinatore ha dato
l'ok a ognuno il 2026-10-03 (TASK-190 e TASK-200 sono chiuse nel codice,
nessun task in corso ha `distance.ts`). `errors.py` non era
nell'elenco previsto e c'è; `draw_examples.py` era nell'elenco e non c'è
(sotto, «Esito», parte B).

Tutto il task (B e C dichiarano i loro):

```
services/route-engine/route_engine/water.py        (nuovo)
services/route-engine/route_engine/models.py
services/route-engine/route_engine/validation.py
services/route-engine/route_engine/__main__.py
services/route-engine/tests/
services/api/shaperoute_api/schemas.py
services/api/shaperoute_api/errors.py
services/api/shaperoute_api/draw_examples.py
services/api/tests/
packages/shared-types/src/index.ts
apps/mobile/src/settings/sport.ts
apps/mobile/App.tsx
samples/
docs/ROUTE_ENGINE.md
docs/MAPS.md
docs/API.md
docs/UI.md
docs/DECISIONS.md
docs/STATUS.md
docs/tasks/TASK-191.md
```

## Fuori scope

- Fiumi, canali e lagune interne: solo laghi e costa del mare.
- Correnti, vento, onde, maree, meteo.
- **Le regole del posto** (zone riservate ai bagnanti, corridoi di
  lancio, divieti del lago, rotte dei traghetti): il motore non le
  conosce. L'avviso di sicurezza deve dirlo; non si promette che un
  percorso sia permesso o sicuro.
- La voce che guida e il punteggio a fine giro pensati per l'acqua.
- La bici: TASK-190.

## Domande aperte per l'utente

Una per volta, con una proposta:

1. Il testo dell'avviso di sicurezza (proposta da scrivere nella parte
   C: giubbotto, meteo, regole del posto, distanza dalla riva).
2. ~~Le distanze: 1–10 km va bene, dopo aver visto i campioni?~~
   Risposta del 2026-10-03: 1–5 km (sopra, «Scelte dell'utente»).
3. Gli esempi di laghi e mare in «Explore»: una categoria a parte, o i
   luoghi fra le città quando lo sport scelto è «Paddle»?
4. Il nome nell'app: «Paddle» (canoa, kayak, SUP) o «Canoe»?

## Esito

### Parte A1 — 2026-10-02

La parte A del motore è divisa in due perché `models.py`,
`validation.py` e `__main__.py` erano in quel momento di TASK-190 parte A
(la bici), che apre anche lei `activity` a un secondo valore. **A1** è
fatta solo di file nuovi; **A2** collega dopo il merge della bici.

**Fatto** (ADR-0154, `ROUTE_ENGINE.md` §8, `MAPS.md` «Cache»), punti 1–4
della parte A:

- `route_engine/water.py`: l'acqua attorno a un punto in metri sul piano
  tangente (laghi da `natural=water`, il mare come riquadro meno la terra
  della coastline), gli ostacoli, la fascia (entro 1000 m dalla riva, meno
  50 m dalla riva e 30 m dagli ostacoli) e i punti della riva dove si
  arriva a piedi; la cache separata dalle strade
  (`data/cache/water/water_<s>_<w>_<n>_<e>.json`, una richiesta Overpass a
  mancato); `python -m route_engine.water` per i campioni, anche dalle
  risposte dell'API di OSM (`--osm-api`, `--save-water`).
- `route_engine/water_fit.py`: la ricerca di scala, rotazione e posizione
  in cui la forma sta nella fascia, con il costo (quanto si è
  rimpicciolita, i tratti dalla riva, quanto si è spostata), la partenza
  sulla riva e il percorso riva → forma → riva; `measure` per la
  validazione; `plan_on_water` dalla richiesta.
- Gli errori: `NoWaterError` (lontano dall'acqua) e `WaterFitError` (la
  forma non ci sta, con `best_distance_m`; o nessuna riva raggiungibile a
  piedi), tutti e due `ShapeNotDrawableError`.
- Le fixture fatte a mano, senza rete: un pezzo di costa (spiaggia, molo,
  frangiflutti, uno scoglio, una marina, una foce, un'autostrada sulla
  riva) e un pezzo di lago (relazione di due way con un'isola, una strada
  sul lungolago, un molo, una marina, uno stagno). 26 test in
  `tests/test_water.py`; le verifiche dei percorsi leggono la terra dalle
  definizioni delle fixture, non da quello che costruisce `water.py`.
- Nessun file del motore che c'era è toccato: `running` è come prima
  (1052 test del motore verdi, `-m "not network"`).

**Verificato sui dati veri** (API di OSM, 2026-10-02, sei chiamate:
due strisce per trovare la costa, un riquadro a Riccione, uno a Jesolo,
uno a Riva del Garda e la relazione 8569 del Garda intera): mare dalla
coastline a Riccione e Jesolo, lago dalla relazione a Riva, i 17 pennelli
di Jesolo, moli, frangiflutti e marine di Riva; nove campioni in
`samples/` (cuore e cerchio da 2 km, stella da 3 km nei tre posti), tutti
chiusi, dalla riva, sull'acqua, a 63–81 m dalla terra e al più 835 m dalla
riva; quanto le forme ci stanno (tabella in ADR-0154: su una costa
dritta circa 3 km, la stella 4). **Non verificato**: la richiesta
Overpass (un tentativo, «No route to host»: la query non è mai stata
eseguita), quindi l'acqua di un'area intera di una richiesta; il Lago di
Como (nessun dato scaricato); isole in mare e laghi con isole solo sulle
fixture. I campioni stanno nei riquadri scaricati (1,4–2,3 km di lato),
non in tutta l'area che una richiesta vera avrebbe.

**Criteri di accettazione**, a che punto sono dopo A1: il percorso chiuso
dalla riva che non tocca terra, entro 1 km, e gli errori «lontano
dall'acqua» e «non ci sta» ci sono nel motore e nei test, ma da
`python -m route_engine.water`, non ancora da una richiesta `paddling`
(A2). I campioni: Riccione, Jesolo e Garda (Riva) fatti, **Como manca**,
**nessuno giudicato** dall'utente. Restano aperti tutti finché A2 non
collega.

**Cosa deve fare A2** (TASK-190 parte A è in `main` dalla PR #214: si
parte da quello che la bici ha messo in `models.py`, `validation.py`,
`__main__.py`):

1. `models.py`: `"paddling": (min, max)` in `DISTANCE_LIMITS_M`, come la
   bici ha fatto per `"cycling"` (così entra in `ACTIVITIES`, le attività
   del motore); `SUPPORTED_ACTIVITIES`, il contratto dell'API, lo prende
   solo la parte B insieme a `shared-types`, come per la bici (ADR-0153).
   I numeri sono una **domanda all'utente** (domanda 2 qui sotto): su una
   costa dritta la fascia di 1 km tiene forme fino a circa 3 km, non 10.
   Che cosa fare di una parola o di un'immagine sull'acqua (`water_fit`
   prende qualunque contorno chiuso) va deciso lì, o rifiutato con
   `InvalidRequestError`.
2. `__main__.py`: con `--activity paddling` il piano è
   `water_fit.plan_on_water(shape, distance, start,
   water.OverpassWaterSource(args.cache_dir), name=..., free_rotation=nome
   in FREE_ROTATION)` invece di `plan_shape`, deciso prima di
   `_source(...)`: la canoa non ha una rete in `network.NETWORKS` e non
   deve averla; il `RouteResult` ha
   `points` e `distance_m` del `WaterRoute`, `similarity=1.0` e i warning
   della validazione; stampare scala, rotazione, partenza sulla riva e il
   suo tipo, tratto, distanza dalla terra e dalla riva come fa `python -m
   route_engine.water`. `--nearby`, `--word`, `--image`, `--score-track`:
   decidere se valgono sull'acqua (il punteggio di una traccia vale già:
   servono solo i punti).
3. `validation.py`: per l'acqua, da `water_fit.measure(points, area)`:
   chiuso; `on_land_m == 0` (che perdona già mezzo metro, `ON_LAND_M`:
   il tratto parte dal bordo dell'acqua); `farthest_shore_m <=
   water.SHORE_BAND_M`; la distanza come per la corsa (±10%). Niente
   scale, strade principali e ripercorrenza. Toccare terra o uscire dal
   chilometro è un errore, non un warning.
4. Test della CLI `--activity paddling` senza rete: l'area di una
   richiesta (`water_fit.water_bbox`, ±4 km per un cuore da 2 km) è più
   grande dei riquadri delle fixture (6 × 3,5 km la costa): o allargare le
   fixture in `make_water_fixtures.py` (la coastline deve uscire dal
   riquadro della richiesta), o mettere in una cartella temporanea un file
   `water_<bbox>.json` che copre la richiesta.
5. I campioni del Lago di Como, e quelli di Garda, Jesolo e Riccione
   rifatti sull'area intera, quando Overpass risponde (o dal server, con
   l'ok dell'utente); poi il giudizio dell'utente in `samples/LOG.md`.

Per la parte B: `NoWaterError` è «qui non c'è acqua», `WaterFitError`
«la forma non ci sta» (con `best_distance_m`, come TASK-031). Tutti e due
sono `ShapeNotDrawableError`: senza codici nuovi l'API risponde già
`shape_not_drawable`. Il server: `engine_fingerprint` cambia con i
moduli nuovi, quindi gli esempi tenuti si ridisegnano, uguali, dopo il
prossimo aggiornamento.

**Domande per l'utente nate da A1** (si aggiungono a quelle sopra; una
per volta): le distanze della canoa alla luce della tabella di ADR-0154
(proposta: 1–3 km al mare, fino a 5 km sui laghi, oppure 1–5 km con
l'errore «ci sta a X km»); se stare oltre la fascia dei bagnanti
(200 m dalla riva al mare in molte ordinanze), che lascerebbe 800 m di
fascia e forme ancora più piccole.

### Parte A2 — 2026-10-03

In `main` dalla PR #235 (CI 5/5 verde). **Fatto** (ADR-0161, `ROUTE_ENGINE.md` §7 e §8), i punti 1–4 di «Cosa deve
fare A2»; il punto 5 (i campioni rifatti e Como) no, sotto.

- **Le scelte dell'utente** (sopra): `DISTANCE_LIMITS_M["paddling"] =
  (1000, 5000)`; al mare la forma oltre **200 m** dalla riva
  (`water.SEA_SHORE_MARGIN_M`), sui laghi e dagli scogli 50 m come prima.
  Il giudizio dei nove campioni è in `samples/LOG.md`.
- `models.py`: `paddling` in `ACTIVITIES`, `WATER_ACTIVITIES` (le attività
  senza rete), `check_drawn_on_land`: sull'acqua una parola, un'immagine o
  un contorno sono `InvalidRequestError`. Non in `SUPPORTED_ACTIVITIES`:
  l'API la rifiuta come prima finché non arriva la parte B.
- `paddling.py` (nuovo): `plan_paddling(request, source)` → `WaterPlan`
  (il `RouteResult` con somiglianza 1, il `WaterRoute`, l'acqua), con la
  forma a 128 punti e la validazione. La CLI la usa; la parte B la
  chiamerà uguale.
- `validation.check_on_water`: chiuso, niente terra, entro 1000 m dalla
  riva, distanza ±10%; sono errori (`InvalidRouteError`), non warning.
- `__main__.py`: `--activity paddling` disegna sull'acqua, con l'acqua in
  `<cache-dir>/water/`; `--score-track` vale, `--nearby` e
  `--no-optimize` si rifiutano.
- `water_fit.py`: i tre centri buoni per scala e angolo sono quelli da cui
  si arriva alla riva col costo minore, non i più vicini alla partenza
  chiesta (con i 200 m, accanto al frangiflutti della fixture un cuore da
  2 km «ci stava a 2,2 km»); le scale si saltano e la ricerca si ferma
  tenendo conto del tratto più corto possibile (al mare 200 m): senza, un
  piano al mare passava da 0,4 a 5,7 s.
- Test: `tests/test_paddling.py` (26, la CLI sulle fixture messe in una
  cartella di cache, nessun download; i limiti; parole e immagini
  rifiutate; la validazione), `test_water.py` stretto ai 200 m al mare
  (e 50 m dagli scogli). La coastline della fixture della costa prosegue
  dritta fino a ±9 km, così taglia l'area intera di una richiesta.
  Motore: 1178 test verdi (`-m "not network"`, con `main` del 2026-10-03);
  API: invariata.

**Misurato sulle fixture** (tabella in ADR-0161): al mare la forma sta a
208–223 m dalla terra, il tratto è di 209–223 m per lato; a 2 km la forma
è il 79% del giro, a 1 km il 58%; il cuore ci sta fino a 3,0 km, la
stella a 3,4. Sul lago 1–5 km come in A1.

**Non fatto, il punto 5**: i campioni sull'area intera di una richiesta e
Como. Le risposte dell'API di OSM scaricate da A1 non ci sono più (erano
in una cartella temporanea), Overpass dal Mac non è stato provato in A2, e
il server vuole l'ok dell'utente. I campioni v1 del mare non sono più
quello che il motore disegna (i 200 m), quelli di Garda vengono da una
scelta dei centri diversa: da rifare tutti, `v2`, poi il giudizio
dell'utente in `samples/LOG.md`.

**Criteri di accettazione dopo A2**: dalla CLI, senza rete e senza chiavi,
sulle fixture, un percorso `paddling` chiuso, dalla riva, mai sulla terra,
entro 1 km dalla riva: **fatto**. Lontano dall'acqua e forma che non ci
sta: errori che lo dicono, **fatto** (anche dalla CLI). `running` come
prima: **fatto**. Campioni dei quattro luoghi giudicati: tre giudicati
(v1), da rifare con le regole nuove, Como manca. App e API: parti B e C.

**Per la parte B**: `SUPPORTED_ACTIVITIES` e `shared-types` con
`paddling`; l'API che chiama `paddling.plan_paddling` con un
`OverpassWaterSource` sulla cache del server (`data/cache/water/`);
`NoWaterError` e `WaterFitError` sono già `shape_not_drawable`, con
`best_distance_m` per la distanza suggerita; le immagini con `paddling`
rifiutate con `check_drawn_on_land` (`ON_WATER_SHAPES_ONLY`); niente
indicazioni di svolta sull'acqua (non c'è un grafo); le tre alternative
A · B · C non ci sono (un piano solo).

### Parte B — 2026-10-03

Branch `feat/TASK-191-paddle-api`. **Fatto** (ADR-0164; `API.md`,
«Sull'acqua»; `DATABASE.md`, migrazione `0010`):

- **Il contratto**, solo aggiunte: `paddling` in `SUPPORTED_ACTIVITIES`, in
  `ACTIVITIES` e `DISTANCE_LIMITS_M` di `shared-types` (1–5 km),
  `contract.json`, la fixture `route-request-paddling.json` letta dai test
  dei due lati.
- **L'API sull'acqua**: `shaperoute_api/paddling.py` (nuovo), con
  `ServerWater` (l'acqua di `<cache>/water/`, la stessa `--cache-dir`
  delle zone; un download alla volta; uno non riuscito è `503
  map_data_unavailable`) e `plan_water`, che chiama `plan_paddling`.
  `ActivityGraphs` tiene l'acqua accanto alle zone; `ground_for` sceglie
  fra zone e acqua per `/routes`, `/route-jobs` e il replay. Il job mostra
  `downloading_map` mentre scarica l'acqua e, se annullato intanto, non
  piazza la forma.
- **Cosa risponde**: il `RouteResult` del motore, chiuso dalla riva,
  somiglianza 1, `directions`, `alternatives`, `warnings` e `walks`
  vuoti; il GPX come ogni percorso. Lontano dall'acqua `422
  shape_not_drawable` senza distanza. La forma che non ci sta `422
  shape_not_drawable` con `suggested_distance_m` **per difetto al mezzo
  km** in cui ci sta (ADR-0164, punto 5: al km più vicino la distanza
  suggerita poteva non starci), che chiesta dà il percorso (test: cuore da
  5 km → 3000, cerchio da 4 km → 2500). Parole e immagini `422
  invalid_request` («on the water only a shape of the catalogue is drawn,
  not a word / not an image»), fuori da 1–5 km pure.
- **Le indicazioni** (`/route-directions`) con i punti di un percorso
  sull'acqua: `422 invalid_request`, «The route does not follow the roads
  of this map.», dopo aver caricato (o scaricato) la zona a piedi
  attorno alla linea: la richiesta non ha l'attività. L'app non le deve
  chiedere. **Le alternative A · B · C** non ci sono: `alternatives` è
  vuoto.
- **I preferiti** tengono `paddling`: `0010_favorite_paddling.sql`
  allarga il vincolo della `0008`, e un preferito in canoa si tiene e si
  rilegge invece di dare 500 (`test_every_activity_offered_is_kept`).
  `prefetch_zones --activity` resta per corsa e bici.
- **L'app non cambia**: «Paddle» resta «Soon» (ADR-0152) e l'app non manda
  mai `paddling` fino alla parte C. Ha solo la riga dei limiti della canoa
  in `APP_DISTANCE_LIMITS_KM`, che le serve per compilare. **Un
  comportamento nuovo**: un preferito `paddling` (che oggi solo un altro
  client può tenere) si riapre come `paddling`, non più come corsa
  (`favoriteActivity`, perché `paddling` è ora in `ACTIVITIES`).
- **Test**: `services/api/tests/test_paddling.py` (29, sulle fixture
  dell'acqua del motore in una cartella di cache, nessun download che un
  test non risponda), i test del contratto dei due lati, e in
  `test_cycling.py`, `test_favorites.py` e nei due test dell'app
  l'attività sconosciuta d'esempio è `"swimming"`. Motore 1178 verdi;
  API tutti verdi; app 1294 (jest), tsc, lint, prettier; `shared-types`
  29.

**Non fatto**:

- **Il punto 9**, gli esempi dei quattro luoghi in `draw_examples.py`: non
  era nel messaggio di partenza, e dipende dalla domanda 3 (dove stanno
  laghi e mare in «Explore», una scelta di prodotto) e dai dati veri.
- **La prova dal vero**: dal Mac alle 09:05Z e alle 09:09Z (Riccione,
  cuore da 2 km, col planner dell'API su una cache temporanea): «No route
  to host» a livello di rete, anche con `curl`, mentre la sessione dei
  campioni della bici aveva raggiunto Overpass alle 08:59Z (con lo
  User-Agent di OSMnx, che `water.overpass` usa). La query dell'acqua resta **mai
  eseguita** (ADR-0154); niente altri tentativi, per non pesare su
  Overpass.

**Per la parte C** (l'app): «Paddle» `ready` e `activityOf` →
`paddling`; i limiti 1–5 km ci sono già in `APP_DISTANCE_LIMITS_KM`;
`suggested_distance_m` può essere di mezzo km («Try 2.5 km»); i testi
«does not fit the roads here» vanno detti per l'acqua; niente
`/route-directions` né «Start» con le indicazioni a voce (sono vuote); la
partenza è il primo punto, sulla riva, non la posizione chiesta; parole e
foto da spegnere con «Paddle»; l'avviso di sicurezza.

**Seguito proposto**: ogni partenza nuova sull'acqua è una richiesta
Overpass per un'area di 8–10 km di lato. Le aree d'acqua dei quattro
luoghi d'esempio, scaricate prima sul server, con l'ok dell'utente.

## Note per il deploy

- A2 cambia l'impronta del motore (`engine_fingerprint()`): dopo
  l'aggiornamento del server gli esempi tenuti si buttano e va rilanciato
  `draw_examples` (circa 35 minuti, `AGENTI.md` regola 11), anche se i
  percorsi di corsa e bici sono identici. Meglio **un aggiornamento solo**
  con TASK-203, che cambia anche lei l'impronta.
- Niente da migrare, nessuna variabile nuova. La cartella
  `data/cache/water/` serve solo quando l'API chiede la canoa (parte B).
- **Parte B**: la migrazione `0010_favorite_paddling.sql` (dopo la `0009`
  di TASK-117 A), nessuna variabile nuova. `data/cache/water/` la crea
  l'API alla prima richiesta in canoa, dentro `../data/cache` del
  container (lo stesso volume delle zone, `deploy/compose.yaml`): niente
  da preparare. Dopo l'aggiornamento, con l'ok dell'utente, una prova dal
  vero: una richiesta `paddling` a Riccione (cuore da 2 km dalla
  spiaggia, 44.00355, 12.66338), che scarica l'acqua da Overpass la prima
  volta. Cambia `models.py`: l'impronta del motore, come A2; un
  aggiornamento solo. L'app con «Paddle» (parte C) si pubblica dopo che il
  server ha la parte B, o «Paddle» riceve `invalid_request`.
