# TASK-455 — Condividere il disegno di un'altra persona

**Stato**: Parte 0 chiusa (scelte dell'utente, 2026-11-12; documenti in
`main` con la #1226) · **B0** in `main` (#1220, `34333964`), uscita con
l'aggiornamento completo del 2026-11-12 · **A** (server: il post in un
messaggio) in `main` (#1230, `5c53e141`, migrazione `0074`): **manca il
passo sul server**, col sì dell'utente · prossima **B** (app), lista dei
file approvata, in un contesto nuovo
**Fase**: 5 · **Branch**: una PR per parte; la prossima
`feat/TASK-455-b-share-post`
**Dipende da**: per la parte B, la #1231 di TASK-454 B in `main` (solo per
`feed/PostActions.tsx`, che si scrive per ultimo), il passo sul server
della A e il turno del simulatore
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

Da approvare ancora: il paragrafo della privacy (parte E) e la riga delle
novità.

## Le parti (proposta dell'agente; il server prima dell'app)

- **B0 — App: niente copia dei disegni «Followers» altrui** (aggiunta il
  2026-11-12, la correzione di riservatezza). **In `main`, #1220.**
- **A — Server: il post in un messaggio** (**in `main`, #1230; manca il
  passo sul server**). Un allegato nuovo, `post`: il
  messaggio tiene l'id del disegno, non la linea. Mandarlo vuole che chi
  manda veda il disegno e una conversazione aperta, come ogni allegato.
  Leggerlo: a ogni pagina il server risolve la scheda **per chi legge**
  (`drawing_seen_sql`, blocchi compresi): titolo, autore, metri, sport e
  la linea, oppure «non disponibile». Un'app che non lo sa leggere riceve
  «[Post]» davanti al testo; la push dice «🗺️ Post». Migrazione, tipi in
  `shared-types`, esempi, `API.md`, `DATABASE.md`. Poi il passo sul server,
  col sì dell'utente dato al Coordinatore.
- **B — App: «Share» su ogni post e la scheda in chat.** Il foglietto di
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

Da chiedere all'utente prima della parte C: con l'interruttore spento, il
link che l'autore prende del **proprio** post funziona? La risposta 5 dice
che l'autore lo può sempre prendere, il testo dell'interruttore dice che
spento «the links stop working».

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
- [ ] Il passo sul server, col sì dell'utente dato al Coordinatore, e i
      controlli di sola lettura di `out/TASK-455/SERVER-A.md`.

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
