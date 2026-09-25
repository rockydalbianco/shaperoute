# TASK-049 — Navigazione col GPS, svolta per svolta

**Stato**: Done, da provare sull'iPhone
**Fase**: 4 · **Branch**: `feat/TASK-049-navigation`

## Obiettivo

Dal percorso disegnato si parte con «Start» e l'app guida come un
navigatore: la prossima svolta in alto (freccia, via, distanza dal GPS dal
vivo), la mappa che segue la posizione, la voce e la vibrazione prima di
ogni incrocio.

## Contesto da leggere

- `docs/DECISIONS.md` ADR-0045, ADR-0047 (le indicazioni)
- `docs/UI.md`, «Le due schermate», «Il risultato»
- `apps/mobile/App.tsx`, `src/map/`, `src/route/RoutePanel.tsx`

## Cosa fare

1. Logica pura in `src/navigation/`: dove si è lungo il percorso, la
   prossima indicazione, cosa dire e quando, fuori percorso, arrivo.
2. Voce con `expo-speech` (dipendenza nuova, approvata dall'utente il
   2026-09-24) e vibrazione con `Vibration` di React Native.
3. La mappa segue la posizione senza rifare l'inquadratura del percorso.
4. «Start» sul risultato; banner e «Stop» durante la navigazione.

## Criteri di accettazione

- [x] `tsc`, `eslint`, `prettier`, `jest` puliti.
- [x] Ogni svolta si annuncia una volta, entro 50 m, con quelle unite a
      lei (test).
- [x] Su una strada fatta andata e ritorno la posizione va avanti, non
      torna sull'andata (test).
- [x] Fuori percorso e arrivo detti una volta (test).
- [ ] Provato sull'iPhone camminando o correndo un percorso vero: da fare
      dall'utente (vedi Esito).
- [x] Nuovo ADR; `docs/UI.md` e `docs/STATUS.md` aggiornati.

## File toccati

```
apps/mobile/package.json, package-lock.json        (expo-speech)
apps/mobile/App.tsx
apps/mobile/src/navigation/…                       (nuovi, con i test)
apps/mobile/src/screens/NavigateScreen.tsx         (nuovo)
apps/mobile/src/screens/MapScreen.tsx              (il banner al posto di «←»)
apps/mobile/src/route/RoutePanel.tsx               («Start»)
apps/mobile/src/map/messages.ts, mapPage.ts, MapView.tsx (+ test: `follow`)
docs/UI.md, docs/DECISIONS.md, docs/STATUS.md
docs/tasks/TASK-049.md                             (nuovo)
```

## Fuori scope

- Ricalcolare il percorso quando si esce: oggi si dice «Off the route».
- Navigare a schermo spento o con l'app in background.
- I nomi dei marciapiedi: TASK-053.

## Esito

Fatto il 2026-09-25 (ADR-0052). «Start» appare sul risultato quando il
percorso ha le indicazioni (richieste in due tempi). Durante la corsa:
banner con freccia, distanza e istruzione («Turn left onto Via Roma»), la
seconda riga per le indicazioni unite («Then turn right onto the
footpath»), km rimasti e «Stop»; la voce dice «In 50 metres, turn left onto
Via Roma» e il telefono vibra; alla partenza «Head out on Via Roma».

Non provato sul telefono: serve camminare un percorso vero con l'app aperta
e lo schermo acceso. Da guardare: se 50 m di anticipo bastano correndo, se
i 40 m oltre i quali si è «fuori percorso» scattano a torto in centro città
(GPS impreciso fra i palazzi), e se la voce si sente con la musica.

Dopo il merge: `npm install` dalla radice, per `expo-speech`.
