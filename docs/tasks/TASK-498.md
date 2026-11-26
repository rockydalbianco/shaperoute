# TASK-498 — La chat aperta chiede solo i messaggi nuovi

**Stato**: In lavorazione · 2026-11-26 · misura fatta, disegno scritto;
lista dei file al Coordinatore, ritmo lento chiesto all'utente
**Fase**: 5 · **Branch**: `feat/TASK-498-a-message-news` (A, server), poi
`feat/TASK-498-b-chat-reads-news` (B, app)
**Dipende da**: TASK-319 (i messaggi, ADR-0279), TASK-458 (in `main`,
#1519: ha toccato la stessa schermata)
**ADR**: da chiedere al Coordinatore (proposta: aggiunta ad ADR-0279) ·
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
  al ritorno nell'app. I numeri del ritmo lento sono la scelta chiesta
  all'utente (sotto).
- **Niente ridisegno**: una risposta che non cambia niente lascia lo
  stato di React com'è (lo stesso oggetto).

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

- **Prodotto, dell'utente** (chiesta il 2026-11-26): il ritmo dopo il
  silenzio. Proposta: 5 s; dopo 1 minuto senza messaggi 15 s; dopo 5
  minuti 30 s. E che quello che la risposta corta non porta (tabella
  sopra) arrivi entro un minuto invece che entro 5 s.
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
  `packages/shared-types/test/message-news.test.ts` (nuovo),
  `docs/API.md`, `docs/tasks/TASK-498.md` (nuovo).
- B: `apps/mobile/src/api/messages.ts` e il suo test
  (`messages.test.ts`), `apps/mobile/src/messages/ConversationScreen.tsx`,
  `apps/mobile/src/messages/conversationReading.ts` (nuovo) e
  `conversationReading.test.ts` (nuovo),
  `apps/mobile/src/messages/ConversationReading.test.tsx` (nuovo),
  `docs/UI.md`, `docs/tasks/TASK-498.md`.
- Chiusura (PR di soli documenti): `docs/STATUS.md`,
  `docs/archive/COMPLETATI.md`, `docs/DECISIONS.md`, questo file.

## Criteri di accettazione

- [ ] A: la chiamata di oggi risponde come prima, con `latest` in più.
- [ ] A: `?after=` porta solo i messaggi dopo quel posto; niente di nuovo,
  `messages: []` e lo stesso `latest`; due query oltre a quella del token.
- [ ] A: lo `state` della risposta corta è quello della pagina in ogni
  caso (`first`, `waiting`, `request`, `open`).
- [ ] A: chi non è nella conversazione non ne legge i messaggi; `404` per
  nessuno e attraverso un blocco, `401` senza token, `422` per un `after`
  scritto male o insieme a `cursor`.
- [ ] A: esempio e tipo in `shared-types`; `docs/API.md`.
- [ ] B: il posto avanza a ogni risposta; la pagina intera una volta al
  minuto, all'apertura e al ritorno nell'app.
- [ ] B: il ritmo rallenta dopo il silenzio e torna a 5 s con un messaggio
  nuovo, mandandone uno, al ritorno nell'app (timer finti).
- [ ] B: una risposta uguale non ridisegna.
- [ ] B: con un server di prima (niente `latest`) la pagina ogni volta,
  come oggi.
- [ ] Impronta iOS invariata (`5e1b5ce5`), nessuna dipendenza nuova.

## Misure

Sul Mac, il 2026-11-26, API di prova (`TestClient`) su un PostgreSQL in un
container, con `out/TASK-498/misura_498.py` (fuori da git; si copia in
`services/api/tests/` per girare e poi si toglie): una conversazione
`open` di 30 messaggi di testo (una settantina di caratteri l'uno), l'altro
con una foto del profilo **finta** (colori sfumati e rumore, per pesare
come una vera: 5 104 caratteri in base64). L'app chiede come sul telefono
(`?with=attachments`, `X-MuW-Reads` con `post` e `live`).

| Un controllo della conversazione aperta | Prima (la pagina) | Dopo (`?after=`, niente di nuovo) |
|---|---|---|
| Risposta, com'è | 9 283 byte | da misurare con la A |
| Risposta, con gzip | 4 998 byte | da misurare con la A |
| Query della richiesta | 8 (1 del token + 7) | attese 3 (1 del token + 2) |

Le 8 query di oggi: il token; l'id dell'altro; il blocco; la riga
dell'altro con la foto; tre volte `conversation_members` (due in `_state`,
una per la pagina); i messaggi. Con un post o una live nella pagina, una
in più per tipo.

In un'ora di conversazione aperta e ferma, oggi: 720 controlli, circa
3,6 MB con gzip e 5 760 query. Con il ritmo proposto (5 s, poi 15 s dopo
un minuto, poi 30 s dopo cinque) e la pagina intera una volta al minuto:
138 controlli, di cui 60 pagine intere — circa 0,3 MB e 700 query
(stima, da rifare con i numeri veri della A).

- **Non misurato**: i tempi sul server vero (qui ogni chiamata apre una
  connessione nuova: mediana di 30 chiamate 200 ms, che non dice quanto
  ci mette la produzione); i byte e la batteria sul telefono; quanto
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
  lista dei file al Coordinatore (fork 3), domanda sul ritmo all'utente.
