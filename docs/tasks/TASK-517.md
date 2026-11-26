# TASK-517 — Crash all'avvio di un'attività (Apple Watch senza l'app)

**Stato**: In lavorazione · **Coordinatore**: fork 3 · 2026-11-24

## Il problema

Sull'iPhone dell'utente (build di prova 5b7d0c74, 1.1.0 (14)) MuW si chiude
all'avvio di qualsiasi attività. I file `.ips` del telefono (copiati in
`out/crash-2026-11-24/`) danno sempre la stessa pila: `SIGABRT` da
`-[__NSPlaceholderDictionary initWithObjects:forKeys:count:]` dentro
`-[WCSession onqueue_notifyOfUserInfoError:withUserInfoTransfer:]`.

`react-native-watch-connectivity` 2.0.0, `ios/WatchConnectivity.mm:489`:
quando un `transferUserInfo` fallisce, costruisce l'evento con
`@{@"userInfo": [userInfoTransfer userInfo], ...}`; con `userInfo` nil è
un'eccezione Objective-C che chiude l'app. L'app manda le impostazioni
all'orologio (`useWatch` → `sendSettings` → `transfer`) a ogni avvio di
un'attività, e sull'Apple Watch dell'utente l'app MuW non c'è: ogni
trasferimento fallisce.

Non era l'OTA 25: con l'OTA 24 l'utente ha lo stesso crash.

## La correzione

`watch/watchLink.ts`: `transfer` manda solo se `getIsPaired()` e
`getIsWatchAppInstalled()` dicono sì (la stessa prova di `ready()`).
Solo JavaScript: arriva con un OTA, senza build nativa.

## File toccati

- `apps/mobile/src/watch/watchLink.ts`
- `apps/mobile/src/watch/watchLink.test.ts`
- `docs/tasks/TASK-517.md` (nuovo)

## Parte B — patch nativa della libreria (taglio nativo)

Assegnata da fork 3 il 2026-11-27. La parte JavaScript non manda più
trasferimenti senza l'app sull'orologio; resta il caso di un
trasferimento che fallisce con l'app installata, che chiude l'app allo
stesso modo.

`apps/mobile/scripts/patch-watch-connectivity.js` scrive in
`node_modules/react-native-watch-connectivity/ios/WatchConnectivity.mm`
due controlli `?: @{}`: su `[userInfoTransfer userInfo]` (riga 489, il
crash) e su `error.userInfo` dell'errore di un file ricevuto (riga 383,
stesso tipo di crash). L'errore in sé non serve controllarlo: tutte e due
le righe sono dentro `if (error)`, e `dictionaryFromError` (util.m) salta
già un `userInfo` nil.

Lo lancia il `postinstall` dello `package.json` della **radice**, non
quello dell'app: `@expo/fingerprint` legge gli `scripts` dello
`package.json` dell'app in tutte e due le impronte, mentre la libreria è
collegata solo su iOS (`react-native.config.js`). Così cambia solo
l'impronta iPhone, e l'Android tiene la sua. Niente patch-package
(sarebbe una dipendenza nuova).

Come si comporta lo script:
- libreria non installata: lo dice ed esce 0;
- versione diversa da 2.0.0, o righe né originali né già corrette: esce 1
  con un messaggio, così un aggiornamento della libreria ferma l'install
  invece di perdere la patch in silenzio;
- seconda passata: non cambia nulla.

Il test (`patch-watch-connectivity.test.ts`) gira con jest dell'app, cioè
nel job `mobile` della CI (`npm test`), su copie temporanee del file, e
controlla anche la libreria installata.

PR in bozza **DO NOT MERGE** fino al taglio nativo: cambia l'impronta
iOS, che si misura al taglio.

### File toccati (parte B)

- `apps/mobile/scripts/patch-watch-connectivity.js` (nuovo)
- `apps/mobile/scripts/patch-watch-connectivity.test.ts` (nuovo)
- `package.json` (radice: `postinstall`)
- `docs/tasks/TASK-517.md`

## Resta

- OTA (produzione e app di prova) col sì dell'utente; prova sul telefono.
- Parte B: entra nella build del taglio nativo; impronta iOS misurata lì.
- Chiusura: riga in `docs/archive/COMPLETATI.md`.
