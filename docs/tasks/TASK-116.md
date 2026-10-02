# TASK-116 — Il profilo: nome, foto, due righe

**Stato**: In corso (2026-10-02)
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

- [ ] Nome utente già preso o non valido: errore che dice perché.
- [ ] Il profilo di un altro non mostra mai l'email.
- [ ] Una foto troppo grande o non immagine è rifiutata con il motivo.
- [ ] Modificato il profilo, la pagina lo mostra senza riaprire l'app.
- [ ] Test verdi; prova sull'iPhone.

## File toccati

Aggiornato il 2026-10-02 dal coordinatore e da chi prende il task: la foto
c'è già (TASK-178), «Profile» è fatto di pezzi in `src/profile/`
(TASK-177). La migrazione prende il primo numero libero in `main` al merge
(oggi `0007`).

```
services/api/migrations/0007_profiles.sql
services/api/shaperoute_api/profiles.py
services/api/shaperoute_api/accounts.py
services/api/shaperoute_api/app.py
services/api/tests/test_profiles.py
services/api/tests/test_accounts.py
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
