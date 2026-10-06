# AGENTI — Chi fa cosa, e cosa viene dopo

> L'albero dei lavori degli agenti in parallelo. **Lo aggiorna solo il
> coordinatore** (la sessione «Coordinatore»); gli altri lo leggono.
> Dopo il clear di fine task, un agente trova qui la sua riga: il prossimo
> task, da cosa dipende e quali file non può toccare.

**Ultimo aggiornamento**: 2026-10-06, 17:10 · `main` = `5c84e1c`

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

Alle 17:10 del 2026-10-06: nessuna PR aperta. In lavorazione solo
TASK-208 B (la fine corsa stile Strava, sessione «Fine corsa stile
Strava», in codice dopo le risposte dell'utente). Il telefono ha tutto
`main` (gruppo `65620103`); il server è a `d7b490f` (migrazioni fino a
0019) e ha tutto ciò che gli serve. Le PR di soli documenti le mergia il
coordinatore, una alla volta.
Entra prima chi è pronto prima; la sessione proprietaria mergia da sola al
5/5 verde e CLEAN, ricontrollato subito prima, dopo il «merge NNN» del
coordinatore; quando il coordinatore scrive «al verde mergia senza
aspettarmi» vale come «merge» anticipato. Le PR di soli documenti di una
sessione chiusa le mergia (e le aggiorna) il coordinatore. Quando più PR
sono pronte insieme **non aggiornarti e non mergiare da solo**: ogni
merge rimette le altre in conflitto su STATUS e DECISIONS, il turno lo dà
il coordinatore (la sua risposta arriva a fine turno: leggila nel suo
transcript prima di mergiare).

## L'albero

```
Fine corsa stile Strava
  └─ Adesso  TASK-208 B  La fine corsa stile Strava (le conferme
                         dell'utente nel task file; `FreeRunScreen.tsx`
                         libero dal merge di #419; testi all'utente
                         prima del merge)                      ADR-0170

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

Chiuse il 2026-10-05/06: TASK-226, 228, 233, 211 B, 235, 236, 234, 214
(A2, B2, B2b), 238, 239, 240, 241 (A–G), 242, 243, 244, 245 (A, B), 246,
247, 248 (A, B), 249, 251 (A, B), 252, 253, 183, 184, 185, 182 (A–D), 232
(A, B, B2, C), 254 (#407), 255 (#403), 256 (#408), 257 (#400), 250 (#406:
l'acqua di Ledro è sul server; `lake_catalog.py` è un comando offline,
niente da aggiornare sul server), 258 (#412, migrazione 0019 sul server),
259 (A #413, B #419), 210 B la corsa (#414), 210 C «Explore» (#420), 210
D «Draw» (#421). Sessioni chiuse o libere: «Impostazioni utente e
notifiche», «Sezione Near me con città vicine», «Forme inclinate e
distanza ottimale», «Download mappe e figure padel all'installazione»,
«Possibilità di alzare la penna per la bocca», «Posizionamento figura
sezione padel», «Revisione e miglioramento App», «Add lakes and seas to
Draw's "Another place" with Paddle», «Nuovo task», «Lago di Ledro e sette
laghi scartati», «Toggle foto post», «Avviso Location durante la corsa»,
«Traduzioni Draw e Explore», «Task mancanti».

Da assegnare (task file in `main`)
  ├─ TASK-210    Le parti rimaste (elenco nel task file, «da fare»: la
  │              fine corsa — dopo TASK-208 B —, `VoiceSetting`, «Sport»,
  │              `App.tsx`, i nomi delle forme in «Draw» e sulle schede
  │              di «Explore», i nomi sulla mappa e «Start here», «Help»
  │              in de/es/fr), una parte per sessione; righe nuove in
  │              fondo alle `i18n/*`
  └─ Seguiti: il server non tiene le figure dei laghi e delle spiagge
     (TASK-246); la ricerca degli amici dalla rubrica, la mail di
     conferma e l'invio vero delle notifiche (TASK-183, 185); la distanza
     di «Draw» in metri dentro `App.tsx` (TASK-182); altre spiagge
     (TASK-245); in bici senza percorso la schermata mostra il passo al
     km (TASK-251); la velocità (scelte dell'utente del 2026-10-06); un
     segnale per i
     tocchi su «Try» (TASK-234); il GPS solo in primo piano (la corsa
     non registra con l'app in secondo piano: emerso con TASK-255)

Sistema pubblicitario non invasivo
  └─ Aspetta il «fatto» dell'utente su TASK-150 (pagamenti AdMob)

Aspettano l'utente
  ├─ TASK-208 B: le risposte alla sessione «Fine corsa stile Strava»
  ├─ Il GPS solo in primo piano (seguito di TASK-255): se vale un task,
  │  è TASK-260 (scelta di prodotto)
  ├─ TASK-251: i testi delle cinque lingue (già pubblicati) · TASK-184:
  │  i segnaposto di «Terms» e «Privacy» · TASK-237: i testi in inglese
  ├─ La prova sull'iPhone di `65620103`: «Draw» ed «Explore» in italiano
  │  (TASK-210 C, D), «Location is off» in corsa con la posizione negata
  │  (TASK-259 B), la corsa in italiano
  │  (TASK-210 B), il post che resta sul server e si rivede da «Share»
  │  (TASK-258), «Open Settings» e «Retry» (TASK-259 A), gli errori che
  │  parlano a chi corre (TASK-256), la corsa rifiutata con il motivo
  │  (TASK-257), lo schermo acceso e la pausa in secondo piano
  │  (TASK-255), le dodici correzioni piccole (TASK-254), Ledro in
  │  «Paddle» (TASK-250), la mappa girata, le unità del kayak, la
  │  navigazione che non salta, le code sul telefono, più tutto il
  │  2026-10-05
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
| La fine corsa (`RunEnd.tsx`, `FreeRunScreen.tsx` `FreeFinishCard`, `share/*`, `activities/*`: l'elenco esatto nel task file), righe nuove in `i18n/*` | TASK-208 B |
| `site/`, `docs/SITO.md`, `.github/workflows/site.yml` | TASK-237 |
| `deploy/`, `docs/DEPLOY.md` | TASK-122 (in attesa dello Storage Box) |
| `docs/PUBBLICITA.md` | TASK-150 |
| `docs/STATUS.md`, `docs/DECISIONS.md`, `docs/UI.md` | tutti, ognuno solo le sue righe |
| `docs/AGENTI.md`, `CLAUDE.md` | coordinatore |

## Numeri

- Task: presi fino a **TASK-259**. Il prossimo libero è **TASK-260**.
- ADR: presi fino a **ADR-0223** (0183 TASK-220, 0184 TASK-221, 0185
  TASK-223, 0186 TASK-224, 0187 TASK-225, 0188 TASK-226, 0189 TASK-227,
  0190 TASK-228, 0191 TASK-229, 0192 TASK-230, 0193 TASK-119, 0194
  TASK-231, 0195 TASK-232, 0196 TASK-233, 0197 TASK-234, 0198 TASK-235, 0199
  TASK-211 B, 0200 TASK-236, 0201 TASK-237, 0202 TASK-238, 0203
  TASK-239, 0204 TASK-240, 0205 TASK-184, 0206 TASK-185, 0207 TASK-241,
  0208 TASK-242, 0209 TASK-243, 0210 TASK-245, 0211 TASK-246, 0212
  TASK-248, 0213 TASK-249, 0214 TASK-250, 0215 TASK-251, 0216 TASK-252,
  0217 TASK-253, 0218 TASK-254, 0219 TASK-255, 0220 TASK-256, 0221
  TASK-257, 0222 TASK-258, 0223 TASK-259 (se serve); TASK-244 e TASK-247
  sono aggiunte ad ADR-0202 e ADR-0207; 0149 TASK-182 e 0150 TASK-183
  tenuti da prima). Il prossimo libero è **ADR-0224**.
- Migrazioni in `main`: 0001 account, 0002 preferiti, 0003 corse, 0004
  Strava, 0005 foto, 0006 penna alzata, 0007 profili, 0008 attività nei
  preferiti, 0009 corse pubblicate, 0010 canoa nei preferiti, 0011
  seguire, 0012 bici a mano nei preferiti, 0013 commenti, 0014 dettagli
  dei disegni, 0015 reazioni, 0016 email e telefono, 0017 notifiche, 0018 la
  rotazione dei percorsi salvati, 0019 il post della corsa. La prossima:
  il primo libero al merge.

## Il server e l'app

- **Server**: Hetzner CX33, `https://188-245-9-220.sslip.io`, da
  `deploy/compose.yaml` con PostgreSQL. A `main` `d7b490f` dal 2026-10-06
  ~11:25Z (migrazioni 0001–0019; immagine di prima
  `shaperoute-api:before-task258`, copia del database
  `shaperoute-2026-10-06T1124Z.dump`): il post della corsa sul server
  (`PUT /me/activities/{key}/post`, TASK-258) e tutto il precedente (il
  punto del luogo in `/cities`, `run_scored` al salvataggio, le partenze
  vicine senza `Pool`, `activity` in `/me/activities`, la rotazione nei
  percorsi salvati e nel catalogo). `draw_examples` finito il mattino («70 of 72»: a Tenna il cuore e a Calceranica il
  cerchio non si disegnano su quelle strade). Zone del telefono: 528
  file. Acqua della canoa: 248 file (il Lago di Ledro dal 2026-10-06,
  TASK-250, con il Garda riscritto; quello di prima in
  `data/cache/water/before-task250/`); l'elenco dei laghi vive
  nell'app (`lakes.json`), `lake_catalog.py` è un comando offline. Strava
  spento per scelta dell'utente.
- **App**: su `preview` da `main` `4a8e23f` (gruppo `65620103`,
  2026-10-06 ~14:50Z): tutto `main`. **Dal 2026-10-05 il coordinatore pubblica da
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
#177–#402, fra cui 166, 167, 168, 169, 170, 171, 172, 173, 174, 175, 176,
177, 178, 179, 180, 181, 186, 187 (API), 188, 189, 190 A, 192, 193, 194,
195, 196, 067, 190 (A, B, C), 191 A1 e A2, 197, 198, 199, 116, 201 (misurato, non conviene), 200,
202, 203, 187 (app), 204, 117 (A e B), 191 B, 205, 206 (A e B), 207,
210 A, 211 A, 212, 213, 215, 120, 208 A, 209, 214 (A, B, C), 216, 218,
219, 220, 221, 222, 223, 224, 225, 226 (A, B), 227, 228, 233, 234, 235, 236, 237 (A, A2), 211 B, 214 (A2, B2), 229, 230, 231 (A, B),
119 (A, B), 217 e 191 C.
