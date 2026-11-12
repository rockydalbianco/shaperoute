# TASK-455 — Condividere il disegno di un'altra persona

**Stato**: Parte 0 chiusa (scelte dell'utente, 2026-11-12) · prossima la
parte A (server: il post in un messaggio), dopo il sì del Coordinatore sui file
**Fase**: 5 · **Branch**: `docs/TASK-455-share-others-drawing` (parte 0, solo
documenti); poi una PR per parte, `feat/TASK-455-a-message-post` la prima
**Dipende da**: TASK-454 A (#1195) in `main` per `feed/PostActions.tsx`
(parte B); il turno su `shared-types` e `docs/API.md` (parti A e C)
**ADR**: numero chiesto al Coordinatore il 2026-11-12 (contratti nuovi: il
post in un messaggio, il link di un post, l'interruttore dell'account) ·
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

- **A — Server: il post in un messaggio.** Un allegato nuovo, `post`: il
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

Ordine: A → B → C → D → E. A e B danno già «manda a un amico» e il post in
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

## File toccati

Parte 0 (questa PR, solo documenti): `docs/tasks/TASK-455.md`,
`docs/STATUS.md` (la voce del task), `docs/DECISIONS.md` (la voce
dell'ADR, quando arriva il numero).

Parte A (lista mandata al Coordinatore il 2026-11-12, in attesa del sì):
`services/api/shaperoute_api/messages.py`, `services/api/shaperoute_api/push.py`,
una migrazione nuova in `services/api/migrations/`,
`services/api/tests/test_message_posts.py` (nuovo),
`packages/shared-types/src/index.ts` (a turno),
`packages/shared-types/fixtures/message-post.json` (nuovo),
`docs/API.md` (a turno), `docs/DATABASE.md`.

## Criteri di accettazione

Parte 0:
- [x] Le sei domande e i testi hanno una risposta dell'utente, scritta qui.
- [x] Parti e ordine proposti.
- [ ] Una sola PR di documenti con tutte le risposte.
- [ ] Lista dei file della parte A mandata al Coordinatore.

Le altre parti scrivono i loro criteri quando partono.

## Registro

- 2026-11-12: task file creato, «Com'è oggi» letto nel codice; le sei
  domande e i testi chiusi con l'utente nello stesso giorno; parti e
  ordine proposti; numero di ADR, numero di migrazione e sì sui file della
  parte A chiesti al Coordinatore.
