# STATUS — Dove siamo adesso

> **Unica fonte di verità sullo stato del progetto.** Primo file da leggere,
> ultimo da aggiornare. Deve restare corto: lo storico è in `docs/archive/`
> (si cerca con grep, non si legge intero).

**Ultimo aggiornamento**: 2026-11-24 (censimento dei task aperti: chiusi, in attesa e voci riscritte) · **Fase corrente**: 5 — Sport e piattaforme

---

## In una riga

MuW è sull'App Store (la 1.1.0 con l'app per Apple Watch e la Live
Activity, dal 2026-11-11; OTA di produzione fino al 25, server al passo 22)
e in preparazione su Google Play (TASK-294).
L'API gira sul server Hetzner (`api.getmuw.app`) con PostgreSQL; il sito è
`getmuw.app`. L'app disegna forme, parole, foto e disegni a mano come
percorsi veri a piedi, in bici, in canoa e a nuoto; registra anche gli sport
senza forma (sci, palestra). Ha un lato social: Feed, profili, messaggi,
concorsi e sfide del mese, badge, MuW Style. In corso: nuovi sport (Roller,
ciaspole, carrozzina e passeggino, scialpinismo, palestra), l'app per Apple
Watch, il catalogo di «Explore», il video della corsa. Gli OTA di produzione e il server si toccano solo col sì
dell'utente, una pubblicazione alla volta, dal Coordinatore (`AGENTI.md`).

## Prossimo passo

**La prova generale sul telefono** fatta dall'utente il 2026-11-26
sull'OTA 25: 18 controlli «ok», nessun «no»; chiusi 355, 417, 424, 431.
Poi, lo stesso giorno, anche 466, 214 e 496 «ok». Restano da provare,
dopo l'OTA 26: 450, 506, 486, 490 D, 297 C2, 479 D3.
OTA di produzione e aggiornamenti del server in sospeso per task già Done:
li tiene il Coordinatore (`AGENTI.md`, «L'albero»), col sì dell'utente.
**TASK-294**: resta l'uscita su Google Play (test chiuso con 12 tester
per 14 giorni, poi la produzione), coi sì dell'utente nella Play Console.
**Le prove sul campo** (neve, volo, corsa vera): una riga per prova in
`docs/PROVE-SUL-CAMPO.md` (406 E, 429, 375 E, 415, 305, 479), da
fare quando capita; i task con solo quella prova sono chiusi.

## In lavorazione

Al massimo 5 righe per task: stato, «File toccati» occupati adesso (branch o
PR aperti; «—» se nessuno), task file. I dettagli stanno nel task file.

- **TASK-493 — La mappa dei decolli** (ADR-0400) · parte 0 il 2026-11-23:
  decolli e atterraggi da OSM, la scheda del decollo con lo storico dei
  voli contato dal server; scelte dell'utente fatte. Vento dopo 479 H.
  File: — · `tasks/TASK-493.md`
- **TASK-494 — Le scadenze della vela** (ADR-0401) · parte 0 il
  2026-11-23: revisione, riserva e imbrago sull'attrezzatura di 486, con
  l'avviso; scelte dell'utente fatte. File: — · `tasks/TASK-494.md`
- **TASK-489 — «Alimentazione»: diario dei pasti e bilancio delle calorie** ·
  ADR-0397; A1–D e la privacy in `main`, spente (`NUTRITION_ON`). In fila:
  D2 = #1547, G1, C2a, H (pagina animata), I (invito a fine attività);
  decise e non scritte J (ingresso) e K (peso). Build nativa: G2, C2b,
  accensione. File: `nutrition/*`, `activities/RunEnd.tsx`,
  `gym/GymEnd.tsx` · `tasks/TASK-489.md`
- **TASK-513 — «Longevity»: cinquanta storie animate** · ADR-0407; parte 0
  chiusa il 2026-11-24, nessun codice; il codice in una sessione sua.
  File: — · `tasks/TASK-513.md`
- **TASK-514 — La modalità «Nutrition»** · ADR-0408; parte 0 chiusa il
  2026-11-24; parte dopo TASK-490 D ed E, in una sessione sua. File: — ·
  `tasks/TASK-514.md`
- **TASK-516 — Forme invernali e contorni** · ADR-0411; parte 0 il
  2026-11-24 (la C di TASK-441, scelta dell'utente): 11 forme nuove
  d'inverno, feste e sport e i 35 contorni di TASK-418. A sagome (file
  nuovi), B strade, C registrazione (PR unita dall'utente, server e OTA
  insieme), D catalogo. File: — · `tasks/TASK-516.md`
- **TASK-507 — I dati del telefono restano di chi li ha fatti** · ADR-0406;
  A + C, D, B1 e B2 in `main` (#1533, #1545, #1546, #1573), il 2026-11-26
  la PR di documenti. Resta la prova dell'utente con due account dopo
  l'OTA (`PROVA-GENERALE.md`, sezione 2), poi la chiusura.
  File: — · `tasks/TASK-507.md`
- **TASK-214 — Il motore dei percorsi sul telefono** · A, B, C, A2, B2 in
  `main`; restano tempi e memoria su un iPhone vero e le zone dove il server
  dà 404. File: — · `tasks/TASK-214.md`
- **TASK-294 — MuW su Google Play** · A, B, C in `main` (pagina di
  cancellazione online); restano la prova su un Android vero, l'URL nella
  Play Console e l'uscita su Play («Prossimo passo»). File: — ·
  `tasks/TASK-294.md`
- **TASK-309 — Le corse di gruppo** · documenti e A (API) in `main`;
  prossimo B (app), poi C. File: — · `tasks/TASK-309.md`
  **2026-11-22**: B1 (app) in `main` (#1369); prossima B2 dopo 312 C2.
- **TASK-316 — Explore pronto prima** · A e B in `main`; C (server,
  `draw_examples`) col sì dell'utente. File: — · `tasks/TASK-316.md`
- **TASK-321 — L'attività in Apple Salute e Health Connect** · A e B
  (#620) in `main`, B nella 1.0.1 e nella 1.1.0; restano la prova
  sull'iPhone e C (Android) al taglio nativo. File: — · `tasks/TASK-321.md`
- **TASK-322 — Entrare con Apple e Google** · A (API) in `main`; prossima B
  (app), C (chiavi sul server) col sì. File: — · `tasks/TASK-322.md`
- **TASK-347 — Il disegno libero ancorato alle strade** · A fatta; prossima
  B (il telefono). File: — · `tasks/TASK-347.md`
  **2026-11-22**: B in `main` (#1389); C1 #1398, poi C2 (schermate) e C3.
- **TASK-370 — L'app per Apple Watch** · A e B nella 1.1.0 (build 14,
  sullo Store dal 2026-11-11; #1116 in `main`); resta C, sport per sport,
  alla prossima build dell'orologio. File: — · `tasks/TASK-370.md`
- **TASK-374 — Il mio corpo: calorie e zone del battito** · A e B in
  produzione; C e D al prossimo taglio nativo, col testo del permesso di
  Salute insieme a 345 C, 397 C, 467 C. File: — · `tasks/TASK-374.md`
- **TASK-385 — «Gym», la palestra** · A–G in `main` (G1 sul server col
  passo 20, G2 con l'OTA 25); la privacy di G3 (#1486) è online; restano
  la prova sul telefono e H (nativa). File: — · `tasks/TASK-385.md`
- **TASK-397 — Il VO₂ max nel profilo** · A e B in produzione; C al
  prossimo taglio nativo (con 374 C), D dopo 321 C. File: — ·
  `tasks/TASK-397.md`
- **TASK-410 — La pagina del post** · B, F, C, D e la correzione #1078 in
  produzione; A è TASK-355 B; resta E, il meteo (testi e privacy da
  approvare). File: — · `tasks/TASK-410.md`
- **TASK-441 — «Explore» a 2000 disegni** · parte A in `main` (#1149):
  1963 percorsi e ordine misto in «NEAR YOU». Le 702 parole nuove a riga
  unica non si leggono: escono con `fix/TASK-441-a-drop-words` (→ 1261) e
  tornano nella B a penna alzata; il server aspetta la correzione. Poi B
  (ADR-0366) e C. File: `catalog/seed/**`, `tools/catalog_kept.json` (la correzione) · `tasks/TASK-441.md`
  **2026-11-12**: A sul server (1261, passo 8). **B1** (ADR-0366): 340 parole a
  penna alzata lette a occhio, catalogo a 1546; server in `main` (#1184), app
  #1185; server e OTA escono insieme nell'aggiornamento completo. Poi B2
  (bici, canoa, nuoto) e C. File (#1185): `apps/mobile/src/explore/{ExploreScreen.tsx,explored.ts,recommendedRoutes.ts}`, `apps/mobile/src/route/NearYou.tsx`
  **2026-11-12, 12:28Z**: B1 in produzione — server a 1546 (passo 10), app nell'OTA 12.
  **2026-11-18**: **B2** (ADR-0366, precisazione): 148 uscite in bici da 20–30 km, otto forme lette a occhio, 29 città italiane; catalogo a 1694, server in `main` (#1317), passo 14 e OTA con la #1248 (bozza) col sì dell'utente. Poi le città estere, B3 (40–50 km) e C. File (#1248): `apps/mobile/src/explore/{recommendedRoutes.ts,catalogList.ts,ExploreScreen.tsx}`, `apps/mobile/App.tsx` (una riga)
  **2026-11-21**: B2 sul server (passo 14, 06:43Z, catalogo a 1694, le corse identiche per chi non chiede `activity`); app in `main` (#1248, `ab51d0fd`): le uscite si vedono con lo sport «Bike» dopo l'OTA 18 (sì dell'utente). Città estere: secondo giro in corso sul Mac (estratti Geofabrik, limite 4 GB del pianificatore), poi una PR del solo catalogo.
  **2026-11-21, sera**: B2 **in produzione** con l'OTA 18 (`593c6fbe`): le uscite in bici delle 29 città italiane in «Explore» con lo sport «Bike»; l'utente l'ha provata sul telefono («funziona»). Città estere: 12 su 32 disegnate, il giro è in pausa per la coda del simulatore (via del Coordinatore).
  **2026-11-22**: B2, città estere: 172 uscite in bici in 25 città (stesse otto forme, zone dagli estratti di Geofabrik), catalogo a 1866, in `main` (#1380, `ef7b1d83`) col sì dell'utente sui disegni («Sì, vanno bene»); il server le carica al prossimo passo, senza OTA. Berlino, Parigi, Dublino, Tokyo, New York, Amburgo e Vienna in un secondo giro col limite a 5 GB (deciso dal Coordinatore, parte col suo via).
  **2026-11-22, passo 17**: B2 estere **sul server** (`40789324`, catalogo a 1866): le corse identiche (`1546 63 40 0`), in bici 320 uscite in 54 città, Londra con le sue otto; nell'app si vedono già con lo sport «Bike», senza OTA. Resta il secondo giro delle sette città (via del Coordinatore, limite 5 GB solo per loro).
  **Passo 19 (riferito dal Coordinatore il 2026-11-23)**: le cinque città recuperate (Berlino, Dublino, Amburgo, Vienna, New York: 36 uscite, sì dell'utente sui disegni «SI VANNO BENE») in `main` (#1418, `32036bd3`) e **sul server** (`e427ed2e`, catalogo a 1902): le corse identiche (`1546 63 40 0`), in bici 356 uscite in 59 città; senza OTA. Parigi e Tokyo restano senza uscite in bici (oltre i 5 GB del pianificatore). B2 estere chiusa; restano B3 (40–50 km) e C.
  **2026-11-23, B3** (ADR-0366, precisazione B3): le uscite in bici da 40 e 50 km **solo nel catalogo** (scelta dell'utente: «solo in Explore»; «Draw» in bici resta a 10–30 km, motore non toccato): 129 uscite in 32 città, tutte quelle che passano il filtro (sì dell'utente: «Tutti i 129»), catalogo a 2031, in `main` (#1471, `ba12b1fe`); gli id di prima restano. Il server le carica col passo 21 (sì dell'utente al Coordinatore), senza OTA; poi la prova sul telefono. Dopo: C.
  **2026-11-23, B3 chiusa**: sul server col passo 21 (`74cc96c7`, catalogo a 2031, le corse identiche) e provata dall'utente sul telefono («visto funziona»), senza OTA. Di TASK-441 resta C.
- **TASK-305 — Parapendio: la registrazione in volo** (ADR-0375) · parti
  R: il volo «Record only» con la condivisione dal vivo e i numeri del volo
  (quota, variometro, velocità). Prima la PR di documenti, poi R1 (server),
  R2 (app, col turno), R3 (`site/live/`). Il pianificatore resta Proposto.
  File: — · `tasks/TASK-305.md`
  **R1 fatta il 2026-11-12**: #1177 in main (83bbbc5d), server al passo 9
  (migrazione 0069_paragliding). Ora R2 (app) e R3 (`site/live/`).
  **R3 fatta il 2026-11-12**: #1191 in main (60c801aa), sito copiato alle
  09:33Z. R2 in bozza (#1201), aspetta il simulatore dopo il 454.
  **R2 fatta il 2026-11-12**: #1201 in main (f0909495), esce con
  l'aggiornamento completo. Resta: un volo vero col link dal vivo; R4
  (orologio, battito) in bozza #1218 fino alla build dopo la 1.1.0.
  **R5 fatta il 2026-11-12**: #1258 (server, passo 12) e #1260 (app, OTA
  16) in main: «Ready to fly», «Your flights», i record di volo. In corso
  R6 (corsa + volo, #1291 e #1293 in bozza) e il fix #1302 (fine del volo).
  **R6 fatta il 2026-11-18**: #1291 (server, passo 13) e #1293 (app, col
  prossimo OTA) in main: corsa + volo nella stessa attività. In bozza R6c
  (#1313, la mappa a due colori); poi R6d (la pagina riaperta).
  **R6c e R6d fatte il 2026-11-22**: R6c (#1313) in produzione con l'OTA
  20; R6d-a (#1342) sul server al passo 15, R6d-b (#1352, `7a082983`) in main, col
  prossimo OTA: la gara riaperta a due colori, coi tempi a piedi e in volo.
  Resta: un volo vero; R4 in bozza (#1218).
  **2026-11-22**: R6d in produzione con l'OTA 21. #1399 in main: un volo
  nelle liste si chiama «Paragliding» e ha la velocità, col prossimo OTA.
  **2026-11-23**: R6e in main (#1411 server col passo 19, #1412 app con
  l'OTA 23): il post di una gara dal Feed a due colori.
  **2026-11-23, R6e chiusa**: passo 19 fatto e OTA 23 uscita; l'utente ha
  visto il post di una gara sul telefono («funziona tutto»). Resta: un volo
  vero; R4 in bozza (#1218).
- **TASK-479 — Il parapendio completo, strumento di volo** (ADR-0388) ·
  scelta dell'utente del 2026-11-21, senza accordi con terzi: schermata di
  widget, vario sonoro, mappa 3D, spazi aerei dal file del pilota, gare,
  dopo il volo, live, meteo DWD/ECMWF. Parte 0 (documenti) in PR; poi
  B1 → C → A1 → E → D → B2 → F → G → H. File: — · `tasks/TASK-479.md`
  **2026-11-21 sera**: B1 «pronta» (#1349); ordine cambiato dall'utente:
  B2 (editor) subito dopo B1.
  **2026-11-22**: B1 in produzione (OTA 20), B2 in `main` (#1368), C (vario
  sonoro, acceso di default) in produzione (OTA 22, #1394), provata
  dall'utente sul telefono; prossima A1.
  **2026-11-23**: A1 (mappa di volo 3D/2D, quota sul terreno) in `main`
  (#1434); OTA dal Coordinatore; prossima E.
  **2026-11-23 sera**: E1 (file OpenAir del pilota, #1454) ed E2 (spazi
  aerei in volo: avviso, suono, mappa, widget, #1470) in `main`; prossima E3.
  **2026-11-23**: E3 (registro dopo il volo, fasce nel grafico, #1498) in
  `main`; prossima D (D1 #1503).
- **TASK-467 — Il punteggio del sonno MuW, da pubblicare** · parte 0 chiusa
  (scelte e testi dell'utente, 2026-11-11); poi A (calcolo sul telefono),
  B (post), C (nativa, dopo la 1.1.0). File: — · `tasks/TASK-467.md`
  **2026-11-12**: A in `main` (#1193, ADR-0379). Poi B1 (server, tabella
  `sleep_nights`, ADR-0380), B2 e B3 (app), C prima dell'OTA di B2.
  **B1 in `main`** (#1211, `71e24188`, ADR-0380: migrazione `0072`, endpoint
  del sonno), sul server col passo dell'aggiornamento completo. Poi B1b
  (il campo `sleep` nel disegno visto) e B2, in una sessione a parte.
  **B1 sul server** dal passo 10 del 2026-11-12. **B1b** (#1227,
  `3c513355`) e **B2** (#1236, `627767a5`: il sonno nel post, spenta da
  `SLEEP_POSTS_ON`) in `main`; B1b sul server col passo dopo, col sì. Poi
  B2b (palestra e vasca), B3, C.
  **B2b in `main`** (#1244, `bb3d3457`: il sonno a fine palestra e a fine
  vasca, spenta). Prossima B3 (la scheda «Sleep» del profilo), poi C.
  **B3 in `main`** (#1292, `b6e36fcb`: la scheda «Sleep» del profilo,
  spenta). **C avviata il 2026-11-21**: bozza #1334 da non unire (lettore
  vero, sonno acceso) e build di prova per il solo iPhone dell'utente.
  **E1 in `main`** (#1373, `f38b1980`: il post del sonno da solo, server e
  contratto, migrazione `0082`); sul server col passo 17, col sì. E2 (app)
  dopo TASK-312 C2 e TASK-481 A.
  **2026-11-22**: E1 sul server (passo 17). E2: file nuovi pronti senza
  PR, agganci dopo TASK-312 C2 e TASK-481 A. C: frase della privacy
  approvata, sulla bozza #1334 (verde, da non unire).
  **2026-11-23**: **E2 in `main`**, spenta: il post del sonno nel Feed,
  nella sua pagina e nella griglia (#1419, `d0b89470`) e la voce «Sleep»
  del «+» (#1441, `57e4d4b4`). Poi una build di prova nuova, poi la C.
  **2026-11-23**: **C0 in `main`** (#1458, `cffb2c4d`): il sonno acceso solo
  sul canale di prova `preview`, spento negli store. Arriva sulla build di
  prova con la prossima pubblicazione su `preview`; poi la prova e la C.

- **TASK-466 — Lo stretching nuovo** (ADR-0378) · A in produzione (OTA
  12); B (dieci esercizi, tre routine da 3, 5, 10 min, la gamba staccata
  corretta, #1216) e D («Morning stretch» in Impostazioni, #1300) in
  `main`, col primo OTA dopo; poi la prova sul telefono (la notifica
  vera). Restano C (palestra) ed E. File: — · `tasks/TASK-466.md`

- **TASK-469 — Il look Liquid Glass** (ADR-0383) · «Capsula»: A1 barra di
  vetro (#1219) e A2 segmenti che scivolano (#1225) in produzione con
  l'OTA 14; A3 pista di vetro (#1276) e A4a chip (#1290) in produzione al
  più tardi con l'OTA 17; A4b e A4c card (#1333, #1344) con l'OTA 20; A5
  cerchi dell'header e A5b header che scorre con l'OTA 21; A5c (Profilo,
  sci, #1391) e A6 gruppi di Impostazioni (#1403) con l'OTA 22; A6b account
  (#1407) con l'OTA 23; A7a fogli, A7b isola, A5c-2 Feed, A7c-1 chip con
  l'OTA 24; A7c-2 chip degli sport (#1494), A7c-3 chip della palestra
  (#1509) e la correzione dell'header sopra le pagine (#1534, difetto di
  A5b) con l'OTA 25. Poi A7c-4 (chip del volo). Parte B avviata
  dall'utente il 2026-11-24: piano B0–B4 nel task file, la dipendenza
  (B1) col suo sì e nel taglio nativo. B1 (#1557) e B2 (#1562, la barra
  galleggia solo col vetro vero: scelta dell'utente del 2026-11-26) sono
  bozze ferme fino al taglio nativo. A7c-4 (#1624) in `main` dal
  2026-11-26: la parte A è finita. B3 (#1614, #1617) e B4 (#1620, #1621)
  in bozza; nella prova la barra e i fogli non tengono 4,5:1: la barra
  velata è da misurare, i fogli sono fermi. 2026-11-27: col vetro velato
  barra, header e fogli tengono 4,5:1 nel simulatore; l'utente approva
  la barra e dice avanti coi fogli, tutti o nessuno (#1620 in `main`,
  gli altri quindici nella #1647). File: — ·
  `tasks/TASK-469.md`

- **TASK-482 — Il link di un post apre l'app** (ADR-0391) · B2 e A in
  produzione (OTA 21), provate dall'utente; C: i due file `.well-known`
  online. D (link verificati in `app.json`): bozza #1461, da unire solo al
  taglio della build nativa; poi la prova dell'utente sul telefono. Sessione
  archiviata: chi riprende legge il Registro. File: — · `tasks/TASK-482.md`

- **TASK-495 — I gruppi per uscire insieme («Groups»)** (ADR-0402) ·
  parte 0 il 2026-11-23: tutti i default approvati dall'utente
  (`GRUPPI.md`). Poi A API, B app, C uscite (anche senza percorso, file di
  TASK-309 col via del Coordinatore), D Explore e push, privacy prima
  dell'OTA, E chat di gruppo. File: — · `tasks/TASK-495.md`
  2026-11-24: A in `main` (#1538, migrazione 0087, sul server col prossimo
  passo), A2 #1543 armata; poi B (l'app), file approvati dal Coordinatore.
  2026-11-26: A e A2 sul server (passo 22); privacy online (#1561, sito
  c33f3920); B in `main` (#1560), esce con l'OTA; A3 «Delete group» #1629
  (merge col sì dell'utente). Poi C (uscite), D (Explore e push), E chat.
- **TASK-509 — Stati vuoti, icone di «Add to Feed», sagoma nelle tessere** ·
  parte 0 chiusa il 2026-11-26 (cinque scelte dell'utente). Tre PR di sola
  app: A stati vuoti (con due prop in `App.tsx`), B icone, C sagoma (dopo
  TASK-449 in `main`); il codice parte al «via» del Coordinatore.
  File: quelli di A, B e C nel task file · `tasks/TASK-509.md`

- **TASK-448 — «Surprise me»** · parte 0 chiusa il 2026-11-26 (sei scelte
  dell'utente): una pastiglia nel passo 2 di «Draw» mette forma e distanza
  fra quelle venute bene in città, dal catalogo di «Explore»; a piedi e in
  bici, motore non toccato. Poi A (la scelta, file nuovi) e B (la
  pastiglia, dopo TASK-449 A). File: — · `tasks/TASK-448.md`

In attesa (Fermo — in attesa nel task file, nessun file occupato; si
riprendono col sì dell'utente). Aspettano la società o servizi esterni:
TASK-153 AdMob vero, 237 B il merch, 312 D ed E (le attività da Apple Salute e
Health Connect con la build nativa, gli accordi con Garmin, Suunto, Coros,
Komoot). Idee approvate e mai partite: 279 B
frasi a penna alzata, 282 il percorso dove sta la figura, 305 il
pianificatore del parapendio, 311 C e D parole scritte meglio, 336 video
nei post, 339 E «Draw» e il risultato col look nuovo, 341 badge sul
profilo, 345 calorie e battito nel Feed, 348 B–D il compositore del post,
384 «MuW Style», 427, 429 E la grafica nuova delle stazioni. Fino
all'inverno: 415 B2, C, D lo scialpinismo (la prova sulla neve è in
`docs/PROVE-SUL-CAMPO.md`).

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
