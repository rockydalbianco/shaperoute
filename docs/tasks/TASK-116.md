# TASK-116 — Il profilo: nome, foto, due righe

**Stato**: Done (2026-10-02)
**Fase**: 4 · **Branch**: `feat/TASK-116-profile`
**Dipende da**: TASK-115

## Obiettivo

Ogni iscritto ha un profilo che può modificare e che gli altri iscritti
possono vedere.

## Contesto da leggere

- `docs/DATABASE.md`, `docs/API.md` (account)
- `docs/UI.md` (schede, TASK-115)
- `services/api/shaperoute_api/images.py` (limiti delle immagini)

## Cosa fare

1. API: `GET /users/{id}` (nome utente, foto, bio, numero di disegni),
   `PATCH /me`. Nome utente unico, 3–20 caratteri, lettere, cifre e `_`;
   bio al più 160 caratteri.
2. Foto del profilo: caricata con `expo-image-picker` (già presente),
   ridotta nell'API a un quadrato piccolo; dove si conserva lo dice
   `DATABASE.md`. Senza foto, le iniziali.
3. App: scheda «Profile» con foto, nome, bio, «Edit profile»; la stessa
   pagina, in sola lettura, per il profilo di un altro.
4. Test di API e app; `API.md`, `DATABASE.md`, `UI.md`.

### Aggiornato dal coordinatore (2026-10-02), vale dove differisce

- La foto c'è già (TASK-178: `/me/photo`, `PhotoRow`, `Avatar`, migrazione
  `0005`): si usa, non si rifà.
- API: `PATCH /me` per nome e bio, con errori in parole;
  `GET /users/{id}` con nome, foto, bio e numero di disegni, **mai
  l'email** (un test lo prova). Decidere cosa è `{id}` (non gli id
  interni in sequenza) e cosa mostra chi non ha un nome.
- App: «Edit profile» nella «Profile» di oggi (TASK-177) per nome e bio.
- La pagina in sola lettura del profilo di un altro si fa, ma **nessuna
  strada nuova per arrivarci**: da dove si apre lo decide l'utente.
- La migrazione lascia funzionare gli account che ci sono. L'app
  pubblicata funziona con il server nuovo, e l'app nuova con un server
  vecchio (`GET /me` senza bio; `PATCH /me` che fallisce dice perché).
- Testi nuovi dell'interfaccia: «da confermare con l'utente».

## Criteri di accettazione

- [x] Nome utente già preso o non valido: errore che dice perché.
- [x] Il profilo di un altro non mostra mai l'email.
- [x] Una foto troppo grande o non immagine è rifiutata con il motivo
      (TASK-178, già in `main`).
- [x] Modificato il profilo, la pagina lo mostra senza riaprire l'app.
- [ ] Test verdi; prova sull'iPhone. Test verdi sì; l'iPhone dopo server
      e pubblicazione, con l'ok dell'utente.

## File toccati

Aggiornato il 2026-10-02 dal coordinatore e da chi prende il task: la foto
c'è già (TASK-178), «Profile» è fatto di pezzi in `src/profile/`
(TASK-177). La migrazione prende il primo numero libero in `main` al merge
(oggi `0007`). Rispetto alla lista del primo commit manca
`services/api/tests/test_accounts.py`: il suo controllo delle fixture
confronta `session.json` con `UserBody`, e passa così com'è con i due campi
nuovi. Nessun file fuori lista.

```
services/api/migrations/0007_profiles.sql
services/api/shaperoute_api/profiles.py
services/api/shaperoute_api/accounts.py
services/api/shaperoute_api/app.py
services/api/tests/test_profiles.py
packages/shared-types/src/index.ts
packages/shared-types/fixtures/session.json
packages/shared-types/fixtures/edit-profile-request.json
packages/shared-types/fixtures/public-profile.json
packages/shared-types/test/accounts.test.ts
apps/mobile/src/api/profiles.ts
apps/mobile/src/api/profiles.test.ts
apps/mobile/src/account/useAccount.ts
apps/mobile/src/account/editProfile.test.ts
apps/mobile/src/account/fields.ts
apps/mobile/src/profile/profileFields.ts
apps/mobile/src/profile/profileFields.test.ts
apps/mobile/src/profile/ProfileHeader.tsx
apps/mobile/src/profile/ProfileHome.tsx
apps/mobile/src/profile/ProfileHome.test.tsx
apps/mobile/src/profile/EditProfile.tsx
apps/mobile/src/profile/EditProfile.test.tsx
apps/mobile/src/profile/EditProfileFlow.test.tsx
apps/mobile/src/profile/UserProfilePage.tsx
apps/mobile/src/profile/UserProfilePage.test.tsx
apps/mobile/src/profile/SettingsPage.test.tsx
apps/mobile/src/profile/useProfilePhoto.test.ts
apps/mobile/src/screens/ProfileScreen.tsx
docs/API.md
docs/DATABASE.md
docs/UI.md
docs/DECISIONS.md
docs/STATUS.md
docs/tasks/TASK-116.md
```

## Fuori scope

- Seguire altri utenti, profili privati.
- L'elenco dei disegni nel profilo (TASK-117).

## Esito

Fatto il 2026-10-02 (ADR-0128, migrazione `0007_profiles.sql`), PR
«TASK-116: username, bio and Edit profile» (il merge è del coordinatore).

**Cosa funziona**
- **API**: `PATCH /me` cambia nome e bio (solo ciò che si manda; il nome
  con la regola dell'iscrizione, unico senza badare alle maiuscole; la bio
  al più 160 caratteri). Errori in parole, `422 invalid_request` per un
  valore fuori regola e `409 username_taken` per il nome di un altro; con
  un errore non cambia niente. `GET /users/{public_id}`, solo con il
  token: `public_id`, `username`, `bio`, `photo` (la foto di TASK-178 in
  base64, o `null`) e `drawings`. Mai l'email, il ruolo, l'id interno o la
  data d'iscrizione: un test cerca l'email in tutto il testo della
  risposta. `User` (anche di `GET /me` e della sessione) ha in più `bio` e
  `public_id`.
- **`{id}`** è `public_id`, un UUID casuale nuovo in `users`: l'id interno
  è in sequenza e direbbe quanti account ci sono. Un id che non c'è, di un
  account cancellato o che non è un UUID (un numero, un nome) è `404`.
- **Chi non ha un nome** non c'è: è obbligatorio dall'iscrizione (`NOT
  NULL` dalla `0001`). Senza bio si vedono solo nome e foto; senza foto,
  l'iniziale.
- **Migrazione `0007`**: `users.bio` (`''` di default, al più 160) e
  `users.public_id` (`uuid`, unico, `gen_random_uuid()`). Provata con dati
  sullo schema 0001–0006 (due account, uno con foto, una sessione di prima
  per ciascuno): dopo la migrazione le sessioni valgono ancora, si entra
  con la password, ognuno ha il suo `public_id`, il nome con il punto si
  tiene e si cambia.
- **App**: in «Profile» sotto il nome la bio (se c'è) e il pulsante «Edit
  profile», che apre una pagina di «Profile» con «USERNAME», «BIO» (con il
  conto dei caratteri) e «Save». Si manda solo quello che cambia; salvato,
  «Profile», «Settings» e il pulsante in alto lo mostrano subito, e il
  portachiavi lo tiene per la prossima apertura (test con `ProfileLayer`
  intero).
- **La pagina del profilo di un altro** (`UserProfilePage.tsx`), in sola
  lettura: foto o iniziale, nome, «N drawings», bio; mai l'email anche se
  una risposta la portasse. **Nessuna strada ci porta**: i test la aprono
  a mano.
- **Con il server di oggi** (senza la `0007`): l'app nuova legge `GET /me`
  senza `bio` né `public_id`, e «Save» dice «Editing the profile is not
  available on this API yet.» (test). **L'app pubblicata con il server
  nuovo**: `isUser` non guarda i campi in più (test).
- Nessuna dipendenza nuova; nessun colore scritto a mano.

**Una differenza dal task file**: il nome accetta anche il punto. Il task
file diceva «lettere, cifre e `_`», ma l'iscrizione (ADR-0120, in uso dal
TASK-114) accetta `.` e il database lo vuole: due regole per lo stesso
campo farebbero rifiutare in «Edit profile» un nome valido all'iscrizione
(ADR-0128, punto 2).

**Testi nuovi, da confermare con l'utente**: «Edit profile» (pulsante e
titolo della pagina), «USERNAME», «BIO», «A few words about you», «12/160»
(il conto), «Save», «Saving…», «A bio is at most 160 characters.»,
«Editing the profile is not available on this API yet.»; nella pagina di
un altro «N drawings» / «1 drawing», «Loading the profile…», «This profile
is not available.», «Log in to see the profiles of the others.».
Dall'API (li mostra l'app): «A bio is words and new lines: it cannot hold
control characters.», «No profile with this id.». Riusati com'erano: «A
username is 3 to 20 letters, digits, _ or . (no spaces).», «This username
is taken. Try another one.».

**Domande per l'utente**
1. **Da dove si apre il profilo di un altro**: dal feed (TASK-118), da un
   like o da un commento (TASK-119, 120)? Oggi la pagina c'è ma non ci si
   arriva. La proposta: dal nome e dalla foto di chi ha pubblicato, nel
   feed, quando c'è.
2. **Il numero di disegni** conta solo quelli pubblicati: 0 per tutti
   finché TASK-117 non fa pubblicare una corsa. Deve contare anche le
   corse private? La proposta è di no: dice quanto corre una persona che
   non ha pubblicato niente.
3. I testi sopra.

**Non verificato**: sul telefono (la prova sull'iPhone dei criteri resta
aperta); sul server, che non ha ancora la `0007` né le `0004`–`0006`.
**Migrazione e «Edit profile» arrivano al telefono solo dopo
l'aggiornamento del server e la pubblicazione dell'app, tutti e due con
l'ok dell'utente.** Il criterio sulla foto troppo grande o non immagine è
di TASK-178, già in `main`: qui non cambia.

**Test** (in locale, 2026-10-02): API 748 verdi (`test_profiles.py` 36,
fra cui la migrazione su dati di prima e l'email mai nella risposta),
route-engine 1138; app 140 file, 1241 test (nuovi `profiles.test.ts`,
`profileFields.test.ts`, `editProfile.test.ts`, `EditProfile.test.tsx`,
`EditProfileFlow.test.tsx`, `UserProfilePage.test.tsx`), `shared-types` 24;
lint, typecheck, format, ruff e black puliti.
