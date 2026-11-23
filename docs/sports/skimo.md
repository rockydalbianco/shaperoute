# Ski touring (scialpinismo)

> TASK-415 parte 0 (2026-11-07), ADR-0344. Uno sport «Record only»: nessuna
> rete, nessuna forma, il Route Engine non cambia. Qui c'è il disegno
> tecnico delle quattro funzioni scelte dall'utente (a–d), con il costo di
> ciascuna. Le scelte di prodotto stanno in `tasks/TASK-415.md`.

## Cosa c'è già e si riusa

- **La giornata «Record only»** (TASK-375, ADR-0319): «Draw» apre la
  registrazione libera, la fine giornata ha le sue metriche, il post non ha
  le azioni da percorso. `isOnSnow` (`activities/snow.ts`) vale per ogni
  attività di `RECORD_ACTIVITIES`: Ski touring ha da subito la fine
  giornata e il post della neve, senza codice suo.
- **Le quote di ogni punto** (TASK-324): il telefono registra
  `altitudeM` (`useFreeRun.ts`, da `expo-location`; sull'iPhone la quota è
  già fusa col barometro) e la manda al server (`altitude_m`), che la tiene.
- **Salite e discese** (TASK-375 C1, `activities/snowDay.ts`): `legs()`
  divide la traccia da una svolta di quota all'altra (`TURN_M` = 10 m),
  `isLift()` riconosce un impianto (sale da più di un minuto, oltre 0,3 m/s,
  a velocità costante), `droppedM()` dà i metri scesi. Chi sale con le pelli
  fa 300–900 m/h, cioè 0,08–0,25 m/s: sotto la soglia dell'impianto. Una
  gita che prende una seggiovia la vede come impianto, non come salita.
- **D+ col rumore della quota** (`runMetrics.climbM`, `CLIMB_STEP_M` = 3 m).
- **Le tegole Terrarium** (AWS, gratuite, senza chiave): le usa già la
  mappa 3D (`map/mapKindStyle.ts`). ADR-0300, parte G di TASK-347, ha deciso
  quote e profilo **dal server**, da queste tegole, in cache sul Volume: non
  è ancora codice (`CONDIVISO.md`, «Le quote»).
- **Gli estratti OSM sul server** (TASK-375 D, `ski_extract.py`):
  `osmium tags-filter` una volta, poi file a tegole di 0,25° in
  `<cache_dir>/ski/`; nessuna rete quando si salva una giornata. Gli estratti
  interi del mondo sono stati cancellati dopo i riquadri.
- **I numeri del post** (TASK-410 C, proposta, PR #926): una tabella
  `run_stats` con un `jsonb`, scritta dal telefono a fine attività con
  `PUT /me/activities/{key}/stats` e dal server; `GET /drawings/{id}` la
  restituisce già filtrata. È il posto dei numeri del post di Ski touring.

## (a) Le fasi: salita, cambio pelli, discesa

**Cosa**: a fine gita l'elenco delle fasi, ognuna con ora d'inizio e
durata; ogni cambio (pelli tolte in cima, rimesse in fondo) con l'ora e
quanto è durato. Durante la gita, la fase attuale.

**Come** (deciso dall'agente su delega dell'utente):

- un modulo TypeScript puro e nuovo, `activities/mountainPhases.ts`, che
  legge la traccia con le stesse svolte di `snowDay.ts`. `legs`, `isLift` e
  `droppedM` si esportano da `snowDay.ts` (tre `export`, nessun cambio di
  comportamento: i test di C1 restano verdi);
- una gamba che sale e non è un impianto è **salita**; una che scende di
  almeno 30 m è **discesa**; una che sale ed è un impianto è **impianto**;
  il resto (falsopiani, avvicinamento) si unisce alla fase vicina;
- un **cambio** è una sosta fra una fase e l'altra: almeno 90 s sotto
  0,5 m/s, vicino alla svolta (entro 50 m di quota). Ha l'ora d'inizio e la
  durata; una sosta lunga a metà salita è una pausa, non un cambio;
- la svolta per lo scialpinismo è di 20 m (le gobbe di una salita non fanno
  fasi): una costante del modulo nuovo, da tarare su una gita vera.

**Strato**: solo app, solo JavaScript. Nessuna migrazione: le fasi del post
vanno in `run_stats` (TASK-410 C) come `{"ski_tour": {...}}`.

**Costo**: medio. Il modulo puro con i suoi test su tracce finte (una gita
con due salite, una con la seggiovia, una senza quote), la scheda di fine
gita, la fase nel pannello della corsa.

**Rischi**:
- la quota del GPS sull'Android è più rumorosa che sull'iPhone: le soglie
  si tarano su una gita vera per telefono;
- la registrazione libera potrebbe mettersi in pausa da sola durante una
  sosta (da verificare all'inizio di B): un cambio diventerebbe un buco;
- il pannello della corsa (`screens/RunDashboard.tsx`) è nella lista di
  TASK-370 A3: chi arriva secondo unisce main.

## (b) La VAM, velocità di salita (m/h)

**Cosa**: in gita la VAM degli ultimi 5 minuti, solo in salita («—»
altrimenti); a fine gita la VAM media della salita e quella di ogni salita.

**Come**:
- VAM di una salita = metri saliti (come `climbM`, a passi di 3 m) diviso
  il tempo in movimento della salita, per 3600. Le soste e gli impianti non
  contano;
- VAM in gita = metri saliti negli ultimi 300 s, per 12; si mostra dopo
  almeno 120 s di salita, così il primo minuto non dà numeri a caso;
- nello stesso modulo di (a), con le sue funzioni pure.

**Strato**: solo app, solo JavaScript. Nessuna migrazione.

**Costo**: piccolo sopra (a). Il punto delicato è il pannello della corsa:
oggi `RunCard` riceve un'`Activity` (`freeRunActivity`), non lo sport
registrato; la VAM vuole un campo in più (da trovare all'inizio di B, in
`RunDashboard.tsx` e `useRunNumbers`).

**Rischi**: il rumore della quota su 5 minuti (±5 m sull'iPhone fanno
±60 m/h); se serve, finestra di 10 minuti. Nessun barometro diretto:
`expo-sensors` non è nell'app, e un modulo nativo cambierebbe l'impronta
iOS.

## (c) La traccia colorata per pendenza, il tempo sopra i 30°

**Cosa**: nel post la traccia colorata per pendenza **del terreno** sotto
ogni punto (non la pendenza della traccia), in quattro classi: sotto 30°,
30–35°, 35–40°, oltre 40°; la casella «Above 30°» col tempo passato in
movimento sopra i 30°; l'avviso approvato dall'utente sotto la mappa. Solo
un'informazione, mai un bollettino valanghe.

**Come**:
- **un modulo condiviso del server, `shaperoute_api/terrain.py`** (nuovo):
  scarica le tegole Terrarium che servono, le tiene in cache sul Volume,
  decodifica il PNG (con `zlib` della libreria standard: nessuna dipendenza
  nuova; il server non ha Pillow), dà la quota di un punto
  (`R·256 + G + B/256 − 32768`) e la pendenza (Horn, 3 × 3 pixel, con
  `numpy`, già nel server col motore). È **lo stesso modulo** della parte G
  di TASK-347 (ADR-0300): chi parte primo lo scrive, l'altro lo usa. Si
  accordano tramite il Coordinatore (`CONDIVISO.md`);
- **zoom 13**: un pixel è circa 13 m a 46° di latitudine; il dato sotto è
  di circa 30 m in Italia (SRTM, EU-DEM), migliore in Austria, Norvegia e
  Stati Uniti (da verificare in C sulle fonti delle Terrain Tiles);
- **quando**: dopo il salvataggio di una gita, in un lavoro in sottofondo
  del server (le tegole possono volere 1–2 s di rete la prima volta); il
  risultato va in `run_stats` (`slope`: la classe per tratti di punti, i
  secondi sopra i 30°). Finché non c'è, il post non mostra la sezione;
- **nell'app**: la linea a tratti colorati sulla mappa del post (un layer
  in più di `map/mapPage.ts`, come le risalite tratteggiate di C2), la
  legenda col testo e i numeri (mai il colore da solo), l'avviso. I colori
  vengono da `theme/tokens.ts` (quattro token nuovi).

**Strato**: server (modulo nuovo, lavoro in sottofondo) e app. Nessuna
migrazione se `run_stats` è già in `main`; altrimenti C aspetta TASK-410 C.
Il server si aggiorna col sì dell'utente. Nessun codice nativo.

**Costo**: il più alto dei quattro. Il decodificatore PNG e la pendenza con
test su una tegola finta, la cache, il lavoro in sottofondo, il layer della
mappa, i testi (già approvati).

**Rischi**:
- **la pendenza si sottostima**: su 30 m un canale ripido e corto sparisce
  nella media. È il motivo dell'avviso; la parola «sicuro» non compare mai
  come promessa;
- le tegole si scaricano da AWS: se non rispondono la sezione manca, senza
  errori;
- la cache cresce col numero delle gite: una tegola z13 pesa 60–120 kB, una
  gita ne tocca 4–9. Si misura in C;
- la mappa (`mapPage.ts`, `MapView.tsx`, `App.tsx`) e il post (TASK-410 D)
  sono file molto usati: la lista di C si manda quando 410 D è chiaro.

## (d) La vetta raggiunta, la collezione delle vette

**Cosa**: nel post della gita la vetta raggiunta col suo nome e la quota;
nel profilo una riga «Summits» col numero, che apre l'elenco (nome, quota,
data della prima salita, quante volte), visibile a chi può vedere i post
(scelta dell'utente).

**Come**:
- **le vette da un estratto, come impianti e piste**: un comando nuovo
  `shaperoute_api/peak_extract.py` legge un estratto filtrato con
  `osmium tags-filter <estratto> n/natural=peak` e scrive file a tegole di
  0,25° (id OSM, nome, `ele`). Nessuna rete al salvataggio, la posizione non
  va a servizi esterni;
- **il confronto, `shaperoute_api/summits.py`**: una vetta è raggiunta se
  la traccia passa entro 60 m dal suo nodo e, quando ci sono sia la quota
  del punto sia `ele`, entro 80 m di quota. Più vette vicine: la più vicina.
  Si calcola al salvataggio, dal server, come i nomi dello sci (TASK-375 D2);
  non dipende dalle fasi, quindi vale anche per le tracce importate e, se lo
  si vorrà, per Hike e ciaspole;
- **una tabella nuova** `run_summits` (corsa, id OSM, nome, quota, ora),
  con la cancellazione a cascata dalla corsa: la collezione è una query, e
  una gita cancellata toglie le sue vette;
- **l'API**: le vette nel dettaglio del post (in `run_stats` o in una rotta
  sua, come `/ski-names`) e `GET /users/{id}/summits` con la regola di
  visibilità dei post (`drawing_seen_sql`) e `X-MuW-Reads`;
- **l'app**: la riga nel profilo accanto ai record personali, la pagina
  dell'elenco, la vetta nel post.

**Strato**: server, migrazione (`run_summits`, numero dal Coordinatore),
app. I comandi del server per l'estratto e la riga della privacy («la
traccia si confronta con le vette di OpenStreetMap sul nostro server») col
sì dell'utente. Nessun codice nativo.

**Copertura** (deciso dall'agente, da confermare coi comandi del server):
prima le Alpi (Italia, Austria, Svizzera, Francia, Germania, Slovenia, come
il primo giro di TASK-375 D), poi il mondo con gli stessi comandi. Gli
estratti si riscaricano: quelli dello sci sono stati cancellati.

**Costo**: medio. Estratto e confronto con test su un estratto finto, una
migrazione, due rotte, la riga e la pagina del profilo.

**Rischi**:
- `natural=peak` copre bene le Alpi, peggio altrove; senza nome la vetta non
  entra nella collezione (come gli impianti senza nome);
- lo ski-depot: chi lascia gli sci sotto la cima e la registra a piedi ha
  la vetta, chi non ci sale no. È giusto così; il raggio si tara;
- la collezione dice dove una persona va in montagna: per questo segue la
  visibilità dei post, scelta dell'utente;
- lo spazio sul disco del server per riscaricare gli estratti
  (lo script di TASK-375 D guarda già lo spazio libero).

## Una gita di prova

Non c'è una traccia di scialpinismo nel repository. Le parti B, C e D si
provano su tracce finte nei test (deterministiche); la taratura delle
soglie vuole una gita vera con la neve (parte E), registrata con l'app o
importata da un GPX dell'utente (TASK-312).

## Il riassunto dei costi

| Funzione | Strato | Migrazione | Nativo | Costo |
|---|---|---|---|---|
| (a) fasi | app | no (`run_stats`) | no | medio |
| (b) VAM | app | no | no | piccolo |
| (c) pendenza | server + app | no, se c'è `run_stats` | no | alto |
| (d) vette | server + app | sì, `run_summits` | no | medio |
