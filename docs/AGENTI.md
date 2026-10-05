# AGENTI — Chi fa cosa, e cosa viene dopo

> L'albero dei lavori degli agenti in parallelo. **Lo aggiorna solo il
> coordinatore** (la sessione «Coordinatore»); gli altri lo leggono.
> Dopo il clear di fine task, un agente trova qui la sua riga: il prossimo
> task, da cosa dipende e quali file non può toccare.

**Ultimo aggiornamento**: 2026-10-05, 14:20 · `main` = `20c021b`

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

Alle 14:20 del 2026-10-05: in CI la **#365** (TASK-241 E), la **#363**
(TASK-245) e la **#366** (TASK-182 C), in quest'ordine; la **#362**
(TASK-243) è verde e aspetta il giudizio dell'utente sui campioni; #357 e
#364 sono documenti. Entra prima chi è pronto prima; la sessione
proprietaria mergia da sola al 5/5 verde e CLEAN, ricontrollato subito
prima, dopo il «merge NNN» del coordinatore. Le PR di soli documenti di
una sessione chiusa le mergia (e le aggiorna) il coordinatore. Quando più
PR sono pronte insieme **non aggiornarti e non mergiare da solo**: ogni
merge rimette le altre in conflitto su STATUS e DECISIONS, il turno lo dà
il coordinatore (la sua risposta arriva a fine turno: leggila nel suo
transcript prima di mergiare).

## L'albero

```
Possibilità di alzare la penna per la bocca
  └─ Adesso  TASK-243  La penna alzata sui baffi del contorno (forme a
                       pezzi con `pen_up`): #362 verde, aspetta il
                       giudizio dell'utente; poi server + `draw_examples`
                                                               ADR-0209

Impostazioni utente e notifiche
  ├─ Adesso  TASK-182 C  La corsa e la voce in miglia: #366 in coda
  ├─ Adesso  TASK-182 B  «Draw» e le schede in miglia (sotto-agente)
  └─ Dopo    «Phone units» (`FOLLOWS_PHONE`), quando B e C sono in
             `main`                                            ADR-0149

Toggle foto post
  └─ Adesso  TASK-241 E  Il punteggio via da fine corsa e dai disegni del
                         «Profile», niente più `POST /track-scores` a
                         fine corsa: #365 in coda              ADR-0207

Add lakes and seas to Draw's «Another place» with Paddle
  └─ Adesso  TASK-245  Altre 29 spiagge per «Paddle»: #363 in coda;
                       l'acqua è già sul server                ADR-0210

Download mappe e figure padel all'installazione
  └─ Adesso  TASK-246  Al primo avvio, gli esempi «Paddle» dei posti più
                       vicini già sul telefono; prima le risposte
                       dell'utente                             ADR-0211

Sezione Near me con città vicine (TASK-236, chiuso)
  └─ Adesso  le zone chieste dall'utente sul server: fatte Borgo
             Valsugana, Tenna, Calceranica, Caldonazzo, Pergine; dopo
             `draw_examples`: Vigolo Vattaro e gli esempi di Tenna e
             Calceranica dai punti di `/nearby-cities`

Mappe offline: parte B pubblicata
  └─ Dopo    TASK-214 D  La prova sull'iPhone: le zone del telefono
                         sono sul server e B2/B2b sono pubblicate; i
                         limiti di distanza si fissano con la prova
                                                               ADR-0177

SITO WEB (già «Sezione merchandising magliette»)
  └─ Adesso  TASK-237  Il sito è la guida dell'app (A2 in `main`, #335;
                       il merch è spento). Aspettano l'utente: i testi
                       in inglese, il link dell'App Store, il dominio,
                       la pubblicazione                        ADR-0201

Chiuse il 2026-10-05: TASK-226, 228, 233, 211 B, 235, 236, 234, 214
(A2, B2, B2b), 238, 239, 240, 241 (A–D), 242, 244, 183, 184, 185, 182 A,
232 A.

Da assegnare (task file in `main`)
  ├─ **TASK-232 B e C**  La mappa girata, la freccia del nord, la mappa
  │              girata in corsa (ADR-0195): la A è in `main` e sul
  │              server; la sessione è stata archiviata. `NavigateScreen`
  │              e `RunDashboard` passano prima da TASK-182 C
  ├─ TASK-208 B  La fine corsa stile Strava, dopo le conferme
  │              dell'utente                                   ADR-0170
  └─ Seguiti: il Lago di Ledro (`water=pond`) e i sette laghi scartati
     (TASK-233); un villaggio di «NEARBY TOWNS» e lo stesso per nome
     sono due città (TASK-236); `near` uguale al proprio `centre` sposta
     di 20 m la testa di coniglio del Garda (TASK-238); `run_scored`
     negli `insights` senza `POST /track-scores` (TASK-241 E); un
     segnale per i tocchi su «Try» (TASK-234)

Sistema pubblicitario non invasivo
  └─ Aspetta il «fatto» dell'utente su TASK-150 (pagamenti AdMob)

Aspettano l'utente
  ├─ La prova sull'iPhone di `71e4f577`: le mappe offline (la zona
  │  scaricata, un percorso disegnato sul telefono senza rete), il numero
  │  rosso e «Follow back» con due account, il cambio di email e numero,
  │  gli interruttori delle notifiche, «Move the shape» con un dito vero
  │  (in «Draw» e sugli esempi di «Explore»), «Units», laghi e mari nella
  │  ricerca di «Draw», «Help»/«Terms»/«Privacy», i paesi vicini
  ├─ TASK-243: il giudizio sui campioni · TASK-246: quanti posti · TASK-182
  │  C: i testi e le frasi in miglia · TASK-184: i segnaposto di «Terms»
  │  e «Privacy» · TASK-237: i testi in inglese del sito
  ├─ Strava: spento per scelta dell'utente del 2026-10-05 («teniamo solo
  │  Instagram per ora»); per riaccenderlo, `DEPLOY.md` «Strava»
  ├─ TASK-236: la regola dei quattro paesi e i tre testi · TASK-237: il
  │  servizio di stampa · TASK-234: le misure e i testi · TASK-228: i
  │  quattro titoli dei post · TASK-211 B: i testi nuovi, la prova con
  │  due account
  ├─ La prova sull'iPhone di `1fc82a12` (forme nuove, anche a pezzi
  │  sull'acqua; canoa in «Explore»; reazioni con due account; «Share»;
  │  confronto dei km; «Offline maps»)
  ├─ TASK-223: le traduzioni de/es/fr dei testi nuovi; le «quasi»
  │  (palloncino, cono, fulmine, nuvola)
  ├─ TASK-211 B / TASK-208 B: dove sta «Requests», i testi, «Only me» di
  │  partenza; il filtro dei negativi anche sulla descrizione; il tipo
  │  Strava della canoa; la ricerca mostra il nome di ogni iscritto
  ├─ TASK-214: Pyodide (dipendenza nuova), App Store, memoria, dimensione
  ├─ TASK-116: «drawings» conta le corse private?; i testi del profilo
  │  (il profilo di un altro si apre dalla ricerca: TASK-211, 215)
  ├─ TASK-190: le due domande della parte C, «Start» in bici (le
  │  indicazioni sono solo a piedi, TASK-200), l'avviso dello sterrato,
  │  «km walking» in bici, i testi, la zona bici di Trento
  ├─ TASK-191: i campioni v2 e Como (Overpass o il server), la prova
  │  dal vero sul server (cuore da 2 km a Riccione), l'avviso di
  │  sicurezza e gli esempi in «Explore» (parte C); l'acqua dei quattro
  │  luoghi scaricata prima sul server (proposta)
  ├─ TASK-117 B: «Saved on the phone. It is sent when you are back
  │  online.», «This drawing is no longer public.», «Back to the
  │  profile», «Score 87»
  ├─ TASK-205: i testi di VoiceOver «Sport, Run», «Changes the sport»,
  │  «Close»
  ├─ TASK-198/199: «Paused» nella pausa «penna», la riga dei km su un
  │  preferito riaperto; gli `insights` senza l'attività
  ├─ TASK-203: più veloce con percorsi diversi (ricerca lontana,
  │  `NEARBY_GOOD_GRACE_S`), con campioni
  ├─ TASK-122 lo Storage Box · TASK-150 i pagamenti AdMob · TASK-187 la
  │  sua app Strava e il secret sul server, poi la prova dal vero
  ├─ Il metodo nuovo «una voce per task» (`out/voci-per-task-bozza.md`)
  └─ TASK-173 seconda parte (Spotify dentro l'app), TASK-184, TASK-185,
     e a cosa serve il telefono (TASK-183)

Da assegnare
  ├─ L'acqua dei quattro luoghi della canoa sul server (prima di
  │  pubblicare «Paddle»), con l'ok dell'utente
  ├─ La parte social: 118 (il feed vero), 119 (like), 121 (segnalare,
  │  bloccare); TASK-092;
  │  TASK-152 App Store; TASK-153 AdMob vero
  ├─ Le altre idee (A) di TASK-203 non provate (`tasks/TASK-203.md`)
  └─ Seguiti: il passo `draw_examples` in `DEPLOY.md` F.12 (TASK-122);
     cuore e «Start» sulla scheda del Feed (domanda in TASK-188); gli
     stessi percorsi Mac/server fra versioni di NetworkX/NumPy (TASK-203)
```

## File occupati adesso

| File | Di chi |
|---|---|
| `detours.py`, `pen_up.py`, `engine.zip` | TASK-243 (#362) |
| `screens/FinishScreen.tsx`, `social/DrawingsGrid.tsx`, `DrawingCard.tsx`, righe di `App.tsx`, `about/content/{en,it}.ts` | TASK-241 E (#365) |
| `src/navigation/`, `src/voice/`, `screens/RunPanel.tsx`, `RunDashboard.tsx`, `NavigateScreen.tsx`, `FreeRunScreen.tsx`, `FinishScreen.tsx`, `units/runFormat.ts` | TASK-182 C (#366) |
| `route/RoutePanel.tsx`, `distance.ts`, `useRouteRequest.ts`, `betterDistance.ts`, `feed/FeedPost.tsx`, `share/postRun.ts`, `social/DrawingCard.tsx`, `PublicParts.tsx`, `PublicRow.tsx`, `paddle/PaddleExplore.tsx`, `activities/ActivityCard.tsx` | TASK-182 B |
| `paddle/beaches.json`, `waterSpots.ts`, `placeSpots.ts`, `beach_catalog.py` | TASK-245 (#363) |
| `paddle/aheadExamples.ts` (nuovo), righe di `engine/usePhoneZones.ts` e `explore/exampleRoutes.ts` | TASK-246 |
| `site/`, `docs/SITO.md`, `.github/workflows/site.yml` | TASK-237 |
| `deploy/`, `docs/DEPLOY.md` | TASK-122 (in attesa dello Storage Box) |
| `docs/PUBBLICITA.md` | TASK-150 |
| `docs/STATUS.md`, `docs/DECISIONS.md`, `docs/UI.md` | tutti, ognuno solo le sue righe |
| `docs/AGENTI.md`, `CLAUDE.md` | coordinatore |

## Numeri

- Task: presi fino a **TASK-246**. Il prossimo libero è **TASK-247**.
- ADR: presi fino a **ADR-0211** (0183 TASK-220, 0184 TASK-221, 0185
  TASK-223, 0186 TASK-224, 0187 TASK-225, 0188 TASK-226, 0189 TASK-227,
  0190 TASK-228, 0191 TASK-229, 0192 TASK-230, 0193 TASK-119, 0194
  TASK-231, 0195 TASK-232, 0196 TASK-233, 0197 TASK-234, 0198 TASK-235, 0199
  TASK-211 B, 0200 TASK-236, 0201 TASK-237, 0202 TASK-238, 0203
  TASK-239, 0204 TASK-240, 0205 TASK-184, 0206 TASK-185, 0207 TASK-241,
  0208 TASK-242, 0209 TASK-243, 0210 TASK-245, 0211 TASK-246; TASK-244 è
  un'aggiunta ad ADR-0202; 0149 TASK-182 e 0150 TASK-183 tenuti da
  prima). Il prossimo libero è **ADR-0212**.
- Migrazioni in `main`: 0001 account, 0002 preferiti, 0003 corse, 0004
  Strava, 0005 foto, 0006 penna alzata, 0007 profili, 0008 attività nei
  preferiti, 0009 corse pubblicate, 0010 canoa nei preferiti, 0011
  seguire, 0012 bici a mano nei preferiti, 0013 commenti, 0014 dettagli
  dei disegni, 0015 reazioni, 0016 email e telefono, 0017 notifiche. La prossima: il primo libero al merge.

## Il server e l'app

- **Server**: Hetzner CX33, `https://188-245-9-220.sslip.io`, da
  `deploy/compose.yaml` con PostgreSQL. A `main` `c2bb428` dal 2026-10-05
  12:02Z (migrazioni 0001–0017; immagine di prima
  `shaperoute-api:before-task185`, copia del database
  `shaperoute-2026-10-05T1202Z.dump`), con `PUT /me/notifications` e il
  motore di TASK-232 A (un cuore da 5 km a Trento esce con
  `rotation_deg: -30`). `draw_examples` rilanciato alle 12:03Z con
  Rovereto, Borgo Valsugana, Caldonazzo, Pergine Valsugana. Zone del
  telefono: 526 file (`python -m shaperoute_api.phone_zone_api`, dentro il
  container dell'API: un riavvio lo uccide; rilanciarlo dopo zone nuove
  scrive solo quelle che mancano). Acqua della canoa: 247 file, 93 MB (i
  laghi d'Italia e, dal 2026-10-05, 27 tratti di costa di TASK-245).
  Strava spento per scelta dell'utente.
- **App**: su `preview` da `main` `20c021b` (gruppo `71e4f577`,
  2026-10-05): tutto `main`. **Dal 2026-10-05 il coordinatore pubblica da
  solo le cose di sola app** appena sono in `main` e il job `mobile` è
  verde (ok dell'utente: «sì, pubblica sempre le cose di sola app»); per
  il server l'ok si chiede ogni volta. Una PR la cui app vuole qualcosa
  sul server lo dice nel «pronta» e non entra prima.
- **Server e pubblicazione li fa una sessione sola per volta**, anche
  quando l'utente dà l'ok in più sessioni: chi lo riceve lo scrive al
  coordinatore e aspetta il suo via.
- **Chi cambia il motore** rifà `apps/mobile/assets/engine/engine.zip`
  (`python tools/phone_engine/phone_engine.py engine`) e, se tocca i file
  dell'acqua o le sagome, `src/paddle/paddleExamples.json`
  (`python -m shaperoute_api.paddle_examples`): due test della CI lo
  chiedono.

## Fatto in questa tornata (2026-10-01/02)

In `main`: #137 (TASK-136), #112 (088), #148 (140), #142 (142), #149 (147),
#141 (144), #147 (128), #151 (114), #152 (146), #153 (148), #155 (AGENTI),
#154 (149), #156 (151), #158 (115), #161 e #163 (task file di 067), #159
(task file 150/152/153), #130 (132), #162 (154), #160 (155), #157 (122),
#150 (137), #166 (158), #165 (157), #164 (156), #167 (122, copie), #140
(141), #169 (141), #170 (AGENTI), #168 (159), #171 (160), #172 (165), #173
(162), #174 (163, prima PR), #175 (161), #176 (164), e poi fino alla #214:
#177–#361, fra cui 166, 167, 168, 169, 170, 171, 172, 173, 174, 175, 176,
177, 178, 179, 180, 181, 186, 187 (API), 188, 189, 190 A, 192, 193, 194,
195, 196, 067, 190 (A, B, C), 191 A1 e A2, 197, 198, 199, 116, 201 (misurato, non conviene), 200,
202, 203, 187 (app), 204, 117 (A e B), 191 B, 205, 206 (A e B), 207,
210 A, 211 A, 212, 213, 215, 120, 208 A, 209, 214 (A, B, C), 216, 218,
219, 220, 221, 222, 223, 224, 225, 226 (A, B), 227, 228, 233, 234, 235, 236, 237 (A, A2), 211 B, 214 (A2, B2), 229, 230, 231 (A, B),
119 (A, B), 217 e 191 C.
