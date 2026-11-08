# AGENTI — Chi fa cosa, e cosa viene dopo

> L'albero dei lavori degli agenti in parallelo. **Lo aggiorna solo il
> coordinatore** (la sessione «Coordinatore»); gli altri lo leggono.
> Dopo il clear di fine task, un agente trova qui la sua riga: il prossimo
> task, da cosa dipende e quali file non può toccare.

**Ultimo aggiornamento**: 2026-11-08, ~15:30Z · `main` = `6a9a20c0` · coordinatore: la sessione «Coordinatore» `local_3f55a0e9` (dal 2026-11-08; la vecchia `local_e57a8224` è archiviata). «Coordinatore 2» non c'è: i merge li fa il coordinatore; per riaverlo, una sessione nuova con «Sei il Coordinatore 2: segui `docs/COORDINATORE-2.md`». Le righe tolte oggi sono copiate in `docs/archive/AGENTI-fino-al-2026-11.md`.

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

## La coda dei merge

Al 2026-11-08, ~15:30Z. **Nessuna PR aperta tocca `services/` né porta una
migrazione**: entrano senza l'ok dell'utente per il server. Quasi tutte
toccano `STATUS.md` e `DECISIONS.md`, quindi una alla volta: al suo turno
la sessione proprietaria aggiorna da `origin/main` tenendo tutte le voci;
se la sessione è archiviata, lo fa il coordinatore.

Ordine: prima le PR di soli documenti, poi il codice, dalla più piccola.

| # | Task | Stato alle 15:30Z | Note |
|---|---|---|---|
| #928 | TASK-411 proposta (docs) | verde, CLEAN | `DECISIONS` (ADR-0341), `INDEX`, `STATUS`, task file |
| #926 | TASK-410 proposta (docs) | verde, CLEAN | `DECISIONS` (ADR-0340), `INDEX`, `STATUS`, task file |
| #925 | TASK-385 F chiusura (docs) | verde, CLEAN | `STATUS`, task file |
| #923 | TASK-371 Walk acceso e ordine degli sport | verde, CLEAN | `settings/sport*`; prima di #921 |
| #922 | TASK-409 A calorie in piscina | verde, CLEAN | `pool/`, `feed/postEnergy` |
| #924 | TASK-408 C1 il foglio «Edit video» | verde, CLEAN | `share/`, `theme/tokens.ts`, i18n |
| #919 | TASK-406 C «Ski» nella ricerca | verde, CLEAN | `ski/`, `shared-types`, i18n |
| #921 | TASK-380 B Roller nell'app, «Soon» finché il server non ha la 0055 | verde, CLEAN | `settings/sport*` come #923, `shared-types` come #919, i18n |
| #930 | TASK-411 A la griglia dei gruppi muscolari | CI in corso, BLOCKED | `gym/`; dopo #928 |
| #862 | TASK-401 B Live Activity (bozza) | ferma | **non prima del taglio della 1.0.3** |

Dopo la coda parte **TASK-412**, la riduzione dei documenti (sessione
«Ridurre dimensione docs per sessioni Claude» `local_3cd4003c`): tocca
`STATUS.md`, `DECISIONS.md`, `INDEX.md`, `CLAUDE.md` e crea `docs/archive/`.
Durante la sua finestra nessun'altra PR tocca quei file; dopo il suo merge
le righe nuove in `STATUS` e `DECISIONS` seguono il formato che introduce.

## L'albero

```
App Store
  ├─ 1.0.1 in produzione. OTA di produzione registrati: f607dcf5
  │  (2026-11-04) e 3ef55853 (Hike acceso, #869). Aspettano l'OTA col sì
  │  dell'utente: TASK-402 (ruotare e pezzi), TASK-403 («Edit the
  │  drawing» sotto A, B, C), TASK-401 A (notifica a schermo bloccato,
  │  prima una corsa vera)
  ├─ 1.0.2 · TASK-407  solo gli screenshot nuovi: build da
  │  `release/1.0.2` (`c74aab2f`), impronta `6f8bba4c`; la lancia l'utente
  ├─ 1.0.3  login, schermata di blocco, composer, calorie e battito;
  │  TASK-401 B (#862) entra solo dopo il taglio
  └─ 1.1 · TASK-370  Apple Watch: A1 e A2 in `main` (#839, #866);
     A3 (il telefono) sul branch `feat/TASK-370-a3-phone`, senza PR,
     sessione archiviata; A-flip (l'interruttore nativo) alla build

In PR (la coda qui sopra)
  ├─ TASK-371 Walk · TASK-406 C Ski · TASK-408 C1 editor del video
  ├─ TASK-409 A piscina · TASK-410 pagina del post (proposta)
  ├─ TASK-411 palestra: proposta (#928), A griglia (#930);
  │  E «guide» sul branch `feat/TASK-411-e-exercise-guides`, senza PR
  └─ TASK-380 B Roller (sezione «Sport»)

Sport (sezione «Sport», Coordinatore Sport `local_2c048887`)
  ├─ Hike chiuso · Gravel/MTB: la prova sul telefono, poi la chiusura
  ├─ Roller: #921, poi il server con la 0055 (sì dell'utente), poi `ready`
  └─ Parte 0 in corso: carrozzina/passeggino, ciaspole, scialpinismo
     (numeri da chiedere qui prima dei file)

Da avviare
  └─ TASK-412 riduzione dei documenti, dopo la coda (sopra)

Fermi per scelta dell'utente
  ├─ TASK-153 AdMob vero (aspetta la società; ADR-0236 riservato)
  └─ TASK-262 B la mail di conferma
```

**Lo spostamento del 2026-11-08.** Il repository è su
`/Volumes/T9/Progetti/shaperoute` (il vecchio
`/Users/lucapallaoro/Progetti/shaperoute` non esiste più). Le cartelle in
`.claude/worktrees/` ci sono ancora ma **non sono più registrate** in
`git worktree list` (solo `gracious-colden-d8cb3a` lo è): i branch sono
salvi, il lavoro non committato va cercato nelle cartelle prima di
toglierle, **mai `git clean`**. Le sessioni con `cwd` sul vecchio
percorso vanno riaperte sul nuovo. `shaperoute-publish` e
`shaperoute-release-1.0.2` sono accanto al repo, su `/Volumes/T9`.

## File occupati adesso

| File | Di chi |
|---|---|
| `apps/mobile/src/gym/**` | TASK-411 A (#930) ed E (branch) |
| `apps/mobile/src/share/**`, `apps/mobile/src/theme/tokens.ts` | TASK-408 C1 (#924) |
| `apps/mobile/src/settings/sport*.ts`, `sportRows*`, `SportButton*`, `SportSetting*`, `profile/SettingsPage.test.tsx` | TASK-371 (#923) e poi TASK-380 B (#921): #923 entra prima, #921 si aggiorna |
| `apps/mobile/src/pool/**`, `feed/postEnergy*`, `activities/ActivitiesList.tsx` | TASK-409 A (#922) |
| `apps/mobile/src/ski/**`, `api/skiResorts*`, `search/SearchScreen.tsx`, `packages/shared-types/**` | TASK-406 C (#919); `shared-types/src/index.ts` anche #921 |
| `apps/mobile/src/i18n/{de,es,fr,it}.ts` | #924, #921, #919: ognuno aggiunge chiavi, i conflitti si risolvono tenendo tutte |
| `apps/mobile/src/tabs/TabSwipeOwners.test.ts` | #930, #924, #919 |
| `apps/mobile/modules/live-activity/**`, `targets/live-activity/**`, `app.json`, `package.json`, `navigation/useNavigation.ts` | TASK-401 B (#862), ferma fino al taglio della 1.0.3 |
| `docs/STATUS.md`, `docs/DECISIONS.md`, `docs/INDEX.md` | tutti, ognuno solo le sue righe; poi TASK-412 da solo nella sua finestra |
| `docs/AGENTI.md`, `CLAUDE.md` | coordinatore (sezione «Sport»: Coordinatore Sport) |

## Numeri

- Task: presi fino a **TASK-412** (409 calorie in piscina, 410 la pagina
  del post, 411 palestra: griglia, guide, piani e calendario, 412 la
  riduzione dei documenti, assegnato il 2026-11-08). Il prossimo libero è
  **TASK-413**. Controllati `docs/tasks/`, `git branch -a` e le PR aperte.
- ADR: in `main` fino a **ADR-0339**; ADR-0340 (TASK-410, #926) e
  ADR-0341 (TASK-411, #928) sono nelle PR. Il prossimo libero è
  **ADR-0342**.
- Migrazioni in `main`: fino a `0055_inline_skating.sql` (0052 gravel e
  MTB, 0053 piscina, 0054 stazioni sciistiche, 0055 roller). Quali sono
  già sul server va verificato prima del prossimo deploy (`DEPLOY.md`);
  la 0055 è la condizione per accendere il Roller. La prossima: il primo
  libero al merge (oggi 0056).

## Il server e l'app

- **Server**: Hetzner CX33 con il Volume da 70 GB, `deploy/compose.yaml`
  con PostgreSQL, `https://api.getmuw.app`, sito su `https://getmuw.app`,
  copie sullo Storage Box (TASK-122). Ultimo aggiornamento registrato in
  `STATUS.md`: `f10033ce` del 2026-11-05 (migrazione 0046, TASK-394 A).
  Prima di toccarlo: ok dell'utente, `origin/main` pulito, `DEPLOY.md`
  F.12; dopo un cambio del motore, `draw_examples`.
- **App**: 1.0.1 in produzione; `preview` e `production` solo col via del
  coordinatore, una pubblicazione alla volta (regola 9). Chi cambia il
  motore rifà `apps/mobile/assets/engine/engine.zip` e, se tocca acqua o
  sagome, `src/paddle/paddleExamples.json`: due test della CI lo chiedono.
- **Server e pubblicazione li fa una sessione sola per volta**, anche
  quando l'utente dà l'ok in più sessioni: chi lo riceve lo scrive al
  coordinatore e aspetta il suo via.

## Fatto dal 2026-10-10

450 PR in `main`, dalla #451 alla #929 (TASK-262 C … TASK-411): l'elenco
per task è in «Completato» di `STATUS.md`. Le righe di prima di questo
file sono in `docs/archive/AGENTI-fino-al-2026-11.md`.

## Sport (Coordinatore Sport)

> Sezione tenuta dalla sessione «Coordinatore Sport» (ADR-0320), col
> permesso del Coordinatore del 2026-11-04. Il resto del file è del
> Coordinatore. Le liste dei file vanno comunque al Coordinatore prima del
> codice: il controllo dei conflitti con le sessioni non sport lo fa lui.

**Ultimo aggiornamento**: 2026-11-07.

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
