# TASK-245 — Altre spiagge per «Paddle», oltre Jesolo e Riccione

**Stato**: Done (2026-10-05) — PR #363 (merge `0d8bbc1`): 29 posti di
mare su 29 nell'elenco, tutti a 2 km; l'acqua è sul server (27 file).
Esce con la pubblicazione del coordinatore; la prova sul telefono è
dell'utente
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

- [x] `beaches.json` ha i posti dell'elenco che il motore tiene, ognuno
      con almeno un punto sulla riva e la sua distanza (test sul file).
- [x] Ogni punto è stato provato dal motore sull'acqua vera: cuore,
      cerchio e stella ci stanno alla distanza scritta.
- [x] Con «Paddle», una spiaggia nuova si trova in «Explore» e in «Another
      place» scrivendone il nome (test).
- [x] Jesolo, Riccione, i laghi e i loro esempi dentro l'app restano
      com'erano (test).
- [x] Il server ha l'acqua di ogni punto dell'elenco, prima della
      pubblicazione. **«Provato dentro l'API»: non fatto**, negato dai
      permessi della sessione; sostituito dall'impronta uguale (lo SHA-256
      dei 27 file sul server è quello dei file su cui il motore di
      `c2bb428` ha provato i 29 posti; deciso col coordinatore); **da
      confermare con la prova dell'utente sul telefono**.
- [x] Con «Run» e «Bike» niente cambia; il motore non cambia.

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

### 2026-10-05, l'acqua sul server

Ok dell'utente nella sessione del task («ok, copia l'acqua sul server») e
«via» del coordinatore, dopo l'aggiornamento del server delle 12:02Z e
mentre girava `draw_examples`, che non è stato fermato.

- **27 file, 22,6 MB**, copiati in una cartella d'appoggio
  (`data/water-incoming-task245/`, poi tolta, vuota) e spostati uno per
  uno con `mv -n` in `/root/shaperoute/data/cache/water/`: 27 spostati,
  nessuno già presente, nessuno sovrascritto. La cartella aveva 220 file
  (71 MB), ora ne ha **247 (93 MB)**, tutti di 10001:10001 con permessi
  644. Nessun riavvio.
- **Le impronte coincidono**: lo SHA-256 dei 27 file sul server è quello
  dei file del Mac su cui il motore ha provato i 29 posti.
- **La prova dentro il container dell'API non è stata fatta**: il cuore da
  2 km da due spiagge nuove, chiesto all'API dal container, è stato negato
  dai permessi della sessione (lettura in produzione con la chiave). Resta
  da fare, da chi ha il permesso o dall'utente sul telefono dopo la
  pubblicazione: una spiaggia nuova scelta in «Explore» con «Paddle».

### 2026-10-05, chiuso

PR **#363** mergiata in `main` (`0d8bbc1`, 12:31Z) al «merge 363» del
coordinatore, con la CI 5/5 verde. L'utente, saputo che la prova dentro
l'API non è stata fatta: «va bene così, la provo sul telefono».

**Seguiti**:

- **La prova sull'iPhone, dell'utente**, dopo la pubblicazione: con
  «Paddle», una spiaggia nuova in «Explore» (per esempio Viareggio), le
  sue forme, e il nome scritto in «Another place».
- Se il motore dell'acqua o l'estratto cambiano, l'elenco si rifà:
  `MAPS.md`, «Le spiagge di «Paddle»»; gli script usati sul Mac al posto
  di `osmium` sono in `out/task245-beaches/scripts/` e
  `out/task233-lakes/scripts/`, fuori dal repository.
- Una partenza al mare a più di 3 km da un paese dell'elenco resta senza
  acqua sul server: altri posti si aggiungono a `PLACES`.
- ~~In «Another place», «lago lev» propone anche «Sestri Levante» dopo
  «Lago di Levico»: le parole comuni («lago») non contano quando un'altra
  parola dice il luogo (regola di TASK-240).~~ Fatto nella parte B.

### 2026-10-05, parte B: una parola comune sceglie fra i nomi trovati

Dopo il «continua va bene» dell'utente, il seguito qui sopra (branch
`fix/TASK-245-b-common-words`; ADR-0210, aggiornamento). File toccati:
`apps/mobile/src/paddle/placeSpots.ts` e `placeSpots.test.ts`,
`docs/UI.md`, `docs/DECISIONS.md`, `docs/STATUS.md`, questo file.

- `findSpots`: fra i nomi trovati con le parole che dicono il luogo, se
  qualcuno ha tutte le parole scritte che l'elenco conosce (comuni
  comprese), restano solo quelli; se no, i nomi trovati restano.
- «lago lev» e «lago di lev» → solo «Lago di Levico»; «lev» → «Lago di
  Levico» e «Sestri Levante», come prima; «lago di sestri lev»,
  «lungomare di Viareggio», «lago di iseo» trovano il loro luogo.
- Test: uno nuovo in `placeSpots.test.ts` (i casi qui sopra, e le
  proposte di `spotPlaces`); i 98 test di `src/paddle/` verdi.
- Niente server, niente motore: esce con la prossima pubblicazione
  dell'app.
- **Chiusa**: PR **#376** mergiata in `main` (`1c8366e`, 15:23Z) al
  «merge 376» del coordinatore, con la CI 5/5 verde.

### 2026-10-09, parte C: altri posti di mare

Dopo la scelta dell'utente del 2026-10-08 («Proponi tu altri posti»), con
il via del coordinatore (branch `feat/TASK-245-c-more-beaches`; ADR-0210,
aggiornamento). File toccati: `services/api/shaperoute_api/beach_catalog.py`
(`PLACES`) e `services/api/tests/test_beach_catalog.py` (il numero dei
posti), dati dal coordinatore il 2026-10-09; `apps/mobile/src/paddle/beaches.json`
(e `paddleExamples.json` se la CI lo chiede) e `waterSpots.test.ts`; `docs/MAPS.md`,
`docs/DECISIONS.md`, `docs/STATUS.md` (solo le righe di questa parte),
questo file. Il motore non cambia.

**La lista approvata** (2026-10-09). L'agente ha proposto in chat una
tabella pesata sulle coste con meno posti, con sette alternative;
l'utente ha scelto «sì, più qualcuno» senza nominarne (nella sessione
«Scelte prodotto prioritarie», che l'ha riferito): la lista più tutte e
sette le alternative. La tabella aveva 31 posti, non 30 come scritto
dall'agente: **38 posti nuovi**.

| Costa | Posti nuovi |
|---|---|
| Friuli-Venezia Giulia | Grado, Trieste (Barcola) |
| Marche | Sirolo, Pesaro |
| Abruzzo e Molise | Vasto (Marina di Vasto), Termoli |
| Puglia | Polignano a Mare, Monopoli, Porto Cesareo, Santa Maria di Leuca, Peschici |
| Basilicata | Maratea |
| Calabria | Scilla, Pizzo, Soverato (Soverato Marina) |
| Sicilia | Giardini Naxos, Siracusa, Marzamemi, Favignana, Lampedusa |
| Sardegna | Cala Gonone, La Maddalena, Stintino, Chia, Porto Cervo |
| Campania | Sorrento, Positano, Amalfi, Ischia (Ischia Porto), Palinuro |
| Lazio | Gaeta, Sabaudia |
| Toscana e isole | Portoferraio, Marina di Campo, Porto Santo Stefano |
| Liguria | Finale Ligure, Camogli, Lerici |

Il punto di ogni paese è il suo nodo `place` di OpenStreetMap, letto una
volta da Photon come in TASK-245; dove il paese è in collina o il nodo è
lontano dal mare, il nodo della frazione sul mare (tra parentesi).

**I numeri** (2026-10-09/10, sul Mac, `italy-260930-water.osm.pbf`):

- **67 posti su 67** tengono cuore, cerchio e stella a **2 km**: i 38
  nuovi e i 29 di prima, che restano identici (stesso punto, stessa
  distanza). **Nessuno scartato**, nemmeno sulle coste ripide (Positano,
  Scilla, Camogli, Maratea).
- **L'acqua nuova: 38 file, 20,3 MB**, uno a paese, da 0,1 MB (Soverato) a
  1,7 MB (Grado); nessun paese nuovo sta in un file che il server ha già.
- Il punto della riva: da 60 m (Amalfi) a 1,7 km (Maratea, in collina)
  dal nodo del paese.
- Tempi: 29 minuti per scrivere l'acqua (pyosmium, `cuts.py` di
  TASK-233), qualche minuto per le prove a 2 km.

**Fatto**: `PLACES` (67, in ordine), il test del numero dei posti,
`beaches.json` scritto dal comando (67 righe; Prettier), un test nuovo in
`waterSpots.test.ts` (ogni spiaggia si trova col suo nome in «Explore» e
in «Another place» ed è il posto di «Near me» dalla sua riva).

**Sul Mac**, fuori dal repository: `out/task245c-beaches/` nel worktree
(`.claude/worktrees/TASK-245-C`): `boxes-new.tsv`, `cache/` (i 29 file
del server di TASK-245 e i 38 nuovi; le prove sono fatte lì),
**`new/water/` (i 38 file da copiare)** con `new-sha256.txt`, `list.log`,
`eight.log`, `scripts/run.sh` (`boxes`, `cut`, `list`) ed `eight.py`.
