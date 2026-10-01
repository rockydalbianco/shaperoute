# TASK-113 — Il punteggio a fine corsa, nell'API e nell'app

**Stato**: In corso
**Fase**: 4 · **Branch**: `feat/TASK-113-finish-score`
**Dipende da**: TASK-111, TASK-112

## Obiettivo

Finita la corsa, l'app mostra il disegno corso sopra quello pianificato e
il punteggio da 0 a 100. Senza account: resta tutto sul telefono.

## Contesto da leggere

- `docs/API.md` «Endpoint», «Errori»
- `docs/UI.md` «La navigazione», «Il risultato»
- `docs/ROUTE_ENGINE.md` §5 (parte di TASK-111)

## Cosa fare

1. API: `POST /track-scores` — corpo: la traccia e la richiesta del
   percorso (forma o parola o contorno, percorso pianificato); risposta:
   `score` 0–100, quota coperta, distanza corsa, oppure l'errore «traccia
   troppo corta». Nessun grafo: solo `track_score` del motore. Limite alla
   misura della traccia.
2. `shared-types`: `TrackScoreRequest`, `TrackScoreResult`.
3. App: schermata «Finish» dopo la navigazione (e con «End run»): mappa con
   pianificato e corso, punteggio grande, distanza e durata, «Done».
   Senza rete il punteggio si chiede più tardi: la traccia è già salvata.
4. Test di contratto dell'API e test della schermata.
5. `API.md`, `UI.md`, ADR.

## Criteri di accettazione

- [x] `POST /track-scores` con il percorso come traccia risponde
      `round(similarity*100)`.
- [x] Traccia troppo corta o malformata: `invalid_request` con il motivo.
- [x] L'app mostra il punteggio a fine corsa; senza rete dice che arriverà
      e non perde la traccia.
- [x] Colori solo dai token; testi in inglese.
- [ ] Test di API e app verdi; prova sull'iPhone con una camminata vera.

## File toccati

```
services/api/shaperoute_api/track_scores.py
services/api/shaperoute_api/app.py
services/api/shaperoute_api/schemas.py
services/api/tests/test_track_scores.py
packages/shared-types/src/index.ts
apps/mobile/src/api/trackScores.ts
apps/mobile/src/api/trackScores.test.ts
apps/mobile/src/screens/FinishScreen.tsx
apps/mobile/src/screens/FinishScreen.test.tsx
apps/mobile/src/screens/NavigateScreen.tsx
apps/mobile/App.tsx
docs/API.md
docs/UI.md
docs/DECISIONS.md
docs/STATUS.md
docs/tasks/TASK-113.md
```

Toccati in più, detti nella PR (ADR-0093):

```
apps/mobile/src/map/MapView.tsx, mapPage.ts, messages.ts (e i loro test)
apps/mobile/src/theme/tokens.ts
apps/mobile/src/navigation/trackStore.ts (e test), useNavigation.ts
apps/mobile/src/screens/NavigateScreen.test.tsx
packages/shared-types/fixtures/track-score-request.json, track-score.json
```

## Fuori scope

- Salvare il disegno su un server, pubblicarlo (TASK-117).
- Classifiche, record personali.

## Esito

Codice e test fatti (2026-09-30): API 15 test nuovi, app 22. **Manca la
prova sull'iPhone** con una camminata vera, che chiude anche quella di
TASK-112. La traccia si cancella a «Done» dopo il punteggio: salvarla è di
TASK-117, che deve anche non fidarsi della somiglianza mandata dall'app.
