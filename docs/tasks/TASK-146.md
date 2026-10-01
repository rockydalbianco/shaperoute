# TASK-146 — Il proprietario Expo in `app.json`

**Stato**: Done
**Fase**: 4 · **Branch**: `chore/TASK-146-expo-owner`

Assegnato dal coordinatore il 2026-10-02. Il 2026-10-02 l'utente ha
trasferito il progetto Expo dall'account `lppl1316` all'organizzazione
`lppl1316s-team`, così altri possono entrarci come membri. `app.json` dice
ancora `"owner": "lppl1316"`: ogni `eas update` da `main` si ferma con
«Owner of project ... does not match», e finora la riga si correggeva a
mano nella copia temporanea da cui si pubblica.

## Obiettivo

`apps/mobile/app.json` nomina il proprietario vero del progetto Expo, e
`eas update` da una copia pulita di `main` non ha più bisogno di modifiche
a mano.

## Contesto da leggere

- `docs/DEPLOY.md` A.6 «L'app senza Expo acceso (EAS Update, TASK-083)»
- `apps/mobile/app.json` (`expo.owner`, `expo.extra.eas.projectId`)

## Cosa fare

1. In `apps/mobile/app.json`, `owner` da `lppl1316` a `lppl1316s-team`.
   Solo quella riga: `projectId` non cambia col trasferimento.
2. In `docs/DEPLOY.md` A.6 il nome e l'indirizzo del progetto su Expo, e
   che `owner` deve coincidere.
3. Verifica: `npx expo config` dall'app mostra il nuovo owner; test,
   lint e typecheck dell'app verdi.

## Criteri di accettazione

- [x] `npx expo config --type public` da `apps/mobile` dà
      `owner: 'lppl1316s-team'` e lo stesso `projectId` di prima.
- [x] `npm run lint`, `npm run typecheck` e `npm test` verdi.
- [x] `docs/DEPLOY.md` A.6 nomina `@lppl1316s-team/shaperoute`.

## File toccati

```
apps/mobile/app.json
docs/DEPLOY.md
docs/STATUS.md
docs/tasks/TASK-146.md
```

## Fuori scope

- Pubblicare l'app (`eas update`) e toccare il server: li fa il
  coordinatore a fine coda dei merge.
- Il resto di `app.json` (bundleIdentifier, plugin AdMob): è di TASK-132,
  PR #130, che cambia le righe 11–17 e 31–45; `owner` è fuori dai suoi
  blocchi, quindi il merge resta pulito.
- L'indirizzo dell'API scritto in `DEPLOY.md` A.6 punto 2 (ancora il Mac
  su Tailscale): non riguarda il proprietario.
- Le voci vecchie di `DECISIONS.md` e dei task file che citano
  `@lppl1316/shaperoute`: sono storia, valevano quando sono state scritte.

## Esito

Fatto. `npx expo config --type public` dà `owner: 'lppl1316s-team'` e
lo stesso `projectId`; lint, typecheck, format e 607 test dell'app verdi
(un timeout di 5 s in `OutlineBoard.test.tsx` al primo giro, col Mac
carico, verde rilanciato). `eas update` non è stato provato: lo fa il
coordinatore alla prossima pubblicazione, senza più correggere la riga.
