# TASK-251 — «Paddle»: velocità in km/h e andatura in min/500 m

**Stato**: Done — parte A (l'uscita in corso e la sua fine) in `main` dalla #383 (`bf859e0`, 2026-10-06), pubblicata su `preview` (gruppo `1924575c`); parte B («My activities») in `main` dalla #394 (`c99b8c8`, 2026-10-06), sul server (`d7b490f1`) e su `preview` dal 2026-10-06; aperti per l'utente i tre punti di «Da confermare» e la prova sull'iPhone; parte C (in bici senza percorso, la velocità) in `main` dalla #458 (`fb27b50d`, 2026-10-09), da pubblicare su `preview` (coordinatore)
**Fase**: 4 · **Branch**: `feat/TASK-251-paddle-speed-pace`
**Dipende da**: TASK-191 (i percorsi sull'acqua), TASK-216 (la velocità
in bici, `navigation/ride.ts`), TASK-182 (km o miglia)

## Obiettivo

Chiesto dall'utente il 2026-10-06: «Quando registro un'attività in Kayak o
padel, la velocità oraria non è in chilometri orari, ma è l'unità di misura
che si usa col Kayak e anche l'andatura modificalo». Prima una pagaiata
mostrava i numeri di una corsa: il passo al chilometro dappertutto, nessuna
velocità.

## Scelta dell'utente (2026-10-06)

- **Velocità in km/h, andatura in minuti ogni 500 m.** Proposte anche: nodi
  e min/500 m; solo nodi. Con le miglia di «Settings» la velocità è in mph
  (detto nella proposta scelta), l'andatura resta ogni 500 m.

## Contesto da leggere

- `docs/DECISIONS.md` ADR-0215
- `docs/UI.md` «Sull'acqua: «Paddle»», «Velocità e andatura»
- `apps/mobile/src/navigation/ride.ts` (come la bici cambia la corsa)
- `apps/mobile/src/screens/RunPanel.tsx`, `RunDashboard.tsx`

## Parti

- **A — l'uscita in corso e la sua fine (solo app).** Questa PR.
- **B — «My activities» e il post da lì.** L'API teneva lo sport di una
  corsa salvata (`runs.activity`) ma non lo restituiva: ora `activity` è in
  `GET /me/activities` e in `GET /me/activities/{key}` (campo in più nel
  contratto, nessuna migrazione; `API.md`), nei fixture di `shared-types`,
  e l'app lo legge in `activityText.runFacts` e `postOfActivity`. Un'app di
  B con un server di prima (senza `activity`) scrive il passo al km come
  prima: il campo è facoltativo nell'app. Aggiornare il server chiede l'ok
  dell'utente.

- **C — in bici senza percorso, la velocità (solo app).** Scelta
  dell'utente del 2026-10-08 sul terzo punto di «Da confermare»:
  «Ride without a route» mostra la velocità invece del passo al km.

## Cosa fare (parte C)

1. `src/navigation/freeSport.ts` (nuovo): `freeRunActivity`, lo sport di
   «Settings» per una corsa senza percorso; una corsa non ne ha.
2. `useFreeRun.ts`: il file della corsa tiene anche `cycling`, così la
   fine della corsa (`FreeFinishCard`, che legge `run.activity`) ha le
   velocità.
3. `FreeRunScreen.tsx`: `FreeRunCard` passa `cycling` a `RunCard`, lo
   stesso componente dei numeri della bici con un percorso (TASK-216).
4. Niente di nuovo da dire: i testi sono quelli della bici, già in cinque
   lingue. La voce resta quella della corsa senza percorso; il post e «My
   activities» scrivono il passo al km come una pedalata con un percorso.

## Cosa fare (parte A)

1. `src/navigation/paddle.ts` (nuovo): `isPaddle`, `PADDLE_PACE_M`,
   `per500S`, `paddlePaceLabel`, `paddleAnnouncement`.
2. `RunPanel.tsx`: con `paddling` «Speed now» e «Avg speed» (km/h o mph),
   «Avg /500 m», «Last 500 m»; niente «Last km» né «Elev. gain».
3. `RunDashboard.tsx`: i parziali ogni 500 m, chiamati coi metri.
4. La voce: ogni km (o miglio) col passo medio ogni 500 m, cinque lingue.
5. Il post di fine uscita: l'andatura in `/500 m`; lo sport nel file della
   corsa (`SavedRun.activity`).
6. Senza percorso («Paddle without a route»): lo stesso, dallo sport di
   «Settings» alla partenza.

## Criteri di accettazione

- [x] Lungo un percorso sull'acqua, sotto la mappa: «Speed now» in km/h.
- [x] Su «Data» e in pausa: «Speed now», «Avg speed», «Time», «Avg /500 m», «Last 500 m», «Calories».
- [x] I parziali sono ogni 500 m («500», «1000», …), col loro tempo e la
      differenza dal precedente; prima dei primi 500 m lo dicono.
- [x] Con le miglia: distanza in miglia, velocità in mph, andatura e
      parziali sempre ogni 500 m.
- [x] La voce dice ogni km (con le miglia ogni miglio) col passo medio
      ogni 500 metri, in cinque lingue.
- [x] Il post di fine uscita scrive «5:37 /500 m».
- [x] Senza percorso, con «Paddle» in «Settings»: schermata, voce, fine
      uscita e post come sopra.
- [x] Una corsa e una pedalata, con e senza percorso, restano come prima,
      parola per parola (i test di prima passano senza modifiche).
- [x] Typecheck, lint, prettier e tutti i test dell'app verdi.
- [ ] Guardato dall'utente sull'iPhone (dopo la pubblicazione).
- [x] Parte B: «My activities» e il post da lì scrivono «5:37 /500 m» per
      una pagaiata salvata; una corsa, e una risposta senza `activity`,
      come prima. Test API con PostgreSQL (`test_activities_sport.py`) e
      test dell'app (`paddleFacts.test.ts`).
- [ ] Server aggiornato (ok dell'utente), poi la prova sull'iPhone.
- [x] Parte C: con «Bike» in «Settings», senza percorso, sotto la mappa
      «Speed now» in km/h; su «Data» e a fine corsa «Avg speed», «Last km»
      e i km uno per uno in km/h, come lungo un percorso in bici; con le
      miglia mph. Test che falliscono su `main` e passano dopo
      (`RunFreeRide.test.tsx`, `freeRide.test.ts`).
- [x] Parte C: una corsa senza percorso col passo al km e «Paddle without
      a route» coi numeri della parte A, come prima.

## File toccati

```
apps/mobile/src/navigation/paddle.ts            (nuovo)
apps/mobile/src/navigation/paddle.test.ts       (nuovo)
apps/mobile/src/navigation/paddleRun.test.ts    (nuovo)
apps/mobile/src/screens/RunPaddle.test.tsx      (nuovo)
apps/mobile/src/voice/paddleWords.test.ts       (nuovo)
apps/mobile/src/screens/RunPanel.tsx
apps/mobile/src/screens/RunDashboard.tsx        (righe: i parziali)
apps/mobile/src/screens/FinishScreen.tsx        (una riga: il post)
apps/mobile/src/screens/FreeRunScreen.tsx       (righe: lo sport, il post)
apps/mobile/src/navigation/useNavigation.ts     (righe: la frase dei km)
apps/mobile/src/navigation/useFreeRun.ts        (righe: la frase dei km)
apps/mobile/src/navigation/trackStore.ts        (righe: `activity` nel file)
apps/mobile/src/share/postRun.ts                (righe: l'andatura)
apps/mobile/src/voice/phrasebook.ts
apps/mobile/src/voice/{en,it,de,es,fr}.ts       (due frasi ciascuno)
apps/mobile/src/i18n/{it,de,es,fr}.ts           (quattro testi ciascuno)
docs/tasks/TASK-251.md
docs/STATUS.md
docs/DECISIONS.md
docs/UI.md

Parte B:
services/api/shaperoute_api/activities.py        (righe: `activity` nei body, COLUMNS, _fields)
services/api/tests/test_activities_sport.py      (nuovo)
packages/shared-types/fixtures/activities.json
packages/shared-types/fixtures/activity.json
packages/shared-types/fixtures/activity-walks.json
packages/shared-types/fixtures/activity-pauses.json
apps/mobile/src/api/activities.ts                (righe: `activity?`)
apps/mobile/src/activities/activityText.ts       (righe: runFacts)
apps/mobile/src/activities/paddleFacts.test.ts   (nuovo)
apps/mobile/src/share/postRun.ts                 (righe: postOfActivity)
apps/mobile/src/screens/RunPanel.tsx             (una riga: import inutilizzato della A)
docs/API.md

Parte C:
apps/mobile/src/navigation/freeSport.ts          (nuovo)
apps/mobile/src/navigation/freeRide.test.ts      (nuovo)
apps/mobile/src/screens/RunFreeRide.test.tsx     (nuovo)
apps/mobile/src/navigation/useFreeRun.ts         (righe: lo sport nel file)
apps/mobile/src/screens/FreeRunScreen.tsx        (righe: lo sport della scheda)
apps/mobile/src/screens/RunPaddle.test.tsx       (un test: la bici senza percorso non è più «come prima»)
apps/mobile/src/navigation/paddleRun.test.ts     (un test: il file di una pedalata senza percorso tiene `cycling`)
docs/tasks/TASK-251.md
docs/STATUS.md
docs/DECISIONS.md
docs/UI.md
```

## Da confermare dall'utente

- I testi nuovi: «Avg /500 m» · «Med. /500 m», «Last 500 m» · «Ultimi
  500 m», «Your first 500 metres will show here.» · «I tuoi primi 500 metri
  appariranno qui.», e la frase della voce «… Passo medio: 6 minuti ogni
  500 metri.» (tedesco, spagnolo e francese scritti dall'agente).
- **«Elev. gain» non c'è sull'acqua**: al suo posto e a quello di «Last
  km» ci sono «Avg /500 m» e «Last 500 m». Se il dislivello serve, va tolto
  altro.
- **In bici senza percorso** («Ride without a route») la schermata mostra
  ancora il passo al km, non i km/h: non è stato chiesto e non è stato
  toccato. Da decidere.
  → **Deciso dall'utente il 2026-10-08**: la velocità. È la parte C.
- Parte C: **la voce** di una pedalata senza percorso dice ancora ogni km
  col passo medio, mentre con un percorso dice ogni 10 km la velocità
  media (ADR-0179). Non chiesto, non toccato: da decidere.
  → **Deciso dall'utente il 2026-10-09**: «la voce lasciala così».

## Esito

Parte B in `main` (#394, merge `c99b8c8`, 2026-10-06, terza nella coda del
coordinatore dopo #388 e #392). Parte A in `main` (#383, merge `bf859e0`, 2026-10-06; merge fatto dalla
sessione col sì dell'utente, perché il coordinatore era senza crediti). Le
caselle sono state guardate in un simulatore
(iPhone 17e, Expo Go, una pagina di prova con `RunStrip` e `RunGrid`):
«5:37 /500 m» rimpiccioliva il numero e «Passo med…» e «Letzte 500…»
venivano tagliati, quindi l'unità è nel nome della casella («Avg /500 m»)
e i nomi sono quelli che ci stanno. I parziali e la voce sono provati solo
dai test. Sull'iPhone, pagaiando, non è stata provata.

**Chiusura (2026-10-06, pulizia dei task file).** Il server è su `main`
`d7b490f1`, che contiene `c99b8c8`: `/me/activities` risponde con
`activity`. L'app con le parti A e B è su `preview` (gruppo `f062e005` e
seguenti). Restano dell'utente i tre punti di «Da confermare dall'utente»
e la prova sull'iPhone pagaiando.

**Parte C (2026-10-09).** In bici senza percorso la scheda e la fine della
corsa mostrano la velocità come lungo un percorso in bici: lo sport di
«Settings» alla partenza va nel file della corsa anche quando è `cycling`
(`freeSport.ts`). Nessun testo nuovo. «My activities» non cambia: l'app
non manda lo sport quando salva una corsa (lo sceglie il modulo di
pubblicazione, TASK-208), e lì solo `paddling` ha numeri suoi, quindi una
pedalata senza percorso si legge come una con il percorso, col passo al
km. Provata solo dai test; la pubblicazione è del coordinatore.

**Parte C chiusa (2026-10-09).** In `main` con la #458 (`fb27b50d`),
mergiata da Coordinatore 2 alla CI 5/5 verde, dopo la #444 e la #460.
Restano: la pubblicazione su `preview` (coordinatore), la prova
sull'iPhone pedalando senza percorso. La voce resta com'è: scelta
dell'utente del 2026-10-09 («la voce lasciala così»).
