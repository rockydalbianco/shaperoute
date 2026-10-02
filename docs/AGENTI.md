# AGENTI — Chi fa cosa, e cosa viene dopo

> L'albero dei lavori degli agenti in parallelo. **Lo aggiorna solo il
> coordinatore** (la sessione «Coordinatore»); gli altri lo leggono.
> Dopo il clear di fine task, un agente trova qui la sua riga: il prossimo
> task, da cosa dipende e quali file non può toccare.

**Ultimo aggiornamento**: 2026-10-02, 21:00 · `main` = `59dd8a7`

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
7. **La CI non la aspetta nessuno da solo.** La guarda la sessione
   «Agente di assistenza coordinamento», che avvisa il coordinatore quando
   una PR è 5/5 verde e MERGEABLE, o quando un job fallisce. Il «merge NNN»
   lo dà il coordinatore alla sessione proprietaria, che mergia la sua PR.
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

Vuota alle 21:00. Entra prima chi è pronto prima; la sessione proprietaria
mergia da sola al 5/5 verde e CLEAN, ricontrollato subito prima.

## L'albero

```
Agente di assistenza coordinamento («Assistente»)
  └─ Sempre  —         CI, `/health`, staffette fra sessioni

Coordinamento automatico (aperta dall'utente)
  ├─ Adesso  TASK-197  «Penna alzata» nel motore e nell'API     ADR-0157
  ├─ Dopo    TASK-190 B  La bici nell'API (zone dall'estratto)  ADR-0153
  ├─ Dopo    TASK-191 A2 La canoa nei file comuni del motore    ADR-0154
  └─ Dopo    TASK-198  «Penna alzata» nell'app, dopo 197
  (ordine sui file comuni del motore: 197 → 190 B → 191 A2)

Logo e post Instagram · Proposte di miglioramento grafico
Profilo: favoriti, attività e impostazioni
  └─ Libere; «Profilo» ha in fila, «più avanti» per l'utente:
     TASK-183 (email e telefono), TASK-182 (km o miglia)

Aspettano l'utente
  ├─ Server: Strava (migrazione 0004) e foto (0005), da fdb34ea, prima
  │  della bici, così gli esempi restano validi
  ├─ L'interruttore «Lift the pen between letters» acceso o spento (TASK-198)
  ├─ TASK-122 lo Storage Box · TASK-150 i pagamenti AdMob
  ├─ TASK-187 l'app Strava e le chiavi (parte API in main; parte app da fare)
  ├─ Il metodo nuovo «una voce per task» (`out/voci-per-task-bozza.md`)
  └─ TASK-173 seconda parte (Spotify dentro l'app), TASK-184, TASK-185,
     e a cosa serve il telefono (TASK-183)

Da assegnare
  ├─ TASK-116 nome, bio, «Edit profile» (ADR-0128) e la parte social
  │  117–121; TASK-092; TASK-152 App Store; TASK-153 AdMob vero
  ├─ TASK-187, la parte app («Send to Strava» a fine corsa)
  └─ Seguiti: il passo `draw_examples` in `DEPLOY.md` F.12 (TASK-122);
     cuore e «Start» sulla scheda del Feed (domanda in TASK-188); dividere
     `AppFavorites.test.tsx` (TASK-193)
```

## File occupati adesso

| File | Di chi |
|---|---|
| `route_engine/`: parole (`words.py`, `letters*.json`), `models.py`, `__main__.py`, `schemas.py`, `shared-types` | TASK-197, poi TASK-190 B, poi TASK-191 A2 |
| `route_engine/water.py` (nuovo) e i suoi test | TASK-191 A1 |
| `deploy/`, `docs/DEPLOY.md` | TASK-122 (in attesa dello Storage Box) |
| `docs/PUBBLICITA.md` | TASK-150 |
| `docs/STATUS.md`, `docs/DECISIONS.md`, `docs/UI.md` | tutti, ognuno solo le sue righe |
| `docs/AGENTI.md`, `CLAUDE.md` | coordinatore |

## Numeri

- Task: presi fino a **TASK-198**. Il prossimo libero è **TASK-199**.
- ADR: presi fino a **ADR-0157**. Il prossimo libero è **ADR-0158**.
- Migrazioni in `main`: 0001 account, 0002 preferiti, 0003 corse, 0004
  Strava, 0005 foto. La prossima: il primo libero al merge.

## Il server e l'app

- **Server**: Hetzner CX33, `https://188-245-9-220.sslip.io`, da
  `deploy/compose.yaml` con PostgreSQL. A `main` `fa6ee9e` dal 2026-10-02
  18:09Z (migrazioni 0001–0003; immagine di prima
  `shaperoute-api:before-task176`). Esempi disegnati per 64 città, Venezia
  e Berlino comprese. Mancano 0004 e 0005: un aggiornamento solo
  dell'API, da `fdb34ea`, con l'ok dell'utente.
- **App**: ultima pubblicazione su `preview` da `fa6ee9e` (update
  `85fbf31e`, 2026-10-02 18:07Z). In `main` ma non pubblicata: la foto del
  profilo (TASK-178, vuole il server), e la bici nel solo motore.

## Fatto in questa tornata (2026-10-01/02)

In `main`: #137 (TASK-136), #112 (088), #148 (140), #142 (142), #149 (147),
#141 (144), #147 (128), #151 (114), #152 (146), #153 (148), #155 (AGENTI),
#154 (149), #156 (151), #158 (115), #161 e #163 (task file di 067), #159
(task file 150/152/153), #130 (132), #162 (154), #160 (155), #157 (122),
#150 (137), #166 (158), #165 (157), #164 (156), #167 (122, copie), #140
(141), #169 (141), #170 (AGENTI), #168 (159), #171 (160), #172 (165), #173
(162), #174 (163, prima PR), #175 (161), #176 (164), e poi fino alla #214:
#177–#214, fra cui 166, 167, 168, 169, 170, 171, 172, 173, 174, 175, 176,
177, 178, 179, 180, 181, 186, 187 (API), 188, 189, 190 A, 192, 193, 194,
195, 196 e 067.
