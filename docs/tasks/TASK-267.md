# TASK-267 — Annunci spenti nella build dello store

**Stato**: In corso
**Fase**: 4 · **Branch**: `feat/TASK-267-store-without-ads`
**Dipende da**: TASK-235 (annunci nel Feed), TASK-152 (build `production`)

## Obiettivo

La 1.0 sull'App Store esce senza pubblicità, scelta dell'utente del
2026-10-09: nella build `production` l'SDK di AdMob non parte, non si
chiede il consenso, il Feed non mostra annunci né spazi vuoti, e nessun
annuncio di prova arriva ad Apple. Preview ed Expo Go come oggi.

## Contesto da leggere

- `docs/DECISIONS.md` ADR-0198, ADR-0237
- `docs/DEPLOY.md` A.7
- `apps/mobile/src/ads/admob.ts`

## Cosa fare

1. `EXPO_PUBLIC_ADS=off` spegne gli annunci: `adsTurnedOff()` in
   `src/ads/admob.ts` ferma tutto prima di caricare il pacchetto di AdMob.
2. Test: con `off` il pacchetto non si carica e il Feed non ha annunci;
   con un altro valore gli annunci restano.
3. `DEPLOY.md` A.7: la riga `env:set production` per la variabile.
4. **La variabile nell'ambiente EAS `production`**: la scrive l'utente,
   oppure l'agente con il suo sì esplicito, prima della build 5.
5. Controllare se privacy, termini e scheda dello store parlano di
   annunci: se sì, segnalarlo al coordinatore (i file non sono di questo
   task).

## Criteri di accettazione

- [x] Con `EXPO_PUBLIC_ADS=off` AdMob non si carica, il consenso non si
      chiede e il Feed ha solo i post (test).
- [x] Senza la variabile, o con un altro valore, gli annunci come prima
      (test); Expo Go come prima (test di TASK-235).
- [ ] `EXPO_PUBLIC_ADS=off` è nell'ambiente EAS `production`.
- [ ] Nella build 5: nessun annuncio nel Feed, nessun modulo di consenso.

## File toccati

```
apps/mobile/src/ads/admob.ts
apps/mobile/src/ads/admob.test.ts
.env.example
docs/DEPLOY.md
docs/DECISIONS.md
docs/STATUS.md
docs/tasks/TASK-267.md
```

## Fuori scope

- Togliere AdMob dall'app o dal codice nativo (`app.json`, `app.config.ts`).
- I testi di «Termini» e «Privacy» (app: TASK-262 A e C; sito: TASK-237).
- Gli annunci veri: TASK-153, fermo.

## Esito

*(si compila a fine task)*
