# TASK-117 — Pubblicare una corsa salvata: i disegni

**Stato**: In corso — parte A (API) in `main` (PR #232); parte B (app)
in lavorazione (sessione «Nuova tasca», dal 2026-10-03)
**Fase**: 4 · **Branch**: `feat/TASK-117-publish-runs` (parte A),
`feat/TASK-117-publish-app` (parte B)
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

**Risposte dell'utente** (2026-10-03):

1. **«Public» in tutti e due i posti**: a fine corsa sopra «Save», e
   nella scheda di una corsa aperta da «My activities», per pubblicarla
   dopo, cambiarle il titolo o toglierla. L'interruttore parte **spento a
   ogni corsa** (non ricorda la volta prima).
2. **I testi**, come proposti, con **un solo campo «Title» a fine
   corsa**: dà il nome al disegno e, con «Send to Strava» acceso, anche
   alla corsa su Strava (a fine corsa prende il posto di «Name on
   Strava»; ok del coordinatore a toccare `StravaRunEnd.tsx`). Nella
   scheda di una corsa aperta il campo di Strava resta com'è.
   - Fine corsa, con account: «Public» (Off / On); acceso, «Others see it
     in your profile, without the first and last 200 m.»; «Title», col
     suggerimento «Give it a name»; senza rete, «Saved on the phone. It
     goes public when you are back online.»
   - Fine corsa, senza account: «Sign up or log in to keep your runs and
     share them as drawings.»
   - Scheda in «My activities»: «Public» (Off / On), «Title»; acceso,
     «Public in your profile, without the first and last 200 m.»
   - Elenco «My activities»: «Public» accanto a una corsa pubblica.
   - Profilo, il proprio e quello di un altro: «Drawings»; vuoto, il
     proprio «No public drawings yet. Make a run public in My
     activities.», di un altro «No drawings yet.»; un disegno aperto ha
     il titolo (senza titolo, la data), la data, i km, «82 out of 100».

Dal coordinatore: la griglia nel profilo di un altro
(`UserProfilePage.tsx`) non ha ancora un ingresso nell'app («da dove si
apre» è una domanda aperta di TASK-116): non se ne aggiunge uno. Nessuna
pubblicazione: l'app con «Public» va sul telefono dopo l'aggiornamento del
server con la migrazione `0009`, con l'ok dell'utente.

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

Parte B (ok del coordinatore per `StravaRunEnd.tsx` e per `App.tsx`,
che tocca anche TASK-205 in un altro punto):

```
apps/mobile/src/api/drawings.ts                (nuovo)
apps/mobile/src/api/drawings.test.ts           (nuovo)
apps/mobile/src/social/                        (nuovi: la coda senza rete,
                                                la porta dei disegni, la riga
                                                «Public», la griglia, la
                                                scheda del disegno, i test)
apps/mobile/__tests__/AppDrawings.test.tsx     (nuovo)
apps/mobile/src/activities/RunEnd.tsx
apps/mobile/src/activities/outbox.ts
apps/mobile/src/activities/activitiesDoor.ts
apps/mobile/src/activities/ActivityCard.tsx
apps/mobile/src/activities/ActivitiesList.tsx
apps/mobile/src/strava/StravaRunEnd.tsx
apps/mobile/src/profile/ProfileHome.tsx
apps/mobile/src/profile/UserProfilePage.tsx
apps/mobile/src/screens/ProfileLayer.tsx       (il provider)
apps/mobile/App.tsx                            (il disegno aperto sulla mappa)
apps/mobile/__tests__/AppStrava.test.tsx       (i testi cambiati)
apps/mobile/__tests__/AppActivities.test.tsx   (i testi cambiati)
docs/UI.md
docs/DECISIONS.md
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
