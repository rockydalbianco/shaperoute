# AGENTI — Chi fa cosa, e cosa viene dopo

> L'albero dei lavori degli agenti in parallelo. **Lo aggiorna solo il
> coordinatore** (la sessione «Coordinatore»); gli altri lo leggono.
> Dopo il clear di fine task, un agente trova qui la sua riga: il prossimo
> task, da cosa dipende e quali file non può toccare.

**Ultimo aggiornamento**: 2026-10-03, 17:50 · `main` = `b649a88`

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

Alle 17:50 del 2026-10-03: aperta solo la **#255** (TASK-191 C, la canoa
nell'app), in pausa per scelta dell'utente, e da non pubblicare finché
l'acqua dei quattro luoghi non è sul server. Entra prima chi è pronto
prima; la sessione proprietaria mergia da sola al 5/5 verde e CLEAN,
ricontrollato subito prima, dopo il «merge NNN» del coordinatore.

## L'albero

```
Attività rimanenti
  └─ Adesso  TASK-216  La navigazione in bici (km/h, avvisi prima, la
                       penna alzata in bici); registra anche le conferme
                       dell'utente delle frasi di TASK-206 e 198 ADR-0179
     Dopo:   TASK-217  Il confronto dei km nella voce          ADR-0180

Revisione sezione pubblicazione attività
  └─ Adesso  TASK-211 B e TASK-208 B  «Follow», «Requests», la fine corsa
                       stile Strava: prima le conferme dell'utente
                                                    ADR-0173, ADR-0170

Ricerca mappe offline sul telefono
  └─ Adesso  TASK-214 B  Il motore sul telefono, l'app (Pyodide);
                         `package.json` e `metro.config.js` con l'ok
                                                               ADR-0177

Selezione lingua app
  └─ TASK-182 (km o miglia, ADR-0149): riparte quando lo dice l'utente;
     poi le parti successive di TASK-210

Logo sgrava al salvataggio
  └─ Strava sul server: istruzioni all'utente per il secret, poi con il
     suo ok il riavvio dell'API

Tasto aggiunta foto profilo
  └─ #255 TASK-191 C in pausa (scelta dell'utente)           ADR-0169

Grafica registrazione corsa · Pulsante ricerca amici in feed · Blocco
messaggi negativi · Logo e post Instagram
  └─ Libere

Sistema pubblicitario non invasivo
  └─ Aspetta il «fatto» dell'utente su TASK-150 (pagamenti AdMob)

Aspettano l'utente
  ├─ Server: la 0014 (TASK-208 A) e le zone del telefono (TASK-214 A),
  │  quando arrivano le loro parti app; Strava: il secret sul server
  ├─ La prova sull'iPhone di `fcdb1a46` (voce, bici a mano, commenti,
  │  seguire, Find friends, Strava)
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
| la navigazione e la voce della bici (`navigator.ts`, `onFootVoice.ts`, `NavigateScreen.tsx`, `RunDashboard.tsx`, `RunPanel.tsx`, `src/voice/`, `ride.ts`), `RoutePanel.tsx` (solo `PenSplit`) | TASK-216 |
| `src/social/`, `RunEnd.tsx`, `src/profile/` | TASK-211 B / TASK-208 B |
| l'app del motore sul telefono (`src/engine/` nuovo, `src/api/routes.ts`, `SettingsPage.tsx`), poi `package.json` e `metro.config.js` | TASK-214 B |
| `src/route/`, `src/explore/`, `favoriteRoute.ts`, `SettingsPage.test.tsx` | #255 TASK-191 C (in pausa) |
| `deploy/`, `docs/DEPLOY.md` | TASK-122 (in attesa dello Storage Box) |
| `docs/PUBBLICITA.md` | TASK-150 |
| `docs/STATUS.md`, `docs/DECISIONS.md`, `docs/UI.md` | tutti, ognuno solo le sue righe |
| `docs/AGENTI.md`, `CLAUDE.md` | coordinatore |

## Numeri

- Task: presi fino a **TASK-219**. Il prossimo libero è **TASK-220**.
- ADR: presi fino a **ADR-0182** (… 0178 TASK-215, 0179 TASK-216, 0180
  TASK-217, 0181 TASK-218, 0182 TASK-219; 0149 di TASK-182). Il prossimo
  libero è **ADR-0183**.
- Migrazioni in `main`: 0001 account, 0002 preferiti, 0003 corse, 0004
  Strava, 0005 foto, 0006 penna alzata, 0007 profili, 0008 attività nei
  preferiti, 0009 corse pubblicate, 0010 canoa nei preferiti, 0011
  seguire, 0012 bici a mano nei preferiti, 0013 commenti, 0014 dettagli
  dei disegni. La prossima: il primo libero al merge.

## Il server e l'app

- **Server**: Hetzner CX33, `https://188-245-9-220.sslip.io`, da
  `deploy/compose.yaml` con PostgreSQL. A `main` `7098cb9` dal 2026-10-03
  12:39Z (migrazioni 0001–0013; immagine di prima
  `shaperoute-api:before-task206`, copia del database
  `shaperoute-2026-10-03T1239Z.dump`). Zona bici di Trento con la bici a
  mano; esempi per 66 città su 66. Mancano la 0014 e `/phone-zones` (con
  le zone del telefono da costruire). Strava spento.
- **App**: su `preview` da `main` `b649a88` (gruppo `fcdb1a46`, 2026-10-03
  pomeriggio). «Paddle» è «Soon»: la #255 non va pubblicata prima
  dell'acqua sul server.

## Fatto in questa tornata (2026-10-01/02)

In `main`: #137 (TASK-136), #112 (088), #148 (140), #142 (142), #149 (147),
#141 (144), #147 (128), #151 (114), #152 (146), #153 (148), #155 (AGENTI),
#154 (149), #156 (151), #158 (115), #161 e #163 (task file di 067), #159
(task file 150/152/153), #130 (132), #162 (154), #160 (155), #157 (122),
#150 (137), #166 (158), #165 (157), #164 (156), #167 (122, copie), #140
(141), #169 (141), #170 (AGENTI), #168 (159), #171 (160), #172 (165), #173
(162), #174 (163, prima PR), #175 (161), #176 (164), e poi fino alla #214:
#177–#276, fra cui 166, 167, 168, 169, 170, 171, 172, 173, 174, 175, 176,
177, 178, 179, 180, 181, 186, 187 (API), 188, 189, 190 A, 192, 193, 194,
195, 196, 067, 190 (A, B, C), 191 A1 e A2, 197, 198, 199, 116, 201 (misurato, non conviene), 200,
202, 203, 187 (app), 204, 117 (A e B), 191 B, 205, 206 (A e B), 207,
210 A, 211 A, 212, 213, 215, 120, 208 A, 209, 214 A, 218 e 219.
