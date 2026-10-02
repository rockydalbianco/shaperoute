# AGENTI — Chi fa cosa, e cosa viene dopo

> L'albero dei lavori degli agenti in parallelo. **Lo aggiorna solo il
> coordinatore** (la sessione «Coordinatore»); gli altri lo leggono.
> Dopo il clear di fine task, un agente trova qui la sua riga: il prossimo
> task, da cosa dipende e quali file non può toccare.

**Ultimo aggiornamento**: 2026-10-02, 13:00 · `main` = `fa6462b`

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

## La coda dei merge

```
#186  TASK-175  Zoom solo con le dita                        CI in corso
 —    TASK-172  «My activities» (API, Profile)               PR non aperta
 —    TASK-173  La musica nella corsa (Spotify)              PR non aperta
 —    TASK-174  La mappa sotto le schede di «Explore»        PR non aperta
 —    TASK-176  «Explore»: via i filtri, «Near me», più forme PR non aperta
 —    TASK-067  Lettere unite anche dalla cima               PR non aperta
 —    TASK-177  «Profile»: aspetto e «Settings»              dopo TASK-172
 —    TASK-178  La foto del profilo                          dopo TASK-177
 —    TASK-179  L'animazione all'avvio                       PR non aperta
```
Entra prima chi è pronto prima. Senza altre PR davanti, la sessione
proprietaria mergia da sola al 5/5 verde e CLEAN, e lo dice al coordinatore.

## L'albero

```
Agente di assistenza coordinamento («Assistente»)
  └─ Sempre  —         Guarda CI, server e sessioni; avvisa il coordinatore

Anteprima: zoom solo touch           └─ Adesso TASK-175 (#186)      ADR-0143
Preferiti percorsi e attività utente └─ Adesso TASK-172             ADR-0140, migrazione 0003
R Without Ruth app design            └─ Adesso TASK-173             ADR-0141 se serve
Mappa nella sezione Explore          └─ Adesso TASK-174             ADR-0142
Proposte di miglioramento grafico    └─ Adesso TASK-176             ADR-0144
Task completion                      └─ Adesso TASK-067             ADR-0063
Profilo: favoriti, attività e impostazioni
  ├─ Adesso  TASK-177  «Profile»: aspetto e «Settings»   ADR-0145, dopo TASK-172
  └─ Dopo    TASK-178  La foto del profilo               ADR-0146, migrazione 0004
Logo e animazione avvio app          └─ Adesso TASK-179             ADR-0147 (dipendenza
                                                                     da far approvare)
Sistema pubblicitario non invasivo   └─ Attesa TASK-150             profilo pagamenti
Velocità Explore con nuova città     └─ Server: esempi in anticipo e zone mancanti

Aspettano l'utente
  ├─ TASK-122 lo Storage Box (DEPLOY.md F.13)
  ├─ TASK-150 il profilo dei pagamenti AdMob
  ├─ Il metodo nuovo: una voce per task in un file nuovo (bozza in
  │  `out/voci-per-task-bozza.md`)
  └─ TASK-116 resta (nome, bio, «Edit profile»): ADR-0128, migrazione 0005

Da assegnare
  ├─ TASK-117 / 118 / 119 / 120 / 121: la parte social
  ├─ TASK-092 Percorsi consigliati (TASK-168 ha già il punto dove salvare)
  ├─ TASK-152 App Store · TASK-153 AdMob vero
  ├─ Il battito (sensore Bluetooth, Apple Watch): dipendenze e build propria
  ├─ Seguiti: il nome del file GPX (TASK-160); Berlino (TASK-163); il Feed
  │  d'esempio sul catalogo nuovo (TASK-161); UIScene con Xcode 27 (TASK-132)
  └─ Task file rimasti aperti ma già in main: TASK-055, 065, 076
```

## File occupati adesso

| File | Di chi |
|---|---|
| `src/map/mapPage.ts`, `src/favorites/FavoriteHeart.tsx` | TASK-175 (#186) |
| API `runs`, `/me/activities`, migrazione 0003, «My activities»; poi la fine della corsa | TASK-172 |
| `src/screens/RunDashboard.tsx` | TASK-173 |
| `src/explore/RouteCard.tsx` | TASK-174 |
| `src/explore/ExploreScreen.tsx`, `CityExamples.tsx` | TASK-174 e TASK-176 (cambi piccoli, chi viene dopo unisce) |
| `src/explore/RouteFilters.tsx` (da cancellare), `exampleRoutes.ts`, `prefetch_zones.py` (EXAMPLE_SHAPES) | TASK-176 |
| `words.py`, `letters*.json`, `optimizer.py` | TASK-067 |
| `src/profile/` (nuovo), poi `ProfileScreen.tsx`, `ProfileLayer.tsx` | TASK-177, dopo TASK-172 |
| `src/intro/` (nuovo), una riga di `App.tsx` | TASK-179 |
| `App.tsx` | TASK-172 e TASK-174 (modifiche in corso); poche righe per TASK-179 |
| `docs/STATUS.md`, `docs/DECISIONS.md`, `docs/UI.md` | tutti, ognuno solo le sue righe |
| `docs/AGENTI.md`, `CLAUDE.md` | coordinatore |

## Numeri

- Task: presi fino a **TASK-179**. Il prossimo libero è **TASK-180**.
- ADR: presi fino a **ADR-0147** (0128 tenuto per TASK-116). Il prossimo
  libero è **ADR-0148**.
- Migrazioni del database (le assegna il coordinatore): 0001 account,
  0002 preferiti (in main e sul server), **0003 TASK-172**, **0004
  TASK-178**, **0005 TASK-116**.

## Il server e l'app

- **Server**: Hetzner CX33, `https://188-245-9-220.sslip.io`, da
  `deploy/compose.yaml` con PostgreSQL. Aggiornato il 2026-10-02 alle
  10:38Z a `ec84042` (migrazione 0002, esempi tenuti di TASK-168, catalogo
  con 350 percorsi); immagine di prima `shaperoute-api:before-task171`.
  Rovereto costruita dall'estratto; `draw_examples` in corso. Le
  migrazioni 0003 e 0004 arriveranno con un altro aggiornamento, con l'ok
  dell'utente.
- **App**: ultima pubblicazione su `preview` da `fa6462b` (update
  `38f9a17b`, 2026-10-02 10:45Z): la corsa (TASK-169), i preferiti
  (TASK-171), gli esempi più veloci (TASK-168), niente Strava (TASK-170),
  «Explore» a schede (TASK-167).

## Fatto in questa tornata (2026-10-01/02)

In `main`: #137 (TASK-136), #112 (088), #148 (140), #142 (142), #149 (147),
#141 (144), #147 (128), #151 (114), #152 (146), #153 (148), #155 (AGENTI),
#154 (149), #156 (151), #158 (115), #161 e #163 (task file di 067), #159
(task file 150/152/153), #130 (132), #162 (154), #160 (155), #157 (122),
#150 (137), #166 (158), #165 (157), #164 (156), #167 (122, copie), #140
(141), #169 (141), #170 (AGENTI), #168 (159), #171 (160), #172 (165), #173
(162), #174 (163, prima PR), #175 (161), #176 (164).
