# TASK-475 — Lo stretching come sport

**Stato**: In corso · parte 0 in `main` (#1283); parte A in PR (`feat/TASK-475-a-stretching`, 2026-11-21); B dopo A
**Fase**: 5 · **Branch**: `docs/TASK-475-stretching-sport` (parte 0); A, B
ciascuna col suo branch e la sua PR
**ADR**: ADR-0386
**Dipende da**: TASK-466 (lo stretching nuovo, ADR-0378): la parte B qui
parte solo dopo che la #1216 (466 B, le routine) è in `main`.

## Obiettivo

Lo stretching diventa uno sport del pannello degli sport (gruppo «Other»),
come la palestra: lo scegli, «Draw» ti propone le routine, e una routine
finita è un'attività.

## Scelte dell'utente (2026-11-12)

- «aggiungi lo streching» al pannello degli sport (TASK-473).
- Fra «Apre le routine» (un quadrato che apre solo lo stretching, senza
  cambiare sport) e «Diventa uno sport»: **«Diventa uno sport»**.
- Una routine finita si salva come attività («My activities», calendario,
  condivisione) come la palestra? **«Sì, come la palestra»**: la parte A
  (server) serve.

## Cosa prende da TASK-466 e cosa aggiunge

TASK-466 (ADR-0378) costruisce lo stretching: A la figura e la schermata
(in `main`), B gli esercizi e le routine Morning, After run, After gym da 3,
5 e 10 minuti (#1216), C lo stretching in palestra, D «Morning stretch» al
mattino, E le routine dell'utente pubblicate nel Feed («Do this routine»).

TASK-475 **prende** da 466 la schermata (`StretchScreen`) e le routine di
B, senza cambiarle; **aggiunge** solo:

1. lo sport `stretching` nel registro (app e server), `ready: false` finché
   non è pronto tutto;
2. con lo sport scelto, «Draw» mostra le routine di 466 B e le avvia;
3. la sessione finita salvata come attività (sport,
   routine, durata), come una sessione di palestra.

Nessuna parte di 466 prevede di salvare una sessione di stretching: la E
pubblica una *routine* (la ricetta), non una sessione fatta. Le due cose non
si contraddicono; un post di sessione e un post di routine restano due cose
diverse.

## Parti

- **A — Server** (se la sessione si salva): l'attività `stretching` nel
  contratto e nell'API; migrazione provvisoria **0079** per il vincolo su
  `runs.activity`, se serve. Lista dei file al Coordinatore prima del codice;
  turno su `app.py`, `shared-types`, `docs/API.md` (ora 455 C) e su
  `sports/__init__.py`, `activities.py`, `reads.py` (dopo 463 B, #1278);
  `engine.zip` dopo la #1269 di 471.
- **B — App**: `settings/sport.ts` e `sportFamilies.ts` (dopo 413 #1280 e
  463 B #1278), «Draw» con le routine, il salvataggio; i file di
  `src/stretch` concordati con la sessione di TASK-466 B e col
  Coordinatore. Dopo la #1216 in `main`.
- **C — Acceso**: `ready: true`, col sì dell'utente sulle schermate.

## Testi nuovi (approvati dall'utente il 2026-11-12)

| Inglese | Italiano | Francese | Tedesco | Spagnolo | Emoji |
|---|---|---|---|---|---|
| Stretching | Stretching | Étirements | Dehnen | Estiramientos | 🧘 |

Il nome dello sport è una chiave nuova, separata da «Stretch» (il tasto di
fine corsa, un verbo in francese, tedesco e spagnolo). Sì dell'utente,
viste nome, emoji e le quattro traduzioni: «Sì, approvati». Altri testi
della pagina «Draw» o del post, se servono, tornano all'utente prima del
codice della parte B.

## Criteri di accettazione

- [x] A: il server accetta e rilegge una sessione `stretching` senza
      traccia (durata, routine), come la palestra; test dell'API e dei
      tipi condivisi verdi.
- [ ] B: «Stretching» 🧘 nella famiglia «Other» del pannello, `ready:
      false` («Soon»); `FAMILY_OF` lo copre (test di TASK-473 verdi).
- [ ] B: con lo sport scelto «Draw» mostra le routine di TASK-466 B e una
      routine finita si salva come attività, in «My activities» e nel
      calendario.
- [ ] Nessun file di `src/stretch` cambiato senza l'accordo della
      sessione di TASK-466 e del Coordinatore.
- [ ] C: acceso (`ready: true`) col sì dell'utente sulle schermate.

## Parte A — com'è fatta (2026-11-21)

Decisa dall'agente su delega dell'utente, con la ricetta
(`sports/COME-AGGIUNGERE.md`, sezioni 2–4): contratto, API e profilo
nascosto dell'app in una PR, senza la deroga `SERVER_FIRST`. Lista dei file
approvata dal Coordinatore (2026-11-21); `0079` sua.

- **Uno sport senza traccia dopo la palestra**: `TracklessSport` nel
  contratto, `ApiSport(trackless=True)` nell'API (Strava «Yoga», mai
  mandato), `X-MuW-Reads` con `stretching` e `trackless`.
- **Un endpoint suo**, come la piscina: `PUT/GET /me/stretch-sessions/{key}`
  e `GET /drawings/{id}/stretch` (`stretch_sessions.py`). La routine è la
  chiave del telefono (`morning`, `afterRun`, `afterGym`), con i minuti e
  gli esercizi fatti; il tempo lo conta il server.
- **`0079_stretching.sql`**: allarga `runs_activity_check` e
  `runs_track_check`, crea `stretch_sessions`.
- **Profilo nascosto** (`src/sports/stretching.ts`): Salute
  `.flexibility` (62), Health Connect `EXERCISE_TYPE_STRETCHING` (71),
  energia 2,3 MET; sull'orologio no (al chiuso, `NOT_ON_WATCH`). Nessuna
  riga in Impostazioni né nel pannello: arrivano con la B.
- **Da sapere per la B**: il server non distingue fra due attività senza
  traccia quando si pubblica (`drawings.py`, `NOT_TRACKLESS`): il modulo
  per pubblicare deve tenere lo sport della sessione, come fa per la
  palestra.

## File toccati (parte A)

```
services/api/migrations/0079_stretching.sql                 (nuovo)
services/api/shaperoute_api/stretch_sessions.py             (nuovo)
services/api/shaperoute_api/sports/stretching.py            (nuovo)
services/api/shaperoute_api/sports/__init__.py
services/api/shaperoute_api/activities.py
services/api/shaperoute_api/reads.py
services/api/shaperoute_api/app.py
services/api/tests/test_stretching_api.py                   (nuovo)
services/api/tests/test_record_only.py
packages/shared-types/src/sports/stretching.ts              (nuovo)
packages/shared-types/src/stretchSession.ts                 (nuovo)
packages/shared-types/src/sports/index.ts
packages/shared-types/src/index.ts
packages/shared-types/fixtures/stretch-session.json         (nuovo)
packages/shared-types/fixtures/run-activities.json
packages/shared-types/fixtures/reads.json
packages/shared-types/test/stretching.test.ts               (nuovo)
packages/shared-types/test/sportRegistry.test.ts
packages/shared-types/test/gym.test.ts
apps/mobile/src/sports/stretching.ts                        (nuovo)
apps/mobile/src/sports/index.ts
apps/mobile/src/sports/sportProfiles.test.ts
apps/mobile/src/sports/activityName.test.ts
apps/mobile/src/api/accounts.test.ts
apps/mobile/src/i18n/{it,fr,de,es}.ts
apps/mobile/src/watch/watchSports.ts
apps/mobile/src/watch/watchSports.test.ts
apps/mobile/targets/watch/Core/Sources/WatchCore/Resources/sports.json
apps/mobile/targets/watch/{it,en,fr,de,es}.lproj/Localizable.strings
apps/mobile/assets/engine/engine.zip
docs/API.md
docs/DATABASE.md
docs/tasks/TASK-475.md
```

## File toccati (parte 0)

```
docs/tasks/TASK-475.md   (nuovo)
docs/DECISIONS.md        (ADR-0386, voce e riga d'indice)
```

## Esito

*(a fine task)*
