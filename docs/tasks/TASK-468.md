# TASK-468 — La live in chat e nel Feed, anche programmata

**Stato**: In corso · parte 0, A1a, A2a, A1b sul server (passi 11 e 12);
B1 (app) in `main` (#1275, `875f754b`), esce con un OTA col sì dell'utente;
prossime A2b (push «Remind me») e B2 (il Feed)
**Fase**: 5 · **Branch**: `docs/TASK-468-live-chat-feed` (parte 0) ·
**ADR**: ADR-0381 · numeri dal Coordinatore (2026-11-12)
**Estende**: TASK-424 (ADR-0352, «Share live activity»), che metteva fuori
scope «vedere dal vivo nell'app gli amici che corrono».

## Obiettivo

Chiesto dall'utente il 2026-11-12: «il live tracking deve poter essere
inviato in tutte le attività sulla chat dell'app anche oltre a creare il
link e se si vuole si può creare l'attività in anticipo e la gente può
seguirti dal feed ad esempio se è una gara… dev'essere l'utente a
deciderlo».

1. **In chat**: da ogni attività, «Share live» manda la live anche a una o
   più persone nella chat dell'app, oltre al link di TASK-424.
2. **Nel Feed**: una live si può mettere nel Feed, al momento o
   **programmata in anticipo** (una gara), e la gente la segue dal Feed.
3. **Decide sempre l'utente**: niente parte da solo.

## Scelte di prodotto dell'utente (2026-11-12, una domanda alla volta)

1. **Chi vede una live nel Feed** — «Scelta per ogni live»: alla creazione
   si sceglie fra follower e tutti (pubblica, come un post).
2. **Cosa arriva in chat** — «Scheda + mappa nell'app»: una scheda «LIVE ·
   Running · 3,2 km» con push («Anna is sharing a live activity with
   you»); il tocco apre una schermata dal vivo nativa (mappa, posizione,
   percorso fatto, dati, «Finished»), la stessa che si apre dal Feed.
   «Send in MuW» sceglie una o più persone.
3. **Come parte una live programmata** — «Tutte e due»: avviando la
   registrazione vicino all'ora prevista (da 1 ora prima a 3 ore dopo, con
   lo stesso sport) un foglio chiede «Start live “Milano Marathon”?» Sì/No;
   e sulla scheda della live (profilo, Feed) un pulsante «Start live» apre
   la registrazione. Mai da sola.
4. **Cosa vede chi segue da Feed o chat** — «Battito a scelta, spento»:
   posizione esatta, distanza, tempo, passo o velocità, dislivello,
   calorie; il battito solo se lo si accende per quella live (spento di
   partenza). Il link di TASK-424 resta com'è.
5. **Alla fine** — «Diventa il post»: la scheda della live nel Feed diventa
   il post dell'attività, con la conferma dell'utente al salvataggio
   (se non conferma, «Live ended» e i punti si cancellano come oggi).
6. **Live nel Feed senza programmarla** — «Sì, tre strade»: «Share live»
   durante la registrazione offre «Share link», «Send in MuW» e «Live in
   the Feed» (con la scelta follower/tutti). Programmare serve ad avvisare
   prima.
7. **La fila «Live» del Feed** — «Solo chi segui» (2026-11-12): solo le
   live proprie e di chi si segue, mai quelle di uno sconosciuto, anche
   «Tutti»; quelle si aprono dal profilo o da un link.
8. **Il testo dello stop di una live senza link** — «Sì, così»
   (2026-11-12): «Stop sharing?» con «Nobody can follow you any more.» (it
   «Nessuno potrà più seguirti.»); con un link resta «The link stops
   working now.». Entra con la parte B2.

## Proposta (da completare nella parte 0)

### Come funziona (per l'utente)

- **Programmare**: dal profilo (o da «Record»), «Plan a live»: sport, nome,
  giorno e ora, chi la vede (follower/tutti), battito sì/no, percorso
  facoltativo. Nel Feed: scheda «Live · sab 9:00 · Milano Marathon» con
  «Remind me» (push alla partenza). Si modifica o cancella fino alla
  partenza.
- **Durante**: la scheda diventa «LIVE» (pallino rosso, km, tempo) e apre la
  schermata dal vivo; chi ha chiesto «Remind me» riceve la push alla
  partenza.
- **In chat**: «Send in MuW» → elenco delle conversazioni e dei follower,
  scelta multipla → un messaggio-scheda per ciascuno, con push. Stessa
  schermata dal vivo.
- **Fine**: la scheda nel Feed diventa il post dell'attività se l'utente
  conferma al salvataggio; in chat la scheda dice «Finished» col
  riepilogo, poi «Live ended».

### Le parti (una PR ciascuna, liste dei file al Coordinatore prima)

- **A1 — Server, live a pubblico**: chi può vedere una `live_share`
  (`audience`: link / persone / follower / tutti), `GET` dal vivo con il
  token d'account per chi ne ha il diritto, battito filtrato se spento;
  messaggio di tipo live in `messages.py`; push. Migrazione.
  **Divisa in due PR** (Coordinatore, 2026-11-12), perché `messages.py`,
  `push.py` e il CHECK dell'allegato dei messaggi li tocca anche TASK-455 A
  (allegato «post»):
  - **A1a** (`feat/TASK-468-a1-live-audiences`): `live_shares.py`
    (`audience_feed`, `heart_visible`, token del link facoltativo,
    `live_share_recipients`, `GET /live-shares/{id}?after=` col token
    d'account, `POST /me/live-shares/{id}/send`), migrazione provvisoria
    `0074` (solo `live_shares` e `live_share_recipients`),
    `shared-types/src/liveShare.ts` + test + fixture
    `live-share-send-request.json`, `test_live_shares.py`, `API.md` «Live
    shares», `DATABASE.md`.
  - **A1b**, dopo TASK-455 A in `main`: l'allegato «live» in `messages.py`
    e `push.py`, la riga di `MESSAGE_ATTACHMENT_KINDS` in `index.ts` (i
    tipi nuovi in `liveShare.ts`), `messages.live_share_id` e il CHECK con
    tutti i tipi («post» compreso) in una migrazione sua,
    `message-live.json`, `test_messages.py`, `test_push.py`.
  **Criteri di A1 (coperti dai test)**: `404`, mai `403`, a chi non può
  vedere; bloccati e nascosti nei due versi; un follow tolto a metà live
  toglie la vista; una live finita, fermata o scaduta come oggi; con
  `heart_visible` spento il battito è `null` per chi guarda dall'app; al
  più 20 destinatari per invio e 20 invii al minuto; nessuna coordinata
  nei log.
- **A2 — Server, live programmate**: tabella delle live programmate,
  scheda nel Feed (`feed.py`), «Remind me», partenza che lega la
  programmata alla `live_share`, passaggio al post a fine. Migrazione.
- **B1 — App, chat**: «Send in MuW» nel foglio di «Share live», la scheda
  in chat, la schermata dal vivo nativa.
- **B2 — App, Feed**: «Plan a live», la scheda nel Feed, «Remind me»,
  «Live in the Feed», il foglio all'avvio e «Start live», il post a fine.
- **Ordine** (Coordinatore, 2026-11-12): server prima, app dopo
  (`LiveStatsBody` ha `extra="forbid"`: ogni campo nuovo vuole il server
  prima dell'app); niente OTA di produzione fino all'aggiornamento
  completo. Server e OTA col sì dell'utente, dal Coordinatore. La
  migrazione ha il numero provvisorio **0074** (quello vero è il primo
  libero al merge). B parte dopo il merge di TASK-305 R2 (#1201:
  `RunDashboard.tsx`, `liveShare/**`, `FreeRunScreen.tsx`); `feed/**` dopo
  TASK-454 A (#1195) e TASK-467 B2; `app.py` a turno, in coda dal
  Coordinatore quando c'è la lista. Niente codice prima del sì del
  Coordinatore sulla lista dei file di ogni parte.

### Testi — **approvati dall'utente il 2026-11-12** («Sì, approvo»)

In inglese nell'app, qui con l'italiano. Tedesco, francese e spagnolo
si scrivono nelle parti B1 e B2 con lo stesso senso.

Il foglio di «Share live» (accanto a «Share link» di TASK-424):

| en | it |
|---|---|
| Send in MuW | Invia su MuW |
| Live in the Feed | Live nel Feed |
| Choose who gets your live | Scegli a chi mandare la live |
| They can follow you in the app: your exact position on the map, the route so far, distance, time, pace or speed, elevation gain and calories. | Ti seguono nell'app: la tua posizione esatta sulla mappa, il percorso fatto, distanza, tempo, passo o velocità, dislivello e calorie. |
| Show my heart rate | Mostra il mio battito |
| Off: nobody sees your heart rate. On: they see it when a watch sends it. | Spento: nessuno vede il tuo battito. Acceso: lo vedono quando un orologio lo manda. |
| Who can follow | Chi può seguirti |
| Followers · Everyone | Follower · Tutti |
| Send ({count}) | Invia ({count}) |
| Go live | Vai live |

In chat e nelle push:

| en | it |
|---|---|
| LIVE · {sport} · {distance} | LIVE · {sport} · {distance} |
| {name} is sharing a live activity with you | {name} ti condivide un'attività dal vivo |
| {name} is live: {title} | {name} è live: {title} |
| Finished · {distance} · {time} | Finita · {distance} · {time} |
| Live ended | Live finita |
| Updated {seconds} s ago | Aggiornato {seconds} s fa |
| No update since {time} | Nessun aggiornamento dalle {time} |

La live programmata:

| en | it |
|---|---|
| Plan a live | Programma una live |
| Name (e.g. Milano Marathon) | Nome (es. Milano Marathon) |
| Day and time | Giorno e ora |
| Live · {day} {time} · {title} | Live · {day} {time} · {title} |
| Remind me | Avvisami |
| We'll notify you when it starts. | Ti avvisiamo quando parte. |
| Start live "{title}"? | Avviare la live «{title}»? |
| Your followers can follow you now. / Everyone can follow you now. | I tuoi follower possono seguirti adesso. / Tutti possono seguirti adesso. |
| Start live | Avvia la live |
| Not this time | Non stavolta |
| Delete this live? | Cancellare questa live? |
| Post it in the Feed? (a fine attività) | Pubblicarla nel Feed? |
| Your live becomes the post of this activity. | La tua live diventa il post di questa attività. |
| Post · Don't post | Pubblica · Non pubblicare |

Privacy dell'app (`about/content`, voce «Your position»), frase in più:

| en | it |
|---|---|
| When you choose to go live in the Feed or send a live in chat, the people you choose (your followers, everyone, or the people you pick) see your exact position, the route so far and your activity data while you record, and your heart rate only if you turn it on for that live. Positions are deleted one hour after you finish, unless you post the activity. | Quando scegli di andare live nel Feed o di mandare una live in chat, le persone che scegli (i tuoi follower, tutti, o chi indichi) vedono la tua posizione esatta, il percorso fatto e i dati dell'attività mentre registri, e il battito solo se lo accendi per quella live. Le posizioni si cancellano un'ora dopo la fine, a meno che tu pubblichi l'attività. |

### Da decidere ancora

- **Privacy** (Coordinatore, 2026-11-12): la posizione dal vivo mostrata
  a follower, a tutti o in chat è un dato nuovo che esce verso altre
  persone. Una frase nella privacy dell'app (`about/content`) e del sito
  (`site/privacy`, a turno dopo la #1200): la frase dell'app è approvata
  con i testi (2026-11-12); App Privacy e Data safety da rivedere, col sì
  dell'utente, prima dell'OTA di B. Ogni live si accende con una scelta
  esplicita, mai da sola.
- Tecnica: in ADR-0381 (proposta). Restano da fissare nelle parti A:
  aggiornamento della schermata dal vivo (polling come la
  pagina web, 10 s), limiti, chi vede attraverso blocchi e nascosti
  (`follows.apart_sql`), segnalazioni.

## Avanzamento

- **2026-11-12 — parte 0**: scelte, testi e ADR-0381 (proposta) in `main`
  con la #1213 (entrata con la PR unica dei documenti #1226).
- **2026-11-12 — A1a in `main`** (#1221, `9328c109`, migrazione
  `0073_live_audiences`): `audience_feed`, `heart_visible`, link
  facoltativo (`POST /me/live-shares/{id}/link`), `PATCH`, `send` verso
  `live_share_recipients`, `GET /live-shares/{id}` col token d'account.
  Criteri del Coordinatore coperti da `test_live_shares.py` (49 test).
  **Resta**: il passo sul server, il prossimo dopo l'aggiornamento completo
  del 2026-11-12, col sì dell'utente e con la riga
  `--exclude-table-data=live_share_recipients` in `deploy/backup.sh` (del
  Coordinatore: senza, il ripristino di una copia fallisce sulla chiave
  esterna). Controlli di sola lettura in `out/TASK-468/SERVER-A1a.md`.
- **2026-11-12 — A2a in `main`** (#1245, migrazione `0075_planned_lives`):
  le live programmate e `GET /lives` (la fila, scelta 7), montate da
  `install_live_shares`; sul server col passo 11 (`338e4d9b`, «server A2a
  fatto»). Controlli in `out/TASK-468/SERVER-A2a.md`. Le copie notturne
  tengono `planned_lives` e i promemoria.
- **2026-11-12 — A1a sul server** col passo 11: la riga
  `--exclude-table-data=live_share_recipients` in `deploy/backup.sh`, prova
  di ripristino riuscita.
- **2026-11-12 — A1b in `main`** (#1265, migrazione `0077_message_live`):
  l'allegato `live` nei messaggi, «Send in MuW» che manda un messaggio a
  persona, la push «{name} is sharing a live activity with you»;
  `messages.live_share_id` senza chiave esterna (le copie). Sul server col
  passo 12 (`eee85a69`, «server A1b fatto»). Controlli in
  `out/TASK-468/SERVER-A1b.md`.
- **2026-11-12 — B1 in `main`** (#1275, `875f754b`): il foglio con «Show my
  heart rate» e «Send in MuW», «Choose who gets your live», il menu di
  «Sharing live», la scheda in chat e «🔴 Live», la schermata dal vivo
  (`LiveViewScreen`, ogni 10 s). Schermate nel simulatore approvate
  dall'utente (`out/TASK-468/b1-*.png`). La schermata dal vivo è un `Modal`
  a tutto schermo come `MediaViewer`: il gesto dal bordo sinistro
  (ADR-0384) non fa nulla e si chiude con «Close» (Coordinatore,
  2026-11-12); `TabSwipeOwners.test.ts` la ammette. Esce con un OTA, col sì
  dell'utente.
- **Prossime**: A2b (la push «Remind me» alla partenza, `push.py`), B2 (il
  Feed: «Live in the Feed», «Plan a live», la fila, il testo dello stop
  della scelta 8); liste dei file al Coordinatore prima del codice.

## Contesto da leggere

- `tasks/TASK-424.md`, ADR-0352, `API.md` «Live shares» e «Messages»
- `services/api/shaperoute_api/live_shares.py`, `messages.py`, `feed.py`,
  `group_runs.py` (una scheda «evento» nel Feed), `push.py`
- `apps/mobile/src/liveShare/`, `src/messages/`, `src/feed/`
- `docs/EVENTI.md` (le corse di gruppo, TASK-309)

## Fuori scope

- Avvisi automatici (partenza, arrivo, «fermo da 10 minuti»).
- Le corse di gruppo dal vivo (TASK-309).
- Commenti o reazioni sulla live mentre è in corso.

## File toccati

Parte 0:

```
docs/tasks/TASK-468.md
docs/DECISIONS.md
docs/STATUS.md
docs/INDEX.md
```

Le liste delle parti A1, A2, B1, B2 vanno al Coordinatore prima del codice.

Parte A1a (#1221, approvata dal Coordinatore il 2026-11-12):

```
services/api/shaperoute_api/live_shares.py
services/api/migrations/0073_live_audiences.sql
services/api/tests/test_live_shares.py
packages/shared-types/src/liveShare.ts
packages/shared-types/test/liveShare.test.ts
packages/shared-types/fixtures/live-share-send-request.json
docs/API.md
docs/DATABASE.md
```

## Esito

*(a fine task)*
