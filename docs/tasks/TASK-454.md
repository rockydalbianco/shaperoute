# TASK-454 — Reazioni e super like

**Stato**: Parte 0 chiusa (scelte dell'utente, 2026-11-11) · C1 (server) in
`main` (#1180) e sul server (passo 9, 2026-11-12) · A nella #1195 in bozza
(mancano gli screenshot e il sì dell'utente) · B dopo A · C2 può partire: la
lista dei file è dal Coordinatore
**Fase**: 5 · **Branch**: `feat/TASK-454-reactions` (parte A; una PR per parte)
**Dipende da**: TASK-444 parte 1 in `main` (tocca `feed/PostActions.tsx` e
porta l'icona a cuore di «Like»)
**ADR**: ADR-0377 per la parte C (risposte e reazioni ai commenti: tabelle e
contratto nuovi), dal Coordinatore · numero dal Coordinatore l'11
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
     commento («{name} replied to your comment: {text}»; l'interruttore
     è l'unico che c'è, «Push notifications», non uno dei commenti come
     detto per errore nella domanda); l'autore del post riceve il solito
     avviso di commento.
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

- [x] Toccare «Like» non cambia l'altezza della card né la posizione dei
      quattro pulsanti; la fila si chiude scegliendo o toccando fuori.
- [x] Con una mia reazione «Like» la mostra, in grassetto, col totale; senza
      reazioni nessun numero.
- [x] Nel Feed e nella pagina del post non c'è più il cerchio; sul disegno
      aperto c'è, col cuore a linea finché non ho reagito.
- [x] Dopo un super like il commento è tra i commenti del post e
      «Comment · N» sale, senza ricaricare il Feed.
- [x] Il foglio del super like dice la riga approvata, anche a VoiceOver.

I criteri di B, C1 e C2 si scrivono qui quando la parte comincia.

## Parte C1 — server (ADR-0377)

**Stato**: in `main` il 2026-11-12 (#1180, `02214e9b`, CI verde) ·
migrazione `0070_comment_replies.sql` · ADR-0377 in `DECISIONS.md` con la PR
di documenti #1186. **Sul server col passo 9 del Coordinatore, alle 08:38Z
del 2026-11-12** (col sì dell'utente): colonne, tabella, indici e rotte
controllati da lui in sola lettura; i controlli e tre righe in più,
facoltative, in `out/TASK-454/SERVER-C1.md` del checkout principale.

Scelte dell'utente: quelle del punto 5 qui sopra. Il resto è **deciso
dall'agente su delega dell'utente** (va in `DECISIONS.md` come ADR-0377 con
la PR di documenti dopo il merge):

1. **Una risposta è una riga di `comments`** con `parent_id`: controlli,
   filtro delle parole, limite al minuto, segnalazione, `hidden_at`, blocchi
   e cancellazione sono quelli dei commenti, senza codice a parte.
2. **Un livello solo, tenuto dal server**: `reply_to` può essere un commento
   o una risposta; `parent_id` è sempre il commento in cima. Chi si nomina
   («@nome») è una colonna (`mention_user_id`) e un campo (`mention`), non
   testo scritto dall'app: il testo resta quello dell'utente, il nome segue
   un cambio di username e sparisce per chi ha bloccato quell'iscritto.
3. **Due modi di leggere, uno per le app di prima**: senza `threads` la
   lista è piatta e per data, risposte comprese (un'app di prima le mostra
   come commenti, e chi riceve «replied to your comment» le trova);
   `?threads=true` dà i commenti con le due risposte più vecchie e
   `reply_count`, le altre da `GET /comments/{id}/replies`. Scartato:
   nascondere le risposte alle app di prima (la notifica aprirebbe un
   disegno dove la risposta non c'è).
4. **Una risposta si legge col suo commento**: se chi chiede non legge il
   commento in cima (blocco, nascosto), non legge le risposte sotto, e non
   contano in `total`.
5. **Le reazioni ai commenti in una tabella loro** (`comment_reactions`,
   cinque codici), lette insieme ai commenti (`reactions` in ogni commento:
   niente richiesta in più per riga) e scritte da `PUT`/`DELETE
   /comments/{id}/reaction`. Scartato: riusare `reactions` con una colonna
   in più (la chiave e il vincolo dei sei tipi sono del disegno, e i
   concorsi contano i `super_like` di quella tabella).
6. **Avvisi**: `comment_reply` a chi ha scritto il commento o la risposta a
   cui si risponde; il proprietario del disegno riceve il solito `comment`,
   ma non quando è lui quello a cui si risponde (una notizia, una volta).
   `comment_reaction` passa solo agli ascoltatori di `push.py`
   (`BELL_ONLY`): la campanella la tiene, nessun telefono suona. Nessuno
   dei due entra nell'email delle notizie (`EMAIL_KINDS` non cambia).
   Tutti e due aprono il disegno: le app di prima aprono già qualunque
   avviso con `drawing_id`.
7. **L'interruttore è uno**: sul server c'è solo «Push notifications»
   (`users.notify_push`), non uno per i commenti e uno per le reazioni come
   detto per errore nella domanda all'utente. La notifica della risposta lo
   rispetta; la campanella tiene tutto comunque, com'è da ADR-0311.

Testi nelle altre lingue (da far vedere all'utente con la PR): risposta
«{name} hat auf deinen Kommentar geantwortet: {text}» / «{name} ha risposto
al tuo commento: {text}» / «{name} ha respondido a tu comentario: {text}» /
«{name} a répondu à ton commentaire : {text}»; reazione «{name} hat auf
deinen Kommentar reagiert.» / «{name} ha reagito al tuo commento.» /
«{name} ha reaccionado a tu comentario.» / «{name} a réagi à ton
commentaire.»

**Privacy**: le risposte sono commenti (già descritti). Di nuovo c'è la
reazione a un commento: gli altri vedono quante, chi ha scritto il commento
legge nella campanella chi ha reagito. La frase di «Favorites, comments,
reactions and follows» va fatta approvare all'utente e aggiornata con C2
(`about/content/**`, `site/privacy`: turno dal Coordinatore).

File toccati (C1):

```
services/api/migrations/0070_comment_replies.sql        (nuovo)
services/api/shaperoute_api/comment_reactions.py        (nuovo)
services/api/shaperoute_api/comments.py
services/api/shaperoute_api/push.py
services/api/shaperoute_api/notification_list.py
services/api/shaperoute_api/app.py                      (a turno: due righe)
services/api/tests/test_comment_threads.py              (nuovo)
services/api/tests/test_comments.py                     (due righe: vedi sotto)
services/api/tests/test_reactions.py                    (una riga: idem)
packages/shared-types/src/index.ts                      (a turno)
packages/shared-types/test/commentThreads.test.ts       (nuovo)
packages/shared-types/fixtures/comment-reply-request.json    (nuovo)
packages/shared-types/fixtures/comment-reply.json            (nuovo)
packages/shared-types/fixtures/comment-threads.json          (nuovo)
packages/shared-types/fixtures/comment-reactions.json        (nuovo)
packages/shared-types/fixtures/comment-reaction-request.json (nuovo)
docs/API.md                                             (a turno)
docs/DATABASE.md
docs/tasks/TASK-454.md
```

Criteri di accettazione (C1):

- [x] `test_comment_threads.py` verde: risposte a un livello, pagine,
      «app di prima», blocchi, segnalazione e nascosto, cinque reazioni,
      avvisi (risposta col push, reazione solo campanella).
- [x] I test di prima di `comments`, `reactions`, `push`,
      `notification_list` restano verdi (86 su 88 in locale senza
      toccarli; tutti verdi in CI sulla #1180). Una sola modifica, in `test_comments.py` e
      `test_reactions.py`: gli esempi di prima (`comment.json`,
      `comment-request.json`, il commento di `reaction-result.json`) non
      hanno più *tutti* i campi del corpo ma una parte (`<=` al posto di
      `==`); che gli esempi nuovi li abbiano tutti lo controlla
      `test_comment_threads.py`.
- [x] `ruff` e `black` puliti; `shared-types` typecheck e test verdi.
- [x] Dopo il passo sul server (dell'utente): controllo in
      `out/TASK-454/SERVER-C1.md`, senza TestClient (fatto dal Coordinatore
      il 2026-11-12; il file lo riporta).

## Parte A — le reazioni nel Feed (app)

**Stato**: codice e test scritti il 2026-11-12 sul branch
`feat/TASK-454-reactions` (da `main` a `02214e9b`, con TASK-444 parte 1
dentro) · PR #1195 pronta: provata nel simulatore il 2026-11-12 (iPhone
17e, API locale di `main` con C1), schermate prima/dopo approvate
dall'utente («Sì, approvo», 2026-11-12), traduzioni approvate. Aspetta il
merge del Coordinatore.

Schermate in `out/TASK-454/` del checkout principale:
`TASK-454-1-feed-like.jpg` (la striscia che spingeva la riga, la fila in
sovrimpressione, «Like · 3» con la propria), `-2-superlike.jpg` (la riga
del foglio; mandato, «Comment» sale da 5 a 6), `-3-pagina-post.jpg`,
`-4-mappa.jpg` (il cuore a linea nel cerchio); le grezze in `shots/`
(`b*` = `main`, `a*` = dopo). Nel simulatore: la fila sta dove dice la
riga, anche nella pagina del post, che è un `Modal`; il foglio del super
like sale dopo che la fila è andata via; niente da correggere.

Le scelte 1–4 sono dell'utente. Il modo è **deciso dall'agente su delega
dell'utente** (nessun ADR nuovo: l'app soltanto, dentro ADR-0193 e
ADR-0340):

1. **La fila sta in un `Modal` trasparente suo** (`feed/PostReactions.tsx`),
   appesa sopra la riga dove la riga dice di essere (`measureInWindow`,
   chiesto a ogni «Like»: la card intanto è scorsa). Solo così «toccare
   fuori» la chiude dovunque sia il tocco, e la card (`overflow: hidden`)
   non la taglia. Finché la riga non ha risposto la fila c'è ma non si vede.
   Scartato: una fila assoluta dentro la card (su Android un figlio fuori
   dal padre non riceve i tocchi, e un tocco fuori aprirebbe il post).
2. **Il foglio del super like aspetta che la fila sia andata via** su iOS
   (`onDismiss`), come «+» nei messaggi (TASK-358): un foglio mostrato
   mentre un altro `Modal` si chiude non sale. Su Android subito.
3. **Le reazioni si leggono una volta per card** (`useDrawingReactions` in
   `PostActions`), come già i commenti: servono a «Like» prima di toccarlo
   (la mia reazione, il totale). È una richiesta in più per card del Feed
   (`GET /drawings/{id}/reactions`); se pesa, il totale e la propria
   reazione possono entrare nella risposta del Feed (server, fuori da qui).
4. **«Like» senza reazioni da leggere** (nessun account, API di prima,
   niente rete) resta al suo posto e non apre niente, com'era.
5. **Per VoiceOver** «Like» si chiama «Your reaction: {name}» quando c'è la
   propria, col valore «{count} reactions»: testi che c'erano già.
6. **Una reazione non salvata** si dice sotto la riga («Your reaction wasn't
   saved. Check the connection.», testo di prima): è l'unico caso in cui
   la card cambia altezza.
7. **La fila e il segno di una reazione sono gli stessi** del disegno sulla
   mappa (`ReactionBar`, `ReactionMark` esportati da `DrawingReactions.tsx`);
   lì il cerchio senza reazione ha il cuore a linea di «Like»
   (`assets/ui/icons/heart.png`, TASK-444) al posto di 🙂.

Traduzioni della riga del foglio, **approvate dall'utente il 2026-11-12**
(«Sì, approvo»): it «Un
super like arriva con un commento. Chi vede il post può leggerlo.» · de
«Ein Super-Like kommt mit einem Kommentar. Alle, die den Beitrag sehen,
können ihn lesen.» · fr «Un super like s'accompagne d'un commentaire. Tous
ceux qui voient la publication peuvent le lire.» · es «Un super like va con
un comentario. Quien ve la publicación puede leerlo.»

File toccati davvero: quelli della lista della parte A, meno
`reactionKinds.test.ts` (non serviva), più `docs/UI.md`, solo «Le reazioni
di un disegno» e, sotto, «Le reazioni di un post» (col sì del Coordinatore
del 2026-11-12).

Test in locale (2026-11-12): `PostActions`, `PostReactions`, `PostPage`,
`DrawingReactions`, `SuperLikeSheet`, `reactionKinds` 65 verdi; con i
vicini (`snowFeed`, `hikeFeed`, `FeedPostCard`, `DrawingCard*`, `i18n`) 96
verdi; `tsc`, `eslint` e Prettier puliti sui file toccati.

## Cosa resta (fuori da questo task)

- **Totale e propria reazione nella risposta del Feed**: dalla parte A ogni
  card del Feed chiede le sue reazioni (`GET /drawings/{id}/reactions`),
  come già i commenti. Va bene per ora (Coordinatore, 2026-11-12); prima
  che il Feed cresca, totale e propria reazione (e il numero dei commenti)
  vanno nella risposta del Feed, così una pagina è una richiesta sola. È
  server e contratto: un task a parte, che apre il Coordinatore.
