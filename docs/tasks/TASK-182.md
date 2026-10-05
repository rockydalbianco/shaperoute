# TASK-182 — Le unità di misura: km o miglia

**Stato**: In corso (parte A in `main`, PR #351, merge `7a9506a`, 2026-10-05; parte B da fare)
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
- [ ] (passa alla parte B, con `FOLLOWS_PHONE`: fino ad allora l'app non segue il telefono) Provato nel simulatore con il telefono in miglia. **Non fatto**: la
      sessione che ha scritto la parte A non usa il simulatore.

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
- **Testi nuovi, da confermare con l'utente**: «Phone units»,
  «Kilometres», «Miles», «{mi} mi away», «{town}, {mi} mi away» (e le
  quattro traduzioni).
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

**Testi nuovi, da confermare con l'utente** (inglese; le quattro
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
