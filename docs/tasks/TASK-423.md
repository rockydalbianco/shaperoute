# TASK-423 — «Play» grande: collezioni, km fino a 10 000, passi, sfide personali, premi

**Stato**: Done — tutte le parti (documenti, A, B, C, fix #1037, D, D2, E1, E2a, E2b) in `main` e in produzione (server fino al passo 6, OTA 9, privacy sul sito); provate sul telefono dall'utente il 2026-11-11
**Fase**: 5 · **Branch**: `docs/TASK-423-play-expansion` (documenti), poi
`feat/TASK-423-a-catalog`, `-b-paces`, `-c-personal`, `-d-app`, `-e-prizes`
**ADR**: ADR-0351 (estende ADR-0255) · **Migrazioni**: una in C, una in E,
il primo numero libero al merge · Numeri dati dal Coordinatore il
2026-11-09

## Obiettivo

«Play» mostra 10 collezioni con 94 forme, km da 1 a 10 000, livelli di passo
su 10 distanze, sfide personali e streak in una lista unica con quelle di
squadra e il link alla sfida del mese, e premi solo dentro l'app (edizioni,
cornici, titoli, badge).

Richiesta dell'utente del 2026-11-08 (il brief in `out/TASK-423/prompt.md`
nel checkout principale). La proposta — `TASK-423-proposta.md`, accanto a
questo file — è stata **approvata dall'utente il 2026-11-08 con «Sì,
approvo»**, comprese le tre scelte: il catalogo com'è, l'ora del telefono
(`utc_offset_min`) con il testo della privacy in C, i premi sul profilo
pubblico solo se scelti, con il testo della privacy in E.

## Contesto da leggere

- `docs/tasks/TASK-423-proposta.md` — il catalogo, le scale, le sfide, i
  premi (fonte dei numeri)
- `docs/GIOCO.md` — tutto; §5.3 e §6.6–6.8 per le parti nuove
- `DECISIONS.md` ADR-0351; ADR-0255 (il gioco), ADR-0315 (le camminate),
  ADR-0272 (le corse importate) con grep in `docs/archive/`
- Codice: `services/api/shaperoute_api/game*.py`,
  `apps/mobile/src/game/`

## Confini (note del Coordinatore, 2026-11-09)

- TASK-343 (sfide del mese, B in `main` con la #667) non si tocca: solo un
  link alla sua pagina.
- `RunGameStrip` e `RunDashboard` li tocca TASK-422 (#971): la parte D parte
  da `main` dopo il merge della #971.
- Prima del codice di ogni parte, la lista dei file va al Coordinatore.
- Migrazioni: il primo numero libero al merge (bozze fino a 0062 il
  2026-11-09).
- STATUS e DECISIONS nel formato snello di TASK-412: dopo un merge di `main`
  si riprendono da `main` e si riaggiungono le proprie righe.
- Dal 2026-11-08 le PR di codice non toccano `STATUS.md`, `DECISIONS.md` e
  `INDEX.md`: le righe vanno in una PR di soli documenti dopo il merge.
- Server, backfill e OTA solo col sì dell'utente e il via del Coordinatore.
- Impronta iOS invariata (`83793e26`): niente dipendenze, niente nativo;
  misurata su una copia pulita prima di ogni PR dell'app.

## Cosa fare

### Parte A — API: catalogo, collezioni, scala km

1. `game_catalog.py`: le 94 forme di `TASK-423-proposta.md` §2, con
   `collection`; le 10 collezioni con nomi nelle 5 lingue e ordine. Le 12
   forme di oggi con lo stesso id, nome e requisito. Contorni: 18 dal motore
   (letti, il motore non cambia), 8 calcolati, 56 disegnati come poligoni in
   coordinate del disegno.
2. `PaceGoal` con `single_run`: i 6 traguardi sono `pace` a 20:00/km con
   `single_run: true` (l'app installata rifiuta i tipi che non conosce).
3. `GET /game/catalog` con `collections[]` e, per forma, `collection` e
   `goal.single_run`; `GET /game/me` con l'avanzamento per collezione
   (`collections: [{id, unlocked, total}]`). Campi solo aggiunti.
4. Il foglio di tutte le forme, `out/TASK-423/forme.png`, approvato
   dall'utente prima del merge; i nomi nelle 5 lingue approvati con lui.
5. Test: id unici, 94 forme, ogni contorno chiuso dentro [0,1]², ogni
   requisito della scala presente una volta, le 12 di oggi invariate.

### Parte B — Regole delle andature

1. `BEST_DISTANCES_M` = 400, 1 000, 1 609, 3 000, 5 000, 10 000, 15 000,
   21 097, 30 000, 42 195, 50 000; `RULES_VERSION` 3.
2. Test deterministici su tracce finte: ogni distanza nuova, il miglio, la
   50 km, buchi e pause che spezzano la finestra, la camminata senza tempi.
3. Backfill provato in locale su un database di prova; sul server dopo A+B
   insieme, col sì.

### Parte C — Sfide personali e streak

1. Modulo puro nuovo (`game_personal.py`): la rotazione delle settimanali
   (3 posti, liste da 3, 3 e 5) e delle mensili (2 posti, mesi pari e
   dispari), i tre gradini, l'uscita (≥ 1 km contato), la settimana locale
   da `utc_offset_min`, la streak a tre righe e la più lunga.
2. Migrazione: `game_runs.utc_offset_min`, `game_personal`.
3. `PUT /me/activities/{key}` accetta `utc_offset_min` facoltativo (la
   risposta non cambia); `GET /game/personal`: le sfide della settimana e
   del mese con l'avanzamento, la streak, le finite delle ultime 8
   settimane.
4. Squadra: fino a 20 pezzi e 30 giorni.
5. Il testo della privacy sull'ora del telefono, approvato dall'utente.

### Parte D — App

1. «Collection»: la lista delle collezioni con «7 / 13» e la pagina di
   ognuna; il testo dei traguardi («One run of 5 km»).
2. «Challenges»: una lista con In corso · Disponibili · Finite: personali,
   streak, squadre, il link alla sfida del mese (TASK-343).
3. L'app manda `utc_offset_min` con la corsa; «New challenge» fino a 20
   pezzi e 30 giorni, le forme per collezione.
4. Testi nelle 5 lingue approvati dall'utente; impronta iOS invariata.

### Parte E — Premi

1. Edizioni argento (3 corse) e oro (10 corse) per le 70 forme di passo e
   di traguardo; cornici (10), titoli (8), badge (8), medaglie delle sfide.
2. Migrazione: `game_unlocks.edition` con `silver` e `gold`; `game_prefs`.
3. Pagina «Prizes» in «Play»; sul profilo cornice, titolo e fino a 3 badge
   solo se scelti; la scheda di sblocco con collezione, edizioni, cornice e
   il riepilogo oltre 3; push `edition_up` e `collection_done`.
4. Testi e privacy approvati dall'utente.

## Criteri di accettazione

- [x] Proposta approvata dall'utente (2026-11-08, «Sì, approvo»).
- [ ] `GET /game/catalog` dà 94 forme in 10 collezioni; le 12 di oggi
      invariate; l'app di oggi legge il catalogo nuovo (test con il
      validatore di `gameApi.ts`).
- [ ] I tempi migliori su 11 distanze, `RULES_VERSION` 3, con test
      deterministici; il backfill li calcola sulle corse vecchie.
- [ ] Sfide personali e streak calcolate dal server, con test puri della
      rotazione, dei gradini, della settimana locale e della streak.
- [ ] «Play» mostra le collezioni con le loro pagine e «Challenges» in una
      lista sola con il link alla sfida del mese.
- [ ] Edizioni, cornici, titoli e badge funzionano; sul profilo pubblico
      solo i premi scelti.
- [ ] Testi delle 5 lingue e testi della privacy approvati dall'utente.
- [ ] Una PR per parte, CI verde; impronta iOS invariata.

## File toccati

Documenti (questa PR):

```
docs/tasks/TASK-423.md                  (nuovo)
docs/tasks/TASK-423-proposta.md         (nuovo)
docs/GIOCO.md
docs/DECISIONS.md
docs/STATUS.md
```

Le parti: la lista precisa va al Coordinatore prima del codice e si
scrive qui. Previsione:

```
A  services/api/shaperoute_api/game_catalog.py, game_rules.py (PaceGoal),
   game.py; services/api/tests/test_game_catalog.py, test_game_api.py;
   packages/shared-types/src/index.ts (campi nuovi); tools/ per il foglio
B  services/api/shaperoute_api/game_rules.py, game_backfill.py (se serve);
   services/api/tests/test_game_rules.py, test_game_backfill.py
C  services/api/migrations/00NN_game_personal.sql (nuovo),
   shaperoute_api/game_personal.py (nuovo), game.py, game_challenges.py,
   activities.py (solo il campo facoltativo), tests nuovi; il testo della
   privacy (site/privacy/, apps/mobile/src/about/content/), col sì
D  (lista data al Coordinatore il 2026-11-10, out/TASK-423/LISTA-D.md)
   apps/mobile/src/game/: collections.ts, CollectionList.tsx,
   CollectionPage.tsx, personalApi.ts, usePersonal.ts, personalText.ts,
   PersonalCard.tsx, StreakCard.tsx, MonthChallengeRow.tsx (nuovi, coi
   loro test); PlayScreen.tsx, ChallengesTab.tsx, goalText.ts,
   NewChallenge.tsx; apps/mobile/src/api/activities.ts (l'offset e il
   secondo invio senza); packages/shared-types/src/index.ts (20 pezzi, 30
   giorni) e test/gameTeams.test.ts; i18n de, es, fr, it. Test aggiornati:
   PlayScreen, PlayScreenTabs, ChallengesTab, NewChallenge, goalText,
   gameCatalogCompat, api/activities, activitiesTurn, activityHeights,
   activitiesDoorQueue, __tests__/AppActivities e __tests__/AppPlay
E  (lista data al Coordinatore il 2026-11-10, out/TASK-423/LISTA-E.md;
   due PR, E1 il server ed E2 l'app da main dopo E1)
E1 services/api/migrations/0067_game_prizes.sql (bozza, numero al merge),
   shaperoute_api/game_prizes.py, game_prizes_api.py,
   tests/test_game_prizes.py, test_game_prizes_api.py (nuovi); game.py,
   game_backfill.py, push.py, profiles.py; packages/shared-types
   (index.ts, fixture game-me, game-run, game-prizes, test/game.test.ts);
   apps/mobile/src/game/gameCatalogCompat.test.ts (l'app di oggi legge i
   campi nuovi); docs/API.md. PR #1099; i testi delle push edition_up e
   collection_done nelle 5 lingue (out/TASK-423/TESTI-E1.md) approvati
   dall'utente il 2026-11-10 con «Sì, approvo»
E2a (in due PR: E2a in Play, E2b il profilo e la privacy)
   apps/mobile/src/game/: prizesApi.ts, usePrizes.ts, prizesText.ts,
   PrizesPage.tsx, EditionMark.tsx, ProfileFrame.tsx (nuovi, con
   prizesText.test.ts); PlayScreen.tsx (+test), ShapeCard.tsx,
   CollectionPage.tsx, UnlockCard.tsx, UnlockLayer.tsx (+test), unlocks.ts,
   unlockedRuns.ts (+test); src/notifications/notificationTap.ts,
   pushDevice.ts (+test); src/theme/tokens.ts (gamePrize); i18n. PR
   #1132; i 55 testi nelle 5 lingue (out/TASK-423/TESTI-E2a.md) approvati
   dall'utente il 2026-11-11 con «Sì, approvo»
E2b src/profile/ (ProfileHeader, ProfileHome, UserProfilePage, con
   ProfileHeaderPrizes.test.tsx nuovo), game/GamePrizesRow.tsx (nuovo), la
   scelta in PrizesPage, prizesApi e usePrizes (PUT /game/prizes/shown),
   ProfileFrame (il lato del badge); la privacy: about/content in 5 lingue
   (frase approvata dall'utente il 2026-11-11 con «Sì, approvo», data 11
   novembre), site/privacy rigenerato, i test della data
   (about/AboutPage.test.tsx, about/documents.test.ts,
   site/tests/privacy.test.mjs). I 4 testi nuovi nelle 5 lingue
   (out/TASK-423/TESTI-E2b.md) approvati dall'utente il 2026-11-11 con
   «Sì, approvo»
E2 apps/mobile/src/game/ (PrizesPage, EditionMark, ProfileFrame,
   GamePrizesRow, prizesApi, usePrizes, prizesText; PlayScreen,
   CollectionPage, ShapeCard, UnlockCard, UnlockLayer, unlocks.ts),
   src/profile/ (ProfileHeader, ProfileHome, UserProfilePage),
   src/notifications/ (notificationTap, pushDevice), src/theme/tokens.ts,
   i18n; il testo della privacy, col sì
```

## Fuori scope

- Punti, classifiche, confronti fra persone (TASK-241).
- Denaro, premi veri, pubblicità (AdMob resta spento, TASK-153).
- Promemoria della streak e push per le sfide personali.
- Sfide personali su misura del passato di ognuno.
- Il route engine; la cadenza dall'accelerometro.
- Cambiare le sfide del mese di TASK-343 o i badge di TASK-341.

## Cronologia

- 2026-11-08 — Proposta scritta e approvata («Sì, approvo»); documenti in
  `main` (#982).
- 2026-11-08 — Parte A in `main` (#984, 9d3f0a88): 94 forme in 10
  collezioni, `single_run`, `collections` in catalogo e in `/game/me`, una
  push `shape_unlocked` per corsa; foglio delle forme approvato
  dall'utente («Sì, approvo»), in `out/TASK-423/forme-*.svg` del checkout
  principale; `tools/game_shapes_sheet.py` lo rifà. Fuori dalla lista,
  con l'ok del Coordinatore: i test che contavano sblocchi e push
  (`test_game_backfill`, `test_game_challenges`, `test_push`,
  `test_push_hooks`, `test_notification_list`, `test_reads_lists`).
  Finché B non è sul server, le forme dei tempi nuovi (400 m, miglio, 3, 15,
  30 km, maratona, 50 km) non si sbloccano: **A va sul server insieme a B**,
  poi subito il backfill, così le forme raggiunte prima prendono la data
  della loro corsa e non arrivano tutte alla prossima corsa.

- 2026-11-08 — Testi della privacy approvati dall'utente («Sì, approvo»,
  con la tabella delle 5 lingue davanti): i tempi migliori «su distanze da
  400 m a 50 km» (parte B) e la frase sull'ora del telefono, con le sfide
  personali e la streak viste solo da chi corre (parte C). PR #1007; il sito
  si rigenera con `site/tools/make_privacy.mjs` e si pubblica col sì
  dell'utente insieme al server. Sì dell'utente al server di A+B e al
  backfill («PROCEDI», «SI PROCEDI»), dopo la #1005 e il via del
  Coordinatore; non vale per l'OTA né per C–E.

- 2026-11-10 — Parte B in `main` (#1005, 9cf5576b): `BEST_DISTANCES_M` su
  400, 1000, 1609, 3000, 5000, 10000, 15000, 21097, 30000, 42195 e 50000 m,
  `RULES_VERSION` 3, `PACE_DISTANCES_M` = `BEST_DISTANCES_M`. Fuori dalla
  lista, con l'ok del Coordinatore: `test_walk_game`, `test_hiking_api` e
  `test_inline_skating_api` leggono `RULES_VERSION >= 2`. Privacy di B e C
  in `main` (#1007, 3d9306c3).
- 2026-11-10 — Parte C nella #1018: `game_personal.py` (puro),
  `game_personal_api.py` (`GET /game/personal`, le medaglie nel
  salvataggio), migrazione 0065 (`game_runs.utc_offset_min`,
  `game_personal`), `utc_offset_min` facoltativo in `PUT /me/activities`,
  squadre fino a 20 pezzi e 30 giorni. Fuori dalla lista, con l'ok del
  Coordinatore: `game_backfill.py` (tiene gli offset quando riscrive
  `game_runs`), `test_activities.py` e `test_imported_runs.py` (il contratto
  delle fixture senza `utc_offset_min`). La 0065 va nel passo unico sul
  server solo se la #1018 è in `main` prima che parta.

- 2026-11-10 — Parte C in `main` (#1018, 638d4fe2); la 0065 va nel passo
  server 2. Il passo server di A+B è fatto; il backfill (regole 3) si è
  fermato su una sessione di palestra senza traccia (`runs.track` NULL, con
  `source` muw, come le nuotate in piscina): la #1037 le lascia fuori
  (`track IS NOT NULL` nelle due query del backfill), con un test che su
  `main` falliva come sul server. Il percorso del salvataggio non era
  colpito (solo `PUT /me/activities`, sempre con una traccia). Gli account
  fatti prima dell'errore restano a regole 3, quello in errore è tornato
  indietro: il backfill rilanciato fa solo quelli che mancano.

- 2026-11-10 — Passo server 2 fatto dal Coordinatore, col sì dell'utente
  («si garzie procedi»): sul server `main` 039fe4e1 (con #1018 e #1037),
  migrazione 0065_game_personal applicata, `/game/personal` 401 senza token
  (la rotta c'è), `/game/catalog` 200. Backfill: «game_backfill: rules 3,
  2 account(s), 11 run(s), 48 shape(s) unlocked», senza `Traceback`;
  rilanciato, «0 account(s), 0 run(s), 0 shape(s) unlocked». Immagini di
  ritorno `before-passo3` (= 7dec87d7) e `before-passo2` (= 9cf5576b), dump
  `shaperoute-2026-11-10T0914Z.dump`. Controlli in `out/TASK-423/SERVER-C.md`
  del checkout principale. L'OTA 3 (da 52010be4) è del Coordinatore; restano
  D (app, dopo la #971 di TASK-422) ed E (premi).

- 2026-11-10 — Parte D: sì dell'utente a partire («Sì, parti con D»), lista
  dei file approvata dal Coordinatore. «Collection» è la lista delle 10
  collezioni con «7 / 13» e la pagina di ognuna (con un catalogo senza
  collezioni resta la griglia); i traguardi dicono «One run of 5 km».
  «Challenges» è una lista sola: In corso (personali della settimana e del
  mese, streak, squadre con una sfida, sfida del mese se iscritto) ·
  Disponibili (sfida del mese, le altre squadre, Create e Join) · Finite
  (medaglie delle ultime 8 settimane, sfide di squadra finite o scadute,
  archivio delle sfide del mese). L'app manda `utc_offset_min` nel PUT
  della corsa (non per i file di altre app) e, se l'API lo rifiuta, la
  rimanda senza; «New challenge» fino a 20 pezzi e 30 giorni, con le forme
  per collezione. I limiti in shared-types li lega a `game_challenges.py`
  un test di contratto. PR #1080. I 50 testi nuovi nelle 5 lingue
  (`out/TASK-423/TESTI-D.md` del checkout principale; tolto solo «YOUR
  TEAMS») approvati dall'utente il 2026-11-10 con «Sì, approvo».
- 2026-11-10 — Parte D in `main` (#1080, a56d19e4) e in produzione con
  l'OTA 4 del Coordinatore, dallo stesso commit a56d19e4, col sì
  dell'utente («Sì, pubblica»): gruppo 341e7da1-5c1a-4343-9551-ad3fcf5f20e4,
  update iOS 01a1c658-eca3-7951-890d-9b4d7b1080d5, impronta 6f8bba4c;
  preview gruppo e72c1aad-3239-4b34-ae0a-c65c64b3ddec. Resta E: la sua
  migrazione nasce in bozza e prende il primo numero libero al merge (la
  0066 è in bozza per TASK-433).
- 2026-11-10 — Parte E iniziata col sì dell'utente («si garzie», riferito
  dalla sessione madre); lista approvata dal Coordinatore, due PR. E1 in
  `main` (#1099, adf0dec0): edizioni argento e oro in `game_unlocks`,
  `game_prefs`, `GET /game/prizes` e `PUT /game/prizes/shown`,
  `game_prizes` nel profilo pubblico, le push `edition_up` e
  `collection_done` (testi approvati dall'utente: «Sì, approvo»), le
  edizioni nel backfill senza push; migrazione 0067_game_prizes. Controlli
  di sola lettura per il passo server 6 in `out/TASK-423/SERVER-E.md` del
  checkout principale. E2 (l'app) entra in `main` solo dopo «server E1
  fatto» del Coordinatore.
- 2026-11-10 — Passo server 6 fatto (lanciato dall'utente, adf0dec0, 0067):
  15 edizioni argento, nessun oro, controlli di SERVER-E a 0, `game_prefs`
  vuota. «Server E1 fatto» del Coordinatore.
- 2026-11-10 — «Play» dopo l'uso (#1113): l'utente ha visto che le forme
  sbloccate non dicono l'obiettivo e che un passo mai fatto è al 60–80 %;
  delle proposte ha scelto «Dalla 1 alla 4». L'obiettivo sotto la data; la
  barra di un passo fra il livello prima e questo (`shapeProgress.ts`),
  vuota finché il livello prima non è fatto, con «… /km to go»; «First run
  15 km in one go» invece di una percentuale; i nomi delle distanze (400 m,
  1 mile, Half marathon, Marathon). Solo app; i 6 testi nuovi nelle 5
  lingue approvati dall'utente («Sì, approvo»). In `main` (#1113,
  18aea2da).
- 2026-11-11 — Prova sul telefono del settimo OTA (main 7e24e7d1, con la
  #1113), fatta dall'utente; sue parole al Coordinatore: «procedi funziona
  tutto ok procedi», poi «Sì, sul telefono». Prova generale, senza nominare
  le singole funzioni.
- 2026-11-11 — E2 divisa in due PR. E2a in `main` (#1132, feb955ef): la
  pagina «Prizes», le edizioni sulle forme, la cornice in fondo a ogni
  collezione, le schede di sblocco di edizioni e collezioni (una sola oltre
  3), le push nuove che aprono «Play»; 55 testi approvati («Sì, approvo»).
  E2b in `main` (#1144, 68b082ef): la scelta dei premi del profilo (`PUT
  /game/prizes/shown`), cornice, titolo e badge sul profilo, la frase della
  privacy nelle 5 lingue con la data 11 novembre e `site/privacy`
  rigenerato; frase e 4 testi approvati («Sì, approvo»). Escono col nono
  OTA (l'ottavo partiva da prima del merge); poi la copia della privacy sul
  sito (F.14) col sì dell'utente al Coordinatore, poi la prova sul
  telefono.
- 2026-11-11 — Nono OTA in produzione e privacy sul sito, col «Sì,
  pubblica» dell'utente dato al Coordinatore (~21:00Z). OTA 9 da main
  e60e0b35 (E2a #1132, E2b #1144): iOS gruppo
  8e3cffd9-c24d-4847-9064-63404d538de1, Android
  58b3366a-6825-4a1b-80bc-743df0e0ad08, preview
  9870b7d4-3027-4200-a722-b113eb874345. Sito copiato da e60e0b35 (F.14):
  cambiate solo le 5 pagine della privacy, in linea «Last updated: 11
  November 2026» e la frase nuova nelle 5 lingue (controllato dal
  Coordinatore). Resta la prova dell'utente sul telefono: i premi dentro
  «Play» e la scelta sul profilo.
- 2026-11-11 — Prova generale sul telefono dopo il nono OTA, fatta
  dall'utente sulla lista del Coordinatore (Play con premi e scelta sul
  profilo, sci, foto del post, No della palestra); sue parole al
  Coordinatore (~21:05Z): «procedi funziona tutto ok procedi». Non ha
  nominato le singole funzioni: non vale come giro guidato di E2a ed E2b.
- 2026-11-11 — Conferma punto per punto dei premi, chiesta all'utente nella
  sessione di TASK-423 (la riga «Premi» con cornici, titoli e badge; le
  edizioni d'argento sulle forme; la cornice in fondo a una collezione; un
  premio scelto sul profilo). Sue parole: «Funziona tutto».

## Esito

Fatto il 2026-11-11. «Play» ha 94 forme in 10 collezioni, km da 1 a
10 000, i passi su 11 distanze, le sfide personali della settimana e del
mese con la streak, la lista unica di «Challenges», la barra onesta delle
forme di passo, le edizioni argento e oro, cornici, titoli e badge, e la
scelta di che cosa mostrare sul profilo, con la privacy nuova sul sito.
Server fino al passo 6 (migrazioni 0065 e 0067, backfill a regole 3 e
delle edizioni), app con gli OTA 4, 7 e 9; provato sul telefono
dall'utente («Funziona tutto»). PR: #982, #984, #1005, #1007, #1018,
#1037, #1080, #1099, #1113, #1132, #1144 e le PR di documenti.
