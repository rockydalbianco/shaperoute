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

## Resta

- OTA (produzione e app di prova) col sì dell'utente; prova sul telefono.
- Nella build nativa successiva valutare una patch della libreria
  (userInfo nil), per un trasferimento che fallisce con l'app installata.
- Chiusura: riga in `docs/archive/COMPLETATI.md`.
