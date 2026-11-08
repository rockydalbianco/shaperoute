# TASK-423 — «Play» grande: collezioni, km fino a 10 000, passi, sfide personali, premi

**Stato**: In corso — documenti (#982) e parte A (#984) in `main`; prossima B
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
D  apps/mobile/src/game/*, i18n (de, es, fr, it), activitiesDoor per
   l'offset
E  services/api/migrations/00NN_game_prizes.sql (nuovo),
   shaperoute_api/game_prizes.py (nuovo), game.py, profiles.py, push.py;
   apps/mobile/src/game/*, src/profile/ (cornice, titolo, badge),
   src/theme/tokens.ts, i18n; il testo della privacy, col sì
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

## Esito

*(a fine task)*
