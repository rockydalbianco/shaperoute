# TASK-437 — «Save» e «Start» sul percorso arrivato da un Edit

**Stato**: Done · 2026-11-11 · in `main` con #1120 (`7e24e7d1`), in
produzione col settimo OTA (iOS `3906eb66`, Android `7b0ec9eb`), provato
dall'utente sul telefono
**Fase**: 5 · **Branch**: `feat/TASK-437-edit-save-start`
**Dipende da**: TASK-410 («Edit & run»), TASK-369 («Edit the drawing»),
TASK-171 (i preferiti)
**ADR**: nessuno (riusa il salvataggio dei preferiti com'è) · numero dal
Coordinatore il 2026-11-10

## Obiettivo

Parole dell'utente del 2026-11-10: «quando premo su edit e run su un post o
edit su un post in explore poi ci deve essere un tasto che dice tipo salva e
uno che dice tipo parti se vuoi iniziare a correrlo».

## Scelta dell'utente (2026-11-10)

**Dove**: «Sul percorso» — quando il percorso modificato è pronto (dopo
«Draw route»), due tasti affiancati: «Save» (nei preferiti, come il cuore
sulla mappa; poi «Saved») e «Start» grande in giallo. Solo per i percorsi
arrivati da un Edit; gli altri percorsi di «Draw» restano come prima.

## Come funziona

- `App.tsx`: lo stato `fromEdit` si accende quando «Edit & run» o «Edit the
  drawing» mettono la linea sulla mappa di «Draw on the map»; si spegne con
  «Draw route» di «Draw» e con «Freehand». Con `fromEdit` e il percorso
  pronto, `RouteOutcome` riceve `save`.
- `RoutePanel.tsx`: la prop `save` mette «Save» e «Start» in una riga, metà
  e metà; senza, «Start» da solo come prima. Senza indicazioni (nessun
  «Start») resta «Save».
- `SaveRouteButton.tsx` (nuovo): `favorites.press(route)` come il cuore; con
  nessuno entrato, prima «Profile», come il cuore.
- i18n: «Saved» in it, fr, de, es.

## Criteri di accettazione

- [x] Dopo «Edit & run» → «Draw route»: «Save» e «Start»; «Save» manda
      `PUT /me/favorites/{key}` e diventa «Saved» (`AppEditRun.test.tsx`).
- [x] «Start» parte come prima; senza Edit «Start» resta solo
      (`RoutePanelSaveStart.test.tsx`).
- [x] Un percorso senza indicazioni tiene «Save» senza «Start».
- [x] OTA di produzione: il settimo, 2026-11-11 (iOS `3906eb66`, Android
      `7b0ec9eb`; preview `59cbd83c`).
- [x] Prova sul telefono, 2026-11-11: parole dell'utente al Coordinatore
      «procedi funziona tutto ok procedi», poi «Sì, sul telefono».
- [x] Testo nuovo «Saved» (it «Salvato», fr «Enregistré», de «Gespeichert»,
      es «Guardado») approvato dall'utente il 2026-11-10: «Sì, vanno bene».

## File toccati

- `apps/mobile/App.tsx`
- `apps/mobile/src/route/RoutePanel.tsx`
- `apps/mobile/src/favorites/SaveRouteButton.tsx` (nuovo)
- `apps/mobile/src/i18n/{it,fr,de,es}.ts`
- `apps/mobile/src/route/RoutePanelSaveStart.test.tsx` (nuovo)
- `apps/mobile/__tests__/AppEditRun.test.tsx`
- `docs/tasks/TASK-437.md`

## Esito

2026-11-11: in `main` con #1120. Dopo «Edit & run» o «Edit the drawing» e
«Draw route», il percorso ha «Save» (nei preferiti, poi «Saved») accanto a
«Start». In produzione col settimo OTA e provato dall'utente sul telefono:
non resta niente.
