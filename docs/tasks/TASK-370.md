# TASK-370 — L'app per Apple Watch, per tutti gli sport, anche senza telefono

**Stato**: In lavorazione · proposta e piano della parte A in `main`; A1 in
`main` (#839, 2026-11-05); A2 in `main` (#866 e #883, 2026-11-06); A3 in
`main` (#943, 2026-11-08); A-flip con B4 e B5 nella **1.1.0 build 14**,
inviata ad Apple il 2026-11-11 (branch di rilascio `release/1.1.0`, #1116 in
bozza fino all'approvazione)
**Fase**: 5 · **Branch**: `docs/TASK-370-apple-watch` (documenti); il codice
`feat/TASK-370-a-…`, `feat/TASK-370-b-…`, …
**Dipende da**: TASK-321 B (HealthKit nella build, in `main`), TASK-376 B3 (il
registro degli sport nell'app, `src/sports/`), TASK-323 D (il nuoto nell'app)
**ADR**: ADR-0314 (proposto) · numeri riservati dal Coordinatore il
2026-11-04, confermati il 2026-11-05

## Obiettivo

MuW ha un'app per Apple Watch che fa tutto quello che fa la schermata della
corsa, per **ogni sport** dell'app, **anche col telefono lasciato a casa**:
si sceglie sull'orologio un percorso già fatto (o si parte senza percorso),
l'orologio guida con freccia, metri e vibrazioni, registra col suo GPS, il
battito e le calorie, salva l'allenamento in Apple Salute e, quando il
telefono torna vicino, gli passa la traccia: lì si salva e si pubblica col
modulo di sempre.

Richiesta dell'utente del 2026-11-05: «si facciamo l'app per apple watch
completa per tutti gli sport». Alla domanda «Fin dove deve arrivare
l'orologio nella prima versione?» ha scelto **«Subito anche senza
telefono»** (contro «Prima col telefono, poi da solo» e «Solo battito e
comandi»).

Assorbe la parte E di TASK-323 (il nuoto in acque libere guidato
dall'orologio, «E, il piano» in `tasks/TASK-323.md`) e il battito in tempo
reale dall'Apple Watch rimandato da TASK-169 e TASK-374.

## Contesto da leggere

- `DECISIONS.md` ADR-0314 (questo task), ADR-0281 (Salute), ADR-0052
  (navigazione), ADR-0320 (registro degli sport), ADR-0319 (Record only),
  ADR-0318 (calorie e zone)
- `tasks/TASK-323.md`, «E — Apple Watch» e «E, il piano»
- `tasks/TASK-321.md`, «In comune con TASK-323» (un'attività, un allenamento)

## Com'è oggi (main `ba91ee3b`)

1. **Nessun codice per l'orologio**: non esistono `apps/mobile/targets/` né
   `apps/mobile/src/watch/`; in `package.json` nessuna dipendenza per
   watchOS.
2. **La guida è tutta JavaScript sul telefono**: `navigation/navigator.ts`
   (svolte, `ANNOUNCE_M` 50 m, `PASS_M` 10 m), `progress.ts` (fuori rotta,
   `OFF_ROUTE_M`), `rejoin.ts` (il rientro, TASK-303), `startAnywhere.ts`,
   `swim.ts` e `paddle.ts`; con dei fixture JSON in `navigation/fixtures/`.
3. **Gli sport** stanno in `src/sports/*.ts` (running, walking, cycling,
   paddling, swimming, skiing, xc_skiing, gym; hike, gravel e roller
   arrivano con TASK-377, 378, 380). Ognuno dice già il suo
   `appleWorkout` (il numero di `HKWorkoutActivityType`), il passo, l'energia.
4. **Salute**: `@kingstinct/react-native-healthkit` 16.2.0, entitlement
   HealthKit in `app.json`; il telefono scrive un allenamento a corsa finita
   (`health/workout.ts`). Il battito non si legge ancora (TASK-345 C).
5. **Le due dipendenze dell'orologio** hanno già il sì dell'utente
   (2026-10-30, per TASK-323 E): `@bacons/apple-targets` (il target watchOS
   da una cartella `targets/watch/` a ogni `prebuild`) e
   `react-native-watch-connectivity` (`WCSession` dal JavaScript).
6. **Un OTA non arriva all'orologio**: l'app dell'orologio è Swift, esce
   solo con una build per l'App Store.

## Come è fatta (proposta)

### Il principio

L'orologio **non disegna percorsi**: il Route Engine resta sul telefono e
sul server, come dice CLAUDE.md. L'orologio porta percorsi già decisi, li
segue e registra. «Senza telefono» vuol dire: preparati prima, corsi dopo.

### Le parti

**A — Le fondamenta (con il telefono vicino)**
- Il target watchOS (SwiftUI, watchOS 10 o più) con `@bacons/apple-targets`
  in `apps/mobile/targets/watch/`; `react-native-watch-connectivity` per
  parlarsi.
- L'allenamento sull'orologio: un `HKWorkoutSession` col tipo dello sport
  (`appleWorkout` del registro), avvio, pausa, ripresa, stop dal polso, e
  dal telefono allo stesso modo (lo stesso stato sui due).
- I numeri sull'orologio: tempo, distanza, passo o velocità come li scrive
  lo sport, battito e zona, calorie.
- **Il battito in tempo reale al telefono** (mirroring di `HKWorkoutSession`,
  iOS 17 e watchOS 10): la schermata della corsa lo mostra con la zona.
- **Un'attività, un allenamento** (regola di TASK-321): quando registra
  l'orologio, l'allenamento in Salute lo salva lui; il telefono non lo
  riscrive.

**B — Senza telefono**
- **I percorsi sull'orologio**: dal telefono «Send to watch» sul percorso
  che si vede (testo da approvare); in più l'orologio tiene da solo gli
  ultimi percorsi mandati e i «Favorites» (numero da decidere, ~20).
  Viaggiano con `transferUserInfo`/`transferFile`, arrivano anche a
  telefono lontano.
- **La guida in Swift**: la stessa logica di `navigator.ts`, `progress.ts`,
  `rejoin.ts`, `startAnywhere.ts`, riscritta in un pacchetto Swift puro
  (`WatchGuide`). Per non farle divergere, i test XCTest leggono **gli stessi
  fixture JSON** di `navigation/fixtures/` e un test jest nuovo genera i
  risultati attesi dal TypeScript: se uno cambia e l'altro no, la CI lo dice.
- **Le vibrazioni**: svolta a destra, svolta a sinistra, fuori rotta,
  rientrato (schemi da far scegliere all'utente); la schermata: freccia
  grande, metri alla prossima svolta, una mappa piccola con la linea.
- **La registrazione**: GPS dell'orologio, la traccia salvata
  sull'orologio, a fine corsa mandata al telefono con `transferFile`
  quando torna vicino. Il telefono la apre come una corsa finita sua: «Save»
  e il modulo di pubblicazione di sempre (con la traccia dell'orologio).
- **Senza percorso**: «Run without a route» anche sull'orologio.

**C — Sport per sport**, ognuno coi suoi numeri e le sue regole
- Corsa, camminata, escursione, roller: come B.
- Bici e gravel: velocità al posto del passo; le vibrazioni un po' prima
  (la distanza di annuncio dello sport, come sul telefono).
- Canoa: passo per 500 m; sull'acqua niente dislivello.
- **Nuoto in acque libere** (la vecchia 323 E): `swimmingLocationType
  .openWater`, il blocco dell'acqua, i giri, la guida alle curve e il fuori
  rotta oltre 25 m. Va provato in acqua (primavera 2027): fino ad allora
  resta spento sull'orologio, come il nuoto nell'app (`ready`).
- Sci alpino e fondo (Record only): registra, niente guida.
- Palestra: niente GPS; tempo, battito, calorie e il timer di recupero.
- Gli sport che arrivano dopo: la lista dell'orologio viene dal registro
  `src/sports/` (un JSON generato al `prebuild`, con un test che lo tiene
  uguale), così uno sport nuovo non dimentica l'orologio.

**D — L'uscita**
- Testi nelle cinque lingue (orologio e telefono), da approvare.
- Privacy: posizione e battito letti dall'orologio durante l'allenamento;
  `site/privacy/` e l'etichetta App Privacy dell'App Store, col sì.
- Le schermate dell'orologio per l'App Store.
- La build (vedi sotto) e l'invio ad Apple, col sì dell'utente.

### Fuori, per ora

- **Disegnare un percorso nuovo dall'orologio** (orologio cellular, l'API
  del server): possibile più avanti, ma non nella prima versione.
- Complicazioni e widget sul quadrante: dopo D, se servono.
- Musica dall'orologio: l'utente usa Spotify, che ha la sua app per
  l'orologio.

### La build: nella 1.0.2 o in una sua

Il Coordinatore tiene l'ordine della 1.0.2 con l'utente. Ci vanno già: 333 E
(expo-video), la chiave di Salute per 374 C, 345 C, 397 C e Sign in with
Apple/Google (322). L'orologio è il cambio nativo più grosso.

| | Nella 1.0.2 | In una build sua (1.1) |
|---|---|---|
| Pro | Una sola revisione Apple, una sola impronta nuova, un solo giro di OTA divisi | La 1.0.2 esce appena pronte le sue cose; l'orologio ha il tempo di essere provato al polso; un rifiuto di Apple sull'orologio non ferma accesso e Salute |
| Contro | La 1.0.2 aspetta settimane di prove sull'orologio; un problema dell'orologio ferma tutto il resto | Due revisioni e due impronte iOS; gli OTA si dividono per un'altra versione |

**Proposta**: una build sua, la **1.1**, dopo la 1.0.2. Il codice Swift
dell'orologio non si corregge con un OTA: meglio uscire solo quando è
provato, senza tenere ferme le altre cose.

### Cosa serve per provarlo

- Il Mac con Xcode (c'è, Xcode 27) e il simulatore di watchOS: GPS simulato
  e allenamenti finti bastano per A e buona parte di B.
- **Un Apple Watch vero** per battito, vibrazioni, GPS e prova senza
  telefono; poi uscite vere, una per sport che si può.

## Scelte dell'utente

1. **Fin dove nella prima versione** (2026-11-05): «Subito anche senza
   telefono».

2. **La build** (2026-11-05): «Build sua, la 1.1» — dopo la 1.0.2, che
   esce senza aspettare l'orologio.

3. **L'Apple Watch per provare** (2026-11-05): «Sì, Series 6 o più nuovo»,
   con watchOS 10 o più: basta per battito, vibrazioni, GPS e uscite senza
   telefono.

4. **Le vibrazioni** (2026-11-08): «Come Apple Maps» — le vibrazioni di
   navigazione di watchOS (svolta a destra, a sinistra, altra manovra),
   «errore» fuori rotta, «successo» al rientro e all'arrivo, un tocco per la
   penna. Da riprovare al polso alla prima build e cambiabili.

7. **Come arrivano i percorsi** (2026-11-08): «Pulsante e preferiti» —
   «Send to watch» sulla mappa del percorso, più i «Favorites» mandati da
   soli; l'orologio tiene gli ultimi 20.

8. **Lo schermo** (2026-11-08): «Freccia prima» — freccia grande, metri e via;
   con un gesto la mappa piccola, poi i numeri.

5. **I testi di B3** (2026-11-08): «Sì, approvati», nelle cinque lingue come
   nella tabella di «B3, la proposta».

**Da chiedere, una per volta** (con una proposta pronta):
6. **La privacy** (2026-11-10): «Sì, approvato» — una sezione «The MuW app
   on Apple Watch» nella «Privacy» dell'app e del sito, prima di «Apple
   Health and Health Connect»: posizione, battito e calorie registrati
   dall'orologio durante un allenamento e salvati in Apple Salute
   sull'orologio; i percorsi scelti all'orologio; la traccia al telefono
   finché non la si salva o scarta, poi al server come ogni corsa; il
   battito al telefono durante la corsa, mai al server; la posizione chiesta
   solo durante un allenamento. L'etichetta App Privacy non cambia
   (posizione e attività già dichiarate, il battito non arriva al server).
   La copia online del sito (DEPLOY F.14) col sì dell'utente.

9. **Il permesso di posizione dell'orologio** (2026-11-08): «Approvo la
   proposta» — en «MuW uses your location during a workout to guide you
   along your route and to record it.»; it «MuW usa la tua posizione durante
   un allenamento per guidarti lungo il percorso e per registrarlo.»; de
   «MuW nutzt deinen Standort während eines Trainings, um dich entlang deiner
   Route zu führen und sie aufzuzeichnen.»; es «MuW usa tu ubicación durante
   un entrenamiento para guiarte por la ruta y para registrarla.»; fr «MuW
   utilise votre position pendant une séance pour vous guider le long du
   parcours et pour l'enregistrer.» (quello del telefono parla del telefono
   bloccato e della barra blu, non vale per l'orologio).

## Parte A, il piano (2026-11-05)

**Il vincolo della build**: la 1.1 è una build sua, dopo la 1.0.2, e gli
OTA di `main` devono continuare ad arrivare alla 1.0.1 e alla 1.0.2. Quindi
**fino alla build 1.1 l'impronta iOS di `main` non si muove**: ogni PR della
parte A la controlla (`ios-fingerprint` su una copia pulita con
`APP_VARIANT=production`, prima e dopo uguali). Le dipendenze native e il
plugin entrano in `main` solo con l'ultima PR, **A-flip**, quando l'utente e
il Coordinatore fissano la 1.1.

**A1 — Il nucleo, senza nativo** (in `main` subito, impronta invariata):
- `apps/mobile/targets/watch/Core/` (nuova): un pacchetto Swift puro
  (`Package.swift`, `WatchCore`): lo stato dell'allenamento (pronto, conto
  alla rovescia, in corso, in pausa, finito) e le sue transizioni, i
  messaggi telefono↔orologio con la versione, la tabella degli sport;
  XCTest con `swift test`, senza Xcode project né `prebuild`.
- `apps/mobile/src/watch/` (nuova): `watchMessages.ts` (puro: gli stessi
  messaggi, con dei fixture JSON letti anche da XCTest), `watchSports.ts`
  (puro: la tabella degli sport dell'orologio dal registro `src/sports/`;
  un test jest la confronta con `targets/watch/Core/.../sports.json`, che
  si rigenera con uno script), test jest.
- `.github/workflows/watch.yml` (nuova): `swift test` su un runner macOS,
  solo quando cambia `apps/mobile/targets/watch/` (i minuti macOS costano
  di più: per questo il filtro sui percorsi).

**Esito A1** (2026-11-05): in `main` con #839 (`76be330e`). `WatchCore` con 18
XCTest, `src/watch/` con 40 jest sugli stessi fixture, `watch.yml` verde in
43 s; impronta iOS `6f8bba4c` invariata. Le scelte prese sono in ADR-0314,
«precisazione — La parte A1». Per A2: il pacchetto `Core/` va collegato al
target come pacchetto locale, senza compilare `Core/Tests` nell'app; se
TASK-401 (Live Activity) porta `@bacons/apple-targets` già nella 1.0.2, chi
lo aggiunge si decide con TASK-401 e il Coordinatore.

**A2 — L'app dell'orologio** (in `main`, impronta invariata finché il
plugin non è in `app.json`):
- `apps/mobile/targets/watch/` (nuova): `expo-target.config.js`
  (`type: "watch"`, bundle `.watchkitapp`, entitlement HealthKit), l'app
  SwiftUI (scelta dello sport, avvio, numeri, pausa, ripresa, fine),
  `HKWorkoutSession` + `HKLiveWorkoutBuilder`, il mirroring al telefono,
  `WCSession`. I testi dell'orologio, in A, sono solo quelli che l'app ha
  già, con le loro traduzioni.
- Le prove nel simulatore di watchOS e sull'orologio dell'utente con un
  `prebuild` locale che aggiunge il plugin solo con una variabile
  d'ambiente (`MUW_WATCH=1` in `app.config.ts`); senza, la config di `main`
  è quella di oggi.

**Esito A2** (2026-11-06): l'app dell'orologio in `targets/watch/` (target
`watch`, SwiftUI, HealthKit, WatchConnectivity), provata nel simulatore di
watchOS 27 con un prebuild locale `MUW_WATCH=1`. `@bacons/apple-targets`
mette tutta la cartella del target nell'app: `plugins/withWatchCore.js`
esclude `Core/` e lo collega come pacchetto locale (nel build nessun file di
`Core/Tests`). Su richiesta dell'utente durante la prova, i numeri del
pannello della corsa dell'app («Pace now», «Avg pace», «Last km», battito,
calorie) e il logo MuW. Scelte in ADR-0314, «precisazione — La parte A2».
Per A3: il telefono deve impostare `workoutSessionMirroringStartHandler` per
ricevere il mirroring, leggere lo stato anche dall'application context
(l'orologio lo manda lì quando il telefono non è raggiungibile) e mandare le
unità scelte; la traccia GPS (`HKWorkoutRouteBuilder`) è della parte B.
In `main` con #866 (`6bd49b4c`) e la correzione #883 (`e5c6c175`: «Gravel» e
«MTB» della #875 nei testi dell'orologio); impronta iOS `6f8bba4c`
invariata. Uno sport nuovo o un nome cambiato richiede di rilanciare
`scripts/watch-texts.sh` e `scripts/watch-sports.sh`, altrimenti
`watchTexts.test.ts` fallisce.

**A3 — Il telefono** (in `main`, solo JavaScript, il modulo nativo caricato
solo se c'è, come `haptics/haptics.ts`):
- `src/watch/watchLink.ts` (il ponte su `react-native-watch-connectivity`,
  niente in un'app senza), `src/watch/useWatch.ts` (manda lo stato della
  corsa da `runControl`, riceve pausa, ripresa e fine dal polso, e il
  battito), `src/watch/WatchHeart.tsx` (il battito con la zona),
  `__mocks__/react-native-watch-connectivity.ts`, test.
- File esistenti, una riga o poche: `src/screens/RunDashboard.tsx` (e
  `FreeRunScreen.tsx` se non la usa) per montare `useWatch` e mostrare il
  battito; `src/health/HealthRunEnd.tsx` o `workout.ts` per non riscrivere
  in Salute l'allenamento che l'orologio ha già salvato.

**Esito A3** (2026-11-08, branch `feat/TASK-370-a3-phone`): il telefono parla
con l'orologio da `src/watch/watchLink.ts`, che chiama il modulo nativo
`WatchConnectivity` coi nomi di `react-native-watch-connectivity` 2.0.0 senza
il pacchetto (la 2.0.0 lancia all'import senza il nativo; entra con A-flip).
`useWatch.ts`, montato in `RunCard` (corsa libera e percorso, quindi
`FreeRunScreen.tsx` non serve): il conto alla rovescia avvia l'orologio con lo
sport di «Settings», pausa, ripresa e fine nei due versi (dall'orologio conta
il cambio fra due suoi stati), le unità in un messaggio nuovo `settings` con
`transferUserInfo` (l'application context torna indietro: il pacchetto lo
rimanda). `WatchHeart.tsx` mostra il battito con la zona. `useHealth.ts` non
scrive in Salute la corsa che l'orologio ha registrato. Lato orologio:
`PhoneLink.swift` risponde ai messaggi che aspettano risposta (il pacchetto
manda sempre così), `WorkoutManager.swift` tiene le unità del telefono. Nessun
testo nuovo; nessun `package.json`/`app.json`/`app.config.ts`; impronta iOS
`6f8bba4c`. Scelte in ADR-0314, «precisazione A3». **Per A-flip**: il pacchetto
2.0.0 (ricontrollare i nomi se cambia), `match` in `app.json`, un piccolo
plugin nativo per `workoutSessionMirroringStartHandler` (solo da codice
nativo); la prova vera al polso con la build 1.1.

**A-flip — L'interruttore nativo** (solo alla build 1.1): `app.json` (il
plugin `@bacons/apple-targets`), `apps/mobile/package.json` e
`package-lock.json` (le due dipendenze), `app.config.ts` (via la variabile
`MUW_WATCH`). Qui l'impronta iOS cambia, ed è voluto.

**Le condizioni del Coordinatore** (2026-11-05, piano approvato):
- `RunDashboard.tsx`, `FreeRunScreen.tsx`, `src/health/` e `app.config.ts`
  oggi non li tiene nessuna PR. `src/health/` però è in fila per la 1.0.2
  (374 C, 345 C, 397 C, la lettura da Salute) e forse per TASK-400 (nuoto
  in piscina): le righe lì vanno in A3, il più tardi possibile; chi arriva
  secondo unisce `main`.
- `app.config.ts` con `MUW_WATCH=1` va bene se senza la variabile
  l'impronta iOS resta **`6f8bba4c`**: misurarla in ogni PR su una copia
  staccata e scriverla nella PR.
- `watch.yml`: filtro sui percorsi (solo `apps/mobile/targets/watch/**` e
  il workflow stesso), `timeout-minutes: 15`, `concurrency` che cancella i
  giri vecchi come in `ci.yml`. Dei minuti macOS parla il Coordinatore
  all'utente.
- A-flip solo alla build 1.1, col sì dell'utente.
- A1 parte in una sessione nuova.

**Il plugin condiviso con TASK-401 B** (accordo del 2026-11-05, chiesto
dal Coordinatore; ADR-0335): la Live Activity di TASK-401 B esce nella 1.0.2,
prima della 1.1, con la stessa dipendenza `@bacons/apple-targets`.
- **TASK-401 B** aggiunge nella 1.0.2 la dipendenza (**5.0.0**, la versione
  di questo piano), il plugin in `app.json` (una sola config) e
  `apps/mobile/targets/live-activity/`. Il sì dell'utente alla dipendenza
  nella 1.0.2 lo chiede TASK-401.
- **Il plugin prende solo le cartelle che gli si dicono**: senza opzioni
  costruisce ogni `targets/*/expo-target.config.js` (`match = "*"`, letto in
  `build/config-plugin.js` della 5.0.0). Nella 1.0.2 va quindi con
  `"match": "live-activity"`; altrimenti il target dell'orologio entrerebbe
  nella 1.0.2 appena A2 mette `targets/watch/expo-target.config.js` in
  `main`. `targets/watch/Core/` (A1) non ha quel file e non conta.
- **A2** mette `targets/watch/` accanto, senza toccare `live-activity/`;
  `MUW_WATCH=1` in `app.config.ts` allarga `match` a
  `"{live-activity,watch}"` invece di aggiungere il plugin.
- **A-flip** non aggiunge più dipendenza né plugin: allarga `match` in
  `app.json` e aggiunge `react-native-watch-connectivity`.
- **L'impronta di riferimento**: `6f8bba4c` finché TASK-401 B non è in
  `main`; dopo, quella della 1.0.2. Ogni PR di A la misura senza
  `MUW_WATCH`.

## Parte B, il piano (2026-11-08)

B, senza telefono, va in tre pezzi; B1 può andare in parallelo ad A3
perché usa solo file nuovi.

**B1 — La guida in Swift** (in `main`, impronta invariata: niente di
nativo cambia, il pacchetto `Core/` è fuori dal build finché A-flip non lo
accende):
- `targets/watch/Core/Sources/WatchCore/Guide/`: `RouteProgress.swift`
  (`progress.ts` e `metresBetween`), `Rejoin.swift` (`rejoin.ts`),
  `Navigator.swift` (la parte «follow» di `navigator.ts`: le svolte
  annunciate a `ANNOUNCE_M`, la catena delle svolte unite, il fuori rotta
  dopo `OFF_FIXES` fix in `OFF_SECONDS`, il rientro dopo `BACK_FIXES`, il buco
  di GPS (`GAP_MS`), il rientro più avanti dopo un giro dell'isolato, i fix
  poco precisi, l'arrivo dopo `ARRIVE_FIXES`). Le stesse costanti, gli stessi
  nomi.
- **Gli avvisi senza parole**: il telefono dice frasi, l'orologio vibra e
  mostra. `Navigator.swift` dà avvisi con un tipo (partenza, svolta in
  arrivo con la catena e i metri, fuori rotta, dov'è il percorso con metri e
  direzione, di nuovo sul percorso, arrivato) e se vibrare, come il
  `vibrate` del telefono.
- **Uguali per costruzione**: `src/watch/guideScenarios.ts` fa uscite
  deterministiche sui percorsi di `navigation/fixtures/` (dritto fino alla
  fine, una deviazione e il rientro, un buco di GPS, fix poco precisi, una
  deviazione più lunga con il rientro più avanti); `guideTrace.ts` le fa
  correre al `navigator.ts` del telefono e scrive per ogni fix lo stato
  (`alongM`, `next`, `saidUpTo`, fuori rotta, arrivato) e gli avvisi per
  tipo. Le tracce stanno in `targets/watch/Core/Fixtures/guide/`, scritte da
  `scripts/watch-guide.sh`; `guideTrace.test.ts` controlla che siano quelle
  del codice di oggi, `GuideTests.swift` le rigioca in Swift (i metri entro
  1 cm, il resto uguale). Se `navigator.ts` cambia e le tracce no, jest
  fallisce; se le tracce cambiano e lo Swift no, `swift test`.

B1 fatta il 2026-11-08: 14 tracce, 31 test XCTest verdi, ogni costante
della guida legata (ADR-0314 «precisazione B1»); impronta `6f8bba4c`.

**B2 — Il percorso chiuso e i pezzi**: `startAnywhere.ts` (un percorso
chiuso preso dove lo si tocca) e `penUp.ts` (i disegni a penna alzata), con
tracce come in B1.

B2 fatta il 2026-11-08: 26 tracce, 39 test XCTest verdi, ogni costante
legata (ADR-0314 «precisazione B2»); impronta `6f8bba4c`.

**B3 — L'orologio da solo**: i percorsi mandati dal telefono («Send to
watch», testo da approvare) e tenuti sull'orologio, il GPS e la traccia
(`HKWorkoutRouteBuilder`), la schermata con freccia, metri e mappa, le
vibrazioni (schemi scelti dall'utente alla prima prova al polso), la traccia
al telefono al rientro. Qui servono le scelte dell'utente 4 e 5 e la build
con A-flip per la prova vera.

## B3, la proposta (2026-11-08)

Con le scelte 4, 5, 7 e 8. Nessun codice prima della lista al Coordinatore.

**Sul telefono**
- Sulla mappa di un percorso, accanto a «Favorites», il pulsante «Send to
  watch» (solo con un Apple Watch abbinato e l'app installata). Lo tocchi:
  «Sent to your watch». Il percorso parte con `transferUserInfo`, quindi
  arriva anche se l'orologio è lontano o spento.
- Ogni percorso tra i «Favorites» va sull'orologio da solo; tolto dai
  preferiti, sparisce dall'orologio.
- Il telefono manda il percorso già pronto: punti, direzioni semplificate
  (`simplifyDirections`), tratti a penna alzata (`walksOf`), parola, se si
  prende dove lo tocchi (`startsAnywhere`), sport, se va come la bici
  (`isRide`) o la canoa. L'orologio non ricalcola niente di questo.

**Sull'orologio**
- «Routes»: gli ultimi 20 percorsi ricevuti più i preferiti, col disegno in
  piccolo, la distanza e lo sport; in cima «Run without a route».
- In corsa: prima pagina freccia, metri alla prossima svolta e via (i testi
  delle svolte sono quelli del banner del telefono, già tradotti); con un
  gesto la mappa piccola col percorso e il punto, poi i numeri di sempre.
  Fuori rotta la freccia gira verso il percorso, con i metri.
- Le vibrazioni come Apple Maps (scelta 4), coi tipi di avviso di B1 e B2.
- GPS dell'orologio e `HKWorkoutRouteBuilder`: la traccia resta
  nell'allenamento di Salute; a fine corsa va al telefono con
  `transferFile`, che la apre come una corsa finita sua («Save» e il modulo
  di sempre).

**I testi nuovi** (inglese nell'interfaccia; approvati dall'utente il
2026-11-08 nelle cinque lingue)

| Dove | en | it | de | es | fr |
|---|---|---|---|---|---|
| telefono | Send to watch | Invia all'orologio | An die Uhr senden | Enviar al reloj | Envoyer à la montre |
| telefono | Sent to your watch | Inviato all'orologio | An die Uhr gesendet | Enviado al reloj | Envoyé à la montre |
| orologio | Routes | Percorsi | Routen | Rutas | Parcours |
| orologio | Send a route from MuW on your iPhone | Invia un percorso da MuW sull'iPhone | Sende eine Route aus MuW auf dem iPhone | Envía una ruta desde MuW en el iPhone | Envoyez un parcours depuis MuW sur l'iPhone |
| orologio | Off route | Fuori percorso | Abseits der Route | Fuera de la ruta | Hors parcours |
| orologio | Back on route | Di nuovo sul percorso | Wieder auf der Route | De nuevo en la ruta | De retour sur le parcours |
| orologio | Arrived | Arrivo | Ziel | Llegada | Arrivée |
| orologio | Reach the route to start | Raggiungi il percorso per partire | Zur Route gehen, um zu starten | Llega a la ruta para empezar | Rejoignez le parcours pour démarrer |
| orologio | To the {letter} | Verso la {letter} | Zum {letter} | Hacia la {letter} | Vers le {letter} |
| orologio | Next part | Parte successiva | Nächster Teil | Siguiente parte | Partie suivante |
| orologio | Pen down | Giù la penna | Stift aufsetzen | Baja el lápiz | Stylo baissé |

«Back on route», «Pen down» e le svolte riprendono parole che l'app dice già.
«Run without a route», «Favorites» e i numeri hanno già le loro traduzioni.

**Le parti del codice**, ciascuna con la sua lista al Coordinatore:
B3a il percorso dal telefono all'orologio (messaggio nuovo con le tracce di
contratto come in A1, pulsante, preferiti); B3b la corsa sull'orologio
(Navigator e Pen dentro `WorkoutManager`, GPS, vibrazioni, schermata);
B3c la traccia al telefono e il salvataggio. La prova vera al polso vuole la
build con A-flip.

**B3a1 fatta** (2026-11-08, branch `feat/TASK-370-b3a-route-to-watch`): il
contratto `WatchRoute` (TS e Swift, `routes.json` da `scripts/watch-routes.sh`,
i messaggi «route» e «routes» in `messages.json`), «Send to watch» sotto il
cuore (`FavoriteHeart.tsx`, al posto di `App.tsx`, d'accordo col
Coordinatore), `watchLink.ready()`, `RouteShelf` e `RouteStore`, la pagina
«Routes» come prima schermata dell'orologio. Provata nel simulatore di
watchOS 27 con tre percorsi salvati. B3a2 (i preferiti mandati da soli,
`useWatchFavorites` montato in `favoritesDoor.ts`) dopo, con la sua lista.

**B3a2 fatta** (2026-11-08, branch `feat/TASK-370-b3a2-favorites`): i
preferiti vanno sull'orologio da soli. `useWatchFavorites` (montato in
`favoritesDoor.ts`, una riga) a ogni cambio della lista, con l'orologio
pronto e l'account aperto, scarica il preferito intero, chiede le direzioni
(nessuna sull'acqua) e lo manda con «route»; alla fine manda «routes» con
tutte le chiavi. Uno alla volta, mai due giri insieme (un cambio durante un
giro ne fa partire un altro dopo); senza rete si ferma e tiene ciò che è
partito (`watchSent.ts`, le chiavi in un file), il resto al cambio o
all'apertura dopo. Nessun testo nuovo.

**B3b fatta** (2026-11-08): B3b1 (#1008) `GuideDisplay`, cosa mostra e come
vibra il polso; B3b2 (branch `feat/TASK-370-b3b2-watch-run`) l'app: un tocco
su un percorso di «Routes» fa partire lo sport con la guida. `GuideSession`
prende il GPS dell'orologio (CoreLocation, chiesto al via, testo del permesso
approvato dall'utente, scelta 9) e a ogni posizione passa Navigator e Pen,
la schermata e le vibrazioni di watchOS (Apple Maps per le svolte). Pagine:
la freccia (`GuideView`), la mappa piccola che inquadra il disegno
(`RouteMapView`), poi i numeri. Le parole delle svolte non ci sono: la
freccia vale in ogni lingua; restano «Off route», «Arrived», «Reach the route
to start», «To the {letter}», «Next part». «Back on route» e «Pen down» non
servono: lo dice la vibrazione. Provata nel simulatore di watchOS 27 con
una corsa simulata a Levico: la freccia a destra coi metri che scendono, la
svolta a sinistra dopo, la mappa, il fuori rotta in rosso con la freccia
verso il percorso. La traccia al telefono è B3c.

**B3c, le scelte** (2026-11-08): «Avviso e scheda» — quando la corsa
dell'orologio arriva sul telefono, una notifica e una scheda in cima a «My
activities» finché non la si salva o scarta; «Open» apre la schermata di
fine corsa di sempre. Testi approvati: «Your activity from the watch is
ready» / «Open MuW to save it.» / «From your Apple Watch» / «Open» (con
«Discard» che c'è già); it «L'attività dall'orologio è pronta», «Apri MuW
per salvarla.», «Dal tuo Apple Watch», «Apri»; de «Deine Aktivität von der
Uhr ist bereit», «Öffne MuW, um sie zu speichern.», «Von deiner Apple
Watch», «Öffnen»; es «Tu actividad del reloj está lista», «Abre MuW para
guardarla.», «Desde tu Apple Watch», «Abrir»; fr «Votre activité de la
montre est prête», «Ouvrez MuW pour l'enregistrer.», «De votre Apple
Watch», «Ouvrir».

**B3c1 fatta** (branch `feat/TASK-370-b3c1-watch-track`): il contratto
`WatchTrack` (Swift e TS, `Fixtures/tracks.json`), `TrackLog` (le posizioni
come le tiene il telefono: niente fix peggiori di 40 m, fuori ordine o in
pausa; al massimo 20 000), `TrackRecorder` (il GPS per ogni sport col GPS,
anche senza percorso, e `HKWorkoutRouteBuilder`: la linea sta anche
nell'allenamento di Salute), il file a fine allenamento con
`transferFile`. Il percorso porta ora `similarity` (facoltativa), che torna
con la traccia per il punteggio. B3c2: il telefono riceve e mostra.

**B3c2 fatta** (branch `feat/TASK-370-b3c2-phone-run`): il telefono
riceve il file dell'orologio (`watchFiles()`, l'evento `WatchFileReceived` e
quelli arrivati ad app chiusa con `getQueuedFiles`), lo tiene tra le corse in
attesa (`watchRuns.ts`, al massimo 10, in un file con `keptList`), manda la
notifica e mostra la scheda «From your Apple Watch» in cima a «My
activities» (`WatchRunCard`, una riga in `ActivitiesList.tsx`). «Open» la
toglie dall'attesa e apre la fine corsa di sempre (13 righe in `App.tsx`:
«finish» col punteggio per un percorso, «runFinish» senza); «Discard» la
toglie. La linea la rifà il registratore del telefono (`watchRun.ts`:
`addFix`, `pauseTrack`, `resumeTrack`), con i suoi metri e le sue pause. Da
provare con l'orologio vero: l'arrivo del file e la notifica.

**A-flip pronta** (2026-11-10, branch `feat/TASK-370-a-flip`, PR aperta da
NON unire prima del «merge A-flip» del Coordinatore: cambia l'impronta nativa
e `main` serve ancora gli OTA di produzione su `6f8bba4c`). L'utente ha detto
«procedi per me» su A-flip e sulla prova al polso con la build 1.1 (via il
Coordinatore, 2026-11-10). Le due dipendenze, approvate dall'utente il
2026-10-30: `@bacons/apple-targets` 5.0.0 e `react-native-watch-connectivity`
2.0.0 (solo iOS in `react-native.config.js`). In `app.json`
`./plugins/withWatchCore.js` e `["@bacons/apple-targets", {"match":
"watch"}]`; con TASK-401 B (#862) il `match` diventa
`"{live-activity,watch}"`, una config sola. `app.config.ts` non cambia:
`MUW_WATCH=1` ora non aggiunge niente. L'Android resta com'è (decisione
del Coordinatore, 2026-11-10): `fingerprint.config.js` conta i plugin
dell'orologio e le credenziali EAS che aggiungono (`extra.eas.build.
experimental.ios`) solo nell'impronta iOS, lo specchio di `ANDROID_ONLY`, e
non conta in nessuna i file che quei plugin caricano (test
`__tests__/iosOnlyFingerprint.test.ts`). Il Team ID Apple (`D6WUSJZKVZ`) sta
nelle opzioni del plugin. Impronte su copia pulita: iOS da `6f8bba4c` a
`77a5233c` (uguale con `MUW_WATCH=1`), Android `227457f3` invariata. I passi della 1.1
(`eas build`, TestFlight, la prova al polso, l'invio ad Apple) sono ognuno un
sì dell'utente.

## B5, la corsa libera sull'orologio (2026-11-10)

Dalla prova al polso con la build 11 l'utente ha chiesto la mappa anche
senza disegno, più colori e più informazioni. La proposta approvata è
«Sì, tutta».

- **Mappa nella corsa libera.** Negli sport col GPS le pagine sono Numeri
  → Mappa → Dettagli. La mappa mostra la linea fatta finora, in giallo, e
  una freccia blu che punta dove vai; segue chi corre, col nord in alto.
  Nella corsa col disegno il pallino diventa la stessa freccia.
- **Colori.** Tempo bianco, distanza gialla, passo azzurro, battito rosso,
  dislivello verde, calorie arancio. Anche il riepilogo finale è a colori.
- **Zone del battito.** Il telefono manda all'orologio le zone di «Heart
  rate zones», se ci sono età o FC massima. Sono il campo facoltativo
  `heartZones` del messaggio `settings`: i sei limiti, un orologio vecchio
  li ignora. L'orologio mostra «Z3» e una barra delle cinque zone.
- **Dettagli.** Passo medio, ultimo km, dislivello (come «Elev. gain» del
  telefono, solo sugli sport a terra), battito medio, calorie, ora. Il
  dislivello è anche nel riepilogo.

`WatchCore` ha tre file nuovi: `HeartZones`, `Climb` (gli scalini di 3 m
di `climbM`) e `LiveLine` (un punto ogni 5 m, al massimo 1500). Da
provare al polso con la build 12, insieme a B4.

## B4, il risveglio dell'orologio (2026-11-10)

Prova con la build 11: una corsa avviata sull'iPhone fa partire
l'orologio solo se MuW è già aperta al polso. Il messaggio di partenza
(`sendMessage`) arriva solo a un'app raggiungibile.

- **Telefono.** Al conto alla rovescia chiede ad Apple di avviare
  l'allenamento sull'orologio (`HKHealthStore.startWatchApp(with:)`), che
  lancia l'app anche chiusa. La funzione c'è già nella libreria HealthKit
  della build 1.0.1 (`startWatchApp` di @kingstinct/react-native-healthkit
  16.2.0), quindi basta JavaScript (`src/watch/watchWake.ts`). La libreria
  si carica come in `health/healthModules.ts`; senza il suo codice nativo
  (Expo Go, Android) non succede nulla. Quando Apple risponde sì e
  l'orologio non ha ancora detto il suo stato, il telefono rimanda la
  partenza con lo sport dell'app.
- **Senza permesso di Salute, o senza orologio,** Apple dice no: il
  risveglio fallisce in silenzio e la corsa sul telefono va avanti (test).
- **Orologio.** Un `WKApplicationDelegate` (`AppDelegate.swift`) riceve la
  configurazione dell'allenamento. `WorkoutManager.wake` aspetta 3 s la
  partenza del telefono, con lo sport esatto: bici, mountain bike e gravel
  per Apple sono tutte «ciclismo». Se non arriva, parte il primo sport
  con quel tipo e lo stesso GPS (`WatchWake.sport`). Una seconda partenza
  durante un allenamento non cambia nulla.
- **Impronta iOS** misurata su copia pulita con `APP_VARIANT=production`:
  6f8bba4c sul branch e su main, ferma.

Da provare al polso con la build 12.

## La 1.1.0: le prove al polso e l'invio (2026-11-10/11)

Tre build su TestFlight interno (EAS, profilo `production`), provate
dall'utente su iPhone e Apple Watch Ultra 2; esiti in
`out/TASK-370/prova-build-*.md` (fuori dal repository).

- **Build 11** (1.1.0, EAS `d4ccec04`, da #1058 `6cdc938f`, impronta iOS
  `77a5233c`): tutto ok con MuW già aperta sul polso; con l'app chiusa
  l'orologio non partiva (mancava il risveglio) → **B4**.
- **Build 12** (EAS `d55e13de`, da A-flip `6c4475d6` con B4 e B5): tutto ok,
  anche il risveglio con MuW chiusa e la corsa libera con mappa, colori, zona
  e dettagli («funziona tutto pubblica»).
- **Build 14** (EAS `09229e56`, da `release/1.1.0` `356e3f66` = `main` +
  A-flip + TASK-401 B, la Live Activity): tutto ok («Tutto ok», 2026-11-11).
  Il numero 13 l'ha consumato un lancio del 2026-11-10 rimasto fermo al
  login Apple.

Il taglio della 1.1.0 (scelta dell'utente al Coordinatore: «Anche Live
Activity», «ok procedi con tutto»): `release/1.1.0` da `main` con le due
branch unite lì, i conflitti risolti solo lì (`app.json`: un solo
`@bacons/apple-targets` con `match` `{live-activity,watch}`), e
`fingerprint.config.js` che conta `NSSupportsLiveActivities` e il target
della Live Activity solo per l'iPhone. Impronte: iOS **`5e1b5ce5`** (nuova,
1.1.0), Android **`227457f3`** (invariata).

**Inviata alla revisione** il 2026-11-11 (~13:38Z) dal Coordinatore col sì
dell'utente, rilascio automatico dopo l'approvazione; scheda con What's New,
due righe nuove nella descrizione e quattro screenshot dell'orologio dal
simulatore (Ultra, 422×514), approvati dall'utente. All'approvazione:
`main` riunito in `release/1.1.0`, impronte rimisurate, #1116 unita (chiude
#1058 e #862) e subito un OTA sul runtime nuovo.

## File toccati

Parte 0 (questa proposta):

```
docs/tasks/TASK-370.md (nuovo)
docs/DECISIONS.md (ADR-0314, aggiunta)
docs/STATUS.md (aggiunta)
```

Parte A: vedi «Parte A, il piano» sopra (lista mandata al Coordinatore
il 2026-11-05). Parte A2 (lista approvata dal Coordinatore il
2026-11-05, con le aggiunte approvate il 2026-11-06):

```
apps/mobile/targets/watch/expo-target.config.js, Info.plist, .gitignore (nuovi)
apps/mobile/targets/watch/App/*.swift (nuova: l'app SwiftUI)
apps/mobile/targets/watch/{en,it,de,es,fr}.lproj/ (nuove: testi generati)
apps/mobile/targets/watch/Core/Sources/WatchCore/WatchFormat.swift, WatchPaces.swift (nuovi)
apps/mobile/targets/watch/Core/Tests/WatchCoreTests/WatchFormatTests.swift, WatchPacesTests.swift (nuovi)
apps/mobile/targets/watch/Core/Fixtures/format.json (nuovo)
apps/mobile/plugins/withWatchCore.js, watchConfig.js, watchConfig.test.ts (nuovi)
apps/mobile/src/watch/watchTexts.ts, watchTexts.test.ts, watchFormat.test.ts (nuovi)
apps/mobile/scripts/watch-texts.sh (nuovo)
apps/mobile/app.config.ts (poche righe: MUW_WATCH)
docs/tasks/TASK-370.md, docs/DECISIONS.md, docs/STATUS.md
```
Parte A3 (lista approvata dal Coordinatore il 2026-11-08):

```
apps/mobile/src/watch/watchLink.ts, useWatch.ts, WatchHeart.tsx (nuovi)
apps/mobile/src/watch/watchLink.test.ts, useWatch.test.tsx, WatchHeart.test.tsx, watchHealth.test.ts (nuovi)
apps/mobile/src/watch/watchMessages.ts (il messaggio settings)
apps/mobile/targets/watch/Core/Fixtures/messages.json
apps/mobile/targets/watch/Core/Sources/WatchCore/WatchMessage.swift
apps/mobile/targets/watch/Core/Tests/WatchCoreTests/WatchMessageTests.swift
apps/mobile/targets/watch/App/PhoneLink.swift, WorkoutManager.swift
apps/mobile/src/health/useHealth.ts (una riga)
apps/mobile/src/screens/RunDashboard.tsx (useWatch e WatchHeart in RunCard)
docs/tasks/TASK-370.md, docs/DECISIONS.md, docs/STATUS.md
```

Parti B–D (previsti, ognuno con la sua lista al
Coordinatore prima di partire):

```
apps/mobile/targets/watch/ (nuova: target, Swift, XCTest)
apps/mobile/src/watch/ (nuova: il ponte col telefono e i test)
apps/mobile/package.json, app.json (le due dipendenze e il plugin)
apps/mobile/App.tsx, la schermata della corsa («Send to watch», il battito)
apps/mobile/src/health/ (l'allenamento salvato dall'orologio)
apps/mobile/src/i18n/*.ts, site/privacy/ (testi e privacy, col sì)
docs/DECISIONS.md, docs/STATUS.md, docs/tasks/TASK-370.md
```

La privacy dell'orologio (2026-11-10, turno dal Coordinatore dopo la #998):

```
apps/mobile/src/about/content/{en,it,de,es,fr}.ts (la sezione e la data)
apps/mobile/src/about/AboutPage.test.tsx, documents.test.ts (solo la data)
site/privacy/index.html, site/privacy/{it,de,es,fr}/index.html (rigenerati)
site/tests/privacy.test.mjs (solo la data)
docs/tasks/TASK-370.md
```

Parte B5 (lista mandata al Coordinatore il 2026-11-10):

```
apps/mobile/src/watch/watchSettings.ts, watchSettings.test.ts (nuovi)
apps/mobile/src/watch/watchMessages.ts, useWatch.ts, useWatch.test.tsx, watchTexts.ts
apps/mobile/targets/watch/Core/Sources/WatchCore/HeartZones.swift, Climb.swift, LiveLine.swift (nuovi)
apps/mobile/targets/watch/Core/Tests/WatchCoreTests/HeartZonesTests.swift (nuovo)
apps/mobile/targets/watch/Core/Sources/WatchCore/WatchMessage.swift
apps/mobile/targets/watch/Core/Tests/WatchCoreTests/WatchMessageTests.swift
apps/mobile/targets/watch/Core/Fixtures/messages.json
apps/mobile/targets/watch/App/LiveMapView.swift (nuovo)
apps/mobile/targets/watch/App/MuWWatchApp.swift, RouteMapView.swift, WorkoutManager.swift
apps/mobile/targets/watch/{en,it,de,es,fr}.lproj/Localizable.strings (rigenerati)
docs/tasks/TASK-370.md
```

Parte B4 (lista mandata al Coordinatore il 2026-11-10):

```
apps/mobile/src/watch/watchWake.ts, watchWake.test.ts (nuovi)
apps/mobile/src/watch/useWatch.ts, useWatch.test.tsx
apps/mobile/targets/watch/App/AppDelegate.swift (nuovo)
apps/mobile/targets/watch/App/MuWWatchApp.swift, WorkoutManager.swift
apps/mobile/targets/watch/Core/Sources/WatchCore/WatchWake.swift (nuovo)
apps/mobile/targets/watch/Core/Tests/WatchCoreTests/WatchWakeTests.swift (nuovo)
docs/tasks/TASK-370.md
```

## Criteri di accettazione

- [ ] (0) Proposta in `main`, ADR-0314 «Proposto», scelte dell'utente
      registrate.
- [ ] (A) Avvio, pausa e stop dal polso e dal telefono, lo stesso stato sui
      due; il battito in tempo reale sul telefono; un solo allenamento in
      Salute.
- [ ] (B) Un percorso mandato all'orologio si corre col telefono spento:
      freccia, vibrazioni, fuori rotta e rientro come sul telefono (gli
      stessi fixture verdi in jest e XCTest); la traccia arriva al telefono
      e si salva e pubblica.
- [ ] (C) Ogni sport del registro ha i suoi numeri sull'orologio; il nuoto
      resta spento fino alla prova in acqua.
- [ ] (D) Testi e privacy approvati; build e invio col sì dell'utente.
