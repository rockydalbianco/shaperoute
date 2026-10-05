# AGENTI — Chi fa cosa, e cosa viene dopo

> L'albero dei lavori degli agenti in parallelo. **Lo aggiorna solo il
> coordinatore** (la sessione «Coordinatore»); gli altri lo leggono.
> Dopo il clear di fine task, un agente trova qui la sua riga: il prossimo
> task, da cosa dipende e quali file non può toccare.

**Ultimo aggiornamento**: 2026-10-05, 06:00 · `main` = `ef7ad90`

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

Alle 06:00 del 2026-10-05: aperte la **#319** (TASK-233 A, i laghi), la
**#320** (TASK-211 B, «Follow» nell'app) e la **#314** (task file di
TASK-234, solo documenti, la mergia la sua sessione). Entra prima chi è
pronto prima; la sessione proprietaria mergia da sola al 5/5 verde e
CLEAN, ricontrollato subito prima, dopo il «merge NNN» del coordinatore.
Le PR di soli documenti di una sessione chiusa le mergia il coordinatore.

## L'albero

```
App per il padel
  └─ Adesso  TASK-228  Il «Feed» sull'acqua: prima le tre domande
                       all'utente                              ADR-0190

Sezione Explore padel e laghi
  └─ Adesso  TASK-233  «Explore» della canoa come la corsa, e i laghi:
                       A nella #319; B l'elenco dell'Italia intera e
                       l'acqua dei laghi sul server (ok dell'utente
                       dato nella sua sessione)                ADR-0196

Impossibile seguire amici
  └─ Adesso  TASK-211 B  «Follow», «Requests», le liste, nella #320
                                                               ADR-0173

Mappe offline: parte B pubblicata
  ├─ Adesso  TASK-235  La pubblicità fra i post del «Feed», una ogni
  │                    cinque (al posto dell'interstitial)     ADR-0198
  └─ Dopo    TASK-214 A2  Il tetto del traffico e `?prefetch=1`; poi B2
                          (città vicine) e D (prova sull'iPhone) ADR-0177

Forme inclinate e distanza ottimale
  ├─ Adesso  TASK-234  «Viene meglio a X km» (`better_distance_m`)
  │                                                            ADR-0197
  └─ Dopo    TASK-232  Forme inclinate fino a ±45° e mappa girata: A
                       (motore), poi B e C                     ADR-0195

Da assegnare (task file in `main`)
  ├─ TASK-208 B  La fine corsa stile Strava, dopo le conferme
  │              dell'utente                                   ADR-0170
  └─ TASK-182  km o miglia (ADR-0149), quando lo dice l'utente; poi le
               parti successive di TASK-210 (lingua dell'app)

Sistema pubblicitario non invasivo
  └─ Aspetta il «fatto» dell'utente su TASK-150 (pagamenti AdMob)

Aspettano l'utente
  ├─ Le zone del telefono sul server (TASK-214, ~0,8 GB)
  ├─ Strava: il secret sul server lo scrive l'utente
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
| `src/paddle/PaddleExplore.tsx`, `waterSpots.ts`, `lakes.json`; `lake_catalog.py` nell'API | TASK-233 |
| `src/profile/`, `src/social/`, `src/api/follows.ts`, `PeopleScreen.tsx`, `ProfileLayer.tsx` | TASK-211 B |
| `FeedScreen.tsx`, file nuovi in `src/feed/` | TASK-235; TASK-228 entra dopo e si accorda |
| `phone_zone_api.py` e i suoi test | TASK-214 A2, quando parte |
| `optimizer.py`, `models.py`, `schemas.py`, `shared-types`, poi `RoutePanel.tsx` | TASK-234 |
| `deploy/`, `docs/DEPLOY.md` | TASK-122 (in attesa dello Storage Box) |
| `docs/PUBBLICITA.md` | TASK-150 |
| `docs/STATUS.md`, `docs/DECISIONS.md`, `docs/UI.md` | tutti, ognuno solo le sue righe |
| `docs/AGENTI.md`, `CLAUDE.md` | coordinatore |

## Numeri

- Task: presi fino a **TASK-235**. Il prossimo libero è **TASK-236**.
- ADR: presi fino a **ADR-0198** (0183 TASK-220, 0184 TASK-221, 0185
  TASK-223, 0186 TASK-224, 0187 TASK-225, 0188 TASK-226, 0189 TASK-227,
  0190 TASK-228, 0191 TASK-229, 0192 TASK-230, 0193 TASK-119, 0194
  TASK-231, 0195 TASK-232, 0196 TASK-233, 0197 TASK-234, 0198 TASK-235). Il
  prossimo libero è **ADR-0199**.
- Migrazioni in `main`: 0001 account, 0002 preferiti, 0003 corse, 0004
  Strava, 0005 foto, 0006 penna alzata, 0007 profili, 0008 attività nei
  preferiti, 0009 corse pubblicate, 0010 canoa nei preferiti, 0011
  seguire, 0012 bici a mano nei preferiti, 0013 commenti, 0014 dettagli
  dei disegni, 0015 reazioni. La prossima: il primo libero al merge.

## Il server e l'app

- **Server**: Hetzner CX33, `https://188-245-9-220.sslip.io`, da
  `deploy/compose.yaml` con PostgreSQL. A `main` `9deba3b` dal 2026-10-05
  03:27Z (migrazioni 0001–0015; immagine di prima
  `shaperoute-api:before-task226`, copia del database
  `shaperoute-2026-10-05T0327Z.dump`), con il motore di TASK-226 A.
  `draw_examples` rilanciato alle 03:29Z; zona bici di Trento; l'acqua dei
  quattro luoghi della canoa. Mancano l'acqua dei laghi di TASK-233 e le
  zone del telefono. Strava spento.
- **App**: su `preview` da `main` `ef7ad90` (gruppo `1fc82a12`,
  2026-10-05), con la parte B di TASK-226. Dopo il merge della #319
  `main` **non si pubblica** finché l'acqua dei laghi elencati non è sul
  server.
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
#177–#318, fra cui 166, 167, 168, 169, 170, 171, 172, 173, 174, 175, 176,
177, 178, 179, 180, 181, 186, 187 (API), 188, 189, 190 A, 192, 193, 194,
195, 196, 067, 190 (A, B, C), 191 A1 e A2, 197, 198, 199, 116, 201 (misurato, non conviene), 200,
202, 203, 187 (app), 204, 117 (A e B), 191 B, 205, 206 (A e B), 207,
210 A, 211 A, 212, 213, 215, 120, 208 A, 209, 214 (A, B, C), 216, 218,
219, 220, 221, 222, 223, 224, 225, 226 (A, B), 227, 229, 230, 231 (A, B),
119 (A, B), 217 e 191 C.
