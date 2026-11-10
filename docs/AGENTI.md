# AGENTI — Chi fa cosa, e cosa viene dopo

> L'albero dei lavori degli agenti in parallelo. **Lo aggiorna solo il
> coordinatore** (la sessione «Coordinatore»); gli altri lo leggono.
> Dopo il clear di fine task, un agente trova qui la sua riga: il prossimo
> task, da cosa dipende e quali file non può toccare.

**Ultimo aggiornamento**: 2026-11-10, ~18:10Z · `main` = `1a1f248e` · coordinatore: la sessione **«Coordinatore (fork)»** (dal 2026-11-10; «Coordinatore» `local_3f55a0e9` e `local_e57a8224` sono archiviate). **«Coordinatore 3 · chiusura task e archivio»** fa censimento, solleciti e archivio delle sessioni chiuse: non mergia e non tocca server, OTA, numeri. Il «Coordinatore Sport» si è chiuso il 2026-11-10: la sezione «Sport» qui sotto e `docs/sports/CONDIVISO.md` sono del Coordinatore. Le righe tolte l'8 novembre sono in `docs/archive/AGENTI-fino-al-2026-11.md`.

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
| #1098 | TASK-424 C2, calorie per ogni sport | in CI | solo app; al merge parte la catena sci/calorie qui sotto |
| #1099 | TASK-423 E1, premi di Play sul server | in CI | migrazione `0067_game_prizes.sql`; poi passo server col sì e `game_backfill` |
| #1103 | TASK-433 B, la scheda «How plans work» al primo tocco di Gym | in CI | solo app; poi OTA col sì |
| #1105 | TASK-435 A, `on_first` in `plan_nearby` (motore) | in CI | **merge dell'utente**; impronte `2bca806f467b` → `b4967ef32e9a`, nuoti `55b54eea0e14` → `3ce5d60ec0cd`; passa **prima** di TASK-436 |
| #1058 | TASK-370 A-flip, l'orologio nella build | bozza, **trattenuta** | nativa: impronta iOS `77a5233c` (Android resta `227457f3`); entra al taglio della 1.1, col «merge A-flip» del coordinatore |
| #862 | TASK-401 B Live Activity | bozza, **trattenuta** | **non prima del taglio**; con #1058 il match diventa `{live-activity,watch}` |

**Catena sci e calorie** (un solo campo `ski_parts` dentro
`PUT /me/activities/{key}/stats`, nessuna migrazione): #1098 (424 C2) →
424 C2b (server) → 429 B1 → 429 B2 (invio con ripiego sul 422) → 429 C1
(server) → 429 C2 → 424 C3.

**Motore, in ordine**: #1105 (435 A) → TASK-436 (tabelle del grafo a
blocchi: unisce `main` dopo la #1105, poi rifà `engine.zip`, la prova
`test_same_routes` e le sue righe `SAME_ROUTES_AS`) → 435 B (API,
`schemas.py`, `engine.zip`) → 435 C (app).

In corso senza PR: TASK-436, TASK-423 E2 (app), TASK-424 C2b, TASK-429 B
e C, TASK-417 D ed E, TASK-413 A2 e B. Senza sessione: TASK-414 A,
TASK-415 B e C.

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
| `apps/mobile/App.tsx` | **a turno**: si chiede al coordinatore prima di toccarlo e si dice «App.tsx libero» all'apertura della PR. Ora libero; prossimo: TASK-429 C2 |
| `apps/mobile/src/skimode/**`, `api/skiSeason.ts`, `services/api/shaperoute_api/ski_season.py`, `ski_day_parts.py`, `ski_days.py` | TASK-429 (B, C) |
| `services/route-engine/route_engine/nearby_starts.py` | TASK-435 A (#1105) |
| `services/route-engine/route_engine/network.py`, `optimizer.py` | TASK-436 |
| `services/api/shaperoute_api/route_store.py` (`SAME_ROUTES_AS`), `apps/mobile/assets/engine/engine.zip`, `schemas.py` | **a turno**: #1105, poi TASK-436, poi TASK-435 B |
| `apps/mobile/src/gym/**` | TASK-433 B (#1103) |
| `apps/mobile/src/watch/**`, `targets/watch/**`, `app.json` (plugin dell'orologio), `fingerprint.config.js` | TASK-370 (#1058) |
| `apps/mobile/src/game/**`, `services/api/shaperoute_api/game*.py` | TASK-423 (E1 #1099, E2) |
| `apps/mobile/src/liveShare/**`, il campo `ski_parts` di `PUT /me/activities/{key}/stats` | TASK-424 (C2 #1098, C2b, C3) |
| `apps/mobile/src/share/**` | TASK-417 (D, E) |
| `apps/mobile/src/i18n/{de,es,fr,it}.ts` | tutti: ognuno aggiunge chiavi, conflitti tenendo tutte |
| `docs/STATUS.md`, `docs/DECISIONS.md`, `docs/INDEX.md` | solo PR di documenti, una alla volta, solo la propria voce |
| `docs/AGENTI.md`, `CLAUDE.md`, `docs/sports/CONDIVISO.md` | coordinatore |

## Numeri

- Task: presi fino a **TASK-436** (433 schede guidate della palestra,
  434 profilo CPU del motore, sola misura, 435 «primo percorso subito,
  alternative dopo», 436 le tabelle del grafo a blocchi nel motore). Il
  prossimo libero è **TASK-437**.
- ADR: presi fino a **ADR-0362** (0360 TASK-433, 0361 TASK-435, 0362
  TASK-436; TASK-434 non ne ha, TASK-432 è una precisazione di
  ADR-0356). Il prossimo libero è **ADR-0363**.
- Migrazioni in `main` e sul server: fino a `0066_gym_plan_weeks.sql`
  (0059 e 0060 non esistono). In PR: `0067_game_prizes.sql` (#1099). In
  bozza: TASK-413 A2. Il numero vero è il primo libero al merge.

## Il server e l'app

- **Server**: Hetzner CX33, `deploy/compose.yaml` con PostgreSQL,
  `https://api.getmuw.app`, sito su `https://getmuw.app`. A `main`
  **`8138b456`** dal 2026-11-10 (cinque passi nel giorno: `9cf5576b`,
  `7dec87d7`, `039fe4e1`, `50a9fa4a`, `8138b456`): migrazioni 0061–0066
  (l'ultima: le settimane delle schede guidate della palestra), i due
  processi caldi di TASK-276 B, `GET /catalog` con 572 percorsi in 63
  città, le 14 forme di TASK-418 B (impronta `2bca806f467b`, efficace
  `8ab61d8e87f9`), backfill di Play e dei tempi per km fatti. Copia
  `shaperoute-2026-11-10T1738Z.dump`; immagini di ritorno
  `before-passo5` (= `50a9fa4a`), `before-passo4`, `before-passo3`,
  `before-passo2`, `before-2026-11-10`. Prossimo passo, col sì
  dell'utente: 0067 (#1099) con `game_backfill`, e la C2b di TASK-424.
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
- **App**: 1.0.2 sull'App Store (runtime `6f8bba4c`). Cinque OTA di
  produzione il 2026-11-10, pubblicati dalla sessione «Post nel Feed» da
  una copia pulita sul T9: `88e5f88f` (gruppo `4eca1d42`), `e1bb8a58`
  (`3056f4e4`), `52010be4` (`978fbccc`), `a56d19e4` (`341e7da1`),
  `2c3442f7` (iOS `4a8484cb`, Android `e3027ada`: schede guidate della
  palestra, modalità sci A, numeri dal vivo, risveglio dell'orologio).
  Il risveglio (#1089) è uscito senza la prova al polso: va fatta con la
  build 12. App Privacy «Salute» pubblicata il 2026-11-10.
- **Orologio**: build 1.1.0 (11) su TestFlight interno provata; la 12
  (A-flip `6c4475d6`, con B4 e B5) lanciata il 2026-11-10 col sì
  dell'utente. Il taglio della 1.1 (merge di #1058 e #862) lo fissa il
  coordinatore con l'utente.
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
