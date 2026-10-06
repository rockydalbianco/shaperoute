# TASK-256 — Gli errori parlano a chi corre

**Stato**: In lavorazione (PR aperta il 2026-10-06)
**Fase**: 4 · **Branch**: `feat/TASK-256-errors-for-runners` (nome dal
brief del coordinatore)

## Obiettivo

Ogni errore che l'app mostra dice a chi corre cosa è successo e cosa può
fare, in cinque lingue, con un bottone per riprovare dove ha senso; il
dettaglio tecnico resta nelle build di sviluppo. Un errore di disegno non
lascia più lo schermo bianco, e una mappa che non carica si può
ricaricare.

## Contesto

Dalla revisione del codice dell'app del 2026-10-06, verificato sul codice:

- `route/problems.ts:159-218` e `account/messages.ts:8-47` mostrano
  all'utente istruzioni per lo sviluppatore: «Cannot reach the API at
  https://…sslip.io. Check that it is running (on the PC: with --lan)…»,
  «look at the API log», «not running on the PC (Ollama)», «Put the API's
  key in EXPO_PUBLIC_API_KEY in apps/mobile/.env, then restart npm run
  mobile», «open it from the QR code of npm run mobile», «The app and the
  API do not agree (a bug): HTTP 502». L'indirizzo del server è stampato
  sullo schermo.
- L'app non ha un `ErrorBoundary` né un gestore globale: un errore di
  rendering in qualunque componente lascia lo schermo bianco, anche a
  metà corsa (la corsa è già nel file: si può riaprire).
- `map/MapView.tsx:263-285`: una mappa che non carica una volta (offline,
  `unpkg.com` irraggiungibile: MapLibre arriva solo da lì, `mapPage.ts:25`)
  manda `error`; niente la ricarica mai e `mapError` non viene mai
  azzerato. Il testo dice «reopen the app».
- Dopo un errore di «Draw route» non c'è un bottone che rifaccia la stessa
  richiesta; «Explore» con la lista fallita non ha «Try again»
  (`ExploreScreen.tsx:129-160`, seguito: è di TASK-232 B2/C, non qui).

**Scelta dell'utente** (2026-10-06): sì ai testi per chi corre con «Try
again»; i testi glieli si mostra prima del merge. Proposta mostrata nella
chat del 2026-10-06 (in inglese; le quattro traduzioni le fa il task):

| Oggi | Proposta |
|---|---|
| Cannot reach the API at {url}. Check that it is running… | No connection. Check the network and try again. (+ «Try again») |
| The app and the API do not agree (a bug): HTTP {status}. | Something went wrong on our side. Try again in a moment. |
| The route engine failed. Try again; if it happens again, look at the API log. | The route could not be drawn. Try again, or try another start. |
| The AI that reads shape words is not running on the PC (Ollama). These words work without it: … | This word cannot be read right now. Try one of these: {list}. |
| The API refused this app's key. Put the API's key in EXPO_PUBLIC_API_KEY… | This version of the app is no longer allowed in. Update the app. |
| The app does not know where the API is: open it from the QR code of npm run mobile on the PC. | The app cannot reach the service. Update the app. |
| The API took more than 5 minutes. Try again later, or a shorter distance. | Drawing this route is taking too long. Try again later, or a shorter distance. |
| The API lost this request (was it restarted?). Try again. | This request was lost. Try again. |
| Accounts are not available on this API: it has no database. | Accounts are not available right now. Try again later. |
| The camera is off for this app. Allow it in Settings, or choose a picture instead. | stesso testo + bottone «Open Settings» (`Linking.openSettings`) |

## Contesto da leggere

- `docs/UI.md` (i messaggi), `docs/DECISIONS.md`: ADR-0172 (la lingua
  dell'app), ADR-0066
- `apps/mobile/src/route/problems.ts`, `account/messages.ts`,
  `route/useRouteRequest.ts`, `route/RoutePanel.tsx` (`Problem`),
  `map/MapView.tsx`, `intro/Root.tsx`, `i18n/tables.test.ts`

## Cosa fare

1. I testi della tabella in `problems.ts` e `messages.ts`, attraverso
   `t()`/`tLater()` con le voci nelle quattro tabelle; il dettaglio
   tecnico (`detail`: indirizzo, HTTP, codice) solo con `__DEV__`.
   `problems.ts` è ancora in inglese fisso (parte di TASK-210 rimasta):
   qui si traducono **solo i testi toccati**, non tutto il file, per non
   pestare TASK-210.
2. «Try again» sotto l'errore di «Draw route» e dell'account dove la
   richiesta si può rifare uguale (`useRouteRequest.retry()`, che rimanda
   l'ultima richiesta; il problema dell'account porta già il suo
   `retry` dove c'è).
3. Un `ErrorBoundary` (`src/intro/AppBoundary.tsx`, nuovo) attorno
   all'app in `Root.tsx`: schermo giallo con il logo, «Something went
   wrong.» e «Try again», che rimonta l'app; la corsa in corso è nel file
   e torna da sola. In sviluppo mostra anche l'errore.
4. `MapView`: «Retry» sul testo d'errore, che ricarica la WebView; la
   ricarica anche quando l'app torna in primo piano con la mappa in
   errore; `onError(null)` (o `onLoaded`) quando la mappa carica, così il
   testo rosso sparisce. Il testo: «The map could not be loaded. Check the
   network.» + «Retry».
5. «Open Settings» accanto al testo della fotocamera negata, e allo
   stesso testo di «Location is off» in corsa se è alla portata.
6. ADR-0220: i testi per chi corre, il dettaglio solo in sviluppo,
   l'`ErrorBoundary`. `UI.md`, `STATUS.md`.
7. **I testi nuovi nelle cinque lingue all'utente prima del merge.**

## Criteri di accettazione

- [ ] Nessun testo mostrato all'utente contiene `http`, `.env`, `npm`,
      `Ollama`, `--lan`, «API log» o «bug» (test che passa sui `t()` delle
      tabelle e su `problems.ts`).
- [ ] Senza rete, «Draw route» mostra «No connection…» e «Try again»;
      «Try again» rimanda la stessa richiesta (test di `RoutePanel`).
- [ ] Un componente che lancia durante il rendering mostra lo schermo
      «Something went wrong.», e «Try again» rimonta l'app (test di
      `AppBoundary`).
- [ ] Una mappa in errore mostra «Retry»; dopo un caricamento riuscito il
      testo sparisce (test di `MapView` con la pagina finta).
- [ ] Le quattro tabelle hanno ogni voce nuova (`tables.test.ts`).
- [ ] I testi visti e approvati dall'utente.
- [ ] `npm run lint`, `typecheck`, `test`, `format:check` verdi.

## File toccati

```
apps/mobile/src/route/problems.ts             (+ test)
apps/mobile/src/account/messages.ts           (+ test)
apps/mobile/src/route/useRouteRequest.ts      (+ test)
apps/mobile/src/route/RoutePanel.tsx          (+ test)
apps/mobile/src/intro/AppBoundary.tsx         (nuovo, + test)
apps/mobile/src/intro/Root.tsx
apps/mobile/src/map/MapView.tsx               (+ test)
apps/mobile/src/i18n/{de,it,es,fr}.ts
docs/UI.md, docs/STATUS.md, docs/DECISIONS.md (le righe di questo task)
```

## Fuori scope

- Tradurre tutto `problems.ts`, `RoutePanel` e «Draw»: parti rimaste di
  TASK-210 (le tiene il coordinatore).
- «Try again» nella lista di «Explore» e sulla scheda di un percorso che
  non si apre: file di TASK-232 B2/C.
- La segnalazione degli errori a un servizio esterno: dipendenza nuova,
  scelta dell'utente.
- MapLibre dentro l'app invece che da `unpkg.com`: un task suo.
- `App.tsx` non si tocca se `MapView` basta.

## Esito

Fatto il 2026-10-06 (ADR-0220), in attesa di merge:

- Punti 1–4, 6 fatti. Punto 5 («Open Settings» accanto a fotocamera e
  posizione negate) **non fatto**: i testi stanno in `ImageChoice.tsx`
  (TASK-254) e in `NavigateScreen.tsx` / `FreeRunScreen.tsx`, fuori dai
  file del task; seguito senza numero.
- `problems.ts`: `devDetail()` e `ProblemText.retry`; `messages.ts`:
  `withDetail()`; `useRouteRequest.retry()`; `RouteOutcome.onRetry`;
  `src/intro/AppBoundary.tsx` in `Root.tsx`; `MapView` con «Retry»,
  ricarica al ritorno in primo piano e `onError(null)`.
- Test nuovi: `AppBoundary.test.tsx`, `RoutePanelRetry.test.tsx`,
  `MapViewRetry.test.tsx`; test delle parole da sviluppatore in
  `problems.test.ts` e `messages.test.ts`. Test di altri moduli che
  leggevano i vecchi testi aggiornati (account, profilo, impostazioni,
  `App.test.tsx`, `AppBike.test.tsx`, `DrawingsGrid.test.tsx`,
  `accessProblems.test.ts`).
- Fuori dai «File toccati», da segnalare al coordinatore: i test sopra e
  le **due righe in `App.tsx`** (`retry` dal hook, `onRetry={retry}` su
  `RouteOutcome`), senza le quali «Try again» non compare sotto «Draw
  route».
- La riga rossa di `ChooseScreen.MapError` («…reopen the app») resta
  finché la mappa non carica: seguito.
