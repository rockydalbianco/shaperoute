# AGENTI — Chi fa cosa, e cosa viene dopo

> L'albero dei lavori degli agenti in parallelo. **Lo aggiorna solo il
> coordinatore** (la sessione «Coordinatore»); gli altri lo leggono.
> Dopo il clear di fine task, un agente trova qui la sua riga: il prossimo
> task, da cosa dipende e quali file non può toccare.

**Ultimo aggiornamento**: 2026-10-02, 11:30 · `main` = `73095e7`

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
—   TASK-163  Le città in evidenza già disegnate (seconda PR,     PR non aperta
              solo catalogo)
—   TASK-166  L'annuncio durante l'attesa, l'App ID vero          PR non aperta
—   TASK-167  «Explore» a schede                                  PR non aperta
```
Entra prima chi è pronto prima. Senza altre PR davanti, la sessione
proprietaria mergia da sola al 5/5 verde e CLEAN, e lo dice al coordinatore.

## L'albero

```
Agente di assistenza coordinamento («Assistente»)
  └─ Sempre  —         Guarda CI, server e sessioni; avvisa il coordinatore

Explore: città consigliate e contenuti in caricamento
  └─ Adesso  TASK-163  Seconda PR: cuore, cerchio e stella da 5 km nel    ADR-0132; poi il
                       catalogo per le città in evidenza che non li       catalogo sul server
                       hanno (`seed_catalog.py`, zone dal server)         (ok dell'utente)

Sistema pubblicitario non invasivo
  ├─ Adesso  TASK-166  L'annuncio durante l'attesa dopo «Draw route»,     ADR-0102 (agg.)
  │                    l'App ID vero di AdMob in `app.json`
  └─ Attesa  TASK-150  Conto AdMob e pagamento                            profilo pagamenti
                                                                          dell'utente

Proposte di miglioramento grafico
  └─ Adesso  TASK-167  «Explore» a schede: griglia a due colonne e        ADR-0135
                       filtri in una riga

Sistema di auto-miglioramento ricerca
  └─ Attesa  TASK-122  Manca solo lo Storage Box (DEPLOY.md F.13)         lo compra l'utente

Task progression senza blocchi
  └─ Attesa  —         Seguito di TASK-161: forme a 21 km di Bari,        Overpass
                       Palermo, New York

Logo e post Instagram · Redesign Run Without Ruth · Quanti task mancano
  └─ Libere

Sessioni nuove, da avviare dall'utente con un clic
  ├─ TASK-067  Lettere unite anche dalla cima (ADR-0063)
  └─ TASK-116  Il profilo: nome, foto, due righe (ADR-0128)

Da assegnare
  ├─ TASK-117 / 118 / 119 / 120 / 121: la parte social, dopo TASK-116
  ├─ TASK-092 Percorsi consigliati, dopo TASK-122
  ├─ TASK-152 App Store (domande all'utente) · TASK-153 AdMob vero
  ├─ Seguiti senza numero: «Pause», «Stop» da tenere premuto e la voce a
  │  ogni km con un percorso (TASK-164); il nome del file GPX ancora
  │  «shaperoute-…» (TASK-160); la scelta A·B·C come segnale (TASK-151);
  │  il Feed d'esempio rigenerato sul catalogo nuovo, da decidere con
  │  l'utente (TASK-161); UIScene con Xcode 27 (TASK-132)
  └─ Task file rimasti aperti ma già in main: TASK-055, 065, 076
```

## File occupati adesso

| File | Di chi |
|---|---|
| `catalog/seed/`, `catalog/README.md` | TASK-163 (seconda PR) |
| `apps/mobile/app.json`, `src/ads/`, poche righe di `App.tsx` | TASK-166 |
| `src/explore/ExploreScreen.tsx`, `CityExamples.tsx`, `RouteCard.tsx`, `RouteFilters.tsx` e i loro test | TASK-167 |
| `deploy/`, `docs/DEPLOY.md` | TASK-122 |
| `docs/PUBBLICITA.md` | TASK-150 |
| `docs/STATUS.md`, `docs/DECISIONS.md`, `docs/UI.md` | tutti, ognuno solo le sue righe |
| `docs/AGENTI.md`, `CLAUDE.md` | coordinatore |

## Numeri

- Task: presi fino a **TASK-167**. Il prossimo libero è **TASK-168**.
- ADR: presi fino a **ADR-0135** (0128 tenuto per TASK-116). Il prossimo
  libero è **ADR-0136**.

## Il server e l'app

- **Server**: Hetzner CX33, `https://188-245-9-220.sslip.io`. Dal
  2026-10-02 07:27Z gira da `deploy/compose.yaml` con PostgreSQL e la copia
  notturna (TASK-122); immagine di prima `shaperoute-api:before-task122`.
  Cache delle zone in `/root/shaperoute/data/cache` (52 città italiane e 10
  estere, TASK-137); `/srv/shaperoute/extracts` va lasciato. Overpass non
  risponde a questo indirizzo dal 2026-10-01 22:35Z: le zone nuove vengono
  da Geofabrik (`prefetch_zones`, osmium-tool approvato dall'utente).
- **App**: ultima pubblicazione su `preview` da `73095e7` (update
  `eba74321`, 2026-10-02 11:26): tutto `main`, fino alla schermata della
  corsa (TASK-164). Icona, nome e schermata di avvio nuovi si vedono solo
  in una build propria. Le città nuove del catalogo (TASK-161) arrivano
  nell'app quando si aggiorna il catalogo sul server. Da provare
  sull'iPhone: la lista è in `STATUS.md`.

## Fatto in questa tornata (2026-10-01/02)

In `main`: #137 (TASK-136), #112 (088), #148 (140), #142 (142), #149 (147),
#141 (144), #147 (128), #151 (114), #152 (146), #153 (148), #155 (AGENTI),
#154 (149), #156 (151), #158 (115), #161 e #163 (task file di 067), #159
(task file 150/152/153), #130 (132), #162 (154), #160 (155), #157 (122),
#150 (137), #166 (158), #165 (157), #164 (156), #167 (122, copie), #140
(141), #169 (141), #170 (AGENTI), #168 (159), #171 (160), #172 (165), #173
(162), #174 (163, prima PR), #175 (161), #176 (164).
