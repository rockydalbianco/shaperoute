# TASK-191 — Percorsi in canoa e paddle

**Stato**: In corso (parte A1 in revisione; A2, B e C da fare)
**Fase**: 4 · **Branch**: `feat/TASK-191-paddle-routes`
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

Tutto il task (A2, B e C dichiarano i loro):

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
2. Le distanze: 1–10 km va bene, dopo aver visto i campioni?
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
