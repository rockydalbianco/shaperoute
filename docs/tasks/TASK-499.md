# TASK-499 — La campanella chiede solo il numero

**Stato**: Done · 2026-11-26 · A (server) #1583, sul server col passo 23
del 2026-11-26; B (app) #1584 in `main`. **Esito**: un controllo della
campanella passa da 159 906 byte e 3 query a 13 byte e 1 query (database
di prova); la riga dei «live» non chiede con l'app dietro. Resta l'OTA di
produzione (Coordinatore, col sì dell'utente): fino ad allora i telefoni
usano ancora la lista
**Fase**: 5 · **Branch**: `feat/TASK-499-a-bell-unread-count` (A, server),
poi `feat/TASK-499-b-bell-count-app` (B, app)
**Dipende da**: TASK-367 parte C (la campanella, ADR-0311), TASK-468 (la
riga dei «live», ADR-0381)
**ADR**: aggiunta ad ADR-0311 · numero del task dal Coordinatore il
2026-11-23

## Obiettivo

Punto O9 (gruppo D) della lettura del codice del 2026-11-23
(`out/prova-app-2026-11-23/PROPOSTE.md` del Mac, fuori da git; l'utente:
«Sì, tutte»). **Visto nel codice, non misurato sul telefono.**

- La campanella dell'header scarica una pagina intera di notifiche (30
  righe, ognuna con la foto da 128 px di chi ha agito) ogni 5 minuti e a
  ogni ritorno nell'app, e ne tiene solo `unread`.
- La riga dei «live» del Feed chiede ogni 60 s anche con l'app dietro.

Nessuna scelta di prodotto: l'utente non vede differenze nel bollino. I
periodi non si toccano (5 minuti, ADR-0311; 60 s, ADR-0381): si alleggerisce
la risposta.

## Riverificato su `origin/main` (`3e740931`, 2026-11-24)

- `apps/mobile/src/bell/bellDoor.ts`, `useBellOf`: `fetchNotifications(
  baseUrl, token, null)` all'avvio, ogni `BELL_EVERY_MS` (5 minuti) con
  l'app in primo piano, al ritorno e alla chiusura della lista; della
  risposta usa solo `unread`.
- `services/api/shaperoute_api/notification_list.py`, `page`: tre query
  (la lingua, la pagina, il conto). `shown_sql` gira due volte, e porta
  `PERSON_COLUMNS` (`p.jpeg`, la foto) per ogni riga.
- `apps/mobile/src/liveShare/useLives.ts`: `setInterval` ogni
  `ROW_EVERY_MS` senza `AppState`; `messages/messagesDoor.ts` e
  `social/followRequests.ts` si fermano con l'app dietro.

## Il disegno

**A, server.** `GET /notifications/unread` → `200` `{"unread": n}`
(`NotificationsUnread`, `fixtures/notifications-unread.json`). Una query
sola: le stesse regole della lista (`shown_sql`: blocchi, account nascosti,
90 giorni, quello che non è più vero, i disegni che l'app non legge), senza
la lingua, senza le foto e senza i testi. Le regole stanno in un pezzo solo
di SQL, usato dalla lista e dal conto: non possono divergere. `GET
/notifications` resta com'è (porta ancora `unread`: l'app di oggi lo legge).

Perché una rotta e non `?limit=0` sulla lista: la risposta ha un tipo suo
(niente `notifications: []` e `before: null` che non dicono il vero), nel
registro delle richieste si distingue dalla lista, e un server di prima
risponde `404`, che l'app sa già leggere.

**B, app.** `useBellOf` chiede `GET /notifications/unread`; con un `404`
(un server di prima) ripiega su `GET /notifications` come oggi, e per quel
token non richiede più il numero. La lista intera si scarica solo aprendo
le notifiche (`BellOverlay`, invariato). `useLives`: stesso controllo di
`AppState` degli altri bollini (niente richiesta con l'app dietro, una al
ritorno).

## File toccati

- A: `services/api/shaperoute_api/notification_list.py`,
  `services/api/tests/test_notification_unread.py` (nuovo),
  `packages/shared-types/src/index.ts`,
  `packages/shared-types/fixtures/notifications-unread.json` (nuovo),
  `packages/shared-types/test/notifications.test.ts`, `docs/API.md`,
  `docs/tasks/TASK-499.md` (nuovo).
- B: `apps/mobile/src/api/notificationList.ts` e il suo test,
  `apps/mobile/src/bell/bellDoor.ts`, `apps/mobile/src/bell/Bell.test.tsx`,
  `apps/mobile/src/bell/BellInApp.test.tsx`,
  `apps/mobile/src/liveShare/useLives.ts`,
  `apps/mobile/src/liveShare/useLives.test.ts` (nuovo),
  `docs/tasks/TASK-499.md`.
- Chiusura (PR di soli documenti): `docs/STATUS.md`,
  `docs/archive/COMPLETATI.md`, `docs/DECISIONS.md`, questo file.

## Criteri di accettazione

- [x] A: il numero di `GET /notifications/unread` è uguale a `unread` di
  `GET /notifications` negli stessi casi (blocco, 90 giorni, quello che non
  è più vero, lette e non lette, più di una pagina).
- [x] A: una query sola per richiesta, e nessuna foto nella risposta.
- [x] A: `401` senza token; esempio e tipo in `shared-types`; `docs/API.md`.
- [x] B: per il bollino la campanella non chiama più la lista.
- [x] B: con un server di prima (`404`) ripiega sulla lista, come oggi.
- [x] B: la riga dei «live» non chiede con l'app dietro e riprende al
  ritorno.
- [x] Impronta iOS invariata (`5e1b5ce5`), nessuna dipendenza nuova
  (dal diff: solo JavaScript; l'impronta non è stata ricalcolata).

## Misure

Sul Mac, il 2026-11-25, API di prova (`TestClient`) su un PostgreSQL in
un container, con `out/TASK-499/misura_499.py` del checkout principale
(fuori da git): un account con 30 notifiche non lette, di 30 account
diversi, ognuno con una foto del profilo **finta** (colori sfumati e
rumore, per pesare come una foto vera: 4,8–5,2 KB in base64 a 128 px).

| Un controllo della campanella | Prima (`GET /notifications`) | Dopo (`GET /notifications/unread`) |
|---|---|---|
| Risposta, com'è | 159 906 byte | 13 byte |
| Risposta, con gzip | 97 726 byte | 13 byte |
| Query della campanella | 3 (lingua, pagina, conto) | 1 (conto) |

- La stima dal codice era 150–250 KB: confermata nella parte bassa, con
  queste foto. Il base64 di un JPEG si comprime poco: gzip toglie il 39%.
- Alle query della campanella si aggiungono, uguali prima e dopo, quelle
  che riconoscono l'account dal token.
- **Non misurato**: i tempi sul server vero (qui ogni chiamata apre una
  connessione nuova e il Mac era carico: mediana di 20 chiamate 259 ms la
  pagina, 169 ms il numero, che dice solo quale pesa di più); il piano
  della query su una tabella grande; i byte e la batteria sul telefono; le
  foto vere degli utenti.
- Anche il conto dentro `GET /notifications` usa ora la query leggera: la
  lista aperta fa sempre 3 query, ma il conto non tocca più le foto.

## Idee per dopo (fuori da questa task)

- **Una chiamata sola per i tre bollini** (messaggi, richieste di follow,
  campanella): oggi sono tre richieste a periodi diversi.
- **Le foto come indirizzo** (`avatar_url`) nelle liste (notifiche,
  follower, conversazioni) al posto del base64 in ogni riga: la lista
  aperta peserebbe molto meno e le foto si terrebbero nella cache del
  telefono (TASK-497 lo fa per i commenti).

## Cronologia

- 2026-11-24: riverificato, lista dei file al Coordinatore (fork 3): sì
  ai file di A e B, aggiunta ad ADR-0311 senza ADR nuovo.
- 2026-11-25: A = #1583 in `main` (`bd61af6c`), unita dal Coordinatore a CI
  verde dopo #1582 (TASK-497 A, stessi file condivisi). Misura fatta.
  Resta: il passo sul server (Coordinatore, col sì dell'utente), la B, poi
  l'OTA (Coordinatore) e la PR dei documenti di chiusura.
- 2026-11-26: l'utente, alla domanda «Apro la PR B adesso, senza aspettare
  il passo sul server?»: «Sì, apri la B». B = #1584 (`870afb0c`). Lo
  stesso giorno il Coordinatore fa il passo 23 (`bd61af6c`): la A è sul
  server (salute ok, la rotta nel codice che gira). B in `main`, unita dal
  Coordinatore a CI verde. Documenti di chiusura: aggiunta ad ADR-0311,
  riga nei completati.

## Cosa resta dopo la chiusura

- **OTA di produzione** con la B: del Coordinatore, col sì dell'utente.
- **Sul telefono** non c'è niente di nuovo da vedere (il bollino è
  uguale). L'impronta iOS non è stata ricalcolata: la B tocca solo
  JavaScript e nessuna dipendenza.
- **Non misurato**, se un giorno serve: i tempi di `GET
  /notifications/unread` sul server vero e i byte sul telefono.
