# TASK-482 — Il link di un post apre l'app

**Stato**: In corso (B2 e A in produzione, provate dall'utente sull'iPhone il
2026-11-22: link in Safari → «Apri» → il post dentro MuW; C: i due file
`.well-known`, iPhone e Android, sono online; resta la parte D, con la
prossima build nativa)
**Fase**: 5 · **Branch**: una PR per parte; la parte 0 è
`docs/TASK-482-post-link-opens-app`
**Dipende da**: TASK-455 (il link di un post, `getmuw.app/p/#<id>`, parti
C, D, E, tutte in `main` e online)
**ADR**: **ADR-0391** · numero del task e dell'ADR dal Coordinatore il
2026-11-21. È la «parte F» che TASK-455 lasciava a un task nuovo.

## Obiettivo

Chi ha MuW sul telefono e tocca il link di un post (per esempio in
WhatsApp) arriva al post **dentro l'app**, non alla pagina web con «Get
MuW». L'ha chiesto l'utente il 2026-11-21, dopo la prova sul telefono:
«…su WhatsApp apre il link e non si apre il post nell'app MuW che abbiamo
sul telefono, ma c'è Get MuW, ma è già installato sul dispositivo:
dovrebbe aprirsi il post nell'app».

## Com'è oggi (letto in `main` a `ee1f6371`, 2026-11-21)

- **Il link** è `https://getmuw.app/p/#<id del disegno>`
  (`POST_LINK_PAGE`, shared-types). L'id sta dopo il `#`: il server del
  sito non lo riceve mai (ADR-0382). La pagina (`site/p/`) chiede il
  disegno all'API e mostra mappa, titolo, nome, sport e distanza, con
  «Get MuW» che porta allo store (`downloadUrl` in `site/config.js`).
- **L'app non dichiara nessun link**: `apps/mobile/app.json` non ha
  `scheme`, non ha `ios.associatedDomains`, non ha `android.intentFilters`.
  Sul sito non c'è `/.well-known/` (né `apple-app-site-association` né
  `assetlinks.json`). Per il telefono il link è un indirizzo web come gli
  altri: si apre nel browser.
- **L'app non ascolta nessun link in arrivo**: in `apps/mobile/src` non
  c'è `Linking.getInitialURL`, né un ascolto di `url`, né `expo-linking`.
- **Uno schema su iPhone forse c'è già**: senza `scheme`, la versione di
  Expo usata qui mette comunque l'identificativo dell'app tra gli schemi
  dell'iPhone (`@expo/config-plugins`, `ios/Scheme.js`: «Add the bundle
  identifier to the list of schemes»), quindi la build 1.1.0 dovrebbe
  rispondere a `com.lppl1316.sgrava://`. **Letto nel codice, non provato
  su un telefono**: `expo config --type introspect` nel worktree non
  parte (manca un modulo del plugin dell'orologio) e sul Mac non c'è un
  progetto nativo generato da guardare. Su Android la stessa regola non
  c'è: nessuno schema.
- **Aprire un post da fuori da una lista l'app lo sa già fare**: una
  notifica toccata passa da `onNotificationTapped`
  (`notifications/pushDevice.ts`, usato da `usePushNotifications.ts`) e il
  post si apre con `drawingsDoor.open({ id })` (`social/drawingsDoor.ts`),
  come la scheda di un post in chat (TASK-455 B).
- **L'impronta nativa** attesa per gli OTA è `5e1b5ce5` (1.1.0, build
  14): toccare `app.json` la cambia, quindi ogni riga nativa entra solo
  dentro una build nuova.

## Le parti (proposta dell'agente; il sito prima dell'app)

| Parte | Cosa | Dove va | Serve una build nativa? |
|---|---|---|---|
| 0 | Questo file, ADR-0391, le domande all'utente | documenti | no |
| A | L'app legge il link in arrivo e apre il post come fa una notifica (`Linking` di React Native, nessuna dipendenza nuova); senza account, prima l'ingresso e poi il post | app, OTA | no: resta inerte finché niente le manda un link |
| ~~B~~ | ~~Sulla pagina del link, per chi è su iPhone: «Open in MuW», che apre l'app con lo schema che la 1.1.0 ha già~~ | — | **caduta il 2026-11-21**: la prova sul telefono dell'utente ha dato errore |
| B2 | La barra «Apri» di Safari in cima alla pagina (`apple-itunes-app` con `app-argument`) | sito | no, **da provare su un telefono vero prima di prometterla** (Coordinatore) |
| C | `/.well-known/apple-app-site-association` e `assetlinks.json` per `getmuw.app`, e come il server li serve | sito e server | no, ma è un passo sul server: lo prepara il Coordinatore col sì dell'utente |
| D | `app.json`: `ios.associatedDomains` (`applinks:getmuw.app`), `android.intentFilters` verificati, uno `scheme` vero | app, nativo | **sì**: cambia l'impronta, entra nella prossima build nativa, che decide l'utente |

Con A, C e D insieme il link toccato in WhatsApp apre direttamente il post
nell'app, su iPhone e su Android, senza passare dalla pagina. A e B (ed
eventualmente B2) sono quello che si può dare prima, senza una versione
nuova dagli store, e solo su iPhone: si passa ancora dalla pagina, e da lì
un tocco apre l'app.

### Cose da tenere ferme

- **L'id resta dopo il `#`** anche quando il link apre l'app: il telefono
  dà all'app l'indirizzo intero, il server del sito continua a non sapere
  quale post è stato aperto.
- **L'app non si fida del link**: dall'indirizzo prende solo un id che ha
  la forma di un id di disegno, e chiede il post all'API come per ogni
  altro post. Un post che chi legge non può vedere dice «This post is no
  longer available.», come in chat.
- **La pagina resta per chi non ha l'app**, com'è.
- Nessuna dipendenza nuova senza chiederlo.

## Domande all'utente (una alla volta; le risposte qui sotto)

1. **La prova dello schema sull'iPhone** (dieci secondi, decide se B si
   può fare): scrivere `com.lppl1316.sgrava://` nella barra di Safari. Se
   Safari chiede di aprire MuW, lo schema c'è.
   **Risposta dell'utente, 2026-11-21: «No, dà errore».** Lo schema non
   risulta nella 1.1.0 (o la prova a mano non basta a dirlo: in ogni caso
   non è provato). **La parte B non si fa**: niente «Open in MuW» con lo
   schema dell'identificativo. Controllato dopo la risposta: la build di
   produzione ha lo stesso identificativo (`app.config.ts` cambia solo la
   versione del runtime), quindi l'indirizzo provato era quello giusto.
2. ~~«Open in MuW» sulla pagina, per chi è su iPhone~~: caduta con la
   parte B. Al suo posto: **«Provo intanto la barra «Apri» di Safari
   sulla pagina del link?» — risposta dell'utente, 2026-11-21: «Sì,
   proviamola»** (parte B2, PR #1359, una prova: poi la copia del sito e
   lo sguardo dell'utente sull'iPhone).
3. Chi apre il link nell'app senza essere entrato: prima l'ingresso, poi
   il post (proposta) — **risposta dell'utente, 2026-11-22: «Sì, prima
   l'ingresso»**. La riga che dice perché, sulla pagina dell'account:
   «Log in to see this drawing.» (it «Accedi per vedere questo disegno.»,
   de «Melde dich an, um diese Zeichnung zu sehen.», fr «Connecte-toi pour
   voir ce dessin.», es «Inicia sesión para ver este dibujo.») —
   **approvata dall'utente il 2026-11-22: «Sì, approvo»**.
4. La parte D nella prossima build nativa: sì o no, e quando —
   **risposta dell'utente, 2026-11-22: «Sì, nella prossima»** (nella
   prossima build per gli store che l'utente deciderà di fare, senza
   farne una apposta).

## Un difetto trovato, non di questo task

`downloadUrl` in `site/config.js` porta **solo all'App Store**
(`apps.apple.com/app/id6820961883`): «Get MuW» manda lì anche chi apre la
pagina da Android. Segnalato al Coordinatore il 2026-11-21, che lo
assegna.

## File toccati

Parte 0: `docs/tasks/TASK-482.md` (nuovo), `docs/DECISIONS.md` (ADR-0391),
`docs/STATUS.md` (la voce del task), `docs/INDEX.md` (una riga). Gli
elenchi delle parti A–D vanno al Coordinatore prima del codice.

Parte B2 (#1359): `site/p/index.html`, `site/p/bar.js` (nuovo),
`site/p/post.js`, `site/p/view.js`, `site/tests/post.test.mjs`,
`docs/SITO.md`.

Parte A (#1374): `apps/mobile/src/links/postLinkIn.ts` e
`links/useIncomingPostLink.ts` (nuovi, coi loro test),
`apps/mobile/src/screens/ProfileLayer.tsx` (la chiamata accanto a
`usePushNotifications`), una riga in ciascuno di
`apps/mobile/src/i18n/it.ts`, `de.ts`, `fr.ts`, `es.ts`.

Parte C, metà iPhone (#1392): `site/.well-known/apple-app-site-association`
e `site/tests/well-known.test.mjs` (nuovi), `docs/DEPLOY.md` (F.14),
`docs/SITO.md`.

Parte C, metà Android (#1436): `site/.well-known/assetlinks.json` (nuovo),
`site/tests/well-known.test.mjs`, `docs/DEPLOY.md` (F.14), `docs/SITO.md`.

## Fuori scope

- Un «Copy link» vero (vuole `expo-clipboard`, una dipendenza nativa): con
  la parte D, se l'utente lo vuole.
- Mostrare nell'anteprima del link il disegno del post (ADR-0382: l'id non
  arriva a nessun server).
- Il link di una live (`/live/`), che ha la sua pagina.
- Correggere `downloadUrl` per Android (vedi sopra).

## Registro

- 2026-11-21: task aperto su richiesta dell'utente; numero e ADR dal
  Coordinatore; «Com'è oggi» letto nel codice. Indicazioni del
  Coordinatore: guardare prima cosa si può fare senza build nativa; la
  parte D va nella prossima build, che decide l'utente; la barra di Safari
  si prova su un telefono vero prima di prometterla; il passo sul server
  per `.well-known` lo prepara lui col sì dell'utente; gli elenchi dei
  file prima del codice.
- 2026-11-21: **prova dello schema sull'iPhone dell'utente: errore** («No,
  dà errore»). La parte B cade. Senza build nativa resta da provare solo
  la barra di Safari (B2); la strada vera sono A, C e D.
- 2026-11-21: **parte B2 scritta, bozza #1359**
  (`feat/TASK-482-b2-safari-bar`), dopo il «Sì, proviamola» dell'utente:
  `site/p/post.js` mette il meta `apple-itunes-app` (numero dell'app da
  `downloadUrl`, `app-argument` = l'indirizzo della pagina con l'id),
  `appBarOf` in `site/p/view.js`, un test, `docs/SITO.md`. Elenco dei file
  mandato al Coordinatore prima. Da provare sul telefono dopo la copia del
  sito: se Safari mostra la barra per un meta aggiunto dallo script, e se
  «Apri» apre MuW; che arrivi al post dipende dalla parte A.
- 2026-11-21: **#1359 unita e online** (sito copiato da main `370743cf`
  col sì dell'utente). Su consiglio del Coordinatore il meta è fisso in
  `index.html` e `bar.js`, letto subito, gli aggiunge `app-argument`:
  Safari legge la riga mentre carica la pagina. **Prova dell'utente
  sull'iPhone: «Sì, c'è la barra»; toccando «Apri»: «Sì, apre MuW»** (sulla
  prima schermata: al post ci arriva la parte A).
- 2026-11-22: **parte A scritta, #1374** (`feat/TASK-482-a-app-reads-link`),
  elenco dei file approvato prima dal Coordinatore. `postLinkIn` prende
  solo la pagina `POST_LINK_PAGE` con un id a forma di disegno dopo `#`;
  `useIncomingPostLink` ascolta `Linking` (indirizzi in arrivo e quello con
  cui l'app è stata aperta, letto una volta; lo stesso post due volte in
  3 s è uno) e apre con `opens.openDrawing`, come una notifica toccata;
  senza account, `showOwnPage` con la riga approvata, e il post appena si
  entra. «#1374 pronta» al Coordinatore (`70421e40`). **Non dimostrato**:
  che iOS passi all'app l'indirizzo della barra — si vede sul telefono
  dopo l'OTA. Resta: l'OTA (un sì dell'utente), la sua prova, la
  domanda 4, le parti C e D.
- 2026-11-22: **le domande sono finite** (4: «Sì, nella prossima»). PR dei
  soli documenti della parte 0: questo file, ADR-0391, la voce in
  `STATUS.md`, la riga in `INDEX.md`. La parte D entra nel piano della
  prossima build nativa (lo tiene il Coordinatore); la parte C (i due file
  `.well-known` e come il server li serve) va preparata prima che quella
  build esca, o i link verificati non si verificano.
- 2026-11-22: **parte A in `main` e in produzione**: #1374 unita dal
  Coordinatore (`f5bfc284`), poi nell'**OTA 21** (la pubblica il
  Coordinatore, col sì dell'utente).
- 2026-11-22: **parte C, metà iPhone: #1392 unita (`2a807976`) e online**.
  `site/.well-known/apple-app-site-association` dice all'iPhone che i link
  `/p/#<id>` (anche `/p` e `/p/index.html`) sono di MuW
  (`D6WUSJZKVZ.com.lppl1316.sgrava`, letto da `app.json` nel test). Il file
  non ha estensione: Caddy lo serve come `application/json` con una riga
  `header` (DEPLOY.md F.14), messa dall'utente; sito copiato da `8de9cbf5`.
  Controllato da fuori: `200`, `application/json`, nessun rinvio, uguale al
  file del repository. **Da solo non cambia niente**: serve quando l'app
  dichiara `applinks:getmuw.app` (parte D, build nativa).
- 2026-11-22: **prova dell'utente sull'iPhone dopo l'OTA 21** — alla
  domanda «Dopo l'aggiornamento, «Apri» nella barra di Safari porta al post
  dentro MuW?» la risposta è **«Sì, apre il post»**. Era il punto non
  dimostrato della parte A: iOS passa all'app l'indirizzo scritto in
  `app-argument`. Non provato sul telefono: il link aperto da chi non è
  entrato (lo coprono i test). Su Android non c'è la barra: lì il post
  nell'app arriva con la parte D.
- **Resta, con la prossima build nativa (la decide l'utente)**:
  `site/.well-known/assetlinks.json` per Android (serve l'impronta SHA-256
  con cui Play firma `app.getmuw.android`: Play Console → Integrità
  dell'app, da chiedere all'utente allora) e la parte D in
  `apps/mobile/app.json` (`ios.associatedDomains`, i filtri Android
  verificati, uno `scheme` vero) — con quella il link si apre nell'app
  direttamente da WhatsApp, senza passare da Safari. Elenchi dei file al
  Coordinatore prima del codice.
- 2026-11-23: l'utente scrive «CONTINUA». Senza build nativa avanza solo
  la **metà Android della parte C**: elenco dei file al Coordinatore
  (approvato), e all'utente la domanda sull'impronta di Play — risposta:
  **«Leggila tu»**. Letta dal suo Chrome nella Play Console (account
  dell'app, «Firma dell'app» di MuW, sola lettura). La pagina tiene i
  valori dietro i tasti «copia»: si leggono senza toccare gli appunti.
  Trovato: la chiave «In uso» con due certificati (classico `ED:A9…`,
  post-quantistico `CB:28…`), una chiave di firma precedente (`64:9D…`,
  primo utilizzo 26 ottobre — l'unica nel «JSON Digital Asset Links» che
  Play propone) e la chiave di caricamento (`E5:29…`).
- 2026-11-23: **#1436 unita (`5a2dac46`)**: `site/.well-known/assetlinks.json`
  dice a Google che `app.getmuw.android`, firmata con una delle **tre**
  chiavi di firma di Play, può aprire i link del sito; la chiave di
  caricamento è fuori e un test la tiene fuori (aggiunta ad ADR-0391, con
  l'OK del Coordinatore). Il file finisce in `.json`: nessuna riga nuova
  per Caddy. Test del sito 102/102.
- 2026-11-23: **metà Android online**: sito copiato dal Coordinatore da
  main `177214fa`, col sì dell'utente. Controllato da fuori:
  `/.well-known/assetlinks.json` risponde `200 application/json`, senza
  redirect, uguale al file del repository; il file dell'iPhone risponde
  come prima. Il servizio di Google che legge questi file
  (`digitalassetlinks.googleapis.com`, `statements:list`) vede tre
  dichiarazioni per `app.getmuw.android`, una per impronta.
- **Resta solo la parte D, con la prossima build nativa (la decide
  l'utente)**: in `apps/mobile/app.json` `ios.associatedDomains`
  (`applinks:getmuw.app`), i filtri Android verificati per `/p` e uno
  `scheme` vero — con quella il link si apre nell'app direttamente da
  WhatsApp, anche su Android. I due file sul sito ci sono già. Elenco dei
  file al Coordinatore prima del codice; se Play cambia chiave di firma,
  `assetlinks.json` va aggiornato (`DEPLOY.md` F.14).
