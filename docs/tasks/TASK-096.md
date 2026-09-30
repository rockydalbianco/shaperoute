# TASK-096 — Salvare un disegno, e i miei disegni

**Stato**: Todo
**Fase**: 4 · **Branch**: `feat/TASK-096-save-drawing`
**Dipende da**: TASK-092, TASK-095

## Obiettivo

A fine corsa chi ha un account salva il disegno con il suo punteggio, lo
ritrova nel profilo e sceglie se pubblicarlo.

## Contesto da leggere

- `docs/DATABASE.md` (disegni), `docs/PRODUCT.md` (parte social)
- `docs/API.md` `/track-scores`
- `docs/UI.md` «Finish» (TASK-092), profilo (TASK-095)

## Cosa fare

1. API: `POST /drawings` — traccia, percorso pianificato, forma o parola,
   distanza, durata, data, titolo facoltativo (al più 60 caratteri).
   **Il punteggio lo ricalcola l'API** con `track_score`: quello mandato
   dall'app non si usa.
2. `GET /me/drawings`, `GET /drawings/{id}`, `PATCH /drawings/{id}`
   (titolo, pubblico sì/no), `DELETE /drawings/{id}`. Solo il proprietario
   modifica e cancella; un disegno privato lo vede solo lui.
3. La traccia mostrata agli altri è senza i primi e gli ultimi 200 m (o la
   misura scelta in TASK-089): si taglia nell'API, non nell'app. Il
   proprietario la vede intera.
4. App: «Save drawing» nella schermata «Finish», con titolo e
   l'interruttore «Public»; senza account, l'invito a iscriversi e la
   traccia resta sul telefono. Nel profilo la griglia dei propri disegni
   (miniatura della traccia, punteggio); toccando, il disegno sulla mappa.
5. Test di API e app; `API.md`, `DATABASE.md`, `UI.md`, ADR.

## Criteri di accettazione

- [ ] Il punteggio salvato è quello calcolato dall'API, anche se l'app ne
      manda un altro.
- [ ] Un disegno privato dà «non trovato» a chiunque altro.
- [ ] La traccia di un disegno pubblico, chiesta da un altro utente, non ha
      punti entro 200 m di percorso dalla partenza e dall'arrivo.
- [ ] Cancellato un disegno, non compare più in nessun elenco.
- [ ] Salvataggio fallito senza rete: l'app lo riprova, la traccia non si perde.
- [ ] Test verdi; prova sull'iPhone.

## File toccati

```
services/api/shaperoute_api/drawings.py
services/api/shaperoute_api/app.py
services/api/shaperoute_api/schemas.py
services/api/migrations/
services/api/tests/test_drawings.py
packages/shared-types/src/index.ts
apps/mobile/src/api/drawings.ts
apps/mobile/src/api/drawings.test.ts
apps/mobile/src/screens/FinishScreen.tsx
apps/mobile/src/screens/ProfileScreen.tsx
apps/mobile/src/screens/DrawingScreen.tsx
apps/mobile/src/screens/DrawingScreen.test.tsx
apps/mobile/src/social/TrackThumbnail.tsx
docs/API.md
docs/DATABASE.md
docs/UI.md
docs/DECISIONS.md
docs/STATUS.md
docs/tasks/TASK-096.md
```

## Fuori scope

- Vedere i disegni degli altri (TASK-097).
- Caricare un GPX da Strava o Garmin.
- Foto della corsa.

## Esito
