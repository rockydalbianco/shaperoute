# TASK-171 — «Favorites»: i percorsi preferiti dell'account

**Stato**: In revisione
**Fase**: 4 · **Branch**: `feat/TASK-171-favorites`
**Dipende da**: TASK-114, TASK-115

## Obiettivo

Chi ha un account tiene fra i preferiti i percorsi che vede sulla mappa
(disegnati, di «Explore», a tema) e li ritrova in «Profile», alla voce
«Favorites», da qualunque telefono. Chiesto dall'utente il 2026-10-02
insieme a «My activities», che è TASK-172.

## Contesto da leggere

- `docs/UI.md` «Profile», «Il risultato»
- `docs/API.md` «Account», `docs/DATABASE.md`
- `apps/mobile/src/screens/ProfileLayer.tsx`, `ProfileScreen.tsx`
- `apps/mobile/src/explore/explored.ts`, `RouteCard.tsx`
- `services/api/shaperoute_api/accounts.py`

## Cosa fare

1. API: tabella `favorites` (migrazione `0002`), `GET /me/favorites`,
   `GET`/`PUT`/`DELETE /me/favorites/{key}`, tutti con il token
   dell'account. Un preferito è una copia intera del percorso.
2. App: un cuore sulla mappa, di fronte a «←», quando c'è un percorso;
   pieno se il percorso è fra i preferiti. Senza account apre «Profile».
3. App: in «Profile», con l'account, la riga «Favorites» con il numero;
   la pagina elenca i preferiti come le schede di «Explore». Una scheda
   apre il percorso sulla mappa, da correre ed esportare; il suo cuore lo
   toglie.
4. Test di API e app; `API.md`, `DATABASE.md`, `UI.md`, ADR.

## Criteri di accettazione

- [x] Un percorso tenuto due volte è un preferito solo.
- [x] Un account vede, apre e toglie solo i suoi preferiti; senza token
      l'API risponde `not_signed_in`.
- [x] Cancellato l'account, i suoi preferiti spariscono.
- [x] Il cuore cambia subito e torna com'era, con il motivo, se l'API
      rifiuta.
- [x] Senza account il cuore porta a «Sign up»/«Log in», e il percorso è
      tenuto appena si entra.
- [x] Un preferito aperto da «Profile» si corre («Start») e si esporta
      come un percorso di «Explore»; «←» torna all'elenco.
- [x] Colori dai token; testi in inglese; test verdi.
- [ ] Prova sull'iPhone, dopo l'aggiornamento dell'API sul server.

## File toccati

```
services/api/migrations/0002_favorites.sql
services/api/shaperoute_api/favorites.py
services/api/shaperoute_api/app.py
services/api/tests/test_favorites.py
services/api/tests/test_accounts.py
packages/shared-types/fixtures/favorite-request.json
packages/shared-types/fixtures/favorite.json
packages/shared-types/fixtures/favorites.json
apps/mobile/App.tsx
apps/mobile/__tests__/AppFavorites.test.tsx
apps/mobile/src/api/accounts.ts
apps/mobile/src/api/favorites.ts
apps/mobile/src/api/favorites.test.ts
apps/mobile/src/account/useAccount.ts
apps/mobile/src/favorites/
apps/mobile/src/screens/ProfileLayer.tsx
apps/mobile/src/screens/ProfileScreen.tsx
docs/API.md
docs/DATABASE.md
docs/UI.md
docs/DECISIONS.md
docs/STATUS.md
docs/tasks/TASK-171.md
```

## Fuori scope

- «My activities», le corse registrate: TASK-172.
- Il cuore sulle schede di «Explore» e sui disegni di «Feed»: per ora il
  cuore è solo sulla mappa, dove il percorso è aperto.
- Preferiti senza account, tenuti sul telefono.
- Dare un nome a un preferito, ordinarli, cercarli.
- Pubblicare l'app e aggiornare l'API sul server: con l'ok dell'utente.

## Esito

API e app fatte, test verdi (API 29 nuovi, app 37 nuovi). Il cuore è sulla
mappa per i percorsi disegnati, di «Explore» e a tema; «Favorites» in
«Profile» li elenca e li riapre. Sul telefono si vede solo dopo che l'API
del server ha la migrazione `0002` (`DEPLOY.md` F.12) e l'app è pubblicata:
tutte e due con l'ok dell'utente. Rimandato a TASK-172 «My activities».
