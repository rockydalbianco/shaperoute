# TASK-235 — Gli annunci fra i post del «Feed»

**Stato**: Todo
**Fase**: 4 · **Branch**: `feat/TASK-235-feed-ads`
**Dipende da**: TASK-132 e TASK-166 (in `main`). Per gli annunci veri:
TASK-150, TASK-152, TASK-153. **ADR**: ADR-0198, che supera in parte
ADR-0102.

Chiesto dall'utente il 2026-10-05: «La pubblicità le mettiamo tra i post
dei feed». Alla domanda «sostituisce l'annuncio a schermo intero all'inizio
di ogni ricerca, o si aggiunge?» ha scelto **sostituisce**, con la proposta
che la accompagnava: un annuncio nativo con l'aspetto di un post e la
scritta «Sponsored», uno ogni 5 post.

## Obiettivo

La pubblicità di Sgrava sta solo nel «Feed»: fra un post e l'altro, ogni 5
post, un annuncio nativo AdMob largo come un post che dice «Sponsored».
«Draw route» e «Ask for a route» non mostrano più l'annuncio a schermo
intero.

## Contesto da leggere

- `docs/DECISIONS.md` ADR-0102, con l'aggiornamento di TASK-166 in fondo
- `apps/mobile/src/ads/` (`admob.ts`, `routeAds.ts`, `useAdBeforeRoute.ts`)
- `apps/mobile/src/screens/FeedScreen.tsx` e `src/feed/FeedPost.tsx`
  (larghezza, angoli, spazi di un post)
- `react-native-google-mobile-ads` 17.2, già nell'app: `NativeAd`,
  `NativeAdView`, `NativeAsset`, `NativeMediaView`, `TestIds.NATIVE`. Sono
  dello stesso pacchetto: nessuna dipendenza nuova.
- Le regole di Google per gli annunci nativi (AdMob, «Native ads
  policies»), da ricontrollare all'inizio del task: la scritta che dice che
  è un annuncio, AdChoices, cosa dell'annuncio si può e non si può
  cambiare.
- Memoria `admob-account-state`: niente annunci veri finché mancano
  pagamenti, consenso pubblicato e App Store. Qui solo unità di prova.

## Cosa fare

1. **Via l'annuncio dalla ricerca.** In `App.tsx` le due righe
   `useAdBeforeRoute(...)` lasciano lo stato com'è. `useAdBeforeRoute.ts`,
   `routeAds.ts` e i loro test si tolgono: non li usa più nessuno. Il
   consenso (`AdsConsent.gatherConsent`) e l'avvio dell'SDK restano, nel
   modulo nuovo.
2. **`src/ads/feedAds.ts`**, dietro un'interfaccia come oggi `RouteAds`:
   dà al Feed un annuncio nativo caricato, o niente. In Expo Go, sul web e
   nei test: niente (come `NO_ADS`), e il pacchetto AdMob non si carica
   (il controllo di `admob.ts` resta). ID dell'unità da
   `EXPO_PUBLIC_ADMOB_NATIVE_IOS` / `_ANDROID`, altrimenti
   `TestIds.NATIVE`; in `.env.example` queste al posto delle due
   `INTERSTITIAL`. Se gli annunci nativi chiedono una configurazione
   nuova (nel plugin di `app.json` o altrove) o un pacchetto in più,
   **fermarsi e chiederlo all'utente**.
3. **Dove.** Una funzione pura, `src/feed/feedWithAds.ts`, intreccia i post
   e i posti per gli annunci: un posto dopo il 5°, il 10°, il 15° post e
   così via (`AD_EVERY = 5`), **solo se dopo c'è un altro post**: mai in
   cima, mai in fondo, mai due di fila. Quindi:
   - meno di 6 post: nessun annuncio;
   - da 6 a 10 post: uno, dopo il 5°;
   - il Feed d'esempio di oggi (15 post): due, dopo il 5° e il 10°.

   Se l'annuncio di un posto non è carico, il posto non c'è: nessun buco,
   nessun segnaposto. Vale per qualunque lista di post, anche il feed vero
   di TASK-118.
4. **L'aspetto**: `src/feed/FeedAd.tsx`, larga e arrotondata come un post.
   In alto icona e nome dell'inserzionista; al posto del disegno il media
   dell'annuncio (`NativeMediaView`); sotto titolo, testo e pulsante
   d'azione. Colori da `theme/tokens.ts`. AdChoices lo mette l'SDK.
   **«Sponsored» si legge bene**, come chiedono le regole di AdMob: in
   alto, accanto al nome dell'inserzionista, non più piccola del nome del
   corridore di un post, con il contrasto dei testi normali. La scheda non
   si confonde con un post: niente corridore, punteggio, tempi, reazioni,
   e un tocco non apre la mappa.
5. **Testi** con `t()` nelle cinque lingue dell'app (`src/i18n/`):
   «Sponsored» e, se serve, l'etichetta del pulsante quando l'annuncio non
   ne porta una.
6. **Quanti e quando**: un annuncio per posto, caricato quando la lista ci
   arriva vicino, non tutti all'apertura del Feed; distrutti quando il
   Feed si smonta. Un annuncio che arriva tardi entra solo in un posto non
   ancora sullo schermo: i post che l'utente sta guardando non si spostano.
7. **Documenti**: ADR-0198 con la scelta, che in testa dice che supera in
   parte ADR-0102; in fondo ad ADR-0102 un paragrafo «Aggiornamento»
   che rimanda ad ADR-0198, senza riscriverla.
8. **Prova**: una build propria nel simulatore (memoria
   «native-build-on-mac-simulator»), con l'ID di prova dell'app di Google
   nell'`Info.plist` generato: il Feed mostra l'annuncio nativo di prova
   dopo il 5° post; «Draw route» non ne mostra nessuno.

## Prima di partire con il codice

- **`FeedScreen.tsx`** lo toccherà anche **TASK-228** (il «Feed»
  sull'acqua, sessione «App per il padel»), in coda: avvisare quella
  sessione quando si parte. Chi entra secondo si aggiorna da `main`.
- **`App.tsx`**: TASK-226 B cambia una riga in `onStartExplore`; le righe
  di `useAdBeforeRoute` sono altrove, il merge resta pulito.

## Criteri di accettazione

- [ ] «Draw route» e «Ask for a route» non mostrano nessun annuncio, con o
      senza SDK (test).
- [ ] Con annunci caricati, il Feed ne mostra uno dopo ogni 5 post, solo
      fra due post: nessuno con 5 post, uno con 6, due con i 15 d'esempio
      (test della funzione pura e di `FeedScreen` con un finto SDK).
- [ ] Senza annuncio (Expo Go, consenso negato, errore, niente rete) il
      Feed è quello di oggi, senza buchi (test).
- [ ] La scheda dell'annuncio mostra «Sponsored» in alto, nelle cinque
      lingue (test), e non ha corridore, punteggio né reazioni.
- [ ] In Expo Go il pacchetto AdMob non si carica e l'app funziona come
      prima (`admob.test.ts` resta verde).
- [ ] `npm run lint`, `typecheck`, `test` e `format:check` verdi.
- [ ] Prova nel simulatore: screenshot del Feed con l'annuncio di prova
      («Test Ad») dopo il 5° post.

## File toccati

```
apps/mobile/App.tsx
apps/mobile/src/ads/
apps/mobile/src/feed/FeedAd.tsx
apps/mobile/src/feed/FeedAd.test.tsx
apps/mobile/src/feed/feedWithAds.ts
apps/mobile/src/feed/feedWithAds.test.ts
apps/mobile/src/screens/FeedScreen.tsx
apps/mobile/src/screens/FeedScreen.test.tsx
apps/mobile/src/i18n/de.ts
apps/mobile/src/i18n/es.ts
apps/mobile/src/i18n/fr.ts
apps/mobile/src/i18n/it.ts
.env.example
docs/DECISIONS.md
docs/STATUS.md
docs/tasks/TASK-235.md
```

## Fuori scope

- **Annunci veri**: l'unità nativa vera in AdMob, `app-ads.txt`, il
  messaggio di consenso pubblicato. Sono di TASK-153, che oggi parla di
  un'unità interstitial: lo aggiorna il coordinatore, non questo task.
- `docs/PUBBLICITA.md`, sul branch di TASK-150, dice ancora «un annuncio a
  schermo intero a ogni ricerca»: lo corregge TASK-150.
- Annunci in «Explore», nel profilo, nella corsa, a fine corsa.
- Un abbonamento senza pubblicità.
- Il feed vero (TASK-118): qui solo i post d'esempio di oggi.
- Pubblicare con `eas update`: in Expo Go gli annunci non si vedono
  comunque; la build per lo store è TASK-152.

## Esito

*(si compila a fine task)*
