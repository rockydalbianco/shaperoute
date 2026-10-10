# TASK-264 — Il tipo di mappa: Standard, Satellite, 3D

**Stato**: Done
**Fase**: app · **Branch**: `feat/TASK-264-map-kind`

## Obiettivo

Chiesto dall'utente il 2026-10-08: «metti la possibilità di cambiare il
tipo di mappa satellitare in 3d, normale». Sulla mappa un pulsante sceglie
fra la mappa scura di sempre, le foto aeree e una mappa in 3D; la scelta
resta per la volta dopo.

## Contesto da leggere

- `docs/UI.md` «Il tema» (regola 4: lo stile della mappa è dell'app) e
  «Le due schermate» (la mappa).
- ADR-0029 (MapLibre GL JS nella WebView), ADR-0046 (lo stile scuro),
  ADR-0195 (la mappa girata, TASK-232).

## Cosa fare

1. La scelta (`map/mapKind.ts`): `standard`, `satellite`, `3d`, salvata
   in `map-kind.json` come le unità (TASK-182); «standard» non scrive
   niente.
2. Lo stile (`map/mapKindStyle.ts`): lo stile scuro con dentro, nascosti,
   le foto Esri, i nomi chiari da mettere sopra le foto e l'ombreggiatura
   del rilievo; per ogni tipo, gli strati che mostra.
3. La pagina della mappa (`mapPage.ts`): il messaggio `setKind` mostra e
   nasconde gli strati, accende il rilievo per il 3D e inclina la mappa;
   un percorso inquadrato resta inquadrato.
4. Il pulsante (`map/MapKindButton.tsx`) in alto a destra di fronte a «←»,
   sotto la barra delle svolte mentre si corre; `MapView` dice alla pagina
   il tipo scelto, subito e a ogni pagina che si ricarica.
5. I testi nelle cinque lingue, approvati dall'utente.

## Criteri di accettazione

- [x] Toccando il pulsante compaiono «Standard», «Satellite» e «3D», con
      la spunta su quello mostrato; scelto un tipo, la mappa cambia subito
      e il menu si chiude.
- [x] «Satellite» mostra le foto Esri con i nomi dei paesi in chiaro e il
      credito di Esri; nessuna strada scura sopra.
- [x] «3D» inclina la mappa a 55° con il rilievo vero e l'ombreggiatura;
      il percorso resta visibile e inquadrato.
- [x] Tornando a «Standard» la mappa è quella di prima, piatta, con il
      solo credito di OpenFreeMap.
- [x] La scelta resta alla riapertura dell'app; una pagina che si ricarica
      (lingua nuova, «Retry») la riceve di nuovo.
- [x] Nessuna chiave obbligatoria: con `EXPO_PUBLIC_ARCGIS_API_KEY` le foto
      passano dall'indirizzo di Esri per le chiavi.
- [x] Test deterministici per scelta, stile, pagina, `MapView`, pulsante e
      schermata; prova dal vivo nel browser della pagina vera.

## File toccati

```
apps/mobile/src/map/mapKind.ts
apps/mobile/src/map/mapKind.test.ts
apps/mobile/src/map/mapKindStyle.ts
apps/mobile/src/map/mapKindStyle.test.ts
apps/mobile/src/map/MapKindButton.tsx
apps/mobile/src/map/MapKindButton.test.tsx
apps/mobile/src/map/mapPage.ts
apps/mobile/src/map/mapPage.test.ts
apps/mobile/src/map/mapPageKind.test.ts
apps/mobile/src/map/messages.ts
apps/mobile/src/map/MapView.tsx
apps/mobile/src/map/MapViewKind.test.tsx
apps/mobile/src/screens/MapScreen.tsx
apps/mobile/src/screens/MapScreenKind.test.tsx
apps/mobile/src/i18n/de.ts
apps/mobile/src/i18n/es.ts
apps/mobile/src/i18n/fr.ts
apps/mobile/src/i18n/it.ts
.env.example
docs/tasks/TASK-264.md
docs/DECISIONS.md
docs/STATUS.md
docs/UI.md
```

## Fuori scope

- Le mappe piccole sotto i disegni di «Feed» ed «Explore»
  (`feed/feedMapPage.ts`): restano standard.
- Gli edifici in 3D: provati e tolti (ADR-0232, alternative).
- Satellite e 3D insieme (le foto sul rilievo): un quarto tipo, da
  chiedere all'utente se lo vuole.
- La chiave ArcGIS: l'account gratuito lo crea l'utente quando vuole;
  la chiave va in `apps/mobile/.env` e nelle variabili di EAS.

## Esito

Il pulsante sceglie fra Standard, Satellite (foto Esri, nomi in chiaro) e
3D (rilievo AWS Terrain Tiles con ombreggiatura, 55°), senza ricaricare la
mappa. Provato nella pagina vera nel browser a Trento: tipi, crediti,
inquadratura e ritorno a Standard. Gli edifici in 3D coprivano il percorso
e sono stati tolti. Resta la chiave ArcGIS, quando l'utente crea l'account.
