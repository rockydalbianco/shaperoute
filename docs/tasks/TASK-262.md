# TASK-262 — Le notifiche inviate davvero: push, email, amici dalla rubrica

**Stato**: In lavorazione (parte A) · B e C Todo
**Fase**: 4 · **Branch**: `feat/TASK-262-a-push` (parte A)
**Dipende da**: TASK-185 (i due interruttori), TASK-211 (follow),
TASK-119 (reazioni), TASK-120 (commenti), TASK-208 (tag), TASK-121
(bloccare: i ganci della parte A entrano dopo di lui)
**ADR**: ADR-0226

## Obiettivo

Gli interruttori «Email notifications» e «Push notifications» di
«Settings» (TASK-185) mandano davvero qualcosa. Scelte dell'utente del
2026-10-07, tre parti in quest'ordine:

- **A — push**: `expo-notifications` nell'app e il servizio push di Expo
  sul server. Questa parte.
- **B — email**: con Resend. La chiave di Resend la crea e la scrive
  **l'utente** in `/root/shaperoute/.env` sul server, mai un agente;
  `.env.example` aggiornato con il nome della variabile.
- **C — amici dalla rubrica**: `expo-contacts` e i numeri confrontati
  come hash. Serve un **nuovo sì esplicito dell'utente** prima di
  cominciare.

**Cosa si notifica** (scelta dell'utente, la stessa lista per ogni
canale): una richiesta di follow e un nuovo follower, una reazione, un
commento, un tag in un post. L'interruttore «Push notifications» di
TASK-185 resta l'unico acceso/spento del canale push; «Email
notifications» lo sarà per l'email.

## Contesto da leggere

- `docs/tasks/TASK-185.md` (i due interruttori e i loro «Seguiti»)
- `docs/API.md` («Notifications», «Push notifications», «Follow»,
  «Comments», «Reactions», «Drawings»), `docs/DATABASE.md`, `docs/UI.md`
  («Settings», «Notifications»)
- ADR-0206 (gli interruttori), ADR-0226 (questo task)

## Parte A — push (in dettaglio)

### API

1. Migrazione `NNNN_push_tokens.sql` (numero: il primo libero in `main` al
   merge; oggi `0021`, dopo `0020_moderation` di TASK-121, i test la trovano per nome): tabella `push_tokens`,
   una riga per token, con l'account, la piattaforma, la lingua dell'app e
   la data.
2. `push.py` (nuovo): `PUT /me/push-token {token, platform, language?}` e
   `DELETE /me/push-token/{token}`, `204`; `install_push` in `app.py` (una
   riga). Il token passa all'account che lo manda per ultimo (il telefono
   ha cambiato mano); il `DELETE` toglie solo il proprio.
3. `expo_push.py` (nuovo): l'invio a `https://exp.host/--/api/v2/push/send`
   con `urllib` della libreria standard, come `strava_client.py` (nessuna
   dipendenza Python nuova), a gruppi di 100; le ricevute
   (`getReceipts`) lette 15 minuti dopo; un token che Expo chiama
   `DeviceNotRegistered`, subito o nella ricevuta, si cancella.
4. L'invio è **fuori dalla richiesta**: la richiesta che scrive l'evento
   legge solo, con una query, a chi mandare cosa; la rete la fa un thread
   (`ThreadPoolExecutor` di un posto). Si manda solo se il destinatario ha
   `notify_push` acceso, non è chi ha agito, nessuno dei due ha bloccato
   l'altro (TASK-121) e, per un disegno, il destinatario lo vede. Lo
   stesso evento al massimo una volta al giorno (una richiesta rifatta,
   una reazione cambiata).
5. **I ganci**, come funzioni nuove in fondo ai moduli e chiamate dopo la
   scrittura: `follows.py` (richiesta, richiesta accettata),
   `reactions.py`, `comments.py` e il tag, che non sta in `activities.py`
   ma in `drawings.py` (`PUT /me/activities/{key}/drawing`, `Drawings.keep`).
   **Entrano come ultimo commit dopo «121 in main»** (condizione del
   coordinatore: TASK-121 tocca gli stessi file), con il controllo dei
   bloccati sulla tabella di TASK-121.
6. **I testi** sono nella lingua che l'app manda con il token; senza,
   inglese. **Cosa sa l'API della lingua**: niente, prima di questo task
   (la lingua dell'app sta solo sul telefono, ADR-0172); da qui la sa per
   telefono, nella riga del token, e solo per le push. L'email della parte
   B dovrà decidere da dove prenderla.

### App

1. Dipendenza nuova **`expo-notifications`** (`~57.0.20`, quella dell'SDK
   57; il sì dell'utente del 2026-10-07): porta con sé `expo-application`
   e `badgin`. Il plugin in `app.json` con l'icona monocroma dell'app e il
   colore `color.accent` di `src/theme/tokens.ts` (un test li tiene
   uguali).
2. Il permesso del telefono si chiede **solo all'accensione di «Push
   notifications»**, mai all'avvio (la regola di TASK-185: il permesso
   quando c'è qualcosa da mandare, e ora c'è). Negato: l'interruttore resta
   spento, sotto c'è il motivo e «Open Settings» (TASK-259).
3. Con l'interruttore acceso e il permesso dato: `getExpoPushTokenAsync`
   con il `projectId` EAS di `app.json`, poi `PUT /me/push-token`. **Una
   volta per telefono**: l'app ricorda nel portachiavi token, account e
   lingua mandati, e rimanda solo se uno dei tre cambia.
4. Spento l'interruttore: `DELETE /me/push-token/{token}`. All'uscita
   dall'account: il `DELETE` del token prima di `DELETE /session`.
   Cancellato l'account: il server cancella i token con lui.
5. Il tocco su una notifica apre il disegno (reazione, commento, tag) o il
   profilo di chi ha agito (richiesta, richiesta accettata), anche quando
   la notifica apre l'app. Passa da `ProfileLayer` con le porte che ha già
   (niente `App.tsx`, niente `src/feed/*`).
6. La nota sotto gli interruttori e le due righe di «Help» e «Privacy»
   riscritte: le push partono, l'email non ancora (fino alla parte B).

### La prova

**Expo Go non riceve le push dall'SDK 53**: lì `getExpoPushTokenAsync`
non dà un token, e l'app non manda niente senza dire nulla. La prova
vera è una **build nativa sull'iPhone** (non fatta in questo task).
**Cosa prova jest invece**: il permesso chiesto solo dall'interruttore e
una volta sola, il token mandato una volta per telefono e di nuovo solo
per un altro account, token o lingua, ritirato allo spegnimento e
all'uscita, il tocco che apre il disegno o il profilo (anche quello che
apre l'app, una volta sola). **Cosa prova pytest**, con il database vero
ed Expo finto: token tenuti e tolti, un invio esatto per evento, nessuno
con l'interruttore spento, fra bloccati o a chi ha agito, i token morti
cancellati dai biglietti e dalle ricevute.

### Criteri di accettazione (parte A)

- [x] Il token si salva e si toglie, con i test (`test_push.py`).
- [x] Una richiesta di follow, una richiesta accettata, una reazione, un
      commento e un tag producono **un solo invio** al destinatario con
      `notify_push` acceso; nessuno spento, nessuno fra bloccati, nessuno a
      chi ha agito (test con Expo finto): `test_push.py` per evento,
      `test_push_hooks.py` attraverso le rotte vere, con il blocco vero di
      TASK-121.
- [x] Una ricevuta `DeviceNotRegistered` cancella il token.
- [x] L'app chiede il permesso solo all'interruttore e manda il token una
      volta per telefono.
- [x] Testi nuovi mostrati all'utente nelle cinque lingue, prima del
      merge: confermati il 2026-10-08 («i testi vanno bene»); fra questi
      c'è «{name} accepted your follow request.» per il nuovo follower.
      Il 2026-10-09 l'utente li ha riletti nella sessione «Scelte prodotto
      prioritarie» e li ha approvati con una modifica, in italiano e neutra
      rispetto al genere: «{name} ha accettato la tua richiesta di
      follow.» al posto di «… di seguirlo.» (fatta in `push.py`).
      Le righe di «Help» e «Privacy» in tedesco, spagnolo e francese sono
      traduzioni dell'agente dell'inglese approvato, aggiunte al
      riallineamento con `main` dopo la #453: non erano nel file letto
      dall'utente. La sessione «Scelte prodotto prioritarie» gliele ha
      mostrate così come sono su #451, e l'utente le ha approvate il
      2026-10-09 («Sì, vanno bene»). **Tutti i testi della parte A sono
      approvati dall'utente, nelle cinque lingue.**
- [ ] Test verdi in API e app.

### File toccati (parte A)

```
services/api/migrations/0021_push_tokens.sql      (nuovo; numero al merge)
services/api/shaperoute_api/push.py               (nuovo)
services/api/shaperoute_api/expo_push.py          (nuovo)
services/api/shaperoute_api/app.py                (install_push)
services/api/shaperoute_api/notifications.py      (docstring: le push partono)
services/api/tests/test_push.py                   (nuovo)
services/api/tests/test_expo_push.py              (nuovo)
services/api/tests/test_push_hooks.py             (nuovo, i cinque eventi dalle rotte)
services/api/shaperoute_api/follows.py            (ganci, dopo TASK-121)
services/api/shaperoute_api/reactions.py          (gancio, dopo TASK-121)
services/api/shaperoute_api/comments.py           (gancio, dopo TASK-121)
services/api/shaperoute_api/drawings.py           (gancio del tag, dopo TASK-121)
packages/shared-types/src/index.ts                (PushTokenRequest, PushData)
packages/shared-types/fixtures/push-token-request.json   (nuovo)
packages/shared-types/fixtures/push-data.json            (nuovo)
packages/shared-types/test/push.test.ts                  (nuovo)
apps/mobile/package.json, package-lock.json       (expo-notifications)
apps/mobile/app.json                              (il plugin)
apps/mobile/__mocks__/expo-notifications.ts       (nuovo)
apps/mobile/src/api/pushToken.ts (+ test)         (nuovi)
apps/mobile/src/notifications/*                   (nuovi, con i test)
apps/mobile/src/account/useAccount.ts             (uscita: il token prima)
apps/mobile/src/account/signOutPush.test.ts       (nuovo)
apps/mobile/src/settings/NotificationsSetting.tsx (+ test)
apps/mobile/src/settings/notificationFields.ts
apps/mobile/src/screens/ProfileLayer.tsx          (una chiamata)
apps/mobile/src/social/drawingsDoor.ts            (open vuole solo l'id)
apps/mobile/src/screens/FeedScreenPosts.test.tsx  (il tipo di open finto)
apps/mobile/src/profile/SettingsPage.test.tsx     (la nota nuova, il telefono finto)
apps/mobile/src/about/content/en.ts, it.ts, de.ts, es.ts, fr.ts
                                                  (solo le righe delle notifiche)
site/privacy/index.html, it/, de/, es/, fr/index.html
                                                  (rifatte con site/tools/make_privacy.mjs)
apps/mobile/src/about/documents.test.ts
apps/mobile/src/i18n/de.ts, es.ts, fr.ts, it.ts
docs/API.md, docs/DATABASE.md, docs/UI.md
docs/DECISIONS.md (ADR-0226), docs/STATUS.md
docs/tasks/TASK-262.md                            (nuovo)
```

### Fuori scope della parte A

- L'email (parte B) e la rubrica (parte C).
- Le push in Expo Go; una build nativa per provarle (dell'utente o del
  coordinatore).
- Il token di accesso di Expo («enhanced push security»): oggi spento,
  quindi nessuna variabile nuova nel `.env`.
- Uscire dall'account **senza rete**: il telefono dimentica il token ma
  il server lo tiene per l'account uscito finché un altro account entra
  sullo stesso telefono o Expo lo dice morto. Accettato.
- Ritentare un invio che Expo non ha preso (rete giù, `5xx`): si scrive
  nel log e si perde.

## Parte B — email (Todo)

Resend per le stesse cinque notizie con «Email notifications» acceso, e
poi la conferma dell'email e la password dimenticata (TASK-114, TASK-183).
La chiave `RESEND_API_KEY` la scrive l'utente nel `.env` del server;
`.env.example` ne ha il nome. Da decidere: la lingua delle email (l'API
la sa solo dai token push), il mittente e il dominio (`getmuw.app`).

## Parte C — amici dalla rubrica (Todo)

`expo-contacts`, i numeri in E.164 confrontati come hash con
`users.phone` (TASK-183). Prima di cominciare serve un nuovo sì esplicito
dell'utente.

## Esito

**Parte A in lavorazione**, sessione chiusa il 2026-10-09 su richiesta
dell'utente. Dove si è arrivati:

- PR #451 in **bozza** sul branch `feat/TASK-262-a-push` (worktree
  `.claude/worktrees/TASK-262`), allineata a `main` del 2026-10-09
  (merge `43d05a4f`), tutto spinto. API, app, contratto e documenti sono
  fatti; testi approvati dall'utente nelle cinque lingue (sopra).
- In locale verdi: tutta la parte JS (358 suite), `test_push.py`,
  `test_expo_push.py`, `test_notifications.py`, `test_accounts.py`,
  `test_contract.py`, i test del sito.

**Da dove riprendere**, dopo il «121 in main» del coordinatore (TASK-121
è la PR #457, con la migrazione `0020_moderation.sql`):

1. **Già fatto il 2026-10-10**, su un branch **locale** `local/262-hooks`
   del worktree (non spinto: dentro c'è la #457 unita a mano): la
   migrazione rinominata `0021_push_tokens.sql`; i ganci in fondo a
   `follows.py`, `reactions.py`, `comments.py`, `drawings.py`, chiamati
   dopo la scrittura (gli aiuti `notify_account`, `notify_owner`,
   `tagged_before`, `notify_tagged` in `push.py`); `Pusher.blocked` =
   `blocked_between` con `follows.apart_sql`; `test_push_hooks.py` (sei
   test attraverso le rotte, il blocco vero compreso); i documenti.
2. Al «121 in main»: `git switch feat/TASK-262-a-push`, unire
   `origin/main`, poi portare l'ultimo commit di `local/262-hooks` (quello
   dei ganci) con `git cherry-pick`; ricontrollare che `0021` sia ancora il
   primo numero libero dopo `0020_moderation`.
3. Test: i file dell'API toccati (`test_push*`, `test_follows`,
   `test_reactions`, `test_comments`, `test_drawings`, `test_moderation`,
   `test_feed`, `test_contract`), tutta la parte JS, i test del sito; la
   suite intera dell'API va alla CI.
4. PR fuori bozza; al verde «#451 pronta» al coordinatore, ricordando che
   la prova vera è solo con una build nativa; merge solo dopo il suo
   «merge 451». Poi il server (migrazione) è del coordinatore, con l'ok
   dell'utente.

In locale il worktree ha in `node_modules` cartelle vere per
`expo-notifications`, `expo-application`, `badgin`,
`expo-image-manipulator`, `expo-task-manager`, `unimodules-app-loader`,
che il checkout principale non ha ancora; dopo il merge serve `npm
install` nel checkout principale.
