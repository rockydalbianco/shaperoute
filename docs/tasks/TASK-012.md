# TASK-012 — Proiezione della forma in coordinate geografiche

**Stato**: Todo
**Fase**: 1 · **Branch**: `feat/TASK-012-shape-projection`

## Obiettivo

Una forma normalizzata diventa una lista di coordinate `(lat, lon)` reali,
con scala, rotazione e fase di partenza come parametri espliciti, e passa
per il punto di partenza dell'utente.

## Contesto da leggere

- `docs/ROUTE_ENGINE.md` §3
- `docs/ARCHITECTURE.md` §3

## Cosa fare

1. Implementare la conversione piano locale in metri → `(lat, lon)` con la
   formula del piano tangente di `ROUTE_ENGINE.md` §3.
2. Implementare la trasformazione della forma: scala in metri, rotazione in
   gradi, traslazione.
3. Implementare la **fase di partenza**: quale punto della curva coincide
   con la posizione dell'utente. La traslazione discende da questo, non è
   libera.
4. Calcolare la scala iniziale dal perimetro: `scala = distanza_target / perimetro`.
5. Calcolare il perimetro reale in metri della forma proiettata, per avere
   subito il confronto con la distanza richiesta.
6. Test: un punto noto finisce dove ci si aspetta; rotazione di 360° è
   l'identità; raddoppiando la scala il perimetro raddoppia; il punto di
   partenza appartiene alla curva proiettata; il perimetro calcolato
   coincide con la distanza target entro tolleranza numerica.

## Criteri di accettazione

- [ ] La forma proiettata passa per il punto di partenza.
- [ ] Il perimetro in metri corrisponde alla distanza richiesta entro l'1%.
- [ ] Rotazione e scala si compongono correttamente (verificato dai test).
- [ ] Nessun calcolo geometrico avviene in gradi.
- [ ] `pytest` verde, `ruff` e `black` puliti.
- [ ] `docs/STATUS.md` aggiornato.

## File toccati

```
services/route-engine/route_engine/projection.py
services/route-engine/route_engine/geo.py
services/route-engine/tests/test_projection.py
```

## Fuori scope

- Rete stradale, snapping, routing (TASK-014).
- Ottimizzazione dei parametri (TASK-015): qui sono input, non risultati.
- Scegliere fra formula locale e `pyproj`: se la formula basta, si tiene e
  si chiude la questione in `DECISIONS.md`. Se emergono problemi, si annota
  e si apre un task, senza cambiare approccio dentro questo.

## Esito
