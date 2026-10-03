# AGENTI — Chi fa cosa, e cosa viene dopo

> L'albero dei lavori degli agenti in parallelo. **Lo aggiorna solo il
> coordinatore** (la sessione «Coordinatore»); gli altri lo leggono.
> Dopo il clear di fine task, un agente trova qui la sua riga: il prossimo
> task, da cosa dipende e quali file non può toccare.

**Ultimo aggiornamento**: 2026-10-03, 11:55 · `main` = `44ff069`

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

Vuota alle 11:55 del 2026-10-03 (dalla #226 alla #244 tutte entrate). Entra prima chi è pronto prima; la sessione proprietaria
mergia da sola al 5/5 verde e CLEAN, ricontrollato subito prima.

## L'albero

```
Task bici e padel (aperta dall'utente)
  └─ Adesso  TASK-190 campioni  I campioni della bici da far giudicare
                                (5 di Trento fatti; Levico, Padova e il
                                cerchio da 20 km aspettano Overpass, che
                                rifiuta il Mac dalle 09:15Z); poi le due
                                domande della parte C all'utente

Inizio task e Lava · Nuova tasca · Cambio sport nella schermata profilo ·
Coordinamento automatico · Attività iniziata in corso · Attività
rimanenti · Grafica registrazione corsa · Logo e post Instagram
  └─ Libere (TASK-191 A2 e B, 117 A e B, 205, 200, 202, 203, 187 app,
     204 fatte)

Sistema pubblicitario non invasivo
  └─ Aspetta il «fatto» dell'utente su TASK-150 (pagamenti AdMob)

Aspettano l'utente
  ├─ Server e app: un solo aggiornamento del server a `main` (migrazioni
  │  0004–0010, il motore di TASK-190, 191, 197 e 203), poi
  │  `draw_examples`, la zona bici di Trento, e la pubblicazione dell'app
  │  su `preview` (oggi c'è anche il ramo di prova `task-204-test`,
  │  gruppo 37bde818, pubblicato con l'ok dell'utente)
  ├─ I testi della voce e la riga dei km (TASK-198)
  ├─ TASK-116: da dove si apre il profilo di un altro; «drawings» conta
  │  anche le corse private; i testi nuovi del profilo
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
  ├─ TASK-191 C (l'app della canoa), dopo le risposte dell'utente
  ├─ La parte social 118–121 (il feed vero dopo TASK-117); TASK-092;
  │  TASK-152 App Store; TASK-153 AdMob vero
  ├─ Le altre idee (A) di TASK-203 non provate (`tasks/TASK-203.md`)
  └─ Seguiti: il passo `draw_examples` in `DEPLOY.md` F.12 (TASK-122);
     cuore e «Start» sulla scheda del Feed (domanda in TASK-188); gli
     stessi percorsi Mac/server fra versioni di NetworkX/NumPy (TASK-203)
```

## File occupati adesso

| File | Di chi |
|---|---|
| `samples/TASK-190_*.gpx`, righe in fondo a `samples/LOG.md`, `docs/tasks/TASK-190.md` | TASK-190 campioni |
| `deploy/`, `docs/DEPLOY.md` | TASK-122 (in attesa dello Storage Box) |
| `docs/PUBBLICITA.md` | TASK-150 |
| `docs/STATUS.md`, `docs/DECISIONS.md`, `docs/UI.md` | tutti, ognuno solo le sue righe |
| `docs/AGENTI.md`, `CLAUDE.md` | coordinatore |

## Numeri

- Task: presi fino a **TASK-205**. Il prossimo libero è **TASK-206**.
- ADR: presi fino a **ADR-0166** (0164 di TASK-191 B, 0165 di TASK-205,
  0166 di TASK-117 B). Il prossimo libero è **ADR-0167**.
- Migrazioni in `main`: 0001 account, 0002 preferiti, 0003 corse, 0004
  Strava, 0005 foto, 0006 penna alzata, 0007 profili, 0008 attività nei
  preferiti, 0009 corse pubblicate, 0010 canoa nei preferiti. La
  prossima: il primo libero al merge.

## Il server e l'app

- **Server**: Hetzner CX33, `https://188-245-9-220.sslip.io`, da
  `deploy/compose.yaml` con PostgreSQL. A `main` `fa6ee9e` dal 2026-10-02
  18:09Z (migrazioni 0001–0003; immagine di prima
  `shaperoute-api:before-task176`). Esempi disegnati per 64 città, Venezia
  e Berlino comprese. Mancano 0004–0010 e il motore di TASK-190, 191 A1
  e A2, 197 e 203: aggiornare a `main` vuol dire rilanciare `draw_examples` (regola
  11) e, per la bici, costruire almeno la zona bici di Trento. Con l'ok
  dell'utente.
- **App**: ultima pubblicazione su `preview` da `fa6ee9e` (update
  `85fbf31e`, 2026-10-02 18:07Z). Il 2026-10-03, con l'ok dell'utente, `main`
  c16e9c1 è su un ramo EAS di prova, `task-204-test` (gruppo 37bde818), per
  la grafica della corsa: contro il server vecchio le parole con la penna
  alzata, la foto, «Edit profile», la bici, Strava e la pubblicazione delle
  corse non vanno. In `main` ma non su `preview`: tutto questo, che vuole il
  server aggiornato prima.

## Fatto in questa tornata (2026-10-01/02)

In `main`: #137 (TASK-136), #112 (088), #148 (140), #142 (142), #149 (147),
#141 (144), #147 (128), #151 (114), #152 (146), #153 (148), #155 (AGENTI),
#154 (149), #156 (151), #158 (115), #161 e #163 (task file di 067), #159
(task file 150/152/153), #130 (132), #162 (154), #160 (155), #157 (122),
#150 (137), #166 (158), #165 (157), #164 (156), #167 (122, copie), #140
(141), #169 (141), #170 (AGENTI), #168 (159), #171 (160), #172 (165), #173
(162), #174 (163, prima PR), #175 (161), #176 (164), e poi fino alla #214:
#177–#244, fra cui 166, 167, 168, 169, 170, 171, 172, 173, 174, 175, 176,
177, 178, 179, 180, 181, 186, 187 (API), 188, 189, 190 A, 192, 193, 194,
195, 196, 067, 190 (A, B, C), 191 A1 e A2, 197, 198, 199, 116, 201 (misurato, non conviene), 200,
202, 203, 187 (app), 204, 117 (A e B), 191 B e 205.
