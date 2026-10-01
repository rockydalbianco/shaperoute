# TASK-132 — Un annuncio prima del percorso

**Stato**: In corso
**Fase**: 4 · **Branch**: `feat/TASK-132-route-ads`

## Obiettivo

Dopo «Draw route» (e «Ask for a route» in «Explore») un interstitial AdMob
compare prima del percorso; chiuso, o se non c'è, il percorso si vede subito.

## Contesto da leggere

- `docs/DECISIONS.md` ADR-0102

## Cosa fare

1. `react-native-google-mobile-ads` con gli ID di prova di Google.
2. `src/ads/`: rete pubblicitaria dietro un'interfaccia, `useAdBeforeRoute`.
3. In `App.tsx` lo stato dei due percorsi passa da `useAdBeforeRoute`.
4. `eas.json` con il profilo `preview`; bundle identifier iOS
   `com.lppl1316.sgrava`, scelto dall'utente.

## Criteri di accettazione

- [x] Con un annuncio carico il percorso pronto resta dietro l'annuncio e
      compare alla chiusura (test).
- [x] Senza annuncio, senza consenso, con un errore: percorso subito (test).
- [x] Nessun annuncio per attese, errori, annullamenti; al massimo uno ogni
      3 minuti (test).
- [x] In Expo Go nessun modulo nativo caricato, l'app come prima (test).
- [ ] Prova sull'iPhone con una build EAS `preview`: annuncio di prova di
      Google, X, percorso. Serve l'account Apple Developer dell'utente.

## File toccati

```
apps/mobile/App.tsx
apps/mobile/app.json
apps/mobile/eas.json
apps/mobile/package.json
apps/mobile/src/ads/
package-lock.json
.env.example
docs/DECISIONS.md
docs/STATUS.md
docs/tasks/TASK-132.md
```

## Fuori scope

- Account AdMob, ID veri, `app-ads.txt`, pubblicazione negli store.
- Un pulsante «Privacy options» per cambiare il consenso dopo.

## Esito

Codice e test fatti; manca la prova su una build vera (sopra).
