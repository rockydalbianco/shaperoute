# STATUS — Dove siamo adesso

> **Unica fonte di verità sullo stato del progetto.** Primo file da leggere,
> ultimo da aggiornare. Deve restare corto: lo storico è in `docs/archive/`
> (si cerca con grep, non si legge intero).

**Ultimo aggiornamento**: 2026-11-08 (TASK-412 chiuso) · **Fase corrente**: 5 — Sport e piattaforme

---

## In una riga

MuW è sull'App Store (la 1.0.1 approvata da Apple; la 1.0.2 solo per gli
screenshot nuovi, TASK-407) e in preparazione su Google Play (TASK-294).
L'API gira sul server Hetzner (`api.getmuw.app`) con PostgreSQL; il sito è
`getmuw.app`. L'app disegna forme, parole, foto e disegni a mano come
percorsi veri a piedi, in bici, in canoa e a nuoto; registra anche gli sport
senza forma (sci, palestra). Ha un lato social: Feed, profili, messaggi,
concorsi e sfide del mese, badge, MuW Style. In corso: nuovi sport (Roller,
ciaspole, carrozzina e passeggino, scialpinismo, palestra), l'app per Apple
Watch, il catalogo di «Explore», il video della corsa. Gli OTA di produzione e il server si toccano solo col sì
dell'utente, una pubblicazione alla volta, dal Coordinatore (`AGENTI.md`).

## Prossimo passo

**TASK-407**: la build 1.0.2 da `release/1.0.2`, che lancia l'utente.
OTA di produzione e aggiornamenti del server in sospeso per task già Done:
li tiene il Coordinatore (`AGENTI.md`, «L'albero»), col sì dell'utente.
**TASK-294**: resta l'uscita su Google Play (test chiuso con 12 tester
per 14 giorni, poi la produzione), coi sì dell'utente nella Play Console.

## In lavorazione

Al massimo 5 righe per task: stato, «File toccati» occupati adesso (branch o
PR aperti; «—» se nessuno), task file. I dettagli stanno nel task file.

- **TASK-214 — Il motore dei percorsi sul telefono** · A, B, C, A2, B2 in
  `main`; restano tempi e memoria su un iPhone vero e le zone dove il server
  dà 404. File: — · `tasks/TASK-214.md`
- **TASK-237 — Il sito web** · online su getmuw.app; resta il merch.
  File: `site/`, `docs/SITO.md` · `tasks/TASK-237.md`
- **TASK-276 — Più percorsi all'ora sullo stesso server** · Todo, piano
  pronto; aspetta il sì dell'utente e il via del Coordinatore. File: — ·
  `tasks/TASK-276.md`
  **2026-11-10**: parte A misurata (7–8 percorsi/min); parte B, 2 processi
  caldi, in `main` (#1038, ADR-0242); resta il server (passo 2, col sì).
  **Chiuso il 2026-11-10**: B sul server, misura #1097 (8,5–9,5/min); vedi `archive/COMPLETATI.md`.
- **TASK-283 — Le foto dei paesi in «NEARBY TOWNS»** · codice in `main`
  (#499); resta il server. File: — · `tasks/TASK-283.md`
- **TASK-294 — MuW su Google Play** · A, B, C in `main`; manca la copia sul
  server (F.14). File: — · `tasks/TASK-294.md`
  **2026-11-10**: la pagina `getmuw.app/account-deletion/` risponde (copia
  F.14 fatta); non chiuso: manca l'uscita su Play («Prossimo passo»).
- **TASK-297 — Archivio dei percorsi e loghi a penna alzata** · A e A2 fatte;
  C (motore) nella PR #547; poi C2. File: — · `tasks/TASK-297.md`
  **2026-11-10**: C (motore) in `main` con la #547; resta C2 (API e app).
- **TASK-301 — La musica nel video della corsa** · PR #568, aspetta merge e
  prova sull'iPhone. File: — · `tasks/TASK-301.md`
  **Chiuso il 2026-11-10**: #568 in `main`; la prova sull'iPhone resta all'utente; vedi `archive/COMPLETATI.md`.
- **TASK-309 — Le corse di gruppo** · documenti e A (API) in `main`;
  prossimo B (app), poi C. File: — · `tasks/TASK-309.md`
- **TASK-311 — Parole scritte meglio** · A e B fatte; C e D dopo il sì
  dell'utente. File: — · `tasks/TASK-311.md`
- **TASK-312 — Attività da altre app e post di sole foto** · A e B in `main`;
  poi C, D, E. File: — · `tasks/TASK-312.md`
- **TASK-316 — Explore pronto prima** · A e B in `main`; C (server,
  `draw_examples`) col sì dell'utente. File: — · `tasks/TASK-316.md`
- **TASK-321 — L'attività in Apple Salute e Health Connect** · A in `main`,
  B approvata con la 1.0.1; poi C (Android). File: — · `tasks/TASK-321.md`
- **TASK-322 — Entrare con Apple e Google** · A (API) in `main`; prossima B
  (app), C (chiavi sul server) col sì. File: — · `tasks/TASK-322.md`
- **TASK-339 — L'interfaccia premium** · A, B, C2 in `main`; D in PR, poi C1
  ed E. File: — · `tasks/TASK-339.md`
  **2026-11-10**: D in `main` con la #760; restano C1 (pagine vuote) ed E.
- **TASK-343 — Le sfide del mese** · documenti e A in `main`; B nella PR
  #667; server con la 0039 col sì. File: — · `tasks/TASK-343.md`
  **2026-11-10**: B in `main` (#667), la 0039 è sul server; non chiuso:
  `EnterOnPost` non è ancora montato in `DrawingCard` (task file, punto 2).
- **TASK-346 — «Edit the drawing» nel Feed** · in PR, aspetta il merge e la
  prova sul telefono. File: — · `tasks/TASK-346.md`
  **Chiuso il 2026-11-10**: #655 in `main`; la prova sul telefono resta all'utente; vedi `archive/COMPLETATI.md`.
- **TASK-347 — Il disegno libero ancorato alle strade** · A fatta; prossima
  B (il telefono). File: — · `tasks/TASK-347.md`
- **TASK-348 — Il compositore del post** · A in `main`; resta la prova sul
  telefono, poi B, C, D. File: — · `tasks/TASK-348.md`
- **TASK-353 — La chat: orari, giorni, non letti** · in corso; dopo il merge
  TASK-354. File: — · `tasks/TASK-353.md`
  **Chiuso il 2026-11-10**: #671 in `main` e sul server; prova sul telefono all'utente; vedi `archive/COMPLETATI.md`.
- **TASK-355 — Una scheda del Feed chiara** · A in `main`; B dopo 344 B.
  File: — · `tasks/TASK-355.md`
- **TASK-361 — «Draw» in tre secondi** · A e B in `main`; manca la
  pubblicazione. File: — · `tasks/TASK-361.md`
- **TASK-363 — Dove va la posizione del telefono** · codice in
  `fix/TASK-363-position`; server, sito e OTA, tre sì a parte. File: — ·
  `tasks/TASK-363.md`
- **TASK-370 — L'app per Apple Watch** · A1–A3, B1–B5 e privacy in `main`
  (B5 mappa, colori, zone #1085; B4 risveglio #1089); build 11 provata al
  polso. A-flip (#1058, in bozza, 1.1.0) ha main dentro: la build 12 su
  TestFlight col sì dell'utente. File: — · `tasks/TASK-370.md`
- **TASK-371 — La camminata, «Walk»** · A e B Done, «Walk» acceso (#923);
  resta C. File: — · `tasks/TASK-371.md`
  **Chiuso il 2026-11-10**: C in `main` (#755), «Walk» acceso; vedi `archive/COMPLETATI.md`.
- **TASK-374 — Il mio corpo: calorie e zone del battito** · A e B in `main`;
  C e D nella 1.0.2. File: — · `tasks/TASK-374.md`
- **TASK-384 — «MuW Style»** · A e B in `main`; prossima C, i primi 6 post.
  File: — · `tasks/TASK-384.md`
- **TASK-385 — «Gym», la palestra** · parti fino a F in `main`; prossima G
  (il battito, con TASK-345 C). File: — · `tasks/TASK-385.md`
- **TASK-388 — Movimenti stile Apple** · A, A2, B, C, C3 in `main`; C2 in PR.
  File: — · `tasks/TASK-388.md`
  **Chiuso il 2026-11-10**: C2 (#811) e C3 (#829) in `main`; vedi `archive/COMPLETATI.md`.
- **TASK-397 — Il VO₂ max nel profilo** · A e B in `main`; C con la 1.0.2,
  poi D. File: — · `tasks/TASK-397.md`
- **TASK-401 — Le indicazioni a schermo bloccato** · A in `main`; B (Live
  Activity, 1.0.3) nella bozza #862. File: quelli della #862 ·
  `tasks/TASK-401.md`
- **TASK-406 — Le stazioni sciistiche** · A–D online dal 2026-11-10: server
  a `9cf5576b`, OTA di produzione dal gruppo `4eca1d42`. Resta la parte E,
  la prova sulla neve, quando l'utente scia. File: — · `tasks/TASK-406.md`
- **TASK-407 — La 1.0.2 solo per gli screenshot** · build da
  `release/1.0.2`, la lancia l'utente. File: — · `tasks/TASK-407.md`
- **TASK-410 — La pagina del post** · B (#949), F (#980), C (`run_stats`,
  #1001; 0064 e backfill sul server) e D (le sezioni, #1043) in `main`. OTA
  di produzione del 2026-11-10 da 88e5f88f (gruppo `4eca1d42`) con F e C;
  D con l'OTA 3, dopo il passo server 2, col sì dell'utente. Poi E. File: —
  · `tasks/TASK-410.md`
- **TASK-413 — Ciaspole** · 0, A1 e A2 in `main` (#1130, `ac08ae94`: lo
  sport nel contratto e nell'API, nascosto nell'app, migrazione 0068) e
  sul server col passo 8 del 2026-11-11; l'app col decimo OTA. Prima di B,
  la città lenta (76 s per un rifiuto). File: — · `tasks/TASK-413.md`
- **TASK-414 — Carrozzina e passeggino** · parte 0 fatta, lista di A
  approvata; prossima A, migrazione 0058 in bozza. File: — ·
  `tasks/TASK-414.md`
- **TASK-415 — Ski touring** · 0 e A in `main`; prossima B. File: — ·
  `tasks/TASK-415.md`
  **2026-11-11**: B in `main` (#1160) e nella preview; in produzione con
  l'uscita completa (OTA col sì), poi la prova sul telefono; dopo B2, C, D.
- **TASK-417 — La mia immagine al posto dell'animale e il video «Together»** ·
  B e C («My image», #1067) in `main`, escono col prossimo OTA di
  produzione; prossime D («Together») ed E (telefono: anche il picker di
  sistema). File: — · `tasks/TASK-417.md`
- **TASK-424 — Dati dal vivo per ogni sport e «Share live activity»** ·
  0, A, B in produzione; C1 (#1096, OTA 5), C2 (#1098), C2b (#1110) e C3
  (#1123, calorie in rosso) in `main`. Restano: il server di C2b (passo 7)
  e l'OTA di C2 e C3, col sì dell'utente; la prova sul telefono.
  File: — · `tasks/TASK-424.md`
- **TASK-429 — La modalità sci** (ADR-0357) · 0, A, B1, C1, B2, C2 in
  `main` (#1093, #1108, #1114, #1129, #1131); A e B1 fuori con gli OTA 5 e
  6, C1 sul server dal passo 7 dell'11-11. B2 (i tratti a «Salva») e C2
  (stagione e giornata salvata) in produzione con l'ottavo OTA dell'11-11.
  Restano la prova sul telefono e la parte E (lista prima). File: — · `tasks/TASK-429.md`
- **TASK-431 — «Compass» più bella** (ADR-0359) · in `main` (#1081): la
  freccia «B» con anello e cono azzurri che punta dove punta la mappa, le
  tre schede coi disegni, la punta rossa del nord. Restano l'OTA di
  produzione (col sì dell'utente) e la prova sul telefono. File: — ·
  `tasks/TASK-431.md`
- **TASK-433 — Le schede della palestra guidate** (ADR-0360) · in `main`
  (#1095): la guida in 5 passi, le settimane che cambiano (4 modi, ciclo
  4/6/8), «My plans» e «Today» con la settimana. Restano il server
  (migrazione 0066) e poi l'OTA, nel passo unico del Coordinatore col sì
  dell'utente, e la prova sul telefono. File: — · `tasks/TASK-433.md`
  **2026-11-11**: server 0066 e OTA 5 fatti; B (#1103, spiegazione al primo
  tocco di Palestra) uscita con l'OTA 6; C (ADR-0363, giorni di corsa) C1
  #1117 in `main` e sul server (2ed26af7), C2 #1115 in `main` (23308c9e):
  esce col settimo OTA, col sì dell'utente. Resta la prova sul telefono.
  Settimo OTA (C2) in produzione il 2026-11-11 da 7e24e7d1; l'utente l'ha
  provato sul telefono («funziona tutto ok», prova generale). #1133 (il «No»
  neutro) esce con l'ottavo OTA.
  Ottavo OTA il 2026-11-11 da cd0c8b08, con la #1133: resta solo la prova
  sul telefono del «No» neutro, poi la chiusura.
  **Chiuso il 2026-11-11**: A, B e C in `main`, sul server e negli OTA 5–8;
  provato sul telefono dall'utente; vedi `archive/COMPLETATI.md`.
- **TASK-435 — Primo percorso subito, alternative dopo** (ADR-0361) ·
  parte 0 fatta: piano, misura (una vicina vince nel 38% delle prove;
  guadagno circa 1 s in mediana sul server) e le scelte dell'utente («il
  primo resta A»). Prossima la parte A (motore), poi B (API) e C (app).
  File: — · `tasks/TASK-435.md`
- **TASK-441 — «Explore» a 2000 disegni** · parte A in `main` (#1149):
  1963 percorsi e ordine misto in «NEAR YOU». Le 702 parole nuove a riga
  unica non si leggono: escono con `fix/TASK-441-a-drop-words` (→ 1261) e
  tornano nella B a penna alzata; il server aspetta la correzione. Poi B
  (ADR-0366) e C. File: `catalog/seed/**`, `tools/catalog_kept.json` (la correzione) · `tasks/TASK-441.md`
- **TASK-305 — Parapendio: la registrazione in volo** (ADR-0375) · parti
  R: il volo «Record only» con la condivisione dal vivo e i numeri del volo
  (quota, variometro, velocità). Prima la PR di documenti, poi R1 (server),
  R2 (app, col turno), R3 (`site/live/`). Il pianificatore resta Proposto.
  File: — · `tasks/TASK-305.md`
- **TASK-467 — Il punteggio del sonno MuW, da pubblicare** · parte 0 chiusa
  (scelte e testi dell'utente, 2026-11-11); poi A (calcolo sul telefono),
  B (post), C (nativa, dopo la 1.1.0). File: — · `tasks/TASK-467.md`

- **TASK-462 — Il calendario di tutte le attività** · A (server) in `main`
  (#1162, ADR-0372), sul server col passo 9; B (app) nella #1172 in bozza,
  aspetta il server e il sì dell'utente sugli screenshot. File: `profile/ProfileHome.tsx`,
  `activities/ActivitiesList.tsx` (B) · `tasks/TASK-462.md`

- **TASK-464 — Zone già in memoria nei processi di calcolo** · in `main`
  (#1167, ADR-0374); sul server col passo 9, `SHAPEROUTE_ZONES_MB` al
  default 500. Poi le letture di `out/TASK-464/SERVER.md` e il tetto
  scelto dal minimo disponibile dopo qualche giorno. File: — ·
  `tasks/TASK-464.md`

In attesa (Proposto o Todo, nessun file occupato): TASK-153 AdMob vero
(aspetta la società), 279 B frasi a penna alzata, 282 il percorso dove sta
la figura, 305 parapendio (il pianificatore), 336 video nei post, 341 badge, 345 calorie e
battito nel Feed, 373 sci alpino, 375 «Record only».

## Bloccato

Niente.

---

## Come si aggiorna

- **Task nuovo**: una voce in «In lavorazione», al massimo 5 righe.
- **Task che avanza**: si **riscrive** la sua voce, non si aggiunge sotto.
  La cronologia va nel task file.
- **Task chiuso**: la voce **esce** da qui e diventa **una riga** in fondo a
  `docs/archive/COMPLETATI.md`
  (`TASK-NNN — titolo · data · PR · esito in una frase`). Quello che resta
  da fare (OTA, server, prova) va nel task file; se aspetta l'utente, una
  riga in «Prossimo passo».
- **In una riga** e **Prossimo passo** si riscrivono, non si allungano.
- Se il file supera i 12 KB qualcosa è andato storto: si accorcia.
- Lo `STATUS.md` fino al 2026-11-08 è intero in
  `docs/archive/STATUS-fino-al-2026-11.md`.
