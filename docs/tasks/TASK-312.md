# TASK-312 — Importare nel Feed attività fatte con altre app, e post di sole foto

**Stato**: In lavorazione · documenti in `main` (#600) · **A in `main`** (API, PR #613) · **B in `main`** (app, file, PR #622, `5d7a5eda`) · **C in `main`**: C1 (API e migrazione `0080`, PR #1347, `cfd5e956`; server col passo 16), C1b (`GET /me/photo-posts`, PR #1355) e C1c (fuori i post del sonno, PR #1379) sul server col passo 17, C2 (app e riga della privacy, PR #1386, `3d4f0d47`) · **D: studio scritto** (sezione «Studio D»), scelte all'utente · poi E (studio collegamenti diretti)
**Fase**: 4 · **Branch**: `docs/TASK-312-import-activities` (documenti),
`feat/TASK-312-a-imported-runs-api` (A), `feat/TASK-312-b-import-file-app`
(B), `feat/TASK-312-c-photo-posts` (C), `docs/TASK-312-d-health-study`
(D), `docs/TASK-312-e-direct-links-study` (E)
**Dipende da**: TASK-172 (My activities), TASK-117 e TASK-208 (il disegno
e il modulo del post), TASK-118 (il Feed), TASK-296 (il gioco), TASK-299
(il concorso), TASK-262 C (la strada di `expo.autolinking.exclude`)
**ADR**: ADR-0272

## Obiettivo

Un iscritto aggiunge a «My activities» un'attività fatta con un'altra app,
da un file GPX, TCX o FIT, e la pubblica nel Feed come una corsa; oppure
pubblica un post di sole foto. Tutti e due portano la scritta «Imported» e
non contano per il gioco né per il concorso. Le regole sono in
`docs/IMPORTAZIONI.md`.

## Contesto

La richiesta dell'utente, il 2026-10-27: «Possibilità di caricare anche
attività che hanno già fatto in precedenza con altre app o instagram sul
nostro feed». Le sue risposte, una domanda per volta, con una proposta
già pronta:

1. Da dove: «Tutti e due, file prima. Il file GPX/FIT in un primo task,
   Apple Salute in un secondo task dopo. + strava + tutti i siti ed app
   più famose tipo garmin».
2. Un post da Instagram senza traccia: «Anche post solo foto».
3. `expo-document-picker`: «Sì, come i contatti» (il pacchetto escluso
   dall'autolinking, la funzione nascosta senza il modulo nativo, accesa
   con la build nativa dopo).
4. Gioco e concorso: «No, solo il feed» (con la scritta «Imported»).

Sui collegamenti diretti, prima di ogni codice: l'accordo API di Strava,
dal novembre 2024, lascia mostrare i dati di un utente solo a lui. Per
questo Strava e gli altri passano prima da uno studio (parte E). Il file
esportato dall'utente da Strava resta la strada di oggi. Instagram come
collegamento resta fuori (§1 di `IMPORTAZIONI.md`). I post di sole foto
sono dentro, per la scelta 2.

## Condizioni (dal Coordinatore, 2026-10-27)

1. **`expo-document-picker`** in `expo.autolinking.exclude` di
   `apps/mobile/package.json`, senza plugin in `app.json`; caricato con
   `requireOptionalNativeModule` e nascosto quando manca, come
   `expo-contacts` (TASK-262 C, #461). Impronta iOS
   `83793e26fc0da7cdc7d8c7f7b1b7ad09e6f823b3` misurata su una copia pulita
   di ogni testa della parte B. Una riga di promemoria in
   `tasks/TASK-152.md` per accenderlo con la build 1.0.1.
2. **Contro i trucchi**: «importata» nei dati (`runs.source`) e nel post.
   Gioco e concorso la lasciano fuori, con un test ciascuno. `clean_track`
   e `game_rules` valgono comunque.
3. **Strava**: il file dell'utente va bene; un collegamento diretto deve
   rispettare l'accordo, e lo studio lo verifica prima, per iscritto.
4. **Apple Salute / Health Connect**: libreria nativa, permessi, regole
   di Apple sui dati di salute (mai per la pubblicità, privacy da
   aggiornare): solo con la build nativa, prima lo studio.
5. **Privacy**: la stessa traccia tagliata di 200 m; gli orari veri del
   file come quelli di una corsa salvata; la riga nuova la approva
   l'utente.
6. Migrazione al **primo numero libero al merge**. Server dopo Apple e
   con il sì dell'utente. «File toccati» di ogni parte al Coordinatore
   prima del codice; per ogni PR «#NNN pronta».

## Contesto da leggere

- `docs/IMPORTAZIONI.md`, tutto; ADR-0272;
- `docs/API.md`: «My activities» (il corpo del `PUT`, `started_at`,
  `clean_track`), «Drawings» e «Feed»; `docs/DATABASE.md`, «Com'è oggi»:
  `runs`, `drawings`, `drawing_photos`;
- `docs/GIOCO.md` (dove una corsa entra nel gioco), `docs/CONCORSI.md`
  (chi partecipa);
- `tasks/TASK-262.md`, «Alla prossima build nativa» (la strada
  dell'esclusione);
- per B e C: `apps/mobile/src/activities/` (`RunEnd.tsx`,
  `activitiesDoor.ts`, `activityKey.ts`), `apps/mobile/src/social/`
  (`drawingsDoor.ts`, `drawingPhotos.ts`, `pickDrawingPhoto.ts`).

## Parte A — L'API delle corse importate

1. Migrazione: `runs.source` (`text NOT NULL DEFAULT 'muw'`, `CHECK` fra
   `muw` e `file`; `health` e i provider li aggiungono D ed E). Le corse
   di prima restano `muw`.
2. `PUT /me/activities/{key}` accetta `"source"` (per difetto `muw`).
   Conta solo al primo `PUT`, come il resto del corpo.
3. Con `source` diverso da `muw`: niente `after_run_saved`, e
   `game_backfill` le salta; `contests.py` prende solo i disegni di corse
   `muw`.
4. `source` nelle risposte: corsa dell'elenco e intera, disegno (mio e
   degli altri), post del Feed, griglia del profilo. Nei tipi di
   `packages/shared-types`, con fixture nuove (`*-imported.json`): le
   vecchie restano com'erano.
5. «Send to Strava» di una corsa importata: `409` con un codice nuovo,
   se l'utente conferma la proposta di §3.7.
6. Test: il `PUT` con `source: "file"` e orari di un anno fa; la seconda
   volta non cambia niente; il gioco non la conta (nessuna riga nuova
   nelle sue tabelle); il concorso non la conta; le risposte la dicono.

```
services/api/migrations/00NN_run_source.sql   (nuovo)
services/api/shaperoute_api/schemas.py
services/api/shaperoute_api/activities.py
services/api/shaperoute_api/game_backfill.py
services/api/shaperoute_api/contests.py
services/api/shaperoute_api/drawings.py
services/api/shaperoute_api/feed.py
services/api/shaperoute_api/profiles.py
services/api/shaperoute_api/strava.py         (solo con il sì su §3.7)
services/api/tests/test_imported_runs.py      (nuovo)
packages/shared-types/src/index.ts
packages/shared-types/fixtures/*-imported.json (nuovi)
docs/API.md
docs/DATABASE.md
docs/GIOCO.md
docs/CONCORSI.md
docs/STATUS.md
docs/tasks/TASK-312.md
```

### Parte A — com'è fatta (2026-10-28, PR #613)

«File toccati» approvati dall'utente il 2026-10-28 («OK, go ahead»; il
Coordinatore era archiviato). Rispetto alla lista sopra:

- la migrazione è **`0034_run_source.sql`**: la 0033 è dei messaggi
  (TASK-319);
- **`feed.py` e `profiles.py` non cambiano**: il Feed, la griglia del
  profilo (`GET /users/{id}/drawings`) e il concorso leggono le colonne e
  `_seen` di `drawings.py`, e `source` arriva da lì;
- in più `schemas.py` e `fixtures/api-error-codes.json` (il codice
  `imported_run`), `packages/shared-types/test/imported.test.ts` (nuovo) e
  tre test che confrontano le risposte con le fixture di prima
  (`test_activities.py`, `test_drawings.py`, `test_feed.py`: solo `source`
  fra i campi nuovi, come `rotation_deg`);
- in più `apps/mobile/assets/engine/engine.zip`, ricostruito con
  `python tools/phone_engine/phone_engine.py engine`: il telefono porta una
  copia di `schemas.py`, e il codice d'errore nuovo la cambia (dentro lo
  zip cambia solo quel file, come per `no_contest` in TASK-299). Sì
  dell'utente il 2026-10-28: «Yes, add and merge».

Cosa fa:

- `PUT /me/activities/{key}` accetta `source` (`muw` per difetto, `file`),
  solo al primo `PUT`; una corsa `file` con `points` è `422`;
- con `source` `file` niente `after_run_saved` né push delle forme;
  `game_backfill` legge solo le corse `muw` (così un account con una corsa
  da file non torna a ogni lancio); `PARTICIPATES_SQL` del concorso vuole
  `r.source = 'muw'`;
- «Send to Strava» di una corsa `file`: `409 imported_run`, prima del
  token;
- `source` nell'elenco e nella corsa intera, in `MyDrawing`, nel disegno
  degli altri (elenco, intero, Feed, concorso); nei tipi `RunSource`,
  `RUN_SOURCES` e `source?` (mancante da un'API di prima: `muw`);
- fixture nuove `activity-request-imported.json`,
  `activities-imported.json`, `activity-imported.json`,
  `my-drawing-imported.json`, `drawing-details-imported.json`,
  `feed-imported.json`, fatte dalle risposte vere dell'API; le vecchie
  invariate;
- 15 test in `services/api/tests/test_imported_runs.py`.

Per B: i tipi di «My activities» stanno nell'app
(`apps/mobile/src/api/activities.ts`); `source` lì va aggiunto da B, con
`muw` quando manca. Un'API senza la 0034 rifiuta `source` con `422`.
Server: la migrazione dopo il merge, con il sì dell'utente.

## Parte B — L'app: «Add past activity» da un file

1. `expo-document-picker` come nella condizione 1; `npm install` con il
   sì già dato dall'utente (2026-10-28).
2. Lettori scritti da noi, senza altre dipendenze, in
   `apps/mobile/src/imports/`: `gpx.ts` e `tcx.ts` (XML: i punti con
   posizione e orario, lo sport), `fit.ts` (binario: i messaggi `record`
   con `timestamp`, `position_lat`, `position_long`, e `sport`; anche le
   intestazioni con l'orario compresso). Test su file veri, piccoli, in
   `__tests__/fixtures/imports/`.
3. `importFile.ts`: dal file ai punti del `PUT` (`time_ms` dall'orario
   del file, `accuracy_m` `null`), i buchi oltre 60 s come pause `auto`, il
   diradamento a 20 000 punti, il limite di 25 MB, gli errori di §3.
4. «Add past activity» in «My activities» → «From a file» / «Photos only»
   (questa seconda la riempie C). Poi il modulo di `RunEnd`, con
   «Imported» e la riga sul gioco e il concorso.
5. «Imported» nella scheda di «My activities», nella scheda del Feed e
   nel post aperto.
6. La riga della privacy (§6 di `IMPORTAZIONI.md`) nelle cinque lingue,
   `site/privacy/*` rifatto con `node site/tools/make_privacy.mjs`, la data
   del giorno del merge (e il sì dell'utente su quella data).
7. Prova in Expo Go con un GPX di Strava, un TCX e un FIT di Garmin.

File toccati (da confermare al Coordinatore prima del codice):

```
apps/mobile/package.json                      (dipendenza + exclude)
package-lock.json
apps/mobile/src/imports/*                     (nuovi)
apps/mobile/src/activities/ActivitiesList.tsx
apps/mobile/src/activities/ActivityCard.tsx
apps/mobile/src/activities/RunEnd.tsx
apps/mobile/src/activities/activitiesDoor.ts
apps/mobile/src/api/activities.ts
apps/mobile/src/feed/feedPosts.ts
apps/mobile/src/social/DrawingCard.tsx
apps/mobile/src/i18n/*                        (le righe nuove)
apps/mobile/__tests__/fixtures/imports/*      (nuovi)
site/privacy/*
docs/UI.md
docs/tasks/TASK-152.md                        (una riga di promemoria)
docs/STATUS.md
docs/tasks/TASK-312.md
```

### Parte B — com'è fatta (2026-10-29, branch `feat/TASK-312-b-import-file-app`)

«File toccati» mandati al Coordinatore prima del codice e approvati il
2026-10-29, con le sue condizioni: il selettore fuori dalle build dello
store fino alla 1.0.1 (impronta invariata), il file letto sul telefono e
niente che parte prima di «Save», testi e privacy all'utente. Rispetto
alla lista sopra, in più: `apps/mobile/src/feed/FeedPost.tsx` («Imported»
nella riga dei fatti della scheda del Feed) e
`apps/mobile/src/about/content/*.ts` (la riga della privacy sta lì:
`make_privacy.mjs` legge da lì).

Cosa fa:

- `expo-document-picker` `~57.0.2` (57.0.3 nel lock), la versione di Expo
  SDK 57; il sì dell'utente è del 2026-10-28, «Sì, come i contatti» (scelta
  3 in «Contesto»). In `expo.autolinking.exclude`, nessun plugin in
  `app.json`, così le build dello store restano senza e l'impronta iOS resta
  `83793e26…` (misurata su copia pulita, con il `package-lock.json`
  cambiato);
  `pickActivityFile.ts` lo carica solo con `require` dietro
  `requireOptionalNativeModule("ExpoDocumentPicker")`: senza il modulo
  nativo (la 1.0, e le build fino alla 1.0.1) «Add past activity» non c'è;
  Expo Go lo mostra. Il file scelto si copia nella cache, si legge e la
  copia si cancella; un file oltre 25 MB non si legge;
- `src/imports/`: `gpx.ts` e `tcx.ts` (XML letto con poche espressioni
  regolari, `xml.ts`: solo numeri e orari, con o senza prefisso dei nomi),
  `fit.ts` (binario dal protocollo FIT: definizioni little e big endian,
  campi dello sviluppatore saltati per la loro misura, intestazioni con
  l'orario compresso, file concatenati, file tagliato letto fino al
  taglio; `record` 20, `sport` 12, `session` 18). Il formato si riconosce
  dal contenuto, non dal nome;
- `importFile.ts`: tiene i punti con posizione e orario, in ordine di
  tempo (un punto non più tardi di quello prima si lascia), i buchi oltre
  60 s come pause `auto` (al più 1 000, le più lunghe), al più 20 000
  punti a passo uguale, `accuracy_m` `null`, `source: "file"`, la chiave di
  sempre (`activityKey`). Errori: non GPX/TCX/FIT, nessuna posizione (anche
  meno di due punti), posizioni senza orari (un percorso), prima del 2020,
  oltre 25 MB; «Something went wrong.» (testo già approvato) per un file
  che il telefono non legge;
- **già in «My activities»**: prima del modulo, la corsa si cerca fra
  quelle in attesa sul telefono, nell'elenco e poi sull'API con
  `GET /me/activities/{key}`: parte **solo la chiave**, niente del file.
  Serve perché «Save» su una corsa già salvata riscriverebbe il suo
  disegno (titolo, chi la vede). Senza rete si va avanti: il `PUT` la
  tiene una volta comunque. *Deciso dall'agente su delega dell'utente.*
- «Add past activity» in cima a «My activities» (`AddPastActivity.tsx`):
  «From a file» con la riga sotto e l'aiuto; poi il disegno della traccia
  (al più 200 punti, ognuno è una View) e il modulo di `RunEnd` con
  `imported`: «Imported», la riga sul gioco e i concorsi, lo sport del file
  (altrimenti «Settings»), «Only me» all'inizio, niente «Send to Strava» né
  Apple Salute (l'altra app l'ha già scritta lì). «Save» passa da
  `recordImported` della porta: la stessa coda, le stesse scelte e foto di
  una corsa registrata; una corsa `file` non chiede niente al gioco
  (`tellUnlocked` saltato). Mai rimandata senza `source`: un'API senza la
  0034 la rifiuta (`422`) e resta fra quelle rifiutate, con «Try again»;
- «Imported» sulla riga e sulla scheda di «My activities» (sulla scheda
  niente «Send to Strava», la proposta confermata), nella riga dei fatti
  della scheda del Feed («Imported · 4.9 km · 27 min») e sul disegno
  aperto (`DrawingCard.tsx`, dopo il merge di #619); `source?` e
  `isImported` in `api/activities.ts`, mancante = `muw`;
- test su file piccoli in `apps/mobile/__tests__/fixtures/imports/`, fatti
  da `make_fixtures.mjs` nello stesso posto (sempre uguali): una corsa di
  Strava (GPX), un giro in bici di Garmin Connect (TCX), una corsa di un
  orologio Garmin (FIT con campo dello sviluppatore, definizione big endian
  e orari compressi), un percorso di Komoot (GPX senza orari), un tapis
  roulant (TCX senza posizioni). Le tracce sono inventate, per formula:
  nessuna attività di una persona nel repository. La struttura è quella
  dei file veri; la prova con file veri è il punto 7.

## Parte C — I post di sole foto

1. API: un disegno senza corsa. `drawings.user_id` (riempito da `runs`
   per le righe di oggi), `run_id` facoltativo, un vincolo: senza corsa
   niente traccia, e pubblico solo con almeno una foto. Dove oggi
   l'autore si legge con `JOIN runs` (`drawing_seen_sql`, `shown_sql`,
   Feed, commenti, reazioni, segnalazioni, push, email), si legge da
   `drawings.user_id`. *Proposta tecnica di partenza*: C la verifica sul
   codice e la scrive in ADR-0272 prima di cominciare. È la parte più
   larga: i file si contano allora.
2. Un endpoint per crearlo (`POST /me/photo-posts`, o il disegno con un
   corpo senza corsa: lo sceglie C), le foto con gli endpoint di oggi,
   poi «Everyone» o «Followers».
3. App: «Photos only» apre il modulo senza mappa; le foto con
   `pickDrawingPhoto.ts`. La scheda del Feed mostra le foto al posto del
   disegno (ADR-0275), con «Imported».
4. Test: un post solo foto si vede come un post (blocchi, nascosti,
   «Followers»); non entra nel concorso; senza foto non diventa pubblico.

Non usa `expo-document-picker`: funziona anche nella 1.0, con il server
aggiornato. File toccati: si dicono al Coordinatore prima del codice.

### Parte C — il piano, verificato sul codice (2026-11-21)

La proposta di partenza regge: **un post di sole foto è un disegno senza
corsa**. Lo studio delle 51 query con `JOIN runs` (in 36 moduli) dice
dove serve cambiare e dove no. *Deciso dall'agente su delega dell'utente*;
va in ADR-0272 come «precisazione C» nella PR di documenti.

**Perché non una corsa finta** (`runs.source = 'photos'`): i lettori che
partono da `runs` (totali del profilo, record, calendario, gioco, badge,
palestra, sci, sonno, VO₂ max, concorso) dovrebbero lasciarla fuori uno per
uno, e «My activities» la mostrerebbe. Con un disegno senza corsa questi
lettori non la vedono mai, perché partono da `runs`; cambiano solo quelli
che partono dal disegno.

**Migrazione** (numero dal Coordinatore al merge):

- `drawings.user_id bigint NOT NULL REFERENCES users ON DELETE CASCADE`,
  riempito da `runs` per le righe di oggi, con un indice;
- `drawings.run_id` facoltativo; `drawings.key text` (la chiave fatta dal
  telefono, come `activityKey`, per rimandare senza doppioni), `UNIQUE
  (user_id, key)`, `CHECK ((run_id IS NULL) = (key IS NOT NULL))`;
- senza corsa: mai `only_me`, mai traccia; `published_at` vuoto finché non
  c'è almeno una foto (il vincolo di 0014 fra `visibility` e
  `published_at` vale solo per i disegni con corsa).

**Chi lo vede**: `drawing_seen_sql` e `shown_sql` leggono l'autore da
`d.user_id` invece di `r.user_id`, e per gli altri vogliono
`d.published_at IS NOT NULL` (per i disegni con corsa è la stessa cosa di
oggi). Così blocchi (TASK-121), nascosti (TASK-291), «Followers»,
commenti, reazioni e foto valgono senza regole nuove.

**Dove cambia** (l'autore da `d.user_id`, `LEFT JOIN runs` dove il post
deve comparire): `drawings.py` (profilo, disegno aperto, conteggio del
profilo, scrittura di `user_id`), `feed.py` (fila, schede «Following» e
«All»; senza punto non è mai «vicino»), `drawing_photos.py` (le foto
viste), `user_photos.py` (la griglia delle foto del profilo),
`profile_totals.py` (le reazioni ricevute), `comments.py`,
`comment_reactions.py`, `reactions.py`, `moderation.py` e
`report_email.py` (segnalazioni), `push.py`, `notice_email.py`,
`notification_list.py`, `away_email.py`, `outfit_tags.py`.

**Dove resta il `JOIN runs`, e il post di sole foto resta fuori di
proposito**: concorso (`contests.py`, `contest_entries.py`,
`contest_clock.py`), badge, gioco, palestra, sci, vasca, sonno,
`drawing_retrack.py`, la ricerca (`drawing_search.py`), il link pubblico
(`post_links.py`, vuole una linea), il post mandato in chat
(`messages.py`), le live programmate, le stazioni. Ricerca e chat per i
post di sole foto: dopo, se l'utente li vuole.

**Le app di prima non li vedono**: un tipo nuovo `photos` in
`X-MuW-Reads` (`reads.py`). Senza, ogni elenco li lascia fuori e il
disegno aperto è `404`, come per gli sport nuovi. Il server può uscire
prima dell'app.

**L'endpoint**: `PUT /me/photo-posts/{key}` (titolo, descrizione, tag,
`everyone` o `followers`; la seconda volta lo cambia), `DELETE
/me/photo-posts/{key}`, e le foto e l'ordine con lo stesso codice di oggi
sotto `/me/photo-posts/{key}/photos/{n}` e `/order`. Fino a 10 foto (non
c'è la mappa). Nessun codice d'errore nuovo, quindi niente `schemas.py`
né `engine.zip`.

**Le risposte**: `source: "photos"`; per un post di sole foto `activity`
e i campi della corsa sono `null`, metri e secondi `0`, `started_at` è la
pubblicazione, `track_preview` vuoto. In `packages/shared-types` un tipo
a sé (`PhotoPost`, `isPhotoPost`): i tipi di oggi non cambiano, l'app li
separa dove legge il Feed.

**Sotto-parti**:

- **C1 — API e migrazione** (prima il server, col sì dell'utente);
- **C2 — app**: «Photos only» nel foglio «Add activity» del «+» del Feed
  (il «+» c'è anche senza il selettore di file) e in «Add past activity»;
  il modulo senza mappa come quello della palestra e della vasca; la porta
  con la coda; la scheda del Feed e il post aperto con «Imported»; modifica
  e cancellazione dell'autore; niente «Send in chat» né link per questi
  post; la riga della privacy (a turno).

### Parte C1b — l'elenco dei propri post (2026-11-21)

`GET /me/photo-posts`: l'app apre un post dal suo id, ma per modificarlo o
cancellarlo le serve la `key`, e nessun endpoint la dava (i post di sole
foto non sono in «My activities» né in `GET /me/drawings`). Nessuna
migrazione, nessun codice d'errore nuovo. Lista approvata dal Coordinatore
il 2026-11-21 (`photo_posts.py`, `test_photo_posts.py`, `index.ts`,
`my-photo-posts.json`, `photoPosts.test.ts`, `API.md`, questo file); sul
server col passo 16 se è in `main` prima, altrimenti col passo dopo.

### Parte C1 — com'è fatta (2026-11-21)

«File toccati» approvati dal Coordinatore il 2026-11-21 (la lista sopra,
da `main`; migrazione provvisoria **0080**, la 0079 è prenotata da 475 A:
il numero vero al merge). In più, chiesto al Coordinatore:
`packages/shared-types/fixtures/reads.json` (solo `photos` in `kinds`;
`this_app` invariato finché C2 non lo dice).

- `0080_photo_posts.sql`: `drawings.user_id` riempito da `runs`, `run_id`
  facoltativo, `key` unica per account, i vincoli del disegno senza corsa,
  il vincolo di `published_at` solo con una corsa (`DATABASE.md`);
- `drawing_seen_sql`, `shown_sql`, `published_count_sql`, `LINKABLE_SQL`
  leggono l'autore da `d.user_id`, e per gli altri vogliono
  `published_at`; le colonne viste con `coalesce` per i campi della corsa
  (`DRAWN_AT_SQL`, `WITH_RUN_SQL`); `SeenFields.activity` può essere
  `null` e `source` può essere `photos`;
- `reads.py`: il tipo `photos` e `Reads.drawings_sql()`, usato da Feed,
  profilo, foto del profilo, disegno aperto e campanello;
- `photo_posts.py`: `PUT/GET/DELETE /me/photo-posts/{key}`, foto e ordine
  (`store_photo` estratto da `drawing_photos.py`); pubblicato con la prima
  foto, i taggati avvisati allora;
- l'autore da `d.user_id` anche in commenti, reazioni a post e commenti,
  segnalazioni e la loro email, push, email delle notifiche e di chi
  manca, etichette dei vestiti, reazioni ricevute del profilo;
- `user_photos.py`: il cursore accetta il decimo posto (prima solo 1–9);
- 35 test nuovi (`test_photo_posts.py`, `test_photo_posts_seen.py`), tipi
  e test in `shared-types`, fixture fatte dalle risposte vere dell'API.

### Parte C1c — i post del sonno restano fuori (2026-11-22)

Con 467 E1 (migrazione `0082`, `drawings.sleep_night_id`) anche il post del
sonno è un disegno senza corsa. Le quattro letture di `photo_posts.py`
(`POST_OF_KEY`, `_post`, `all_mine`, `remove`) vogliono ora
`run_id IS NULL AND sleep_night_id IS NULL` (`PHOTO_POST_SQL`), e un `PUT`
sulla chiave di un post del sonno risponde `409 not_a_photo_post`. PR #1379
in `main` (`fdc49ddd`), con un test. Sul server col passo 17, insieme a C1b
(server a `40789324`: `/me/photo-posts` 401 senza chiave, controlli
`10|0|0|0|0`, nessun Traceback).

### Parte C2 — com'è fatta (2026-11-22, PR #1386, `3d4f0d47`)

«File toccati» approvati dal Coordinatore (lista in
`side-session-notes`, poi nel corpo della PR); in più, chiesti e approvati:
`services/api/tests/test_reads.py`, `apps/mobile/src/tabs/TabSwipeOwners.test.ts`,
`services/api/tests/test_photo_posts.py`.

- `reads.json`: `this_app` dice anche `photos`; l'app manda `photos` in
  `X-MuW-Reads` (`api/reads.ts`), e `api/drawings.ts` accetta `activity`
  `null` solo con `source: "photos"`;
- `api/photoPosts.ts` e la coda del telefono (`social/photoPostOutbox.ts`,
  `usePhotoPostOutbox.ts`): il post e le sue foto partono anche più tardi,
  senza rete, una foto alla volta, e si scordano all'uscita dall'account;
- `imports/PhotoPostForm.tsx`: da 1 a 10 foto, titolo, descrizione,
  persone taggate, «Everyone» o «Followers» dall'ultima scelta
  (`photoPostVisibility.ts`); «Photos only» in «Add past activity» e nel
  «+» del Feed, anche senza il selettore di file (il «+» c'è con
  l'account);
- nel Feed `feed/PhotoFeedPost.tsx` (foto da scorrere, foto dell'autore,
  «Imported», reazioni, commenti, segnalazione) e `PhotoPostPage.tsx`;
  `PhotoPostSettings.tsx` cambia titolo, descrizione e chi lo vede, e
  cancella con «Delete this post? It cannot be undone.» / «Delete post»;
  niente «Share», niente numeri della corsa, niente invio in chat; nella
  griglia del profilo la prima foto;
- la riga della privacy nelle cinque lingue e sul sito
  (`make_privacy.mjs`), data 22 novembre 2026;
- provato nel simulatore (Expo Go, API locale): creare, Feed, pagina,
  impostazioni, cancellare (`DELETE` 204).

Approvati dall'utente il 2026-11-22: le schermate e i testi della
cancellazione («Approvo»), «Importata» in italiano resta, le traduzioni
della riga della privacy («Approvo»); il merge con «Sì, unisci» (tocca la
privacy), chiesto dal Coordinatore. #1397 (TASK-487) è entrata prima: il
conflitto su `FeedScreen.tsx` era solo nel commento.

## Parte D — Apple Salute e Health Connect (studio)

Lo studio di §7 di `IMPORTAZIONI.md`, scritto in
`docs/tasks/TASK-312.md`, sezione «Studio D». Nessun codice. Poi una scelta
dell'utente (la libreria, i permessi, la privacy) e il codice con la
build nativa.

### Studio D (2026-11-23)

Scritto dall'agente col via del Coordinatore. Nessun codice; le scelte in
fondo sono dell'utente.

**1. Cosa c'è già nell'app.** Le due librerie sono già nelle dipendenze
(TASK-321, ADR-0281): `@kingstinct/react-native-healthkit` 16.2.0 per
l'iPhone e `react-native-health-connect` 4.1.3 per Android, tenute fuori
dal linking finché non arriva la build nativa (`health/healthModules.ts`).
**Nessuna dipendenza nuova** per leggere: la domanda «quale libreria» di
§7 è già risolta. Oggi MuW da Salute:

| Chi | Scrive | Legge |
| --- | --- | --- |
| TASK-321 (in `main`) | allenamento, traccia, distanza, energia di una corsa | battito durante l'attività (`heartSamples.ts`) |
| TASK-467 C (#1334, bozza) | — | sonno (`HKCategoryTypeIdentifierSleepAnalysis`) |
| TASK-489 C2 (piano) | — | allenamenti delle altre app (`HKWorkoutTypeIdentifier`) ed energia attiva del giorno (`HKQuantityTypeIdentifierActiveEnergyBurned`); Android: allenamenti e calorie attive |
| **TASK-312 D (questo studio)** | — | **la traccia** di quegli allenamenti (`HKWorkoutRouteTypeIdentifier`); Android `ExerciseRoute` |

Su Health Connect oggi MuW chiede solo permessi di scrittura
(`health/healthConnect.ts`).

**2. Cosa si aggiunge alla lista della prossima build nativa.** La build
avrà un solo `NSHealthShareUsageDescription` per tutti (Coordinatore,
2026-11-23). Rispetto a 467 C e 489 C2, D aggiunge **un solo tipo di
lettura**:

- iPhone: `HKWorkoutRouteTypeIdentifier` in `toRead` (gli allenamenti li
  chiede già 489 C2; il permesso della traccia è un interruttore a parte
  nel foglio di Salute). Nessun entitlement nuovo:
  `com.apple.developer.healthkit` c'è già in `app.json`.
- Android: `android.permission.health.READ_EXERCISE` (lo chiede già 489
  C2) e **`android.permission.health.READ_EXERCISE_ROUTES`** (nuovo). Se
  si vuole andare oltre i 30 giorni, anche
  `android.permission.health.READ_HEALTH_DATA_HISTORY` (scelta 3).
- Il testo del permesso deve nominare anche «le tracce» degli
  allenamenti. Proposta inglese, da approvare insieme a 467 C e 489 C2:
  «MuW reads from Apple Health your heart rate during each activity, your
  sleep, your active energy and your workouts from other apps with their
  routes, to show them with your activities, in your posts and in your
  food diary. You can hide them before you publish.» Poi le quattro
  traduzioni in `locales/*.json`.

**3. Quali app scrivono la traccia.** Senza traccia non c'è disegno.

- **Apple Allenamento** (Apple Watch, iPhone) scrive la traccia di ogni
  allenamento all'aperto: è il caso più comune su iPhone.
- **Garmin Connect** scrive in Salute allenamento, distanza e calorie, ma
  **non la traccia**: lo dicono più utenti sul forum Garmin, e Garmin
  Connect non compare fra le fonti di «Workout Routes» in Salute.
- **Strava**: scrive gli allenamenti in Salute; della traccia ci sono
  solo segnalazioni discordanti degli utenti, nessuna pagina di Strava.
- **Polar Flow**: la sua scheda dell'App Store elenca allenamenti, battito
  e passi, non la traccia. **Suunto, Coros**: nessuna fonte trovata.
- App ponte come RunGap scrivono anche la traccia: chi usa Garmin può
  passare di lì, non è cosa di MuW.

Le fonti sono quasi tutte forum: **la verifica vera è sul telefono**. In
Salute › Profilo › App e servizi si vede quali app hanno scritto «Workout
Routes». Prima del codice, sull'iPhone dell'utente (che usa le app vere),
si guarda quali fonti hanno tracce e se ne scrive l'elenco qui.

Su Android: la traccia la scrivono le app che usano `ExerciseRoute` di
Health Connect; da verificare allo stesso modo con la build Android di
TASK-321 C.

**4. Come si legge.**

- iPhone: si leggono gli allenamenti (`queryWorkoutSamples`), poi la
  traccia di ognuno (`getWorkoutRoutes()` sull'allenamento, che dietro
  usa `HKWorkoutRouteQuery`). Salute **non dice se la lettura è stata
  negata**: un allenamento senza traccia può voler dire «l'app non l'ha
  scritta» o «permesso negato». La riga sotto l'elenco lo dice in tutti e
  due i casi.
- Android: si leggono le `ExerciseSession`; la traccia di un'altra app
  vuole `READ_EXERCISE_ROUTES` e l'app in primo piano; se manca il
  consenso, Health Connect risponde `ConsentRequired` e
  `requestExerciseRoute(recordId)` apre la richiesta per quella sola
  sessione. Il gesto dell'utente («scegli questo allenamento») è il
  momento giusto per chiederla.
- **Gli allenamenti scritti da MuW stesso si saltano** (sorgente
  `HKSource` col bundle di MuW; su Android `dataOrigin` col pacchetto di
  MuW): sono già corse di MuW.
- Il codice di lettura è lo stesso di 489 C2: un modulo solo in `health/`
  che legge gli allenamenti, e due usi (il diario del cibo prende le
  calorie, «Add past activity» prende la traccia).

**5. Dove entra nell'app e sul server.** La strada c'è già: è quella del
file (parte B). In «Add past activity» una voce «From Apple Health» (su
Android «From Health Connect») apre l'elenco degli allenamenti con
traccia; uno scelto diventa una traccia come quella di un GPX e va nello
stesso modulo con «Imported», fuori da gioco e concorsi.

- Sul server serve un valore nuovo di `runs.source` (oggi `muw`, `file`,
  `manual`): una migrazione e lo schema. Oppure si riusa `file`. Scelta
  tecnica, al momento del codice.
- La chiave dell'attività può venire dall'UUID dell'allenamento di
  Salute: importarlo due volte dà la stessa corsa.

**6. Regole.**

- **Apple 5.1.3 e 27.x**: i dati di Salute mai per pubblicità, marketing
  o data mining, mai venduti; pubblicarli solo col gesto esplicito di chi
  li pubblica. MuW avrà gli annunci (ADR-0198): la traccia letta da Salute
  non li tocca mai. Pubblicare è già un gesto esplicito («Save» nel
  modulo).
- **Privacy**: una riga nuova, da approvare. Come quella dei file: la
  traccia e gli orari dell'allenamento scelto arrivano al server solo
  quando lo salvi, con le stesse regole di una corsa salvata (traccia
  tagliata di 200 m). Su App Store «Health» copre già i dati che escono
  dal telefono (467 C lo aggiorna per il sonno).
- **Google Play**: il modulo della dichiarazione di Health Connect su
  Play Console, con ogni permesso di lettura e il suo uso; il permesso
  della cronologia è uno di quelli da giustificare.
- **Build nativa**: tutto entra solo con lei (iOS dopo la 1.1.0, Android
  con TASK-321 C). Quale build e quando lo dice il Coordinatore.

**7. Le scelte dell'utente, una per volta, con una proposta.**

1. **Si fa?** «From Apple Health» in «Add past activity», insieme alla
   build di 467 C e 489 C2 (un solo testo del permesso). *Proposta: sì,
   con la stessa build.*
2. **Gli allenamenti senza traccia** (Garmin, probabilmente Polar):
   nascosti, o nell'elenco in grigio con «No route in Apple Health».
   *Proposta: in grigio, con la riga che dice perché.*
3. **Quanto indietro su Android**: i 30 giorni di base, o tutta la
   cronologia (permesso in più, da giustificare a Google). *Proposta: i 30
   giorni; la cronologia dopo, se la chiedono.* Su iPhone nessun limite.
4. **Il testo del permesso unico** (§2) e **la riga della privacy** (§6):
   testi dell'utente.

Fonti: Apple, «Reading route data» e `HKWorkoutRouteQuery`
(developer.apple.com/documentation/healthkit); Android, «Add exercise
routes» e `HealthPermission`
(developer.android.com/health-and-fitness/health-connect/features/exercise-routes);
Android Developers Blog, marzo 2025 (i 30 giorni e
`READ_HEALTH_DATA_HISTORY`); Google Play, «Health apps»
(support.google.com/googleplay/android-developer/answer/12991134); forum
Garmin, «garmin connect does not sync workout routes … to apple health»
(forums.garmin.com, thread 352961); Apple Community, thread 251755357
(Strava); App Store, Polar Flow (id717172678); `getWorkoutRoutes()` in
`WorkoutProxy.nitro.ts` della libreria (v14, da ricontrollare sulla 16.2
prima del codice).

## Parte E — Collegamenti diretti (studio)

Lo studio di §8 di `IMPORTAZIONI.md`, scritto nella sezione «Studio E»:
una tabella per provider (Strava, Garmin, Polar, Suunto, Coros, Wahoo,
Komoot), con le fonti. Nessun codice, nessun account aperto a nome
dell'utente. Poi l'utente sceglie quali.

## Testi da approvare (parti B e C)

| Dove | Testo |
|---|---|
| «My activities», il pulsante | «Add past activity» |
| Le due scelte | «From a file» · «GPX, TCX or FIT from Strava, Garmin, Komoot…» |
|  | «Photos only» · «Up to 3 photos, also from Instagram» |
| Aiuto sotto «From a file» | «Export the activity as a file from the other app or its website, save it in Files, then pick it here.» |
| La scritta | «Imported» |
| Sotto il titolo del modulo | «Imported activities don't count for Play or contests.» |
| Errori | «This file has no times: it is a route, not an activity.» |
|  | «This file has no positions.» |
|  | «This file is not GPX, TCX or FIT.» |
|  | «This file is too big (over 25 MB).» |
|  | «Activities before 2020 cannot be added.» |
|  | «Already in My activities.» |
| Post di sole foto | «Add at least one photo.» |
| Privacy | «If you add a past activity from a file, we keep its track and times like a run recorded with MuW. We do not keep the file.» |

**Parte B approvata dall'utente il 2026-10-29** («Approvo tutto»): i testi
della parte B (le righe sopra senza «Photos only» e «Add at least one
photo.», che sono di C) con le traduzioni in italiano, tedesco, francese e
spagnolo della PR, la riga della privacy nelle cinque lingue e la data
della privacy **29 ottobre 2026**.

**Testi di C approvati dall'utente il 2026-11-21** («Fino a 10 foto»):
«Photos only» · «Up to 10 photos, also from Instagram» · «Add at least
one photo.» (il limite di 3 del 27 ottobre era quello di allora; un post
senza disegno tiene 10 foto).

**Chi lo vede all'inizio, scelta dell'utente del 2026-11-21** («L'ultima
scelta»): da tutte e due le entrate parte dalla scelta dell'ultimo post
salvato, come le corse; la prima volta «Everyone». Quando l'ultima scelta
è «Only me» (una corsa), parte «Everyone», perché qui «Only me» non c'è.
*Quest'ultimo caso è deciso dall'agente su delega dell'utente.*

**Privacy di C approvata dall'utente il 2026-11-21** («Approvo il
testo»), in «Your runs and their GPS tracks» dopo la riga dei file, nelle
cinque lingue e sul sito, con la data del giorno del merge di C2: «A post
with «Photos only» has no track, no place and no times. Its photos go to
our server resized, without the data your phone adds, such as where and
when they were taken. They are seen, with the title, the description and
the people you tag, by «Everyone» or by your «Followers»: there is no
«Only me». The choice starts from your last post, or on «Everyone», and
you see it before «Post». The post stays until you delete it or your
account.» (Le traduzioni vanno all'utente con le schermate di C2.)

**Traduzioni della privacy di C approvate dall'utente il 2026-11-22**
(«Approvo»), quelle della PR #1386; la data è il 22 novembre 2026.

## Proposte da confermare con l'utente

- Il pulsante in «My activities», con le due scelte (§2).
- «Send to Strava» nascosto per una corsa importata (§3.7).
- Un post solo foto senza «Only me» (§4.1).

**Confermate dall'utente il 2026-10-28**: «Sì, le tre proposte vanno
bene: pulsante «Add past activity» in My activities, niente «Send to
Strava» per le corse importate, niente «Only me» per i post solo foto.»
Il punto 5 della parte A (`409` su «Send to Strava») è quindi dentro A.

Il Coordinatore chiede alla parte C una sua riga della privacy, approvata
dall'utente nella PR di C, e le regole di segnalazione e blocco di
TASK-121.

## Criteri di accettazione

- [x] **A**: una corsa con `source: "file"` si salva con i suoi orari, si
      pubblica, e il Feed, il disegno e «My activities» dicono
      `source`; il gioco e il concorso non la contano (test).
- [ ] **B**: in Expo Go un GPX di Strava, un TCX e un FIT di Garmin
      diventano corse di «My activities» con «Imported»; lo stesso file
      due volte resta una corsa; i file sbagliati danno i loro errori.
      *Scelta dell'utente del 2026-10-29 («Merge, provo sulla preview»):
      merge al verde, e la prova con i suoi file sulla preview di `main`
      dopo l'aggiornamento del server. Si spunta quando l'utente la
      conferma su quella preview.*
- [x] **B**: impronta iOS `83793e26…` invariata; senza il modulo nativo
      «From a file» non c'è. *Misurata dal Coordinatore su una copia
      pulita di `72af7335`; i test in `AddPastActivity.test.tsx` e
      `pickActivityFile.test.ts`.*
- [x] **C**: un post di sole foto si pubblica a «Everyone» o
      «Followers», si vede nel Feed con le foto e «Imported», e non entra
      nel concorso. *Test in `test_photo_posts.py`,
      `test_photo_posts_seen.py`, `FeedScreenPhotos.test.tsx`; provato nel
      simulatore il 2026-11-22.*
- [ ] **D** ed **E**: gli studi scritti, con le fonti, e la scelta
      dell'utente registrata.
- [x] I testi e la privacy approvati dall'utente prima del merge di B e C.
      *B il 2026-10-29; C il 2026-11-21 (testi, riga inglese) e il
      2026-11-22 (schermate, cancellazione, traduzioni).*

## File toccati (documenti, questa PR)

```
docs/IMPORTAZIONI.md        (nuovo)
docs/tasks/TASK-312.md      (nuovo)
docs/DECISIONS.md           (ADR-0272, in fondo)
docs/INDEX.md               (una riga)
docs/STATUS.md              (una voce in «In lavorazione»)
```

## Fuori scope

- Instagram come collegamento all'account (§1 di `IMPORTAZIONI.md`).
- Leggere gli zip; altitudine, battito, cadenza.
- «Open in MuW» dal foglio di condivisione: con la build nativa dopo.
- Caricare più file insieme, o l'archivio intero di Strava.
- Una corsa importata che conta per il gioco o il concorso: l'utente ha
  scelto di no.

## Esito

*(si compila a fine task)*

**Parte C fatta, 2026-11-22**: C1, C1b, C1c in `main` e sul server; C2
(#1386) in `main` (`3d4f0d47`), in produzione con l'OTA 23 (la chiede il
Coordinatore all'utente), poi uno sguardo sul telefono. Restano D ed E.
