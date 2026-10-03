# TASK-117 — Pubblicare una corsa salvata: i disegni

**Stato**: In corso — parte A (API) in `main` (PR #232); parte B (app)
da fare, può partire
**Fase**: 4 · **Branch**: `feat/TASK-117-publish-runs` (parte A), un
branch nuovo da `main` per la parte B
**Dipende da**: TASK-113, TASK-116, TASK-172 · **ADR**: ADR-0159

## Obiettivo

Chi ha un account dà un titolo a una corsa salvata e sceglie se
pubblicarla. Pubblicata, gli altri iscritti la vedono come disegno nel suo
profilo e dal suo id, tagliata: senza i primi e gli ultimi 200 m.

## Com'è cambiato (2026-10-03)

Il task era scritto prima di TASK-172: voleva `POST /drawings` per salvare
un disegno a fine corsa. Salvare c'è già («My activities», ADR-0140), con
km, tempo e punteggio contati dall'API, e «Save» a fine corsa. Resta
pubblicare. L'app della fine corsa (`RunEnd.tsx`, `outbox.ts`) e la scheda
della corsa sono di TASK-187 (app); `App.tsx` e `src/api/activities.ts`
di TASK-200. **Scelta dell'utente**: due PR, l'API adesso e l'app dopo che
TASK-187 (app) e TASK-200 sono in `main`.

Due **scelte dell'utente** del 2026-10-03: gli altri vedono il punteggio;
una corsa senza percorso si pubblica anche lei, senza punteggio.

## Contesto da leggere

- `docs/DECISIONS.md` ADR-0114 (punto 4), ADR-0140, ADR-0159
- `docs/API.md` «My activities», «Profile», «Drawings»
- `docs/DATABASE.md` `runs`, `drawings`
- `docs/UI.md` «My activities», profilo (TASK-116)

## Parte A — l'API (fatta, in `main` con la PR #232)

1. `GET` e `PUT /me/activities/{key}/drawing` (titolo al più 60
   caratteri, «Public»), `GET /me/drawings`, `GET
   /users/{public_id}/drawings` (a pagine), `GET /drawings/{id}`.
2. La traccia per gli altri senza i primi e gli ultimi 200 m lungo di lei,
   tagliata nell'API; mai il percorso pianificato, gli orari, le pause.
3. `PublicProfile.drawings` conta i disegni pubblici.
4. Migrazione nuova, test, `API.md`, `DATABASE.md`, ADR-0159.

## Parte B — l'app (da fare)

1. «Public» e il titolo: a fine corsa accanto a «Save» (`RunEnd.tsx`) e
   nella scheda di una corsa in «My activities»; senza account l'invito a
   iscriversi, e la corsa resta sul telefono come oggi.
2. Pubblicare senza rete: la scelta si rimanda (il `PUT` è la scelta
   intera), come la corsa nella coda di `outbox.ts`.
3. Nel profilo di un altro (`UserProfilePage.tsx`) e nel proprio la
   griglia dei disegni pubblici (miniatura della traccia tagliata,
   punteggio); toccando, il disegno sulla mappa.
4. In «My activities» un segno sulle corse pubbliche (`GET /me/drawings`).
5. Test, `UI.md`, i testi nuovi da far vedere all'utente.

Da chiedere all'utente prima della parte B: dove sta «Public» (a fine
corsa, nella scheda, o tutti e due), e i testi.

## Criteri di accettazione

- [x] Il punteggio di un disegno è quello calcolato dall'API, anche se
      l'app ne manda un altro (`422` per un campo in più; test).
- [x] Un disegno privato dà «non trovato» a chiunque altro (test).
- [x] La traccia di un disegno pubblico, chiesta da un altro utente, non ha
      punti entro 200 m di percorso dalla partenza e dall'arrivo (test).
- [x] Cancellata la corsa, il disegno non compare più in nessun elenco
      (test, anche con l'account cancellato).
- [ ] Salvataggio fallito senza rete: l'app lo riprova, la scelta non si
      perde (parte B).
- [x] Test verdi dell'API (parte A).
- [ ] Test dell'app; prova sull'iPhone (parte B).

## File toccati

Parte A:

```
services/api/migrations/0009_drawings.sql
services/api/shaperoute_api/drawings.py
services/api/shaperoute_api/app.py
services/api/shaperoute_api/profiles.py
services/api/tests/test_drawings.py
services/api/tests/test_favorites.py   (una riga: la 0008 non è più l'ultima; ok dell'utente)
packages/shared-types/src/index.ts
packages/shared-types/fixtures/drawing-request.json
packages/shared-types/fixtures/my-drawing.json
packages/shared-types/fixtures/drawings.json
packages/shared-types/fixtures/drawing.json
packages/shared-types/test/drawings.test.ts
docs/API.md
docs/DATABASE.md
docs/DECISIONS.md
docs/STATUS.md
docs/tasks/TASK-117.md
```

Parte B, prevista:

```
apps/mobile/src/api/drawings.ts
apps/mobile/src/api/drawings.test.ts
apps/mobile/src/activities/RunEnd.tsx
apps/mobile/src/activities/outbox.ts
apps/mobile/src/activities/ (la scheda della corsa)
apps/mobile/src/profile/UserProfilePage.tsx
apps/mobile/src/social/ (nuovi)
docs/UI.md
docs/STATUS.md
docs/tasks/TASK-117.md
```

## Fuori scope

- Vedere i disegni degli altri in un feed (TASK-118).
- Rifare la forma di un disegno di un altro («Start» da un disegno).
- Caricare un GPX da Strava o Garmin; foto della corsa.
- Like, commenti, segnalare (TASK-119–121).

## Esito

**Parte A** (2026-10-03): API dei disegni in `drawings.py`, tabella
`drawings` (migrazione `0009`: la `0008` è di TASK-200, entrata prima),
ADR-0159. Il taglio è lungo la traccia, come dice ADR-0114;
uno in linea d'aria è annotato nell'ADR come proposta per l'utente. Un
disegno privato lo vede il suo autore, tagliato come lo vedrebbero gli
altri. Test: 26 in `test_drawings.py`, tutta la suite dell'API verde
dopo il merge di `main` con TASK-200 (792); `shared-types` verde. Entra in
`main` dopo TASK-200 (coordinatore: `app.py`, `shared-types`, migrazioni):
TASK-200 è entrato prima, con la `0008`. Il suo `test_favorites.py` voleva
la `0008` ultima: una riga cambiata, con l'ok dell'utente.

Seguiti:

- **Parte B, l'app**, con le due domande sopra.
- **TASK-116**: il profilo conta solo i disegni pubblici (ADR-0128 punto
  6, ADR-0159 punto 8); contare anche le corse private resta una scelta
  dell'utente aperta in TASK-116.
- **Il server**: la migrazione e gli endpoint arrivano con il prossimo
  aggiornamento, con l'ok dell'utente.
