# TASK-182 — Le unità di misura: km o miglia

**Stato**: In revisione (parte A)
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

- [x] In «Settings» si sceglie fra «Phone units», «Kilometres» e
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
- [ ] Provato nel simulatore con il telefono in miglia. **Non fatto**: la
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
- **Da decidere prima di pubblicare**: con «Miles» (e su ogni telefono
  degli Stati Uniti o del Regno Unito, senza scelta) l'app è mista finché
  non c'è la parte B.

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
