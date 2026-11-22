# TASK-484 — Allenamento in palestra scritto a mano, nel Feed

**Stato**: In lavorazione · parte 0 fatta (#1366, 2026-11-21); parte A
in `main` (#1371) e sul server (passo 17, 2026-11-22); parte B: i file
nuovi sul branch `feat/TASK-484-b-gym-by-hand-app`, l'aggancio aspetta
TASK-481 A
**Fase**: 5 · **Branch**: `docs/TASK-484-gym-by-hand` (parte 0)
**Dipende da**: TASK-481 A (il foglio «Add to Feed» con la lista e
`addToFeedEntries.ts`), TASK-385 (la palestra, ADR-0327), TASK-411 C (le
schede)
**ADR**: ADR-0395 (numero dal Coordinatore) · applica ADR-0390 e
ADR-0272 alla palestra

## Obiettivo

La quinta voce del foglio «Add to Feed» (TASK-481, ADR-0390): «Gym
workout», «A workout you already did, written by hand». Si scrive un
allenamento in palestra già fatto (esercizi, serie, pesi, giorno, ora e
durata) e diventa il post della palestra con «Imported».

## Contesto da leggere

- `docs/tasks/TASK-481.md` (parte D, la mappa delle voci), ADR-0390;
- ADR-0272 (le attività importate), `docs/IMPORTAZIONI.md` §3 e §5;
- `docs/sports/gym.md` («Cosa registra», «I traguardi», «Il post nel
  Feed», «La classifica»);
- `apps/mobile/src/gym/SessionEditor.tsx`, `GymPostForm.tsx`,
  `useGymOutbox.ts`; `services/api/shaperoute_api/gym_sessions.py`,
  `gym_levels.py`.

## Già scelto in TASK-481 (2026-11-21)

- «Gym workout» è la quinta voce, con la riga «A workout you already did,
  written by hand»; compare solo quando è pronta.
- Si scrivono esercizi, serie, pesi, giorno e durata; poi il post della
  palestra con «Imported».
- Parte con **«Everyone»**, che si vede e si cambia prima di «Save»
  (un'altra eccezione ad ADR-0304, scritta in ADR-0390).
- Ha la sua riga di privacy, approvata qui.

## Parte 0 — Le scelte dell'utente (2026-11-21)

Una domanda per volta, ognuna con la proposta dell'agente.

1. **Come si scrive.** Proposta, **accettata («Editor delle schede»)**:
   l'editor delle schede di oggi (`SessionEditor`), una riga per esercizio
   con serie × ripetizioni (o × tempo) e un valore uguale per tutte le
   serie («Bench press 4 × 10 · 60 kg»); «From a plan» riempie la lista con
   gli esercizi di una propria scheda, poi si cambia. Sopra: giorno, ora
   d'inizio, durata. Sotto: il modulo del post della palestra con
   «Imported». Un peso diverso a ogni serie si scrive con due righe dello
   stesso esercizio. Scartati: serie per serie come le correzioni dopo
   «Stop» (più lento, e quell'editor è legato all'allenamento in corso);
   le righe che si aprono serie per serie (il più lavoro).
2. **Che cosa conta.** Proposta, **accettata («Come le importate»)**:
   - **conta**: Feed, «My activities» e calendario, con «Imported»; le kcal
     stimate dalla durata come oggi (`gymKcal`);
   - **non conta**: gioco, concorso, badge, classifica della palestra,
     **livelli** (niente «New level» nel post), Apple Salute e Health
     Connect, il giorno della scheda fatto (anche partendo da «From a
     plan»).

   Scartati: anche i livelli; livelli e giorno della scheda.
3. **I testi.** **Risposta: «Approvo»**, in inglese; italiano, tedesco,
   francese e spagnolo li prepara l'agente e vanno all'utente con le
   schermate della parte B.

   | Dove | Testo |
   |---|---|
   | Titolo del flusso | «Gym workout» |
   | Campo del giorno, con «‹ ›» | «Day» (il giorno come le altre date dell'app: «Yesterday, Fri 20 Nov») |
   | Campo dell'ora d'inizio (18:30) | «Started» |
   | Campo della durata (1:05) | «Duration» |
   | Pulsante | «From a plan» |
   | Sotto «Imported» | «Workouts written by hand don't count for Play, contests, levels or the leaderboard.» |
   | Ora d'inizio più durata dopo adesso | «Pick a time before now.» |

   Senza esercizi «Save» resta spento, senza testo. «Add exercise»,
   «Imported», i testi del modulo del post ci sono già.
   Scartato: la frase di oggi delle importate («Imported activities don't
   count for Play or contests.»), che non nomina i livelli.
4. **La privacy.** **Risposta: «Approvo»**, in inglese; le altre quattro
   lingue sullo stesso modello, con le schermate; la data della privacy è
   quella del merge della parte B.
   1. Riga nuova, dopo «If you add a past activity from a file…»: «If you
      add a gym workout written by hand, we keep its day, time, duration,
      exercises, sets and weights like a workout recorded with MuW.»
   2. La palestra: «…your milestones at the gym (the figure, the exercise
      and your best set), counted from **the workouts you record with
      MuW**, private ones too, but never the workout.» (era «counted from
      all your workouts»).
   3. L'eccezione del «+» (dopo la precisazione di TASK-481 A):
      - privacy: «An activity you add from a file, **or a gym workout you
        write by hand**, with the «+» of the Feed is the exception: it
        starts on «Everyone», which you see before «Save» and can
        change.»;
      - aiuto: «…one added from a file, **or a gym workout written by
        hand**, with the «+» of the Feed starts on «Everyone», and you can
        change it before «Save».»

   Scartato: solo la riga nuova.

## Il modo (deciso dall'agente su delega dell'utente)

Verificato sul codice il 2026-11-21. La proposta di partenza di TASK-481
diceva `PUT /me/activities/{key}`: la palestra invece si salva già con
`PUT /me/gym-sessions/{key}` (una riga di `runs` con `activity = 'gym'`,
`track` vuoto, più `gym_sessions` e `gym_sets`), e
`ActivityRequestBody` rifiuta la palestra.

- **Stessa rotta, un campo in più**: `source` in `GymSessionRequestBody`,
  `"muw"` per difetto o **`"manual"`**, salvato in `runs.source`. Nessuna
  tabella nuova: Feed, «My activities», calendario, reazioni, commenti,
  segnalazioni e chiave dal telefono (`gymKey`, rimandata senza rete con
  `gym-outbox.json`) valgono come oggi.
- **Un valore nuovo di `runs.source`**, non `file`: una corsa da file ha
  una traccia vera e orari di un'altra app; una scritta a mano no. Una
  migrazione allarga il `CHECK` di 0034 a `('muw', 'file', 'manual')`.
- **L'API controlla la forma di un `manual`** (422 altrimenti): ogni serie
  `live: false`, nessuna pausa, `rests` e `rest_s` a zero, `plan` vuoto,
  `ended_at` non dopo adesso (con il margine dell'orologio di sempre),
  inizio dal 2020 come ogni corsa. `PUT /me/activities` rifiuta
  `"manual"`.
- **Fuori da quello che non conta**: classifica, badge, concorso e gioco
  prendono già solo `source = 'muw'` (`gym_leaderboard.py`, `badges.py`,
  `contests.py`, `game_backfill.py`); i **livelli** no, e la parte A
  aggiunge il filtro in `gym_levels.py` (livelli del profilo e
  `new_levels` del post).
- **Nessun tipo nuovo in `X-MuW-Reads`**: le app di oggi mostrano già
  «Imported» per ogni `source` diverso da `muw` (`DrawingCard`,
  `isImported`), e un allenamento scritto a mano è un allenamento della
  palestra come gli altri.
- **Le serie sul telefono**: ogni riga dell'editor diventa tante serie
  uguali quante ne dice, `live: false`, con `at_s` distribuiti a passo
  uguale dentro la durata (l'API vuole ogni serie dentro l'allenamento).
- **Il giorno senza calendario nativo**: «‹ ›» da oggi indietro fino al
  2020; ora e durata scritte come i tempi delle serie (`SetFields`).
  Nessuna dipendenza, impronta iOS invariata, esce con un OTA.
- **La visibilità**: il modulo parte da «Everyone» al posto dell'ultima
  scelta (come «From a file» dal «+», ADR-0387).
- **Niente «Sleep last night»**, niente Salute, niente «Send to Strava».

## Parti

### A — Server: `source: "manual"` per la palestra

- Migrazione `0081_gym_by_hand.sql` (numero del Coordinatore: la prima entrata prende il primo libero): il `CHECK`
  di `runs.source` con `manual`.
- `gym_sessions.py`: `source` nella richiesta e nella risposta
  (`GymSessionBody`), i controlli di un `manual`, il valore in `runs`.
- `activities.py`: `RunSource` con `manual` (lo leggono anche
  `drawings.py` e le risposte di «My activities»); `ActivityRequestBody`
  rifiuta `manual`.
- `gym_levels.py`: solo `source = 'muw'` nei livelli e in `new_levels`.
- Tipi condivisi: `RUN_SOURCES` con `manual`, `source` in
  `GymSessionRequest` e `GymSession`, una fixture nuova.
- Va sul server prima della parte B: un passo del Coordinatore col sì
  dell'utente, con i controlli in `out/TASK-484/SERVER-A.md`.

**Ordine (Coordinatore, 2026-11-21)**: parte da `main`. `activities.py` e
`test_imported_runs.py` sono stati toccati di recente (461 D1, 355 B1):
merge di `main` prima del push. In `gym_sessions.py` TASK-483 (lo storico
degli esercizi) aggiungerà una rotta di lettura: qui solo righe aggiunte o
cambiate nel modello e in `save`, nessuno spostamento.

**File toccati (approvati dal Coordinatore il 2026-11-21):**

```
services/api/migrations/0081_gym_by_hand.sql            (nuovo)
services/api/shaperoute_api/gym_sessions.py
services/api/shaperoute_api/activities.py              (RunSource; manual rifiutato)
services/api/shaperoute_api/gym_levels.py              (solo source = 'muw')
services/api/tests/test_gym.py
services/api/tests/test_gym_levels.py
services/api/tests/test_imported_runs.py
packages/shared-types/src/index.ts                     (RUN_SOURCES)
packages/shared-types/src/gym.ts                       (source)
packages/shared-types/fixtures/gym-session-manual.json  (nuovo)
packages/shared-types/test/imported.test.ts
packages/shared-types/test/gym.test.ts
docs/API.md                                            («Gym»: source)
docs/DATABASE.md                                       (la migrazione)
docs/sports/gym.md                                     (cosa conta uno scritto a mano)
docs/IMPORTAZIONI.md                                   (§1 e §5)
docs/tasks/TASK-484.md
```

### B — App: il flusso «Gym workout» e la sua voce

- Un flusso nuovo nel foglio «Add to Feed» (con «‹» e «✕» di TASK-481 A):
  «Day», «Started», «Duration», «From a plan», l'editor delle schede,
  «Imported» con la sua frase, il modulo del post (`GymPostForm`) partito
  da «Everyone», «Save».
- «From a plan»: la lista delle proprie schede; una scheda con i giorni
  chiede quale giorno. Senza schede il pulsante non c'è.
- «Save» passa da `gym-outbox.json` come un allenamento finito: senza rete
  aspetta sul telefono.
- La voce in `addToFeedEntries.ts` (dopo TASK-481 A), pronta con un
  account; il server deve già avere la parte A.
- Testi nelle cinque lingue, schermate dal simulatore all'utente; la
  privacy del punto 4 a turno, col sì dell'utente sulle quattro traduzioni.
- Niente server, niente impronta nativa: esce con un OTA.

**File toccati (approvati dal Coordinatore il 2026-11-21):**

```
apps/mobile/src/gym/GymByHand.tsx                (nuovo: il flusso)
apps/mobile/src/gym/GymByHand.test.tsx           (nuovo)
apps/mobile/src/gym/byHand.ts                    (nuovo: righe → GymSessionRequest, giorno e ora)
apps/mobile/src/gym/byHand.test.ts               (nuovo)
apps/mobile/src/gym/useGymOutbox.ts              (salvare una richiesta già fatta)
apps/mobile/src/feed/addToFeedEntries.ts         (la riga «Gym workout», dopo TASK-481 A)
apps/mobile/src/feed/addToFeedEntries.test.ts
apps/mobile/src/i18n/{it,de,fr,es}.ts
docs/tasks/TASK-484.md
```

**Avanzamento della parte B (2026-11-22, deciso dall'agente su delega
dell'utente).** Sul branch, prima di TASK-481 A, solo file nuovi e quelli
della lista che nessuno tiene: il flusso (`GymByHand.tsx`), la sua logica,
`saveRequest` in `useGymOutbox.ts`, i testi nelle quattro lingue (da far
approvare con le schermate). Due scarti dalla lista:

- la logica si chiama `byHand.ts`, non `gymByHand.ts`: su macOS (disco
  senza maiuscole) `./GymByHand` trovava `gymByHand.ts` prima di
  `GymByHand.tsx`, e il componente risultava `undefined`;
- due testi in più, solo per VoiceOver sulle frecce del giorno: «Previous
  day» e «Next day».

Il giorno mostra «Today», «Yesterday» o la data intera già dell'app
(«Thu 19 Nov 2026»), senza un testo nuovo «Yesterday, Fri 20 Nov». Resta:
la riga in `addToFeedEntries.ts` (dopo TASK-481 A, con «‹» e «✕» del foglio;
il titolo del flusso si sposta lì se il foglio lo mostra), poi la PR.

**Schermate approvate (2026-11-22).** Otto schermate dal simulatore
(iPhone 17e, harness non committato) in `out/TASK-484/b/` del checkout
principale: modulo vuoto, «Da una scheda», giorni di una scheda, esercizio
copiato, «Scegli un orario prima di adesso.», fondo con «Importata» e post,
più due in inglese. L'utente: «Sì, approvo» — aspetto e testi nelle quattro
lingue, «Previous day»/«Next day» compresi. Se la riga del foglio cambia
l'aspetto (titolo spostato), una schermata in più prima della PR.

A turno (privacy, punto 4; in coda dopo 309 B1, 417 D2, 312 C2, 481 A e
485, il Coordinatore dice quando tocca):

```
apps/mobile/src/about/content/{en,it,de,fr,es}.ts
apps/mobile/src/about/documents.test.ts           (+ AboutPage.test.tsx, site/tests/privacy.test.mjs: la data)
site/privacy/**/index.html                        (rigenerate con make_privacy.mjs)
```

## Criteri di accettazione

- [x] **0**: scelte dell'utente scritte qui e in ADR-0395; liste dei file approvate dal
      Coordinatore.
- [ ] **A**: un `PUT /me/gym-sessions` con `source: "manual"` si salva e
      torna con `source`; serie `live: true`, pause, `plan` o fine dopo
      adesso danno 422; `PUT /me/activities` con `manual` dà 422 (test).
- [ ] **A**: uno scritto a mano non alza i livelli, non ha `new_levels`,
      non entra in classifica, badge, concorso, gioco (test).
- [ ] **A**: un allenamento senza `source` resta `muw`, come prima (test).
- [ ] **A**: sul server col sì dell'utente.
- [ ] **B**: la voce compare nel foglio con un account; il flusso salva e
      il post parte da «Everyone» con «Imported»; «Save» spento senza
      esercizi; «Pick a time before now.» (test).
- [ ] **B**: schermate e quattro traduzioni approvate dall'utente;
      privacy del punto 4 nelle cinque lingue e sul sito.
- [ ] **B**: `tsc` e jest dei file toccati verdi, CI verde.

## Fuori scope

- Un peso diverso a ogni serie dentro una riga (scartato al punto 1).
- Un'attività qualsiasi scritta a mano senza GPS (idea 4 di TASK-476).
- Correggere dopo «Save» un allenamento scritto a mano (come oggi: si
  cancella e si riscrive).
- «Workout plan» (TASK-485).

## Esito

*(si compila a fine task)*
