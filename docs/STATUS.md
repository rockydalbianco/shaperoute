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
- **TASK-283 — Le foto dei paesi in «NEARBY TOWNS»** · codice in `main`
  (#499); resta il server. File: — · `tasks/TASK-283.md`
- **TASK-294 — MuW su Google Play** · A, B, C in `main`; manca la copia sul
  server (F.14). File: — · `tasks/TASK-294.md`
- **TASK-297 — Archivio dei percorsi e loghi a penna alzata** · A e A2 fatte;
  C (motore) nella PR #547; poi C2. File: — · `tasks/TASK-297.md`
- **TASK-301 — La musica nel video della corsa** · PR #568, aspetta merge e
  prova sull'iPhone. File: — · `tasks/TASK-301.md`
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
- **TASK-343 — Le sfide del mese** · documenti e A in `main`; B nella PR
  #667; server con la 0039 col sì. File: — · `tasks/TASK-343.md`
- **TASK-346 — «Edit the drawing» nel Feed** · in PR, aspetta il merge e la
  prova sul telefono. File: — · `tasks/TASK-346.md`
- **TASK-347 — Il disegno libero ancorato alle strade** · A fatta; prossima
  B (il telefono). File: — · `tasks/TASK-347.md`
- **TASK-348 — Il compositore del post** · A in `main`; resta la prova sul
  telefono, poi B, C, D. File: — · `tasks/TASK-348.md`
- **TASK-353 — La chat: orari, giorni, non letti** · in corso; dopo il merge
  TASK-354. File: — · `tasks/TASK-353.md`
- **TASK-355 — Una scheda del Feed chiara** · A in `main`; B dopo 344 B.
  File: — · `tasks/TASK-355.md`
- **TASK-361 — «Draw» in tre secondi** · A e B in `main`; manca la
  pubblicazione. File: — · `tasks/TASK-361.md`
- **TASK-363 — Dove va la posizione del telefono** · codice in
  `fix/TASK-363-position`; server, sito e OTA, tre sì a parte. File: — ·
  `tasks/TASK-363.md`
- **TASK-370 — L'app per Apple Watch** · A1–A3, B1, B2, B3a (percorsi e
  preferiti sull'orologio), B3b (la corsa guidata: freccia, mappa,
  vibrazioni, GPS) in `main`; prossimi B3c (la traccia al telefono), privacy,
  A-flip alla 1.1. File: — · `tasks/TASK-370.md`
- **TASK-371 — La camminata, «Walk»** · A e B Done, «Walk» acceso (#923);
  resta C. File: — · `tasks/TASK-371.md`
- **TASK-374 — Il mio corpo: calorie e zone del battito** · A e B in `main`;
  C e D nella 1.0.2. File: — · `tasks/TASK-374.md`
- **TASK-384 — «MuW Style»** · A e B in `main`; prossima C, i primi 6 post.
  File: — · `tasks/TASK-384.md`
- **TASK-385 — «Gym», la palestra** · parti fino a F in `main`; prossima G
  (il battito, con TASK-345 C). File: — · `tasks/TASK-385.md`
- **TASK-388 — Movimenti stile Apple** · A, A2, B, C, C3 in `main`; C2 in PR.
  File: — · `tasks/TASK-388.md`
- **TASK-397 — Il VO₂ max nel profilo** · A e B in `main`; C con la 1.0.2,
  poi D. File: — · `tasks/TASK-397.md`
- **TASK-401 — Le indicazioni a schermo bloccato** · A in `main`; B (Live
  Activity, 1.0.3) nella bozza #862. File: quelli della #862 ·
  `tasks/TASK-401.md`
- **TASK-406 — Le stazioni sciistiche** · C, D1, D2, D3a e D3b in `main`;
  D1 sul server. La 0062 va sul server nel passo unico; lo sci esce con
  l'OTA unico, col sì dell'utente. Prossimo: la prova sulla neve (parte E).
  File: — · `tasks/TASK-406.md`
- **TASK-407 — La 1.0.2 solo per gli screenshot** · build da
  `release/1.0.2`, la lancia l'utente. File: — · `tasks/TASK-407.md`
- **TASK-408 — L'editor del video dell'attività** · C1, C2 (scene,
  finale, camera dietro, anteprima) e D («Describe your video») in `main`,
  nell'OTA di produzione; restano B2 (elefante, file dall'utente) ed E
  (telefono). File: — · `tasks/TASK-408.md`
- **TASK-409 — Il nuoto in piscina** · A (calorie) in `main` e in produzione;
  B1 (battito sulla corsa, migrazione 0061) in `main` (#979), sul server con
  l'aggiornamento del Coordinatore; B2 (l'app) in PR, entra dopo il server.
  La B fa anche i pezzi di TASK-345 B/C e 374 D. File: `src/pool/`,
  `src/health/heart*`, `src/about/content/`, `site/privacy/` · `tasks/TASK-409.md`
- **TASK-410 — La pagina del post** · B (#949), F (#980) e C (`run_stats`,
  #1001) in `main`; 0064 e backfill dei passi col passo unico sul server.
  OTA di produzione del 2026-11-10 da 88e5f88f (gruppo `4eca1d42`, preview
  `b0f9913b`). D (#1043) col secondo OTA, poi E. File: — · `tasks/TASK-410.md`
- **TASK-413 — Ciaspole** · 0 e A1 in `main` (#957: la neve nel motore,
  `heights.py` condiviso) e sul server col passo unico del 2026-11-10;
  prossime A2 (contratto, API, migrazione in bozza 0057) e B. File: — ·
  `tasks/TASK-413.md`
- **TASK-414 — Carrozzina e passeggino** · parte 0 fatta, lista di A
  approvata; prossima A, migrazione 0058 in bozza. File: — ·
  `tasks/TASK-414.md`
- **TASK-415 — Ski touring** · 0 e A in `main`; prossima B. File: — ·
  `tasks/TASK-415.md`
- **TASK-417 — La mia immagine al posto dell'animale e il video «Together»** ·
  proposta in `main` (ADR-0345), scelte dell'utente fatte; parte B dopo
  TASK-408 C2, con la lista al Coordinatore. File: — · `tasks/TASK-417.md`
- **TASK-424 — Dati dal vivo per ogni sport e «Share live activity»** ·
  parte 0, A1 (server, migrazione 0063) e A2 (pagina `site/live/`, #1010)
  in `main`; server e copia del sito (F.14) col sì nell'aggiornamento
  unico; prossima B1 (app), poi B2 e C. File: — · `tasks/TASK-424.md`
- **TASK-420 — Tutte le forme in «Explore»** (riaperto il 2026-11-10 come
  parte D, scelta dell'utente «A, griglia per città»; ADR-0347 precisazione
  B) · app in #1022: «Explore» lista unica, «NEAR YOU» poi «FARTHER AWAY»
  città per città da `GET /catalog`, a pagine; senza endpoint la pagina è
  come prima; endpoint `GET /catalog` in #1027 (parte E). Prossimo: merge
  di #1022 e #1027, server col sì dell'utente, poi l'OTA. File: — ·
  `tasks/TASK-420.md`
- **TASK-419 — Il catalogo grande di «Explore»** · primo giro sul server
  (155); secondo giro nella PR #1028 (386 percorsi in 45 città, scelta
  dell'utente del 2026-11-10), poi «via server catalogo». Restano 16 città
  europee (Overpass chiuso) e i contorni di TASK-418 in attesa della
  registrazione. File: quelli della #1028 · `tasks/TASK-419.md`
- **TASK-423 — «Play» grande** (ADR-0351) · A (94 forme), B (tempi su 11
  distanze, regole 3) e la privacy (#1007) in `main`; C (sfide personali,
  streak, 0065) nella #1018. Server A+B col backfill: sì dell'utente, via
  del Coordinatore. Poi D (dopo la #971) ed E. File: quelli della #1018 · `tasks/TASK-423.md`
- **TASK-418 — Forme nuove per il catalogo di «Explore»** · parte A in
  `main` (#953): 49 forme candidate in `services/route-engine/candidate_outlines/`;
  poi la registrazione delle sole forme che l'utente approva su strada (dopo
  TASK-419). File: — · `tasks/TASK-418.md`
- **TASK-421 — I percorsi a piedi non passano per i cancelli chiusi** · motore
  in `main` (#973, ADR-0349, impronta `8ab61d8e87f9`); restano il server e le
  zone foot da rifare (`DEPLOY.md` F.15, sì dell'utente dato), al «via server
  973» del Coordinatore. File: — · `tasks/TASK-421.md`

In attesa (Proposto o Todo, nessun file occupato): TASK-153 AdMob vero
(aspetta la società), 279 B frasi a penna alzata, 282 il percorso dove sta
la figura, 305 parapendio, 336 video nei post, 341 badge, 345 calorie e
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
