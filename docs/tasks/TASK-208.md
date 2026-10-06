# TASK-208 — Pubblicare una corsa in stile Strava

**Stato**: In lavorazione — parte A (l'API) fatta il 2026-10-03; parte B
(l'app) in PR #425 dal 2026-10-06, con le proposte confermate dall'utente:
aspetta il merge e la prova sull'iPhone
**Fase**: 4 · **Branch**: `feat/TASK-208-publish-api` (parte A),
`feat/TASK-208-publish-app` (parte B)
**Dipende da**: TASK-117 (fatto), TASK-211 (parte A per la nostra A, parte
B per la nostra B) · **ADR**: ADR-0170

## Obiettivo

A fine corsa chi ha un account compila la sua attività come su Strava:
la mappa in cima con fino a tre foto, il titolo, com'è andata, le persone
taggate, il tipo di attività e chi la può vedere. Gli altri vedono tutto
questo nel disegno.

## Com'è oggi (TASK-117, ADR-0159, ADR-0166)

Sopra «Save» e «Discard» (`RunEnd.tsx`): l'interruttore «Public», spento a
ogni corsa, e un solo campo «Title» (anche il nome su Strava), poi «Send
to Strava». Nell'API `drawings` ha `title` e `public` (migrazione `0009`);
una corsa (`runs`) non sa se era corsa, bici o canoa. Le stesse due voci
stanno sulla scheda di una corsa in «My activities» (`PublicRow.tsx`).

## Le scelte dell'utente (2026-10-03)

1. **I campi**, in quest'ordine: titolo, descrizione, persone da taggare,
   tipo di attività, chi la può vedere. La mappa resta in cima.
2. **La descrizione** è un campo vuoto con scritto in grigio «How did it
   go?», come Strava. Punteggio, km e tempo restano accanto alla mappa.
3. **Le foto**: la mappa è la prima immagine; se ne aggiungono **fino a
   tre**, dal rullino o dalla fotocamera.
4. **Chi la può vedere**: **«Everyone», «Followers», «Only me»**, subito.
   «Followers» vuole il «segui», che non c'è: è **TASK-211**, con
   richiesta da accettare (scelta dell'utente), e va prima.
5. **Le persone da taggare** sono iscritti a Sgrava, cercati per nome
   (la ricerca è di TASK-211). I nomi taggati compaiono sul disegno e
   aprono il loro profilo. Nessuna notifica finché non c'è TASK-185.
6. **Le foto restano sul telefono finché la corsa è «Only me»** (scelta
   del 2026-10-03, durante la parte A: «usare più la memoria dei telefoni
   che la nostra»). Vanno sul server solo con «Everyone» o «Followers»;
   rimessa «Only me», il server le cancella. Le corse restano sul server
   come oggi (circa 50 KB l'una: servono a punteggio, Strava e a un
   secondo telefono). Persi il telefono o l'app, si perdono le foto delle
   corse private.

## Proposte dell'agente (da confermare con l'utente prima della parte B)

- «Who can see it» parte da **«Only me»** a ogni corsa, come oggi
  «Public» spento (scelta dell'utente per TASK-117).
- **Il tipo di attività**: «Run», «Bike», «Paddle», scelto in partenza
  dallo sport di «Settings» (TASK-189, TASK-205); cambia anche il tipo
  su Strava. Non cambia il punteggio.
- **Strava**: titolo, descrizione e tipo vanno anche a Strava; le foto no
  (l'API di Strava non le accetta). «Send to Strava» resta dov'è.
- **La scheda di una corsa in «My activities»** ha lo stesso modulo, per
  cambiare dopo (oggi lì ci sono «Public» e «Title»).
- Al più **10 persone** taggate; descrizione al più **500 caratteri**.
- **La canoa su Strava** è `StandUpPaddling`: **scelta dell'utente** del
  2026-10-03, fra `Canoeing` (la proposta), `Kayaking` e `StandUpPaddling`.
  Prima bici e canoa arrivavano su Strava come «Run»; da TASK-208 A la
  bici è `Ride`.
- **Un avviso sulle foto delle corse «Only me»** (scelta 6): le foto
  esistono solo sul telefono. Chi cancella l'app o cambia telefono le
  perde, e una corsa che torna «Only me» perde le foto sul server. Testo
  proposto, sotto «Who can see it» quando è «Only me» e la corsa ha foto:
  «Photos of a run only you can see stay on this phone. Delete the app or
  change phone and they are gone.». Quando una corsa con foto passa da
  «Everyone» o «Followers» a «Only me»: «Its photos leave Sgrava and stay
  only on this phone.». **Confermati dall'utente** il 2026-10-03 («ok va
  bene»), dopo che gli è stato detto il motivo.
- I testi nuovi: «How did it go?», «Tag people», «Activity» («Run»,
  «Bike», «Paddle»), «Who can see it» («Everyone», «Followers», «Only
  me»), «Add photo». Da far confermare, e da passare a TASK-210 (la
  lingua dell'app) quando entrano.

## Contesto da leggere

- `docs/DECISIONS.md` ADR-0114 (punto 4), ADR-0146 (foto del profilo),
  ADR-0156 (Strava), ADR-0159, ADR-0166
- `docs/API.md` «Drawings», «My activities», «Send to Strava»
- `docs/DATABASE.md` `runs`, `drawings`, `profile_photos`
- `docs/UI.md` «La fine della corsa», «My activities»
- `docs/tasks/TASK-211.md` (la ricerca degli iscritti e `follows`)

## Parte A — l'API

1. Migrazione nuova (il primo numero libero in `main` al merge):
   - `drawings.public` diventa `visibility` (`everyone`, `followers`,
     `only_me`): `true` → `everyone`, `false` → `only_me`;
   - `drawings.description` (al più 500 caratteri);
   - `runs.activity` (`running`, `cycling`, `paddling`, per difetto
     `running`): ogni corsa di prima era una corsa a piedi;
   - `drawing_photos`: fino a 3 per disegno, in ordine, JPEG rifatti
     dall'API senza EXIF, come `profile_photos` (ADR-0146), nel database;
   - `drawing_tags`: le persone taggate (account, ordine), al più 10;
     cancellato l'account taggato, il tag sparisce.
2. `PUT /me/activities/{key}/drawing` prende titolo, descrizione,
   visibilità, attività e tag (`public_id` degli iscritti); le foto con
   `PUT` e `DELETE /me/activities/{key}/drawing/photos/{n}` (n da 1 a 3).
   `PUT /me/activities/{key}` accetta `activity`.
3. Chi vede cosa: `everyone` tutti gli iscritti; `followers` chi segue il
   proprietario con la richiesta accettata (`follows` di TASK-211);
   `only_me` nessun altro. Gli altri hanno «non trovato», come oggi un
   disegno privato. La traccia resta tagliata dei 200 m.
4. Il disegno per gli altri ha descrizione, attività, i tag (nome e
   `public_id`) e gli indirizzi delle foto; `GET
   /drawings/{id}/photos/{n}`.
5. Strava: descrizione e tipo di attività nell'invio (`strava.py`).
6. Test, `API.md`, `DATABASE.md`, ADR-0170.

## Parte B — l'app

1. La fine della corsa (`RunEnd.tsx`, `FinishScreen.tsx`): in cima la
   mappa e accanto «Add photo» (fino a tre), sotto punteggio, km e tempo;
   poi titolo, «How did it go?», «Tag people» (la ricerca di TASK-211),
   «Activity», «Who can see it», «Send to Strava», «Discard» e «Save».
2. Lo stesso modulo sulla scheda di una corsa in «My activities»
   (`PublicRow.tsx`).
3. Senza rete la scelta e le foto aspettano sul telefono, come oggi
   `drawings-outbox.json` (le foto già ridotte, in un file). Le foto
   restano sul telefono anche dopo, per le corse «Only me», e vanno al
   server solo quando la corsa si apre agli altri (scelta 6, «Esito»,
   «Per la parte B»).
4. Il disegno aperto (`DrawingCard.tsx`): mappa e foto da scorrere,
   descrizione, attività, i nomi taggati che aprono il profilo.
5. Test, `UI.md`, i testi nuovi.

## Criteri di accettazione

- [x] Un disegno `followers` lo vede chi segue con la richiesta
      accettata; chi ha solo chiesto, o non segue, ha «non trovato»
      (test).
- [x] Un disegno `only_me` dà «non trovato» a chiunque altro (test).
- [x] La migrazione porta ogni `public` di prima nella visibilità
      giusta (test).
- [x] Una quarta foto, o un undicesimo tag, sono rifiutati (`422`, test).
- [x] Le foto non hanno EXIF (test, come per la foto del profilo).
- [x] Taggare un account che non esiste dà `422`; cancellato un account
      taggato, il suo nome sparisce dal disegno (test).
- [x] Senza rete titolo, descrizione, tag, visibilità e foto non si
      perdono (parte B: `drawingOutbox.test.ts`, `drawingPhotos.test.ts`,
      `activitiesDoorDrawing.test.tsx`, `PublicRow.test.tsx`).
- [x] Con «Send to Strava» descrizione e tipo arrivano nell'invio (test
      con Strava finto).
- [x] Test verdi dell'API e dell'app (l'API nella parte A; l'app nella
      parte B, 338 file verdi in locale).
- [ ] Prova sull'iPhone, dopo l'aggiornamento del server, con l'ok
      dell'utente.

## File toccati

Parte A:

```
services/api/migrations/00NN_drawing_details.sql   (nuovo)
services/api/shaperoute_api/drawings.py
services/api/shaperoute_api/drawing_photos.py      (nuovo)
services/api/shaperoute_api/activities.py
services/api/shaperoute_api/strava.py
services/api/shaperoute_api/app.py
services/api/tests/test_drawings.py
services/api/tests/test_drawing_photos.py          (nuovo)
packages/shared-types/                              (contratto e fixture)
docs/API.md, docs/DATABASE.md, docs/DECISIONS.md, docs/STATUS.md
services/api/shaperoute_api/strava_client.py       (ok del coordinatore: `upload` prende `sport_type`)
services/api/tests/test_strava.py                  (ok del coordinatore: il test con Strava finto)
services/api/tests/test_activities.py              (ok del coordinatore: due righe, il modello ha `activity`)
services/api/shaperoute_api/profiles.py            (ok del coordinatore: il numero dei disegni per chi guarda)
services/api/shaperoute_api/comments.py            (ok del coordinatore: i commenti seguono `drawing_seen_sql`)
```

Parte B:

```
apps/mobile/src/activities/RunEnd.tsx
apps/mobile/src/screens/FinishScreen.tsx
apps/mobile/src/social/PublicParts.tsx
apps/mobile/src/social/PublicRow.tsx
apps/mobile/src/social/DrawingCard.tsx
apps/mobile/src/social/drawingOutbox.ts
apps/mobile/src/social/                             (file nuovi)
apps/mobile/src/api/drawings.ts
apps/mobile/src/strava/StravaRunEnd.tsx
docs/UI.md, docs/DECISIONS.md, docs/STATUS.md
apps/mobile/src/activities/outbox.ts                (ok dell'utente 2026-10-06: la scelta intera con la corsa)
apps/mobile/src/activities/activitiesDoor.ts        (ok dell'utente: disegno prima di Strava, foto a «Save» e con la corsa cancellata)
apps/mobile/src/activities/ActivitiesList.tsx       (una parola: `waitingText` prende la visibilità)
apps/mobile/src/social/drawingsDoor.ts              (ok dell'utente: la scelta intera, le foto con il token)
apps/mobile/src/screens/ProfileLayer.tsx            (ok dell'utente: `FollowsContext` anche intorno all'app)
apps/mobile/src/i18n/it.ts, de.ts, es.ts, fr.ts     (ok dell'utente: i testi nuovi)
apps/mobile/package.json, package-lock.json         (`expo-image-manipulator`, ok dell'utente)
apps/mobile/__tests__/AppDrawings.test.tsx, AppStrava.test.tsx, e i test
che usavano la scelta a due campi (`drawingsDoor`, `drawingOutbox`,
`DrawingsGrid`, `deleteAccountQueues`, `api/drawings`)
```

## Fuori scope

- Il «segui», la ricerca degli iscritti, «Requests»: TASK-211.
- Notifiche a chi è taggato o a chi segue: TASK-185.
- Togliersi da un tag, segnalare, bloccare: TASK-121.
- Il feed dei disegni di chi segui: TASK-118.
- Like e commenti: TASK-119, TASK-120.
- Le foto su Strava.

## Esito

### Parte A — l'API (2026-10-03, ADR-0170)

In `main` dal 2026-10-03 con la PR #268 (merge `ebb4f38`), migrazione
`0014_drawing_details.sql` (`0012` e `0013` sono di #263 e #260, entrate
prima); CI 5/5 verde. Non sul server.

**La scelta dell'utente presa durante il task** (2026-10-03, domanda del
coordinatore): la descrizione **non passa dal filtro dei commenti
negativi** di ADR-0176. Il titolo neppure.

**Cosa funziona**:
- **`visibility`** (`everyone`, `followers`, `only_me`) al posto di
  `public`. La migrazione porta ogni pubblico a `everyone` e ogni privato
  a `only_me` (test con dati sullo schema 0001–0013). `public` resta, come
  colonna generata e nelle risposte (vero quando `visibility` è
  `everyone`), per l'app di oggi e per l'SQL scritto prima.
- **Chi vede cosa** sta in una funzione sola, `drawing_seen_sql(viewer)`:
  vale per il disegno, per le sue foto e, quando TASK-120 la userà, per i
  suoi commenti. Il profilo conta ed elenca quello che chi guarda vede: a
  chi non segue i `everyone`, a chi segue anche i `followers`, al
  proprietario i suoi pubblicati.
- **Il `PUT` del disegno** prende:
  - `visibility`, oppure `public` dall'app di prima, mai tutti e due;
  - `description`, al più 500 caratteri, con gli a capo;
  - `activity`;
  - `tags`, al più 10 `public_id` in ordine: né sé stessi, né lo stesso
    due volte, né chi non è iscritto.

  Se `description`, `activity` e `tags` mancano, restano come sono: così
  l'app di oggi non li cancella.
- **Le foto**: `PUT` e `DELETE /me/activities/{key}/drawing/photos/{n}`,
  in posti da 1 a 3 che non si spostano. L'API le raddrizza, le riduce a
  1080 px sul lato lungo e le rifà JPEG senza EXIF; al più 20 `PUT` al
  minuto. Chi vede il disegno le legge da `GET /drawings/{id}/photos/{n}`:
  JPEG, con il token, e un `?v=` che cambia con la foto.
- **Le foto solo per i disegni che altri vedono** (scelta 6): su una corsa
  senza disegno o `only_me` il `PUT` di una foto è `409 http_error`
  («Photos stay on the phone while only you see this run: choose Everyone
  or Followers first.»); il `PUT` del disegno con `only_me` cancella le
  sue foto dal server.
- **`runs.activity`**: il `PUT` della corsa prende `activity`, per
  difetto `running`; il disegno la cambia e la mostra.
- **Strava**: il `sport_type` viene dall'attività (`Run`, `Ride`,
  `StandUpPaddling`). La descrizione è «How did it go?» seguita dalla riga di
  Sgrava. Viene dal corpo dell'invio (`description`, accanto a `name`) o,
  se manca, dal disegno.
- **Contratto** (`shared-types`):
  - tipi nuovi: `Visibility`/`VISIBILITIES`, `DrawingTag`,
    `DrawingPhoto`, `DrawingPhotoRequest` e i limiti;
  - i campi nuovi sono facoltativi (un'API di prima non li ha), e
    `DrawingRequest.public` diventa facoltativo;
  - fixture nuove: `drawing-request-details.json`,
    `my-drawing-details.json`, `drawing-details.json`,
    `drawings-details.json`, `drawing-photo-request.json`,
    `activity-request-cycling.json`, `strava-send-description.json`;
  - le fixture di prima non cambiano, perché l'app le importa con i loro
    tipi.

**File oltre all'elenco** (ok del coordinatore il 2026-10-03, scritti in
«File toccati»):
- `strava_client.py`: `upload` prende `sport_type`;
- `test_strava.py`: il test con Strava finto;
- `test_activities.py`: due righe, perché il modello ha `activity`;
- `profiles.py`: il numero dei disegni per chi guarda;
- `comments.py`: due righe, vedi sotto.

**Il seguito di TASK-120 è chiuso qui** (i commenti di un disegno
«Followers»). `comments.py` (#260, già in `main`) chiedeva `d.public OR
r.user_id = %s`, che con la colonna generata funzionava ancora, ma per
difetto: chi segue vedeva il disegno e non i suoi commenti. Ora chiede
`drawing_seen_sql('%s')`, con lo stesso valore una volta sola; il test è in
`test_drawings.py`.

**Scelta dell'utente** (2026-10-03): la canoa va su Strava come
`StandUpPaddling` (proposta era `Canoeing`).

**Per la parte B**:
- **Le foto sono del telefono** (scelta 6): l'app le tiene (già ridotte,
  in un file per foto, accanto a `drawings-outbox.json`) per ogni corsa
  che ne ha. Manda prima il `PUT` del disegno, poi le foto, solo con
  «Everyone» o «Followers»; con «Only me» non ne manda, e quando il
  disegno si riapre agli altri le rimanda. Un `409` vuol dire che il
  disegno è ancora `only_me` per l'API: la foto resta in coda. Cancellata
  la corsa, l'app cancella le sue foto. Le foto di una corsa privata non
  passano da un telefono all'altro;
- **Da dire all'utente** prima della parte B: con «Only me» le foto
  esistono solo sul telefono, quindi cancellando l'app o cambiando
  telefono si perdono, e una corsa che torna «Only me» perde le foto sul
  server. Detto all'utente il 2026-10-03; l'avviso è in «Proposte
  dell'agente», con i due testi confermati;
- per i tag si riusa la ricerca degli iscritti di TASK-215,
  `src/social/PeopleSearch.tsx` (#264, ADR-0178), non più un componente
  di TASK-211 B;
- le foto si mostrano dal loro indirizzo, con il token nelle intestazioni
  dell'immagine.

**Note per il deploy**:
- La migrazione è veloce: aggiunge colonne con un default costante e due
  tabelle vuote. `drawings` si riscrive una volta, per la colonna
  generata, con le poche righe di oggi.
- **Lo spazio delle foto**: contano solo i disegni che altri vedono (scelta
  6), le foto delle corse private restano sui telefoni. Una foto vera a
  1080 px pesa circa 0,1–0,3 MB
  (misurate: 0,1 MB una foto liscia, 0,25 MB una piena di dettagli,
  0,8 MB il rumore puro, il caso peggiore). Con tre foto un disegno pesa
  di solito 0,3–0,9 MB. **Ogni copia di notte le ripete**, e un JPEG non
  si comprime: con le 13 copie tenute (TASK-122) il disco ne porta circa
  14 volte tanto. Stime, a 0,2 MB a foto:

  | Disegni visti da altri, con tre foto | Nel database | Con le copie |
  |---|---|---|
  | 100 | circa 60 MB | circa 0,8 GB |
  | 1 000 | circa 0,6 GB | circa 8 GB |
  | 10 000 | circa 6 GB | circa 80 GB, tutto il disco del CX33 |

  Prima di migliaia di iscritti le foto vanno tolte dal database (un
  volume o un object storage, scelta dell'utente), oppure servono meno
  copie che le tengano.
- `docker system df` e `df -h` sul server prima e dopo il primo mese, per
  vedere la crescita vera.

**Non fatto**: niente sul server né sul telefono. Servono la parte B,
l'aggiornamento del server e l'ok dell'utente. (Il server ha la `0014`
dal 2026-10-06, con `d7b490f1`.)

### Parte B — l'app (2026-10-06, PR #425, ADR-0170 «Parte B»)

**Le conferme dell'utente** (2026-10-06, prima di scrivere): tutte e sei
le proposte dell'agente («Only me» a ogni corsa; «Activity» dallo sport di
«Settings», anche per il tipo su Strava; Strava senza foto; lo stesso
modulo in «My activities»; 10 tag e 500 caratteri; i testi). Poi il **sì**
ai sei file fuori dall'elenco (scritti sopra in «File toccati») e alla
dipendenza `expo-image-manipulator`, per ridurre le foto a 1080 px sul
telefono.

**Cosa funziona** (test verdi, 338 file in locale; `typecheck`, `lint`,
`format:check` puliti):
- **La fine corsa** (`RunEnd.tsx`): il modulo in un riquadro che scorre
  (metà schermo), nell'ordine dell'utente: foto («Add photo» → «Choose a
  picture» / «Take a photo», fino a tre, ognuna con la «×»), «Title», «How
  did it go?», «Tag people», «Activity», «Who can see it»; sotto, Strava;
  fuori dal riquadro «Discard» e «Save». Con «Save» la scelta intera va con
  la corsa (`toDrawing`) e le foto con lei (`toPhotos`); niente di scelto,
  niente di più. I testi di `RunEnd` passano da `t()`.
- **La scelta intera** (`DrawingChoice` in `api/drawings.ts`: titolo,
  descrizione, attività, tag con i nomi, visibilità) in `outbox.ts`,
  `drawingOutbox.ts` e `drawingsDoor.ts`; i file dell'app di prima
  (`{title, public}`) si leggono e si fanno interi. `PUT` con tutti i
  campi, i tag come `public_id`.
- **Le foto sul telefono** (`drawingPhotos.ts`, nuovo): un file per foto
  (`drawing-photo-{account}-{chiave}-{posto}.b64`) e `drawing-photos.json`
  (`sent`, `removed`); `syncPhotos` dopo ogni `PUT` del disegno riuscito:
  con «Only me» tutte da rimandare, se no i `PUT` dei posti non ancora
  sull'API e i `DELETE` dei posti svuotati; `409`, rete e API occupata
  lasciano foto e disegno in coda; `422` butta la foto; la corsa cancellata
  cancella le foto (`activitiesDoor.remove`).
- **Il disegno prima di Strava** in `activitiesDoor.send`: Strava prende
  descrizione e tipo dal disegno.
- **La scheda di «My activities»** (`PublicRow.tsx`): lo stesso modulo
  (40 % dello schermo); pillole, tag e foto mandano subito; titolo e
  descrizione a tastiera chiusa; rifiutata, il modulo torna a com'era;
  «Only me» con foto dice che lasciano Sgrava.
- **Il disegno aperto** (`DrawingCard.tsx`): «Run · 4.0 km», le foto da
  scorrere (160 pt, con il token), la descrizione, i nomi taggati che
  aprono il profilo da `FollowsContext` (ora anche intorno all'app, una
  riga in `ProfileLayer.tsx`).
- **I tag** (`TagPeople.tsx`, nuovo): la ricerca di TASK-215 in un foglio
  dal basso.
- **La riduzione** (`pickDrawingPhoto.ts`, nuovo): il picker senza
  ritaglio, poi `expo-image-manipulator` a 1080 px sul lato lungo, JPEG
  0,8; fotocamera negata → la riga rossa e «Open Settings».
- **24 testi nuovi** in it/de/es/fr (`tables.test.ts` verde).

**Non fatto / da fare dopo**:
- la **prova sull'iPhone** (l'aspetto del modulo, il foglio dei tag, le
  foto vere): aspetta l'utente, dopo la pubblicazione;
- cancellato l'account, i file delle foto restano sul telefono
  (`forgetAllPhotosOf` c'è; `useAccount.ts` non è del task);
- il `409` e il `404` di una foto si leggono uguali (`http_error`, l'app
  non ha lo stato HTTP): dopo un `PUT` del disegno riuscito si prende per
  `409`;
- `docs/API.md` e `DATABASE.md` non cambiano (parte A).
