# TASK-210 — La lingua dell'app

**Stato**: In corso
**Fase**: 4 · **Branch**: `feat/TASK-210-app-language` (parte A),
`feat/TASK-210-run-screens` (parte B, la corsa)

## Obiettivo

Chiesto dall'utente il 2026-10-03: «Nelle impostazioni, dai la possibilità
anche di cambiare la lingua dell'App; per intanto fai scegliere le lingue
inglese, tedesco, italiano, spagnolo, francese». Alla fine, in «Settings» si
sceglie la lingua e tutta l'app si mostra in quella, subito.

## Scelte dell'utente (2026-10-03)

- **Le lingue**: inglese, tedesco, italiano, spagnolo, francese, in
  quest'ordine.
- **La lingua di partenza**: quella del telefono, se è una delle cinque;
  altrimenti l'inglese. In «Settings» c'è anche «Phone language» per
  tornare a seguire il telefono. L'iPhone dell'utente, in italiano, vedrà
  l'app in italiano appena aggiornata.

## Numeri e incroci (dal coordinatore, 2026-10-03)

- **ADR-0172**. Prossimi liberi dopo: TASK-211, ADR-0173.
- **A pezzi**, perché tocca un centinaio di file mentre altri lavorano
  nell'app: la **parte A** (questa PR) ha il modulo `src/i18n/`, la riga
  «Language», le quattro tabelle e `t()` solo nei file che nessuno tiene;
  le **parti successive** i file degli altri, dopo il loro merge.
- **Tenuti da altri** al 2026-10-03 (fuori dalla parte A): TASK-191 C
  (`src/settings/sport.ts`, `src/route/`, le schermate della corsa, la
  voce, forse «Explore»), TASK-208 (`RunEnd.tsx`, `PublicParts.tsx`,
  `PublicRow.tsx`, `src/api/drawings.ts`), TASK-209 (la pagina «Data» e i
  file delle frasi dette). `App.tsx`: solo l'aggancio alla lingua.
- **Con TASK-209** (la lingua della voce): un solo elenco di lingue e un
  solo posto per la lingua scelta, `src/i18n/`. La voce segue la lingua
  dell'app se in «Data» non se ne sceglie un'altra. Le frasi dette sono di
  TASK-209; i testi scritti dei file della voce (il banner della svolta)
  si traducono dopo il suo merge. Quello che TASK-209 legge:
  `LANGUAGES`, `Language`, `languageOption(…).speech` (`languages.ts`),
  `appLanguage()`, `subscribeLanguage()` (`language.ts`), `useLanguage()`.

## Contesto da leggere

- `docs/UI.md`, «Cosa è deciso» (la riga dei testi in inglese) e
  «Settings».
- ADR-0007 (la lingua del codice), ADR-0145 (le righe di «Settings»).
- Come l'app ricorda una scelta: `src/settings/sport.ts` (TASK-189).

## Cosa fare

**Parte A** (questa PR):

1. `src/i18n/`: l'elenco delle lingue, la lingua del telefono senza
   dipendenze nuove (`Settings` di React Native su iOS, `I18nManager`
   altrove), la scelta in un file nei documenti come lo sport, `t()`,
   `tLater()`, `tPlural()`, `decimal()`, le quattro tabelle (de, it, es,
   fr) con l'inglese come chiave.
2. La riga «Language» in «Settings», sotto «PREFERENCES» sopra «Units»:
   mostra la lingua dell'app; toccata apre «Phone language» e le cinque,
   ognuna nel suo nome; la scelta vale subito e resta.
3. `App.tsx` chiama `useLanguage()`: una lingua nuova ridisegna tutta
   l'app senza perdere quello che è aperto.
4. I testi dei file liberi dentro `t()`: «Settings», «Profile», l'accesso,
   «My activities», i preferiti, i disegni, il feed, Strava, la ricerca
   del luogo.
5. Un test che legge tutte le chiamate e controlla che ogni lingua abbia
   ogni testo, con gli stessi `{segni}`.
6. ADR-0172, `UI.md`, `STATUS.md`.

**Parti successive** (una PR ciascuna, dopo il merge di chi tiene i file):
«Draw» e `src/route/` (dopo TASK-191 C), «Explore», le schermate della
corsa e la fine corsa (dopo TASK-191 C, TASK-208 e TASK-209), la riga
«Sport» (dopo TASK-191 C), il resto di `App.tsx`, i nomi delle forme in
«Draw».

## Criteri di accettazione

Parte A:

- [x] In «Settings» si sceglie fra «Phone language» e le cinque lingue; la
      scelta vale subito per tutta l'app e resta dopo un riavvio (test).
- [x] Senza scelta, l'app segue la lingua del telefono se è una delle
      cinque, altrimenti l'inglese (test).
- [x] Ogni testo passato da `t()` ha la sua traduzione in de, it, es, fr,
      con gli stessi `{segni}` (test che legge il codice).
- [x] In inglese l'app è byte per byte quella di prima: i test esistenti
      passano; in `SettingsPage.test.tsx` cambia solo il conto dei
      pulsanti, perché «Language» è un pulsante nuovo.
- [x] Nessuna dipendenza nuova.
- [x] Provato nel simulatore: «Settings» in italiano e in tedesco.
- [x] Le traduzioni riviste: l'utente ha delegato il controllo
      all'agente («controlla te, mi fido», 2026-10-03), che le ha rilette
      e corrette nelle quattro lingue.

## File toccati

Parte A:

```
apps/mobile/App.tsx                          (solo useLanguage)
apps/mobile/src/i18n/                        (nuova: index, languages, language,
                                              phoneLanguage, useLanguage, translate,
                                              shapeNames, de, it, es, fr, e i test)
apps/mobile/src/settings/LanguageSetting.tsx       (nuovo)
apps/mobile/src/settings/LanguageSetting.test.tsx  (nuovo)
apps/mobile/src/profile/SettingsPage.tsx
apps/mobile/src/profile/SettingsPage.test.tsx
apps/mobile/src/profile/EditProfile.tsx
apps/mobile/src/profile/PhotoChoices.tsx
apps/mobile/src/profile/PhotoRow.tsx
apps/mobile/src/profile/ProfileHeader.tsx
apps/mobile/src/profile/ProfileHome.tsx
apps/mobile/src/profile/UserProfilePage.tsx
apps/mobile/src/profile/profileFields.ts
apps/mobile/src/profile/useProfilePhoto.ts
apps/mobile/src/account/fields.ts
apps/mobile/src/account/messages.ts
apps/mobile/src/account/useAccount.ts
apps/mobile/src/screens/ProfileLayer.tsx
apps/mobile/src/screens/ProfileScreen.tsx
apps/mobile/src/screens/SignInScreen.tsx
apps/mobile/src/activities/ActivitiesList.tsx
apps/mobile/src/activities/ActivityCard.tsx
apps/mobile/src/activities/activitiesDoor.ts
apps/mobile/src/activities/activityText.ts
apps/mobile/src/favorites/FavoriteHeart.tsx
apps/mobile/src/favorites/FavoritesList.tsx
apps/mobile/src/favorites/favoriteRoute.ts
apps/mobile/src/favorites/favoritesDoor.ts
apps/mobile/src/social/DrawingCard.tsx
apps/mobile/src/social/DrawingsGrid.tsx
apps/mobile/src/social/drawingsDoor.ts
apps/mobile/src/feed/FeedPost.tsx
apps/mobile/src/strava/StravaActivityRow.tsx
apps/mobile/src/strava/StravaParts.tsx
apps/mobile/src/strava/StravaRunEnd.tsx
apps/mobile/src/strava/StravaSetting.tsx
apps/mobile/src/strava/useStrava.ts
apps/mobile/src/api/strava.ts
apps/mobile/src/places/PlaceSearch.tsx
docs/tasks/TASK-210.md
docs/DECISIONS.md
docs/UI.md
docs/STATUS.md
```

## Fuori scope

- Le frasi dette dalla voce: TASK-209.
- I testi che arrivano dall'API (nomi dei percorsi a tema, titoli degli
  esempi, i messaggi d'errore del server) e il nome che il server dà
  all'attività su Strava: restano in inglese; tradurli è un task dell'API.
- Lingue oltre le cinque; le lingue scritte da destra a sinistra.
- Miglia e piedi: TASK-182.

## Esito

**Parte A** (2026-10-03): in `main` con la PR #254 (merge `18fe25c`),
pubblicata su «preview» (gruppo `90bd8c06`, insieme a TASK-212; server
invariato). In «Settings» si sceglie la lingua; senza scelta l'app segue
il telefono. Tradotti «Settings», «Profile», l'accesso, «My activities», i
preferiti, i disegni, il feed, Strava e la ricerca del luogo; provata nel
simulatore con il telefono in italiano (italiano all'avvio, «Deutsch»
subito, resta dopo un riavvio). Le traduzioni le ha riviste l'agente su
delega dell'utente.

**Parte B — la corsa** (2026-10-06, dopo la revisione del codice
dell'app; chiesta dall'utente: «parti con le traduzioni di TASK-210»):
`NavigateScreen`, `FreeRunScreen`, `RunDashboard`, `RunPanel`,
`FinishScreen`, `Countdown`, `HoldButton`, `PocketScreen`, `MapScreen`,
`navigation/runStats.ts` (i punti cardinali e «about 17 min»), più i km
con la virgola in `phrases.distanceLabel`. 58 testi nuovi nelle quattro
tabelle (`out/task-210-corsa-testi.md` sul Mac per l'occhio dell'utente);
«Back», «Cancel», «Time», «Distance», «Pace», «Last km», «Speed now»,
«Avg speed» e le due righe della legenda erano già tradotti. **Il banner
della svolta** non ha più un costruttore inglese suo: `NavigateScreen`
scrive la svolta con il frasario della voce nella lingua dell'app
(`wordsOf(useLanguage())`, TASK-209), così una via si dice e si legge
allo stesso modo, e la seconda riga è «Poi …» con `t("Then {directions}")`;
`phrases.instruction`/`thenText` restano per i loro test, da togliere con
«Draw». Test: `screens/RunItalian.test.tsx` (banner, fine corsa, numeri,
bottone, tempi in italiano); `RunBike`, `RunPaddle`, `RunMiles` cercano
la scheda «Dati» dove sono in italiano. **Testi approvati dall'utente**
il 2026-10-06 («vanno bene i testi»).

**Da fare nelle parti successive**: «Draw» (`RoutePanel`, `problems`,
`distance`, `ImageChoice`, `OutlineBoard`, `warnings`, `wordInput`,
`LoadingBar`, `DistanceStepper`, `RouteTiles`, `shareGpx`; dopo
TASK-256, che ne tocca i testi d'errore), «Explore» (`ExploreScreen`,
`ExploreTools`, `CityExamples`, `AskForRoute`, `ThemedCard`,
`ExploredCard`, `ExploreStart`, `WhileDrawing`, `useStartDirections`,
`useThemedRoute`, `presets`), la fine corsa di TASK-208 (`RunEnd.tsx`,
`PublicParts.tsx`, `PublicRow.tsx`, `api/drawings.ts`), `VoiceSetting.tsx`,
`SportSetting`/`SportButton`/`sport.ts`, i titoli delle pagine in
`App.tsx`, i nomi delle forme in «Draw» (`shapeWords.ts` sa solo
inglese e italiano: «Herz», «cœur» vanno all'AI), i nomi sulla mappa
forzati in italiano (`mapStyle.ts`) e «Start here» nella pagina della
mappa (`mapPage.ts`), «Help» in de/es/fr.
