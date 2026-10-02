# TASK-115 — App: iscriversi, entrare, uscire

**Stato**: Done
**Fase**: 4 · **Branch**: `feat/TASK-115-app-accounts`
**Dipende da**: TASK-114

## Obiettivo

Dall'app ci si iscrive e si entra; l'app ricorda chi è entrato. Chi non ha
un account disegna percorsi come oggi.

## Contesto da leggere

- `docs/UI.md` «Le due schermate», «Il tema», «Quando non va»
- `docs/API.md`, gli endpoint di TASK-114
- `apps/mobile/src/api/`

## Cosa fare

1. Schermate «Sign up» e «Log in» con i campi scelti in TASK-110, errori in
   parole semplici.
2. Il token si conserva in modo sicuro sul telefono (il pacchetto è quello
   approvato in TASK-110; se manca, chiedere) e parte con le richieste che
   lo vogliono.
3. Una navigazione a schede in basso: «Draw» (le schermate di oggi) e
   «Profile» (per ora: entra / esci / cancella account). Le altre schede
   arrivano con TASK-117 e TASK-118.
4. «Delete account», con conferma.
5. Test delle schermate e del client, con l'API finta.
6. `UI.md`, ADR.

## Criteri di accettazione

- [ ] Iscrizione, entrata e uscita funzionano contro l'API vera sull'iPhone.
- [x] Chiusa e riaperta, l'app ricorda l'utente.
- [x] Senza account si disegna e si naviga come prima.
- [x] Token scaduto: l'app chiede di rientrare, senza crash.
- [x] Colori dai token; testi in inglese; test verdi.

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
docs/tasks/TASK-115.md
```

## Fuori scope

- Nome, foto e pagina del profilo (TASK-116).
- «Sign in with Apple» e Google.

## Esito

Codice e test fatti (2026-10-02, ADR-0125): schede «Draw» e «Profile»
fatte a mano, «Sign up» e «Log in», «Log out» subito anche offline,
«Delete account» con la conferma sulla schermata e solo col sì dell'API;
la sessione (token e utente) in `expo-secure-store`, verificata con
`GET /me` all'apertura. 7 file di test nuovi (59 test, con l'API finta e
un portachiavi in memoria); 696 test dell'app verdi, lint e typecheck
puliti. La barra si toglie su mappa e corsa (anche quella libera di
TASK-149). **Manca la prova sull'iPhone contro l'API vera**: serve
un'API con il database (Colima sul Mac, o TASK-122) e l'app ripubblicata.
