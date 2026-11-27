# TASK-486 — L'attrezzatura: scarpe, bici, sci e tutto il resto, coi km

**Stato**: Done · 2026-11-26 · A–G sul server e in `main`, accesa con
#1558; esce con l'OTA dopo la 26 (vedi «Esito»)
**Fase**: 5 · **Branch**: `docs/TASK-486-gear` (parte 0), poi
`feat/TASK-486-<parte>-…` per ogni parte
**ADR**: ADR-0393 · numeri dal Coordinatore (fork 2), 2026-11-21

## Obiettivo

Ogni iscritto tiene la lista della sua attrezzatura (scarpe, bici, sci,
caschi, imbraghi, vele…), la aggancia alle attività, e ogni attrezzo conta
da solo i suoi km, le ore o le uscite. La lista si vede sul suo profilo.

## La richiesta (2026-11-21)

> «Possibilità di aggiungere il modello di scarpa, il modello di bici, lo
> sci, poi associarla alla corsa/attività, così segna i km… e poter vedere
> sul profilo dell'utente o amico tutta la sua attrezzatura, scarpe,
> vestiti anche volendo, bici, sci, scarpe arrampicata, scarpone, e possono
> aggiungere anche dei commenti all'attrezzatura, tipo quando l'hanno
> comprata.» Poi: «anche vele, imbraghi, caschi… tutto proprio».

## Contesto da leggere

- `services/api/shaperoute_api/activities.py` (docstring: il server conta
  metri e secondi di ogni attività, che resta del suo proprietario);
- `services/api/migrations/0050_outfit_tags.sql`,
  `services/api/shaperoute_api/outfit_tags.py`, `docs/API.md`
  «Outfit tags» (i capi taggati sulle foto dei post, TASK-394, ADR-0333);
- `docs/API.md` e `docs/DATABASE.md` per le foto (`drawing_photos`) e la
  visibilità del profilo;
- `apps/mobile/src/activities/RunEnd.tsx` (il modulo di fine attività).

## Scelte dell'utente (2026-11-21)

1. **Prima versione «Base + foto»**: un attrezzo ha tipo, marca e modello,
   un nome scelto da chi lo possiede, la data d'acquisto, una nota
   («comprate a Milano, mezza di Roma») e una foto. Per ogni sport un
   attrezzo predefinito che si aggancia da solo a ogni attività e si cambia
   a fine attività; i totali salgono da soli. I **commenti degli amici**
   sugli attrezzi non entrano qui: la «nota» è di chi possiede l'attrezzo.
2. **Ogni tipo di attrezzo**, «tutto proprio»: scarpe, bici, sci, scarponi,
   scarpette d'arrampicata, imbraghi, caschi, vele, tavole, pagaie, vestiti
   e un tipo «Other» libero.
3. **Collegata ai capi taggati**: l'attrezzatura è la lista fissa; quando
   si tagga una foto di un post si può scegliere un attrezzo dalla propria
   lista invece di riscrivere marca e modello, e il pallino apre
   l'attrezzo. I tag di oggi restano come sono.
4. **Visibile come il profilo**: la vede chi vede già il profilo; ogni
   attrezzo ha «Hide from profile» (i suoi totali contano lo stesso).
5. **Ritira e avviso**: «Retire» toglie un attrezzo dalla scelta e lo
   tiene nella storia coi suoi totali. Un limite facoltativo per attrezzo
   (per esempio 700 km): raggiunto, un avviso nell'app («Your Pegasus 41
   reached 700 km»). Cancellare resta possibile.
6. **Nel dettaglio del post**: una riga piccola «👟 Pegasus 41 · 412 km»
   che apre l'attrezzo. Non sulla scheda del Feed, che resta com'è. Un
   attrezzo nascosto dal profilo non si vede neanche qui.

## Decise dall'agente su delega dell'utente

- **Più attrezzi per attività** (scarpe e casco, bici e casco, imbrago e
  scarpette), al massimo 10; i predefiniti di uno sport possono essere più
  di uno. Con un attrezzo per attività casco e imbrago non conterebbero
  mai.
- **Cosa si conta** dipende dal tipo: km per scarpe, bici, sci, scarponi,
  tavole, vele, pagaie; ore e uscite per tutti. La scheda mostra la prima
  misura del tipo (km, se no ore). I numeri li conta il server dalle
  attività agganciate, come i totali del profilo: mai quelli del telefono.
- **I tipi in una lista fissa nel server** (come `OutfitItem`), con
  `other` e un nome libero: la lista può crescere con una migrazione, mai
  restringersi.
- **Le attività di prima** si agganciano a mano da «My activities»
  (dettaglio dell'attività, «Gear»); niente aggancio automatico
  all'indietro.

## Le parti

Ogni parte è una PR. Prima di ognuna la lista dei file va al Coordinatore;
server e privacy col sì dell'utente.

### Parte A — Il server (solo API, spenta nell'app)

- Migrazione `00NN_gear.sql` (il numero libero al momento):
  - `gear` (id, user_id con `ON DELETE CASCADE`, `kind` dalla lista,
    `brand`, `model`, `name`, `bought_on`, `note`, `hidden`,
    `retired_at`, `limit_m`, `created_at`);
  - `gear_photos` (una foto per attrezzo, JPEG come quelle dei post);
  - `activity_gear` (attività ↔ attrezzo, al massimo 10 per attività);
  - `gear_defaults` (sport ↔ attrezzi predefiniti);
  - `drawing_outfit_tags.gear_id` facoltativo, `ON DELETE SET NULL`;
  - `reports.kind` con `gear` (nome, nota e foto si segnalano).
- `gear.py`: `GET/POST /me/gear`, `PATCH/DELETE /me/gear/{id}`,
  `PUT/DELETE /me/gear/{id}/photo`, `PUT /me/gear/defaults/{sport}`,
  `PUT /me/activities/{key}/gear`, `GET /users/{id}/gear` con le regole
  di visibilità del profilo, senza gli attrezzi nascosti. I totali (metri,
  secondi, uscite) dalle attività agganciate.
- Nome, marca, modello e nota passano dal filtro dei commenti
  (`comment_filter`), come i capi taggati.
- `docs/API.md` «Gear», `docs/DATABASE.md`; test in PostgreSQL vero.
- **Privacy** nelle cinque lingue e sul sito prima che l'app la mostri
  (testo approvato dall'utente). Server: un passo, col sì dell'utente.

**Com'è uscita** (PR #1372, `ea133ae1`, server allo step 17 del
2026-11-22): migrazione `0083_gear.sql`; l'attrezzo cambia con
`PUT /me/gear/{id}` intero, non `PATCH`; i predefiniti sono il campo
`defaults` dell'attrezzo, non una rotta a parte; in più
`GET /me/activities/{key}/gear`, `GET /gear/{id}` e la sua foto.
`drawing_outfit_tags.gear_id` passa alla parte F (rompeva
`test_outfit_tags`). Le rotte in `docs/API.md` «Gear».

### Parte B — La lista e la scheda dell'attrezzo (app)

- «Gear» da «Settings» e dal proprio profilo: la lista divisa in «In use»
  e «Retired», «Add gear», la scheda con foto, tipo, marca, modello, nome,
  data, nota, limite, «Hide from profile», «Retire», «Delete».
- I predefiniti per sport nella scheda («Use by default for: Run, Trail»).
- File nuovi in `apps/mobile/src/gear/`; testi in en/it/de/fr/es.

### Parte C — Fine attività e «My activities»

- Nel modulo di fine attività una riga «Gear» coi predefiniti dello sport
  già scelti; si tolgono o se ne aggiungono altri. Anche nel dettaglio di
  un'attività salvata.
- `RunEnd.tsx` è un punto caldo (il `saveRef` di TASK-478): la riga va in
  un componente nuovo, in `RunEnd.tsx` solo l'aggancio, col via del
  Coordinatore.

### Parte D — Sul profilo

- Una sezione «Gear» in `ProfileHome.tsx` e `UserProfilePage.tsx`: le
  schede degli attrezzi in uso, poi «Retired». Le due pagine oggi le tocca
  TASK-309 B1: la sezione è un componente nuovo, l'aggancio nelle pagine
  dopo il merge di 309 B1.

### Parte E — Nel dettaglio del post

- Il dettaglio di un disegno porta `gear` (gli attrezzi agganciati e non
  nascosti, coi totali); nell'app la riga «👟 Pegasus 41 · 412 km» apre
  la scheda dell'attrezzo. Le app di prima ignorano il campo.

### Parte F — I capi taggati dalla propria attrezzatura

- Nell'editor dei tag di una foto, «From my gear»: scelto un attrezzo,
  tipo, marca e modello vengono da lì e il tag tiene `gear_id`; il pallino
  apre l'attrezzo (e «Shop» resta com'è, se c'è un link).

### Parte G — L'avviso del limite

- Quando un'attività porta un attrezzo oltre il suo limite, una voce nella
  campanella, una volta sola per limite; niente push nella prima versione.

## Criteri di accettazione (per tutto il task)

- [ ] Un iscritto aggiunge un attrezzo di ogni tipo della lista, con foto
      e nota, e lo trova nella sua lista.
- [ ] Un'attività salvata con un predefinito fa salire i totali di
      quell'attrezzo dei metri e dei secondi contati dal server.
- [ ] Chi vede il profilo vede la sezione «Gear» senza gli attrezzi
      nascosti; chi non vede il profilo riceve 404 da
      `GET /users/{id}/gear`.
- [ ] Un attrezzo ritirato non compare nella scelta di fine attività e
      tiene i suoi totali.
- [x] Un limite superato dà una sola voce nella campanella
      (`test_gear_limit.py`, parte G1).
- [x] Nel dettaglio di un post si vede la riga dell'attrezzo, non sulla
      scheda del Feed (parte E, provato nel simulatore il 2026-11-23).
- [x] Un tag di foto fatto da «From my gear» apre l'attrezzo (parte F,
      provato nel simulatore il 2026-11-23).
- [ ] Cancellare l'account cancella attrezzi, foto e agganci.
- [ ] La privacy lo dice nelle cinque lingue e sul sito prima dell'uscita.

## File toccati

Parte 0 (questa PR, soli documenti):

```
docs/tasks/TASK-486.md        (nuovo)
docs/DECISIONS.md
docs/STATUS.md
docs/INDEX.md
```

Le liste delle parti A–G si scrivono qui prima di ogni parte, dopo il via
del Coordinatore.

Parte A (PR #1372, in `main` il 2026-11-21, `ea133ae1`):

```
services/api/migrations/0083_gear.sql          (nuovo)
services/api/shaperoute_api/gear.py            (nuovo)
services/api/tests/test_gear.py                (nuovo)
services/api/shaperoute_api/app.py
services/api/shaperoute_api/moderation.py
services/api/shaperoute_api/report_email.py
services/api/tests/test_moderation.py
packages/shared-types/src/index.ts             (REPORT_KINDS con "gear")
packages/shared-types/test/moderation.test.ts
docs/API.md
docs/DATABASE.md
```

Parte B (PR #1377, in `main` il 2026-11-22, `77442332`; testi e
schermate approvati dall'utente il 2026-11-22):

```
packages/shared-types/src/gear.ts              (nuovo)
packages/shared-types/test/gear.test.ts        (nuovo)
packages/shared-types/fixtures/gear.json       (nuovo)
packages/shared-types/fixtures/gear-list.json  (nuovo)
packages/shared-types/fixtures/gear-request.json (nuovo)
packages/shared-types/src/index.ts
apps/mobile/src/api/gear.ts                    (nuovo)
apps/mobile/src/api/gear.test.ts               (nuovo)
apps/mobile/src/gear/gearOn.ts                 (nuovo, GEAR_ON = false)
apps/mobile/src/gear/gearKinds.ts              (nuovo)
apps/mobile/src/gear/gearKinds.test.ts         (nuovo)
apps/mobile/src/gear/GearSetting.tsx           (nuovo)
apps/mobile/src/gear/GearSetting.test.tsx      (nuovo)
apps/mobile/src/gear/GearPage.tsx              (nuovo)
apps/mobile/src/gear/GearEditor.tsx            (nuovo)
apps/mobile/src/profile/SettingsPage.tsx       (una riga)
apps/mobile/src/i18n/{it,de,fr,es}.ts
```

Parte C (PR #1439, in `main` il 2026-11-23, `5b315253`; testi e
schermate approvati dall'utente il 2026-11-23):

```
apps/mobile/src/gear/gearOut.ts                (nuovo)
apps/mobile/src/gear/gearOut.test.ts           (nuovo)
apps/mobile/src/gear/GearPicker.tsx            (nuovo)
apps/mobile/src/gear/GearPicker.test.tsx       (nuovo)
apps/mobile/src/gear/ActivityGear.tsx          (nuovo)
apps/mobile/src/gear/ActivityGear.test.tsx     (nuovo)
apps/mobile/src/activities/RunEndGear.test.tsx (nuovo)
apps/mobile/src/activities/activitiesDoorGear.test.tsx (nuovo)
apps/mobile/src/activities/RunEnd.tsx          (solo l'aggancio)
apps/mobile/src/activities/ActivityCard.tsx    (una voce nel «…»)
apps/mobile/src/activities/activitiesDoor.ts
apps/mobile/src/api/gear.ts
apps/mobile/src/api/gear.test.ts
apps/mobile/src/i18n/{it,de,fr,es}.ts
```

Parte D (PR #1463, in `main` il 2026-11-23, `42498201`; schermate
approvate dall'utente il 2026-11-23, nessun testo nuovo):

```
apps/mobile/src/api/profileGear.ts             (nuovo)
apps/mobile/src/api/profileGear.test.ts        (nuovo)
apps/mobile/src/gear/GearRow.tsx               (nuovo, tolto da GearPage)
apps/mobile/src/gear/GearSheet.tsx             (nuovo, la scheda in sola lettura)
apps/mobile/src/gear/ProfileGear.tsx           (nuovo)
apps/mobile/src/gear/ProfileGear.test.tsx      (nuovo)
apps/mobile/src/gear/GearPage.tsx
apps/mobile/src/profile/ProfileHome.tsx        (una riga)
apps/mobile/src/profile/UserProfilePage.tsx    (una riga)
```

PR docs di A–D (#1477): `docs/tasks/TASK-486.md`, `docs/STATUS.md`.

Parte E1, server (PR #1485, in `main` il 2026-11-23, `c8c9577a`; sul
server dal passo 21):

```
services/api/shaperoute_api/gear.py            (GET /drawings/{id}/gear)
services/api/tests/test_gear_post.py           (nuovo)
docs/API.md
```

Parte E2, app (PR #1511, in `main` il 2026-11-23, `1e38222f`; schermate
approvate dall'utente il 2026-11-23, nessun testo nuovo). La riga va nella
pagina del post (`PostPage`), non in `DrawingCard`, che è la scheda sulla
mappa (ok del Coordinatore):

```
apps/mobile/src/api/postGear.ts                (nuovo)
apps/mobile/src/api/postGear.test.ts           (nuovo)
apps/mobile/src/gear/PostGear.tsx              (nuovo)
apps/mobile/src/gear/PostGear.test.tsx         (nuovo)
apps/mobile/src/feed/PostPage.tsx              (una riga)
```

Parte F1, server (PR #1492, in `main` il 2026-11-23, `792303c1`; sul
server dal passo 21):

```
services/api/migrations/0085_outfit_gear_link.sql (nuovo)
services/api/shaperoute_api/outfit_tags.py
services/api/tests/test_outfit_gear.py         (nuovo)
services/api/tests/test_outfit_tags.py         (le chiavi esterne)
packages/shared-types/src/index.ts             (gear_id nel tag)
docs/API.md
docs/DATABASE.md
```

Parte F2, app (PR #1530, in `main` il 2026-11-23, `d2db0fe2`; testo
«From my gear» e schermate approvati dall'utente il 2026-11-23):

```
apps/mobile/src/api/gearItem.ts                (nuovo, GET /gear/{id})
apps/mobile/src/api/gearItem.test.ts           (nuovo)
apps/mobile/src/gear/GearTagChoice.tsx         (nuovo)
apps/mobile/src/gear/GearTagChoice.test.tsx    (nuovo)
apps/mobile/src/gear/TagGear.tsx               (nuovo)
apps/mobile/src/gear/TagGear.test.tsx          (nuovo)
apps/mobile/src/social/outfit/OutfitTagGear.test.tsx (nuovo)
apps/mobile/src/social/outfit/outfitTags.ts
apps/mobile/src/social/outfit/outfitTags.test.ts
apps/mobile/src/social/outfit/OutfitTagEditor.tsx
apps/mobile/src/social/outfit/OutfitTagSheet.tsx
apps/mobile/src/i18n/{it,de,fr,es}.ts
```

Parte G1, server (PR #1500, in `main` il 2026-11-23, `0e4d46ee`; testi
dell'avviso approvati dall'utente il 2026-11-23; sul server col passo
dopo il 21). Il test instabile di `test_gear_post.py` (l'orologio fermo)
è la #1499 (`75380a9f`):

```
services/api/shaperoute_api/gear.py            (l'avviso quando si passa il limite)
services/api/shaperoute_api/push.py            (gear_limit in BELL_ONLY)
services/api/shaperoute_api/notification_list.py
services/api/tests/test_gear_limit.py          (nuovo)
services/api/tests/test_gear_post.py
services/api/tests/test_comment_threads.py     (BELL_ONLY può crescere)
packages/shared-types/src/index.ts             (opens con gear_id)
docs/API.md
```

Parte G2, app (PR #1536, in `main` il 2026-11-23, `70c15c0f`; nessun
testo e nessuna schermata nuova: apre l'editor della parte B):

```
apps/mobile/src/gear/gearDoor.ts               (nuovo)
apps/mobile/src/gear/GearFromBell.tsx          (nuovo)
apps/mobile/src/gear/GearFromBell.test.tsx     (nuovo, anche la porta)
apps/mobile/src/notifications/notificationTap.ts
apps/mobile/src/notifications/notificationTap.test.ts
apps/mobile/src/notifications/openTarget.ts
apps/mobile/src/screens/ProfileLayer.tsx       (tre righe)
```

PR docs di E–G (#1537): `docs/tasks/TASK-486.md`, `docs/STATUS.md`,
`docs/DECISIONS.md` (ADR-0393, precisazione E–G).

Accensione (PR #1558, in `main` il 2026-11-24, `faf37daf`; sì
dell'utente al Coordinatore, «Sì procedi»). Con l'attrezzatura accesa,
quattro test che contano le richieste in ordine la tengono spenta per sé
(una riga di mock ciascuno, ok del Coordinatore):

```
apps/mobile/src/gear/gearOn.ts                 (GEAR_ON = true)
apps/mobile/src/feed/PostPage.test.tsx
apps/mobile/src/profile/UserProfileFollow.test.tsx
apps/mobile/src/profile/UserProfileReport.test.tsx
apps/mobile/src/screens/PeopleScreen.test.tsx
```

PR docs finale (questa): `docs/tasks/TASK-486.md`, `docs/STATUS.md`,
`docs/archive/COMPLETATI.md`.

## Per chi costruisce sopra l'attrezzatura

TASK-494 (le scadenze della vela, ADR-0401) e chi verrà dopo:

- un tipo nuovo va in tre posti: `GearKind` di `gear.py`, `GEAR_KINDS`
  di `packages/shared-types/src/gear.ts`, `GEAR_LOOKS` di
  `apps/mobile/src/gear/gearKinds.ts`;
- le proprie righe nella campanella sono un `kind` nuovo, non
  `gear_limit`, con la loro condizione in `notification_list.shown_sql`;
- l'attrezzo dalla campanella si apre con `openGearItem`
  (`gear/gearDoor.ts`);
- il corpo di `GearBody` non cambia: le app di oggi lo leggono così.

## Fuori scope

- I commenti degli amici sugli attrezzi (scelta 1: una parte dopo, se
  l'utente la chiede).
- Prendere l'attrezzatura da Strava o Garmin, mandarla a Strava.
- Link ai negozi sull'attrezzo e conteggi di «Shop» (restano dei capi
  taggati).
- Push per il limite, suggerimenti di sostituzione, prezzi.
- Agganciare da sole le attività di prima.

## Esito

Done il 2026-11-26. L'attrezzatura è tutta sul server (passi 17, 21 e
22) e accesa nell'app dal 2026-11-24 (#1558): la lista con foto e nota,
gli attrezzi a fine attività e in «My activities», la sezione sul profilo,
la riga nella pagina del post, «From my gear» nei capi taggati e il limite
nella campanella che apre l'attrezzo. Privacy online (#1480). Arriva sui
telefoni con l'OTA dopo la 26, che pubblica il Coordinatore; la Guida
dell'app non ne parla ancora (un task a parte, se l'utente lo vuole).
