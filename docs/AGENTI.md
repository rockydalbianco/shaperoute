# AGENTI — Chi fa cosa, e cosa viene dopo

> L'albero dei lavori degli agenti in parallelo. **Lo aggiorna solo il
> coordinatore** (la sessione «Coordinatore»); gli altri lo leggono.
> Dopo il clear di fine task, un agente trova qui la sua riga: il prossimo
> task, da cosa dipende e quali file non può toccare.

**Ultimo aggiornamento**: 2026-11-12, ~09:30Z · `main` = `881489fd` · coordinatore: la sessione **«Coordinatore (fork)»** (dal 2026-11-10; «Coordinatore» `local_3f55a0e9` e `local_e57a8224` sono archiviate). **«Coordinatore 3 · chiusura task e archivio»** fa censimento, solleciti e archivio delle sessioni chiuse: non mergia e non tocca server, OTA, numeri. Il «Coordinatore Sport» si è chiuso il 2026-11-10: la sezione «Sport» qui sotto e `docs/sports/CONDIVISO.md` sono del Coordinatore. Le righe tolte l'8 novembre sono in `docs/archive/AGENTI-fino-al-2026-11.md`.

## Come si usa

1. Trova la tua sessione qui sotto: **Adesso** è il task in corso,
   **Dopo** la coda, in ordine.
2. Un task della coda parte solo quando le sue **dipendenze** sono in `main`.
   Se non lo sono, avvisa il coordinatore e aspetta.
3. Il messaggio di partenza lo manda il coordinatore, completo (numero,
   ADR, file, confini). Se non arriva, chiedilo: non partire da solo.
4. Numeri di task e di ADR: solo dal coordinatore (`CLAUDE.md`). Se il
   coordinatore non risponde e l'utente ha fretta, prendi i primi liberi
   scritti qui sotto e **diglielo prima** di creare i file.
5. **Worktree in `.claude/worktrees/TASK-XXX`**, sul Mac. I controlli JS in
   un worktree usano i `node_modules` del checkout principale; prima del
   push anche `npm run format:check` (prettier non è in `expo lint`).
6. **La coda dei merge è una sola e la tiene il coordinatore.** Nessuna
   sessione mergia fuori coda senza dirlo prima al coordinatore, nemmeno
   su richiesta dell'utente: un merge fuori coda rimette in conflitto le
   PR che stanno facendo girare la CI. Quando la tua PR è pronta, scrivi
   «#NNN pronta» e aspetta. Al tuo turno aggiorni il branch da
   `origin/main`, risolvi i conflitti tenendo tutte le voci, rifai i test,
   fai push e scrivi «#NNN CI in corso».
7. **La CI non la aspetta nessuno da solo.** La guarda il coordinatore
   (la sessione «Agente di assistenza coordinamento» è chiusa dal
   2026-10-02 sera): scrivigli «#NNN pronta», e lui ti manda «merge NNN»
   quando la PR è 5/5 verde e MERGEABLE, o il job che fallisce. La
   sessione proprietaria mergia la sua PR.
8. **PR di soli documenti** (task file, STATUS, AGENTI) entrano appena
   sono verdi e CLEAN, senza aspettare la coda: non toccano codice.
9. **Pubblicare l'app** (`eas update`) e **toccare il server** si fanno
   solo con l'ok dell'utente, da `origin/main` pulito (memoria
   «publish-from-clean-main», `DEPLOY.md` F.12).
   **Una pubblicazione alla volta**: prima di `eas update` o di toccare il
   server chiedi al coordinatore e **aspetta la sua risposta** (arriva a
   fine turno). Il 2026-10-03 due sessioni hanno pubblicato lo stesso
   commit a pochi minuti l'una dall'altra.
10. **Migrazioni del database**: il numero è **il primo libero in `main`
   quando la PR entra** (non uno tenuto prima), così l'ordine è lo stesso
   su ogni database. Prima del merge guarda `services/api/migrations/`.
11. **Dopo un aggiornamento del server che cambia `route_engine`**, gli
   esempi tenuti non valgono più: va rilanciato `draw_examples` (circa 35
   minuti, dentro il container dell'API), mai mentre gira un altro
   aggiornamento.
12. **Si lavora solo sul T9**: il repository è `/Volumes/T9/Progetti/shaperoute`
   e i worktree stanno in `.claude/worktrees/` lì sotto. Il vecchio
   `/Users/lucapallaoro/Progetti/shaperoute` è un symlink: non si usa nei
   comandi, nei percorsi né nei brief. Copie pulite, `npm ci`, build,
   DerivedData e misure pesanti vanno in `/Volumes/T9/Progetti/tmp/<nome>/`,
   mai sul disco interno (l'8 novembre si è riempito: 240 MB liberi).
13. **Una PR di codice entra solo dopo «#NNN pronta» → «merge NNN»**, anche
   per le sessioni sport e anche se il brief dice altro. Si riallinea da
   `origin/main` **solo se GitHub dice CONFLICTING/DIRTY**: se è MERGEABLE
   con i check in corso si lascia correre (il job `api` dura 25–35 minuti,
   un riallineamento inutile li rifà).
14. **Le PR di soli documenti che toccano `STATUS.md` o `DECISIONS.md`**
   entrano a grappolo, quando le PR di codice in CI sono dentro: ogni merge
   su quei file rimette DIRTY le altre. Quelle che toccano altri file
   (task file, `docs/sports/`, `AGENTI.md`) entrano appena verdi.
15. **Dal 2026-11-08 `STATUS.md` e `DECISIONS.md` sono snelli (TASK-412)**:
   un task aperto ha al massimo 5 righe in «In lavorazione»; una decisione è
   una voce intera in «Voci nuove» più una riga nell'«Indice»; un task
   chiuso diventa una riga in `docs/archive/COMPLETATI.md`. Lo storico è in
   `docs/archive/`, si cerca con grep. Dettagli in `CLAUDE.md`.
   **Riallineare un branch nato prima del 2026-11-08**: dopo `git merge
   origin/main` i tre file vanno **ripresi da `main`** (`git checkout
   origin/main -- docs/STATUS.md docs/DECISIONS.md docs/INDEX.md`) e le
   proprie righe riaggiunte a mano nel formato nuovo: il vecchio driver
   `merge=union` (TASK-359), tolto l'8 novembre sera, riportava indietro tutto
   il testo archiviato (450 KB) senza segnalare conflitti.
   **Dalla sera del 2026-11-08 le PR di codice non toccano `STATUS.md`, `DECISIONS.md`
   né `INDEX.md`**: con i file snelli ogni PR che li tocca va in conflitto
   con tutte le altre a ogni merge (l'8 novembre quattordici PR insieme).
   Le righe del task (voce ≤ 5 righe in STATUS, voce ADR in «Voci nuove»
   più riga d'indice, riga in INDEX o in COMPLETATI) vanno in una **PR di
   soli documenti aperta dopo il merge del codice**, che il coordinatore
   unisce subito (CI ~1 min, riallineata al volo). In un ramo già aperto:
   `git checkout origin/main -- docs/STATUS.md docs/DECISIONS.md
   docs/INDEX.md` e le righe messe da parte per la PR docs.
16. **Le memorie delle sessioni** sul T9 sono collegate con symlink a
   `~/.claude/projects/-Users-lucapallaoro-Progetti-shaperoute/memory`; un
   worktree nuovo parte vuoto: va collegato allo stesso modo.

## La coda dei merge

Le PR di codice non toccano
`STATUS.md`, `DECISIONS.md`, `INDEX.md`: le righe vanno in una PR di soli
documenti dopo il merge. Le PR di soli documenti (branch `docs/…`, solo
file sotto `docs/`, un solo «## Voci nuove») le mergia al verde uno
«spazzino» del coordinatore, una alla volta; chi va in conflitto riallinea
dai tre file di `main` (in locale: `update-branch` di GitHub non funziona
su questi file). Le PR di codice le mergia il coordinatore al verde
quando la sessione scrive «#NNN pronta» **con lo SHA della testa** (il
motore lo mergia l'utente).

| # | Task | Stato | Note |
|---|---|---|---|
| #1193 | TASK-467 A, punteggio del sonno: il calcolo (file nuovi) | pronta, CI in corso | merge al verde |
| #1191 | TASK-305 R3, numeri del volo sulla pagina dal vivo (`site/live/`) | pronta, CI in corso | merge al verde; poi copia del sito col sì dell'utente |
| #1185 | TASK-441 B1, parole a penna alzata nell'app | pronta, CI in corso | merge al verde; esce insieme al server col catalogo a 1546 |
| #1194 | TASK-456, scheda dell'attività e foglio «Edit post» | pronta, CI in corso | merge al verde |
| #1181 | TASK-466 A, omino dello stretching | pronta, CI in corso | merge al verde |
| #1196 | TASK-461 B2a, piani verso un obiettivo (file nuovi) | verde | aspetta «pronta» |
| #1183 | TASK-414 A, carrozzina e passeggino (motore, `0071`) | CI in corso | **la unisce l'utente** |
| #1200 | TASK-454, frase della privacy (reazioni ai commenti) | pronta, **trattenuta** | dopo la #1199; non sul sito prima dell'app |
| #1195, #1199 | TASK-454 A (reazioni al post) e C2 (risposte ai commenti) | bozze | schermate e sì dell'utente; prima la #1195 |
| #1190 | TASK-444 parte 2, avvisi del percorso e palestra senza emoji | bozza | scelta dell'utente fra le due strade |
| #1201 | TASK-305 R2, il volo registrato nell'app | bozza | dopo la #1191; schermate |
| #1202 | TASK-415 B3, «Cambio pelli» a mano | aperta | schermate e sì dell'utente |
| #1116 | `release/1.1.0`: orologio + Live Activity | bozza, **trattenuta** | build 14 **in revisione da Apple dall'11 novembre, rilascio automatico**; si unisce solo dopo l'approvazione; allora #1058 e #862 si chiudono |

**In `main` il 12 novembre**: #1184 (441 B1: 340 parole a penna alzata,
catalogo a 1546; **non ancora sul server**), #1172 (462 B, calendario
nell'app), #1159 (452 B, piani di corsa nell'app); dell'11 sera: il
motore #1105, #1106, #1130 (merge dell'utente; codice `427ed1a16a97`,
efficace `8ab61d8e87f9`), il catalogo #1149 + #1155 (1261), e le parti
server di 452, 461 (A1, B1), 462, 464, 305 R1, 454 C1.

**Da `defe1357` in poi `main` contiene le parole a penna alzata**: il
server resta a `02214e9b` e il prossimo passo da `main` si fa solo
insieme all'OTA con la #1185 (le app vecchie unirebbero le lettere con
un segmento dritto). Una correzione urgente del server prima di allora
parte da un ramo su `02214e9b`.

**Motore**: aperta la #1183 (414 A). In coda: TASK-413 A3 (ciaspole,
soglia 280), TASK-447 (via i «baffi»: cambia i percorsi, da decidere con
l'utente), 40–50 km in bici per «Explore» (TASK-441, dopo la B2). Le PR
che toccano `services/route-engine` le mergia l'utente. Da guardare: i
5 percorsi calcolati fra il passo 8 e il passo 9 hanno «start» a 11,6 s
di mediana contro 4,2 s di prima (pochi, e due erano prove): rileggere
i «times» con 15–20 percorsi veri.

**Simulatore, `npm ci`, bench**: uno per volta sul Mac, col turno dato
dal coordinatore («simulatore tuo» / «simulatore libero»). Coda del 12
novembre: 444 parte 2 → 454 (A e C2 insieme) → 305 R2 → 457 → 415 B3 →
461 A2; poi «turno del Mac» a 413 A3. Dal worktree sul T9
`preview_start` non parte e `simctl io screenshot` non scrive sul T9:
Metro con Bash in background, schermate nello scratchpad e poi copiate
in `out/TASK-NNN/`.

**CI**: i test dell'API girano in 4 parti (TASK-438); ogni PR chiede 8
macchine, ogni merge rilancia la CI di `main` e con dieci PR insieme la
coda supera la mezz'ora. Le run superate (un push più nuovo sullo
stesso ramo) le annulla l'utente con
`out/coordinatore/annulla-ci-superate.sh annulla`. La leva vera è il
database modello dei test (TASK-439, da avviare).

Senza sessione: TASK-415 C, TASK-413 B, TASK-439, TASK-429 E, TASK-406 E
(prova sulla neve), TASK-322 B e C (Accedi con Apple, nativa), il
totale delle reazioni dentro la risposta del Feed (da TASK-454, senza
numero).

## L'albero

```
App Store
  ├─ 1.0.1 in produzione. OTA di produzione dell'8 novembre, in ordine:
  │  fc8aa133 da 3bf2802d (calorie piscina, Walk, griglia palestra,
  │  Roller «Soon», telefono dell'orologio) · 10279e05 da f1c7ad23
  │  (Roller acceso, guide della palestra) · 8b1af1b4 da a0f38012
  │  (pagina del post, TASK-416, foglio «Edit video»).
  │  Non ancora in produzione: pagina «Catalog» (#954), calendario della
  │  palestra (#955), B1/B2 dell'orologio, scialpinismo nascosto (#948):
  │  prossimo OTA col sì dell'utente. Anteprima: 8b96dbd1 da 2a418d11.
  ├─ 1.0.2 · TASK-407  solo gli screenshot nuovi: build da
  │  `release/1.0.2` (`c74aab2f`), impronta `6f8bba4c`; la lancia l'utente
  ├─ 1.0.3  login, schermata di blocco, composer, calorie e battito;
  │  TASK-401 B (#862) entra solo dopo il taglio; TASK-409 B
  └─ 1.1 · TASK-370  Apple Watch: A1, A2, A3, B1, B2 in `main`; B3
     (proposta #968: «Send to watch» + preferiti, vibrazioni come Apple
     Maps, freccia prima) in tre parti, B3a in corso; A-flip alla build

Sport (sezione «Sport», Coordinatore Sport `local_2c048887`)
  ├─ Roller acceso (OTA 10279e05); Gravel/MTB chiusi (#937); TASK-416
  │  numeri da bici in `main` (#947)
  ├─ Scialpinismo: 0 e A in `main` (server 0057); B dopo
  ├─ Ciaspole: 0 in `main`; A1 nella #957 (motore), poi A2 (0059), B
  └─ Carrozzina e passeggino: 0 in `main` (#939); A con la 0058, dopo A1

Catalogo di «Explore» (TASK-418 forme, 419 disegni, 420 pagina)
  ├─ 420 Done: pagina «Catalog» in `main` (#954), 350 percorsi d'esempio
  ├─ 419: primo giro nella #966 (155 tenuti in 23 città); zone del server
  │  copiate sul T9; Europa quando Overpass riapre
  └─ 418: 49 contorni candidati nella #953; registrazione dopo il giudizio
     dell'utente su strada

Altro in corso
  ├─ TASK-408 video: C1 in `main`, C2a #961, C2b e C2c dopo
  ├─ TASK-411 palestra: A, B, E in `main`; C #964, D #962
  ├─ TASK-410 post: B in `main` (OTA 8b1af1b4); C `run_stats` dopo
  ├─ TASK-406 sci: C e D1 in `main` (server 0056); D2 #960; D3 dopo
  ├─ TASK-417 immagine nel video: proposta #950; B dopo TASK-408 C2
  ├─ TASK-421 cancelli nella rete foot (motore), TASK-422 «Compass» #971
  └─ TASK-412 documenti snelli: Done (#969)

Fermi per scelta dell'utente
  ├─ TASK-153 AdMob vero (aspetta la società; ADR-0236 riservato)
  └─ TASK-262 B la mail di conferma
```

## File occupati adesso

| File | Di chi |
|---|---|
| `apps/mobile/App.tsx` | **a turno**: si chiede al coordinatore prima di toccarlo. Ora: TASK-457 (una prop su `<OwnProfile>`); poi TASK-441 B2 (app) |
| `services/api/shaperoute_api/app.py`, `packages/shared-types/src/index.ts`, `docs/API.md` | a turno. Ora: `app.py` a TASK-441 B2 (parametro `activity` del catalogo); poi TASK-463 |
| `apps/mobile/src/profile/**`, `screens/ProfileLayer.tsx`, `screens/ProfileScreen.tsx`, `social/BlockedPeople.tsx` | TASK-457; poi TASK-467 B (scheda «Sleep») |
| `apps/mobile/src/activities/ActivityCard.tsx`, `ActivitiesList.tsx`, `ActivityRow.tsx`, `ActivityMenu.tsx`, `ActivitySheet.tsx`, `social/PublicRow.tsx`, `social/drawingsDoor.ts` | TASK-456 (#1194) |
| `apps/mobile/src/feed/PostActions.tsx`, `PostReactions.tsx`, `social/DrawingReactions.tsx`, `SuperLikeSheet.tsx`, `reactionKinds.ts` | TASK-454 A (#1195) |
| `apps/mobile/src/api/comments.ts`, `social/commentsDoor.ts`, `useDrawingComments.ts`, `DrawingComments.tsx`, `CommentActions.tsx`, `commentThreads.ts` | TASK-454 C2 (#1199) |
| `apps/mobile/src/about/content/**`, `site/privacy/**` | TASK-454 (#1200); poi TASK-467 C |
| `apps/mobile/src/route/RoutePanel.tsx`, `route/NoteRow.tsx`, `gym/ExerciseGrid.tsx`, `gym/ExercisePicker.tsx`, `swim/SwimRouteNote.tsx` | TASK-444 parte 2 (#1190) |
| `apps/mobile/src/gym/GymPlanWizard.tsx`, `proposal.ts`, `program.ts`, `catalog.ts`, `moves.ts`, `muscles.ts`, `guides/**`, `bodyweight.ts`, `SportsDoor.tsx` | TASK-461 A2; poi B2b/C2 (`plans.ts`, `GymDrawGuide.tsx`) |
| `apps/mobile/src/gym/targetWeeks.ts`, `targetPlan.ts`, `outingHistory.ts` | TASK-461 B2a (#1196) |
| `apps/mobile/src/stretch/**` | TASK-466 (#1181, poi parte B) |
| `apps/mobile/src/health/sleepNight.ts`, `sleepScore.ts` | TASK-467 (#1193) |
| `apps/mobile/src/settings/sport.ts`, `sports/**`, `screens/FreeRunScreen.tsx`, `screens/RunDashboard.tsx`, `liveShare/**`, `src/air/**` | TASK-305 R2 (#1201); poi TASK-413 B, poi TASK-463 |
| `site/live/**` | TASK-305 R3 (#1191) |
| `apps/mobile/src/activities/mountainPhases.ts`, `skinChanges.ts`, `screens/SkiTourLive.tsx`, `SkiTourFinishCard.tsx` | TASK-415 B3 (#1202) |
| `catalog/seed/**`, `tools/catalog_*.py`, `tools/catalog_kept.json`, `services/api/shaperoute_api/recommended.py`, `explore/ExploreScreen.tsx`, `route/NearYou.tsx`, `explore/explored.ts`, `explore/recommendedRoutes.ts` | TASK-441 (#1185, poi B2 bici) |
| `apps/mobile/src/watch/**`, `targets/**`, `modules/live-activity/**`, `app.json` (plugin), `fingerprint.config.js` | TASK-370 e il taglio della 1.1 (#1116) |
| `services/api/tests/conftest.py`, `.github/workflows/ci.yml` | TASK-439 quando parte; fino ad allora si chiede al coordinatore |
| `apps/mobile/src/share/**` | TASK-417 (D, E); poi TASK-450 |
| `apps/mobile/src/i18n/{de,es,fr,it}.ts`, `docs/UI.md` | tutti: ognuno aggiunge le sue chiavi o la sua sezione, conflitti tenendo tutte |
| `docs/STATUS.md`, `docs/DECISIONS.md`, `docs/INDEX.md` | solo PR di documenti, una alla volta, solo la propria voce |
| `docs/AGENTI.md`, `CLAUDE.md`, `docs/sports/CONDIVISO.md` | coordinatore |

## Numeri

- Task: presi fino a **TASK-467**. Dell'11 e 12 novembre: 440–445 (440,
  442, 443, 445 fatti), 446 calcolo anticipato, 447 via i «baffi», 448
  «Sorprendimi», 449 anteprima dal vivo della sagoma, 450 «Share your
  run» e poster, 451 «Rifai meglio», 452 piani di corsa (fatto), 453
  (fatto), 454 reazioni e commenti, 455 condividere il disegno di un
  altro, 456 scheda dell'attività, 457 profilo nuovo, 458 minori, 459
  «Follow» segue subito, 460 (fatto), 461 pianificatore completo, 462
  calendario delle attività, 463 alpinismo senza percorso, 464 zone già
  in memoria, 465 muscolo sull'omino (fatto), 466 stretching, 467
  punteggio del sonno. Il prossimo libero è **TASK-468**.
- ADR: presi fino a **ADR-0380** (0366 TASK-441 B; 0367 TASK-446; 0368
  TASK-447; 0369 TASK-452; 0370 TASK-459; 0371 TASK-461; 0372 TASK-462;
  0373 TASK-463; 0374 TASK-464; 0375 TASK-305 R; 0376 TASK-465; 0377
  TASK-454; 0378 TASK-466; 0379 TASK-467; 0380 TASK-457, solo se serve;
  0365 riservato a TASK-439). Il prossimo libero è **ADR-0381**.
- Migrazioni in `main` e sul server: fino a `0070_comment_replies.sql`.
  Provvisorie: `0071` per TASK-414 A (#1183), `0072` per TASK-463. Il
  numero vero è il primo libero al merge.

## Il server e l'app

- **Adesso (12 novembre)**: server a **`02214e9b`** dal passo 9
  (2026-11-12 08:38Z; copia `shaperoute-2026-11-12T0838Z.dump`, ritorno
  `before-passo9` = `ab5b2983`): piani di corsa (452 A), esercizi a
  corpo libero e piani a distanza e montagna (461 A1, B1), calendario
  delle attività (462 A), zone calde (464), parapendio con
  `0069_paragliding` (305 R1), risposte e reazioni ai commenti con
  `0070_comment_replies` (454 C1). Prima, il passo 8 (2026-11-11 22:14Z,
  `ab5b2983`, ritorno `before-passo8` = `2ed26af7`): motore di #1105,
  #1106, #1130 con `0068_snowshoeing` (codice `427ed1a16a97`, efficace
  `8ab61d8e87f9`), catalogo a 1261 con l'ordine misto (da Milano «60 31
  31»), 435 B. Uscite dei controlli in `out/coordinatore/passo9/`.
  **Prossimo passo: solo insieme all'aggiornamento completo dell'app**
  (catalogo a 1546 della #1184; controlli in
  `out/TASK-441/SERVER-B1.md`), col sì dell'utente.

- **Server**: Hetzner CX33, `deploy/compose.yaml` con PostgreSQL,
  `https://api.getmuw.app`, sito su `https://getmuw.app`. Storia, al passo 7
  (`2ed26af7`, 2026-11-11: 424 C2b, 429 C1, 433 C1,
  nessuna migrazione; il 10 novembre sei passi fino ad `adf0dec0`): migrazioni
  0061–0067 (le ultime: le settimane delle schede guidate della palestra
  e i premi di Play, con 15 edizioni argento dal backfill), i due
  processi caldi di TASK-276 B, `GET /catalog` con 572 percorsi in 63
  città, le 14 forme di TASK-418 B (impronta `2bca806f467b`, efficace
  `8ab61d8e87f9`), backfill di Play e dei tempi per km fatti. Copie
  `shaperoute-2026-11-11T1255Z.dump` e `…T1258Z.dump`; immagini di
  ritorno `before-passo7` (= `adf0dec0`, immagine `4ec8ee06674c`),
  `before-passo6` (= `8138b456`) e le precedenti. Il passo 7 è girato due
  volte e il secondo giro aveva spostato l'etichetta di ritorno: rimessa
  a mano; **ogni script di passo si ferma se il server è già allo SHA
  chiesto**. L'immagine di produzione non ha `httpx`: i controlli dopo un
  passo non usano `fastapi.testclient` (esempio senza:
  `out/TASK-429/check_c1_asgi.py`).
  **Zone foot (TASK-421)**: le 53 del preset rifatte dall'estratto in una
  cartella a parte e scambiate (`--memory 5g`: con 4 GB osmium viene
  ucciso), 477 zone vecchie che facevano ombra messe in
  `data/cache/before-task421/` (26 GB, da togliere dopo una settimana);
  zone del telefono 457 su 457, esempi 66 città su 66. Restano coi
  cancelli le zone delle città fuori dal preset e delle richieste lunghe:
  rifarle (`prefetch_zones --boxes`, 10–15 ore) è una scelta dell'utente.
  I comandi che cambiano il server li lancia **l'utente** (il
  classificatore li nega al coordinatore; le letture e i `docker run`
  staccati di solito passano): si scrivono come script corti in
  `out/coordinatore/`, uno per passo.
- **App**: 1.0.2 sull'App Store (runtime iOS `6f8bba4c`, Android
  `227457f3`). Gli OTA li pubblica il coordinatore da una copia pulita
  sul T9, col sì dell'utente, dopo il verde del job `mobile` su `main`.
  L'11 novembre: **OTA 7** da `7e24e7d1` (Play D2, calorie in rosso,
  giorni di corsa, «Save» e «Start»), **OTA 8** da `cd0c8b08` (iOS
  `0cf2abd4`, Android `41d7bb93`: sci B2 e C2, foto del post a schermo
  intero, il «No» della palestra), **OTA 9** da `e60e0b35` (iOS
  `8e3cffd9`, Android `58b3366a`, preview `9870b7d4`: i premi di Play e
  la scelta sul profilo, privacy dell'11 novembre). In `main` e non in
  produzione (escono con l'aggiornamento completo): #1143 sagoma
  fantasma, #1156 tasti di Play, #1160 scialpinismo (**accende lo
  sport**), #1164, #1165, #1161 primo percorso subito, #1173 muscolo
  sull'omino, #1176 icone, #1172 calendario, #1159 piani di corsa,
  #1184 parole a penna alzata (server e OTA insieme). Anteprime: 10
  da `a9ade90c`, 11 da `d1b7878f`. Prima dell'OTA si misurano le
  impronte sul commit di `main` (attese iOS `6f8bba4c`, Android
  `227457f3`; la #1181 porta un file audio nuovo).
  **L'utente ha chiesto due
  giorni di lavoro e poi un aggiornamento completo: niente OTA
  intermedi se non li chiede lui.**
- **1.1.0 (orologio + Live Activity)**: build **14** da `356e3f66` (EAS
  `09229e56`), provata dall'utente («Tutto ok»), **inviata ad Apple l'11
  novembre**, in revisione, **rilascio automatico** (scelta dell'utente:
  «Lascia com'è»). All'approvazione, in fretta: OTA per la 1.0.2 se
  `main` ha cose non uscite, «unisci main» alla sessione A3
  (`local_fd12d88e`), merge della #1116, chiudere #1058 e #862, OTA sul
  runtime nuovo (iOS `5e1b5ce5`). Da allora gli OTA di `main` arrivano
  solo alla 1.1.0. I file di `targets/watch/**` non contano nelle
  impronte: l'orologio della build 14 conosce lo scialpinismo, non le
  ciaspole.
- **Sito**: pubblicato da `main` `e60e0b35` l'11 novembre con
  `out/coordinatore/sito.sh <sha>` (F.14); la copia di prima è
  `514b6ab3`. In arrivo, ognuna col sì dell'utente: `site/live/` coi
  numeri del volo (#1191; controlli in `out/TASK-305/SITO-R3.md`) e
  la privacy con le reazioni ai commenti (#1200), questa **non prima**
  dell'app che le porta. Da fare: la pagina dei crediti (TASK-237) con
  il testo dell'elefante (TASK-408).
- **Server e pubblicazione li fa una sessione sola per volta**, anche
  quando l'utente dà l'ok in più sessioni: chi lo riceve lo scrive al
  coordinatore e aspetta il suo via.

## Fatto dal 2026-10-10

450 PR in `main` dalla #451 alla #929 (TASK-262 C … TASK-411): l'elenco è
in `docs/archive/STATUS-fino-al-2026-11.md`. Dell'8 novembre, dalla #930
alla #969: 930, 931, 932, 933, 934, 936, 937, 938, 939, 940, 941, 942, 943,
944, 945, 946, 947, 948, 949, 951, 954, 955, 956, 958, 959, 963, 965, 967,
968, 969 (TASK-370 A3/B1/B2/B3, 371, 378, 380, 385 F, 406 C/D1, 408 C1,
409 A, 410 B, 411 A/B/E, 412, 413 0, 414 0, 415 0/A, 416, 419 proposta,
420, AGENTI, sport CONDIVISO). Le righe di prima di questo file sono in
`docs/archive/AGENTI-fino-al-2026-11.md`.

## Sport (Coordinatore Sport)

> Sezione tenuta dal «Coordinatore Sport» (ADR-0320) fino al 2026-11-10,
> quando la sessione si è chiusa su richiesta dell'utente: da allora è del
> Coordinatore, finché l'utente non ne apre uno nuovo. Chiusi: TASK-376,
> 377, 378, 380, 416. Aperti: TASK-413 ciaspole (A1 in `main` e sul
> server; restano A2 e B), TASK-414 carrozzina e passeggino (parte A con
> la lista pronta, nessuna sessione), TASK-415 scialpinismo (0 e A in
> `main`; restano B e C). La tabella qui sotto è del 2026-11-07.

**Ultimo aggiornamento**: 2026-11-10 (solo la nota qui sopra).

La struttura (TASK-376, ADR-0320) è chiusa: registri, banco
(`tools/sport_bench/`) e ricetta (`docs/sports/COME-AGGIUNGERE.md`). Ogni
sport passa per le stesse parti: 0 (misura e scelte, solo documenti), A
(motore, contratto, API, profilo nascosto), B (app, «Soon»), accensione
(`ready`, col sì dell'utente dopo il server).

| Sport | Task / ADR | Dove si è | Prossimo |
|---|---|---|---|
| Escursionismo ⛰️ | TASK-377 / ADR-0321 | Chiuso: acceso per tutti (OTA 3ef55853, #869) | — |
| Gravel 🚲 e MTB 🚵 | TASK-378 / ADR-0322 | 0, A, B e accensione in `main` (#875, #879, #897) | La prova sul telefono, poi la chiusura |
| Roller | TASK-380 / ADR-0324 | 0, A e soglie del gioco in `main` (#886, #890, #912, #914); B in PR (#921) | Server con la 0055 (sì dell'utente), poi l'accensione |

Gli sport che vengono dopo, ciascuno con la sua parte 0 e i numeri chiesti
al Coordinatore prima dei file:

- **Carrozzina e passeggino**: misura col banco di scale, cordoli,
  pendenze e superfici; uno o due sport, distanze e avviso sono scelte
  dell'utente.
- **Ciaspole**: «Record only» oppure forma libera sulla neve con avviso di
  sicurezza; scelta dell'utente, con costi e rischi delle due strade.
- **Scialpinismo**: «Record only», col riconoscimento di salite e discese
  dello sci (TASK-373, TASK-375, TASK-406); D+, D−, tempo in salita e in
  discesa.

Al massimo tre sessioni sport in parallelo, mai sugli stessi file. Il banco
gira una volta per volta con `nice -n 10`; in locale solo i test dei file
toccati.
