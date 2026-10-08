# TASK-261 — Registrare la corsa con l'app in secondo piano

**Stato**: In corso
**Fase**: 4 · **Branch**: `feat/TASK-261-background-gps`

## Obiettivo

Con il telefono bloccato o un'altra app davanti, la corsa (con e senza
percorso, a piedi, in bici, in canoa) continua a registrare le posizioni,
la pausa automatica funziona come in primo piano, e la linea si taglia
solo quando la posizione si è fermata davvero.

## Contesto

Chiesto dall'utente il 2026-10-07 («fai anche il task del GPS in secondo
piano»; nella sessione «Scelte prodotto prioritarie»: «Sì, ma senza il
permesso Sempre»). Numeri TASK-261 e ADR-0225 dati dal coordinatore il
2026-10-07. Il seguito era scritto in `tasks/TASK-255.md`, «Fuori scope».

Oggi (`main` a `15cdd70`) `useNavigation` e `useFreeRun` seguono il GPS con
`Location.watchPositionAsync`, solo in primo piano: il sorgente nativo di
expo-location 57 (`ios/Providers/BaseLocationProvider.swift`) mette
`allowsBackgroundLocationUpdates = false`, e `app.json` non ha
`UIBackgroundModes`. A telefono bloccato registrazione, voce e pausa
automatica si fermano senza avviso. TASK-255 (ADR-0219) tiene lo schermo
acceso e, se l'app resta in secondo piano più di 60 s, mette la corsa in
pausa (`Pause.away`, `RunRecorder.leave`, `AWAY_AFTER_MS`) così che al
ritorno non ci sia una riga dritta.

**Cosa dicono le fonti** (verificate il 2026-10-07/08):

- Apple, `CLLocationManager.allowsBackgroundLocationUpdates`: con
  `UIBackgroundModes` `location` e la proprietà a `true`, se gli
  aggiornamenti partono con l'app in primo piano «Updates continue even if
  the app subsequently enters the background», e iOS mostra la barra o
  pillola blu. Il permesso «Always» non serve: basta «While using». Un
  ingegnere Apple (forum, thread 766762) lo conferma («the standard example
  … is a map app that's providing turn by turn directions»), avvertendo
  che iOS a volte sospende comunque l'app.
- expo-location 57: `startLocationUpdatesAsync` su iOS controlla **solo**
  il permesso in primo piano (`ios/LocationModule.swift`: «As a
  user-initiated foreground service, this does NOT require the background
  location permission»), richiede `UIBackgroundModes` `location`
  (`isIosBackgroundLocationEnabled` del plugin), e consegna le posizioni a
  un task di **expo-task-manager**. Il suo consumatore nativo mette di
  partenza `pausesLocationUpdatesAutomatically = true`: va passato `false`.
- Docs Expo (expo-location): «You must use a development build to use
  background location since it is not supported in the Expo Go app»
  (iOS); `TaskManager.isAvailableAsync`: in Expo Go «does not support
  background execution on iOS».
- La voce: per Apple AVSpeechSynthesizer «obeys the same rules as other
  audio»; con la sessione audio di partenza (`soloAmbient`) iOS zittisce
  l'app a schermo bloccato. Farla parlare richiede `UIBackgroundModes`
  `audio` e una sessione «playback» (expo-audio): **non in questo task**
  (scelta dell'utente, sotto).
- React Native 0.86 (`React/CoreModules/RCTTiming.mm`): in background i
  timer JS girano con un `NSTimer` finché l'app è viva, quindi il
  controllo della pausa automatica (`runControl`, ogni secondo) continua.

**Scelte dell'utente** (in chat, 2026-10-07 e 2026-10-08, una domanda per
volta con la proposta dell'agente):

1. **Sì alla dipendenza nuova `expo-task-manager`** (~57.0.19, la
   versione dell'SDK 57; il lock ha 57.0.21 e `unimodules-app-loader`).
2. **Permesso «While using» + modo background con la barra blu di iOS,
   senza chiedere «Always»**; Android resta come oggi (servirebbe una
   notifica fissa con un testo nuovo: un seguito).
3. **La prova**: in Expo Go tutto resta come oggi; per il GPS in
   background serve una **build nativa**. L'agente prova nel simulatore;
   la prova sull'iPhone è dell'utente, con una build installata sul
   telefono (Xcode e cavo, o EAS/TestFlight).
4. **La voce a telefono bloccato va dopo**, quando la parte A sarà stata
   provata sull'iPhone (è la «parte B», sotto): nella parte A i km detti in
   secondo piano contano (non si ripetono al ritorno) e la voce parla se
   iOS lo permette.

**Cosa vede l'utente**: nessuna finestra di permesso in più (è lo stesso
«While using» di oggi). Durante un'attività con l'app in secondo piano iOS
mostra la **pillola blu** in alto, che riporta a MuW. La **batteria**: il
GPS resta acceso come oggi per tutta l'attività; a schermo spento il
telefono consuma meno di adesso, che lo schermo resta acceso (TASK-255).
Il permesso «Sempre» **non** è chiesto. Cambia il testo della finestra del
permesso di posizione, in cinque lingue (sotto), e nelle Impostazioni di
iOS, alla voce dell'app, compare la scelta della lingua (perché l'app ora
ha le cartelle `*.lproj`). Tutte e due le cose si vedono solo in una
build nativa.

## Contesto da leggere

- `docs/DECISIONS.md`: ADR-0219 (TASK-255), ADR-0066 (modalità tasca)
- `apps/mobile/src/navigation/trackStore.ts` (`leave`, `AWAY_AFTER_MS`),
  `trackRecorder.ts`, `useNavigation.ts`, `useFreeRun.ts`, `runControl.ts`

## Cosa fare

1. `runPosition.ts` (nuovo): `watchRunPosition(options, onPosition)`. Su
   iOS, se il modo background c'è (`isBackgroundLocationAvailableAsync`,
   `TaskManager.isAvailableAsync`), `startLocationUpdatesAsync` sul task
   `muw-run-location` (definito quando l'app si carica), con
   `activityType` Fitness, `pausesUpdatesAutomatically: false`,
   `showsBackgroundLocationIndicator: true`; altrimenti, o se il telefono
   rifiuta, `watchPositionAsync` come oggi. Start e stop uno dopo l'altro;
   le posizioni per nessuna corsa (app chiusa a metà, task ripartito da
   iOS) fermano il task.
2. `runAway.ts` (nuovo): quando dire al registratore che il GPS si può
   essere fermato (`RunRecorder.leave`). Col GPS solo in primo piano,
   come TASK-255: l'app che passa a «background». Col GPS in background,
   l'uscita dal primo piano non conta più: conta solo **l'app congelata
   da iOS**, che si vede da un battito dell'orologio JS (ogni secondo)
   arrivato con più di 15 s di ritardo, controllato anche prima di ogni
   posizione. Il congelamento conta anche col GPS in primo piano.
   La regola dei 60 s di ADR-0219 resta: un tratto nuovo solo se la
   posizione dopo arriva più di 60 s dopo l'ultima.
3. `useNavigation`/`useFreeRun`: `watchRunPosition` al posto di
   `watchPositionAsync`, `watchAway` al posto del loro ascoltatore di
   `AppState`.
4. `app.json`: il plugin `expo-location` con
   `isIosBackgroundLocationEnabled` e `locationWhenInUsePermission`;
   `locales` (cinque file nuovi in `apps/mobile/locales/`) con
   `CFBundleAllowMixedLocalizations`, come dice la guida Expo.
5. Test deterministici; prova nel simulatore con una build nativa.
6. ADR-0225, `UI.md`, `STATUS.md`.

## Criteri di accettazione

- [x] Su iOS con il modo background il GPS parte con
      `startLocationUpdatesAsync` (opzioni sopra) e le posizioni del task
      arrivano alla corsa in ordine; a «Stop» il task si ferma
      (`runPosition.test.ts`).
- [x] Senza modo background (Expo Go), con il telefono che rifiuta il
      task, o su Android: `watchPositionAsync` come oggi, e la pausa dei
      60 s di TASK-255 come oggi (`runPosition.test.ts`,
      `backgroundRun.test.ts`, i test di TASK-255 invariati).
- [x] A telefono bloccato, col GPS in background, la linea, i metri e i
      km detti continuano; il km non si ripete al ritorno
      (`backgroundRun.test.ts`).
- [x] Fermi 70 s a un semaforo a telefono bloccato: pausa automatica e
      ripresa come in primo piano, nessun taglio (`backgroundRun.test.ts`).
- [x] L'app congelata da iOS per tre minuti: un tratto nuovo, niente
      metri né tempo di mezzo; entro 60 s la linea continua
      (`backgroundRun.test.ts`, `runAway.test.ts`).
- [x] La fine di una corsa non ferma mai il GPS della successiva
      (`runPosition.test.ts`).
- [x] Prova nel simulatore con una build nativa, l'app in background e la
      posizione che si muove: le posizioni continuano (sotto, «La prova
      nel simulatore»).
- [ ] I testi del permesso, in cinque lingue, mostrati all'utente prima
      del merge.
- [x] `npm run lint`, `typecheck`, `test`, `format:check` verdi.

## Il testo del permesso (`NSLocationWhenInUseUsageDescription`)

- en: «MuW uses your location to draw routes near you and to record your
  activities. During an activity it keeps recording with the phone locked,
  and iOS shows the blue bar.»
- it: «MuW usa la tua posizione per disegnare percorsi vicino a te e
  registrare le tue attività. Durante un'attività continua a registrare
  anche a telefono bloccato, e iOS mostra la barra blu.»
- de: «MuW nutzt deinen Standort, um Routen in deiner Nähe zu zeichnen und
  deine Aktivitäten aufzuzeichnen. Während einer Aktivität zeichnet MuW
  auch bei gesperrtem Telefon weiter auf, und iOS zeigt die blaue Leiste.»
- es: «MuW usa tu ubicación para dibujar rutas cerca de ti y registrar tus
  actividades. Durante una actividad sigue registrando también con el
  teléfono bloqueado, y iOS muestra la barra azul.»
- fr: «MuW utilise ta position pour dessiner des parcours près de toi et
  enregistrer tes activités. Pendant une activité, MuW continue
  d'enregistrer même téléphone verrouillé, et iOS affiche la barre bleue.»

La lingua della finestra è quella del telefono (la sceglie iOS), non
quella scelta in «Settings» di MuW.

## Expo Go o build nativa

- **Expo Go** (il canale `preview` sull'iPhone dell'utente): il background
  non c'è; l'app lo vede e segue il GPS in primo piano come oggi, con lo
  schermo acceso (TASK-255) e la pausa dei 60 s. Pubblicare su `preview`
  non cambia niente di visibile.
- **Build nativa** (simulatore, Xcode sull'iPhone, EAS/TestFlight): il GPS
  continua a telefono bloccato, con la pillola blu, e il testo nuovo del
  permesso. `app.json` aggiunge `UIBackgroundModes` `location` e, per
  expo-task-manager, `fetch`.

## La prova nel simulatore (2026-10-08)

Build Release nativa (`expo prebuild`, `pod install`, la patch UIScene di
iOS 27, aggiornamenti spenti; `ios/` resta fuori da git) su un simulatore
iPhone 17 / iOS 27 creato per la prova, la posizione che si muove a 3,3
m/s verso nord da Trento (`simctl location start`). Il pannello del
simulatore non aveva il permesso dell'utente, quindi niente tocchi: per
partire subito con una corsa libera, un avvio di prova temporaneo
(`index.ts` → un componente con `useFreeRun(true)`), mai committato e tolto
dopo.

- La finestra del permesso dell'app vera mostra il testo nuovo, con
  «Allow Once», «Allow While Using App», «Don't Allow»: nessun «Always».
  Le cinque `InfoPlist.strings` sono nel pacchetto; `UIBackgroundModes` è
  `fetch`, `location`.
- **Con le Impostazioni davanti (MuW in background) per circa 100 s**, il
  file della corsa (`Documents/current-run.json`) ha **54 posizioni nuove
  fra 15:17:55 e 15:19:32**, al più 1,9 s l'una dall'altra, **nessun
  taglio**, i metri da 355 a 757; la barra mostra la freccia della
  posizione e «◀ MuW». Tornata davanti, lo stesso processo (iOS non l'ha
  mai sospesa): 146 posizioni, 859 m, nessuna pausa nuova.
- **App chiusa a forza a metà corsa**, poi riaperta senza corsa: il task
  rimasto registrato riparte all'avvio (15:21:19,6) e **si ferma da solo
  mezzo secondo dopo** alla prima posizione (`locationd`:
  `BackgroundLocationTimeStopped`); la freccia della posizione sparisce.
- Non provati nel simulatore: il telefono bloccato (il simulatore non lo
  fa senza tocchi), il congelamento dell'app da parte di iOS (lo coprono i
  test), la pillola blu vera (il simulatore mostra la freccia). Sono la
  prova sull'iPhone dell'utente.

## File toccati

```
apps/mobile/src/navigation/runPosition.ts               (nuovo, + test)
apps/mobile/src/navigation/runAway.ts                   (nuovo, + test)
apps/mobile/src/navigation/backgroundRun.test.ts        (nuovo)
apps/mobile/src/navigation/useNavigation.ts
apps/mobile/src/navigation/useFreeRun.ts
apps/mobile/src/navigation/trackRecorder.ts             (il commento di `Pause.away`)
apps/mobile/app.json
apps/mobile/locales/en.json, it.json, de.json, es.json, fr.json   (nuovi)
apps/mobile/package.json, package-lock.json             (expo-task-manager)
docs/tasks/TASK-261.md
docs/UI.md, docs/STATUS.md, docs/DECISIONS.md           (le righe di questo task)
```

## Parte B — La voce a telefono bloccato (da fare dopo)

Il nome «parte B» è del coordinatore (2026-10-08). L'utente l'ha già
scelta il 2026-10-08, rispondendo alla domanda con la proposta: **dopo la
prova sull'iPhone della parte A**, non adesso. La parte A non la aspetta.

- **Perché**: con la sessione audio di partenza (`soloAmbient`) iOS
  zittisce la voce a schermo bloccato; i km si contano lo stesso.
- **Proposta**: la dipendenza nuova `expo-audio` (~57.0.5, SDK 57), con
  `enableBackgroundPlayback` del suo plugin (`UIBackgroundModes` `audio`),
  e alla partenza della corsa `setAudioModeAsync({ playsInSilentMode,
  shouldPlayInBackground, interruptionMode })`. Il sorgente di expo-audio
  57 mette la categoria (`playback` con `duckOthers` o `mixWithOthers`)
  senza attivare la sessione; la attiva la sintesi vocale quando parla.
- **Scelte che sono dell'utente**, da chiedere allora: la voce sopra
  Spotify (abbassarlo mentre parla, o mischiarsi), e se parlare anche con
  l'interruttore silenzioso. Si prova solo sull'iPhone.
- **Prima di partire**: chiedere la dipendenza `expo-audio` (CLAUDE.md).

## Fuori scope

- **Android in background**: servizio in primo piano con una notifica
  fissa (testo nuovo) e i permessi `FOREGROUND_SERVICE_LOCATION`.
- Il permesso «Always» e la corsa che riparte dopo che iOS ha chiuso
  l'app: non chiesti.
- Un avviso sulla pillola blu dentro l'app: testo nuovo, da chiedere.
- `trackStore.ts`: la regola dei 60 s non cambia, quindi non si tocca.
- La patch UIScene per iOS 27 e la build per l'App Store: TASK-132 /
  TASK-152.

## Esito

*(da compilare)*
