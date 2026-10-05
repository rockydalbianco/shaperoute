# TASK-185 — I due interruttori delle notifiche, salvati nell'account

**Stato**: In revisione
**Fase**: 4 · **Branch**: `feat/TASK-185-notification-switches`
**Dipende da**: TASK-177 (la pagina «Settings»), TASK-114 (gli account
nell'API), TASK-183 (il modello: un dato dell'account cambiato da
«Settings»), TASK-184 (`AboutRows`, i testi di «Help» e «Privacy»)

## Obiettivo

Chi ha un account accende e spegne «Email notifications» e «Push
notifications» da «Settings», e la scelta resta nell'account. **Non si
manda niente**: nessun servizio di posta, niente `expo-notifications`,
nessun permesso chiesto al telefono. Chiesto dall'utente il 2026-10-02 fra
le voci di «Settings» (fin qui con «Soon») e di nuovo il 2026-10-05:
«notifiche email […] se puoi attivare, disattivare le notifiche Push».

## Scelte dell'utente (2026-10-05)

- **Tutti e due gli interruttori partono spenti** per chi non li ha mai
  toccati: «Spenti tutti e due».
- **Gli interruttori si salvano, l'invio no** (condizione del
  coordinatore, accettata): l'invio vero non è di questo task, e la pagina
  deve dire chiaro che non si manda ancora niente. Sotto gli interruttori:
  «Sgrava does not send notifications yet. Your choice is kept for when it
  does.».

## Contesto da leggere

- `docs/API.md` («Account», «Email and phone number», «Notifications»),
  `docs/DATABASE.md` (`users`)
- `docs/DECISIONS.md` ADR-0145 («Settings»), ADR-0150 (email e numero: il
  modello), ADR-0206 (questo task)
- `services/api/shaperoute_api/accounts.py`, `contact.py` e
  `tests/test_contact.py` (il modello per endpoint e test con il database
  vero)
- `apps/mobile/src/profile/SettingsPage.tsx`, `src/settings/PhoneSetting.tsx`,
  `src/engine/OfflineMapsSetting.tsx` (la nota piccola sotto le righe),
  `src/screens/RunDashboard.tsx` (com'è disegnato un interruttore)

## Cosa fare

1. **API**: migrazione `0017_notifications.sql` (`users.notify_email`,
   `users.notify_push`, tutte e due `false`); `PUT /me/notifications`
   (`email?`, `push?`: solo quello che cambia) in `notifications.py`;
   `User` con `notifications: {email, push}`.
2. **Contratto**: `User.notifications?`, `Notifications`,
   `NotificationsRequest`, `fixtures/notifications-request.json`,
   `fixtures/session.json`.
3. **App**: le due righe escono dall'elenco delle voci con «Soon» e
   diventano due interruttori (`src/settings/NotificationsSetting.tsx`),
   con la nota sotto; `changeNotifications` nell'account.
4. Test di API (database vero) e app; `API.md`, `DATABASE.md`, `UI.md`;
   ADR-0206; una riga nella guida e una nella bozza della privacy.

## Criteri di accettazione

- [x] Un account nuovo ha tutti e due gli interruttori spenti; così anche
      gli account di prima (test sulla migrazione).
- [x] Ogni interruttore si accende e si spegne da solo: `PUT
      /me/notifications` cambia solo quello che riceve; `{}` non cambia
      niente e risponde l'account com'è.
- [x] Un tipo diverso da vero/falso (`"true"`, `1`) o un campo in più è
      `422 invalid_request` e non cambia niente.
- [x] Senza token `401 not_signed_in`; senza database `503
      accounts_unavailable`.
- [x] Le preferenze non compaiono mai nel profilo visto dagli altri, nella
      ricerca o negli elenchi (test); `DELETE /me` le cancella.
- [x] In «Settings» l'interruttore toccato mostra subito il nuovo valore e
      torna indietro se l'API rifiuta, con il motivo in parole sotto le
      righe; mentre una richiesta è in viaggio un secondo tocco non manda
      niente.
- [x] Sotto le righe c'è scritto che non si manda ancora niente; accendere
      «Push notifications» non chiede nessun permesso al telefono.
- [x] L'app nuova con un'API di prima legge l'account come «tutti e due
      spenti» e, al tocco, dice che la cosa non c'è ancora, senza rompersi.
- [x] Nessuna riga di «Settings» dice più «Soon».
- [x] Per VoiceOver ogni riga è un interruttore con il suo nome e il suo
      stato; l'emoji non si legge.
- [x] Testi nuovi in `t()` con le quattro tabelle.
- [x] Nessun colore scritto a mano, nessuna dipendenza nuova.
- [x] Test verdi (in locale: tutta la parte JS e i file di test dell'API
      elencati in «Esito»; l'intera suite dell'API è della CI).
- [ ] Visto su un telefono o nel simulatore: non fatto in questo task.

## File toccati

```
services/api/migrations/0017_notifications.sql
services/api/shaperoute_api/notifications.py
services/api/shaperoute_api/accounts.py        (USER_COLUMNS, NotificationsBody, UserBody.notifications)
services/api/shaperoute_api/app.py             (install_notifications)
services/api/tests/test_notifications.py
packages/shared-types/src/index.ts             (User.notifications, Notifications, NotificationsRequest)
packages/shared-types/fixtures/session.json    ("notifications")
packages/shared-types/fixtures/notifications-request.json
packages/shared-types/test/accounts.test.ts
apps/mobile/src/api/notifications.ts
apps/mobile/src/api/notifications.test.ts
apps/mobile/src/account/useAccount.ts          (changeNotifications)
apps/mobile/src/account/changeNotifications.test.ts
apps/mobile/src/settings/NotificationsSetting.tsx
apps/mobile/src/settings/NotificationsSetting.test.tsx
apps/mobile/src/settings/notificationFields.ts
apps/mobile/src/settings/notificationFields.test.ts
apps/mobile/src/profile/SettingsPage.tsx
apps/mobile/src/profile/SettingsPage.test.tsx
apps/mobile/src/profile/useProfilePhoto.test.ts   (il metodo nuovo di Account)
apps/mobile/src/social/commentsDoor.test.ts       (idem)
apps/mobile/src/social/reactionsDoor.test.ts      (idem)
apps/mobile/src/about/AboutInProfile.test.tsx     (idem)
apps/mobile/src/about/content/en.ts, it.ts        (una riga in «Help», una in «Privacy»)
apps/mobile/src/about/documents.test.ts           (un test su quelle righe)
apps/mobile/src/i18n/de.ts, es.ts, fr.ts, it.ts
docs/API.md
docs/DATABASE.md
docs/UI.md
docs/DECISIONS.md
docs/STATUS.md
docs/tasks/TASK-185.md
```

Cinque test costruiscono un `Account` a mano (`SettingsPage`,
`useProfilePhoto`, `commentsDoor`, `reactionsDoor`, `AboutInProfile`):
ognuno ha una riga in più, `changeNotifications: jest.fn()`, e nient'altro.

Nelle quattro tabelle di `src/i18n/` due righe sono **tolte**: «Soon» e
«{name}, coming soon». Nessuna riga di «Settings» le mostra più, e
`tables.test.ts` rifiuta un testo che nessuno mostra. «Sport» scrive il
suo «Soon» senza `t()` e non cambia.

Nessun test «di prima» è stato toccato: quelli che preparano uno schema
vecchio e poi usano l'API di oggi (`test_drawings.py`, `test_follows.py`,
`test_profiles.py`) creano già l'account in SQL (TASK-183), e gli altri
(`test_activities.py`, `test_favorites.py`) tolgono solo la loro
migrazione, quindi hanno anche `0017`.

Il numero della migrazione è il primo libero in `main` al merge
(`AGENTI.md`, punto 10): se un'altra PR prende `0017` prima, il file si
rinomina; i test lo trovano dal nome (`_notifications.sql`).

## Fuori scope

- **L'invio vero**: un servizio di posta (serve anche alla password
  dimenticata e alla conferma dell'email, TASK-114 e TASK-183),
  `expo-notifications` con il permesso del telefono e il token del
  dispositivo, una build propria (in Expo Go le push non arrivano).
- **Che cosa si notifica**: una richiesta di follow, un commento, una
  reazione, altro. È una scelta di prodotto dell'utente; oggi i due
  interruttori sono «tutto o niente» per canale.
- **Il permesso del telefono**: si chiede quando c'è qualcosa da mandare,
  non quando si accende l'interruttore.

## Esito

In revisione dal 2026-10-05, sul branch
`feat/TASK-185-notification-switches` (parte da `main` `8dfb62a`, che ha
già TASK-184; poi unito `main` `b54c6c8`, con TASK-240 e TASK-241, senza
conflitti).

- **API**: `PUT /me/notifications` (`notifications.py`),
  `User.notifications`, migrazione `0017_notifications.sql`. 23 test nuovi
  in `test_notifications.py`, con il database vero.
- **App**: in «Settings» la sezione «NOTIFICATIONS» ha due interruttori e
  la nota; nessuna riga dice più «Soon».
- **Test in locale**: tutta la parte JS (typecheck, lint, format, `npm
  test`: 2200 test dell'app e 53 del contratto, dopo l'unione di `main`);
  dell'API `ruff`, `black` e i file `test_notifications.py` (23 test),
  `test_contact.py`, `test_accounts.py`, `test_profiles.py`,
  `test_contract.py`, `test_follows.py`, `test_drawings.py`,
  `test_activities.py`, `test_favorites.py` (361 test). **L'intera suite
  dell'API è lasciata alla CI.**
- **Non visto** nel simulatore né su un telefono.
- **Serve l'aggiornamento del server** (migrazione `0017`) prima di
  pubblicare l'app: con l'API di prima l'app legge «tutti e due spenti» e
  al tocco dice «Notifications are not available on this API yet.».
- **Testi nuovi, da confermare con l'utente** (le quattro traduzioni sono
  dell'agente): «Notifications are not available on this API yet.»; la
  nota «Sgrava does not send notifications yet. Your choice is kept for
  when it does.» è quella concordata. In «Help» (inglese e italiano):
  «Notifications: two switches, email and push, off until you turn them
  on. Sgrava sends no notifications yet: your choice is kept with your
  account for when it does.». In «Privacy» (bozza, inglese e italiano):
  «Your two notification choices in «Settings», email and push: both are
  off until you turn them on, and Sgrava sends no notifications yet.».
- **Seguiti**: l'invio vero e che cosa si notifica (sopra); quando
  l'invio c'è, la nota sotto gli interruttori e le due righe di «Help» e
  «Privacy» vanno riscritte; `translate.test.ts` usa ancora «{name},
  coming soon» come esempio di testo con un segno (passa lo stesso:
  l'inglese non legge le tabelle).
- **Documenti da riallineare, di altri task** (non toccati): la voce di
  TASK-239 in `STATUS.md`, `tasks/TASK-239.md` e `tasks/TASK-183.md`
  dicono ancora che le notifiche ad app chiusa e il servizio di posta
  «sono TASK-185». L'invio vero non ha ancora un numero: lo assegna il
  coordinatore. In `UI.md` la frase delle richieste di follow è già
  corretta.
