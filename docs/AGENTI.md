# AGENTI — Chi fa cosa, e cosa viene dopo

> L'albero dei lavori degli agenti in parallelo. **Lo aggiorna solo il
> coordinatore** (la sessione «Coordinatore»); gli altri lo leggono.
> Dopo il clear di fine task, un agente trova qui la sua riga: il prossimo
> task, da cosa dipende e quali file non può toccare.

**Ultimo aggiornamento**: 2026-10-05, 11:00 · `main` = `fd14cd3`

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

Alle 07:00 del 2026-10-05: aperte la **#330** (TASK-214 A2, il tetto del
traffico, CI in corso) e la **#323** (TASK-236, le città vicine: pronta,
entra dopo le conferme dell'utente su testi e regola). Entra prima chi è
pronto prima; la sessione proprietaria mergia da sola al 5/5 verde e
CLEAN, ricontrollato subito prima, dopo il «merge NNN» del coordinatore.
Le PR di soli documenti di una sessione chiusa le mergia (e le aggiorna)
il coordinatore. Quando più PR sono pronte insieme **non aggiornarti da
solo**: ogni merge rimette le altre in conflitto su STATUS e DECISIONS,
il turno lo dà il coordinatore.

## L'albero

```
Sezione Near me con città vicine
  └─ Adesso  TASK-236  In «Explore», sotto «Near me», fino a quattro
                       paesi vicini (20–50 km) con i loro esempi;
                       `GET /nearby-cities`. #323 pronta: aspetta le
                       conferme dell'utente                    ADR-0200

Mappe offline: parte B pubblicata
  ├─ Adesso  TASK-214 A2  Il tetto del traffico e `?prefetch=1`, #330
  └─ Dopo    B2 (città vicine, con `/nearby-cities`) e D (prova
             sull'iPhone, vuole le zone del telefono sul server) ADR-0177

Forme inclinate e distanza ottimale
  ├─ Adesso  TASK-234 B  «Viene meglio a X km» nell'app, dopo le misure
  │                      e i testi visti dall'utente (la A è in `main`,
  │                      #327)                                 ADR-0197
  └─ Dopo    TASK-232  Forme inclinate fino a ±45° e mappa girata: A
                       (motore), poi B e C                     ADR-0195

Sezione merchandising magliette
  └─ Adesso  TASK-237 B  Il sito con «Merch»: la A è in `main` (#325,
                         `site/`, segnaposto «Coming soon»); servizio di
                         stampa, disegni, prezzi e dove sta il sito li
                         sceglie l'utente                      ADR-0201

Chiuse in questa tornata: «App per il padel» (TASK-226, TASK-228),
«Sezione Explore padel e laghi» (TASK-233), «Impossibile seguire amici»
(TASK-211 B), TASK-235 (pubblicità nel «Feed»).

Da assegnare (task file in `main`)
  ├─ TASK-208 B  La fine corsa stile Strava, dopo le conferme
  │              dell'utente                                   ADR-0170
  ├─ TASK-182  km o miglia (ADR-0149), quando lo dice l'utente; poi le
  │            parti successive di TASK-210 (lingua dell'app)
  └─ Seguiti di TASK-233: il Lago di Ledro (`water=pond`), i sette laghi
     scartati dal motore, i «laghi vicini»

Sistema pubblicitario non invasivo
  └─ Aspetta il «fatto» dell'utente su TASK-150 (pagamenti AdMob)

Aspettano l'utente
  ├─ La prova sull'iPhone di `da4e955c`: «Follow» con due account, i
  │  post in canoa nel «Feed», i laghi in «Explore» con «Paddle» («Near
  │  me» da Levico, un lago per nome, un lago piccolo)
  ├─ Le zone del telefono sul server (TASK-214, ~0,8 GB)
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
| `ExploreScreen.tsx` (poche righe), `src/explore/nearby*`, `NearbyTowns.tsx`, `nearby_cities.py`, tre righe in `__main__.py` | TASK-236 (#323) |
| `phone_zone_api.py`, `phone_zone_cap.py`, `src/engine/prefetch.ts`, `zones.ts` | TASK-214 A2 (#330) |
| `src/route/betterDistance.ts` (nuovo), `RoutePanel.tsx`, le tabelle i18n (righe nuove) | TASK-234 B, quando parte |
| `site/`, `docs/SITO.md`, `.github/workflows/site.yml` | TASK-237 |
| `deploy/`, `docs/DEPLOY.md` | TASK-122 (in attesa dello Storage Box) |
| `docs/PUBBLICITA.md` | TASK-150 |
| `docs/STATUS.md`, `docs/DECISIONS.md`, `docs/UI.md` | tutti, ognuno solo le sue righe |
| `docs/AGENTI.md`, `CLAUDE.md` | coordinatore |

## Numeri

- Task: presi fino a **TASK-237**. Il prossimo libero è **TASK-238**.
- ADR: presi fino a **ADR-0201** (0183 TASK-220, 0184 TASK-221, 0185
  TASK-223, 0186 TASK-224, 0187 TASK-225, 0188 TASK-226, 0189 TASK-227,
  0190 TASK-228, 0191 TASK-229, 0192 TASK-230, 0193 TASK-119, 0194
  TASK-231, 0195 TASK-232, 0196 TASK-233, 0197 TASK-234, 0198 TASK-235, 0199
  TASK-211 B, 0200 TASK-236, 0201 TASK-237). Il prossimo libero è
  **ADR-0202**.
- Migrazioni in `main`: 0001 account, 0002 preferiti, 0003 corse, 0004
  Strava, 0005 foto, 0006 penna alzata, 0007 profili, 0008 attività nei
  preferiti, 0009 corse pubblicate, 0010 canoa nei preferiti, 0011
  seguire, 0012 bici a mano nei preferiti, 0013 commenti, 0014 dettagli
  dei disegni, 0015 reazioni. La prossima: il primo libero al merge.

## Il server e l'app

- **Server**: Hetzner CX33, `https://188-245-9-220.sslip.io`, da
  `deploy/compose.yaml` con PostgreSQL. A `main` `fd14cd3` dal 2026-10-05
  08:54Z (migrazioni 0001–0015; immagine di prima
  `shaperoute-api:before-task234`, copia del database
  `shaperoute-2026-10-05T0853Z.dump`), con il motore di TASK-234 A
  (`better_distance_m`) e il tetto del traffico di TASK-214 A2.
  `draw_examples` rilanciato alle 08:56Z; zona bici di Trento; l'acqua
  della canoa: 219 file, 71 MB (i laghi d'Italia di TASK-233). Mancano
  `/nearby-cities` (#323, non ancora in `main`) e le zone del telefono.
  Strava spento per scelta dell'utente.
- **App**: su `preview` da `main` `fd14cd3` (gruppo `da4e955c`,
  2026-10-05): «Follow», i post in canoa nel «Feed», i 211 laghi in
  «Explore» con «Paddle», la pubblicità fra i post (non si vede in Expo
  Go). La parte B di TASK-234 si potrà pubblicare appena è in `main`: il
  server ha già la A.
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
#177–#329, fra cui 166, 167, 168, 169, 170, 171, 172, 173, 174, 175, 176,
177, 178, 179, 180, 181, 186, 187 (API), 188, 189, 190 A, 192, 193, 194,
195, 196, 067, 190 (A, B, C), 191 A1 e A2, 197, 198, 199, 116, 201 (misurato, non conviene), 200,
202, 203, 187 (app), 204, 117 (A e B), 191 B, 205, 206 (A e B), 207,
210 A, 211 A, 212, 213, 215, 120, 208 A, 209, 214 (A, B, C), 216, 218,
219, 220, 221, 222, 223, 224, 225, 226 (A, B), 227, 228, 229, 230, 231 (A, B),
119 (A, B), 217 e 191 C.
