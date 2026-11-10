# TASK-427 — L'archivio risponde da qualsiasi punto dell'anello

**Stato**: Todo — **proposta, aspetta il sì dell'utente** (scelta di
prodotto, §8). Nessun codice prima del sì.
**Fase**: 5 · **Branch**: `docs/TASK-427-loop-archive` (questa proposta);
le parti di codice avranno il loro (`feat/TASK-427-a-...`).
**ADR**: ADR-0355, riservato dal Coordinatore; si scrive in
`DECISIONS.md` solo dopo il sì, con le scelte che l'utente fa qui.

## Obiettivo

Far rispondere l'archivio dei percorsi (ADR-0256) a molte più richieste
**senza far partire il motore**: per una forma chiusa, un percorso già
disegnato serve chiunque stia a meno di ~150 m da **un punto qualsiasi del
suo anello**, non solo chi sta a 100 m dalla sua partenza. Secondo passo:
riempire l'archivio di notte con i core fermi del server.

## Perché

- Il server regge **circa 7–8 percorsi al minuto** (TASK-276 parte A, giro
  2b, 2026-11-10): circa 19 s di CPU per un 5 km, il collo di bottiglia è il
  thread principale col GIL. La parte B (2 processi caldi) porta a 10–11.
  Ogni percorso che non passa dal motore toglie quei 19 s.
- Calcolare in anticipo **ogni combinazione** non si può: la partenza è un
  punto qualsiasi della mappa. Ma un anello chiuso **non ha una partenza
  sua**: ogni suo punto può esserlo.
- Oggi l'archivio copre un cerchio di 100 m attorno alla partenza di chi
  l'ha chiesto (≈ 0,03 km²). Lo stesso cuore da 5 km, preso da ogni suo
  punto, copre **circa 5 km di strade** con una fascia di 150 m per lato
  (dell'ordine di 1–1,5 km² meno le sovrapposizioni): decine di volte di
  più, e proprio lungo le strade dove la gente corre.
- Dagli eventi di ottobre (ADR-0256): 2 404 percorsi su 3 006 ripetevano
  una richiesta già fatta **nella stessa cella di ~1 km**, stessa forma e
  distanza. Il raggio di 100 m ne prende solo una parte; quanto ne
  prenderebbe l'anello lo misura la parte 0, prima di costruire.

## Contesto da leggere

- `services/api/shaperoute_api/route_archive.py` — docstring del modulo,
  `nearby`, `_rows`, `reach`, `_kept`.
- `services/api/migrations/0026_drawn_routes.sql` — la tabella e gli indici.
- `services/api/shaperoute_api/jobs.py` — `submit` (righe «already drawn» e
  «queued») e la ricerca nell'archivio (riga «kept route reached along the
  roads»).
- `services/route-engine/route_engine/nearby_starts.py` —
  `NEARBY_MAX_M = 100`, `APPROACH_MAX_M = 150`, `with_approach`.
- ADR-0256 (e l'aggiunta A2), ADR-0086, ADR-0085, ADR-0071: si cercano con
  `grep -n "ADR-0256" docs/archive/DECISIONS-fino-al-2026-11.md`.
- `docs/tasks/TASK-276.md`, «Parte A, giro 2b»: i numeri di CPU.

## Cosa cambia rispetto a oggi

Oggi (`RouteArchive._rows`) una riga risponde se: stesso motore
(`engine_fingerprint`), stessa forma o parola, stile, distanza (gradini di
1 km), attività e penna alzata, meno di 30 giorni (`KEEP_S`), e la sua
**partenza** è entro 10 m (`EXACT_M`, risposta subito nel `POST`) o entro
100 m (`NEARBY_M`, raggiunta lungo le strade da `reach`, nel thread del
job). ADR-0256 aveva scartato un raggio più grande perché «l'avvicinamento
supererebbe i 150 m e il percorso non sarebbe più "da qui"».

Qui il raggio **non cresce**: l'utente resta a meno di 150 m dalla linea,
come oggi dalla partenza. Cambia solo **dove** sull'anello il percorso
comincia: dal punto più vicino a lui, non dalla partenza di chi l'aveva
chiesto. L'avvicinamento resta entro `APPROACH_MAX_M`, e il percorso è
ancora «da qui».

## 1. Quali richieste valgono

Tutte e sole queste:

- una richiesta che l'archivio già tiene (`_kept`: non un'immagine, non
  una forma spostata a mano, non ancorata), **non sull'acqua**;
- una **forma** del catalogo (`shape`), **non una parola** (`word`) e
  **non a penna alzata** (`pen_up = false`): parole e disegni a pezzi hanno
  un inizio e una fine, ruotarli cambia il disegno;
- una riga con lo **stesso motore, stessa forma, stile, distanza,
  attività**, meno di 30 giorni: la chiave di oggi, senza la partenza;
- una riga **chiusa**: il primo nodo del percorso è anche l'ultimo
  (`nodes_along(...)[0] == [-1]`, come `reach` controlla già; in SQL un
  primo filtro con `ST_IsClosed(route)` o primo e ultimo punto entro
  `EXACT_M`);
- una riga **buona**: somiglianza ≥ 0,90, la soglia del ridisegno di A2.
  Sotto, il motore fa meglio da qui;
- nella prima versione, una riga **senza tratti a piedi** (`walks` vuoto):
  spostarne gli indici lungo un anello ruotato si fa dopo, se la misura dice
  che servono (righe di bici con spinta a mano, poche).

Il percorso di oggi entro 10 m resta com'è: la risposta subito nel `POST`
non cambia.

## 2. Come si trovano le righe

PostGIS c'è (la tabella usa già `geography`).

- **Migrazione nuova** (`0NNN_drawn_routes_loop_idx.sql`): un indice GiST
  sulla linea come `geography`,
  `CREATE INDEX drawn_routes_route_geog_idx ON drawn_routes USING gist ((route::geography));`.
  Facoltativo, se il piano di PostgreSQL lo vuole: un indice parziale sulle
  sole righe chiuse e di forma (`WHERE word IS NULL AND NOT pen_up`). Un
  indice si costruisce in pochi secondi su 50 000 righe;
  `CREATE INDEX CONCURRENTLY` non blocca le scritture.
- **La domanda** (al posto di `_rows(request, NEARBY_M)` in `nearby`): la
  chiave di oggi senza la partenza, più
  `ST_DWithin(route::geography, :punto, APPROACH_M)`, e per ogni riga la
  distanza dalla linea (`ST_Distance`) e la frazione del punto più vicino
  (`ST_LineLocatePoint`), che serve solo a ordinare e al registro.
  La distanza in linea d'aria è sempre ≤ quella lungo le strade: il filtro
  non perde righe buone, quelle troppo lontane per strada le scarta `reach`
  sul grafo.
- **Quante**: al massimo 12 candidate dalla domanda (in una città con molte
  righe se ne trovano decine), poi sul grafo finché ne restano 1 + 3
  (`MAX_ALTERNATIVES`) raggiunte.
- **La zona**: `_bbox` della partenza e delle sole candidate, come oggi. Un
  anello da 5 km sta in ~2 km di lato: la zona caricata è quella che il
  motore avrebbe caricato comunque.

Una riga trovata entro 100 m dalla sua partenza è un caso particolare: il
punto più vicino è la partenza stessa, e il risultato è quello di oggi.

## 3. Come si ruota l'anello

Sul grafo della zona, nel thread del job, senza il motore:

1. `nodes = nodes_along(graph, result.points)`; anello chiuso,
   `nodes[0] == nodes[-1]`.
2. Il nodo dell'utente `home` (`nearest_nodes`, entro `NEARBY_M` come oggi).
3. Le distanze da `home` lungo le strade, **con i sensi unici** quando
   valgono (`one_way_streets`, `step_cost`): un Dijkstra da `home` con
   `cutoff = APPROACH_M`. Fra i nodi dell'anello raggiunti si prende quello
   più vicino (`k`); a pari distanza il primo lungo l'anello. Nessuno
   raggiunto: la riga non vale.
4. **L'anello ruotato**: `nodes[k:] + nodes[1:k + 1]`. **Lo stesso verso**
   di percorrenza del disegno originale: invertirlo cambierebbe i sensi
   unici in bici e il disegno che l'app anima.
5. I punti si rifanno dai nodi (`_line`, con la geometria degli archi), poi
   **avvicinamento e ritorno** come fa già `reach` (andata lungo il
   cammino più corto, ritorno uguale o col suo cammino se ci sono sensi
   unici), quindi `distance_m`, `on_foot`.
6. **Le indicazioni si ricalcolano** sull'intera linea: `guidance(graph,
   all_nodes)` e `with_alongs`, esattamente come `reach` oggi. Non si
   tengono nella riga (ADR-0256, punto 4), quindi non c'è niente da
   ruotare.
7. **La somiglianza**: un anello chiuso ruotato è lo stesso disegno. Un
   test controlla che `metrics` dia la stessa somiglianza (±0,01) sui punti
   ruotati; se dipendesse dall'inizio, si ricalcola sui punti ruotati (costa
   millisecondi) e si usa quella.

In pratica `reach` prende un argomento in più (il nodo da cui ripartire) o
si affianca una `reach_loop`; il resto è il suo codice.

## 4. Come si sceglie fra più righe

1. **Le più corse e le più tenute fra i preferiti** (`runs + favorites`),
   come oggi: è la stessa scelta di ADR-0256 punto 3.
2. Poi la **più somigliante**.
3. Poi l'**avvicinamento più corto lungo le strade** (non la distanza in
   linea d'aria): conta di più che oggi, perché arriva fino a 150 m per
   lato e allunga la corsa (300 m su 5 km sono il 6%).
4. A parità, l'`id` più basso, perché l'ordine sia deterministico.

Le alternative A · B · C sono **anelli diversi** (`line_key` diversa):
due righe con la stessa linea non sono due proposte.

## 5. Privacy

- Le righe di `drawn_routes` **non tengono chi le ha chieste** (ADR-0256
  punto 1, nessun `user_id`), e questa proposta non aggiunge colonne di
  persona. Il registro delle richieste (ADR-0085) resta spento per
  default, e niente qui lo legge.
- **Più protetto di oggi** su un punto: la colonna `start` è spesso dove
  abita chi ha chiesto il percorso (ADR-0086, «Conseguenza»). Oggi chi
  riceve una riga dai 100 m attorno ha un percorso che **comincia lì**;
  con l'anello ruotato, chi lo riceve da un altro punto non sa dove
  cominciava. La linea passa comunque davanti a quella casa, come già
  accettato da ADR-0086 («al massimo davanti alla casa di un altro»).
- ADR-0086 lasciava aperto «se un percorso consigliato si mostra partendo
  da un punto del giro invece che dalla partenza vera»: questa proposta lo
  fa, per i percorsi dell'archivio. Va bene col testo della privacy di
  oggi? Si controlla con la parte A (`docs/` della privacy, nessun testo
  nuovo previsto); se servisse cambiarlo, è una domanda all'utente a parte.
- Il riempimento di notte (§6) sceglie i luoghi da **conteggi per cella di
  ~1 km** delle partenze già in `drawn_routes`, calcolati e buttati nella
  stessa esecuzione, mai scritti; le sue righe hanno come `start` un nodo
  di strada scelto dal programma, non la posizione di qualcuno.

## 6. Secondo passo: riempire l'archivio di notte

Un comando nuovo, `python -m shaperoute_api.fill_archive` (modulo nuovo),
lanciato di notte sul server. Il precedente è `draw_examples` (TASK-316),
che disegna gli esempi di «Explore» in circa 35 minuti: stesso modo di
lanciarlo dentro il container dell'API, e mai insieme a lui
(`docs/DEPLOY.md`). Come si pianifica (un servizio di `compose.yaml` col
suo ciclo, come `backup`, o il cron dell'host con `docker compose exec`)
si decide nella parte B.

**Cosa disegna**, in quest'ordine, finché ha budget:

1. la **forma del concorso** (TASK-299, si apre il 2026-11-16) alle
   distanze più chieste, nelle città dove ci sono utenti, **prima del
   2026-11-16** se codice e server sono pronti in tempo (è stretto: vedi
   «Rischi»);
2. le **combinazioni più chieste negli ultimi 30 giorni** (forma ×
   distanza × attività, contate sulle righe di `drawn_routes` per le
   colonne della richiesta, senza chi);
3. **dove**: le celle di ~1 km con almeno 3 richieste in 30 giorni e i
   centri delle città già noti (`learn`); dentro una cella, una partenza su
   un nodo di strada **non ancora coperto** da un anello della stessa
   chiave (`ST_DWithin` dalla §2), così gli anelli si spargono invece di
   sovrapporsi.

**Limiti**:

- **CPU**: dalle 02:00 alle 06:00 (ora di Roma), `nice 19`, **un percorso
  alla volta** (un percorso solo usa ~2,2 core, TASK-276: ne resta più di
  uno per le richieste vere). Si ferma da solo appena l'API ha un job in
  coda o in corso, e riprende quando è libera; come lo sa (un contatore
  locale dell'API o il carico) si decide nella parte B.
- **Budget**: al massimo **1 000 percorsi a notte** (~19 000 s di CPU, ~5
  ore di core: entra nelle 4 ore su 1,5 core).
- **Spazio**: `MAX_ROUTES = 50 000` resta il tetto della tabella. Le righe
  di notte sono **al massimo 10 000** (il 20%), segnate da una colonna
  nuova (`filled boolean NOT NULL DEFAULT false`, nella migrazione della
  parte B), e quando la tabella è piena vanno via **prima** le righe di
  notte mai corse né tenute, poi le altre come oggi. Una riga di notte che
  qualcuno corre o mette fra i preferiti diventa come le altre.
- **Il motore cambia**: ogni nuova impronta del motore rende vecchie tutte
  le righe, anche quelle di notte. Il riempimento riparte dalle più
  chieste; non conviene se il motore cambia più spesso di una notte su due
  (da guardare nella misura della parte C).
- Ogni aggiornamento del server è **col sì dell'utente**, dal Coordinatore.

## 7. Come si misura

Le righe di log di oggi in `jobs.py`:

- `job …: <forma> <m> m already drawn` — risposta subito (riga entro 10 m
  o file di una città);
- `job …: <forma> <m> m queued` — ogni job che non ha risposto subito;
- `job …: kept route reached along the roads` — risposta dall'archivio nel
  thread del job, senza motore.

**Tasso di risposta senza motore** = (already drawn + kept route reached) /
(already drawn + queued), al giorno, da `journalctl` sul server.

- **Parte 0, prima di costruire** (nessun cambiamento alle risposte
  dell'API, solo un comando in sola lettura, `archive_loop_hit_rate`):
  sulle righe degli ultimi 30 giorni
  di `drawn_routes`, per ogni riga di forma chiusa si chiede se una riga
  **precedente** della stessa chiave (meno di 30 giorni prima) l'avrebbe
  servita **entro 100 m dalla partenza** (oggi) o **entro 150 m dall'anello**
  (proposta), in linea d'aria. Dà il guadagno atteso, il numero da mostrare
  all'utente prima del codice. Gira sul server in sola lettura, col sì
  dell'utente, o su una copia.
- Dopo la parte A, una riga nuova distinguibile in `route_archive.py`:
  `kept loop joined %.0f m from the line, %.0f%% along` (il caso di prima,
  entro 100 m dalla partenza, resta `kept route reached from %.0f m away`).
  Si confrontano 7 giorni prima e 7 giorni dopo.
- Dopo la parte B: quante righe di notte vengono usate (`runs`, e le righe
  «joined» su righe `filled`), per decidere se il budget vale.

## 8. Scelta di prodotto per l'utente

**Il disegno non è più costruito attorno a dove sta l'utente.** Oggi il
motore sceglie rotazione, fase e lato della forma **per quella partenza**
(`Placement`): il cuore viene dove sta meglio rispetto a lui. Con l'anello
dell'archivio:

- il percorso comincia nel **punto dell'anello più vicino** a lui (per
  esempio sulla punta del cuore invece che dove il motore l'avrebbe fatto
  cominciare), e la forma sta **dove l'aveva messa chi l'ha chiesta prima**
  (magari tutta da un lato rispetto a lui);
- chi abita nella stessa zona riceve **spesso lo stesso disegno** (con le
  alternative degli altri anelli vicini), dove oggi ognuno ne ha uno suo;
- in cambio la risposta arriva in **0,3–2 s** (la zona da caricare) invece
  di 5–15 s, e il server regge molte più persone.

Proposta dell'agente: **sì, sempre**, per le forme chiuse con somiglianza
≥ 0,90, come risposta principale. Se serve un modo per chiedere comunque
un disegno fatto da qui (che fa partire il motore), come si presenta
nell'app è una domanda a parte, con la parte A.
Varianti se l'utente preferisce:

- **solo quando il server è carico** (coda di job > 0): niente cambia nei
  momenti tranquilli, il guadagno arriva solo nei picchi;
- **l'anello come alternativa** accanto al percorso del motore: nessun
  guadagno di CPU, solo una proposta in più.

## Parti

- **0 — Misura** (script in sola lettura): il guadagno atteso (§7). Se è
  piccolo, ci si ferma qui.
- **A — L'anello nell'API**: migrazione dell'indice, domanda nuova in
  `nearby`, rotazione, ordine, riga di log, test. Poi aggiornamento del
  server col sì dell'utente.
- **B — Il riempimento di notte**: `fill_archive.py`, colonna `filled`,
  pulizia, pianificazione notturna, limiti. Server col sì dell'utente.
- **C — Misura dopo**: 7 + 7 giorni di log, righe di notte usate.

## Criteri di accettazione

Per la proposta (questo branch):

- [ ] Il task file è in `main` con una PR `docs/`.
- [ ] L'utente ha risposto al §8 (sì, variante, o no).

Per le parti, dopo il sì:

- [ ] Parte 0: per gli ultimi 30 giorni, il tasso con 100 m dalla partenza
      e quello con 150 m dall'anello, scritti in `out/TASK-427/` e in
      questo file.
- [ ] Parte A: una richiesta di forma chiusa a ≤ 150 m da un punto
      qualsiasi di una riga buona riceve quel percorso, che **comincia e
      finisce** al nodo dell'utente, passa dal nodo più vicino dell'anello,
      ha lo stesso verso e indicazioni rifatte; il motore non parte (test
      deterministico su un grafo piccolo).
- [ ] Parte A: parole, penna alzata, acqua, righe aperte, righe sotto 0,90
      e righe con `walks` non rispondono mai così (un test per caso).
- [ ] Parte A: con più candidate, l'ordine è quello del §4 e le
      alternative hanno `line_key` diverse (test).
- [ ] Parte A: con i sensi unici, l'avvicinamento e il ritorno li
      rispettano (test).
- [ ] Parte A: i percorsi del motore non cambiano (`test_same_routes`
      verde senza toccare `SAME_ROUTES_AS`: qui non si tocca il motore).
- [ ] Parte B: mai più di 1 000 percorsi per notte, mai più di 10 000 righe
      `filled`, si ferma quando l'API ha un job, e la pulizia toglie prima
      le righe di notte mai usate (test con orologio e database finti).

## File toccati

Questa proposta:

```
docs/tasks/TASK-427.md                                    (nuovo)
```

Previsti per le parti (si confermano con il Coordinatore prima di
cominciare, perché `route_archive.py` e `jobs.py` possono essere di altri
task in quel momento, per esempio TASK-276 B):

```
services/api/shaperoute_api/archive_loop_hit_rate.py      (nuovo, parte 0)
services/api/migrations/0NNN_drawn_routes_loop_idx.sql    (nuovo, parte A)
services/api/shaperoute_api/route_archive.py              (parte A e B)
services/api/tests/test_route_archive_loop.py             (nuovo, parte A)
services/api/migrations/0NNN_drawn_routes_filled.sql      (nuovo, parte B)
services/api/shaperoute_api/fill_archive.py               (nuovo, parte B)
services/api/tests/test_fill_archive.py                   (nuovo, parte B)
deploy/compose.yaml (solo se la notte diventa un servizio) (parte B)
```

`jobs.py` non dovrebbe servire: la ricerca resta dentro
`RouteArchive.nearby`, che il job chiama già.

## Rischi

- **Il concorso del 2026-11-16**: riempire con l'animale prima dell'apertura
  vuole la parte A e la parte B scritte, mergiate e sul server in 5 giorni,
  con TASK-276 B che tocca lo stesso server. Probabilmente non ci sta; il
  riempimento serve comunque nei giorni del concorso.
- **TASK-276 B** cambia come girano i job (processi al posto dei thread):
  `nearby` deve girare anche nei processi caldi. Da coordinare: la parte A
  parte dopo il merge di TASK-276 B, o tocca solo `route_archive.py`.
- **Zone grandi**: dodici candidate sparse possono chiedere una zona più
  grande del solito; se succede, si prendono solo le candidate entro un
  riquadro di ~3 km attorno alla partenza.

## Esito

—
