# TASK-169 — La corsa: conto alla rovescia, due pagine, pausa e tutti i numeri

**Stato**: Done
**Fase**: 4 · **Branch**: `feat/TASK-169-run-flow`

## Obiettivo

Una corsa, con un percorso o senza, parte con un conto alla rovescia, si
mette in pausa e si riprende, si chiude tenendo premuto «Stop», e ha due
pagine da scorrere: «Map» (mappa, indicazioni, pochi numeri) e «Data»
(tutti i numeri, i km uno per uno). Chiesto dall'utente il 2026-10-02 con
una registrazione di Nike Run Club come riferimento, «sempre con il nostro
stile».

## Contesto da leggere

- `docs/UI.md` «La navigazione», «Correre senza percorso»
- `docs/DECISIONS.md` ADR-0133, ADR-0091, ADR-0122, ADR-0066
- `apps/mobile/src/screens/RunPanel.tsx`, `FreeRunScreen.tsx`,
  `NavigateScreen.tsx`, `PocketScreen.tsx`
- `apps/mobile/src/navigation/trackRecorder.ts`, `trackStore.ts`,
  `useFreeRun.ts`, `useNavigation.ts`, `runStats.ts`

## Cosa fare

1. La traccia conosce le pause (`trackRecorder.ts`): da quando a quando,
   a mano o da sole; il tempo della corsa è senza le pause; la prima
   posizione dopo una pausa non aggiunge metri. La quota di ogni
   posizione. Il file della corsa le tiene (`trackStore.ts`).
2. I comandi della corsa (`runControl.ts`): conto alla rovescia, «Pause»,
   «Resume», pausa da sola dopo 10 secondi fermi, «Voice».
3. I numeri nuovi (`runMetrics.ts`): i km uno per uno, il dislivello, le
   calorie stimate. Passi e ultimo km senza le pause (`runStats.ts`).
   Le calorie sono una stima e si basano su due cose sole: i km corsi e
   un peso di 70 kg uguale per tutti, a 1,036 kcal per kg e per km. Non
   usano il peso di chi corre (il profilo non lo ha), né passo, dislivello
   o battito: chi pesa 60 kg legge circa il 15% in più del vero, chi ne
   pesa 85 circa il 18% in meno.
4. I due registratori (`useFreeRun.ts`, `useNavigation.ts`) sotto i
   comandi; la quota; la voce a ogni km anche con un percorso.
5. La scheda della corsa (`RunDashboard.tsx`): le pagine «Map» e «Data»
   con lo swipe, «Pause», «Stop» da tenere premuto (`HoldButton.tsx`),
   «Resume», gli interruttori, il conto alla rovescia (`Countdown.tsx`).
6. Test; `UI.md`, ADR-0137.

## Criteri di accettazione

- [x] Una corsa nuova mostra «3», «2», «1» e conta metri e tempo solo dopo;
      una corsa ripresa riparte subito.
- [x] «Map» ha il banner, tre numeri (km, passo di adesso, tempo) e, con
      un percorso, la barra e i km rimasti.
- [x] «Data» ha i km in grande, sei riquadri (passo di adesso, passo
      medio, tempo, ultimo km, dislivello, calorie), i km uno per uno e,
      in alto, la svolta o la partenza.
- [x] Si passa fra le pagine con lo swipe o toccando «Map» e «Data».
- [x] «Pause» ferma tempo e traccia; «Resume» li riprende, e la prima
      posizione dopo non aggiunge metri.
- [x] Dieci secondi fermi mettono in pausa da soli, muoversi riprende;
      «Auto-pause» spenta, no.
- [x] «Stop» finisce la corsa solo se tenuto premuto; un tocco no.
- [x] «Voice» spenta: nessuna voce, la vibrazione delle svolte resta.
- [x] Il tempo a fine corsa e nella voce è senza le pause; «Keep running»
      non conta il tempo fra «Stop» e la ripresa.
- [x] Un file della corsa di prima si legge ancora.
- [x] `App.tsx` non è toccato; nessuna dipendenza nuova; test, lint,
      typecheck e format dell'app verdi.
- [x] Visto nel simulatore con un GPS simulato, nelle due corse.
- [ ] Prova sull'iPhone (dell'utente, dopo la pubblicazione): lo swipe col
      dito, «Stop» tenuto premuto, la pausa da sola camminando.

## File toccati

```
apps/mobile/__tests__/AppFreeRun.test.tsx
apps/mobile/src/navigation/freeRun.ts
apps/mobile/src/navigation/runControl.ts
apps/mobile/src/navigation/runControl.test.ts
apps/mobile/src/navigation/runMetrics.ts
apps/mobile/src/navigation/runMetrics.test.ts
apps/mobile/src/navigation/runStats.ts
apps/mobile/src/navigation/runStats.test.ts
apps/mobile/src/navigation/trackRecorder.ts
apps/mobile/src/navigation/trackRecorder.test.ts
apps/mobile/src/navigation/trackStore.ts
apps/mobile/src/navigation/trackStore.test.ts
apps/mobile/src/navigation/useFreeRun.ts
apps/mobile/src/navigation/useFreeRun.test.ts
apps/mobile/src/navigation/useNavigation.ts
apps/mobile/src/navigation/useNavigation.test.ts
apps/mobile/src/screens/Countdown.tsx
apps/mobile/src/screens/FreeRunScreen.tsx
apps/mobile/src/screens/FreeRunScreen.test.tsx
apps/mobile/src/screens/HoldButton.tsx
apps/mobile/src/screens/NavigateScreen.tsx
apps/mobile/src/screens/NavigateScreen.test.tsx
apps/mobile/src/screens/RunDashboard.tsx
apps/mobile/src/screens/RunDashboard.test.tsx
apps/mobile/src/screens/RunPanel.tsx
apps/mobile/src/screens/RunPanel.test.tsx
apps/mobile/src/theme/tokens.ts
docs/UI.md
docs/DECISIONS.md
docs/STATUS.md
docs/tasks/TASK-169.md
```

## Fuori scope

- **Il battito.** L'utente lo vuole da un sensore Bluetooth e da Apple
  Watch, con la casella solo quando un sensore è collegato. Due task a
  parte, tutti e due solo in una build propria (non in Expo Go):
  il sensore Bluetooth (fascia, bracciale, orologio che trasmette) con
  `react-native-ble-plx`, dipendenza nuova da approvare; Apple Watch con
  HealthKit e un'app per l'orologio, dopo TASK-152.
- **La musica.** L'utente usa Spotify (TASK-173): lì il pulsante «Music»
  che lo apre, fatto in Expo Go, e la domanda su brano e comandi nella
  schermata, che vogliono un'app Spotify Developer dell'utente. Da provare
  sull'iPhone anche se la voce ferma la musica.
- La cadenza e il dislivello dal barometro: vogliono `expo-sensors`.
- Il peso nel profilo, per le calorie: oggi 70 kg per tutti.
- La linea sulla mappa spezzata dove c'è stata una pausa: oggi un tratto
  dritto unisce i due punti (i metri non contano).
- La schermata prima della corsa di Nike (mappa, «START», obiettivo).
- La fine di una corsa con percorso (`FinishScreen.tsx`): resta com'è,
  con il tempo senza le pause.
- Ricordare «Auto-pause» e «Voice» fra un avvio dell'app e l'altro.

## Esito

Fatto (2026-10-02): la corsa parte con il conto alla rovescia, ha le
pagine «Map» e «Data», «Pause» a mano e da sola, «Stop» da tenere premuto,
dislivello, calorie stimate e i km uno per uno; la voce dice i km anche
con un percorso. 5 file di codice nuovi e 3 di test; lint, typecheck e
format puliti. Provato nel simulatore con il GPS simulato: senza percorso
(conto alla rovescia, «Map», «Data», pausa) e con un cuore a Trento
dall'API sul Mac (svolta su «Data», barra, splits al primo km, pausa da
sola fermando il GPS e ripresa muovendolo). **Manca la prova sull'iPhone**:
lo swipe col dito e «Stop» tenuto premuto non si potevano provare nel
simulatore, che non si lasciava toccare.

Emerso: «Keep running» contava nel tempo anche i minuti fra «Stop» e la
ripresa; ora sono una pausa (ADR-0137). Rimandati, con la risposta
dell'utente già avuta: il battito da sensore Bluetooth e da Apple Watch.
La musica: l'utente usa Spotify (TASK-173).
