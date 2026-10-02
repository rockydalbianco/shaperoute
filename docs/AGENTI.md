# AGENTI — Chi fa cosa, e cosa viene dopo

> L'albero dei lavori degli agenti in parallelo. **Lo aggiorna solo il
> coordinatore** (la sessione «Coordinatore»); gli altri lo leggono.
> Dopo il clear di fine task, un agente trova qui la sua riga: il prossimo
> task, da cosa dipende e quali file non può toccare.

**Ultimo aggiornamento**: 2026-10-02, mattina · `main` = `a844084`

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
1. #168  TASK-159  Icona e nome «Sgrava»                         si aggiorna dopo la #140
2.  —    TASK-160  Il nome «Sgrava» nei testi dell'app          parte dopo la #168
3.  —    TASK-161  Città e frasi nuove del catalogo              PR non aperta
```

## L'albero

```
Agente di assistenza coordinamento («Assistente»)
  └─ Sempre  —         Guarda CI, server e sessioni; avvisa il coordinatore;
                       non mergia e non assegna numeri

Logo e post Instagram
  └─ Adesso  TASK-159  #168: icona dal logo nuovo e nome «Sgrava»     ADR-0129
                       sotto l'icona (in Expo Go l'icona non si vede)

Proposte di miglioramento grafico
  └─ Dopo    TASK-160  «Location is off for Sgrava…» nei tre testi    dopo la #168
                       (App.tsx, NavigateScreen, FreeRunScreen)

Task progression senza blocchi
  └─ Adesso  TASK-161  Napoli, Verona, Padova, Genova, Bari, Palermo, ADR-0097 (agg.);
                       New York nel catalogo, con le frasi            ADR-0130 se l'utente
                                                                      sceglie le frasi
                                                                      fino a 4 lettere

Sistema di auto-miglioramento ricerca
  └─ Attesa  TASK-122  Server su compose col database: fatto          lo Storage Box lo
                       (2026-10-02 07:27Z). Manca la copia fuori      compra l'utente
                       dal server: Storage Box (DEPLOY.md F.13)       (F.13)

Sistema pubblicitario non invasivo
  └─ Attesa  TASK-150  Conto AdMob e pagamento (docs/PUBBLICITA.md)   scelte dell'utente
                                                                      e del commercialista

Sessioni nuove, da avviare dall'utente con un clic
  ├─ TASK-067  Lettere unite anche dalla cima (scala per lettera fuori,
  │            ADR-0063)
  └─ TASK-116  Il profilo: nome, foto, due righe (ADR-0128)

Quanti task mancano
  └─ —       —         Libera

Da assegnare
  ├─ TASK-117 / 118 / 119 / 120 / 121: la parte social, dopo TASK-116
  ├─ TASK-092 Percorsi consigliati: 114 ✓, 122 quasi
  ├─ TASK-152 L'app sull'App Store: cinque domande all'utente nel task file
  ├─ TASK-153 AdMob vero: dopo 150 e 152
  ├─ Seguiti senza numero: la scelta A·B·C degli esempi di Explore come
  │  segnale (TASK-151); lo splash con il logo (scelta dell'utente,
  │  TASK-159); UIScene con Xcode 27 (TASK-132); Berlino resta a Overpass
  │  (TASK-137)
  └─ Task file rimasti aperti ma già in main: TASK-055, 065, 076
```

## File occupati adesso

| File | Di chi |
|---|---|
| `apps/mobile/assets/*`, `apps/mobile/app.json`, `docs/brand/` | TASK-159 (#168) |
| `apps/mobile/App.tsx` (solo il testo), `src/screens/NavigateScreen.tsx`, `src/screens/FreeRunScreen.tsx` e i loro test | TASK-160, dopo la #168 |
| `catalog/seed/`, `catalog/README.md`, `tools/seed_catalog.py` e test, `samples/LOG.md` | TASK-161 |
| `deploy/`, `docs/DEPLOY.md` | TASK-122 |
| `docs/PUBBLICITA.md` | TASK-150 |
| `docs/STATUS.md`, `docs/DECISIONS.md`, `docs/UI.md` | tutti, ognuno solo le sue righe |
| `docs/AGENTI.md`, `CLAUDE.md` | coordinatore |

## Numeri

- Task: presi fino a **TASK-161**. Il prossimo libero è **TASK-162**.
- ADR: presi fino a **ADR-0130** (0128 tenuto per TASK-116, 0130 per le
  frasi di TASK-161 se l'utente sceglie). Il prossimo libero è
  **ADR-0131**.

## Il server e l'app

- **Server**: Hetzner CX33, `https://188-245-9-220.sslip.io`. Dal
  2026-10-02 07:27Z gira da `deploy/compose.yaml` con PostgreSQL e la copia
  notturna (TASK-122); immagine di prima `shaperoute-api:before-task122`.
  Cache delle zone in `/root/shaperoute/data/cache` (52 città italiane e 10
  estere, TASK-137); `/srv/shaperoute/extracts` va lasciato. Overpass non
  risponde a questo indirizzo dal 2026-10-01 22:35Z: le zone nuove vengono
  da Geofabrik (`prefetch_zones`, osmium-tool approvato dall'utente).
- **App**: ultima pubblicazione su `preview` da `bad06f2` (update
  `5ec93905`, 2026-10-02 09:52): scorrimento Feed · Draw · Explore,
  account, annunci (solo in una build propria), corsa libera, A·B·C e
  linee grigie in Explore, Feed di esempio. Da provare sull'iPhone: la
  lista è in `STATUS.md`.

## Fatto in questa tornata (2026-10-01/02)

In `main`: #137 (TASK-136), #112 (088), #148 (140), #142 (142), #149 (147),
#141 (144), #147 (128), #151 (114), #152 (146), #153 (148), #155 (AGENTI),
#154 (149), #156 (151), #158 (115), #161 e #163 (task file di 067), #159
(task file 150/152/153), #130 (132), #162 (154), #160 (155), #157 (122),
#150 (137), #166 (158), #165 (157), #164 (156), #167 (122, copie), #140
(141).
