# TASK-258 — Il post condiviso resta sul server

**Stato**: Done
**Fase**: 4 · **Branch**: `feat/TASK-258-post-on-server`
**Dipende da**: TASK-231 (il post), TASK-172 («My activities»), in `main`.
**ADR**: ADR-0222.

Chiesto dall'utente il 2026-10-06: «io voglio che rimanga salvato sul
server il post dell'utente e l'attività con tutti i dati, luogo, passo
medio, km… poi ti serviranno tutti questi dati per migliorarti nelle
ricerche in cosa la gente preferisce». L'attività era già tutta sul
server (TASK-172: traccia, pause, percorso, km, durata, punteggio, luogo,
forma o parola, titolo, tratti a piedi, sport); il post di «Share» no.
Tre scelte dell'utente, una domanda alla volta:

1. **Cosa resta del post**: emoji con la posizione, risultati accesi e
   titolo; **non l'immagine**, che si rifà da questi dati.
2. **Quando**: quando lo si condivide («Instagram», «Send to Strava»,
   «Update on Strava»); condiviso di nuovo cambiato, si aggiorna; chiuso
   senza condividere, non si salva. Nessun pulsante nuovo.
3. **Dove si rivede**: riaprendo «Share» da «My activities» il post torna
   com'era (stessi emoji nelle stesse posizioni, stessi risultati).

## Obiettivo

Il post di una corsa salvata, così come l'utente l'ha condiviso, è sul
server con la corsa, e «Share» lo riapre com'era.

## Contesto da leggere

- `docs/API.md`, «My activities»: `PUT /me/activities/{key}/post`
- `docs/DATABASE.md`, migrazione `0019_run_posts.sql`
- `docs/UI.md`, «Il post da condividere»
- `apps/mobile/src/share/SharePost.tsx`, `stickers.ts`, `postRun.ts`

## Cosa fare

1. Migrazione `0019_run_posts.sql`: `runs.post jsonb`, assente per ogni
   corsa di prima.
2. API: `RunPostRequestBody` / `RunPostBody` in `activities.py`,
   `PUT /me/activities/{key}/post` (200 con `shared_at`; 404 per una
   corsa che l'account non ha), `post` nella corsa intera
   (`GET /me/activities/{key}`); mai nell'elenco.
3. Esempi in `shared-types`: `run-post-request.json`, `run-post.json`.
4. App: `savePost` in `api/activities.ts`; `keepPost` nella porta delle
   attività (fuoco e dimentica; una sessione finita si ascolta);
   `SharePost` manda il post dopo che il foglio di condivisione si è
   aperto e dopo un invio a Strava riuscito, e si apre con il post
   tenuto; `stickersOf` / `placedOf` in `stickers.ts`.
5. Documenti: `API.md`, `DATABASE.md`, `UI.md`, ADR-0222, STATUS.

## Criteri di accettazione

- [x] `PUT /me/activities/{key}/post` tiene titolo, risultati ed emoji con
      posizione, risponde con `shared_at`, e il secondo `PUT` sovrascrive.
- [x] `GET /me/activities/{key}` ha `post` (`null` senza); l'elenco no.
- [x] Una corsa di un altro account, o che non c'è: `404`.
- [x] Più di 5 emoji, un risultato doppio o sconosciuto, un campo in più
      (un'immagine): `422`.
- [x] Nell'app, «Instagram» (foglio aperto) e «Send to Strava» /
      «Update on Strava» (riuscito) mandano il post; l'immagine che non si
      fa, no; prima di «Save» (nessuna chiave), no.
- [x] «Share» su una corsa con un post lo riapre com'era; un risultato
      tenuto che la corsa non ha più non compare.
- [x] Lint, typecheck, Prettier, jest; ruff, black, pytest.

## File toccati

```
services/api/migrations/0019_run_posts.sql
services/api/shaperoute_api/activities.py
services/api/tests/test_run_posts.py
services/api/tests/test_activities.py
packages/shared-types/fixtures/run-post-request.json
packages/shared-types/fixtures/run-post.json
apps/mobile/src/api/activities.ts
apps/mobile/src/api/activities.test.ts
apps/mobile/src/activities/activitiesDoor.ts
apps/mobile/src/activities/activitiesDoorPost.test.tsx
apps/mobile/src/share/SharePost.tsx
apps/mobile/src/share/SharePost.test.tsx
apps/mobile/src/share/StravaPostRow.tsx
apps/mobile/src/share/postRun.ts
apps/mobile/src/share/postRun.test.ts
apps/mobile/src/share/stickers.ts
apps/mobile/src/share/stickers.test.ts
docs/API.md
docs/DATABASE.md
docs/UI.md
docs/DECISIONS.md
docs/STATUS.md
docs/tasks/TASK-258.md
```

## Fuori scope

- L'immagine PNG del post sul server (scelta dell'utente: no).
- Un pulsante «Save post» (scelta dell'utente: no).
- Un'anteprima del post nella corsa aperta (scelta dell'utente: no).
- Il post di una corsa non ancora salvata (a fine corsa, prima di «Save»):
  non ha una chiave; si condivide come prima e non resta.
- Un post che non arriva all'API (rete assente): non si riprova. Il post
  è un di più; la condivisione è fatta.
- Usare i post e le corse per capire cosa piace: **in forma aggregata e
  anonima**, come gli `insights` (ADR-0101); un seguito, quando serve.

## Esito

Fatto il 2026-10-06. Migrazione 0019: **serve l'aggiornamento del
server**, con l'ok dell'utente tramite il coordinatore; prima di allora
l'app riceve `404` sul post e non dice niente (la condivisione è fatta
lo stesso) e legge le corse senza `post`. L'app esce con la pubblicazione
dopo.
