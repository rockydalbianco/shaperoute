# TASK-011 — Forme parametriche: circle e heart

**Stato**: Todo
**Fase**: 1 · **Branch**: `feat/TASK-011-parametric-shapes`

## Obiettivo

Esiste una funzione che, dato il nome di una forma e un numero di punti,
restituisce una curva chiusa normalizzata, con punti equispaziati in
lunghezza d'arco.

## Contesto da leggere

- `docs/ROUTE_ENGINE.md` §2
- `docs/TESTING.md`, paragrafo sui test deterministici

## Cosa fare

1. Definire l'interfaccia comune delle forme: nome → funzione che prende
   `n_points` e restituisce una lista di punti `(x, y)`.
2. Implementare `circle`.
3. Implementare `heart` con la curva indicata in `ROUTE_ENGINE.md` §2,
   normalizzata nel quadrato `[-1, 1]` e centrata nell'origine.
4. Implementare il **ricampionamento per lunghezza d'arco**: si campiona la
   curva fittamente, si calcola la lunghezza cumulata, si interpola per
   ottenere `n_points` equispaziati. È il punto tecnico del task.
5. Registrare le forme in un dizionario, così che aggiungerne una non
   richieda di toccare altro.
6. Test come da `TESTING.md`: curva chiusa, numero di punti, contenimento
   nel quadrato unitario, simmetria verticale del cuore, uniformità della
   spaziatura entro tolleranza.

## Criteri di accettazione

- [ ] `get_shape("heart")(64)` restituisce 64 punti, curva chiusa.
- [ ] Tutti i punti stanno in `[-1, 1] × [-1, 1]`.
- [ ] Il cuore è simmetrico rispetto all'asse verticale entro tolleranza.
- [ ] La distanza tra punti consecutivi è uniforme entro il 5%.
- [ ] Nessun modulo di `shapes/` importa nulla di geografico.
- [ ] `pytest` verde, `ruff` e `black` puliti.
- [ ] `docs/STATUS.md` aggiornato.

## File toccati

```
services/route-engine/route_engine/shapes/__init__.py
services/route-engine/route_engine/shapes/circle.py
services/route-engine/route_engine/shapes/heart.py
services/route-engine/route_engine/shapes/resample.py
services/route-engine/tests/test_shapes.py
```

## Fuori scope

- Coordinate geografiche, scala in metri, rotazione (TASK-012).
- Altre forme: star, lettere (fase 4).
- Disegnare o esportare alcunché (TASK-013).

## Nota

Vale la pena salvare un'immagine delle curve generate — anche un PNG
buttato via con matplotlib — solo per guardarle. Un cuore sbagliato si
riconosce in un secondo a occhio e in mezz'ora leggendo numeri.

## Esito
