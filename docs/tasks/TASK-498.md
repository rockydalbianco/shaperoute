# TASK-498 — La chat aperta chiede solo i messaggi nuovi

**Stato**: Done · 2026-11-27 · A (server) #1610 in `main` (`ab9ccd47`),
sul server col passo 25 del Coordinatore (`847f237e`); B (app) #1634 in
`main` (`6f168e37`), nell'OTA 27 (parola del Coordinatore). **Esito**: un
controllo della conversazione aperta senza novità passa da 9 283 byte e 8
query a 104 byte e 3 query (database di prova); il ritmo rallenta nel
silenzio come ha scelto l'utente; una risposta uguale non ridisegna.
Non provata su telefono né simulatore; tempi sul server vero, byte e
batteria sul telefono non misurati
**Fase**: 5 · **Branch**: `feat/TASK-498-a-message-news` (A, server), poi
`feat/TASK-498-b-chat-reads-news` (B, app)
**Dipende da**: TASK-319 (i messaggi, ADR-0279), TASK-458 (in `main`,
#1519: ha toccato la stessa schermata)
**ADR**: aggiunta ad ADR-0279 (sì del Coordinatore, 2026-11-26) ·
numero del task dal Coordinatore il 2026-11-23

## Obiettivo

Punto O8 della lettura del codice del 2026-11-23
(`out/prova-app-2026-11-23/PROPOSTE.md` del Mac, fuori da git; l'utente:
«Sì, tutte»; avviata con «Avvia la 498» il 2026-11-26).

- Una conversazione aperta riscarica **ogni 5 s** la sua ultima pagina
  intera, con la foto dell'altro, anche quando nessuno scrive.
- A ogni risposta la schermata viene ridisegnata, anche se è uguale.

Si chiede solo quello che è nuovo, si rallenta quando la conversazione
tace, non si ridisegna se non è cambiato niente. **Niente WebSocket**
(ADR-0279, alternative scartate; ADR-0381 punto 6): resta una richiesta
HTTP ogni tanto.

## Riverificato su `origin/main` (`c33f3920`, 2026-11-26)

- `apps/mobile/src/messages/ConversationScreen.tsx`:
  `CONVERSATION_EVERY_MS = 5_000` (riga 68); l'effetto delle righe 241–331
  chiama `fetchMessages(…, null)` all'apertura, ogni 5 s con l'app in primo
  piano (`setInterval`) e al ritorno nell'app; a ogni risposta `setShown`
  riceve un oggetto nuovo (righe 278–298), quindi la schermata e la lista
  si ridisegnano sempre. `merged` (righe 152–164) mette la pagina sopra i
  messaggi tenuti: dentro quello che la pagina copre un messaggio che non
  c'è più sparisce.
- `services/api/shaperoute_api/messages.py`, `Messages.page` (righe
  948–999): chi è l'altro (`_account`), il blocco (`_apart`), la sua riga
  con la foto (`_person_of`), lo stato (`_state`: da 2 a 5 query), la
  propria riga (`_member`), i messaggi; più le schede dei post e delle live
  se la pagina ne ha. La pagina è di 20 messaggi (`PAGE_SIZE`).
- La chat **non ha** modifiche ai messaggi, conferme di lettura né
  reazioni: un messaggio si può solo cancellare (chi l'ha scritto, per
  tutti e due) o nascondere a chi l'ha ricevuto (una segnalazione).

## Il disegno

### A, server (un'aggiunta: la chiamata di oggi non cambia)

- `GET /conversations/{public_id}/messages`, la prima pagina, porta un
  campo in più: **`latest`**, il posto del messaggio più nuovo
  (`microsecondi-uuid`, come `next`; `0-000…0` in una conversazione
  vuota; `null` nelle pagine dei più vecchi). Un'app di prima lo ignora.
- `GET /conversations/{public_id}/messages?after=<latest>` risponde
  **`MessageNews`**: `state`, `messages` (solo quelli dopo `after`, il più
  nuovo per primo, con gli stessi allegati e le stesse regole di chi
  legge), `more` (ce n'erano più di una pagina: si rilegge la prima
  pagina) e il `latest` nuovo. Niente `person`, niente `attachments`.
  Con niente di nuovo: circa cento byte e **due query** oltre a quella del
  token (chi è l'altro, il blocco e le due righe della conversazione in una
  sola; i messaggi dopo `after`). Lo stato è `open` senza altre query
  quando l'altro ha già accettato; negli altri casi (una richiesta) passa
  dalla stessa `_state` della pagina.
- `after` insieme a `cursor`: `422`. `404` e `422` come per la pagina
  (nessuno, un blocco, se stessi). Nessuna migrazione, nessun indice
  nuovo: i messaggi dopo un posto usano l'indice che la pagina usa già.

### B, app

- La schermata tiene il `latest` dell'ultima risposta e chiede
  `?after=`. La **pagina intera** resta: all'apertura, al ritorno
  nell'app, **una volta al minuto** mentre la conversazione è aperta, e
  subito quando la risposta corta dice uno `state` diverso o `more`.
- **Un server di prima** non manda `latest`: l'app non chiede mai
  `?after=` e legge la pagina ogni volta, come oggi. Per questo la B non
  aspetta il passo sul server (come la B di TASK-499): è la A a dover
  essere in `main` per fissare il contratto.
- **Il ritmo**: 5 s finché ci si scrive; dopo un po' di silenzio più
  lento; torna a 5 s quando arriva un messaggio, quando se ne manda uno,
  al ritorno nell'app. I numeri del ritmo lento li ha scelti l'utente
  (sotto): 15 s dopo un minuto di silenzio, 30 s dopo cinque.
- **Niente ridisegno**: una risposta che non cambia niente lascia lo
  stato di React com'è (lo stesso oggetto), e ogni messaggio che non è
  cambiato resta lo stesso oggetto. Misurato nel test con `Profiler`:
  dodici risposte uguali di fila danno al più un passaggio di React (il
  suo controllo dopo l'ultimo cambio vero, senza ridisegnare le righe),
  poi nessuno; prima erano dodici ridisegni.
- **Una pagina in risposta a `?after=`** (il server tornato a una
  versione di prima) si legge come pagina.
- **Dove sta**: il ritmo e le due funzioni che dicono cosa tenere dopo
  una risposta sono in `messages/conversationReading.ts`, senza React; la
  schermata tiene solo il timer.

### Cosa arriva con la risposta corta e cosa con la pagina intera

| Cosa | Come arriva | Entro |
|---|---|---|
| Un messaggio nuovo (dell'altro, o proprio da un altro telefono) | `?after=` | il ritmo (5 s) |
| Lo stato (richiesta accettata, in attesa) | `?after=` porta `state`; se cambia, pagina intera subito | il ritmo |
| Un blocco, un account cancellato | `?after=` risponde `404` | il ritmo |
| Un messaggio **cancellato dall'altro** o nascosto da una segnalazione | pagina intera | 1 minuto (oggi 5 s) |
| Foto e nome dell'altro | pagina intera | 1 minuto (oggi 5 s) |
| Schede di un post o di una live in un messaggio già mostrato («no longer available», «Live ended»), video scaduto | pagina intera | 1 minuto (oggi 5 s) |
| Cosa si può allegare (`attachments`) | pagina intera | 1 minuto, o subito se cambia lo stato |
| Il pallino dei non letti | invariato: `PUT …/read` quando arriva un messaggio dell'altro, poi `recount` | — |

Modifiche, conferme di lettura e reazioni: la chat non le ha.

**Due messaggi nello stesso istante**: un messaggio scritto un attimo
prima ma salvato un attimo dopo quello già letto resta dietro `latest` e
non arriva con `?after=`; lo porta la pagina intera, entro un minuto.

## Scelte

- **Prodotto, dell'utente** (2026-11-26, «Sì, va bene»): il ritmo dopo
  il silenzio è **5 s; dopo 1 minuto senza messaggi 15 s; dopo 5 minuti
  30 s**; torna a 5 s quando arriva un messaggio, quando se ne manda uno,
  al ritorno nell'app. Quello che la risposta corta non porta (tabella
  sopra) arriva entro un minuto invece che entro 5 s. In una chat aperta
  e ferma un messaggio può quindi comparire fino a 15 s dopo (30 s dopo
  cinque minuti di silenzio); la push arriva come sempre.
- **Tecniche, decise dall'agente su delega dell'utente**: `?after=` sulla
  stessa rotta e non una rotta nuova (un server di prima ignora il
  parametro e risponde la pagina: nessun `404` da distinguere da una
  conversazione sparita); il posto lo dà il server (`latest`) e l'app non
  lo calcola dalle date; la B ripiega da sola su un server di prima.

## File toccati

- A: `services/api/shaperoute_api/messages.py`,
  `services/api/tests/test_message_news.py` (nuovo),
  `packages/shared-types/src/index.ts`,
  `packages/shared-types/fixtures/message-news.json` (nuovo),
  `packages/shared-types/fixtures/messages.json` e
  `packages/shared-types/fixtures/message-attachments.json` (il campo
  `latest`: `test_messages.py` vuole negli esempi tutti i campi della
  pagina),
  `packages/shared-types/test/message-news.test.ts` (nuovo),
  `docs/API.md`, `docs/tasks/TASK-498.md` (nuovo).
- B: `apps/mobile/src/api/messages.ts` e il suo test
  (`messages.test.ts`), `apps/mobile/src/messages/ConversationScreen.tsx`
  e `ConversationScreen.test.tsx` (le attese sugli indirizzi, ora che
  l'esempio ha `latest`),
  `apps/mobile/src/messages/conversationReading.ts` (nuovo) e
  `conversationReading.test.ts` (nuovo),
  `apps/mobile/src/messages/ConversationReading.test.tsx` (nuovo),
  `docs/UI.md`, `docs/tasks/TASK-498.md`.
- Chiusura (PR di soli documenti): `docs/STATUS.md`,
  `docs/archive/COMPLETATI.md`, `docs/DECISIONS.md`, questo file.

## Criteri di accettazione

- [x] A: la chiamata di oggi risponde come prima, con `latest` in più.
- [x] A: `?after=` porta solo i messaggi dopo quel posto; niente di nuovo,
  `messages: []` e lo stesso `latest`; due query oltre a quella del token.
- [x] A: lo `state` della risposta corta è quello della pagina in ogni
  caso (`first`, `waiting`, `request`, `open`).
- [x] A: chi non è nella conversazione non ne legge i messaggi; `404` per
  nessuno e attraverso un blocco, `401` senza token, `422` per un `after`
  scritto male o insieme a `cursor`.
- [x] A: esempio e tipo in `shared-types`; `docs/API.md`.
- [x] B: il posto avanza a ogni risposta; la pagina intera una volta al
  minuto, all'apertura e al ritorno nell'app.
- [x] B: il ritmo rallenta dopo il silenzio e torna a 5 s con un messaggio
  nuovo, mandandone uno, al ritorno nell'app (timer finti).
- [x] B: una risposta uguale non ridisegna.
- [x] B: con un server di prima (niente `latest`) la pagina ogni volta,
  come oggi.
- [x] Nessuna dipendenza nuova, nessun file nativo, `app.config.ts` non
  toccato (dal diff delle due PR).
- [ ] Impronta iOS (`5e1b5ce5`) ricalcolata: **non fatto** (vuole
  `npm ci` su una copia pulita, col turno del Coordinatore); la B è
  uscita con l'OTA 27 sul runtime di prima.

## Misure

Sul Mac, il 2026-11-26, API di prova (`TestClient`) su un PostgreSQL in un
container, con `out/TASK-498/misura_498.py` (fuori da git; si copia in
`services/api/tests/` per girare e poi si toglie): una conversazione
`open` di 30 messaggi di testo (una settantina di caratteri l'uno), l'altro
con una foto del profilo **finta** (colori sfumati e rumore, per pesare
come una vera: 5 104 caratteri in base64). L'app chiede come sul telefono
(`?with=attachments`, `X-MuW-Reads` con `post` e `live`).

| Un controllo della conversazione aperta | Prima (la pagina) | Dopo (`?after=`, niente di nuovo) | Dopo (`?after=`, un messaggio nuovo) |
|---|---|---|---|
| Risposta, com'è | 9 283 byte | 104 byte | 266 byte |
| Risposta, con gzip | 4 998 byte | 104 byte (sotto il kilobyte non si comprime) | 266 byte |
| Query della richiesta | 8 (1 del token + 7) | 3 (1 del token + 2) | 3 |

La pagina intera, che resta una volta al minuto, pesa 61 byte in più per
`latest` (9 344 byte, 5 027 con gzip) e fa le stesse 8 query.

Le 8 query di oggi: il token; l'id dell'altro; il blocco; la riga
dell'altro con la foto; tre volte `conversation_members` (due in `_state`,
una per la pagina); i messaggi. Con un post o una live nella pagina, una
in più per tipo.

In un'ora di conversazione aperta e ferma, oggi: 720 controlli, circa
3,6 MB con gzip e 5 760 query. Con il ritmo proposto (5 s, poi 15 s dopo
un minuto, poi 30 s dopo cinque) e la pagina intera una volta al minuto:
138 controlli, di cui 60 pagine intere — circa 0,31 MB e 714 query
(60 × 5 027 byte e 8 query, 78 × 104 byte e 3 query): dodici volte meno
byte, otto volte meno query. Mentre ci si scrive, ogni minuto: una pagina
e undici controlli corti invece di dodici pagine.

- **Non misurato**: i tempi sul server vero. Qui ogni chiamata apre una
  connessione nuova e il Mac era carico: le mediane di 30 chiamate (185 ms
  la pagina, 226 ms il controllo corto) sono rumore, non dicono quale è
  più veloce né quanto ci mette la produzione. Nemmeno il piano della
  query nuova su tabelle grandi (cerca per `users.public_id` e per la
  coppia `conversation_members (user_id, other_id)`, tutte e due con un
  indice unico); i byte e la batteria sul telefono; quanto
  costa il ridisegno della lista; le foto vere degli utenti; una pagina
  con foto, video, post o live nei messaggi (pesa di più di questa).

## Controlli dopo il passo sul server (parte A)

Nessuna migrazione, nessuna variabile nuova, niente da riavviare oltre
all'API. Prima del passo, che lo SHA abbia la parte A:

```
git show $SHA:services/api/shaperoute_api/messages.py | grep -c 'def news'    # 1
```

Dopo, con la chiave dell'API (`$KEY`), il token di un account di prova
(`$TOKEN`) e il `public_id` di un altro account (`$OTHER`) con cui ha, o
non ha ancora, una conversazione:

```
H='-H "X-API-Key: $KEY" -H "Authorization: Bearer $TOKEN"'
U=http://127.0.0.1:8000/conversations/$OTHER/messages
# 1. La pagina di sempre: 200, con `person` e in più `latest` (una stringa).
curl -s $H "$U?with=attachments" | python3 -c 'import json,sys; b=json.load(sys.stdin); print(sorted(b)); print(b["latest"])'
#    attesi: ['attachments', 'latest', 'messages', 'next', 'person', 'state'] e un posto «numero-32 cifre esadecimali»
# 2. Solo i nuovi dopo quel posto ($LATEST = il valore stampato sopra): 200, corta, senza `person`.
curl -s $H "$U?with=attachments&after=$LATEST"
#    attesa: {"state":"…","messages":[],"more":false,"latest":"$LATEST"}
# 3. `after` insieme a `cursor`: 422.
curl -s -o /dev/null -w "%{http_code}\n" $H "$U?after=$LATEST&cursor=$LATEST"
# 4. Senza token: 401 come prima.
curl -s -o /dev/null -w "%{http_code}\n" -H "X-API-Key: $KEY" "$U?after=$LATEST"
```

Un'app di oggi non chiede mai `?after=`: per lei cambia solo il campo in
più nella pagina, che ignora. Tornare indietro è sicuro: l'app nuova senza
`latest` legge la pagina come oggi.

## Cronologia

- 2026-11-26: riverificato su `c33f3920`, misura del «prima», disegno,
  lista dei file al Coordinatore (fork 3): sì ai file di A e B (compresi
  `shared-types/src/index.ts`, i due esempi e il test della schermata),
  aggiunta ad ADR-0279 senza numero nuovo. L'utente sul ritmo: «Sì, va
  bene» (5 s, 15 s dopo un minuto, 30 s dopo cinque). Parte A scritta e
  misurata; in locale `test_message_news.py` (11 test) verde, il resto
  alla CI. #1610 armata dal Coordinatore a `9fcb301b`; il passo sul
  server è suo, col sì dell'utente.
- 2026-11-26, sera: parte B scritta sul branch
  `feat/TASK-498-b-chat-reads-news`. In locale: `tsc`, eslint, prettier,
  jest di tutta la chat (20 file, 162 test: i nuovi
  `conversationReading.test.ts` e `ConversationReading.test.tsx`, con i
  timer finti, e gli altri che leggono l'esempio con `latest`). Resta: la
  PR quando la A è in `main`, «pronta» a CI verde, l'OTA (Coordinatore),
  la PR dei documenti di chiusura.
- 2026-11-26: la A (#1610) in `main` (`ab9ccd47`). `main` unito nel branch
  della B senza conflitti, `tsc` e i quattro file di test toccati verdi
  (25 test); #1634 aperta a `e6f6b711`, in `main` con `6f168e37`.
- 2026-11-27: il Coordinatore: la A «sul server» (passo 25, `847f237e`,
  che contiene `ab9ccd47`) e la B nell'OTA 27. I controlli del passo sono
  suoi; da questa sessione il server non è stato toccato né letto.
  Documenti di chiusura: aggiunta ad ADR-0279 in `docs/DECISIONS.md`, riga
  in `docs/archive/COMPLETATI.md`, questo file a `Done`. `docs/STATUS.md`
  non toccato: il task non vi aveva una voce.

## Dopo la chiusura

Niente aspetta l'utente. Chi vuole guardare: con l'OTA 27, in una chat
aperta un messaggio dell'altro arriva entro 5 s mentre ci si scrive, entro
15 s dopo un minuto di silenzio, entro 30 s dopo cinque; un messaggio
cancellato dall'altro sparisce entro un minuto. Restano non misurati i
tempi e il piano della query sul server vero, i byte e la batteria su un
telefono.
