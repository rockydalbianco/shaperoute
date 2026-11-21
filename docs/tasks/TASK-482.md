# TASK-482 — Il link di un post apre l'app

**Stato**: In corso (parte 0, solo documenti: le domande all'utente)
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
| B | Sulla pagina del link, per chi è su iPhone: «Open in MuW», che apre l'app con lo schema che la 1.1.0 ha già | sito | no, **se la prova sul telefono dice che lo schema c'è** |
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
2. «Open in MuW» sulla pagina, per chi è su iPhone: lo vuole subito, o
   aspetta la build nativa? E il testo.
3. Chi apre il link nell'app senza essere entrato: prima l'ingresso, poi
   il post (proposta).
4. La parte D nella prossima build nativa: sì o no, e quando.

## Un difetto trovato, non di questo task

`downloadUrl` in `site/config.js` porta **solo all'App Store**
(`apps.apple.com/app/id6820961883`): «Get MuW» manda lì anche chi apre la
pagina da Android. Segnalato al Coordinatore il 2026-11-21, che lo
assegna.

## File toccati

Parte 0: `docs/tasks/TASK-482.md` (nuovo), `docs/DECISIONS.md` (ADR-0391),
`docs/STATUS.md` (la voce del task), `docs/INDEX.md` (una riga). Gli
elenchi delle parti A–D vanno al Coordinatore prima del codice.

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
