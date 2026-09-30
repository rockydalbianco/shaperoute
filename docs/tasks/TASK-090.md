# TASK-090 — Motore: il punteggio di una traccia corsa

**Stato**: Todo
**Fase**: 4 · **Branch**: `feat/TASK-090-track-score`

## Obiettivo

Data una traccia GPS registrata e la forma che doveva disegnare, il motore
restituisce un punteggio da 0 a 100, dalla CLI, senza rete.

## Contesto da leggere

- `docs/ROUTE_ENGINE.md` §5
- `services/route-engine/route_engine/metrics.py`
- `docs/DECISIONS.md` ADR-0037, ADR-0039
- `docs/tasks/TASK-089.md`, punto 1 (se già deciso)

## Cosa fare

Non dipende da TASK-089 per partire: la proposta del punto 1 è il
predefinito; se l'utente sceglie altro, cambia solo cosa si confronta.

1. Modulo nuovo `track_score.py`: pulisce la traccia (punti con errore GPS
   oltre una soglia, salti impossibili per chi corre, punti doppi), in
   metri su piano proiettato.
2. Punteggio = la somiglianza del motore (`shape_similarity`, o la variante
   per le forme con tratti, ADR-0039) fra traccia pulita e forma ideale,
   per 100, arrotondata. Restituire anche: quota del percorso pianificato
   coperta dalla traccia, distanza corsa, e se la traccia è troppo corta
   per un punteggio (soglia da scegliere e scrivere nell'ADR).
3. Parole e immagini non hanno una forma del catalogo: la forma ideale è il
   contorno con cui il percorso è stato pianificato; se non è disponibile,
   si confronta con il percorso pianificato. Scriverlo nell'ADR.
4. CLI: `--score-track corsa.gpx` insieme alle opzioni della forma.
5. Test deterministici con tracce costruite: il percorso stesso (punteggio
   = `similarity` × 100), il percorso con rumore di 10 m, metà percorso,
   una traccia altrove (0), traccia vuota.
6. `ROUTE_ENGINE.md` §5 e ADR.

## Criteri di accettazione

- [ ] La traccia uguale al percorso pianificato dà `round(similarity*100)`.
- [ ] Rumore di 10 m: il punteggio cala di al più 5 punti.
- [ ] Metà percorso: punteggio più basso e «coperta» circa 0,5.
- [ ] Traccia vuota o troppo corta: nessun punteggio, con il motivo.
- [ ] Nessun import da `services/api` o `services/ai`; nessuna dipendenza nuova.
- [ ] `pytest`, `ruff`, `black` verdi.

## File toccati

```
services/route-engine/route_engine/track_score.py
services/route-engine/route_engine/__main__.py
services/route-engine/tests/test_track_score.py
docs/ROUTE_ENGINE.md
docs/DECISIONS.md
docs/STATUS.md
docs/tasks/TASK-090.md
```

## Fuori scope

- API e app (TASK-092).
- Cambiare `metrics.py` o la somiglianza dei percorsi pianificati.
- Riconoscere chi bara (traccia finta, in bici): annotare, non fare.

## Esito
