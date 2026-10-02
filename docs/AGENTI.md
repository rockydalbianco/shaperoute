# AGENTI — Chi fa cosa, e cosa viene dopo

> L'albero dei lavori degli agenti in parallelo. **Lo aggiorna solo il
> coordinatore** (la sessione «Coordinatore»); gli altri lo leggono.
> Dopo il clear di fine task, un agente trova qui la sua riga: il prossimo
> task, da cosa dipende e quali file non può toccare.

**Ultimo aggiornamento**: 2026-10-02, 23:55 · `main` = `49069f0`

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

Vuota alle 23:55 (dopo la #222 sono entrate la #223, la #224 e la #225). Entra prima chi è pronto prima; la sessione proprietaria
mergia da sola al 5/5 verde e CLEAN, ricontrollato subito prima.

## L'albero

```
Coordinamento automatico (aperta dall'utente)
  ├─ Adesso  TASK-200  `activity` nei preferiti, le pause nel
  │                    dettaglio di una corsa                ADR-0160
  └─ Dopo    TASK-202  «Lift the pen between letters» acceso di default
                       (scelta dell'utente), dopo TASK-200: `App.tsx`

Attività iniziata in corso (aperta dall'utente)
  └─ Adesso  TASK-187 app  «Send to Strava» a fine corsa      ADR-0156

Attività rimanenti (aperta dall'utente)
  ├─ Adesso  TASK-117 A  Pubblicare una corsa salvata: l'API  ADR-0159
  │                      (entra dopo TASK-200: `app.py`, `schemas.py`,
  │                      `shared-types`, migrazioni)
  └─ Dopo    TASK-117 B  L'app, dopo TASK-187 app e TASK-200

Inizio task e Lava (aperta dall'utente)
  └─ Adesso  TASK-191 A2 La canoa nel motore: prima le domande
                         all'utente (distanze, bagnanti)      ADR-0154 (+0161)

Logo e post Instagram
  └─ Libera; porta all'utente le domande di TASK-198 (voce, riga dei km)

Sistema pubblicitario non invasivo
  └─ Aspetta il «fatto» dell'utente su TASK-150 (pagamenti AdMob)

Aspettano l'utente
  ├─ Server e app: aggiornare il server a `main` (migrazioni 0004 Strava,
  │  0005 foto, il motore nuovo), poi `draw_examples`, poi pubblicare l'app
  ├─ I testi della voce e la riga dei km (TASK-198; l'interruttore è
  │  deciso: acceso, TASK-202)
  ├─ TASK-116: da dove si apre il profilo di un altro; «drawings» conta
  │  anche le corse private; i testi nuovi del profilo
  ├─ TASK-117: pubblicare anche una corsa senza percorso; il punteggio
  │  visibile agli altri
  ├─ TASK-190: le due domande della parte C (Explore e Feed con «Bike»,
  │  ritmo o km/h nella corsa), «Start» in bici che apre la navigazione
  │  della corsa, l'avviso dello sterrato, «km walking» in bici, i testi
  │  «Ride without a route» e «At most 8 letters.», la zona bici di Trento
  ├─ TASK-198/199: «Paused» nella pausa «penna», la riga dei km anche su
  │  un preferito riaperto; gli `insights` senza l'attività
  ├─ TASK-122 lo Storage Box · TASK-150 i pagamenti AdMob
  ├─ TASK-187 l'app Strava e le chiavi (la parte app è in corso)
  ├─ Il metodo nuovo «una voce per task» (`out/voci-per-task-bozza.md`)
  └─ TASK-173 seconda parte (Spotify dentro l'app), TASK-184, TASK-185,
     e a cosa serve il telefono (TASK-183)

Da assegnare
  ├─ La parte social 118–121 (il feed vero dopo TASK-117); TASK-092;
  │  TASK-152 App Store; TASK-153 AdMob vero
  ├─ Il tempo del piano della partenza (`optimizer.py`, seguito di
  │  TASK-201: il pool di processi non conviene)
  └─ Seguiti: il passo `draw_examples` in `DEPLOY.md` F.12 (TASK-122);
     cuore e «Start» sulla scheda del Feed (domanda in TASK-188); dividere
     `AppFavorites.test.tsx` (TASK-193)
```

## File occupati adesso

| File | Di chi |
|---|---|
| preferiti e corse (API e app), `app.py`, `schemas.py`, `shared-types`, la prossima migrazione, come dice `docs/tasks/TASK-200.md` | TASK-200 (prima di TASK-117 A) |
| `drawings.py` (nuovo), `profiles.py`, poi `app.py`, `schemas.py`, `shared-types` dopo TASK-200, come dice `docs/tasks/TASK-117.md` | TASK-117 A |
| `src/strava/`, `src/api/strava.ts`, `src/activities/RunEnd.tsx`, `outbox.ts`, la scheda della corsa in «My activities» | TASK-187 app (prima di TASK-117 B) |
| `route_engine/models.py`, `__main__.py`, `validation.py`, i file dell'acqua, `samples/LOG.md` | TASK-191 A2 |
| `App.tsx` (lo stato iniziale della penna alzata) | TASK-202, dopo TASK-200 |
| `deploy/`, `docs/DEPLOY.md` | TASK-122 (in attesa dello Storage Box) |
| `docs/PUBBLICITA.md` | TASK-150 |
| `docs/STATUS.md`, `docs/DECISIONS.md`, `docs/UI.md` | tutti, ognuno solo le sue righe |
| `docs/AGENTI.md`, `CLAUDE.md` | coordinatore |

## Numeri

- Task: presi fino a **TASK-202**. Il prossimo libero è **TASK-203**.
- ADR: presi fino a **ADR-0161** (0158 di TASK-199; 0159 di TASK-117;
  0160 di TASK-200 e 0161 di TASK-191 A2, se servono). Il prossimo libero
  è **ADR-0162**.
- Migrazioni in `main`: 0001 account, 0002 preferiti, 0003 corse, 0004
  Strava, 0005 foto, 0006 penna alzata, 0007 profili. La prossima: il
  primo libero al merge (TASK-200, poi TASK-117 A).

## Il server e l'app

- **Server**: Hetzner CX33, `https://188-245-9-220.sslip.io`, da
  `deploy/compose.yaml` con PostgreSQL. A `main` `fa6ee9e` dal 2026-10-02
  18:09Z (migrazioni 0001–0003; immagine di prima
  `shaperoute-api:before-task176`). Esempi disegnati per 64 città, Venezia
  e Berlino comprese. Mancano 0004–0007 e il motore di TASK-190, 191 A1
  e 197: aggiornare a `main` vuol dire rilanciare `draw_examples` (regola
  11) e, per la bici, costruire almeno la zona bici di Trento. Con l'ok
  dell'utente.
- **App**: ultima pubblicazione su `preview` da `fa6ee9e` (update
  `85fbf31e`, 2026-10-02 18:07Z). In `main` ma non pubblicata: la foto del
  profilo (TASK-178), «Edit profile» (TASK-116), la penna alzata
  (TASK-198, 199) e la bici (TASK-190 C): vogliono tutte il server
  aggiornato prima.

## Fatto in questa tornata (2026-10-01/02)

In `main`: #137 (TASK-136), #112 (088), #148 (140), #142 (142), #149 (147),
#141 (144), #147 (128), #151 (114), #152 (146), #153 (148), #155 (AGENTI),
#154 (149), #156 (151), #158 (115), #161 e #163 (task file di 067), #159
(task file 150/152/153), #130 (132), #162 (154), #160 (155), #157 (122),
#150 (137), #166 (158), #165 (157), #164 (156), #167 (122, copie), #140
(141), #169 (141), #170 (AGENTI), #168 (159), #171 (160), #172 (165), #173
(162), #174 (163, prima PR), #175 (161), #176 (164), e poi fino alla #214:
#177–#225, fra cui 166, 167, 168, 169, 170, 171, 172, 173, 174, 175, 176,
177, 178, 179, 180, 181, 186, 187 (API), 188, 189, 190 A, 192, 193, 194,
195, 196, 067, 190 (A, B, C), 191 A1, 197, 198, 199, 116 e 201 (misurato, non conviene).
