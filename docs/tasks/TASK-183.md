# TASK-183 — Cambiare email e numero di telefono, da «Settings»

**Stato**: In revisione
**Fase**: 4 · **Branch**: `feat/TASK-183-email-phone`
**Dipende da**: TASK-177 (la pagina «Settings»), TASK-114 (gli account
nell'API), TASK-116 (`PATCH /me`, il modello del cambio di un dato)

## Obiettivo

Chi ha un account cambia la sua email e tiene un numero di telefono, da
«Settings». Chiesto dall'utente il 2026-10-02 fra le voci di «Settings»
(«Change email», «Phone number», fin qui con «Soon») e di nuovo il
2026-10-05: «Lavora sulle impostazioni, quindi sul cambio mail, sul
cambio numero di telefono…».

## Scelte dell'utente (2026-10-05)

- **Il numero di telefono serve a farsi trovare dagli amici**: chi ha già
  il numero in rubrica potrà trovare l'account. La ricerca dalla rubrica è
  un task a parte (seguito, sotto); da subito il numero è dichiarato così
  nell'app e nella privacy (TASK-184). Lo vede solo il proprietario.
- **Il cambio email vale subito, con la password**: Sgrava non ha un
  servizio che manda email, quindi niente mail di conferma al nuovo
  indirizzo; per cambiare si riscrive la password dell'account. La mail di
  conferma arriva con il servizio di posta (serve anche alla password
  dimenticata, TASK-114).

## Contesto da leggere

- `docs/API.md` («Account», «Profile»), `docs/DATABASE.md` (`users`)
- `docs/DECISIONS.md` ADR-0114 (gli account), ADR-0128 (`PATCH /me`),
  ADR-0145 («Settings»), ADR-0150 (questo task)
- `services/api/shaperoute_api/accounts.py`, `profiles.py` e
  `tests/test_profiles.py` (il modello per endpoint e test con il database
  vero)
- `apps/mobile/src/profile/SettingsPage.tsx`, `EditProfile.tsx`,
  `src/settings/LanguageSetting.tsx` (una riga che si apre sotto)

## Cosa fare

1. **API**: migrazione `0016_contact.sql` (`users.phone`); `PUT /me/email`
   (`email`, `password`) e `PUT /me/phone` (`phone`, o `null`) in
   `contact.py`; `User` con `phone`.
2. **App**: le righe «Change email» e «Phone number» escono dall'elenco
   delle voci con «Soon» e diventano due righe che si aprono sotto, ognuna
   in un file suo in `src/settings/`.
3. Test di API (database vero) e app; `API.md`, `DATABASE.md`, `UI.md`;
   ADR-0150.

## Criteri di accettazione

- [x] Con la password giusta l'email cambia subito: «Settings» mostra la
      nuova, il telefono resta dentro, e da lì in poi si entra con quella.
- [x] Con la password sbagliata non cambia niente, l'app lo dice («Wrong
      password.») e si resta dentro; dopo 5 sbagliate si aspetta, come
      all'accesso.
- [x] L'email di un altro account è rifiutata («Another account has this
      email.»).
- [x] Un numero scritto con il prefisso del paese si salva comunque sia
      spaziato, e «Settings» lo mostra come lo tiene l'API
      (`+393331234567`); senza prefisso l'app dice come scriverlo.
- [x] «Remove number» toglie il numero.
- [x] Il numero non compare mai nel profilo visto dagli altri, nella
      ricerca o negli elenchi (test); `DELETE /me` lo cancella.
- [x] Gli account di prima continuano a funzionare, senza numero (test
      sulla migrazione); l'app nuova con un'API di prima dice che la cosa
      non c'è ancora, senza rompersi.
- [x] Testi nuovi in `t()` con le quattro tabelle.
- [x] Nessun colore scritto a mano, nessuna dipendenza nuova.
- [x] Test verdi.

## File toccati

```
services/api/migrations/0016_contact.sql
services/api/shaperoute_api/contact.py
services/api/shaperoute_api/accounts.py        (USER_COLUMNS, UserBody.phone)
services/api/shaperoute_api/app.py             (install_contact)
services/api/tests/test_contact.py
packages/shared-types/src/index.ts             (User.phone, due richieste)
packages/shared-types/fixtures/session.json    ("phone": null)
packages/shared-types/fixtures/change-email-request.json
packages/shared-types/fixtures/change-phone-request.json
packages/shared-types/test/accounts.test.ts
apps/mobile/src/api/contact.ts
apps/mobile/src/api/contact.test.ts
apps/mobile/src/account/useAccount.ts          (changeEmail, changePhone)
apps/mobile/src/account/fields.ts              (emailProblem esportata)
apps/mobile/src/account/changeContact.test.ts
apps/mobile/src/settings/ContactField.tsx
apps/mobile/src/settings/EmailSetting.tsx
apps/mobile/src/settings/EmailSetting.test.tsx
apps/mobile/src/settings/PhoneSetting.tsx
apps/mobile/src/settings/PhoneSetting.test.tsx
apps/mobile/src/settings/contactFields.ts
apps/mobile/src/settings/contactFields.test.ts
apps/mobile/src/profile/SettingsPage.tsx
apps/mobile/src/profile/SettingsPage.test.tsx
apps/mobile/src/profile/useProfilePhoto.test.ts   (i due metodi nuovi di Account)
apps/mobile/src/social/commentsDoor.test.ts       (idem)
apps/mobile/src/social/reactionsDoor.test.ts      (idem)
apps/mobile/src/i18n/de.ts, es.ts, fr.ts, it.ts
docs/API.md
docs/DATABASE.md
docs/UI.md
docs/DECISIONS.md
docs/STATUS.md
docs/tasks/TASK-183.md
```

Il numero della migrazione è il primo libero in `main` al merge
(`AGENTI.md`, punto 10): se un'altra PR prende `0016` prima, il file si
rinomina; i test lo trovano dal nome (`_contact.sql`).

## Fuori scope

- **La ricerca degli amici dalla rubrica**: un task a parte. Prima va
  deciso come si prova che un numero è di chi lo scrive (un SMS, quindi
  un servizio a pagamento), perché oggi chiunque può scrivere il numero di
  un altro (ADR-0150).
- **La mail di conferma** del nuovo indirizzo, e l'avviso al vecchio:
  con il servizio di posta (TASK-185, TASK-114).
- **Cambiare la password**: non chiesto; oggi non c'è.

## Esito

Fatto il 2026-10-05, in revisione.

- **API**: `PUT /me/email` e `PUT /me/phone` (`contact.py`), `User.phone`,
  migrazione `0016_contact.sql`. 47 test nuovi in `test_contact.py`, con il
  database vero.
- **App**: in «Settings», sotto «Profile picture», «Change email» e «Phone
  number» si aprono sotto la riga. Test di ogni pezzo.
- **Visto nel simulatore** (iPhone 17, Expo Go, API locale con un
  database usa e getta, senza tocchi): le due righe aperte, e dopo un
  cambio fatto sull'API il nuovo indirizzo nel riquadro in cima, il numero
  in fondo alla riga e «Remove number». Schermate in `out/task183/`. Non
  provato con le dita né su un telefono.
- **Per vederlo sul telefono** servono l'aggiornamento del server
  (migrazione `0016`) e la pubblicazione dell'app, con l'ok dell'utente,
  in quest'ordine. L'app nuova con il server di oggi mostra le due righe
  e, al «Save», «Changing the email is not available on this API yet.» /
  «The phone number is not available on this API yet.».
- **Testi nuovi da confermare con l'utente** (inglese; le quattro
  traduzioni sono dell'agente): «NEW EMAIL», «PHONE NUMBER», «Add»,
  «Remove number», «Only you see your number. Friends who already have it
  will be able to find you on Sgrava.», «This is already the email of your
  account.», «Write the number with its country code, like +39 333 123
  4567.», «Wrong password.», «Another account has this email.».
- **Seguiti**: la ricerca dalla rubrica (sopra); la mail di conferma;
  `TASK-184` deve scrivere nella privacy a cosa serve il numero.
