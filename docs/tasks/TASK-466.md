# TASK-466 — Lo stretching nuovo: animazioni, routine, palestra, mattino, routine pubblicate

**Stato**: In corso · parte A in `main` (#1181, `437f152f`, 2026-11-12;
esce con l'aggiornamento completo); prossima B
**Fase**: 4 · **Branch**: `feat/TASK-466-a-stretch-motion` (A); B, C, D, E
ciascuna col suo branch e la sua PR
**ADR**: ADR-0378 (una per tutte le parti; la voce va nella PR di soli
documenti dopo il merge della A)
**Dipende da**: TASK-285 (lo stretching dopo la corsa, chiuso). C dopo
TASK-461 A2 e TASK-465 (file di `src/gym`, turno dal Coordinatore).

## Obiettivo

Lo stretching diventa una parte vera dell'app: animazioni più belle e vive,
più esercizi e routine pronte da 3, 5 e 10 minuti, lo stretching anche in
palestra, al mattino dopo la sveglia, e routine fatte dall'utente da
pubblicare.

## Contesto

Richieste dell'utente del 2026-11-11, in questa sessione:

1. «migliora la parte sullo stretching… migliora le animazioni anche»;
2. «aggiungi lo stretching alla palestra e dai la possibilità di fare
   stretching 3, 5 o 10 minuti al mattino dopo la sveglia, l'app ti legge
   quando hai la sveglia e l'utente può impostare lo stretching e poi
   pubblicarlo».

La proposta in cinque parti è stata approvata dall'utente («Sì, vai»).
Durate lette come **3, 5 e 10 minuti** («30niunti 5 o 10»): se l'utente
voleva anche 30 minuti, si aggiunge in B.

**La sveglia**: su iPhone nessuna app può leggere le sveglie dell'app
Orologio (Apple non lo permette). Su iOS l'utente scrive in MuW l'orario
e i giorni della sveglia; su Android la prossima sveglia si legge con
`AlarmManager.getNextAlarmClock()`, codice nativo: arriva con una build
(1.0.3), separata dalla parte JS. Più avanti, sempre in una build, MuW
potrebbe suonare la sveglia da sé su iOS 26 (AlarmKit).

Regole del Coordinatore (2026-11-11): una PR per parte; testi nuovi e
aspetto col sì dell'utente, con screenshot o video dal simulatore solo
quando il Coordinatore dà il turno; PR di codice senza STATUS, DECISIONS,
INDEX; registro i18n condiviso: se altri entrano prima, unire `main`
tenendo tutte le voci; nessun OTA di produzione per due giorni.

## Contesto da leggere

- `apps/mobile/src/stretch/` (tutto: è piccolo)
- ADR-0247 (TASK-285, lo stretching dopo la corsa), ADR-0147 (animare
  con `Animated` e View girate, senza librerie)
- `docs/TESTING.md` (jest: tempo finto, animazioni istantanee)

## Parte A — Animazioni e schermata

_(branch `feat/TASK-466-a-stretch-motion`)_

1. **Respiro**: mentre la posa è tenuta, la figura va lentamente un po'
   più a fondo e torna (`Breath` in `poses.ts`, `BREATH_MS` = 4 s), pochi
   gradi sui segmenti che fanno l'allungamento, diversi per esercizio.
2. **In piedi fra due pose**: da un esercizio piegato all'altro la figura
   si rialza e poi scende nella posa nuova (`path` in `Figure.tsx`).
3. **Il cambio lato**: in piedi la figura si gira (si stringe di profilo e
   si apre dall'altra parte), poi scende di nuovo; non più lo scatto.
4. **Il disegno**: giunture tonde (niente buchi sulle pieghe), testa un po'
   più tonda.
5. **«Get ready»** di 5 s prima di ogni esercizio e **«Switch sides»** di
   3 s fra i lati: il tempo della tenuta parte solo a figura in posa.
6. **Suoni**: un tick all'inizio della tenuta e sugli ultimi 3 secondi,
   poi il «ding» di prima. `tick.wav` è nostro, fatto da
   `tools/stretch_chime.py` come il ding (che resta identico).
7. **«Next: …»** negli ultimi 5 s dell'ultimo lato di un esercizio.
8. **Tasti**: «Pause», «Skip» (salta l'esercizio), «End» (esce); all'ultimo
   esercizio «Pause» e «Done». «Next» era nella proposta, ma la chiave
   `Next` esiste già tradotta «A seguire»: si riusa «Skip» / «Salta».
9. **«Riduci movimento»** acceso: ogni posa subito, niente respiro.

Testi nuovi, approvati dall'utente il 2026-11-12: «End» (Fine, Beenden,
Terminer, Terminar), «Next: {exercise}» (Dopo: …, Als Nächstes: …,
Ensuite : …, Siguiente: …).

## Parte B — Più esercizi e routine pronte

~15 esercizi (collo, spalle, petto, schiena, fianchi, adduttori, oltre ai
cinque delle gambe), tre routine — **Morning**, **After run**, **After gym**
— in tre durate, 3, 5 e 10 minuti. Solo `src/stretch/**` e i18n. Nomi e
testi col sì dell'utente.

_(branch `feat/TASK-466-b-routines`; lista dei file approvata dal
Coordinatore il 2026-11-12)_

1. **Dieci esercizi nuovi** (`MORE_EXERCISES`), quindici in tutto, ognuno
   col suo respiro: Neck stretch, Overhead reach, Shoulder stretch, Chest
   opener, Triceps stretch, Upper back stretch, Forward fold, Cat stretch,
   Child's pose, Knee hug. Tutti leggibili di profilo; gli adduttori e le
   pose sdraiate restano fuori (di lato non si capiscono, la testa tonda
   andrebbe sotto il pavimento): «Knee hug» si fa in piedi.
2. **Le routine** (`routines.ts`): per ogni durata una lista e una tenuta
   sola (20 s a 3 minuti, 25–30 a 5, 40 a 10); `sessionSeconds` conta
   anche «Get ready» e «Switch sides», e ogni routine sta fra il 90% e il
   105% dei minuti che dice. `READY_S` e `SWITCH_S` passano in
   `exercises.ts` (la schermata li riesporta).
3. **La scelta della durata nella schermata** (scelta dell'utente,
   2026-11-12, «Nella schermata»): «Stretch» a fine corsa apre
   `RoutineChooser` — nome della routine, «How long?», tre tasti «3 min»,
   «5 min», «10 min», «Not now» — poi gli esercizi. Con `exercises` dati
   la schermata parte subito, come prima; `routine` sceglie la routine
   (per C e D). Nessun file fuori da `src/stretch`, i18n e i test.
4. **La gamba staccata** (trovata nella prova al simulatore del
   2026-11-12, difetto della parte A): alla seconda apertura dello
   stretching nella stessa sessione dell'app una gamba della figura
   restava in basso a destra. iOS riusa le viste, e una vista con la
   cornice esattamente (0, 0, 0, 0) tiene la posizione che aveva prima:
   le giunture erano tutte a dimensione zero. Ora ogni giuntura è un
   quadrato di 2 pt attorno al suo punto (`JOINT` in `Figure.tsx`); la
   figura è la stessa. Deciso dall'agente su delega dell'utente.
   **Il difetto è in produzione**: la #1181 è uscita con l'aggiornamento
   completo del 12 novembre (OTA 12); la correzione esce col primo OTA
   dopo il merge della #1216. Prima e dopo in
   `out/TASK-466/b/TASK-466-b-3-prima-dopo.jpg`.
5. **«Child's pose» dentro lo schermo**: le braccia lunghe arrivavano a
   0,60 dell'altezza davanti all'anca, più di mezzo telefono da 390 pt.
   Una posa che va oltre `REACH` (0,46) fa scivolare indietro tutta la
   figura di quanto serve (`drift` in `poses.ts`); oggi solo questa.
   Deciso dall'agente su delega dell'utente.

Testi nuovi, approvati dall'utente il 2026-11-12: i dieci nomi e le loro
frasi, «Morning», «After run», «After gym», «How long?».

**Criteri di accettazione (parte B)**

- [x] Quindici esercizi, ognuno con posa, respiro, nome e frase; le pose
      stanno sul pavimento, al respiro più profondo compreso.
- [x] Tre routine in 3, 5, 10 minuti, vicine ai minuti, senza doppioni,
      tenute di almeno 20 s; tutti e quindici gli esercizi usati.
- [x] A fine corsa la schermata chiede la durata prima del primo
      esercizio; «Not now» esce.
- [x] Test di `src/stretch`, `src/i18n`, `__tests__/AppStretch`,
      `src/gym/restAlert` verdi; `tsc` pulito.
- [x] Sì dell'utente su nomi, frasi e traduzioni (2026-11-12, «Sì,
      approvo»).
- [x] Schermate dal simulatore, col turno del Coordinatore (2026-11-12,
      iPhone 17e, Expo Go: `out/TASK-466/b/`, quindici schermate: le dieci
      pose nuove, le tre scelte «How long?», «Mattino» e una posa in
      italiano; la schermata aperta tre volte di fila senza gambe
      staccate).
- [x] Sì dell'utente sulle schermate (2026-11-12, «Sì, approvo»: le
      dieci pose, le tre routine e il prima/dopo della gamba staccata).

**File toccati (parte B)**

```
apps/mobile/src/stretch/routines.ts               (nuovo)
apps/mobile/src/stretch/routines.test.ts          (nuovo)
apps/mobile/src/stretch/RoutineChooser.tsx        (nuovo)
apps/mobile/src/stretch/RoutineChooser.test.tsx   (nuovo)
apps/mobile/src/stretch/poses.ts
apps/mobile/src/stretch/poses.test.ts
apps/mobile/src/stretch/exercises.ts
apps/mobile/src/stretch/StretchScreen.tsx
apps/mobile/src/stretch/StretchScreen.test.tsx
apps/mobile/src/stretch/Figure.tsx                (punti 4 e 5)
apps/mobile/src/stretch/Figure.test.tsx
apps/mobile/__tests__/AppStretch.test.tsx
apps/mobile/src/i18n/{it,de,fr,es}.ts             (voci nuove)
docs/tasks/TASK-466.md
```

## Parte C — In palestra

«Stretch» alla fine dell'allenamento come dopo la corsa, e una voce
«Stretching» nella pagina Palestra con le routine. Dopo TASK-461 A2 e
TASK-465, col turno del Coordinatore su `src/gym`.

## Parte D — Al mattino

Impostazione «Morning stretch»: orario della sveglia, giorni, durata;
notifica locale con `expo-notifications` (già dipendenza) che apre la
routine. JS, esce con un OTA. La lettura della sveglia su Android è una
parte separata, nativa, con una build.

Scelte dell'utente (2026-11-12, «Sì, va bene» alla proposta intera):

- una voce **«Morning stretch»** in Impostazioni: interruttore (spento
  all'inizio), **orario della sveglia** scritto dall'utente, **giorni**
  (lunedì–venerdì all'inizio), **durata** 3, 5 o 10 minuti (5 all'inizio);
- una **notifica locale 5 minuti dopo la sveglia**: «Morning stretch» /
  «{minutes} minutes to wake up your body. Tap to start.» (in italiano
  «Stretching del mattino» / «{minutes} minuti per svegliare il corpo.
  Tocca per iniziare.»); toccata, apre la routine **Morning** della durata
  scelta, senza chiedere;
- il permesso è quello delle notifiche push; negato, la voce lo dice.

_(branch `feat/TASK-466-d-morning`, da `main` dopo la B; lista dei file
approvata dal Coordinatore il 2026-11-12)_

1. **L'impostazione** (`morning.ts`): acceso/spento, ora e minuti della
   sveglia, giorni (1 = lunedì), minuti della routine; tenuta solo sul
   telefono (`morning-stretch.json`), all'inizio spenta, 7:00, lunedì–
   venerdì, 5 minuti. Accesa senza giorni non esiste: resta spenta.
2. **Le notifiche**: locali, una alla settimana per ogni giorno scelto,
   5 minuti dopo la sveglia (`AFTER_ALARM_MIN`; una sveglia alle 23:57
   cade sul giorno dopo). Ognuna ha un nome suo, `morning-stretch-<giorno>`:
   a ogni cambio si tolgono **solo quelle con questo inizio** e si
   rimettono, mai `cancelAll`, così il promemoria del piano
   (`muw-plan-day-…`, TASK-461 B2b) e la pausa della palestra restano.
   Il testo è scritto quando la notifica viene programmata: si rimettono
   all'apertura dell'app e a ogni cambio di lingua.
3. **Il tocco**: la notifica porta `kind: "morning_stretch"` e i minuti.
   Lo legge un ascoltatore a parte (`onMorningTapped`), non quello delle
   push: `tapTarget` ignora i tipi che non conosce, e l'ascoltatore delle
   push apre solo con un account e attraverso le porte di «Profile».
   Quella che ha aperto l'app si legge **senza cancellarla** (la cancella
   l'ascoltatore delle push, che parte dopo); la stessa notifica torna
   ogni settimana con lo stesso nome, quindi si distingue dalla data.
4. **Sopra l'app** (`MorningStretchLayer`, una riga in `App.tsx`, fuori
   da `MapScreen` che mostra i figli solo sulla mappa): apre la routine
   «Morning» dei minuti portati, subito, senza «How long?». **Mai durante
   una corsa** (`run`, `navigate`): la schermata dello stretching usa lo
   stesso «schermo acceso» della corsa e lo spegnerebbe all'uscita.
5. **La voce** (`MorningStretchSetting`, in «PREFERENCES» dopo «Body»):
   la riga dice «Off» oppure «7:00 · 5 min»; la pagina ha l'interruttore,
   l'ora con «−» e «+» (ore di 1, minuti di 5: niente tastiera), i sette
   giorni, le tre durate. Accendere chiede il permesso delle notifiche;
   negato, resta spento con la frase già usata per le push e «Open
   Settings». Non si può togliere l'ultimo giorno.

Punti 2–5 decisi dall'agente su delega dell'utente.

Testi nuovi, oltre ai due approvati il 2026-11-12: la frase della pagina
(«MuW can't read your phone's alarm. Set here the time it rings:
{minutes} minutes later a reminder opens your Morning routine.»), «Alarm
time», «Length», e per chi usa il lettore di schermo «Hour», «Minutes».
«Off», «Days», «Back», «{minutes} min», i giorni e la frase del permesso
c'erano già.

**Criteri di accettazione (parte D)**

- [x] La voce in Impostazioni, spenta all'inizio; ogni cambio è tenuto
      subito e le notifiche del telefono lo seguono.
- [x] Notifiche solo nei giorni scelti, 5 minuti dopo la sveglia; quelle
      degli altri non si toccano (test).
- [x] Il tocco apre «Morning» della durata scelta senza chiedere, anche
      quando è la notifica ad aprire l'app; non durante una corsa.
- [x] Permesso negato: resta spento e dice dove permetterle.
- [x] Test di `src/stretch`, `src/i18n`, `src/profile`,
      `__tests__/AppStretch`, `__tests__/AppMorningStretch` verdi; `tsc`
      pulito.
- [x] Sì dell'utente sui testi nuovi e sulle traduzioni (2026-11-12,
      «Sì, approvo»: la frase della pagina, «Alarm time», «Length»,
      «Hour», «Minutes» e le traduzioni dei due testi della notifica).
- [x] Schermate dal simulatore, col turno del Coordinatore (2026-11-12,
      iPhone 17e, Expo Go: `out/TASK-466/d/`, sette schermate: la riga
      spenta e accesa, la pagina spenta e accesa, il permesso negato,
      l'italiano). Nella prova i sette giorni sono passati su una riga
      sola.
- [x] Sì dell'utente sulle schermate (2026-11-12, «Sì, approvo»).
- [ ] La notifica vera (suona, apre l'app, anche ad app chiusa) si prova
      sul telefono dopo l'OTA: in Expo Go non è la stessa cosa.

**File toccati (parte D)**

```
apps/mobile/src/stretch/morning.ts                       (nuovo)
apps/mobile/src/stretch/morning.test.ts                  (nuovo)
apps/mobile/src/stretch/MorningStretchSetting.tsx        (nuovo)
apps/mobile/src/stretch/MorningStretchSetting.test.tsx   (nuovo)
apps/mobile/src/stretch/MorningStretchLayer.tsx          (nuovo)
apps/mobile/src/stretch/MorningStretchLayer.test.tsx     (nuovo)
apps/mobile/__tests__/AppMorningStretch.test.tsx         (nuovo)
apps/mobile/App.tsx                                      (una riga e l'import)
apps/mobile/src/profile/SettingsPage.tsx                 (una riga e l'import)
apps/mobile/src/profile/SettingsPage.test.tsx            (il conto dei tasti: 14)
apps/mobile/src/i18n/{it,de,fr,es}.ts                    (voci nuove)
docs/UI.md
docs/tasks/TASK-466.md
```

Non tocca `src/notifications/**`, `screens/ProfileLayer.tsx`,
`__mocks__/`. Niente dipendenze, niente nativo, niente server.

## Parte E — La tua routine, pubblicata

Scegli esercizi, ordine e secondi; la salvi; la pubblichi nel Feed
(«Stretching · 10 min · 8 exercises»); chi la vede la fa con «Do this
routine». Server prima dell'app: nuovo tipo di post, migrazione col primo
numero libero al merge; segnalazione e blocco valgono anche lì; il testo
della privacy se cambia cosa vedono gli altri (sì dell'utente).

## Criteri di accettazione (parte A)

- [x] La figura respira durante la tenuta, si ferma in pausa e con
      «riduci movimento».
- [x] Fra due esercizi piegati passa dalla posizione in piedi; il cambio
      lato gira la figura in piedi.
- [x] «Get ready» 5 s e «Switch sides» 3 s prima della tenuta; tick
      all'inizio e sugli ultimi 3 s; ding alla fine.
- [x] «Skip» passa al «Get ready» dell'esercizio dopo; «End» esce.
- [x] Test di `src/stretch`, `src/i18n`, `__tests__/AppStretch`,
      `src/gym/restAlert` verdi; `tsc` pulito.
- [x] Screenshot o video dal simulatore, col turno del Coordinatore
      (2026-11-12, iPhone 17e, Expo Go: `out/TASK-466/`, cinque schermate
      e un video di 3 minuti); aspetto approvato dall'utente il 2026-11-12.
- [x] Sì dell'utente sui due testi nuovi (2026-11-12, «Sì, approvo»).

## File toccati (parte A)

```
apps/mobile/src/stretch/Figure.tsx
apps/mobile/src/stretch/Figure.test.tsx          (nuovo)
apps/mobile/src/stretch/StretchScreen.tsx
apps/mobile/src/stretch/StretchScreen.test.tsx
apps/mobile/src/stretch/chime.ts
apps/mobile/src/stretch/exercises.ts
apps/mobile/src/stretch/poses.ts
apps/mobile/src/stretch/poses.test.ts
apps/mobile/assets/stretch/tick.wav              (nuovo)
apps/mobile/__tests__/AppStretch.test.tsx
apps/mobile/src/i18n/{it,de,fr,es}.ts            (due chiavi)
tools/stretch_chime.py
docs/tasks/TASK-466.md                           (nuovo)
```

Non tocca `App.tsx`, la fine corsa, `src/gym`, `haptics/`,
`ui/useReduceMotion.ts` (solo importato). Niente dipendenze, niente
nativo, niente server.

## Fuori scope

- Una libreria di disegno (svg, Lottie): resta la figura di View girate.
- La voce che legge gli esercizi: per ora suoni e testo.
- Leggere le sveglie di iPhone: non si può.

## Dove siamo (2026-11-12, passaggio di mano)

La prima sessione si è archiviata qui; chi riprende parte da questo file.

- **A**: in `main` (#1181, `437f152f`); documenti nella PR unica del
  Coordinatore #1226 (la #1210 si chiude con lei: non toccarla).
- **B**: PR #1216, branch `feat/TASK-466-b-routines`, testi approvati,
  `main` unito e schermate fatte il 2026-11-12 pomeriggio da una
  sessione nuova (`out/TASK-466/b/`; punti 4 e 5 qui sopra); schermate
  approvate dall'utente, bozza tolta, «#1216 pronta» al Coordinatore, che
  la unisce al verde. Poi la PR di soli documenti. Nella prova il file che monta la schermata deve smontarla
  all'uscita, come fa `App.tsx`: è alla seconda apertura che si vede il
  difetto del punto 4. Ricetta che ha funzionato per A: `metro.config.js` non tracciato con
  `watchFolders` sul `node_modules` del checkout principale, un
  `index.ts` temporaneo che monta la schermata, Metro con `CI=1` su una
  porta propria, iPhone 17e con Expo Go; alla fine tutto via e
  «simulatore libero». Con `exercises` non dati la schermata apre già la
  scelta: basta montare `<StretchScreen onLeave={…} routine="morning" />`.
- **D**: scelte dell'utente nella sezione D; parte da `main` dopo il
  merge della B, col turno del Coordinatore su `App.tsx`,
  `SettingsPage.tsx`, `notifications/`.
- **C**: dopo TASK-461 A2 e TASK-465, turno su `src/gym`.
- **E**: da proporre all'utente (server prima, privacy).

## Esito

_(a fine task)_
