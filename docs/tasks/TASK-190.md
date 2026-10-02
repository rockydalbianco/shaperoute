# TASK-190 — Percorsi in bici

**Stato**: In corso (parti A e B fatte; C da fare)
**Fase**: 4 · **Branch**: `feat/TASK-190-bike-routes` (parte A),
`feat/TASK-190-bike-api` (parte B)
**Dipende da**: TASK-189 («Sport» in «Settings»: la riga «Bike» da
accendere), TASK-177 (la pagina «Settings»)

## Obiettivo

Chi sceglie «Bike» riceve un percorso che disegna la forma su strade da
bici, fra 10 e 30 km. Chiesto dall'utente il 2026-10-02: «inizia un'altra
task per cominciare anche per la bici, che non è difficilissimo».

## Scelte dell'utente (2026-10-02)

- **Distanze: 10–30 km**, come primo passo. Distanze più lunghe sono un
  task successivo (zone di mappa più grandi, attese più lunghe).
- In «Settings» la riga «Bike» resta «Soon» finché questo task non è
  finito (ADR-0152).

## Contesto da leggere

- `docs/ROUTE_ENGINE.md` §4 (la rete filtrata per l'attività), §6
- `docs/MAPS.md` «Sorgente», «Cache», «Area scaricata», «Zone scaricate
  prima»
- `docs/DECISIONS.md` ADR-0008, ADR-0022 (la rete `foot`), ADR-0023,
  ADR-0119 (le zone), ADR-0152
- `docs/API.md`: la richiesta di percorso e il campo `activity`
- `services/route-engine/route_engine/network.py` (`FOOT_FILTER`),
  `models.py` (`SUPPORTED_ACTIVITIES`, `check_activity`), `validation.py`
- `packages/shared-types/src/index.ts` (`ACTIVITIES`)
- `apps/mobile/src/settings/sport.ts`

## Cosa fare

Il contratto ha già il posto: la richiesta porta `activity`, che oggi
vale solo `"running"`. **Non si aggiunge un campo `sport`**: si aggiunge
il valore `"cycling"` ad `activity`, e l'app traduce «Bike» in
`"cycling"`.

Il task è da fare in tre PR, in quest'ordine (se il coordinatore
preferisce, tre task: i numeri li dà lui).

**A. Route Engine**

1. Una rete per la bici accanto a `FOOT_FILTER`: strade dove si pedala
   (ciclabili, strade minori e secondarie), senza scale, sentieri e
   marciapiedi, senza strade vietate alle bici e senza `trunk` e
   autostrade. Il filtro esatto va deciso sui dati e scritto in un ADR
   (ADR-0153), con le misure di due zone (una città, una valle).
2. I sensi unici: a piedi non valgono (`network_type="walk"`), in bici
   sì, tranne dove OSM dice il contrario (`oneway:bicycle=no`,
   `cycleway=opposite`). Decidere e scrivere nell'ADR: un percorso
   contromano non è accettabile.
3. La rete della bici ha la sua cache, separata da quella a piedi
   (un grafo `foot` non serve una richiesta `cycling`, né il contrario).
4. `SUPPORTED_ACTIVITIES` con `"cycling"`; i limiti di distanza per
   attività (10–30 km per la bici); la validazione di §6 rivista per la
   bici (cosa è un avviso in bici: strade principali, sterrato; le scale
   non devono esserci).
5. La CLI accetta `--activity cycling`. Campioni in `samples/` per il
   giudizio a occhio: cuore, cerchio e stella a 10, 20 e 30 km a Trento e
   in una città di pianura.

**B. API**

6. `activity: "cycling"` nelle richieste di percorso (`/route-jobs`,
   `/routes`) e in `shared-types`; l'errore per una distanza fuori dai
   limiti dell'attività; i percorsi tenuti (`route_store.py`) distinguono
   già per `activity`: controllarlo con un test.
7. Le zone scaricate prima (`prefetch_zones.py`): quali città hanno la
   rete della bici, e quanto è grande il riquadro che serve a 30 km.
   **Da misurare prima di promettere i tempi**: se il riquadro di oggi
   (17 × 17 km) non basta, dirlo al coordinatore prima di scaricare.

**C. App**

8. `ready: true` per «Bike» in `sport.ts`; «Draw» manda `activity` secondo
   lo sport scelto e propone le distanze della bici; i testi che dicono
   «run» dove lo sport è la bici.
9. Cosa cambia in «Explore», «Feed» e nella schermata della corsa con la
   bici scelta **è una scelta di prodotto**: proporla all'utente prima di
   toccarle (vedi «Domande aperte»).

## Criteri di accettazione

- [x] Dalla CLI, senza rete e senza chiavi, sulle fixture: un percorso
      `cycling` chiuso, che non passa su scale né su vie vietate alle
      bici e rispetta i sensi unici. *(Parte A: su una città sintetica,
      `tests/test_bike_network.py`.)*
- [x] Una richiesta `cycling` sotto 10 km o sopra 30 km è un errore che
      dice i limiti; una `running` si comporta come prima (i test di oggi
      restano verdi senza modifiche ai valori attesi). *(Parte A, nel
      motore e quindi nell'API, che usa `RouteRequest`.)*
- [x] La cache a piedi di una zona non viene usata per la bici.
- [ ] Campioni in `samples/` giudicati dall'utente. *(Non fatti nella
      parte A: Overpass rifiuta le connessioni dal Mac, e nessuna zona
      della bici è stata scaricata; vedi «Esito».)*
- [ ] Nell'app, con «Bike» scelto, «Draw» chiede un percorso `cycling`
      fra 10 e 30 km; con «Run» tutto è come prima.
- [ ] Test deterministici per motore, API e app. *(Motore: parte A; API:
      parte B, `tests/test_cycling.py` e gli altri dell'«Esito»; app:
      parte C.)*

## File toccati

Ogni PR dichiara i suoi.

**Parte A** (motore, fatta, PR #214):

```
services/route-engine/route_engine/network.py
services/route-engine/route_engine/models.py
services/route-engine/route_engine/validation.py
services/route-engine/route_engine/optimizer.py
services/route-engine/route_engine/nearby_starts.py
services/route-engine/route_engine/zone_crop.py
services/route-engine/route_engine/__main__.py
services/route-engine/tests/test_bike_network.py
docs/ROUTE_ENGINE.md
docs/MAPS.md
docs/DECISIONS.md
docs/STATUS.md
docs/tasks/TASK-190.md
```

`optimizer.py`, `nearby_starts.py` e `zone_crop.py` non erano
nell'elenco previsto: il controllo della rete giusta (`check_network`),
il ritorno da una partenza vicina coi sensi unici e il ritaglio della zona
della bici stanno lì (ADR-0153).

**Parte B** (API e contratto, fatta):

```
services/route-engine/route_engine/models.py
services/route-engine/tests/test_contract.py
services/route-engine/tests/test_bike_network.py
services/api/shaperoute_api/activity_graphs.py             (nuovo)
services/api/shaperoute_api/app.py
services/api/shaperoute_api/jobs.py
services/api/shaperoute_api/errors.py
services/api/shaperoute_api/images.py
services/api/shaperoute_api/schemas.py
services/api/shaperoute_api/prefetch_zones.py
services/api/shaperoute_api/replay.py
services/api/shaperoute_api/__main__.py
services/api/tests/test_cycling.py                         (nuovo)
services/api/tests/test_contract.py
services/api/tests/test_prefetch_zones.py
services/api/tests/test_route_store.py
services/api/tests/test_zone_extract.py
packages/shared-types/src/index.ts
packages/shared-types/fixtures/contract.json
packages/shared-types/fixtures/route-request-cycling.json  (nuovo)
packages/shared-types/test/contract.test.ts
docs/API.md
docs/MAPS.md
docs/DECISIONS.md
docs/STATUS.md
docs/tasks/TASK-190.md
```

Non nell'elenco previsto, e perché: i due test del contratto
(`route-engine/tests/test_contract.py`,
`shared-types/test/contract.test.ts`) confrontano `contract.json` con il
codice, e `test_bike_network.py` diceva che `SUPPORTED_ACTIVITIES` era la
sola corsa; `app.py` e `jobs.py` sono dove una richiesta riceve i grafi e
un errore la sua distanza suggerita; `errors.py` ha `suggested_distance`
(nell'«Esito» della parte A); `__main__.py` crea le due reti, `replay.py`
rifà una richiesta in bici sulla rete della bici. `zone_extract.py` e
`draw_examples.py` non sono cambiati («Esito», parte B).

**Parte C** (app, previsto):

```
apps/mobile/src/settings/sport.ts
apps/mobile/App.tsx
docs/UI.md
docs/STATUS.md
docs/tasks/TASK-190.md
```

## Fuori scope

- Distanze oltre i 30 km.
- Dislivello e superficie (bici da corsa contro mountain bike): una rete
  sola, per ora.
- La voce che guida e il punteggio a fine giro pensati per la bici
  (velocità diverse): restano quelli della corsa finché l'utente non
  chiede altro.
- La canoa: TASK-191.
- Nessuna dipendenza nuova: OSMnx fa già tutto quello che serve.

## Domande aperte per l'utente

Una per volta, con una proposta, quando si arriva alla parte C:

1. Con «Bike» scelto, «Explore» e «Feed» mostrano solo percorsi da bici,
   o tutti con un segno dello sport? (Oggi il catalogo ha solo corse.)
2. Durante un giro in bici, la schermata della corsa resta uguale (ritmo
   al km) o mostra la velocità in km/h?

## Esito

**Parte A — il motore (2026-10-02)**, PR #214, ADR-0153. Fatto:

- la rete `bike` (`network.py`): `rideable` decide le strade (ciclabili e
  strade fino alle `primary`, `track` comprese; `path`, `footway`,
  `bridleway` solo con `bicycle=designated`; zone pedonali aperte alle
  bici; mai scale, `trunk`, autostrade, `bicycle=no|dismount|
  use_sidepath`, `motorroad=yes`, strade chiuse ai veicoli salvo
  `bicycle=yes`); due filtri Overpass (`BIKE_FILTER`), `network_type=
  "bike"`, grafo non semplificato finché `bike_ways` non ha deciso strada
  per strada;
- i sensi unici: valgono; aperti nei due sensi solo con
  `oneway:bicycle=no`, `cycleway*=opposite*`, `cycleway:<lato>:oneway=-1`
  (`bike_direction`). Un ritaglio tiene il pezzo dove ogni nodo si
  raggiunge da ogni altro; il ritorno da una partenza vicina è la via più
  breve consentita;
- la cache `bike_*.graphml` (e pickle), separata da `foot_*`, che non
  cambia; i grafi `bike` portano `network="bike"` e il motore rifiuta un
  grafo dell'attività sbagliata (`check_network`);
- `models.py`: `DISTANCE_LIMITS_M` (`running` 1–50 km come prima,
  `cycling` 10–30 km), `ACTIVITIES`, `check_distance(distance, activity)`
  con l'errore che dice i limiti. **`SUPPORTED_ACTIVITIES` resta
  `("running",)`** fino alla parte B: è il contratto rispecchiato da
  `shared-types` (`test_contract.py`), che la parte A non tocca. Il punto 4
  qui sopra va quindi finito nella parte B, insieme a `contract.json` e
  `ACTIVITIES` di `shared-types`;
- validazione: `unpaved` (sterrato) solo sulla rete `bike`, warning;
  scale impossibili; strade principali = `primary`;
- CLI: `--activity cycling`, con i metri di sterrato.

Verificato: 55 test nuovi in `tests/test_bike_network.py`, su una città
sintetica data a OSMnx come risposta di Overpass (sensi unici, scale,
marciapiede, `trunk`, via vietata, ciclabile `path`, `track`): grafo,
sensi, un cerchio da 10 km chiuso e solo su archi consentiti
(`plan_route`), la CLI che disegna un cuore da 10 km, le due cache, il
ritaglio, il ritorno da una partenza vicina, i limiti, lo sterrato, la
rete sbagliata. Motore 1.081 test verdi (i 1.026 di prima senza
modifiche), API 574; `ruff` e `black` puliti.

**Non verificato, e perché**: Overpass rifiuta le connessioni dal Mac (un
tentativo dalla CLI alle 18:23Z, «Connection refused» su tutti e due gli
indirizzi); nessuna zona della bici scaricata, quindi **nessun campione**
in `samples/`. Le misure dell'ADR vengono dalle risposte **a piedi** già
in cache (Trento, Valsugana, Padova, Bologna), che non hanno le strade col
marciapiede a parte: dicono quali tag contano, non come viene una forma
sulla rete vera. Su quelle reti approssimate la Valsugana disegna tutto
(0,62–0,92), Padova bene a 20 km, il centro di Trento quasi niente (la rete
senza le vie principali è a pezzi).

**Per la parte B**: `SUPPORTED_ACTIVITIES` con `cycling` insieme a
`contract.json` e `shared-types`; l'API deve dare a una richiesta
`cycling` la sorgente `OsmnxSource.for_activity(cache, "cycling")` (oggi
finisce in `WrongNetworkError`, `engine_error`); `images.py` costruisce
`ShapeJob` senza `activity` e controlla la distanza della corsa
(`check_distance(distance)`): da passare; `errors.suggested_distance`
usa i limiti della corsa; `ZoneCrop` non accelera le zone `bike`; le zone:
cerchio da 30 km = 23 km di lato (26 con la ricerca lontana), più delle
17 di oggi; una zona `bike` sono due richieste a Overpass (o l'estratto:
i filtri sono leggibili da `zone_extract`). Poi i campioni: cuore, cerchio
e stella a 10, 20 e 30 km a Trento e in una città di pianura, da far
giudicare all'utente.

**Parte B — l'API e il contratto (2026-10-02)**, ADR-0153
(«Aggiornamento»). Fatto:

- **il contratto**: `SUPPORTED_ACTIVITIES = ("running", "cycling")` in
  `models.py`, `ACTIVITIES` e `DISTANCE_LIMITS_M` in `shared-types`,
  `contract.json` con `distance_limits_m`, la fixture
  `route-request-cycling.json`; i test del contratto dei tre lati la
  leggono. La corsa non cambia: stessi campi, stessi limiti, stessi
  messaggi; l'app compila e passa i suoi test senza modifiche (il tipo
  `Activity` si è solo allargato);
- **la rete della richiesta**: `activity_graphs.py`, un `ZoneGraphs` per
  attività (`OsmnxSource.for_activity`), zone a piedi 2 in memoria come
  prima, della bici 1; `/routes`, `/route-jobs`, `/image-route-jobs` e il
  replay danno al motore le zone dell'attività; `/route-directions` e i
  percorsi a tema restano a piedi; un'attività fuori dal contratto è
  `invalid_request`;
- **limiti ed errori**: 10–30 km in bici con il messaggio del motore,
  anche per le foto (`images.py`); la distanza suggerita di
  `shape_not_drawable` nei limiti dell'attività (`errors.py`);
- **le zone della bici**: `prefetch_zones --activity cycling --extract …`,
  **26 × 26 km** attorno al centro (`bike_zone_box`), senza nomi delle
  strade, solo dall'estratto (senza `--extract` il comando si ferma).
  `zone_extract.py` non è cambiato: legge già i due `BIKE_FILTER` e li
  serve a OSMnx, provato con un test e sui dati veri (sotto). Città: prima
  Trento (la prova sul server), poi `--preset italy` con l'ok
  dell'utente, le estere no (ADR-0153);
- **i percorsi tenuti**: la chiave ha già l'attività, ora c'è il test;
- **`draw_examples`**: nessuna variante della bici. Cosa mostra «Explore»
  con «Bike» scelto è la domanda 1 di «Domande aperte», una scelta di
  prodotto della parte C.

**La memoria di una zona della bici** (misurata sul Mac il 2026-10-02,
senza rete, dettagli in ADR-0153): zone `bike` costruite **per la strada
dell'estratto** (`zone_extract.served_from`) dalle risposte a piedi di
Overpass già in cache, sullo stesso riquadro delle zone a piedi; poi, in un
processo nuovo, `read_graph` e `ZoneCrop` come fa l'API, misurando la
memoria del processo (`ps`, `ru_maxrss`). Trento 18,6 km: 127 MB (a piedi
185); Valsugana 22,6 km: 105 MB; Milano 19,4 km: 236 MB (a piedi 618);
Roma 16,7 km: 186 MB (a piedi 454). Il ritaglio per un percorso (sempre
`network.crop` in bici) 0,1–0,7 s, +25–35% mentre c'è. **Stima per la zona
di 26 km**, in proporzione all'area: **0,15–0,45 GB**, fino a **circa
0,6 GB** in una città grande contando le vie col marciapiede a parte che
mancano a quelle risposte (0–2% dei km a Palermo, Bari e Genova; di più
nelle città grandi, non misurato in Italia); su disco 70–150 MB. Con una
sola zona della bici in memoria, l'API del server (8 GB, 4 vCPU) cresce al
più di circa 0,6–0,8 GB durante un percorso in bici, meno di una seconda
zona a piedi di Milano. La costruzione dall'estratto: 10–29 s e un picco
di 1–1,8 GB per quei riquadri, stimati 1,9 GB (Trento) e 3,2 GB (Milano)
per 26 km, più osmium: dentro il container da 4 GiB per le città medie.

**Verificato**: motore 1.138 test verdi; API 690 test verdi, di cui
29 nuovi (`test_cycling.py`: la rete di ogni attività, limiti,
attività non offerte, distanza suggerita, foto, replay, e un cerchio da
10 km in bici dall'API sulla città sintetica di prova, chiuso, sui sensi
unici giusti e mai su scale, marciapiedi e `trunk`; poi `test_contract`,
`test_prefetch_zones`, `test_route_store`, `test_zone_extract`);
`shared-types` 21 test, app 1.103 test, `typecheck`, `lint`,
`format:check`; `ruff` e `black` puliti. Sul Mac, le quattro zone della
bici sopra costruite dalla strada dell'estratto senza modificarla.

**Non verificato, e perché**: una zona vera della bici (osmium e
l'estratto non sono sul Mac, e il server vuole l'ok dell'utente), i tempi
di un percorso in bici su di essa, i campioni da far giudicare all'utente
(il criterio resta aperto).

**La prova sul server** (con l'ok dell'utente; comandi ricavati dai
documenti e da TASK-137, TASK-168 e TASK-180, non provati). Come `root`:

```bash
# 0. L'API a un main con la parte B (DEPLOY.md F.9), l'immagine di prima da parte.
cd /root/shaperoute && git pull
docker tag shaperoute-api shaperoute-api:before-task190b
cd deploy && docker compose up -d --build api && curl http://127.0.0.1:8000/health

# 1. L'immagine dei download sopra l'API nuova (motore e prefetch_zones nuovi).
printf 'FROM shaperoute-api\nUSER root\nRUN apt-get update && apt-get install -y --no-install-recommends osmium-tool\nUSER shaperoute\n' | docker build -t shaperoute-prefetch -

# 2. La zona della bici di Trento dall'estratto, con il picco di memoria.
#    Prima il nome dell'estratto: TASK-180 ha usato italy-260930-highways.osm.pbf.
ls /srv/shaperoute/extracts
docker run --rm -i -m 4g --env-file /root/shaperoute/deploy/.env \
  -v /root/shaperoute/data/cache:/app/data/cache \
  -v /srv/shaperoute/extracts:/extracts \
  shaperoute-prefetch python - <<'EOF'
import resource, runpy, sys
sys.argv = ["prefetch_zones", "--activity", "cycling",
            "--extract", "/extracts/italy-260930-highways.osm.pbf", "Trento"]
try:
    runpy.run_module("shaperoute_api.prefetch_zones", run_name="__main__")
finally:
    python_mb = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss // 1024
    osmium_mb = resource.getrusage(resource.RUSAGE_CHILDREN).ru_maxrss // 1024
    print(f"peak: python {python_mb} MB, osmium {osmium_mb} MB")
EOF
ls -la /root/shaperoute/data/cache/bike_*

# 3. Un cerchio in bici da 10, 20 e 30 km dal centro di Trento, dentro il
#    container dell'API (la chiave resta sul server). La zona si legge dal
#    disco alla prima richiesta: niente riavvio.
cd /root/shaperoute/deploy && docker compose exec -T api python - <<'EOF'
import json, os, time, urllib.error, urllib.request
HEADERS = {"Content-Type": "application/json",
           "X-API-Key": os.environ.get("SHAPEROUTE_API_KEY", "")}
def call(method, path, body=None):
    data = None if body is None else json.dumps(body).encode()
    request = urllib.request.Request("http://127.0.0.1:8000" + path, data=data,
                                     method=method, headers=HEADERS)
    try:
        with urllib.request.urlopen(request, timeout=60) as answer:
            return json.loads(answer.read())
    except urllib.error.HTTPError as exc:
        return json.loads(exc.read())
centre = call("GET", "/cities?q=Trento")["places"][0]["point"]
for distance in (10_000, 20_000, 30_000):
    began = time.time()
    job = call("POST", "/route-jobs", {"start": centre, "shape": "circle",
               "distance_m": distance, "activity": "cycling"})
    while job.get("status") not in ("done", "failed", None):
        time.sleep(2)
        job = call("GET", "/route-jobs/" + job["job_id"])
    result = job.get("result") or {}
    print(distance, job.get("status"), (job.get("error") or {}).get("code"),
          f"{time.time() - began:.0f} s", result.get("distance_m"),
          result.get("similarity"), len(result.get("alternatives", [])),
          result.get("warnings"))
EOF
docker compose logs --since 20m api | grep -E "graph from|job "
docker stats --no-stream
```

Da guardare: `graph from disk (bike_…)` nel log, nessun `downloading_map`,
i secondi, la memoria dell'API in `docker stats` (stima sopra) e il picco
della costruzione. Se va male: `docker tag shaperoute-api:before-task190b
shaperoute-api && docker compose up -d api`; i file `bike_*` non servono
a nessuna richiesta a piedi e possono restare. Dopo l'aggiornamento gli
esempi tenuti si ridisegnano (sotto, «Note per il deploy»): `draw_examples`
come in TASK-168.

**Per la parte C**: l'app manda `activity: "cycling"` con «Bike» scelto e
propone 10–30 km (`DISTANCE_LIMITS_M.cycling` in `shared-types`; oggi
`route/distance.ts` usa `MIN_DISTANCE_M` e 21 km per la corsa). Gli errori
sono quelli di sempre (`invalid_request` con i limiti, `shape_not_drawable`
con una distanza suggerita nei 10–30 km, `map_data_unavailable` fuori dalle
zone della bici quando Overpass rifiuta). Fuori dalle zone fatte prima un
percorso in bici scarica 23–26 km da Overpass: può superare i 5 minuti che
l'app aspetta (`MAX_WAIT_MS`). Gli eventi delle ricerche (`insights`) non
scrivono l'attività: un percorso in bici vi sembra una corsa (da decidere
se serve). Le due «Domande aperte» restano dell'utente.

## Note per il deploy

La PR #214 cambia `route_engine`, quindi cambia l'impronta del motore
(`engine_fingerprint`) degli esempi delle città tenuti sull'API
(ADR-0136): su un server con questo codice **ogni esempio tenuto si
ridisegna alla sua prima richiesta**. Il server ha appena finito
`draw_examples` col motore di adesso. Quindi, finché l'utente non vuole la
bici sul server, il prossimo aggiornamento del server (Strava e la foto del
profilo) si fa dal commit **`fdb34ea`**, non dalla punta di `main`.

La parte B cambia di nuovo `route_engine/models.py`, quindi l'impronta: lo
stesso vale dopo il suo merge. Portarla sul server (la prova nell'«Esito»)
vuol dire ridisegnare gli esempi (`draw_examples`, circa 30 minuti nel
container dell'API, TASK-168), e vuole l'ok dell'utente.
