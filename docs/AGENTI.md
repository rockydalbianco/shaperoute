# AGENTI — Chi fa cosa, e cosa viene dopo

> L'albero dei lavori degli agenti in parallelo. **Lo aggiorna solo il
> coordinatore** (la sessione «Coordinatore»); gli altri lo leggono.
> Dopo il clear di fine task, un agente trova qui la sua riga: il prossimo
> task, da cosa dipende e quali file non può toccare.

**Ultimo aggiornamento**: 2026-11-08, ~19:00Z · `main` = `e85a68ac` · coordinatore: la sessione «Coordinatore» `local_3f55a0e9` (dal 2026-11-08; la vecchia `local_e57a8224` è archiviata). «Coordinatore 2» non c'è: i merge li fa il coordinatore; per riaverlo, una sessione nuova con «Sei il Coordinatore 2: segui `docs/COORDINATORE-2.md`». Le righe tolte l'8 novembre sono in `docs/archive/AGENTI-fino-al-2026-11.md`.

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

Al 2026-11-08 sera, dopo la finestra di TASK-412.
Tutte le PR aperte che toccano `STATUS.md`/`DECISIONS.md` si riallineano
da `main` nel formato nuovo prima del merge.

| # | Task | Stato | Note |
|---|---|---|---|
| #961 | TASK-408 C2a scene e finale del video | verde, da riallineare | poi C2b da `main` |
| #957 | TASK-413 A1 la neve nel motore | verde, da riallineare | **motore**: sì dell'utente dato (server + `draw_examples` ~35 min); i comandi li lancia l'utente |
| #960 | TASK-406 D2 la giornata di sci nell'app | CI | tocca `App.tsx`, privacy (con #962) |
| #962 | TASK-411 D la privacy delle schede | CI | privacy e sito (con #960); sito col sì dell'utente |
| #964 | TASK-411 C le schede con i giorni | CI | **migrazione** (0060 in bozza → il primo libero, oggi 0058): sì dell'utente per il server |
| #966 | TASK-419 i 1000 disegni, primo giro | CI | `tools/`, `catalog/seed/` |
| #971 | TASK-422 la pagina «Compass» | da riallineare | scelte approvate dall'utente; merge a CI verde |
| #970 | TASK-409 scelte della parte B (docs) | CI | solo task file |
| #950, #952, #953 | TASK-417 proposta, TASK-420 chiusura, TASK-418 forme candidate (docs) | da riallineare nel formato nuovo | #950 e #952 le riallinea il coordinatore (sessioni chiuse) |
| #862 | TASK-401 B Live Activity (bozza) | ferma | **non prima del taglio della 1.0.3** |

In arrivo con la lista già approvata: TASK-408 C2b e C2c, TASK-409 B1/B2
(migrazione 0061 in bozza), TASK-370 B3a1/B3a2, TASK-411 D seguiti,
TASK-413 A2 (0059), TASK-414 A (0058), TASK-415 B, TASK-406 D3,
TASK-421 (motore: `networks/foot.py`), TASK-410 C (`run_stats`).

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
| `apps/mobile/src/share/**` | TASK-408 C2a (#961), poi C2b/C2c |
| `apps/mobile/App.tsx` | TASK-406 D2 (#960); poi TASK-370 B3a no (usa `FavoriteHeart.tsx`), TASK-422 no (già in #971 senza) |
| `apps/mobile/src/about/content/*.ts`, `site/privacy/**`, test della data | TASK-411 D (#962) e TASK-406 D2 (#960): chi entra dopo riallinea e rigenera; poi TASK-409 B, TASK-417 |
| `apps/mobile/src/gym/**`, `services/api/shaperoute_api/gym_*.py`, `shared-types/src/gym.ts` | TASK-411 C (#964) |
| `apps/mobile/src/ski/**`, `screens/FreeRunScreen.tsx`, `SnowFinishCard.tsx` | TASK-406 D2 (#960) |
| `apps/mobile/src/screens/RunDashboard.tsx`, `map/NorthArrow.tsx`, `navigation/headingUp*`, `useCompass*` | TASK-422 (#971) |
| `apps/mobile/src/watch/**`, `targets/watch/**`, `src/favorites/FavoriteHeart.tsx` | TASK-370 B3a1/B3a2 |
| `apps/mobile/src/health/heartSamples*`, `body/zoneTime*`, `pool/**` | TASK-409 B |
| `services/route-engine/route_engine/{activities/,models.py,snow.py,snowshoeing.py,heights.py}`, `route_store.py` | TASK-413 A1 (#957); poi TASK-414 A, TASK-421 (`networks/foot.py`, `networks/base.py`) |
| `tools/catalog_*`, `catalog/seed/**` | TASK-419 (#966) |
| `services/route-engine/candidate_outlines/**`, `tools/draw_new_shapes*` | TASK-418 (#953) |
| `apps/mobile/src/i18n/{de,es,fr,it}.ts` | tutti: ognuno aggiunge chiavi, conflitti tenendo tutte |
| `docs/STATUS.md`, `docs/DECISIONS.md`, `docs/INDEX.md` | tutti, solo la propria voce, nel formato nuovo |
| `docs/AGENTI.md`, `CLAUDE.md` | coordinatore (sezione «Sport»: Coordinatore Sport) |

## Numeri

- Task: presi fino a **TASK-422** (413 ciaspole, 414 carrozzina e
  passeggino, 415 scialpinismo, 416 numeri da bici, 417 immagine nel video,
  418 forme nuove, 419 i 1000 disegni, 420 pagina del catalogo, 421 cancelli
  nella rete foot, 422 pagina «Compass»). Il prossimo libero è **TASK-423**.
- ADR: presi fino a **ADR-0350** (0342 TASK-413, 0343 TASK-414, 0344
  TASK-415, 0345 TASK-417, 0346 TASK-418, 0347 TASK-419, 0348 TASK-420,
  0349 TASK-421, 0350 TASK-422). Il prossimo libero è **ADR-0351**.
- Migrazioni in `main` e sul server: fino a `0057_ski_touring.sql`. In
  bozza, nell'ordine di oggi: 0058 TASK-414 A, 0059 TASK-413 A2, 0060
  TASK-411 C (#964), 0061 TASK-409 B1. Il numero vero è il primo libero al
  merge: chi entra prima prende il più basso, gli altri rinominano.

## Il server e l'app

- **Server**: Hetzner CX33 con il Volume da 70 GB, `deploy/compose.yaml`
  con PostgreSQL, `https://api.getmuw.app`, sito su `https://getmuw.app`,
  copie sullo Storage Box. A `main` **`8e898de5`** dal 2026-11-08 ~17:18Z
  (migrazione 0057, TASK-415 A; prima `c9bc0da9` alle 16:46Z con la 0056 e
  `gym_leaderboard`; prima ancora `758bccd1` del 6 novembre con la 0055).
  Copie: `shaperoute-2026-11-08T1646Z.dump` e `…T1718Z.dump`; immagini di
  ritorno `shaperoute-api:before-2026-11-08` (= 758bccd1) e
  `shaperoute-api:before-task415`. I comandi sul server li lancia
  **l'utente via ssh** (`ssh root@188.245.9.220`): il classificatore delle
  sessioni li ferma; la sessione prepara la sequenza (`DEPLOY.md` F.12).
  Non ancora sul server: l'endpoint `/me/gym-calendar` (#955, senza
  migrazione). Prossimi, col sì dell'utente: #957 (motore → anche
  `draw_examples`), #964 (0058), poi 414 A.
- **App**: 1.0.1 in produzione, OTA e anteprima sopra. Chi pubblica lo fa
  da una copia pulita su `origin/main` **sul T9** (`shaperoute-publish` o
  `/Volumes/T9/Progetti/tmp/<nome>/`), una pubblicazione alla volta, col
  via del coordinatore; l'anteprima ha runtime `exposdk:57.0.0` (la build
  interna `8a612504`), la produzione `6f8bba4c`. Chi cambia il motore
  rifà `apps/mobile/assets/engine/engine.zip` e, se tocca acqua o sagome,
  `src/paddle/paddleExamples.json`.
- **Sito**: la privacy va ripubblicata (frase della classifica palestra,
  poi quelle di #962 e #960) col sì dell'utente.
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
