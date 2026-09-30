# TASK-116 — Il profilo: nome, foto, due righe

**Stato**: Todo
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

## Criteri di accettazione

- [ ] Nome utente già preso o non valido: errore che dice perché.
- [ ] Il profilo di un altro non mostra mai l'email.
- [ ] Una foto troppo grande o non immagine è rifiutata con il motivo.
- [ ] Modificato il profilo, la pagina lo mostra senza riaprire l'app.
- [ ] Test verdi; prova sull'iPhone.

## File toccati

```
services/api/shaperoute_api/profiles.py
services/api/shaperoute_api/app.py
services/api/shaperoute_api/schemas.py
services/api/migrations/
services/api/tests/test_profiles.py
packages/shared-types/src/index.ts
apps/mobile/src/api/profiles.ts
apps/mobile/src/api/profiles.test.ts
apps/mobile/src/screens/ProfileScreen.tsx
apps/mobile/src/screens/ProfileScreen.test.tsx
apps/mobile/src/screens/EditProfileScreen.tsx
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
