# TASK-245 — Altre spiagge per «Paddle», oltre Jesolo e Riccione

**Stato**: In corso (2026-10-05) — task file scritto, nessun codice ancora
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
3. **I posti che il motore scarta** — *da dire all'utente* a prove fatte:
   quali dei 29 restano fuori e perché.
4. **Le forme più corte** — *da chiedere se serve*: per i laghi piccoli
   l'utente ha approvato 1,5 e 1 km (TASK-233); se un posto di mare tiene
   le forme solo a meno di 2 km, proporre la stessa regola.

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
- `docs/tasks/TASK-245.md` (nuovo), `docs/UI.md` («Sull'acqua:
  «Paddle»»), `docs/MAPS.md` (le spiagge, accanto a «I laghi di Explore»),
  `docs/DECISIONS.md` (ADR-0210), `docs/STATUS.md` (solo le righe di
  questo task)

`lakes.json`, `waterPlaces.ts`, `PaddleExplore.tsx` (lo toccherà TASK-182
B), `paddleExamples.json`, `src/explore/` (TASK-244), `placeSpots.ts` e il
motore non cambiano. Se serve altro, fermarsi e chiederlo al coordinatore.

## Fuori scope

- Tutta la costa d'Italia, e le spiagge fuori dall'Italia.
- Gli esempi delle spiagge nuove dentro l'app.
- Cambiare la fascia dei 200 m dalla riva o le distanze del mare.
- I laghi fuori elenco (Ledro, i sette scartati): seguiti di TASK-233.
- La riga «Search for a city or street to start from.» con «Paddle»
  (seguito di TASK-240).

## Esito

*(a fine task)*

**Da dove riprendere** (2026-10-05): niente codice ancora. Il worktree è
`.claude/worktrees/TASK-245`, con i `node_modules` già collegati. Primo
passo: il punto 1 di «Cosa fare», leggendo `lake_catalog.py` e
`water_extract.py`; poi il punto 2 sul Mac. L'utente ha detto «ok vai»
dopo aver visto l'ordine del lavoro; la prossima cosa che gli serve sono i
numeri del punto 3.
