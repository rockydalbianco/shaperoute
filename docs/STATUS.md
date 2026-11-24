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

**La prova generale sul telefono** (2026-11-24): una lista sola coi
controlli che restano ai task (355, 417, 424, 431 e gli altri), da fare
in una volta; poi i task che passano si chiudono.
OTA di produzione e aggiornamenti del server in sospeso per task già Done:
li tiene il Coordinatore (`AGENTI.md`, «L'albero»), col sì dell'utente.
**TASK-294**: resta l'uscita su Google Play (test chiuso con 12 tester
per 14 giorni, poi la produzione), coi sì dell'utente nella Play Console.
**TASK-496**: batteria in corsa (#1529, #1531), in produzione con l'OTA
25. La batteria si vede solo sul telefono dell'utente: una corsa a
schermo bloccato e in tasca (nella prova generale).

## In lavorazione

Al massimo 5 righe per task: stato, «File toccati» occupati adesso (branch o
PR aperti; «—» se nessuno), task file. I dettagli stanno nel task file.

- **TASK-493 — La mappa dei decolli** (ADR-0400) · 0 (#1514) e A
  (#1518, migrazione 0086, sul server col passo 22) in `main`; prossima B
  (lo storico dei voli), poi C e D (vento dopo 479 H).
  File: — · `tasks/TASK-493.md`
- **TASK-494 — Le scadenze della vela** (ADR-0401) · parte 0 in `main`
  (#1514); prossima A, poi B e C. File: — · `tasks/TASK-494.md`
- **TASK-485 — La scheda della palestra come post** (ADR-0394) · 0 e A in
  `main`, A sul server (passo 18); B (#1414) e B2, la voce del «+» (#1431,
  `ed0bd4d7`), la privacy (#1469, `5d226b33`) e C, l'apertura da profilo,
  notifica o link (#1481, `2a5c7590`), in `main`; restano la copia del sito
  e l'OTA, col sì. File: — · `tasks/TASK-485.md`
- **TASK-490 — La modalità Allenamento** · 0, A, B, C (#1510, in
  produzione con l'OTA 25) e D, la tab «Food» (#1553), in `main`; restano
  l'OTA di D e la prova sul telefono. File: — · `tasks/TASK-490.md`
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
- **TASK-515 — Le email dell'account in produzione («Forgot password?»)** ·
  ADR-0410; parte 0 il 2026-11-24: il server non ha mai avuto Resend; scelte
  dell'utente fatte (solo email dell'account, segnalazioni e feedback).
  Poi A (i due giri a parte), Resend dell'utente, il passo sul server.
  File: — · `tasks/TASK-515.md`
- **TASK-486 — L'attrezzatura** (ADR-0393) · A–G e la privacy (#1480) in
  `main`, G1 sul server (passo 22), l'accensione `GEAR_ON` (#1558) in
  `main` dopo l'OTA 25; restano l'OTA, la copia della privacy sul sito e
  la prova sul telefono. File: — · `tasks/TASK-486.md`
- **TASK-214 — Il motore dei percorsi sul telefono** · A, B, C, A2, B2 in
  `main`; restano tempi e memoria su un iPhone vero e le zone dove il server
  dà 404. File: — · `tasks/TASK-214.md`
- **TASK-294 — MuW su Google Play** · A, B, C in `main` (pagina di
  cancellazione online); restano la prova su un Android vero, l'URL nella
  Play Console e l'uscita su Play («Prossimo passo»). File: — ·
  `tasks/TASK-294.md`
- **TASK-297 — Archivio dei percorsi e loghi a penna alzata** · A, A2, C
  in produzione; C2 (#1520) in `main` e sul server (passo 22), nell'app col
  prossimo OTA; restano i file derivati (`draw_examples`) e la prova sul
  telefono. File: — · `tasks/TASK-297.md`
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
- **TASK-343 — Le sfide del mese** · documenti e A in `main`; B nella PR
  #667; server con la 0039 col sì. File: — · `tasks/TASK-343.md`
  **2026-11-10**: B in `main` (#667), la 0039 è sul server; non chiuso:
  `EnterOnPost` non è ancora montato in `DrawingCard` (task file, punto 2).
- **TASK-347 — Il disegno libero ancorato alle strade** · A, B, C1–C3b
  (#1389, #1398, #1449, #1468, #1491) in produzione (OTA 25); restano D,
  E, F, G. File: — · `tasks/TASK-347.md`
- **TASK-355 — Una scheda del Feed chiara** · A, B1 e B2 in produzione
  (OTA 25, server passo 17); resta solo la prova sul telefono (prova
  generale). File: — · `tasks/TASK-355.md`
- **TASK-370 — L'app per Apple Watch** · A e B nella 1.1.0 (build 14,
  sullo Store dal 2026-11-11; #1116 in `main`); resta C, sport per sport,
  alla prossima build dell'orologio. File: — · `tasks/TASK-370.md`
- **TASK-374 — Il mio corpo: calorie e zone del battito** · A e B in
  produzione; C e D al prossimo taglio nativo, col testo del permesso di
  Salute insieme a 345 C, 397 C, 467 C. File: — · `tasks/TASK-374.md`
- **TASK-385 — «Gym», la palestra** · A–G in `main` (G1 sul server col
  passo 20, G2 con l'OTA 25); restano la copia della privacy di G3 (#1486),
  la prova sul telefono e H (nativa). File: — · `tasks/TASK-385.md`
- **TASK-397 — Il VO₂ max nel profilo** · A e B in produzione; C al
  prossimo taglio nativo (con 374 C), D dopo 321 C. File: — ·
  `tasks/TASK-397.md`
- **TASK-406 — Le stazioni sciistiche** · A–D online dal 2026-11-10: server
  a `9cf5576b`, OTA di produzione dal gruppo `4eca1d42`. Resta la parte E,
  la prova sulla neve, quando l'utente scia. File: — · `tasks/TASK-406.md`
- **TASK-410 — La pagina del post** · B, F, C, D e la correzione #1078 in
  produzione; A è TASK-355 B; resta E, il meteo (testi e privacy da
  approvare). File: — · `tasks/TASK-410.md`
- **TASK-415 — Ski touring** · 0 e A in `main`; prossima B. File: — ·
  `tasks/TASK-415.md`
  **2026-11-11**: B in `main` (#1160) e nella preview; in produzione con
  l'uscita completa (OTA col sì), poi la prova sul telefono; dopo B2, C, D.
  **2026-11-12**: B3 (cambio pelli a mano) in `main` (#1202); B e B3 escono
  con l'aggiornamento completo di oggi; prova sulla neve quest'inverno.
- **TASK-417 — La mia immagine al posto dell'animale e il video «Together»** ·
  B, C, D1, D2a, D2b in produzione (OTA 25), privacy «Together» online;
  resta solo E, la prova sul telefono coi tempi (prova generale). File: —
  · `tasks/TASK-417.md`
- **TASK-424 — Dati dal vivo per ogni sport e «Share live activity»** ·
  tutte le parti fino a C3 (#1123) in produzione, server e `site/live`
  online; resta solo la prova sul telefono (prova generale). File: — ·
  `tasks/TASK-424.md`
- **TASK-429 — La modalità sci** (ADR-0357) · 0, A, B1, C1, B2, C2 in
  `main` (#1093, #1108, #1114, #1129, #1131); A e B1 fuori con gli OTA 5 e
  6, C1 sul server dal passo 7 dell'11-11. B2 (i tratti a «Salva») e C2
  (stagione e giornata salvata) in produzione con l'ottavo OTA dell'11-11.
  Restano la prova sul telefono e la parte E (lista prima). File: — · `tasks/TASK-429.md`
- **TASK-431 — «Compass» più bella** (ADR-0359) · #1081 in produzione
  (OTA 25); resta solo la prova sul telefono (prova generale). File: — ·
  `tasks/TASK-431.md`
- **TASK-441 — «Explore» a 2000 disegni** · A, B1, B2 (anche le città
  estere) e B3 in produzione: 2031 percorsi, server al passo 21, provati
  dall'utente il 2026-11-23; resta C (motore: spazi, cifre, forme a tema),
  task e ADR a parte. File: — · `tasks/TASK-441.md`
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

- **TASK-464 — Zone già in memoria nei processi di calcolo** · in `main`
  (#1167, ADR-0374); sul server col passo 9, `SHAPEROUTE_ZONES_MB` al
  default 500. Poi le letture di `out/TASK-464/SERVER.md` e il tetto
  scelto dal minimo disponibile dopo qualche giorno. File: — ·
  `tasks/TASK-464.md`

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
  (B1) col suo sì e nel taglio nativo. File: — ·
  `tasks/TASK-469.md`

- **TASK-481 — Il «+» del Feed: tutte le voci** (ADR-0390) · A (la lista:
  «Record now», «Photos only», «From a file») in `main` il 2026-11-23 (#1421),
  privacy («from a file», cinque lingue e sito) in `main` (#1444); escono col
  prossimo OTA, copia del sito col sì dell'utente; restano le righe di 467 E2,
  484 B, 485 B, al via del Coordinatore. File: — · `tasks/TASK-481.md`

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

In attesa (Fermo — in attesa nel task file, nessun file occupato; si
riprendono col sì dell'utente). Aspettano la società o servizi esterni:
TASK-153 AdMob vero, 237 B il merch, 312 D ed E (le attività da Apple Salute e
Health Connect con la build nativa, gli accordi con Garmin, Suunto, Coros,
Komoot). Idee approvate e mai partite: 279 B
frasi a penna alzata, 282 il percorso dove sta la figura, 305 il
pianificatore del parapendio, 311 C e D parole scritte meglio, 336 video
nei post, 339 E «Draw» e il risultato col look nuovo, 341 badge sul
profilo, 345 calorie e battito nel Feed, 348 B–D il compositore del post,
384 «MuW Style», 427.

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
