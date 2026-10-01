# AGENTI — Chi fa cosa, e cosa viene dopo

> L'albero dei lavori degli agenti in parallelo. **Lo aggiorna solo il
> coordinatore** (la sessione «Coordinatore»); gli altri lo leggono.
> Dopo il clear di fine task, un agente trova qui la sua riga: il prossimo
> task, da cosa dipende e quali file non può toccare.

**Ultimo aggiornamento**: 2026-10-02 · `main` = `56355f3`

## Come si usa

1. Trova la tua sessione qui sotto: **Adesso** è il task in corso,
   **Dopo** la coda, in ordine.
2. Un task della coda parte solo quando le sue **dipendenze** sono in `main`.
   Se non lo sono, avvisa il coordinatore e aspetta.
3. Il messaggio di partenza lo manda il coordinatore, completo (numero,
   ADR, file, confini). Se non arriva, chiedilo: non partire da solo.
4. Numeri di task e di ADR: solo dal coordinatore (`CLAUDE.md`).
5. **Worktree in `.claude/worktrees/TASK-XXX`**, sul Mac. I controlli JS in
   un worktree usano i `node_modules` del checkout principale.
6. **La coda dei merge è una sola e la tiene il coordinatore.** Nessuna
   sessione mergia fuori coda, nemmeno su richiesta dell'utente, senza
   dirlo prima al coordinatore: un merge fuori coda rimette in conflitto
   le PR che stanno facendo girare la CI. Quando la
   tua PR è pronta, scrivigli «#NNN pronta» e aspetta. Al tuo turno
   aggiorni il branch da `origin/main`, risolvi i conflitti tenendo
   entrambe le voci, rifai i test, fai push e scrivi «#NNN CI in corso».
7. **La CI non la aspetta nessuno da solo.** La guarda la sessione
   «Assistente», che avvisa il coordinatore quando una PR della coda è
   5/5 verde e MERGEABLE, o quando un job fallisce. Il «merge NNN» lo dà
   il coordinatore alla sessione proprietaria, che mergia la sua PR.
   Nessuna sessione mergia la PR di un'altra.

## La coda dei merge

```
1. #152  TASK-146  Il proprietario Expo in app.json              CI in corso
2. #153  TASK-148  Via il vecchio AskForRoute                    la porta il coordinatore
3.  —    TASK-122  L'API e il database sempre accesi             PR non aperta
4. #140  TASK-141  STATUS.md allineato (per ultima: lo rifà)     conflitto: STATUS.md
5.  —    TASK-149  Corsa libera, senza disegno                   PR non aperta
6.  —    TASK-115  App: iscriversi, entrare, uscire              PR non aperta
7. #130  TASK-132  Un annuncio prima del percorso                ferma (vedi sotto)
   #150  TASK-137  Le zone delle città, scaricate prima          in corso (Geofabrik)
```

## L'albero

```
Sistema di auto-miglioramento ricerca
  ├─ Adesso  TASK-122  L'API e il database sempre accesi, con lo      114 ✓ 144 ✓
  │                    spostamento del server su deploy/compose.yaml  ok dell'utente
  │                    (F.12)                                         per il server
  └─ Dopo    TASK-141  #140: rifà STATUS.md da capo, per ultima       dopo 122
                       fra le pronte (sposta anche TASK-128 in
                       «Completato»)

Task proceeding
  └─ Adesso  TASK-146  #152: owner Expo = lppl1316s-team              primo in coda

Prossimo task
  ├─ Fatto   TASK-148  #153: via il vecchio AskForRoute da            la mergia il
  │                    ExploreTools.tsx                               coordinatore
  └─ Adesso  TASK-115  App: iscriversi, entrare, uscire (ADR-0125     114 ✓; App.tsx e
                       se serve una scelta fuori da 0114/0115)        package.json col
                                                                      via del coord.

Corsa senza disegno
  └─ Adesso  TASK-149  Corsa libera, senza disegno                    App.tsx col via
                                                                      del coordinatore

Suggerimenti città in Explore
  ├─ Adesso  TASK-137  #150: le zone delle 14 città scaricate prima;  scelta dell'utente
  │                    l'utente ha scelto Geofabrik come fonte        (2026-10-02)
  └─ Forse   TASK-150  La fonte delle mappe, se diventa un task a     ADR-0124 tenuto
                       parte

Sistema pubblicitario non invasivo
  └─ Ferma   TASK-132  #130: un annuncio AdMob prima del percorso     licenza Xcode e
                                                                      runtime iOS;
                                                                      modulo nativo
                                                                      fuori da Expo Go

Task progression senza blocchi
  └─ Attesa  —         Giro del catalogo sul Mac (seguito di          Overpass non
                       TASK-128): Napoli, Verona, Padova, Genova,     risponde;
                       Bari, Palermo, New York, le frasi              chiederà un numero

Proposte di miglioramento grafico
  └─ Adesso  —         Inventario delle schermate e proposte          nessun numero;
                       grafiche con un prototipo: nessun file del     scelta di prodotto
                       repository toccato finora                      dell'utente

Agente di assistenza coordinamento («Assistente»)
  └─ Sempre  —         Guarda la CI e le postazioni, avvisa il
                       coordinatore; non mergia, non assegna numeri

Quanti task mancano
  └─ —       —         Nessun task

Da assegnare (servono l'ok dell'utente sul cosa)
  ├─ TASK-116 e seguenti della parte social: dopo TASK-115
  ├─ TASK-092 Percorsi consigliati: dopo 114 ✓ e 122
  ├─ eas update di fine coda (142, 145, 146, 148 nell'app): come e quando,
  │  lo chiede il coordinatore all'utente
  ├─ Quali altri contorni già disegnati mettere nella riga delle tessere
  │  (uccello, cane intero, albero, freccia, corona)
  ├─ Zone scaricate con un margine (proposta di TASK-143, dopo TASK-136)
  ├─ TASK-067 Lettere unite dall'alto, scala per lettera: senza task file,
  │  da rivedere (`PASSAGGIO.md`)
  └─ Task file rimasti «In corso» o «In revisione» ma già in `main`:
     TASK-055, TASK-065, TASK-076 (PR #93 mergiata). Li chiude la #140
```

## I task, uno per uno

| Task | Titolo | Chi | Stato | Dipende da | ADR |
|---|---|---|---|---|---|
| TASK-122 | L'API e il database sempre accesi | Sistema di auto-miglioramento ricerca | in corso | 114 ✓, 144 ✓ | 0123 |
| TASK-132 | Un annuncio prima del percorso | Sistema pubblicitario non invasivo | #130, ferma | prova nel simulatore | — |
| TASK-137 | Le zone delle città, scaricate prima | Suggerimenti città in Explore | #150, in corso (Geofabrik) | — | 0119 |
| TASK-150 | La fonte delle mappe (tenuto, se serve) | Suggerimenti città in Explore | tenuto | 137 | 0124 |
| TASK-141 | STATUS.md allineato allo stato vero | Sistema di auto-miglioramento ricerca | #140, in coda | ultima fra le pronte | — |
| TASK-146 | Il proprietario Expo in `app.json` | Task proceeding | #152, CI in corso | — | — |
| TASK-148 | Via il vecchio AskForRoute | Prossimo task | #153, in coda | #152 | — |
| TASK-149 | Corsa libera, senza disegno | Corsa senza disegno | in corso | — | 0122 |
| TASK-115 | App: iscriversi, entrare, uscire | Prossimo task | in corso | 114 ✓ | 0125 (se serve) |

Perché quest'ordine:

- **#152 prima di #130**: tutte e due toccano `apps/mobile/app.json`.
- **#152 prima di TASK-122**: tutte e due toccano `docs/DEPLOY.md`.
- **TASK-122 prima di #130**: tutte e due toccano `.env.example`.
- **TASK-149, TASK-115 e #130** toccano `apps/mobile/App.tsx`: entra
  prima TASK-149, poi TASK-115; la #130 unisce da `main` al suo turno.
- **#140 per ultima fra le pronte**: riscrive `docs/STATUS.md`, quindi deve
  vedere tutte le voci già entrate.
- **Il server si sposta una volta sola**, in TASK-122, con il database
  dentro, invece di spostarlo prima senza e poi rifarlo.

## File occupati adesso

| File | Di chi |
|---|---|
| `apps/mobile/app.json`, `docs/DEPLOY.md` | TASK-146 (#152); poi `app.json` a TASK-132, `DEPLOY.md` a TASK-122 |
| `apps/mobile/src/explore/ExploreTools.tsx`, `ExploreTools.test.tsx` | TASK-148 (#153) |
| `deploy/`, `docs/DEPLOY.md` (dopo #152), `.env.example` | TASK-122 |
| `apps/mobile/App.tsx` (col via del coordinatore), `src/screens/ChooseScreen.tsx`, `src/screens/FreeRunScreen*`, `src/navigation/freeRun*`, `src/navigation/useFreeRun*`, `__tests__/AppFreeRun.test.tsx` | TASK-149 |
| `apps/mobile/App.tsx` e `package.json` (solo l'aggancio e la riga di `expo-secure-store`, col via del coordinatore), file nuovi in `src/` | TASK-115 |
| `apps/mobile/App.tsx`, `app.json`, `eas.json`, `package.json`, `src/ads/`, `package-lock.json`, `.env.example` | TASK-132 (#130), dopo chi li ha prima in coda |
| `services/api/shaperoute_api/prefetch_zones.py`, `tests/test_prefetch_zones.py`, `docs/MAPS.md` | TASK-137 (#150) |
| `docs/STATUS.md` (intero) | TASK-141 (#140), al suo turno |
| `docs/STATUS.md`, `docs/DECISIONS.md`, `samples/LOG.md` | tutti, ognuno solo le sue righe |
| `docs/AGENTI.md`, `CLAUDE.md` | coordinatore |

## Numeri

- Task: presi fino a **TASK-150** (150 tenuto per «Suggerimenti città in
  Explore», se la fonte delle mappe diventa un task a parte). Il prossimo
  libero è **TASK-151**.
- ADR: presi fino a **ADR-0125** (0122 di TASK-149, 0123 di TASK-122, 0124
  tenuto con TASK-150, 0125 tenuto con TASK-115). Il prossimo libero è
  **ADR-0126**.

## Il server

- Hetzner CX33, `https://188-245-9-220.sslip.io` via Caddy: è l'API che
  l'app usa. Il container `shaperoute` gira a `51701a5`; l'immagine di
  prima è salvata come `shaperoute-api:before-task147`.
- Sul server non si tocca niente senza il via del coordinatore, che lo
  chiede all'utente.
- Overpass non risponde all'indirizzo del server da circa le 22:35Z del
  2026-10-01, e dal Mac solo a volte (`MAPS.md`).

## Fatto in questa tornata (2026-10-01/02)

Entrate in `main` nella notte: #137 (TASK-136), #112 (TASK-088), #148
(TASK-140), #142 (TASK-142), #149 (TASK-147), #141 (TASK-144), #147
(TASK-128), #151 (TASK-114). Prima, il 2026-10-01: TASK-110, 138, 139,
143, 145.

Dopo un merge che aggiunge pacchetti all'app: `npm install` dalla radice
del checkout principale.
