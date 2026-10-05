# TASK-245 — Altre spiagge per «Paddle», oltre Jesolo e Riccione

**Stato**: In corso (2026-10-05) — comando, elenco e prove fatti sul Mac
(29 posti su 29); mancano l'acqua sul server e la PR
**Fase**: 4 · **Branch**: `feat/TASK-245-more-beaches`
**Dipende da**: TASK-225 (l'acqua da un estratto), TASK-233 (l'elenco dei
laghi, `waterSpots.ts`), TASK-240 (laghi e spiagge in «Another place»)

## Obiettivo

Richiesta dell'utente (2026-10-05, nella sessione di TASK-240): «aggiungi
altre spiagge oltre Jesolo e Riccione».

Con «Paddle», l'elenco dei luoghi sull'acqua ha anche altri posti di mare
d'Italia: si trovano in «Explore» e in «Draw» → «Another place», e una
forma si disegna sul mare davanti alla spiaggia, partendo dalla riva.

## Scelte dell'utente

Una domanda per volta, ognuna con una proposta:

1. **2026-10-05 — quali spiagge**: «sì va bene» alla proposta: partire da
   29 posti di mare noti, su tutte le coste, e tenere solo quelli dove il
   motore riesce a disegnare. «Tutta la costa d'Italia» sconsigliata come
   primo passo (a spanne 0,3–1,7 GB d'acqua sul server) e non scelta.

   | Costa | Posti |
   |---|---|
   | Alto Adriatico | Lignano Sabbiadoro, Bibione, Caorle, Cavallino, Sottomarina |
   | Romagna e Marche | Cesenatico, Rimini, Cattolica, Senigallia, San Benedetto del Tronto |
   | Abruzzo e Puglia | Pescara, Vieste, Gallipoli, Otranto |
   | Calabria e Sicilia | Tropea, Cefalù, Mondello, San Vito lo Capo |
   | Sardegna | Alghero, Villasimius, San Teodoro |
   | Tirreno | Viareggio, Forte dei Marmi, Castiglione della Pescaia, Ostia, Sperlonga |
   | Liguria | Alassio, Sanremo, Sestri Levante |

2. **L'acqua sul server** — *da chiedere, con i numeri veri* (quanti file,
   quanti MB): serve l'ok dell'utente in questa sessione **e** il via del
   coordinatore. L'utente sa già che per le spiagge nuove serve il server.
3. **I posti che il motore scarta** — a prove fatte: **nessuno**, tutti e
   29 tengono le forme a 2 km («Esito»). Detto all'utente con i numeri.
4. **Le forme più corte** — non serve chiederlo: nessun posto di mare
   scende sotto i 2 km.

## Contesto da leggere

- `docs/tasks/TASK-225.md` (l'acqua da un estratto; i riquadri di Riccione
  e Jesolo; `water_extract`)
- `docs/tasks/TASK-233.md`, ADR-0196 (`lake_catalog.py`, `lakes.json`,
  come è stata fatta e copiata l'acqua dei laghi)
- `docs/tasks/TASK-240.md`, ADR-0204 (la ricerca in «Another place»)
- `docs/MAPS.md`, «L'acqua da un estratto» e «I laghi di Explore»
- `docs/UI.md`, «Sull'acqua: «Paddle»»
- Memorie: «python-tests-in-worktree», «worktree-js-tests»,
  «enter-task-worktree-from-session-worktree», «task-233-paddle-lakes»
  (la ricetta pyosmium sul Mac)

## Cosa si sa già (2026-10-05, sola lettura)

- **Sul Mac c'è l'estratto dell'acqua dell'Italia**,
  `out/task233-lakes/italy-260930-water.osm.pbf` (lo stesso del server,
  674 MB), con gli script di TASK-233 in `out/task233-lakes/scripts/`
  (fuori dal repository) e l'acqua dei laghi in
  `out/task233-lakes/cache-italy/water/`. Le prove si fanno sul Mac, senza
  server e senza Overpass.
- **I file d'acqua si chiamano col loro riquadro**
  (`water_<sud>_<ovest>_<nord>_<est>.json`) e una richiesta usa il file che
  copre il riquadro intorno alla partenza (`water_bbox` in
  `route_engine/water_fit.py`, `covering_path` in `water.py`). Il server
  ha già `water_43.90300_12.43500_44.14700_12.84500.json` (la costa da
  Torre Pedrera a Cattolica) e
  `water_45.40300_12.43300_45.60700_12.86700.json` (da Cavallino a Eraclea
  Mare): **Rimini e Cattolica dovrebbero essere già coperte**; Cavallino
  dipende dal punto (il paese è appena fuori a ovest). Da provare col
  motore.
- Al mare la forma sta **oltre 200 m dalla riva** e entro 1 km
  (`SEA_SHORE_MARGIN_M`, TASK-191, ADR-0161); il mare è il riquadro meno la
  terra, dalla `natural=coastline`.
- Riccione pesa 1,1 MB e Jesolo 6,6 MB; 34 s l'uno sul server (TASK-225).
- `lake_catalog.py` è il modello: legge le acque di un estratto, sceglie i
  punti della riva, prova ogni punto con `plan_water` a 2, 1,5 e 1 km
  (`fitting_distance`), scrive l'elenco.

## Cosa fare

1. Un comando nuovo nell'API, sul modello di `lake_catalog.py`
   (`services/api/shaperoute_api/beach_catalog.py`): per ogni posto
   dell'elenco, i punti della riva dove si arriva a piedi (dai dati di
   OpenStreetMap dell'estratto, non scritti a mano), il riquadro d'acqua
   che serve, e la prova col motore di ogni punto. Scrive
   `apps/mobile/src/paddle/beaches.json`, con lo stesso formato dei punti
   di `lakes.json` (`name`, `point`, `distance_m`).
2. Sul Mac: l'acqua dei tratti di costa nuovi in una cartella di lavoro
   fuori dal repository, dall'estratto dell'Italia; le prove; i numeri
   (quanti posti tengono, quanti file, quanti MB).
3. **Fermarsi**: i numeri e i posti scartati all'utente; l'ok per il
   server; il via del coordinatore. Poi copiare sul server **solo i file
   nuovi** in `data/cache/water/`, senza sovrascrivere, come TASK-233 B.
4. Nell'app: `waterSpots.ts` legge anche `beaches.json` (poche righe in
   `allSpots`/`WATER_SPOTS`). Niente esempi dentro l'app per i luoghi
   nuovi: li disegna il server quando si sceglie il luogo, come per i
   laghi (`paddleExamples.json` e `src/explore/` sono di TASK-244).
5. Test deterministici, documenti, PR. Nel «pronta» al coordinatore:
   **l'app non si pubblica prima che l'acqua sia sul server**.

## Criteri di accettazione

- [ ] `beaches.json` ha i posti dell'elenco che il motore tiene, ognuno
      con almeno un punto sulla riva e la sua distanza (test sul file).
- [ ] Ogni punto è stato provato dal motore sull'acqua vera: cuore,
      cerchio e stella ci stanno alla distanza scritta.
- [ ] Con «Paddle», una spiaggia nuova si trova in «Explore» e in «Another
      place» scrivendone il nome (test).
- [ ] Jesolo, Riccione, i laghi e i loro esempi dentro l'app restano
      com'erano (test).
- [ ] Il server ha l'acqua di ogni punto dell'elenco (provato dentro
      l'API), prima della pubblicazione.
- [ ] Con «Run» e «Bike» niente cambia; il motore non cambia.

## File toccati

- `services/api/shaperoute_api/beach_catalog.py` (nuovo)
- `services/api/tests/test_beach_catalog.py` (nuovo)
- `apps/mobile/src/paddle/beaches.json` (nuovo)
- `apps/mobile/src/paddle/waterSpots.ts` (poche righe) e `.test.ts`
- `apps/mobile/src/paddle/placeSpots.ts` (la regola dell'ultima parola in
  `findSpots`) e `.test.ts`: dati dal coordinatore il 2026-10-05, per il
  difetto di «via» → «Viareggio» («Esito»)
- `docs/tasks/TASK-245.md` (nuovo), `docs/UI.md` («Sull'acqua:
  «Paddle»»), `docs/MAPS.md` (le spiagge, accanto a «I laghi di Explore»),
  `docs/DECISIONS.md` (ADR-0210), `docs/STATUS.md` (solo le righe di
  questo task)

`lakes.json`, `waterPlaces.ts`, `PaddleExplore.tsx` (lo toccherà TASK-182
B), `paddleExamples.json`, `src/explore/` (TASK-244) e il motore non
cambiano. Se serve altro, fermarsi e chiederlo al coordinatore.

## Fuori scope

- Tutta la costa d'Italia, e le spiagge fuori dall'Italia.
- Gli esempi delle spiagge nuove dentro l'app.
- Cambiare la fascia dei 200 m dalla riva o le distanze del mare.
- I laghi fuori elenco (Ledro, i sette scartati): seguiti di TASK-233.
- La riga «Search for a city or street to start from.» con «Paddle»
  (seguito di TASK-240).

## Esito

### 2026-10-05, il comando, l'elenco e le prove sul Mac

**I numeri**:

- **29 posti su 29** tengono cuore, cerchio e stella a **2 km**, e tutti
  hanno anche le altre cinque forme di «Explore» (8 su 8, chieste come le
  chiede l'app). **Nessuno scartato**: la fascia dei 200 m dalla riva non
  ne fa cadere nessuno, e le forme più corte non servono.
- **L'acqua nuova: 27 file, 22,6 MB**, uno a paese, da 0,2 MB (Cefalù, San
  Vito lo Capo, Senigallia) a 3,9 MB (Sottomarina, per la laguna); Bibione
  e Lignano 2,1, Caorle 1,9, Viareggio 1,5, Pescara 1,3. **Rimini e
  Cavallino non ne vogliono**: stanno nei file di Riccione e di Jesolo che
  il server ha già (Cattolica no: il suo riquadro esce di poco da quello
  di Riccione).
- Tempi sul Mac: 4 minuti per scrivere l'acqua, 1 per le prove. Un cuore
  da 2 km sull'acqua nuova: 0,5–1,8 s.
- Dov'è il punto: sulla spiaggia in 27 posti, su un sentiero lungo la riva
  ad Alghero e San Benedetto del Tronto; da 100 m (Mondello) a 1,8 km
  (Villasimius) dal punto del paese in OpenStreetMap.

**Fatto** (ADR-0210):

- `services/api/shaperoute_api/beach_catalog.py` (nuovo): i 29 paesi
  (`PLACES`, dove OpenStreetMap ha il loro nodo `place`, letti una volta
  da Photon); `--boxes` stampa il riquadro d'acqua di ognuno (con
  `--cache-dir` solo quelli che la cartella non copre già); `--cache-dir`
  sceglie il punto della riva fra quelli dove il motore dice che si arriva
  a piedi, lo prova con `plan_water` a 2, 1,5 e 1 km e scrive l'elenco. Un
  posto che resta fuori è detto col perché. Niente scaricato.
- `apps/mobile/src/paddle/beaches.json` (nuovo): 29 righe, 3 KB.
- `waterSpots.ts`: `WATER_SPOTS` ha anche le spiagge, dopo i laghi.
- Test: `test_beach_catalog.py` (13) e due in `waterSpots.test.ts`.

**Come è stata fatta l'acqua sul Mac**: come in TASK-233, con pyosmium al
posto di `osmium` e `water_extract.write_from`, il codice del repository
(`out/task233-lakes/scripts/cuts.py`), dall'estratto
`out/task233-lakes/italy-260930-water.osm.pbf`. Tutto in
`out/task245-beaches/`, fuori dal repository: `cache-all/` (i 29 riquadri
e i due del server rifatti per le prove), `cache/` (come sarà il server:
i due file suoi e i 27 nuovi; le prove sono fatte lì), **`new/water/` (i
27 file da copiare)**, `beaches.json`, `list.log`, `eight.log`, e in
`scripts/` i passi (`run.sh`: `boxes-all`, `cut`, `boxes`, `list`). Dopo
il merge di `main` con le forme inclinate (TASK-232 A, che cambia
`water_fit.py`) i riquadri e l'elenco sono stati rifatti: identici.

**Un difetto trovato nella ricerca di «Another place»** (`findSpots`, di
TASK-240): con le spiagge nell'elenco, ogni indirizzo che comincia con
«via» proponeva «Viareggio», perché «via» è l'inizio del nome. Il
coordinatore ha dato a questo task `placeSpots.ts` e `placeSpots.test.ts`.
**Corretto** (ADR-0210, punto 7): solo l'ultima parola scritta vale come
inizio di parola, perché la si sta ancora scrivendo; quelle prima devono
essere una parola intera del nome. «via al lago» e «via Roma, Trento» non
propongono niente, «via» da sola propone «Viareggio», «lago di lev» e
«lago di Levico Terme» come prima; «lev» trova anche «Sestri Levante».
Test nuovi con le spiagge di più parole («forte dei marmi», «san vito»,
«sestri lev»). `searchSpots` di «Explore» non cambia.

**Da dove riprendere** (2026-10-05):

1. La PR, con i controlli JS verdi (`npm test`, `typecheck`, `lint`,
   `format:check`).
2. **L'ok dell'utente per il server** (27 file, 22,6 MB) e il «via» del
   coordinatore. Poi: copiare `out/task245-beaches/new/water/*.json` in
   una cartella d'appoggio del server (tar su ssh), spostarli uno per uno
   in `/root/shaperoute/data/cache/water/` con `mv -n`, proprietario e
   permessi come gli altri, nessun riavvio; provare dentro il container
   dell'API un cuore da 2 km da un punto dell'elenco.
3. «#NNN pronta» al coordinatore, dicendo se l'acqua è già sul server;
   niente merge senza il suo «merge NNN».
