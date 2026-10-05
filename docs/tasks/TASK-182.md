# TASK-182 — Le unità di misura: km o miglia

**Stato**: Done
**Fase**: 4 · **Branch**: `feat/TASK-182-units` (parte A)

## Obiettivo

Chiesto dall'utente il 2026-10-02 fra le voci di «Settings» («Units»,
oggi con «Soon») e di nuovo il 2026-10-03: «ora fai il cambio unità di
misura». Alla fine, in «Settings» si sceglie fra chilometri e miglia, e
l'app mostra e dice le distanze e il passo in quella unità, subito.

## Scelte dell'utente (2026-10-03)

- **L'unità di partenza è quella del telefono**: un iPhone impostato con
  le miglia (Stati Uniti, Regno Unito) parte in miglia, gli altri in km.
  In «Settings» la riga «Units» offre «Phone units», «Kilometres»,
  «Miles», come la lingua (TASK-210, ADR-0172).
- **Con le miglia** (proposta accettata dall'utente, come fa Strava): le
  distanze in mi, il passo in min/mi, la voce a ogni miglio invece che a
  ogni km, le distanze brevi (le svolte, «In 50 metres») in piedi.

## Numeri e incroci (dal coordinatore, 2026-10-03)

- **TASK-182 e ADR-0149** confermati (tenuti da tempo in `STATUS.md`).
  Prossimi liberi dopo: TASK-215, ADR-0178.
- **A pezzi, come TASK-210.** **Liberi per la parte A**: `src/units/`
  (nuovo), la riga in `src/profile/SettingsPage.tsx`, `src/activities/`
  tranne `RunEnd.tsx` e `ActivityCard.tsx`, `src/favorites/` tranne
  `favoriteRoute.ts`, `src/feed/`, `src/explore/` tranne i file di #255.
- **Tenuti da altri**, per le parti dopo:
  - **#255**, TASK-191 C (in pausa per scelta dell'utente): `src/route/`
    (la distanza di «Draw»), `src/explore/recommendedRoutes.ts`,
    `explored.ts`, `exampleRoutes.ts`, `src/favorites/favoriteRoute.ts`,
    `src/profile/SettingsPage.test.tsx`;
  - **#259**, TASK-209 (la voce): `phrases.ts`, `navigator.ts`,
    `penUp.ts`, `freeRun.ts`, `runControl.ts`, forse `runStats.ts` (vedi il
    suo «File toccati»), `useNavigation.ts`, `useFreeRun.ts`,
    `RunDashboard.tsx`, `src/voice/`;
  - **TASK-208 B**: `RunEnd.tsx`, `ActivityCard.tsx`,
    `src/social/PublicParts.tsx`, `PublicRow.tsx`;
  - **TASK-120** (i commenti): la parte app in `src/social/`;
  - **TASK-214** (il motore sul telefono): più avanti anche
    `SettingsPage.tsx`; se arriva prima, ci si accorda su righe diverse.
- **Con TASK-210**: i testi nuovi passano da `t()` con le traduzioni
  (`src/i18n/`, `tables.test.ts`); i numeri con `decimal()`.
- **Con TASK-209**: la voce dice le distanze nell'unità scelta; le frasi
  dette sono di TASK-209, l'unità la legge da `src/units/`.
- «#NNN pronta» al coordinatore, che guarda la CI.

## Contesto da leggere

- `docs/UI.md`, «Settings» (la riga «Units» con «Soon», la riga
  «Language» come esempio), «Forma e distanza», «La navigazione», «La
  fine della corsa», «Correre senza percorso».
- ADR-0172 (come TASK-210 ha fatto la lingua: la scelta in un file nei
  documenti, la partenza dal telefono, `useLanguage()` alla radice).
- `src/i18n/language.ts` e `src/settings/LanguageSetting.tsx` (lo stesso
  schema per le unità); `src/route/distance.ts` (`DISTANCE_STEP_KM`,
  `stepDistance`, `toDistanceM`) e `DISTANCE_LIMITS_M` in
  `packages/shared-types` (corsa fino a 21 km, bici 10–30 km, canoa
  1–5 km); `src/navigation/freeRun.ts` (`kmLabel`, `paceLabel`).

## Cosa fare

**Parte A**:

1. `src/units/`: `Units = "km" | "mi"`, la scelta in un file nei
   documenti («Phone units» lo cancella), le unità del telefono senza
   dipendenze nuove (su iOS `Settings` di React Native, le chiavi del
   sistema di misura; nei test niente, quindi km), `useUnits()`, e i
   formattatori con i test: distanza (`5.2 km` / `3.2 mi`), passo
   (`4:44 /km` / `7:37 /mi`), distanza breve (metri / piedi).
2. La riga «Units» in «Settings», sotto «Preferences» dopo «Language»,
   al posto di quella con «Soon»: stesso aspetto e stesso comportamento
   della lingua.
3. Le unità nei file liberi (elenco sopra): «My activities» senza la
   scheda aperta, l'elenco dei preferiti, il feed, le schede di
   «Explore» libere; testi nuovi in `t()`. Se `SettingsPage.test.tsx` è
   ancora di #255, il test della riga va in `UnitsSetting.test.tsx`.
4. Il motore e l'API restano in metri: l'app converte solo per mostrare e
   per leggere quello che si scrive.
5. ADR-0149, `UI.md`, `STATUS.md`.

**Parti successive** (dopo i merge di chi tiene i file): la distanza di
«Draw» in miglia (passo e limiti in miglia, sempre dentro
`DISTANCE_LIMITS_M`; proposta: passi da 1 mi, la scelta va fatta qui e
scritta nell'ADR), le schermate della corsa e la fine corsa, «Explore»,
la voce (a ogni miglio, le svolte in piedi, con TASK-209), il GPX resta
in metri.

## Criteri di accettazione

Parte A:

- [x] (dalla parte B anche «Phone units»: vedi «Esito») In «Settings» si sceglie fra «Phone units», «Kilometres» e
      «Miles»; la scelta vale subito e resta dopo un riavvio (test:
      `UnitsSetting.test.tsx`, `units.test.ts`).
- [x] Senza scelta, un telefono con le miglia mostra miglia, gli altri
      km; nei test sempre km (test: `phoneUnits.test.ts`, sulle risposte
      che un telefono può dare; **non visto su un telefono**, vedi
      «Esito»).
- [x] I formattatori danno distanza, passo e distanza breve giusti in km e
      in miglia, con la virgola nelle lingue che la usano (test:
      `format.test.ts`).
- [x] Con «Kilometres» l'app è byte per byte quella di prima: i test
      esistenti passano (cambiati solo quelli della riga «Soon» in
      `SettingsPage.test.tsx`).
- [x] I testi nuovi sono in `t()` con le quattro tabelle.
- [x] Nessuna dipendenza nuova.
- [x] Provato nel simulatore con il telefono in miglia (ultimo passo,
      2026-10-05): un iPhone 17 con la regione «Stati Uniti» apre
      «Units» su «Phone units — Miles» (`out/task182/settings-phone-units-us.png`).

## File toccati

Parte A (2026-10-05):

```
apps/mobile/src/units/units.ts                    (nuovo)
apps/mobile/src/units/phoneUnits.ts               (nuovo)
apps/mobile/src/units/useUnits.ts                 (nuovo)
apps/mobile/src/units/format.ts                   (nuovo)
apps/mobile/src/units/units.test.ts               (nuovo)
apps/mobile/src/units/phoneUnits.test.ts          (nuovo)
apps/mobile/src/units/format.test.ts              (nuovo)
apps/mobile/src/units/shownInMiles.test.tsx       (nuovo)
apps/mobile/src/units/followsPhone.ts             (nuovo)
apps/mobile/src/units/kmUntilPartB.test.tsx       (nuovo)
apps/mobile/src/settings/UnitsSetting.tsx         (nuovo)
apps/mobile/src/settings/UnitsSetting.test.tsx    (nuovo)
apps/mobile/src/profile/SettingsPage.tsx
apps/mobile/src/profile/SettingsPage.test.tsx
apps/mobile/src/activities/activityText.ts
apps/mobile/src/activities/ActivitiesList.tsx
apps/mobile/src/favorites/favoriteRoute.ts
apps/mobile/src/favorites/FavoritesList.tsx
apps/mobile/src/explore/ExploreScreen.tsx
apps/mobile/src/explore/CityExamples.tsx
apps/mobile/src/explore/ExploredCard.tsx
apps/mobile/src/explore/ThemedCard.tsx
apps/mobile/src/explore/NearbyTowns.tsx
apps/mobile/src/i18n/de.ts
apps/mobile/src/i18n/es.ts
apps/mobile/src/i18n/fr.ts
apps/mobile/src/i18n/it.ts
docs/DECISIONS.md
docs/UI.md
docs/STATUS.md
docs/tasks/TASK-182.md
```

Parte B, «Draw» e le schede (2026-10-05):

```
apps/mobile/src/units/distanceInput.ts            (nuovo)
apps/mobile/src/units/distanceInput.test.ts       (nuovo)
apps/mobile/src/units/cardsInMiles.test.tsx       (nuovo)
apps/mobile/src/route/distanceMiles.test.ts       (nuovo)
apps/mobile/src/route/milesTexts.test.ts          (nuovo)
apps/mobile/src/route/RoutePanelMiles.test.tsx    (nuovo)
apps/mobile/src/route/distance.ts
apps/mobile/src/route/DistanceStepper.tsx
apps/mobile/src/route/RoutePanel.tsx
apps/mobile/src/route/RouteTiles.tsx
apps/mobile/src/route/betterDistance.ts
apps/mobile/src/route/problems.ts
apps/mobile/src/route/warnings.ts
apps/mobile/src/route/wordInput.ts
apps/mobile/src/feed/FeedPost.tsx
apps/mobile/src/social/DrawingCard.tsx
apps/mobile/src/activities/ActivityCard.tsx
apps/mobile/src/paddle/PaddleExplore.tsx
apps/mobile/src/explore/ExploreScreen.tsx
apps/mobile/src/explore/CityExamples.tsx
apps/mobile/src/i18n/de.ts
apps/mobile/src/i18n/es.ts
apps/mobile/src/i18n/fr.ts
apps/mobile/src/i18n/it.ts
docs/DECISIONS.md
docs/UI.md
docs/STATUS.md
docs/tasks/TASK-182.md
```

## Fuori scope

- Le altezze e le temperature (l'app non le mostra).
- Il motore, l'API, il GPX e il database: restano in metri.
- Le yarde: le distanze brevi in miglia si dicono in piedi.

## Esito

**Parte A** (2026-10-05, branch `feat/TASK-182-units`, ADR-0149), in
revisione:

- `src/units/`: la scelta in `units.json` nei documenti, l'unità del
  telefono senza dipendenze, `useUnits()`, i formattatori
  (`src/units/format.ts`). La riga «Units» in «Settings», sotto «Offline
  maps», al posto di quella con «Soon».
- In miglia: «My activities» (anche la scheda della corsa aperta, che
  legge `runFacts` senza essere stata toccata), i preferiti, le schede di
  «Explore» (lista, esempi, paesi vicini, il percorso aperto sulla mappa,
  il percorso a tema).
- Con «Kilometres» ogni testo è quello di prima, in tutte le lingue: la
  distanza di una corsa resta con il punto, le schede di «Explore» anche
  (`withPoint`), finché i loro testi sono in inglese.
- **Testi nuovi, confermati dall'utente il 2026-10-05**: «Kilometres»,
  «Miles», «{mi} mi away», «{town}, {mi} mi away» («ok, i testi delle
  unità vanno bene») e, con l'ultimo passo, «Phone units» (e le quattro
  traduzioni).
- **Non visto su un telefono né nel simulatore.** L'unità del telefono si
  legge da `Settings` di React Native (`AppleMetricUnits`,
  `AppleMeasurementUnits`, `AppleLocale`) e da
  `I18nManager.localeIdentifier`: la logica è provata sulle risposte
  possibili, ma che Expo Go dia davvero quelle chiavi è da vedere su un
  iPhone con la regione «Stati Uniti». Se non le dà, l'app resta in km e
  la scelta a mano funziona.
- **Deciso dall'utente il 2026-10-05** («Subito, ma km di partenza»): la
  parte A si pubblica subito, ma finché non c'è la parte B **l'app parte
  in km su ogni telefono**, anche americano o inglese, e «Settings» offre
  solo «Kilometres» e «Miles». L'interruttore è `FOLLOWS_PHONE` in
  `src/units/followsPhone.ts` (oggi `false`): la parte B lo accende, e
  allora valgono la partenza dal telefono e la scelta «Phone units»
  (già scritte e provate: `units.test.ts`, `UnitsSetting.test.tsx`; il
  comportamento di oggi è in `kmUntilPartB.test.tsx`). Con «Miles» scelto
  a mano l'app è mista finché non c'è la parte B.

**Per la parte B** (file che il 2026-10-05 erano di altri task):

- `src/feed/FeedPost.tsx` (TASK-241 B, nel frattempo in `main` con la
  #348): «Horse · 19.2 km · 1 h 41 min» → `distanceLabel`.
- `src/route/` e `src/api/routes.ts` (TASK-238 C): la distanza chiesta in
  «Draw» in miglia (passi e limiti dentro `DISTANCE_LIMITS_M`: la scelta
  va fatta lì e scritta nell'ADR), il risultato, «target 5 km».
- `src/navigation/`, `src/voice/`, `src/screens/` (la corsa, «Run without
  a route», la voce a ogni miglio, le svolte in piedi con
  `shortDistanceLabel`), `src/activities/RunEnd.tsx`,
  `src/share/postRun.ts`. `freeRun.ts` potrà chiamare i formattatori di
  `src/units/format.ts`, che in km danno le sue stesse scritte (test).
- `src/social/` (`DrawingCard.tsx`, `PublicParts.tsx`, `PublicRow.tsx`:
  TASK-208 B), `src/paddle/PaddleExplore.tsx` («{km} km away», «{shape},
  {km} km, on the water»), `src/places/` (TASK-240).
- Le frasi di «Explore» con una distanza fissa («Starting within 5 km
  of…», «shapes of 5 km from the centre»), con la traduzione di «Explore».
- Chi scrive una distanza chiama `useUnits()` nel suo componente: alla
  radice (`App.tsx`) non c'è, per non toccare un file di altri; si può
  aggiungere lì quando è libero.
- Per i testi con l'unità dentro la parte A ha aggiunto una riga per
  unità («{mi} mi away»); se nella parte B diventano tante, conviene un
  testo solo con la distanza già scritta («{distance} away»), togliendo
  le righe vecchie insieme a chi le possiede.

**Parte B — «Draw» e le schede** (2026-10-05, branch
`feat/TASK-182-b-draw-and-cards`, ADR-0149 «aggiornamento (parte B)»), in
revisione. La parte C (la corsa, la fine corsa, la navigazione, la voce) è
di un'altra sessione, sullo stesso giorno.

Scelte dell'utente (2026-10-05): con «Miles» − e + cambiano di 1 miglio; i
limiti sono miglia intere dentro quelli di oggi (corsa 1–13, bici 7–18,
canoa 1–3); un valore scritto con un decimale («4.5») vale.

Fatto:

- **La distanza di «Draw» in miglia**: il campo, la sigla «mi», − e +, i
  limiti per sport, la partenza (3 mi; 7 con «Bike»; 1 con «Paddle»), il
  messaggio dei limiti, le frasi della parola («needs at least», «Use N
  mi»), il cambio di unità in «Settings» con una distanza scritta (stessa
  distanza, al km o al miglio intero, dentro i limiti). All'API vanno
  metri interi (3 mi → 4828, 4,5 mi → 7242, 13 mi → 20921); con
  «Kilometres» la richiesta è quella di prima (i test esistenti passano
  senza modifiche).
- **Il testo del campo dice la sua unità** (`src/units/distanceInput.ts`):
  in km è il numero da solo, come sempre; in miglia è «4.5 mi». La
  distanza scritta la tiene `App.tsx`, che è di altri e non è stato
  toccato: così `toDistanceM`, `stepDistance` e `distanceForSport` (che
  `App.tsx` chiama già) capiscono da soli, e i km che `App.tsx` scrive da
  sé in metri (dopo un «Try», o i 1,5 km di un lago piccolo) restano
  quelli, anche in miglia.
- **Il risultato**: la lunghezza, «target N mi», l'attesa, le tessere A ·
  B · C, la riga della penna alzata, gli avvisi del motore (piedi sotto i
  1000 piedi, miglia sopra), «better at about N mi» e «Try N mi» (miglio
  intero più vicino dentro i limiti; niente riga se la richiesta è già a
  quel miglio), «It fits at about N mi» (se il miglio intero è quello
  appena chiesto, il decimo più vicino; sull'acqua arrotondato in giù).
- **Le schede**: la riga dei post del «Feed» («Horse · 11.9 mi · 1 h 41
  min»), il disegno aperto da un profilo («2.49 mi»), la scheda di una
  corsa di «My activities» aperta sulla mappa (scriveva già in miglia con
  `runFacts`; ora chiama `useUnits()` e segue subito il cambio: la PR #358
  era in `main` a fine lavoro, e il branch l'ha presa), «Explore» con
  «Paddle» («Heart · 1.2 mi», «0.6 mi away»), le due frasi di «Explore»
  con una distanza fissa («Starting within 3.1 mi of…», «shapes of 3.1 mi
  from the centre»: i 5 km del motore, detti al decimo perché «3 mi» non
  sarebbe vero).
- Test: `distanceInput.test.ts`, `distanceMiles.test.ts`,
  `milesTexts.test.ts`, `RoutePanelMiles.test.tsx`, `cardsInMiles.test.tsx`.

**Testi nuovi, confermati dall'utente il 2026-10-05** («ok, i testi delle miglia vanno bene»: gli sono stati mostrati i principali e le due conseguenze dei limiti; inglese; le quattro
traduzioni sono nelle tabelle):

- «Distance in miles» (VoiceOver), «Enter a distance between {lowest} and
  {highest} mi.»
- «{count} letter: at least {mi} mi. A word takes a few minutes to draw.»
  e «{count} letters: …», «Use {mi} mi»
- «At most {most} letters: each needs {each} mi, and the app goes up to
  {highest} mi.», «“{word}” needs at least {mi} mi: {each} mi for each
  letter.»
- «Drawing the picture's outline, {mi} mi…», «Drawing “{word}”, {mi} mi…»,
  «Drawing a {mi} mi {name}…»
- «{name} · on roads · target {mi} mi», «{name} · on the water · target
  {mi} mi»
- «{letters} mi of letters + {between} mi walking between them», «… riding
  between them»; «{drawn} mi of drawing + {between} mi walking between the
  parts», «… riding …», «… paddling …»
- «This shape comes out better at about {mi} mi.» («This word…», «This
  outline…»), «Try {mi} mi»
- «This shape does not fit the roads here at this distance. It fits at
  about {mi} mi.» («This word…», «This image…»), e sull'acqua «This shape
  does not fit on the water here at this distance. It fits at about {mi}
  mi.»
- «There is no lake or sea near this start. Start from the shore, within 1
  mile of the water.» (in km dice «within 2 km»: un miglio sta dentro i 2
  km che il motore guarda)
- «{shape}, {mi} mi, on the water» (VoiceOver)

**Da sapere** (conseguenze delle scelte, da dire all'utente):

- Con «Miles» una parola a piedi ha **al massimo 6 lettere**, non 7: sette
  chiedono 21 km, cioè 13,05 mi, oltre il limite di 13 mi.
- Con «Miles» un lago piccolo resta ai suoi 1 o 1,5 km (il campo mostra
  «0.6» o «0.9», sotto il limite di 1 mi): a 1 mi le forme non ci
  starebbero.
- I testi di «Draw» che in km non sono ancora tradotti («Enter a distance
  between…», le frasi della parola, l'attesa) in miglia passano da `t()`
  e sono tradotti: con «Miles» in italiano si leggono in italiano, con
  «Kilometres» ancora in inglese, finché TASK-210 non traduce «Draw».

**Lasciato** (e perché):

- `src/share/postRun.ts`: i suoi numeri vengono da `kmLabel` e `paceLabel`
  di `src/navigation/freeRun.ts`, che sono della parte C; di suo non
  scrive distanze. Non toccato.
- `src/social/PublicParts.tsx`, `PublicRow.tsx`: non scrivono distanze.
- «Shapes to paddle, within 1 km of the shore» (`PaddleExplore.tsx`) e
  l'avviso di sicurezza (`PaddleNotice.tsx`, non fra i file della parte
  B): restano in km. È il limite del motore, in una frase che promette
  quanto si sta vicini alla riva: «0.6 mi» sarebbe meno del vero.
- L'esempio nel campo della richiesta a parole di «Explore»
  (`src/explore/presets.ts`, «…food 8 km»): è un esempio di cosa
  scrivere; se chi legge la richiesta capisca le miglia non è stato
  guardato (è dell'API).
- `FOLLOWS_PHONE`, `phoneUnits.ts`, «Phone units»: non toccati; si
  accendono quando anche la parte C è in `main`.
- `App.tsx`: quando è libero, la distanza può tenerla in metri invece che
  come testo, e chiamare `useUnits()` alla radice.

### Parte C — la corsa, la sua fine, la navigazione e la voce (2026-10-05)

Branch `feat/TASK-182-c-run-and-voice`, ADR-0149 «aggiornamento (parte
C)». Solo app: niente API, niente database, nessuna dipendenza. In
parallelo alla parte B («Draw», il feed, le altre schede), su file
diversi. `FOLLOWS_PHONE` non toccato: resta spento.

**Fatto**, con «Miles» scelto in «Settings» (con «Kilometres» ogni
scritta e ogni frase è quella di prima: i test esistenti passano senza
modifiche):

- **Le schermate della corsa** (`RunPanel`, `RunDashboard`): la distanza
  in miglia («2.30 mi», su «Data» con «miles» sotto), «Pace now» e «Avg
  pace» in «/mi», «Last mi» al posto di «Last km» (l'ultimo miglio
  intero), lungo un percorso «2.0 mi to go» (sotto i 1000 piedi «400 ft
  to go»); in bici «mph». I **parziali di «Data» sono un miglio
  ciascuno**, calcolati sul telefono dalla traccia (`splits(track,
  unitM)`), con la colonna «Mi» e «Your first mile will show here.».
- **Il banner** della svolta (`NavigateScreen`) e quello della partenza
  («Run without a route», `FreeRunScreen`): piedi ai cinquanta, miglia da
  1000 piedi.
- **La fine della corsa**: lungo un percorso «2.5 mi · 32 min · 97% of
  the route» (`FinishScreen`); senza percorso «2.62 mi» in grande e i
  riquadri in miglia (`FreeRunScreen`).
- **La voce**, nelle cinque lingue (`src/voice/`): ogni miglio con tempo
  e passo al miglio, dal secondo il confronto col miglio prima,
  l'incitamento dopo il terzo; in bici ogni 5 miglia con la velocità in
  miglia orarie e dal decimo il confronto delle ultime 5 con le 5 prima;
  le svolte e la bici a mano in piedi, dette negli stessi punti di prima.
  «Listen» sotto «Voice» fa sentire la svolta in piedi.
- Ogni componente che scrive una distanza chiama `useUnits()`; i ganci
  della corsa (`useNavigation`, `useFreeRun`) leggono `appUnits()` a ogni
  posizione, e `wordsOf(lingua)` legge l'unità quando parla. Un cambio di
  unità a corsa iniziata vale subito, senza ridire quello che è passato.

**Dove il codice non era come il task lo descriveva**:

- `src/activities/RunEnd.tsx` non scrive distanze (sono «Save»,
  «Discard», «Public», il titolo e Strava): **non è stato toccato**. La
  fine della corsa che mostra km e passo è in `src/screens/FinishScreen.tsx`
  e `FreeRunScreen.tsx`.
- **Alla fine della corsa non ci sono parziali**, né nelle corse salvate:
  i parziali esistono solo su «Data», a corsa in corso, e vengono dalla
  traccia. Non c'è quindi nessun parziale per km salvato da mostrare in
  miglia, e niente di quello che va all'API o resta sul telefono cambia.
- Le schermate della corsa non sono ancora tradotte (TASK-210): i testi
  di prima sono in inglese fuori da `t()`, e restano così. I testi
  **nuovi** sono in `t()` con le quattro tabelle, come ha fatto TASK-216
  per la bici: in italiano con le miglia si legge «Ultimo mi» e «miglia»
  accanto a «Pace now» ancora in inglese, finché TASK-210 non traduce la
  schermata.

**Testi nuovi sullo schermo, confermati dall'utente il 2026-10-05** («ok, i testi delle miglia vanno bene»; inglese →
italiano; tedesco, spagnolo e francese in `src/i18n/`):

| Inglese | Italiano | Dove |
|---|---|---|
| «Last mi» | «Ultimo mi» | il riquadro dell'ultimo miglio |
| «miles» | «miglia» | sotto la distanza grande di «Data» |
| «Mi» | «Mi» | la colonna dei parziali |
| «Your first mile will show here.» | «Il tuo primo miglio apparirà qui.» | «Data», prima del primo miglio |
| «Mile {mile}: {pace}» | «Miglio {mile}: {pace}» | i parziali, per chi ascolta lo schermo |
| «Mile {mile}: {speed} mph» | «Miglio {mile}: {speed} mph» | lo stesso, in bici |

Le sigle «mi», «ft», «/mi», «mph» non si traducono (ADR-0149, punto 8).

**Frasi nuove della voce, confermate dall'utente il 2026-10-05 come lette, non ascoltate: la voce in miglia è da ascoltare sull'iPhone** (scritte
dall'agente; le altre tre lingue in `src/voice/{de,es,fr}.ts`):

| Caso | Inglese | Italiano |
|---|---|---|
| ogni miglio | «1 mile. Time: 8 minutes 3 seconds. Average pace: 8 minutes 3 seconds per mile.» · «2 miles. …» | «Un miglio. Tempo: 8 minuti e 3 secondi. Passo medio: 8 minuti e 3 secondi al miglio.» · «2 miglia. …» |
| dopo il terzo miglio | «… Come on, full speed ahead!» (quella dei 5 km) | «… Daje, avanti tutta!» |
| miglio più veloce | «12 seconds faster than the last mile.» | «Questo miglio: 12 secondi meglio del precedente.» |
| miglio più lento | «8 seconds slower than the last mile.» | «Questo miglio: 8 secondi peggio del precedente.» |
| stesso passo | «Same pace as the last mile.» | «Stesso passo del miglio precedente.» |
| bici, ogni 5 miglia | «5 miles. Time: 20 minutes. Average speed: 15 miles per hour.» | «5 miglia. Tempo: 20 minuti. Velocità media: 15 miglia orarie.» |
| bici, più veloce | «The last 5 miles were faster than the 5 before.» | «Ultime 5 miglia più veloci delle 5 precedenti.» |
| bici, più lento | «The last 5 miles were slower than the 5 before.» | «Ultime 5 miglia più lente delle 5 precedenti.» |
| bici, stessa velocità | «The last 5 miles were at the same speed as the 5 before.» | «Ultime 5 miglia alla stessa velocità delle 5 precedenti.» |
| una svolta | «In 150 feet, turn left onto Via Roma» | «Tra 150 piedi, svolta a sinistra su Via Roma» |
| la bici a mano | «In 350 feet, get off and walk the bike for 650 feet.» · «Get off and walk the bike for 300 feet.» | «Tra 350 piedi, scendi e porta la bici a mano per 650 piedi.» · «Scendi e porta la bici a mano per 300 piedi.» |

**Scelte dell'agente, da dire all'utente** (ADR-0149, aggiornamento):

- In bici la voce parla **ogni 5 miglia** (8 km) al posto di ogni 10 km.
- L'incitamento arriva dopo il **terzo miglio** (4,8 km), non dopo il
  quinto (8 km).
- Le svolte in piedi **ai cinquanta**, mai «0 feet»: 50 m si dicono «150
  feet», 100 m «350 feet».
- «Last mi» e non «Last mile»: il riquadro è stretto come «Last km».
- In francese «mile» («un mile», «5 miles»), come «Miles» in «Settings».

**File toccati** (parte C, 2026-10-05):

```
apps/mobile/src/units/runFormat.ts                (nuovo)
apps/mobile/src/units/runFormat.test.ts           (nuovo)
apps/mobile/src/navigation/runMetrics.ts
apps/mobile/src/navigation/runStats.ts
apps/mobile/src/navigation/freeRun.ts
apps/mobile/src/navigation/ride.ts
apps/mobile/src/navigation/kmCompare.ts
apps/mobile/src/navigation/phrases.ts
apps/mobile/src/navigation/useFreeRun.ts
apps/mobile/src/navigation/useNavigation.ts
apps/mobile/src/navigation/mileSplits.test.ts     (nuovo)
apps/mobile/src/navigation/mileVoice.test.ts      (nuovo)
apps/mobile/src/navigation/mileRun.test.ts        (nuovo)
apps/mobile/src/voice/phrasebook.ts
apps/mobile/src/voice/words.ts
apps/mobile/src/voice/en.ts
apps/mobile/src/voice/it.ts
apps/mobile/src/voice/de.ts
apps/mobile/src/voice/es.ts
apps/mobile/src/voice/fr.ts
apps/mobile/src/voice/mileWords.test.ts           (nuovo)
apps/mobile/src/voice/ListenMiles.test.tsx        (nuovo)
apps/mobile/src/screens/RunPanel.tsx
apps/mobile/src/screens/RunDashboard.tsx
apps/mobile/src/screens/NavigateScreen.tsx
apps/mobile/src/screens/FreeRunScreen.tsx
apps/mobile/src/screens/FinishScreen.tsx
apps/mobile/src/screens/RunMiles.test.tsx         (nuovo)
apps/mobile/src/i18n/de.ts
apps/mobile/src/i18n/es.ts
apps/mobile/src/i18n/fr.ts
apps/mobile/src/i18n/it.ts
docs/DECISIONS.md
docs/UI.md
docs/STATUS.md
docs/tasks/TASK-182.md
```

**Resta** (non della parte C):

- **Non provato nel simulatore né su un telefono**, e la voce in miglia
  non è stata ascoltata: come il telefono legge «150 feet», «mph» scritto
  per esteso («miles per hour»), «miglia orarie» e in francese «mile» va
  sentito con la voce di ogni lingua.
- `kmLabel` e `paceLabel` di `navigation/freeRun.ts` restano in km: li
  usano `src/share/postRun.ts` e `src/social/DrawingCard.tsx`, che sono
  della parte B (passano a `src/units/format.ts`).
- «Elev. gain» resta in metri e «Calories» in kcal (le altezze sono fuori
  scope, sopra).
- Il paragrafo di «Settings» in `docs/UI.md` è aggiornato con l'ultimo
  passo, sotto.

### Ultimo passo — seguire il telefono, e «Share» in miglia (2026-10-05)

Branch `feat/TASK-182-d-phone-units`, dopo le parti B (#368) e C (#366).

- **L'app segue l'unità del telefono** finché non se ne sceglie una:
  `unitsOf("phone")` torna a chiedere `phoneUnits()`, «Phone units» è di
  nuovo la prima scelta di «Units», e l'interruttore `FOLLOWS_PHONE`
  (`src/units/followsPhone.ts`) con il suo test `kmUntilPartB.test.tsx`
  non ci sono più: la scelta dell'utente «km di partenza» valeva fino alla
  seconda parte.
- **Provato nel simulatore** (iPhone 17, Expo Go, regione «Stati Uniti»
  scritta con `defaults write "Apple Global Domain" AppleLocale en_US`):
  l'app legge `AppleLocale` da `Settings` di React Native e apre «Units»
  su «Phone units — Miles» con il «✓». `AppleMetricUnits` e
  `AppleMeasurementUnits` non ci sono finché nessuno sceglie a mano il
  sistema di misura, e `I18nManager.localeIdentifier` in Expo Go non c'è:
  la regione basta. Su un iPhone vero non è stato visto.
- **Il post di «Share»** (`share/postRun.ts`) scrive distanza e passo
  nell'unità dell'app («3.23 mi · 28:10 · 8:43 /mi»), anche nel testo che
  va a Strava; in km è quello di prima (test).
- **«Help»** (inglese e italiano): la riga delle unità dice «quelle del
  telefono, chilometri o miglia» e che con le miglia cambia anche la voce.
- File: `src/units/units.ts`, `src/units/followsPhone.ts` (tolto),
  `src/units/kmUntilPartB.test.tsx` (tolto), `src/units/units.test.ts`,
  `src/settings/UnitsSetting.tsx`, `UnitsSetting.test.tsx`,
  `src/share/postRun.ts`, `src/share/postRunMiles.test.ts` (nuovo),
  `src/about/content/en.ts`, `it.ts`, `docs/UI.md`, `docs/STATUS.md`,
  questo file.
- **Testo nuovo che ora si vede**: «Phone units» (già nelle tabelle dalla
  parte A), da confermare con l'utente; le due righe nuove di «Help».
- **Resta**: la voce in miglia da ascoltare sull'iPhone; la distanza di
  «Draw» in metri dentro `App.tsx` quando è libero; «within 1 km of the
  shore» e l'avviso sull'acqua restano in km per scelta (limiti del
  motore).

### Chiusura (2026-10-05)

Tutto in `main`: parte A #351 (`7a9506a`), parte C #366 (`ad3e443`),
parte B #368 (`0703d25`), ultimo passo #374 (`3ad0c22`). Il testo «Phone
units» è confermato dall'utente («continua va bene»). Parti A, B e C su
`preview`; l'ultimo passo esce con la prossima pubblicazione, del
coordinatore. Restano, fuori dal task: ascoltare la voce in miglia
sull'iPhone; la distanza di «Draw» in metri dentro `App.tsx`.
