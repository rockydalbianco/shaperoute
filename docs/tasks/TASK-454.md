# TASK-454 — Reazioni e super like

**Stato**: Parte 0 chiusa (scelte dell'utente, 2026-11-11) · in attesa del
sì del Coordinatore sui file e di TASK-444 in `main`
**Fase**: 5 · **Branch**: `feat/TASK-454-reactions` (parte A; una PR per parte)
**Dipende da**: TASK-444 parte 1 in `main` (tocca `feed/PostActions.tsx` e
porta l'icona a cuore di «Like»)
**ADR**: da chiedere al Coordinatore per la parte C (risposte e reazioni ai
commenti: tabelle e contratto nuovi) · numero dal Coordinatore l'11
novembre 2026 (S3 e S4 di `out/prova-app-2026-11-11/PROPOSTE.md`, «Seconda
prova: lato social»)

## Obiettivo

Nella prova dell'11 novembre 2026 con due account finti, nel Feed: «Like»
apre la fila delle sei reazioni spostando in basso i pulsanti sotto il dito;
il logo MuW è un super like che chiede un commento senza dirlo prima; quel
commento non si vede tra i commenti del post; dopo la reazione «Like» resta
uguale; c'è un cerchio con una faccina senza etichetta. Alla fine: si
capisce cosa fa ogni tocco prima di farlo, e dopo si vede cosa si è fatto.
In più, per scelta dell'utente: ai commenti si risponde e si reagisce.

## Com'è oggi (letto nel codice, `main` a `a9ade90c`)

- **Sei reazioni, una a testa** (ADR-0193, 2026-10-04, scelta
  dell'utente): cuore MuW = super like, poi 🔥 👏 💪 😂 😮. Un'altra la
  cambia, la stessa la toglie. Il 👍 non è tra le sei (scelta dell'utente,
  2026-11-08, ADR-0340 precisazione F): è solo il disegno del pulsante.
- **Il super like vuole un commento di almeno 2 caratteri** (parole
  dell'utente, 2026-10-04). Il server lo salva **come un commento normale
  del post**, nella stessa richiesta (`reactions.py`: una riga in
  `comments`), e manda la notifica all'autore con l'inizio del testo. Dopo
  sono separati: togliere il super like lascia il commento.
- **Quindi il commento del super like è già pubblico per decisione.** Nel
  Feed non si vede per un difetto dell'app: `PostActions` (TASK-410 F) non
  rilegge i commenti dopo un super like, mentre la scheda del disegno
  aperto sulla mappa (`DrawingCard`) lo fa. Il log della prova lo conferma:
  `PUT …/reaction` 200 e subito dopo un `POST …/comments` aggiunto alla
  lista vecchia. Riaprendo il Feed il commento c'è.
- **Nel Feed e nella pagina del post** «Like» monta sopra la riga dei
  pulsanti tutto il blocco del disegno aperto (`DrawingReactions`): la fila
  delle sei, e sotto il **cerchio**. Il cerchio è il pulsante «la mia
  reazione» pensato per la mappa: 🙂 sbiadita finché non ho reagito, poi la
  mia reazione; apre e chiude la fila, cioè fa la stessa cosa di «Like».
  Accanto, le tre reazioni più usate e il totale. Tutto questo si vede solo
  dopo aver toccato «Like»: a fila chiusa il post non dice né quante
  reazioni ha né la mia.
- **Doppio tocco**: esiste già, sul disegno aperto sulla mappa, ed è il
  super like (scelta dell'utente, 2026-10-04). Nel Feed il tocco singolo
  sulla figura apre la pagina del post.
- **Commenti**: una lista piatta, senza risposte né reazioni (`comments.py`).

## Scelte dell'utente (2026-11-11, una domanda alla volta)

1. **Commento del super like**: resta **pubblico** (la scelta del 4 ottobre
   non si capovolge). Si corregge il difetto, e il foglio lo dice sotto il
   titolo, testo approvato: «A super like comes with a comment. Everyone
   who sees the post can read it.»
2. **Tocco su «Like»**: apre la fila delle sei **in sovrimpressione sopra
   la riga**, senza spostare niente; si chiude scegliendo o toccando fuori.
   Scartato: un tocco mette subito 🔥 e la fila tenendo premuto.
3. **Ho già reagito**: «Like» mostra la mia reazione (emoji o logo MuW) al
   posto dell'icona, scritta in grassetto, e il totale accanto come nei
   commenti («Like · 4»). Si toglie dalla fila, toccando di nuovo la
   propria, cerchiata. Nessun testo nuovo. Scartati: il nome della reazione
   al posto di «Like»; le tre più usate sempre sopra la riga.
4. **Il cerchio con la faccina**: esce dal Feed e dalla pagina del post.
   Sul disegno aperto sulla mappa resta, con l'icona a cuore di «Like»
   (TASK-444) al posto della faccina.
5. **Risposte e reazioni ai commenti**: **sì adesso, dentro TASK-454**
   (proposta era «dopo»). Come:
   - **risposte a un solo livello**: «Reply» sotto ogni commento; le
     risposte rientrate sotto, dalla più vecchia; rispondere a una risposta
     la mette nello stesso gruppo con «@nome» davanti; oltre due risposte
     se ne vedono due e «View 3 more replies»; cancellare un commento
     cancella le sue risposte;
   - **reazioni ai commenti: le emoji, non un cuore solo** (proposta era un
     cuore col numero), ma **solo le cinque** 🔥 👏 💪 😂 😮: il logo MuW
     resta il super like del post. Una a testa, su commenti e risposte;
   - **avvisi**: una risposta manda una notifica a chi ha scritto il
     commento («{name} replied to your comment: {text}», interruttore
     «Comments»); l'autore del post riceve il solito avviso di commento.
     Una reazione a un commento compare **solo nella campanella**
     («{name} reacted to your comment»), senza notifica sul telefono.
6. **Doppio tocco**: **sì, ed è il super like** (proposta era «no»): doppio
   tocco sulla figura nel Feed e nella pagina del post apre il foglio del
   super like, come sul disegno aperto. Il tocco singolo sulla card aspetta
   300 ms prima di aprire il post.

## Parti (una PR ciascuna; ordine e file dal Coordinatore)

- **A — Le reazioni nel Feed** (solo app; scelte 1–4). Dopo TASK-444 in
  `main`.
- **B — Doppio tocco = super like nel Feed e nella pagina del post** (solo
  app; scelta 6). Dopo A.
- **C1 — Risposte e reazioni ai commenti, server** (scelta 5): migrazione
  (primo numero libero al merge), contratto, avvisi. ADR dal Coordinatore;
  il server si aggiorna col sì dell'utente, prima dell'app.
- **C2 — Risposte e reazioni ai commenti, app**. Dopo C1 sul server.

## Testi nuovi dell'interfaccia

Approvati con le scelte: la riga del foglio (scelta 1), «Reply», «View
{count} more replies», «{name} replied to your comment: {text}», «{name}
reacted to your comment». Ancora da far vedere all'utente prima del merge
di C2: quello che serve in più scrivendo la risposta (per esempio
«Replying to {name}») e le forme al singolare.

## File toccati

Parte A (su `main` a `a9ade90c`; lista mandata al Coordinatore):

```
apps/mobile/src/feed/PostActions.tsx                 (di TASK-444 finché non è in main)
apps/mobile/src/feed/PostActions.test.tsx            (idem)
apps/mobile/src/feed/PostReactions.tsx               (nuovo: la fila in sovrimpressione)
apps/mobile/src/feed/PostReactions.test.tsx          (nuovo)
apps/mobile/src/feed/PostPage.test.tsx               (solo se legge la riga vecchia)
apps/mobile/src/social/DrawingReactions.tsx
apps/mobile/src/social/DrawingReactions.test.tsx
apps/mobile/src/social/SuperLikeSheet.tsx
apps/mobile/src/social/SuperLikeSheet.test.tsx
apps/mobile/src/social/reactionKinds.ts
apps/mobile/src/social/reactionKinds.test.ts
apps/mobile/src/i18n/{it,de,fr,es}.ts                (una chiave: la riga del foglio)
```

Parti B, C1, C2: la lista si manda al Coordinatore quando la parte
comincia, su `main` di quel momento. A grandi linee: B `feed/FeedPost.tsx`,
`feed/PostPage.tsx` e i loro test; C1 `services/api/migrations/`,
`shaperoute_api/comments.py`, un modulo nuovo per le reazioni ai commenti,
`push.py`, `notification_list.py`, `app.py` (a turno),
`packages/shared-types` (a turno), `docs/API.md` (a turno); C2
`social/DrawingComments.tsx`, `useDrawingComments.ts`, `commentsDoor.ts`,
`api/comments.ts`, la campanella, le quattro lingue.

## Criteri di accettazione

Per ogni parte: test deterministici dei file toccati verdi, `tsc` pulito,
screenshot prima e dopo in `out/TASK-454/` col sì dell'utente, ogni testo
nuovo col sì dell'utente prima del merge, «#NNN pronta» al Coordinatore.

Parte A:

- [ ] Toccare «Like» non cambia l'altezza della card né la posizione dei
      quattro pulsanti; la fila si chiude scegliendo o toccando fuori.
- [ ] Con una mia reazione «Like» la mostra, in grassetto, col totale; senza
      reazioni nessun numero.
- [ ] Nel Feed e nella pagina del post non c'è più il cerchio; sul disegno
      aperto c'è, col cuore a linea finché non ho reagito.
- [ ] Dopo un super like il commento è tra i commenti del post e
      «Comment · N» sale, senza ricaricare il Feed.
- [ ] Il foglio del super like dice la riga approvata, anche a VoiceOver.

I criteri di B, C1 e C2 si scrivono qui quando la parte comincia.
