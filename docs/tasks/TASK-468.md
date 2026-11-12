# TASK-468 — La live in chat e nel Feed, anche programmata

**Stato**: Todo · parte 0 (documenti) in questa PR
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

### Da decidere ancora nella parte 0

- I testi en/it/de/fr/es (approvazione dell'utente).
- **Privacy** (Coordinatore, 2026-11-12): la posizione dal vivo mostrata
  a follower, a tutti o in chat è un dato nuovo che esce verso altre
  persone. Una frase nella privacy dell'app (`about/content`) e del sito
  (`site/privacy`, a turno dopo la #1200), col sì dell'utente; App Privacy
  e Data safety da rivedere. Ogni live si accende con una scelta
  esplicita, mai da sola.
- Tecnica (ADR): aggiornamento della schermata dal vivo (polling come la
  pagina web, 10 s), limiti, chi vede attraverso blocchi e nascosti
  (`follows.apart_sql`), segnalazioni.

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
```

## Esito

*(a fine task)*
