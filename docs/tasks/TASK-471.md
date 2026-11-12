# TASK-471 — Overpass in errore: rispondere prima

**Stato**: Done — 2026-11-12. Esito: con Overpass in errore l'app lo sa
dopo secondi invece che dopo più di due minuti: un download fallito per
job (#1251), 5 secondi invece dei 60 di osmnx quando lo stato non si
legge e l'errore in una riga (#1269), la frase nuova dell'app (#1259);
il secondo servizio Overpass è nel codice, **spento**, per strade, acqua
e neve (#1269), e la privacy lo nomina già (#1263). Sul server dal passo
12 (2026-11-12, ~16:56Z, `eee85a69`); app con l'OTA 14. Decisione:
ADR-0385 (#1286, entrata con la #1289).

**Resta** (fuori dalla chiusura, ognuno col sì dell'utente):
- **Accensione del secondo servizio**: aspetta la copia del sito con la
  privacy nuova. Poi, in `/root/shaperoute/deploy/.env`, la riga
  `SHAPEROUTE_OVERPASS_FALLBACK_URL=https://overpass.private.coffee/api`
  e il contenitore dell'API ricreato; lettura di controllo in «Accendere
  il secondo servizio».
- **Letture dopo il passo 12** (`out/coordinatore/passo12/remote.out` e
  `check-471.out`): server a `eee85a69`, `fallback_url()` = `None`,
  health 200, nessun Traceback; `check_once.py` nel contenitore dà
  «downloads tried: 1 (expected 1)». Dopo le 16:56Z ci sono 8 righe
  `times total`, tutte di richieste di prova delle ciaspole finite «no
  open snow» (`loads=0`): passano dal processo di calcolo, quindi il
  messaggio nuovo fra thread e processo arriva e torna. **Non ancora
  visto**: un job su strada `done` dopo il passo, con i campi del piano;
  lo aggiunge il Coordinatore quando ne vede uno.
- Da riprendere solo se i log lo chiedono: le scelte (e) e (d) qui sotto.
**Fase**: 5 · **Branch**: `fix/TASK-471-map-unavailable-once` (#1251),
`fix/TASK-471-b-overpass-pause` (parte B) ·
**ADR**: ADR-0385 (la voce va nella PR di documenti dopo il merge)

## Obiettivo

Quando Overpass (da cui il server scarica le strade di una zona non ancora
in cache) non risponde, l'app deve saperlo prima: oggi una richiesta resta
in attesa più di due minuti prima di `map_data_unavailable`.

## Il fatto misurato

Server di produzione, 2026-11-12, 12:51Z (dopo il passo 10), uscita in
`out/coordinatore/prova-passo10.out`:

| job | esito | total | loads | download | crop |
|---|---|---|---|---|---|
| `29f2df3a508c` (prova: cuore 3 km in carrozzina a Trento) | `map_data_unavailable` | 140,21 s | 2 | 135,63 s | 0,00 |
| `5f3e9c2fd798` (un utente vero) | `map_data_unavailable` | 162,56 s | 2 | 158,48 s | 0,00 |
| `0a5e6bc6000c` (la stessa prova, rifatta) | done, `far=yes` | 123,59 s | 2 | 114,91 s | 0,32 |

Overpass rispondeva `502 Bad Gateway` («at capacity»).

## La causa (parte 0, letta nel codice)

### Quanto costa un download che fallisce

`osmnx` 2.1.1, `_overpass.py`: prima di ogni richiesta legge
`/api/status`; se la pagina non è quella attesa (con Overpass pieno è la
stessa pagina 502, la cui quinta riga è vuota) aspetta la pausa fissa
`default_pause=60` secondi, poi fa la richiesta, che fallisce. Quindi **un
download fallito costa 60 s di pausa più la richiesta**: 68 s e 79 s di
media nei due job falliti. La pausa non è un'impostazione: è un argomento
con default di una funzione privata, chiamata senza argomenti. Altri
tempi di osmnx: `requests_timeout` 180 s sia per lo stato sia per la
richiesta (è anche dentro la query: cambiarlo cambia la chiave della
cache HTTP, `docs/MAPS.md`); su 429 e 504 dorme 55 s e riprova senza
limite. Il tetto di un job nel processo di calcolo è `MAX_JOB_S` = 600 s
(`route_processes.py`).

### Da dove vengono i due caricamenti

Un job su strada carica grafi in due posti (`loads` li somma):

1. **nel thread del job**, `jobs.RouteJobs._nearby` →
   `route_archive.RouteArchive.nearby`: carica una zona solo se l'archivio
   ha un percorso tenuto lì vicino (`source.load(_bbox(...))`) oppure uno
   di un motore precedente da ridisegnare (`_draw_again` → `plan_nearby`).
   Se il download fallisce, `_nearby` ingoia `MapDataUnavailableError`,
   senza una riga di log, e restituisce `None`;
2. **nel processo di calcolo** (`route_processes._plan` → `plan_request` →
   motore): `plan_nearby` carica la zona attorno alla partenza
   (`zone_area`, scarto 300 m) e, se lì la forma non si disegna, `plan_shape`
   carica **una seconda zona più larga** per la ricerca lontana (ADR-0040:
   `zone_area` con `FAR_OFFSET_M` = 2000). È un quadrato attorno alla
   stessa partenza che contiene il primo, quindi nessuna zona scaricata
   per il primo lo copre: è un secondo download. Il motore non riprova
   mai un download fallito: al primo errore il piano finisce.

**Il job della prova (`29f2df3a508c`) non ha scaricato la stessa zona due
volte.** In archivio non c'era nessun percorso in carrozzina, quindi il
punto 1 non ha caricato nulla. I due caricamenti sono quelli del punto 2:
la zona vicina **scaricata bene**, poi la zona larga **fallita**. La prova:
il job rifatto (`0a5e6bc6000c`, `far=yes`) ha due caricamenti di cui uno
solo è un download (`crop=0.32`: la zona vicina c'era già), e dopo di esso
la cache ha 4 file `wheel_*`, cioè due zone (GraphML e pickle ciascuna):
la zona vicina l'aveva lasciata il job fallito. Per questo job la
correzione qui sotto non cambia nulla: i suoi 135 s sono due download,
ciascuno con la pausa di 60 s.

**Il job dell'utente (`5f3e9c2fd798`) è lo stesso caso.** Dal log del
server, letto dal Coordinatore (12:51–12:57Z):

- `job 5f3e9c2fd798: circle 5000 m queued` → `graph from network
  (foot_46.11490_11.07450_46.16450_11.14600.graphml), cropped in 98.1 s`
  → `map_data_unavailable after 162.6 s`;
- `job 29f2df3a508c: heart 3000 m queued` → `graph from network
  (wheel_46.04880_11.09500_46.08540_11.14780.graphml), cropped in 75.0 s`
  → `map_data_unavailable after 140.2 s`;
- `job 0a5e6bc6000c` → `graph from disk (wheel_46.04880…), cropped in
  0.3 s` → `graph from network
  (wheel_46.03530_11.07560_46.09890_11.16720.graphml), cropped in 114.9 s`
  → `3185 m on roads, similarity 0.77`.

In tutti e due i job falliti la zona vicina è stata scaricata (98 s e
75 s) e la zona larga è fallita dopo altri 60–64 s: la pausa di osmnx e
il 502. Il lavoro del primo download è andato perso per l'utente (la
zona resta in cache per chi chiede dopo).

### Il doppio tentativo dell'ipotesi esiste, ma è un altro caso

Quando l'archivio ha percorsi vicini e la loro zona non è (più) in cache,
il punto 1 prova a scaricare, fallisce in silenzio, e il motore prova di
nuovo a scaricare la propria zona: due download falliti, 140–160 s, per
dire quello che si sapeva dopo il primo. Nessuno dei job misurati è
questo caso. Capita fuori dalle città del
preset (lì ogni partenza ha la sua zona) quando i percorsi vicini vengono
da partenze diverse, e dopo ogni cambio di motore (`_draw_again`) se la
zona della riga vecchia non c'è più.

## Cosa si fa

### Correzione (questa PR)

Un job che ha già visto fallire un download **non chiede più nulla a
Overpass**: il caricamento successivo che avrebbe bisogno di un download
fallisce subito con lo stesso `MapDataUnavailableError`; i caricamenti
dalla cache continuano (un job che si può ancora disegnare con le zone
che ci sono si disegna). Lo stato viaggia dal thread del job al processo
di calcolo insieme alla richiesta.

- `jobs._Reporting` ricorda l'errore del download fallito e lo rialza al
  prossimo caricamento che `needs_download`.
- `route_processes`: `RouteProcesses.__call__` lo passa al processo, che
  crea il suo `_Reporting` già avvisato.
- Niente nel motore, niente in `route_store.py`: le impronte non cambiano.

**Tempo d'attesa dopo la correzione**: al massimo **un** download fallito
per job. Con Overpass a 502 e lo stato illeggibile: circa 70–80 s (60 s di
pausa di osmnx più la richiesta) invece di 140–160 s nel caso del doppio
tentativo. Non cambia il caso della prova (un download riuscito, poi uno
fallito: resta attorno ai 135 s) né la pausa di 60 s: quelli sono le
scelte qui sotto. Il tetto assoluto resta `MAX_JOB_S` = 600 s.

### Quanto dura un download riuscito

Da tenere presente per ogni taglio dei tempi: un download **riuscito** è
già lungo. Sul server con Overpass pieno 75 s, 98 s e 115 s (dentro,
quasi certamente, i 60 s di pausa). Sul Mac, sette zone di centro città
da 5 km scaricate dall'API di sviluppo (`out/TASK-454/api-8054.log`,
`out/TASK-462/api-8062.log`): da 97 s a 197 s, mediana 117 s, compresa
la costruzione del grafo. Un limite di tempo sul download sotto i tre
minuti taglierebbe download che riescono; la sola parte che è attesa
pura sono i 60 s di pausa quando lo stato non si legge.

### Scelte dell'utente (una per volta, non decise qui)

- **(e) Zona vicina scaricata, zona larga no: rispondere con quello che
  c'è** (chiesta dal Coordinatore; è il caso dei due job misurati). Oggi
  il job butta via tutto. Letto nel motore (`optimizer.plan_shape`): la
  ricerca lontana parte quando vicino alla partenza non c'è un percorso
  disegnabile **dritto** (`upright_best`); può però essercene uno
  disegnabile **inclinato** (`found.best`), che oggi verrebbe restituito
  se la ricerca lontana non trovasse di meglio. Quindi: se il download
  della zona larga fallisce e vicino c'è un percorso disegnabile, si
  risponde con quello; se vicino non c'è nulla di disegnabile resta
  `map_data_unavailable` (dire «questa forma qui non si disegna» sarebbe
  falso: più lontano forse sì). Sta nel motore: una decina di righe in
  `plan_shape` attorno al secondo `source.load`, più un errore del motore
  che `MapDataUnavailableError` estende (`graphs.py`). Quando i download
  riescono i percorsi sono identici per costruzione, ma l'impronta del
  codice cambia: PR separata, prova dei percorsi identici, la unisce
  l'utente. Non misurato: in quale parte dei casi con ricerca lontana il
  percorso vicino inclinato è disegnabile (serve un giro del banco, col
  turno del Mac). Quanto è raro: su 93 job del server salvati prima del
  12 novembre (`out/TASK-435/server-times.txt`, `out/TASK-436/`,
  `out/TASK-464/`) la ricerca lontana c'è in 3 e un download in 2, mai
  insieme; il 12 novembre due volte su due. Proposta fatta all'utente:
  lasciarla per dopo, e riprenderla se nei log il caso torna (con i 5
  secondi l'errore arriva molto prima, e chi riprova trova la zona
  vicina in cache). **Risposta dell'utente, 2026-11-12: «ok procedi»**:
  non si fa adesso.
- **(a) La pausa di osmnx quando lo stato di Overpass non si legge**: 60 s
  fissi prima di ogni download, anche del primo e anche di quelli che
  poi riescono. È la parte più grossa dell'attesa in tutti e tre i job.
  **Scelta dell'utente, 2026-11-12: «Sì, 5 secondi»** (ADR-0385). È la
  parte B qui sotto.
- **(d) Un download solo invece di due** (nato dalla parte 0): quando la
  zona va scaricata, la ricerca lontana ne chiede una seconda più larga
  che contiene la prima. Scaricare subito quella larga dimezza i
  download della prima richiesta in una zona nuova, al prezzo di una
  richiesta più grossa (più lenta, e più facile da rifiutare quando
  Overpass è pieno).
  **Scelta dell'utente, 2026-11-12: «Sì, com'è»**: non si fa. Il
  quadrato largo è circa tre volte l'area (15–40 s di download vero il
  vicino, circa 55 s il largo, il 12 novembre): rallenterebbe ogni prima
  richiesta in una zona nuova per accelerare quella con la ricerca
  lontana (3 job su 93). Da riprendere solo se i log mostrano molti
  download vicini fra loro: una zona larga servirebbe anche le partenze
  fino a circa 1,7 km.
- **(b) Un secondo servizio Overpass** quando il principale è giù (per il
  lavoro a lotti del 12 novembre l'utente ha scelto di aspettare il
  principale: per la produzione va richiesto).
  **Scelta dell'utente, 2026-11-12: «Sì, un tentativo»** (ADR-0385), alla
  domanda «Overpass principale in errore: provo una volta un secondo
  servizio pubblico?». Quando `overpass-api.de` risponde con un errore
  HTTP o non si raggiunge (non quando è lento: dopo un timeout no) il
  server fa un solo tentativo su un secondo servizio; se fallisce anche
  quello l'errore è quello di oggi. Il lavoro a lotti aspetta il
  principale, come deciso.
  **Nel codice è spento**: si accende sul server con
  `SHAPEROUTE_OVERPASS_FALLBACK_URL=https://overpass.private.coffee/api`
  in `deploy/.env`, in un passo del Coordinatore col sì dell'utente, e
  **solo dopo la frase della privacy** qui sotto: è un altro gestore che
  vede le aree chieste (mai chi le chiede).
  Condizioni d'uso di `overpass.private.coffee`, lette sulla sua pagina
  il 12 novembre: «Use our endpoints in any project requiring access to
  OpenStreetMap data, including commercial use»; nessuna registrazione,
  «free and unlimited access … without any rate limits»; chiede uno
  User-Agent che dica progetto e contatto (il server si presenta come
  `MuW/1.0 (https://getmuw.app)`), richieste POST (osmnx le fa così),
  un avviso prima di usi grandi (più di dieci richieste al secondo o
  insieme: noi una per volta, poche al giorno), l'attribuzione a
  OpenStreetMap (già nell'app), niente dati personali nelle richieste
  (mandiamo solo il riquadro); tiene nei log indirizzi IP troncati per
  al massimo 48 ore. Il nostro uso ci sta. Agli usi commerciali chiede
  di considerare una donazione.
  Dalla pagina dei servizi pubblici
  (wiki.openstreetmap.org/wiki/Overpass_API): i servizi gratuiti sono
  per progetti piccoli e il principale chiede che l'uso commerciale
  passi a un servizio a pagamento o proprio. **Passo futuro, non di
  questo task**: con la società, o se i download crescono, un servizio
  a pagamento con chiave oppure le zone costruite dagli estratti, come
  le città del preset.
  **Frase della privacy, proposta (serve il sì dell'utente; app e sito,
  cinque lingue, PR a parte)**. Oggi (`about/content/en.ts`, «Others who
  receive data»): «The Overpass service of OpenStreetMap data is asked by
  our server for the map of an area it does not have yet: it sees which
  area, not who asked.» Proposta: «The Overpass services of
  OpenStreetMap data (overpass-api.de and, when it does not answer,
  overpass.private.coffee) are asked by our server for the map of an
  area it does not have yet: they see which area, not who asked.» In
  italiano: «I servizi Overpass dei dati di OpenStreetMap
  (overpass-api.de e, quando non risponde, overpass.private.coffee)
  ricevono dal nostro server la richiesta della mappa di una zona che
  non ha ancora: vedono quale zona, non chi l'ha chiesta.»
  **Risposta dell'utente, 2026-11-12: «Sì, va bene»**, alla domanda
  «Privacy: nomino anche overpass.private.coffee nella frase su
  Overpass, come proposto?». Parte D, PR a parte col turno del
  Coordinatore: `apps/mobile/src/about/content/{en,it,de,es,fr}.ts` e
  `site/privacy/**` rigenerate con `site/tools/make_privacy.mjs`.
  L'ordine: la frase esce (app e sito), poi il passo sul server che
  accende la variabile, ognuno col sì dell'utente.
- **(c) Cosa dice l'app.** Oggi: «Map data for this area could not be
  downloaded. Try again later.» con «Retry» (`route/problems.ts`); il
  `message` dell'API porta dentro tutta la pagina d'errore di Overpass.
  **Scelta dell'utente, 2026-11-12: «Sì, cambiala»**. Testo nuovo: «The
  map service is busy, so this area could not be loaded. Try again in a
  few minutes.»; in italiano «Il servizio delle mappe è occupato e
  questa zona non si è potuta caricare. Riprova tra qualche minuto.»
  Dice che è temporaneo e che non dipende da chi usa l'app; «Retry»
  resta. Parte C, PR dell'app a parte (`route/problems.ts`, le quattro
  lingue, i test che citano la frase, `docs/UI.md`); esce con
  l'aggiornamento completo. Il `message` dell'API si accorcia alla
  prima riga nella PR della parte B.

### Parte B: cinque secondi invece di sessanta, e il secondo servizio (una PR)

Scelta (a). Per la durata di un download chiesto dall'app
(`graphs.ZoneGraphs._download`) la pausa di osmnx quando lo stato di
Overpass non dice nulla di utile è di 5 s (`overpass_pause.py`, modulo
nuovo: cambia l'argomento `default_pause` della funzione privata di
osmnx e lo rimette com'era). Non cambiano: l'attesa che Overpass chiede
da sé («Slot available after…»), il download (nessun limite di tempo),
il lavoro a lotti (`prefetch_zones` usa la sorgente del motore da sola:
resta a 60 s). Se osmnx non ha più quella funzione il download va come
oggi, con una sola riga di avviso nel log; sul telefono, dove osmnx non
c'è, il blocco non fa nulla. Ognuna di queste cose ha il suo test, senza
rete.

Attesa dopo la parte B, con Overpass a 502: un download fallito circa
10–20 s invece di 70–80 s; il caso misurato il 12 novembre (zona vicina
scaricata, zona larga fallita) circa 60 s in meno per ciascuno dei due
download.

Nella stessa PR la scelta (b): `overpass_fallback.py` (modulo nuovo),
chiamato nello stesso punto. Spento se la variabile non c'è; acceso,
un solo tentativo in più e solo dopo un errore HTTP o di connessione;
per quel tentativo cambia l'indirizzo e lo User-Agent di osmnx e li
rimette com'erano; `prefetch_zones` non lo usa mai. Test senza rete per
ognuna di queste cose.

File della parte B (ramo `fix/TASK-471-b-overpass-pause`, dopo la prima
PR in `main`): `services/api/shaperoute_api/overpass_pause.py`,
`overpass_fallback.py` e i loro test `test_overpass_pause.py`,
`test_overpass_fallback.py` (nuovi), `services/api/shaperoute_api/graphs.py`,
`paddling.py`, `snowshoeing.py`, `services/api/tests/test_graphs.py`,
`.env.example` (una voce),
`apps/mobile/assets/engine/engine.zip` (rifatto: anche `graphs.py` va
sul telefono).

Dopo il passo sul server, sola lettura: nel log nessuna riga
`osmnx has no _get_overpass_pause` (c'è solo se l'immagine ha un osmnx
diverso dal 2.1.1 e la funzione è cambiata); quando Overpass è pieno,
fra `Overpass: … through …` e l'errore passano secondi, non più di un
minuto. Col secondo servizio acceso: la riga `Overpass answered with an
error (…): one attempt on overpass.private.coffee` conta le volte che è
servito; senza la variabile non compare mai.

Nella stessa PR il `message` dell'errore dice il perché in una riga
(`graphs._reason`): prima portava l'intera pagina 502 di Overpass nella
risposta all'app e nel log delle richieste.

**Acqua e neve** (canoa, nuoto, ciaspole) non passano da osmnx né da
`ZoneGraphs`: il motore fa una richiesta sola con `urllib`
(`paddling.ServerWater`, `snowshoeing.ServerSnow`). Non hanno la pausa di
60 s (il 12 novembre alle 15:08Z una richiesta di neve a Milano è fallita
in 0,26 s), quindi i 5 secondi non le riguardano. **Scelta dell'utente,
2026-11-12: «Sì, aggiungilo»**, alla domanda «Secondo servizio anche per
acqua e neve (canoa, nuoto, ciaspole): lo aggiungo?»: anche la loro
richiesta, a un errore HTTP o di connessione del principale, si prova
una volta sul secondo servizio, con la stessa variabile (spento senza).
Il conto degli edifici della neve (TASK-413 A3) non riprova: non fallisce
mai. La frase della privacy vale così com'è: dice «the map of an area»,
e acqua e neve sono dati di OpenStreetMap di quell'area. Impronte uguali
prima e dopo (`route_store` `e0834d054b6e` → `8ab61d8e87f9`, coi nuoti
`1063cc95fea3` → `b9d00c37d28d`, `paddle_examples` `4c549677eefb` →
`574fbfba41eb`): nessun file del motore è toccato.

### Accendere il secondo servizio (passo a parte, col sì dell'utente)

Solo **dopo** che la frase della privacy è uscita nell'app (OTA 14,
fatto) **e** sul sito (copia di `site/privacy`). Sul server, in
`/root/shaperoute/deploy/.env`, una riga:

```
SHAPEROUTE_OVERPASS_FALLBACK_URL=https://overpass.private.coffee/api
```

Senza barra finale, senza `/interpreter` (lo aggiunge osmnx). Poi il
contenitore dell'API va ricreato perché legga la variabile. Per
spegnerlo: togliere la riga o scrivere `off`, e ricreare.

Lettura di controllo, dentro il contenitore, senza rete:

```bash
ssh root@188.245.9.220 'cd /root/shaperoute/deploy && docker compose exec -T api python -c "from shaperoute_api.overpass_fallback import fallback_url; print(fallback_url())"'
```

Atteso `https://overpass.private.coffee/api`; prima dell'accensione
`None`. Nei giorni dopo, nel log: ogni riga
`Overpass answered with an error (…): one attempt on
overpass.private.coffee` è una volta in cui il principale ha detto no;
se dopo c'è `graph from network` il secondo servizio ha dato la zona, se
c'è `map_data_unavailable` no.

## File toccati

- `services/api/shaperoute_api/jobs.py`
- `services/api/shaperoute_api/route_processes.py`
- `services/api/tests/test_jobs_map_unavailable.py` (nuovo)
- `apps/mobile/assets/engine/engine.zip` (rifatto: `jobs.py` è fra i
  moduli che il motore sul telefono porta con sé; va rifatto per ultimo,
  dopo l'ultimo merge di `main`)
- `docs/tasks/TASK-471.md` (nuovo)

## Criteri di accettazione

- [x] Test deterministico, senza rete: la sorgente finta alza l'errore
      del download e il test conta i tentativi (uno, non due), con il
      planner nel thread e con lo stato passato al processo di calcolo
      (`test_jobs_map_unavailable.py`, 5 test).
- [x] Un job la cui zona è in cache si disegna anche dopo un download
      fallito dell'archivio.
- [x] `ruff`, `black` e i test dei file toccati verdi in locale
      (`test_jobs_map_unavailable`, `test_jobs`, `test_first_route`,
      `test_job_times`, `test_route_processes`: 57 passati).
- [x] CI verde (#1251, #1269, #1259, #1263 in `main`).
- [x] Nessun file del motore né `route_store.py` nel diff.

## Dopo il passo sul server (sola lettura)

Niente `fastapi.testclient` (l'immagine di produzione non ha `httpx`) e
nessuna richiesta a Overpass.

1. Il messaggio fra thread e processo di calcolo ha un campo in più: la
   prova di un percorso che il Coordinatore fa a ogni passo lo copre (un
   job `done` dice che i due lati si parlano). Dal log:
   `docker logs shaperoute-api-1 2>&1 | grep "times total" | tail -n 3`.
2. La regola, dentro il contenitore, senza rete: lo script
   `out/TASK-471/check_once.py` (sul Mac, fuori dal repository) passato
   su stdin a `docker compose exec -T api python -`. Atteso:
   `downloads tried: 1 (expected 1)`.
3. Nei giorni dopo, quando Overpass torna a fallire: le righe
   `map data unavailable a moment ago: not downloaded again` nel log
   contano i secondi download risparmiati (zero finché non capita il
   caso dell'archivio).
