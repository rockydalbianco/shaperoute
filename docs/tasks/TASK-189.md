# TASK-189 — «Sport» in «Settings»

**Stato**: In lavorazione
**Fase**: 4 · **Branch**: `feat/TASK-189-sport-setting`
**Dipende da**: TASK-177 (la pagina «Settings»: `SettingsPage.tsx` si
tocca solo dopo il suo merge)

## Obiettivo

In «Settings» si sceglie lo sport per cui Sgrava disegna i percorsi.
Chiesto dall'utente il 2026-10-02: «Nelle impostazioni, fai scegliere
anche il tipo di sport, perché poi implementiamo anche per Bici e padel
canoa». Oggi il motore disegna solo per la corsa: «Run» è scelto, «Bike»
e «Paddle» si vedono con «Soon» e non si toccano (scelta dell'utente,
lo stesso giorno).

## Contesto da leggere

- `docs/DECISIONS.md` ADR-0145 («Settings» a sezioni, le voci «Soon»),
  ADR-0152
- `apps/mobile/src/profile/SettingsPage.tsx` e il suo test (TASK-177)
- `apps/mobile/src/explore/recentCities.ts`: come si tiene una cosa sul
  telefono

## Cosa fare

1. `src/settings/sport.ts`: l'elenco degli sport (`run`, `bike`,
   `paddle`), ognuno con `ready`; la scelta tenuta nei documenti del
   telefono (`sport.json`); senza scelta, o con una scelta che non è
   pronta, vale `run`.
2. `src/settings/SportSetting.tsx`: la sezione «SPORT», tre righe. Uno
   sport pronto è un pulsante di scelta con il segno «✓» quando è scelto;
   uno non pronto dice «Soon» e non prende il tocco.
3. **Dopo il merge di TASK-177** (lo scrive il coordinatore): montare
   `<SportSetting />` in `SettingsPage.tsx`, sopra «Preferences», e
   aggiornare il suo test (le scritte «Soon» diventano 11).
4. `UI.md` («Settings»), `STATUS.md`, ADR-0152.

## Criteri di accettazione

- [x] «Run» è scelto; «Bike» e «Paddle» dicono «Soon», non sono pulsanti
      e il lettore di schermo li dice «…, coming soon».
- [x] Uno sport con `ready: true` si sceglie con un tocco e la scelta si
      ritrova alla prossima apertura (provato nei test con la bici
      accesa).
- [x] Una scelta salvata che non è pronta, o un file che non si legge,
      vale «Run»; un telefono che non scrive non rompe niente.
- [x] Nessun colore scritto a mano, niente dipendenze nuove.
- [ ] La sezione «Sport» si vede in «Settings».
- [ ] Test verdi con la sezione montata.

## File toccati

```
apps/mobile/src/settings/
apps/mobile/src/profile/SettingsPage.tsx
apps/mobile/src/profile/SettingsPage.test.tsx
docs/UI.md
docs/DECISIONS.md
docs/STATUS.md
docs/tasks/TASK-189.md
```

`SettingsPage.tsx` e il suo test sono di TASK-177 finché non è in `main`:
prima si scrivono solo i file nuovi di `src/settings/`.

## Fuori scope

- I percorsi per la bici: TASK-190. Quelli per la canoa: TASK-191. Chi
  porta uno sport mette `ready: true` nella sua riga di `sport.ts` e
  manda la scelta all'API (il campo `activity` della richiesta c'è già).
- Mandare lo sport scelto all'API, cambiare «Draw» o «Explore» secondo lo
  sport: finché c'è solo la corsa non cambia niente.
- Tenere la scelta nell'account, da un telefono all'altro.
- «Units» e le altre voci «Soon» di «Settings».

## Dove siamo

2026-10-02: i passi 1 e 2 sono fatti e committati, con 9 test verdi
(typecheck, lint e formato anche). Worktree
`.claude/worktrees/sport-setting`. Mancano i passi 3 e 4, che aspettano
TASK-177 in `main`: poi una riga di import e `<SportSetting />` in
`SettingsPage.tsx`, il conto delle scritte «Soon» nel suo test (da 9 a
11), `UI.md`, `STATUS.md`, la prova nel simulatore e la PR. La sessione
di TASK-177 è avvisata.

## Esito

*(si compila a fine task)*
