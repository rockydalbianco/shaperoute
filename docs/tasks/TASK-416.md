# TASK-416 — Gravel, MTB e Roller registrano con i numeri della bici

**Stato**: Done
**Fase**: 4 · **Branch**: `feat/TASK-416-bike-like-numbers` · **ADR**:
precisazione di ADR-0322 e ADR-0324 (nessun ADR nuovo) · numero e lista
dei file dal Coordinatore · sessione avviata dal Coordinatore Sport

## Obiettivo

Chi registra un giro Gravel, MTB o Roller vede e sente i numeri della bici,
non quelli della corsa: velocità attuale e media in km/h, i parziali in
km/h, la voce ogni 10 km, le svolte dette 100 m prima.

## Contesto

Scelte dell'utente:

- Gravel e MTB, 2026-11-07: «nel registrare registra altri dati velocità
  media, ... tutti dati da bici diciamo non corsa»;
- Roller, 2026-11-08: «Sì, km/h».

**La causa.** `navigation/ride.ts` `isRide(activity)` era
`activity === "cycling"`, e ogni numero da bici passa di lì: velocità o
passo in `screens/RunPanel.tsx`, i parziali di `RunDashboard`,
`navigation/kmCompare.ts`, la voce ogni 10 km in
`navigation/useNavigation.ts`, `navigation/penUp.ts`,
`game/RunGameStrip.tsx`. Lungo un percorso arriva l'attività del percorso,
senza percorso il `freeRunAs` del profilo, che è lo sport stesso: per
`gravel_biking`, `mountain_biking` e `inline_skating` non era mai vero.

Da leggere: `docs/sports/COME-AGGIUNGERE.md` §4, `docs/sports/gravel.md`,
`docs/sports/roller.md`.

## Cosa fare

1. Un campo del profilo `rides?: true` in `sports/base.ts`: «i suoi numeri
   sono quelli di un giro in bici».
2. `rides: true` nei profili di bici, Gravel, MTB e Roller, una riga ciascuno.
3. `isRide` lo legge con `findProfile`. Nessun ciclo di import: `sports/` non
   importa `navigation/ride`.
4. I test: `ride.test.ts` aggiornato, `bikeLike.test.ts` nuovo.

## Criteri di accettazione

- [x] Gravel, MTB e Roller: `isRide` vero, svolte a 100 m, chilometri detti
      ogni 10, nessun confronto del singolo chilometro.
- [x] Corsa, camminata e Hike come prima; uno sport sconosciuto non è un giro.
- [x] Gli stessi testi della bici, solo JavaScript: l'impronta iOS resta
      `6f8bba4c`.
- [x] jest, tsc, eslint e prettier verdi sui file toccati.

## File toccati

```
apps/mobile/src/sports/base.ts
apps/mobile/src/sports/cycling.ts
apps/mobile/src/sports/gravel_biking.ts
apps/mobile/src/sports/mountain_biking.ts
apps/mobile/src/sports/inline_skating.ts
apps/mobile/src/navigation/ride.ts
apps/mobile/src/navigation/ride.test.ts
apps/mobile/src/navigation/bikeLike.test.ts   (nuovo)
docs/tasks/TASK-416.md                        (nuovo)
docs/sports/gravel.md                         (una riga)
docs/sports/roller.md                         (una riga)
docs/STATUS.md                                (righe proprie)
docs/DECISIONS.md                             (la precisazione)
```

`sportProfiles.test.ts` non fissa i campi dei profili: non toccato.

## Fuori scope

- Testi nuovi per il Roller (si dice «ride», «kilometres per hour» come la
  bici).
- Le soglie del gioco, i record, l'energia: già degli sport.
- L'OTA di produzione: col sì dell'utente.

## Esito

Gravel, MTB e Roller registrano con i numeri della bici: un campo `rides`
nel profilo, letto da `isRide`. Arriva sul telefono con il prossimo OTA,
col sì dell'utente.
