# TASK-259 — «Open Settings» e «Location is off»

**Stato**: In corso
**Fase**: 4 · **Branch**: `feat/TASK-259-open-settings`

## Obiettivo

Quando il telefono nega la fotocamera o la posizione, accanto al testo che
lo dice c'è un bottone «Open Settings» che apre le impostazioni dell'app; la
riga rossa della mappa che non carica non dice più «reopen the app» ma offre
«Retry».

## Contesto

Seguito di TASK-256 («Seguiti, per il coordinatore» in `tasks/TASK-256.md`)
e della revisione dell'app del 2026-10-06 (`out/revisione-app-2026-10-06.md`
sul Mac, voci sugli errori). Assegnato dal coordinatore il 2026-10-06.

- `route/ImageChoice.tsx`: «The camera is off for this app. Allow it in
  Settings, or choose a picture instead.» senza un modo di arrivare alle
  impostazioni. La libreria delle foto non chiede permessi (il selettore di
  sistema consegna solo la foto scelta, `route/pickImage.ts`): l'unico
  rifiuto possibile è la fotocamera.
- `screens/NavigateScreen.tsx` e `screens/FreeRunScreen.tsx`: «Location is
  off for Sgrava: allow it in Settings to …» senza bottone. Il rifiuto dei
  servizi di posizione spenti è già trattato come un «denied» (TASK-253).
- `screens/ChooseScreen.tsx`, `MapError`: «The map could not load (motivo).
  Check the connection and reopen the app.» Da TASK-256 la mappa sa
  ricaricarsi («Retry» sopra la mappa) e la riga sparisce quando la mappa
  carica; ma in «Draw» la mappa è sotto la schermata e il suo «Retry» non si
  vede. Il motivo tra parentesi è tecnico («MapLibre GL JS did not load»).

## Contesto da leggere

- `docs/tasks/TASK-256.md` (i testi e il tono)
- `apps/mobile/src/map/MapView.tsx` (`onError`, `retry`)

## Cosa fare

1. Un bottone «Open Settings» nuovo e riusabile
   (`src/permissions/OpenSettings.tsx`, `Linking.openSettings()`, già in
   React Native: nessuna dipendenza).
2. `ImageChoice`: sotto il testo della fotocamera negata, «Open Settings».
3. `MapError`: il testo già tradotto della mappa («The map could not be
   loaded. Check the network.»), senza il motivo tecnico, e «Retry» quando
   la schermata lo offre. In «Draw» «Retry» monta di nuovo la mappa
   (`key` in `App.tsx`) e toglie la riga; se non carica ancora, torna.
4. Un avviso «Location is off» con «Open Settings»
   (`src/permissions/LocationOff.tsx`) per le due schermate della corsa,
   **collegato a `NavigateScreen` e `FreeRunScreen` solo dopo il merge di
   TASK-210 parte «corsa»** (`feat/TASK-210-run-screens` modifica quei due
   file): parte B di questo task.
5. Testi nuovi nelle cinque lingue (`i18n/*`, solo righe nuove), mostrati
   all'utente prima del merge.

## Criteri di accettazione

- [ ] Con la fotocamera negata, «Open Settings» sotto il testo chiama
      `Linking.openSettings()` (test).
- [ ] Con altri problemi della foto, nessun «Open Settings» (test).
- [ ] `MapError` non mostra il motivo tecnico né «reopen the app» (test).
- [ ] In «Draw», «Retry» chiama la funzione della schermata (test); in
      `App.tsx` la mappa viene montata di nuovo e l'errore azzerato.
- [ ] `LocationOff` dice il testo con «Open Settings» (test).
- [ ] Parte B: le due schermate della corsa mostrano `LocationOff` (test).
- [ ] Testi nelle cinque lingue, approvati dall'utente.

## File toccati

```
apps/mobile/src/permissions/OpenSettings.tsx            (nuovo)
apps/mobile/src/permissions/OpenSettings.test.tsx       (nuovo)
apps/mobile/src/permissions/LocationOff.tsx             (nuovo)
apps/mobile/src/permissions/LocationOff.test.tsx        (nuovo)
apps/mobile/src/route/ImageChoice.tsx
apps/mobile/src/route/ImageChoice.test.tsx
apps/mobile/src/screens/ChooseScreen.tsx
apps/mobile/src/screens/ChooseScreen.test.tsx
apps/mobile/App.tsx
apps/mobile/__tests__/App.test.tsx
apps/mobile/src/i18n/de.ts, es.ts, fr.ts, it.ts         (solo righe nuove)
docs/tasks/TASK-259.md
docs/DECISIONS.md                                       (ADR-0223)
docs/STATUS.md
docs/UI.md                                              (i messaggi)
# parte B
apps/mobile/src/screens/NavigateScreen.tsx (+ test)
apps/mobile/src/screens/FreeRunScreen.tsx (+ test)
```

## Fuori scope

- La foto del profilo (`profile/useProfilePhoto.ts`) ha lo stesso testo
  della fotocamera negata: è un'altra schermata, seguito.
- La riga di `MapError` sopra la mappa (`MapScreen.tsx`), che lì sta
  accanto al «Retry» della mappa stessa: resta com'è, con il nuovo testo.
- Le traduzioni del resto di «Draw» (TASK-210).

## Esito

*(da compilare)*
