# AGENTI — Chi fa cosa, e cosa viene dopo

> L'albero dei lavori degli agenti in parallelo. **Lo aggiorna solo il
> coordinatore** (la sessione «Coordinatore»); gli altri lo leggono.
> Dopo il clear di fine task, un agente trova qui la sua riga: il prossimo
> task, da cosa dipende e quali file non può toccare.

**Ultimo aggiornamento**: 2026-11-11, ~01:00Z · `main` = `801408fd` · coordinatore: la sessione **«Coordinatore (fork)»** (dal 2026-11-10; «Coordinatore» `local_3f55a0e9` e `local_e57a8224` sono archiviate). **«Coordinatore 3 · chiusura task e archivio»** fa censimento, solleciti e archivio delle sessioni chiuse: non mergia e non tocca server, OTA, numeri. Il «Coordinatore Sport» si è chiuso il 2026-11-10: la sezione «Sport» qui sotto e `docs/sports/CONDIVISO.md` sono del Coordinatore. Le righe tolte l'8 novembre sono in `docs/archive/AGENTI-fino-al-2026-11.md`.

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
dai tre file di `main`. Le PR di codice le mergia il coordinatore al verde
quando la sessione scrive «#NNN pronta» (il motore lo mergia l'utente).

| # | Task | Stato | Note |
|---|---|---|---|
| #1158 | TASK-452 A, piani di corsa: campo `runner` (server e tipi) | CI in corso | merge al verde; server prima dell'app |
| #1159 | TASK-452 B, piani di corsa nell'app | bozza | non prima di «server A fatto» |
| #1162 | TASK-462 A, `GET /me/activity-calendar` | CI in corso | merge al verde; poi passo sul server |
| #1163 | TASK-461 A1, quattro esercizi a corpo libero (server) | CI in corso | merge al verde; poi passo sul server |
| #1156 | TASK-460, i movimenti dei tasti di Play | CI in corso | sì dell'utente al video; merge al verde |
| #1160 | TASK-415 B, scialpinismo nell'app (fasi e VAM) | CI in corso | sì dell'utente; **il primo OTA dopo il merge accende lo sport** |
| #1161 | TASK-435 C, il primo percorso subito nell'app | bozza | non prima di «passo 8 fatto»; mancano gli screenshot |
| #1164 | TASK-453, riepilogo palestra e piscina senza account, plurali | CI in corso | mancano gli screenshot |
| #1165 | TASK-443, inquadratura della mappa del risultato | CI in corso | mancano gli screenshot |
| #1116 | `release/1.1.0`: orologio + Live Activity | bozza, **trattenuta** | testa `356e3f66` = build 14, **in revisione da Apple dall'11 novembre, rilascio automatico**; si unisce solo dopo l'approvazione; allora #1058 e #862 si chiudono |

**In `main` l'11 novembre**: il motore #1105, #1106, #1130 (merge
dell'utente; codice `427ed1a16a97`, efficace `8ab61d8e87f9`); #1139
(435 B); il catalogo di «Explore» #1149 + #1155 (1261 percorsi, ordine
misto; le parole a riga unica tolte su richiesta dell'utente); l'app
#1115, #1120, #1129, #1131, #1133, #1137, #1132, #1144, #1143.

**Motore**: nessuna PR aperta. In coda: TASK-447 (via i «baffi»: cambia
i percorsi, da decidere con l'utente insieme a TASK-441) e, se l'utente
le vuole, le ottimizzazioni di TASK-445 a percorsi identici (partenze
vicine in processi caldi, routing più veloce). Le PR che toccano
`services/route-engine` le mergia l'utente.

**Server, passo 8** (`out/coordinatore/passo8.sh <sha>`, lo lancia
l'utente al verde di `main`): motore, ciaspole con `0068_snowshoeing`,
catalogo a 1261, 435 B, e le PR server che entrano prima del lancio.

**Dalle prove dell'11 novembre** (`out/prova-app-2026-11-11/PROPOSTE.md`;
le apre la sessione «Pompo» una alla volta): fatte 442 e 445; in corso
443, 453; poi 444 (con la coerenza visiva), 454, 456, 457, 455, 458, 459,
450 (con «Share your run»), 449, 448, 451; 446 dopo 435 C; 447 nella
coda del motore.

**Simulatore, `npm ci`, bench**: uno per volta sul Mac, col turno dato
dal coordinatore («simulatore tuo» / «simulatore libero»): l'11 novembre
due simulatori insieme hanno portato il carico a 316.

**CI**: i test dell'API girano in 4 parti (TASK-438); ogni PR chiede 8
macchine e con dieci PR insieme la coda supera la mezz'ora. La leva è il
database modello dei test (TASK-439, da avviare).

Senza sessione: TASK-414 A, TASK-415 C, TASK-413 B, TASK-439, TASK-429 E,
TASK-406 E (prova sulla neve), TASK-322 B e C (Accedi con Apple, nativa).

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
| `apps/mobile/App.tsx` | **a turno**: si chiede al coordinatore prima di toccarlo. Ora: libero |
| `apps/mobile/src/map/**`, `screens/MapScreen.tsx` | TASK-443 (#1165) |
| `apps/mobile/src/route/RoutePanel.tsx`, `route/useRouteRequest.ts`, `route/choices.ts`, `api/routes.ts` | TASK-435 C (#1161) |
| `apps/mobile/src/gym/GymPlanWizard.tsx`, `program.ts`, `plans.ts`, `RunDayEditor.tsx`, `GymDrawGuide.tsx`, `api/gymPlans.ts`; `services/api/shaperoute_api/gym_plans.py` | TASK-452 (#1158, #1159); poi TASK-461 A2 |
| `apps/mobile/src/gym/GymEnd.tsx`, `GymWorkoutHost.tsx`, `ExerciseList.tsx`, `src/pool/PoolSwimHost.tsx`, `PoolSwimEnd.tsx` | TASK-453 (#1164) |
| `services/api/shaperoute_api/gym_catalog.py`, `apps/mobile/src/gym/catalog.ts`, `moves.ts`, `guides/**`, `proposal.ts` | TASK-461 (A1 #1163, poi A2) |
| `apps/mobile/src/game/**` | TASK-460 (#1156) |
| `apps/mobile/src/settings/sport.ts`, `sports/**`, `social/PublicParts.tsx`, `screens/FreeRunScreen.tsx`, `activities/snowDay.ts` | TASK-415 B (#1160); poi TASK-413 B, poi TASK-463 |
| `services/api/shaperoute_api/app.py`, `packages/shared-types/src/index.ts`, `docs/API.md` | a turno: TASK-462 A (#1162), TASK-452 A (#1158, solo `API.md`) |
| `apps/mobile/src/profile/ProfileHome.tsx`, `activities/ActivitiesList.tsx` | TASK-462 B; poi TASK-457 e TASK-456 |
| `catalog/seed/**`, `tools/catalog_*.py`, `tools/catalog_kept.json`, `services/api/shaperoute_api/recommended.py`, `explore/ExploreScreen.tsx`, `route/NearYou.tsx`, `explore/explored.ts` | TASK-441 (parte B) |
| `services/api/shaperoute_api/__main__.py`, `warm_zones.py` | TASK-464 |
| `apps/mobile/src/watch/**`, `targets/**`, `modules/live-activity/**`, `app.json` (plugin), `fingerprint.config.js` | TASK-370 e il taglio della 1.1 (#1116) |
| `services/api/tests/conftest.py`, `.github/workflows/ci.yml` | TASK-439 quando parte; fino ad allora si chiede al coordinatore |
| `apps/mobile/src/share/**` | TASK-417 (D, E); poi TASK-450 |
| `apps/mobile/src/i18n/{de,es,fr,it}.ts` | tutti: ognuno aggiunge chiavi, conflitti tenendo tutte |
| `docs/STATUS.md`, `docs/DECISIONS.md`, `docs/INDEX.md` | solo PR di documenti, una alla volta, solo la propria voce |
| `docs/AGENTI.md`, `CLAUDE.md`, `docs/sports/CONDIVISO.md` | coordinatore |

## Numeri

- Task: presi fino a **TASK-464**. Dell'11 novembre: 440 foto del post
  a schermo intero (fatto), 441 «Explore» più grande, 442 sagoma fantasma
  (fatto), 443 inquadratura della mappa, 444 icone e colori coerenti, 445
  misure di velocità (fatto), 446 calcolo anticipato, 447 via i «baffi»,
  448 «Sorprendimi», 449 anteprima dal vivo della sagoma, 450 «Share your
  run» e poster, 451 «Rifai meglio», 452 piani di corsa personalizzati,
  453 riepilogo palestra senza account, 454 reazioni e super like, 455
  condividere il disegno di un altro, 456 scheda dell'attività, 457
  profilo nuovo, 458 minori (password, chat), 459 «Follow» segue subito,
  460 movimenti dei tasti di Play, 461 pianificatore completo, 462
  calendario delle attività nel profilo, 463 alpinismo senza percorso,
  464 zone già in memoria nei processi di calcolo. Il prossimo libero è
  **TASK-465**.
- ADR: presi fino a **ADR-0374** (0366 TASK-441 B; 0367 TASK-446; 0368
  TASK-447; 0369 TASK-452; 0370 TASK-459; 0371 TASK-461; 0372 TASK-462;
  0373 TASK-463; 0374 TASK-464; 0365 riservato a TASK-439). Il prossimo
  libero è **ADR-0375**.
- Migrazioni in `main`: fino a `0068_snowshoeing.sql` (sul server fino
  alla 0067: la 0068 arriva col passo 8). Provvisoria: 0069 per TASK-463.
  Il numero vero è il primo libero al merge.

## Il server e l'app

- **Server**: Hetzner CX33, `deploy/compose.yaml` con PostgreSQL,
  `https://api.getmuw.app`, sito su `https://getmuw.app`. A `main`
  **`2ed26af7`** dal 2026-11-11 (passo 7: 424 C2b, 429 C1, 433 C1,
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
  `out/TASK-429/check_c1_asgi.py`). **Passo 8** (`out/coordinatore/passo8.sh <sha>`,
  lo lancia l'utente al verde di `main`): il motore di #1105, #1106 e
  #1130 con `0068_snowshoeing` (atteso codice `427ed1a16a97`, efficace
  `8ab61d8e87f9`), il catalogo a 1261 percorsi con l'ordine misto (da
  Milano «60 31 31»), la 435 B. Controlli dopo, del coordinatore:
  `out/TASK-413/SERVER-A2.md`, `out/TASK-435/SERVER-B.md`,
  `out/TASK-452/SERVER.md`, `out/TASK-461/SERVER.md`,
  `out/TASK-462/SERVER.md` per ciò che c'è dentro; le righe «times» in
  `out/TASK-435/` e `out/TASK-436/`.
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
  produzione: la sagoma fantasma (#1143), le parti dell'app delle
  ciaspole (nascoste, vogliono il passo 8). **L'utente ha chiesto due
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
  `out/coordinatore/sito.sh <sha>` (F.14): privacy dell'11 novembre con i
  premi di Play sul profilo; la copia di prima è `514b6ab3`. Da fare:
  la pagina dei crediti (TASK-237) con il testo dell'elefante (TASK-408).
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
