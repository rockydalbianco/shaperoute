# TASK-455 — Condividere il disegno di un'altra persona

**Stato**: **B0, A e B fatte e in produzione** (2026-11-12): B0 nella
#1220, A nella #1230 e sul server col passo 11 (migrazione `0074`), B nella
#1255 con l'OTA 15 · resta la prova dell'utente sul telefono · prossima
**C** (server: il link e l'interruttore), che comincia da una domanda
all'utente e dalla frase della privacy; poi D (sito) ed E (app)
**Fase**: 5 · **Branch**: una PR per parte; la prossima
`feat/TASK-455-c-post-links`
**Dipende da**: per la parte C, la risposta dell'utente sul link
dell'autore con l'interruttore spento, la frase della privacy e l'avviso
nelle novità approvati **prima** del passo sul server, il sì del
Coordinatore sui file
**ADR**: **ADR-0382** (il post in un messaggio, il link di un post,
l'interruttore dell'account), numero dal Coordinatore il 2026-11-12 ·
numero del task dal Coordinatore l'11 novembre 2026 (S5 e gruppo C di
`out/prova-app-2026-11-11/PROPOSTE.md`, «Seconda prova: lato social»)

## Obiettivo

Nella prova dell'11 novembre 2026 il menu «…» di un post altrui nel Feed ha
solo «Report» e «Block»: il disegno di un altro non si può mandare a un amico
né condividere. Dentro il task tre idee approvate come «da fare diventare
task»: **«manda a un amico»** (in chat), **«copia link»**, **«percorso in
chat come invito»** (l'amico riceve il percorso e può rifarlo). Alla fine: da
ogni post si arriva in un tocco a mandarlo a qualcuno o a prenderne il link,
senza mostrarlo a chi non potrebbe vederlo.

## Com'è oggi (letto nel codice, `main` a `727254be`)

- **«Send to a friend» esiste già** (TASK-333 parte C, ADR-0289, scelte
  dell'utente del 2026-10-29): `messages/SendDrawingButton.tsx` apre
  `SendToFriend.tsx` (chi ti scrive, poi chi segui, poi la ricerca per nome).
  Sta in tre posti: il tasto tondo «✉︎» sotto il cuore sulla mappa
  (`FavoriteHeart.tsx`), la scheda di «My activities» (`ActivityCard.tsx`) e
  la scheda di un disegno aperto sulla mappa da un profilo
  (`social/DrawingCard.tsx`), **anche se il disegno è di un altro**.
- **Nel Feed e nella pagina del post non c'è.** La scelta 5 di TASK-333
  diceva «il Feed, un profilo…», ma la riga delle azioni nata con TASK-410
  (`feed/PostActions.tsx`: «Like», «Comment», «Share», «Edit & run») ha
  «Share» **solo sui propri post**, e il «…» (`social/ReportMenu.tsx`) ha
  solo «Report» e «Block {user}». È il buco visto nella prova.
- **Cosa riceve l'amico oggi**: nella conversazione una scheda con la mappa
  piccola, il nome e i km; toccata, il disegno si apre sulla mappa come un
  preferito, con «Start», «Export GPX», il cuore e «Draw it near me»
  (`messageDrawing.ts`, `favoriteOfMessage`). Quindi «il percorso in chat
  che l'amico può rifare» **c'è già**. Mancano: di chi è il disegno, e un
  modo per arrivare al post (foto, commenti, reazioni).
- **Il disegno mandato è una copia, non un rimando** (ADR-0289, punto 2): la
  linea viaggia dentro il messaggio e resta anche se il post si cancella o
  cambia visibilità. Si allega solo in una conversazione aperta (dopo
  «Accept»); a chi è lontano per un blocco non si scrive (`apart_sql`).
- **Chi vede un disegno** (ADR-0170, `drawings.drawing_seen_sql`):
  `everyone` = ogni **iscritto**, `followers` = chi segue con la richiesta
  accettata, `only_me` = nessun altro. Nessun post è visibile fuori da MuW.
  La privacy dice che chi può vederlo vede la traccia intera, partenza e
  arrivo compresi.
- **Un buco di oggi**: dalla scheda del disegno un follower può mandare la
  copia di un disegno `followers` a chiunque gli abbia accettato un
  messaggio, anche a chi non segue l'autore: la traccia intera arriva a chi
  non potrebbe vederla. Il server non controlla da dove viene la copia.
- **«Share» fuori dall'app** (poster, video, Instagram: `share/**`): solo
  sui propri disegni, per scelta dell'utente (TASK-355, scelta 5, 2026-10-30,
  «Solo i miei»: quelli degli altri «con un consenso da decidere a parte»).
- **Link ai post: non ci sono.** L'app non ha uno schema né link
  universali (`app.config.ts`), il sito non ha una pagina per un post, e
  l'API risponde solo con la chiave dell'app e, per i disegni, col token di
  un iscritto. L'unico precedente è «Share live activity» (TASK-424,
  ADR-0352): una pagina web a token su `site/live/`. Aprire l'app da un
  link vuol dire configurazione nativa: cambia l'impronta iOS, quindi solo
  con una build. Non c'è nemmeno un modulo per gli appunti
  (`expo-clipboard`): c'è il foglio del telefono (`Share` di React Native,
  già usato da `game/shareCode.ts`).

## Scelte dell'utente (2026-11-12, una domanda alla volta)

1. **Quali vie nella prima versione**: **«Tutte e tre insieme»** — «manda a
   un amico», il link e il percorso in chat che si può rifare. (La proposta
   era la chat subito e il link dopo.)
2. **Dove sta il pulsante**: **«Share» nella riga, su ogni post**, accanto a
   «Like» e «Comment». Su un post altrui apre un foglietto con «Send to a
   friend» e la voce del link. Sui propri post lo stesso foglietto, con in
   più la voce di oggi (poster e video): un tocco in più per arrivarci. Il
   «…» resta «Report» e «Block».
3. **Cosa riceve l'amico in chat**: **il post, col nome dell'autore**. Una
   scheda con la linea del disegno, titolo, km e «by {user}»; un tocco apre
   la pagina del post (foto, commenti, reazioni), e da lì «Edit & run» per
   rifarlo. È **un rimando, non una copia**: se l'autore cancella il post,
   lo rende privato, o l'amico non può vederlo, la scheda dice che non è
   più disponibile.
4. **I post «Followers»**: **si mandano, li apre solo chi può**. La scheda
   si apre solo se l'amico segue l'autore (richiesta accettata); agli altri
   dice che il post non è disponibile; il foglietto lo dice prima di
   mandare. Il server controlla a ogni apertura. Dentro la stessa risposta:
   il **link vale solo per i post «Everyone»**; chi è lontano dall'autore
   per un blocco non apre mai la scheda; **il buco di oggi si chiude**: dalla
   scheda di un disegno altrui aperto da un profilo si manda il rimando, non
   più la copia.
5. **L'autore può impedire la condivisione?** In chat non serve (il rimando
   si apre solo per chi poteva già vedere il post). Per il link:
   **un interruttore nell'account, acceso all'inizio**. Finché è acceso, chi
   vede un mio post «Everyone» può prenderne il link; spento, sui miei post
   gli altri hanno solo «Send to a friend» e i link già dati smettono di
   funzionare. Il link del proprio post l'autore lo può sempre prendere. Va
   detto nella privacy e nelle novità. (La proposta era «spento all'inizio»;
   capovolge per i link la scelta «Solo i miei» di TASK-355.)
6. **Cosa apre il link per chi non ha l'app**: una pagina su `getmuw.app`
   con **la mappa e la linea intera**, come la vedono gli iscritti (partenza
   e arrivo compresi), titolo, «by {user}», km, sport e i pulsanti per
   scaricare MuW. Mai foto, commenti, reazioni né tempi; non indicizzata dai
   motori di ricerca; smette di funzionare subito se l'autore cancella il
   post, lo passa a «Followers» o spegne l'interruttore. Finché non c'è una
   build nativa, anche chi ha l'app vede la pagina web.
7. **I testi**: **«Approvo così»**, con «Share link» che apre il foglio del
   telefono (dentro «Copia», WhatsApp, Messaggi…) al posto di un «Copy
   link» che vorrebbe una dipendenza nativa nuova. Le traduzioni sono
   dell'agente; il paragrafo della privacy si approva a parte, con la sua
   parte. I testi si rivedono comunque negli screenshot prima di ogni merge.

### I testi approvati (2026-11-12)

| Dove | Testo |
|---|---|
| Foglietto «Share» | «Send to a friend» (c'è già) · «Share link» · «Poster and video» (solo sui propri post) |
| Scelta dell'amico, post «Followers» | «Only people who follow {user} can open it.» |
| In chat, la scheda | «by {user}» · «This post is no longer available.» |
| Lista delle conversazioni e push | «🗺️ Post» |
| App di prima | «[Post]» |
| Impostazioni, interruttore (acceso all'inizio) | «Links to my posts» · «People who see your «Everyone» posts can share a link to them. Anyone with the link sees the drawing on the map, your username and the distance, even without MuW. Turn this off and the links stop working.» |
| Pagina web | «{user} drew this on MuW» · «Get MuW» · «This drawing is no longer available.» |

**La frase della privacy, approvata il 2026-11-12 («Approvo così»)**, da
aggiungere dopo quella su «Everyone» e «Followers», nell'app e sul sito
(traduzioni dell'agente):

> A post for «Everyone» can also be opened with a link. You, or any member
> who sees the post, can share its link, and whoever has the link sees the
> drawing on the map, your username, the title and the distance on a web
> page, even without MuW: never your photos, the comments or your times.
> Search engines are asked not to list these pages. Turn off «Links to my
> posts» in Settings and no link to your posts works any more. A post for
> «Followers» or «Only me» never has a link.

**Le novità, scelta dell'utente del 2026-11-12: «Solo privacy e App
Store».** Nessun avviso dentro l'app (oggi non ha un posto per le novità):
la frase della privacy, e nelle note di versione dello store alla prossima
build «Share a post: send it to a friend or share its link. Links to your
«Everyone» posts are on; turn them off in Settings.» (La proposta era un
foglietto nell'app, una volta.)

## Le parti (proposta dell'agente; il server prima dell'app)

- **B0 — App: niente copia dei disegni «Followers» altrui** (aggiunta il
  2026-11-12, la correzione di riservatezza). **In `main`, #1220.**
- **A — Server: il post in un messaggio** (**in `main`, #1230, e sul
  server col passo 11**). Un allegato nuovo, `post`: il
  messaggio tiene l'id del disegno, non la linea. Mandarlo vuole che chi
  manda veda il disegno e una conversazione aperta, come ogni allegato.
  Leggerlo: a ogni pagina il server risolve la scheda **per chi legge**
  (`drawing_seen_sql`, blocchi compresi): titolo, autore, metri, sport e
  la linea, oppure «non disponibile». Un'app che non lo sa leggere riceve
  «[Post]» davanti al testo; la push dice «🗺️ Post». Migrazione, tipi in
  `shared-types`, esempi, `API.md`, `DATABASE.md`. Poi il passo sul server,
  col sì dell'utente dato al Coordinatore.
- **B — App: «Share» su ogni post e la scheda in chat** (**in `main`,
  #1255, in produzione con l'OTA 15**). Il foglietto di
  «Share» (file nuovo) nella riga delle azioni del Feed e della pagina del
  post; «Send to a friend» manda il rimando; la scheda del post nella
  conversazione, che apre la pagina del post; la nota per i post
  «Followers»; `DrawingCard` manda il rimando per i disegni altrui (il buco
  chiuso). Dopo TASK-454 A in `main` e dopo il server di A. Simulatore col
  turno del Coordinatore.
- **C — Server: i link.** L'interruttore nell'account (acceso all'inizio) e
  la lettura senza account di un post «Everyone» il cui autore ha
  l'interruttore acceso: linea, titolo, nome, metri, sport, nient'altro.
  Come la pagina la legge senza la chiave dell'app si guarda in «Share
  live» (ADR-0352). Passo sul server.
- **D — Sito: la pagina del post**, sul modello di `site/live/`: mappa,
  linea, titolo, «{user} drew this on MuW», «Get MuW», senza indice per i
  motori di ricerca.
- **E — App: «Share link», l'interruttore e la privacy.** La voce nel
  foglietto (il foglio del telefono), «Links to my posts» nelle
  impostazioni, il paragrafo della privacy nelle cinque lingue e sul sito
  (da approvare), la riga delle novità.
- **F — Più avanti, con una build nativa**: il link che apre il post
  dentro l'app (link universali); un «Copy link» vero, se lo si vuole.

Ordine: B0 → A → B → C → D → E. A e B danno già «manda a un amico» e il post in
chat; C, D ed E il link. Esce tutto con l'aggiornamento completo: nessuna
OTA da sola.

### Scelte tecniche già prese (decise dall'agente su delega dell'utente)

- Da un post («Share» del Feed, della pagina del post, della scheda di un
  disegno altrui) si manda **sempre il rimando**, anche se il post è proprio:
  l'amico riceve il post. Dalla mappa, dai preferiti e da «My activities»
  resta la copia del percorso di ADR-0289: lì non c'è un post, o si manda
  per correrlo.
- Un'app di oggi chiede già `?with=attachments` e non conosce `post`: il
  rimando arriva solo a chi dice di saperlo leggere (la via si sceglie in
  A: un valore nuovo di `with` o `X-MuW-Reads`); agli altri «[Post]».
- Nessuna dipendenza nuova: il link passa dal foglio del telefono.

### Tre cose fissate col Coordinatore (2026-11-12), prima del codice

1. **Il buco di oggi è la parte più urgente** e non aspetta C–E. Sul server
   non si chiude: una copia è una fila di punti, il server non sa da quale
   disegno viene. Si chiude nell'app, in due tempi:
   - **B0** (solo app, un file, non aspetta il server): in
     `social/DrawingCard.tsx` «Send to a friend» resta solo sui disegni
     propri e su quelli «Everyone» (`drawing.public`); su un disegno
     «Followers» altrui il pulsante non c'è finché non c'è il rimando.
     Sì del Coordinatore il 2026-11-12: **va per prima, prima della parte
     A**, in una PR sola (`feat/TASK-455-b0-send-own-or-public`), perché
     esca con l'aggiornamento completo. File: `social/DrawingCard.tsx`,
     `social/DrawingCardSend.test.tsx` (nuovo).
   - **B**: la scheda di un disegno altrui manda il rimando, e il pulsante
     torna anche sui «Followers».
   Nella parte A **ogni lettura del post allegato si rifà coi permessi di
   chi legge**, coi test: lettore bloccato (nei due versi), non follower di
   un post «Followers», follow tolto dopo l'invio, post cancellato, autore
   che cambia «Who can see it» dopo l'invio, post nascosto da una
   segnalazione, e chi manda un post che non vede (`404`).
   Limite che resta: un'app non aggiornata tiene il pulsante della copia.
2. **La pagina pubblica (parte D) mostra la linea intera, che spesso parte
   vicino a casa.** Criteri, già adesso: solo per post «Everyone»;
   `noindex` e nessuna anteprima per i motori di ricerca; la linea **come
   la vede già un iscritto**, con le stesse regole di oggi e non di più;
   mai foto, commenti, reazioni, tempi.
3. **«Links to my posts» acceso all'inizio cambia l'esposizione dei post
   già pubblicati.** La frase della privacy (`about/content/**` e
   `site/privacy/**`, a turno dopo la #1200 di TASK-454) e l'avviso nelle
   novità vanno approvati dall'utente **prima** che la parte C vada sul
   server. Server e sito li lancia il Coordinatore coi sì dell'utente;
   nessuna OTA di produzione fino all'aggiornamento completo.

Chiesto all'utente il 2026-11-12, prima della parte C: con l'interruttore
spento, il link che l'autore prende del **proprio** post funziona?
**Risposta: «No: spento vuol dire nessun link».** Una regola sola, quella
che il testo approvato dice già («Turn this off and the links stop
working»): spento, nessun link ai miei post funziona, nemmeno quelli che ho
mandato io, e «Share link» sparisce anche sui miei post; per mandarne uno
lo riaccendo. Precisa la risposta 5 («l'autore lo può sempre prendere»
vale con l'interruttore acceso). Nessun dato in più da tenere per post.

Ordine sui file dell'app (Coordinatore): `feed/PostActions.tsx` dopo la
#1195 (TASK-454 A) e accanto a TASK-454 B (`FeedPost.tsx`, `PostPage.tsx`,
`PostReactions.tsx`): la lista della parte B si manda quando la #1195 è in
`main`. Su `messages/**` questo task va per primo; TASK-468 B e TASK-458
dopo. In `messages.py` e `push.py` l'allegato sta in un blocco suo:
TASK-468 («Share live» in chat) li tocca dopo.

## La parte B, da dove si riparte (2026-11-12)

Lista dei file **approvata dal Coordinatore** il 2026-11-12; branch
`feat/TASK-455-b-share-post` da `main`. Si scrive tutto il resto e si tiene
`feed/PostActions.tsx` per ultimo: prima entra la #1231 di TASK-454 B, e
lo dice il Coordinatore. Su `messages/**` questo task va per primo; dopo
entra TASK-468 B.

Cosa fa: «Share» su ogni post apre un foglietto («Send to a friend», sui
propri anche «Poster and video»; «Share link» arriva con la parte E); «Send
to a friend» da un post manda il rimando (`attachment: { post_id }`), con
la nota «Only people who follow {user} can open it.» per un post
«Followers»; nella conversazione la scheda del post («by {user}», o «This
post is no longer available.»); la lista dice «🗺️ Post»; l'app dice `post`
in `X-MuW-Reads`; la scheda di un disegno altrui manda il rimando e il
pulsante torna sui «Followers» (la B0 l'aveva tolto).

- **Da chiedere all'utente all'inizio** (una domanda, con la proposta): il
  tocco sulla scheda in chat. La pagina del post del Feed (`PostPage`, con
  «Edit & run») vive dentro `FeedScreen`; da una notifica o dalla ricerca
  un post si apre oggi con `drawingsDoor.open` (mappa e scheda con foto,
  commenti, reazioni, «Draw it near me», «Edit the drawing»). Proposta:
  aprirlo allo stesso modo dalla chat, senza toccare `App.tsx` (al
  Coordinatore va bene).
- **Un server di prima** rifiuta `post_id` con `422`: l'app lo dice con le
  parole che ha già. `attachments.kinds` di una conversazione aperta ha
  `post` quando il server lo accetta.
- **I tipi**: `MESSAGE_ATTACHMENT_KINDS` è rimasto com'era e il tipo è
  `MESSAGE_POST_KIND` a parte (parte A), così l'app compila; la B allarga
  il tipo di `MessageAttachment.kind`.
- **Di passaggio** (nota del Coordinatore): TASK-456 ha lasciato segnato
  un difetto in `messages/SendDrawingButton.tsx`, dopo «Send to…» il
  foglietto di «…» resta aperto. Se sono due righe si chiude qui e lo si
  scrive nella PR; se è di più si lascia.
- **Testi**: quelli approvati il 2026-11-12 (sopra); le traduzioni sono
  dell'agente. Gli screenshot col turno del simulatore, prima di «pronta».
- **Per uscire** aspetta il passo sul server della A.

## File toccati

Parte 0 (la #1212, solo documenti): `docs/tasks/TASK-455.md`,
`docs/STATUS.md` (la voce del task), `docs/DECISIONS.md` (ADR-0382).

Parte A (sì del Coordinatore il 2026-11-12):
`services/api/shaperoute_api/messages.py`, `services/api/shaperoute_api/push.py`,
`services/api/migrations/0074_message_post.sql` (era `0075` in bozza: il
numero è il primo libero al merge),
`services/api/tests/test_message_posts.py` (nuovo),
`packages/shared-types/src/index.ts` (a turno),
`packages/shared-types/fixtures/message-post.json` (nuovo),
`packages/shared-types/test/message-post.test.ts` (nuovo),
`docs/API.md` (a turno), `docs/DATABASE.md`. Chiesto in più il
2026-11-12, in attesa del sì: `services/api/shaperoute_api/report_email.py`
(la pagina del link di una segnalazione legge `drawing_card` per ogni
allegato che non è foto o video: con `post` darebbe un 500). Sì del
Coordinatore lo stesso giorno. In `main` con la #1230.

Parte B0 (sì del Coordinatore il 2026-11-12; in `main` con la #1220):
`apps/mobile/src/social/DrawingCard.tsx`,
`apps/mobile/src/social/DrawingCardSend.test.tsx` (nuovo).

Parte B (sì del Coordinatore il 2026-11-12). Si modificano:
`apps/mobile/src/feed/PostActions.tsx` (per ultimo, dopo la #1231),
`apps/mobile/src/messages/SendToFriend.tsx`, `SendDrawingButton.tsx`,
`MessageMedia.tsx`, `ConversationScreen.tsx`, `attachmentText.ts`,
`apps/mobile/src/api/messages.ts`, `apps/mobile/src/api/reads.ts`,
`apps/mobile/src/social/DrawingCard.tsx`,
`packages/shared-types/src/index.ts` (a turno),
`apps/mobile/src/i18n/{de,es,fr,it}.ts`, `docs/UI.md`, e i test che oggi
fissano il comportamento di prima: `feed/PostActions.test.tsx`,
`feed/PostPage.test.tsx`, `feed/snowFeed.test.tsx`, `api/reads.test.ts`,
`social/DrawingCardSend.test.tsx`, `messages/Attachments.test.tsx` e
`messages/Drawings.test.tsx` solo se cambiano le firme,
`packages/shared-types/test/message-post.test.ts`. Nuovi:
`apps/mobile/src/feed/PostShareSheet.tsx`,
`apps/mobile/src/messages/PostCard.tsx`,
`apps/mobile/src/messages/messagePost.ts`, ognuno col suo test.
Aggiunti il 2026-11-12 col sì del Coordinatore, per chiudere il foglietto
di «…» dopo «Send to…»: `apps/mobile/src/activities/ActivityCard.tsx` e
`apps/mobile/src/activities/ActivityCardSend.test.tsx` (nuovo). Tolti dalla
lista: `api/reads.test.ts` (`post` non entra nella lista comune di
`X-MuW-Reads`: lo dicono solo le chiamate dei messaggi, o l'esempio
`reads.json` che l'API confronta coi suoi tipi si romperebbe).
Non si toccano: `App.tsx`, `feed/FeedPost.tsx`, `feed/PostPage.tsx`,
`feed/PostSheet.tsx`, `feed/PostReactions.tsx`,
`messages/MessagesOverlay.tsx`, `social/drawingsDoor.ts`, `share/**`,
`about/content/**` (la riga di «Help» va con la privacy, parte E).

## Criteri di accettazione

Parte 0:
- [x] Le sei domande e i testi hanno una risposta dell'utente, scritta qui.
- [x] Parti e ordine proposti.
- [x] Una sola PR di documenti con tutte le risposte (#1212).
- [x] Lista dei file della parte A mandata al Coordinatore, sì ricevuto.

Parte B0 (in `main`, #1220):
- [x] «Send to a friend» sulla scheda di un disegno: c'è sul proprio (anche
      «Followers») e su quello altrui «Everyone»; non c'è su quello altrui
      «Followers».

Parte A (in `main`, #1230):
- [x] Un messaggio con l'allegato `post` tiene solo l'id del disegno.
- [x] Mandare un post che chi manda non vede è `404`; in una richiesta
      non aperta è `409`, come ogni allegato.
- [x] La scheda si risolve coi permessi di chi legge a ogni lettura; test
      per: bloccato nei due versi, non follower, follow tolto, post
      cancellato, visibilità cambiata dopo l'invio, post nascosto.
- [x] Un'app che non dice di leggere `post` riceve «[Post]» e mai la
      scheda; la push e la lista dicono «🗺️ Post».
- [x] `API.md`, `DATABASE.md`, tipi ed esempio aggiornati; test dei file
      toccati verdi in locale, la suite in CI.
- [x] Il passo sul server, col sì dell'utente dato al Coordinatore, e i
      controlli di sola lettura di `out/TASK-455/SERVER-A.md` (passo 11,
      2026-11-12).

Parte B (in `main`, #1255; in produzione con l'OTA 15):
- [x] «Share» sotto ogni post apre il foglietto: «Send to a friend», e
      sui propri «Poster and video»; sui post altrui c'è solo coi messaggi.
- [x] «Send to a friend» da un post manda `{ post_id }` e mai la linea;
      per un post «Followers» altrui dice prima chi lo può aprire.
- [x] In chat la scheda del post, o «This post is no longer available.»;
      il tocco apre il post come una notifica; la lista dice «🗺️ Post».
- [x] La scheda di un disegno altrui manda il post, anche «Followers».
- [x] Schermate dal simulatore approvate dall'utente («Sì, vanno bene»).
- [ ] La prova dell'utente sul telefono: mandare il post di un altro a un
      amico e aprirlo dalla chat.

Parte D (fissati col Coordinatore):
- [ ] La pagina risponde solo per post «Everyone» con l'interruttore
      dell'autore acceso; ha `noindex` e nessuna anteprima per i motori.
- [ ] La linea è quella che vede un iscritto, con le stesse regole, non
      di più; niente foto, commenti, reazioni, tempi.

Le altre parti scrivono i loro criteri quando partono.

## Registro

- 2026-11-12: task file creato, «Com'è oggi» letto nel codice; le sei
  domande e i testi chiusi con l'utente nello stesso giorno; parti e
  ordine proposti; numero di ADR, numero di migrazione e sì sui file della
  parte A chiesti al Coordinatore.
- 2026-11-12: risposta del Coordinatore: ADR-0382, migrazione provvisoria
  `0075`, sì ai file della parte A, ordine sui file dell'app, tre cose da
  fissare (sopra). Voce dell'ADR aggiunta alla #1212.
- 2026-11-12: parte A scritta sul suo branch (migrazione `0075`, blocco
  «A post attached» in `messages.py`, push, tipi, esempio, `API.md`,
  `DATABASE.md`; 12 test nuovi verdi in locale). L'app dice `post` in
  `X-MuW-Reads`: un valore nuovo di `?with=` un server di prima lo
  rifiuterebbe con `422`. Ferma sul sì per `report_email.py`. Il
  Coordinatore mette la B0 per prima.
- 2026-11-12: l'utente ha deciso che l'aggiornamento completo esce oggi
  (Coordinatore: «pronta» entro le 12:30Z). **B0 nella #1220** (`db609aaf`:
  `copySendable` in `DrawingCard.tsx`, test coi tre casi; prettier,
  eslint, tsc e jest dei file toccati verdi in locale), «pronta» mandata.
  Parte A: sì su `report_email.py`, correzione e test aggiunti, `main`
  unito, branch spinto (`0a6f9f8e`); non va nel passo server di oggi, la
  PR si apre in bozza dopo la CI della B0. La scelta di `X-MuW-Reads` è
  nel punto 4 di ADR-0382.
- 2026-11-12: **B0 in `main`** (#1220, `34333964`), dentro l'aggiornamento
  completo uscito lo stesso giorno (commit dell'uscita `1eb3e5a8`). I
  documenti della parte 0 in `main` con la PR unica del Coordinatore
  (#1226), che ha chiuso la #1212 come unita.
- 2026-11-12: **A in `main`** (#1230, `5c53e141`), migrazione
  `0074_message_post.sql`, 13 test nuovi in `test_message_posts.py` (anche
  la pagina di una segnalazione). Non era nel passo sul server di quel
  giorno (12:20Z): va col prossimo, col sì dell'utente; i controlli di sola
  lettura sono in `out/TASK-455/SERVER-A.md` (tre passi, scritti e non
  ancora provati su un database vero). Tornare all'immagine di prima è
  sicuro finché nessun messaggio porta un post, cioè fino alla parte B.
- 2026-11-12: lista dei file della parte B approvata dal Coordinatore
  («La parte B, da dove si riparte», sopra). La B parte in un contesto
  nuovo, da questo file.
- 2026-11-12: **risposta dell'utente sul tocco della scheda in chat: «Come
  da una notifica»** (la chat si chiude e il post si apre sulla mappa con
  la sua scheda, `drawingsDoor.open`); la pagina del Feed sopra la chat
  vorrebbe `App.tsx` e `ProfileLayer.tsx`. Parte B nella **#1255 in
  bozza**: la scheda del post in chat, «Send to a friend» col rimando, la
  scheda di un disegno altrui che manda il post, `post` in `X-MuW-Reads`
  solo nelle chiamate dei messaggi, il foglietto di «Share» scritto e non
  ancora collegato, i cinque testi con le traduzioni, `UI.md`; chiuso anche
  il foglietto di «…» di un'attività dopo «Send to…». Mancano
  `feed/PostActions.tsx` (dopo la #1231 di TASK-454 B), gli screenshot col
  turno del simulatore e il sì dell'utente.
- 2026-11-12: l'utente: «sì procedi». **«Share» sotto ogni post** collegato
  in `feed/PostActions.tsx` (il foglietto si monta al primo «Share»; sui
  post altrui c'è solo coi messaggi), prima che la #1231 di TASK-454 B sia
  in `main`: quando entra si unisce `main` qui e si tengono le sue righe
  (una prop in più, `reactionsHandle`). Test nuovo
  `feed/PostActionsShare.test.tsx`; `PostActions.test.tsx`,
  `PostPage.test.tsx` e `snowFeed.test.tsx` non sono toccati e passano:
  senza i messaggi «Share» resta solo sui propri post. Mancano gli
  screenshot col turno del simulatore e il sì dell'utente.
- 2026-11-12: **prova al simulatore** (iPhone 17e, Expo Go, API locale con
  la `0074` su un database usa e getta, quattro account finti). Visti
  sullo schermo: «Share» sul post di un altro e il suo foglietto, «Send
  to…» e «Sent to…», il foglietto sul proprio post con «Poster and video»,
  la lista con «🗺️ Post», la chat con la scheda del post e «This post is
  no longer available.», il post aperto dalla chat (e «←» che torna a
  «Messages»), la nota per un post «Followers», il foglietto di «…» di
  un'attività che si chiude dopo «Send to…». Nel database il messaggio
  mandato dall'app ha `attachment = post`, `post_id` e nessuna copia. **Un
  difetto trovato e corretto**: «Send to…» aperto dal foglietto del Feed
  stava sotto l'orologio; ora ha i suoi margini dentro il Modal, come la
  pagina del post (`SendToFriendInset.test.tsx`). Schermate in
  `out/TASK-455/shots/`, mandate all'utente per il suo sì.
- 2026-11-12: **l'utente sulle schermate della parte B: «Sì, vanno bene»**
  (sei schermate: «Share» sul post di un altro, i due foglietti, «Send
  to…» con la nota per un post «Followers», la chat con la scheda e «This
  post is no longer available.», il post aperto dalla chat). Detto
  all'utente e lasciato com'è: nella scheda del post aperto dalla chat
  l'ultimo pulsante dice «Back to the profile»; il foglietto non scurisce
  lo sfondo, come quello di «…». Per «pronta» manca solo `main` unito dopo
  la #1231 di TASK-454 B.
- 2026-11-12: **«server A fatto»** (Coordinatore): passo 11 lanciato
  dall'utente alle 15:03Z, server a `338e4d9b`, `0074_message_post`
  applicata; le letture di `SERVER-A.md` come previste (colonna, i due
  controlli, l'indice, gli allegati di prima invariati, nessun post, «post
  ok True [Post] post», «everyone owner 1 stranger 1 points [64]»). Sul
  server non c'è nessun disegno «Followers»: quel caso lì non è stato
  provato, lo coprono i test e la prova al simulatore.
- 2026-11-12: **B in `main`** (#1255, `360e26f6`; `main` unito con la
  #1231 di TASK-454 B tenendo `reactionsHandle`) e **in produzione con
  l'OTA 15** (15:46Z, commit `e88d491f`). Resta la prova dell'utente sul
  telefono. Prossima la parte C: la domanda all'utente (con
  l'interruttore spento, il link che l'autore prende del proprio post
  funziona?), la frase della privacy e l'avviso nelle novità da approvare
  prima del passo sul server, la lista dei file al Coordinatore prima del
  codice.
- 2026-11-12: risposta dell'utente per la parte C: con «Links to my posts»
  spento nessun link funziona, nemmeno quelli dell'autore («No: spento
  vuol dire nessun link»). Lista dei file della parte C mandata al
  Coordinatore; frase della privacy e avviso nelle novità proposti
  all'utente.
- 2026-11-12: frase della privacy approvata («Approvo così») e scelta
  sulle novità («Solo privacy e App Store»): testi sopra, in «I testi
  approvati». Con questo le due cose chieste prima del passo sul server
  della parte C hanno il sì dell'utente.
- 2026-11-12: **parte D scritta** (`feat/TASK-455-d-post-page`): la pagina
  `site/p/` sul modello di `site/live/` (stessa mappa, stesso MapLibre,
  nessuna copia), dieci test nuovi, la sezione «La pagina di un post» in
  `SITO.md`. Vista nel browser a larghezza di telefono con un finto
  `/post`: un post col titolo, uno senza (il nome fa da titolo), un link
  che non apre niente. **L'utente sulle tre schermate: «Sì, va bene».**
  Detto all'utente: sotto il nome la riga «Run · 4.3 km» senza etichette
  nuove, coi nomi degli sport dell'app; nel footer solo il link alla
  privacy; se l'API non risponde la pagina riprova tre volte e poi tace; le
  traduzioni dei tre testi sono dell'agente. Esce dopo la parte C sul
  server e con la copia del sito (`out/TASK-455/SITO-D.md`), che deve
  prendere anche `site/p`.
- 2026-11-12: col sì del Coordinatore, `site/p` aggiunto alla riga della
  copia del sito in `docs/DEPLOY.md` (F.14) e un test in
  `site/tests/post.test.mjs` che lo controlla, con i file che la pagina
  prende da fuori dalla sua cartella. Il suo `sito.sh` lo aggiorna il
  Coordinatore alla copia.
