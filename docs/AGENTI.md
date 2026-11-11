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
| #1130 | TASK-413 A2, ciaspole nel contratto e nell'API (motore, 0068) | CI in corso | la prossima del motore: si riallinea su #1106 (prova, righe, `engine.zip`); **merge dell'utente** |
| #1129 | TASK-429 B2, invio di `ski_parts` | CI in corso | merge al verde; OTA 8 |
| #1131 | TASK-429 C2, giornate salvate e stagione (app) | CI in corso | ha `App.tsx`; tocca i file i18n come #1132: entra la prima verde, l'altra unisce `main` |
| #1132 | TASK-423 E2a, i premi dentro Play (app) | CI in corso | 55 testi approvati dall'utente l'11-11; vedi #1131 |
| #1133 | TASK-433, il «No» di «And running?» senza bordo azzurro | CI in corso | merge al verde; OTA 8 |
| #1137 | TASK-440, la foto del post a schermo intero | CI in corso | solo `src/feed`; merge al verde; OTA 8 |
| #1116 | `release/1.1.0`: orologio + Live Activity | bozza, **trattenuta** | testa `356e3f66`, impronta iOS `5e1b5ce5`, Android `227457f3`; si unisce **solo dopo l'approvazione di Apple**; allora #1058 e #862 si chiudono |
| #1058, #862 | A-flip dell'orologio, Live Activity | bozze | dentro `release/1.1.0`; non si uniscono da sole |

**In `main` l'11 novembre**: #1105 (435 A) e #1106 (436, motore
`ca29e58777cb` tenuto come `8ab61d8e87f9`), merge dell'utente; #1115
(433 C2), #1120 (437); i documenti #1126, #1127, #1128.

**Motore, in ordine**: #1130 (413 A2, migrazione 0068) → 435 B (API,
`schemas.py`, `engine.zip`; bozza finché la #1130 non è in `main`) → 435
C (app) → TASK-447 (via i «baffi»: cambia i percorsi scelti, quindi
impronta efficace ed esempi del catalogo; da decidere con l'utente
insieme a TASK-441). A ogni «in main» chi segue unisce `main` e rifà per
ultimi prova, righe ed `engine.zip`. Il server è ancora al motore
`2bca806f467b`: #1105, #1106 e #1130 entrano col passo 8
(`out/coordinatore/passo8.sh`).

**Dalla prova dell'11 novembre, in ordine**: TASK-442 adesso (`App.tsx`
solo dopo la #1131) e TASK-445 in parallelo (misure: un bench alla volta
sul Mac, si chiede al coordinatore) → TASK-443 dopo la 442 → TASK-444
dopo la #1137 (il rosso delle kcal nel Feed capovolge TASK-424 C3: lo
conferma l'utente) → TASK-446 dopo 435 C (carico sui 2 route worker) →
TASK-447 nella coda del motore; poi le idee: 449, 448, 450 (`src/share`
è di TASK-417: turno), 451, ognuna dalla «parte 0» con le domande
all'utente. Le apre la sessione «Pompo» una alla
volta; ognuna manda la lista dei file al coordinatore prima del codice.

**CI**: da TASK-438 (#1119, ADR-0364) i test dell'API girano in 4 parti
(`api-tests (1)`…`(4)`, circa 10 minuti l'una) e il check obbligatorio
`api` è un job finale. Con molte PR insieme i job aspettano una macchina
anche mezz'ora: la leva è il database modello dei test (TASK-439, da
avviare).

In corso senza PR: TASK-423 E2b (premi sul profilo e privacy: chiede il
turno), TASK-435 B e C, TASK-413 B, TASK-417 D ed E. Senza sessione:
TASK-414 A, TASK-415 B e C, TASK-439, TASK-429 E (grafica delle
Stazioni), TASK-406 E (prova sulla neve).

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
| `apps/mobile/App.tsx` | **a turno**: si chiede al coordinatore prima di toccarlo e si dice «App.tsx libero» all'apertura della PR. Ora: TASK-429 C2 (#1131) |
| `apps/mobile/src/skimode/**`, `api/skiSeason.ts`, `activities/activitiesDoor.ts` (due righe) | TASK-429 (B2 #1129, C2 #1131) |
| `services/route-engine/route_engine/network.py`, `optimizer.py` | TASK-436 (#1106) |
| `services/api/shaperoute_api/route_store.py` (`SAME_ROUTES_AS`), `apps/mobile/assets/engine/engine.zip`, `schemas.py`, `jobs.py`, `images.py`, `route_processes.py` | **a turno**: #1106 e #1130 (merge dell'utente), poi TASK-435 B |
| `apps/mobile/src/gym/GymPlanWizard.tsx` | TASK-433 (#1133) |
| `apps/mobile/src/route/RoutePanel.tsx`, `favorites/SaveRouteButton.tsx` | TASK-435 C, quando parte |
| `apps/mobile/src/watch/**`, `targets/**`, `modules/live-activity/**`, `app.json` (plugin), `fingerprint.config.js` | TASK-370 e il taglio della 1.1 (#1116) |
| `apps/mobile/src/game/**`, `notifications/notificationTap.ts`, `notifications/pushDevice.ts`, `theme/tokens.ts` (blocco `gamePrize`) | TASK-423 (E2a #1132, poi E2b) |
| `services/api/tests/conftest.py`, `.github/workflows/ci.yml` | TASK-439 quando parte; fino ad allora si chiede al coordinatore |
| `apps/mobile/src/share/**` | TASK-417 (D, E) |
| `apps/mobile/src/feed/FeedPost.tsx`, `feed/PhotoViewer.tsx` | TASK-440 |
| `catalog/seed/**`, `tools/catalog_words.py`, `tools/catalog_kept.json`, `services/api/shaperoute_api/recommended.py` | TASK-441 |
| `apps/mobile/src/i18n/{de,es,fr,it}.ts` | tutti: ognuno aggiunge chiavi, conflitti tenendo tutte |
| `docs/STATUS.md`, `docs/DECISIONS.md`, `docs/INDEX.md` | solo PR di documenti, una alla volta, solo la propria voce |
| `docs/AGENTI.md`, `CLAUDE.md`, `docs/sports/CONDIVISO.md` | coordinatore |

## Numeri

- Task: presi fino a **TASK-447** (440 la foto del post a schermo
  intero, 441 «Explore a 2000 disegni»; dalla prova nel simulatore
  dell'11 novembre, `out/prova-app-2026-11-11/PROPOSTE.md`: 442 sagoma
  fantasma e attesa animata, 443 inquadratura della mappa del risultato,
  444 icone e colori coerenti, 445 velocità (solo misure), 446 calcolo
  anticipato, 447 via i «baffi» dal motore; dalle idee della stessa
  prova: 448 «Sorprendimi», 449 anteprima dal vivo della sagoma su Crea,
  450 poster da condividere, 451 «Rifai meglio»; la Live Activity in
  corsa è TASK-401 B e «Accedi con Apple» è TASK-322, senza numeri
  nuovi). Il prossimo libero è **TASK-452**.
- ADR: presi fino a **ADR-0368** (0365 riservato a TASK-439; 0366
  TASK-441; 0367 TASK-446; 0368 TASK-447). Il prossimo libero è
  **ADR-0369**.
- Migrazioni in `main` e sul server: fino a `0067_game_prizes.sql`
  (0059 e 0060 non esistono). In bozza: `0068_snowshoeing.sql` (TASK-413
  A2). Il numero vero è il primo libero al merge.

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
  `out/TASK-429/check_c1_asgi.py`). **Passo 8**, da comporre col sì
  dell'utente: il motore di #1105, #1106 e #1130 (migrazione 0068),
  righe in `out/TASK-413/SERVER-A2.md`; poi il passo della 435 B con la
  rilettura delle righe «times» (`out/TASK-435/server-times-b.txt`).
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
  sul T9, col sì dell'utente. **OTA 7** dell'11 novembre da `7e24e7d1`
  (iOS `3906eb66`, Android `7b0ec9eb`, preview `59cbd83c`): Play con
  obiettivo e progressi veri (#1113), calorie in rosso (#1123), giorni
  di corsa nelle schede (#1115), «Save» e «Start» dopo un Edit (#1120),
  `engine.zip` della #1105. Prima: OTA 6 da `c4ab00a3`, OTA 5 da
  `2c3442f7`. **OTA 8**, col sì: #1129, #1131, #1132, #1133 quando sono
  in `main`. Da provare sul telefono dall'utente: 437, 433 C2, 424 C3,
  423 D2. App Privacy «Salute» pubblicata il 2026-11-10.
- **1.1.0 (orologio + Live Activity, scelta dell'utente del
  2026-11-10)**: build 12 provata al polso («funziona tutto»). Si
  costruisce da `release/1.1.0` (#1116) e si unisce in `main` solo dopo
  l'approvazione di Apple, così `main` resta aggiornabile via OTA per la
  1.0.2. Build **14** dell'11 novembre da `356e3f66` (EAS `09229e56`, tre
  target: app, orologio, Live Activity) su TestFlight interno, provata
  dall'utente («Tutto ok»); la segue la sessione A3 (`local_fd12d88e`).
  Poi: prova dell'utente (`out/TASK-370/prova-build-13.md`), scheda
  (screenshot Watch approvati, testi da approvare), invio col sì.
- **Sito**: pubblicato da `main` `514b6ab3` il 2026-11-10 (F.14): pagina
  `live/`, privacy con palestra, Play, link dal vivo e orologio. Da fare:
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
