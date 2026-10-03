# AGENTI — Chi fa cosa, e cosa viene dopo

> L'albero dei lavori degli agenti in parallelo. **Lo aggiorna solo il
> coordinatore** (la sessione «Coordinatore»); gli altri lo leggono.
> Dopo il clear di fine task, un agente trova qui la sua riga: il prossimo
> task, da cosa dipende e quali file non può toccare.

**Ultimo aggiornamento**: 2026-10-03, 17:15 · `main` = `7098cb9`

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
10. **Migrazioni del database**: il numero è **il primo libero in `main`
   quando la PR entra** (non uno tenuto prima), così l'ordine è lo stesso
   su ogni database. Prima del merge guarda `services/api/migrations/`.
11. **Dopo un aggiornamento del server che cambia `route_engine`**, gli
   esempi tenuti non valgono più: va rilanciato `draw_examples` (circa 35
   minuti, dentro il container dell'API), mai mentre gira un altro
   aggiornamento.

## La coda dei merge

Alle 17:15 del 2026-10-03: **#259** (TASK-209, la voce in cinque lingue)
verde ma ferma sulla conferma dell'utente delle frasi italiane; **#255**
(TASK-191 C, la canoa nell'app) in pausa per scelta dell'utente, e non va
pubblicata finché l'acqua dei quattro luoghi non è sul server. Entra prima
chi è pronto prima; la sessione proprietaria mergia da sola al 5/5 verde e
CLEAN, ricontrollato subito prima, dopo il «merge NNN» del coordinatore.

## L'albero

```
Revisione sezione pubblicazione attività
  └─ Adesso  TASK-208 A  Pubblicare stile Strava, l'API: descrizione,
                         «Who can see it» a 3 valori con `follows_sql`,
                         attività, foto, tag; Strava con il tipo giusto
                                                               ADR-0170
     Dopo: TASK-211 B e TASK-208 B (app), con le conferme dell'utente

Attività rimanenti
  └─ Adesso  TASK-206 C  La bici a mano nell'app: piano e testi
                         all'utente; il codice dopo la #259  ADR-0167

Ricerca mappe offline sul telefono
  └─ Adesso  TASK-214  Il motore sul telefono (Pyodide): le sei domande
                       all'utente prima del codice           ADR-0177

Grafica registrazione corsa
  └─ #259 TASK-209 pronta, ferma sulla conferma dell'utente  ADR-0171

Tasto aggiunta foto profilo
  └─ #255 TASK-191 C in pausa (scelta dell'utente)           ADR-0169

Selezione lingua app
  └─ TASK-182 (km o miglia, ADR-0149): task file in main, riparte quando
     lo dice l'utente; poi TASK-210 parti successive

Possibilità di commentare i post · Blocco messaggi negativi · Logo sgrava
al salvataggio · Pulsante ricerca amici in feed · Cambio sport nella
schermata profilo · Logo e post Instagram
  └─ Libere (TASK-120, 213, 212, 215, 205 fatte)

Sistema pubblicitario non invasivo
  └─ Aspetta il «fatto» dell'utente su TASK-150 (pagamenti AdMob)

Aspettano l'utente
  ├─ Server e app: il server è su 0010; in main fino a 0013 (seguire,
  │  bici a mano nei preferiti, commenti), il motore della bici a mano
  │  (zone bici rifatte e `draw_examples`), la ricerca degli iscritti;
  │  l'app su `preview` è il gruppo `90bd8c06` (lingua, logo)
  ├─ TASK-209: le frasi italiane della voce (tabella in `UI.md`, «La voce
  │  della corsa»); es/fr/de «da confermare»
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
| `services/api/` (`drawings.py`, `profiles.py`, `strava_client.py`, la prossima migrazione), `shared-types`, i test | TASK-208 A |
| la voce e la corsa (`src/voice/`, `phrases.ts`, `navigator.ts`, `penUp.ts`, `freeRun.ts`, `runControl.ts`, `useNavigation.ts`, `useFreeRun.ts`, `RunDashboard.tsx`) | #259 TASK-209 |
| `src/route/`, `src/explore/`, `favoriteRoute.ts`, `SettingsPage.test.tsx` | #255 TASK-191 C (in pausa) |
| la mappa del percorso e la voce della bici a mano, dopo la #259 | TASK-206 C |
| `deploy/`, `docs/DEPLOY.md` | TASK-122 (in attesa dello Storage Box) |
| `docs/PUBBLICITA.md` | TASK-150 |
| `docs/STATUS.md`, `docs/DECISIONS.md`, `docs/UI.md` | tutti, ognuno solo le sue righe |
| `docs/AGENTI.md`, `CLAUDE.md` | coordinatore |

## Numeri

- Task: presi fino a **TASK-215**. Il prossimo libero è **TASK-216**.
- ADR: presi fino a **ADR-0178** (0169 TASK-191 C, 0170 TASK-208, 0171
  TASK-209, 0172 TASK-210, 0173 TASK-211, 0174 TASK-212, 0175 TASK-120,
  0176 TASK-213, 0177 TASK-214, 0178 TASK-215; 0149 di TASK-182). Il
  prossimo libero è **ADR-0179**.
- Migrazioni in `main`: 0001 account, 0002 preferiti, 0003 corse, 0004
  Strava, 0005 foto, 0006 penna alzata, 0007 profili, 0008 attività nei
  preferiti, 0009 corse pubblicate, 0010 canoa nei preferiti, 0011
  seguire, 0012 bici a mano nei preferiti, 0013 commenti. La prossima: il
  primo libero al merge (TASK-208 A).

## Il server e l'app

- **Server**: Hetzner CX33, `https://188-245-9-220.sslip.io`, da
  `deploy/compose.yaml` con PostgreSQL. A `main` `4b236f9` dal 2026-10-03
  10:00Z (migrazioni 0001–0010; immagine di prima
  `shaperoute-api:before-task205`, copia del database
  `shaperoute-2026-10-03T1000Z.dump`). Esempi disegnati per 66 città su
  66; zona bici di Trento. Strava spento (mancano le chiavi dell'utente).
  Il prossimo aggiornamento porta 0011–0013 e il motore di TASK-206
  (zone bici rifatte, ~0,3–1,1 GB l'una in memoria, Trento 3–4 minuti) e
  `draw_examples` (~40 minuti), con l'ok dell'utente.
- **App**: su `preview` da `main` `18fe25c` dal 2026-10-03 (gruppo
  `90bd8c06`: la lingua dell'app e il logo dopo «Save», con l'ok
  dell'utente). Prima `d49fce25` (10:39Z). In main ma non pubblicati: la
  ricerca degli iscritti nel Feed e i commenti (vogliono il server).
  **Non pubblicare `main` con «Paddle» pronto** (#255) finché l'acqua dei
  quattro luoghi non è sul server.

## Fatto in questa tornata (2026-10-01/02)

In `main`: #137 (TASK-136), #112 (088), #148 (140), #142 (142), #149 (147),
#141 (144), #147 (128), #151 (114), #152 (146), #153 (148), #155 (AGENTI),
#154 (149), #156 (151), #158 (115), #161 e #163 (task file di 067), #159
(task file 150/152/153), #130 (132), #162 (154), #160 (155), #157 (122),
#150 (137), #166 (158), #165 (157), #164 (156), #167 (122, copie), #140
(141), #169 (141), #170 (AGENTI), #168 (159), #171 (160), #172 (165), #173
(162), #174 (163, prima PR), #175 (161), #176 (164), e poi fino alla #214:
#177–#266, fra cui 166, 167, 168, 169, 170, 171, 172, 173, 174, 175, 176,
177, 178, 179, 180, 181, 186, 187 (API), 188, 189, 190 A, 192, 193, 194,
195, 196, 067, 190 (A, B, C), 191 A1 e A2, 197, 198, 199, 116, 201 (misurato, non conviene), 200,
202, 203, 187 (app), 204, 117 (A e B), 191 B, 205, 206 (A e B), 207,
210 A, 211 A, 212, 213, 215 e 120.
