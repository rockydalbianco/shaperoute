# TASK-094 — App: iscriversi, entrare, uscire

**Stato**: Todo
**Fase**: 4 · **Branch**: `feat/TASK-094-sign-in`
**Dipende da**: TASK-093

## Obiettivo

Dall'app ci si iscrive e si entra; l'app ricorda chi è entrato. Chi non ha
un account disegna percorsi come oggi.

## Contesto da leggere

- `docs/UI.md` «Le due schermate», «Il tema», «Quando non va»
- `docs/API.md`, gli endpoint di TASK-093
- `apps/mobile/src/api/`

## Cosa fare

1. Schermate «Sign up» e «Log in» con i campi scelti in TASK-089, errori in
   parole semplici.
2. Il token si conserva in modo sicuro sul telefono (il pacchetto è quello
   approvato in TASK-089; se manca, chiedere) e parte con le richieste che
   lo vogliono.
3. Una navigazione a schede in basso: «Draw» (le schermate di oggi) e
   «Profile» (per ora: entra / esci / cancella account). Le altre schede
   arrivano con TASK-096 e TASK-097.
4. «Delete account», con conferma.
5. Test delle schermate e del client, con l'API finta.
6. `UI.md`, ADR.

## Criteri di accettazione

- [ ] Iscrizione, entrata e uscita funzionano contro l'API vera sull'iPhone.
- [ ] Chiusa e riaperta, l'app ricorda l'utente.
- [ ] Senza account si disegna e si naviga come prima.
- [ ] Token scaduto: l'app chiede di rientrare, senza crash.
- [ ] Colori dai token; testi in inglese; test verdi.

## File toccati

```
apps/mobile/src/account/
apps/mobile/src/api/accounts.ts
apps/mobile/src/api/accounts.test.ts
apps/mobile/src/screens/SignInScreen.tsx
apps/mobile/src/screens/SignInScreen.test.tsx
apps/mobile/src/screens/ProfileScreen.tsx
apps/mobile/src/screens/Tabs.tsx
apps/mobile/App.tsx
apps/mobile/package.json
package-lock.json
docs/UI.md
docs/DECISIONS.md
docs/STATUS.md
docs/tasks/TASK-094.md
```

## Fuori scope

- Nome, foto e pagina del profilo (TASK-095).
- «Sign in with Apple» e Google.

## Esito
