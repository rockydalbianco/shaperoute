# TASK-031 — Parole senza forma e forme che le strade non reggono

**Stato**: In corso
**Fase**: 3 · **Branch**: `feat/TASK-031-no-shape-no-fit` (parte da
`docs/TASK-030-close`)

## Obiettivo

Nei due vicoli ciechi di oggi l'app propone una via d'uscita da toccare,
invece di una frase: quando l'AI risponde «nessuna forma», e quando la
forma non ci sta con quella distanza.

## Contesto da leggere

- `docs/AI.md` «Limiti» (parole che il modello non conosce)
- `docs/API.md` «Errori» (`shape_not_drawable`)
- `services/route-engine/route_engine/optimizer.py` (`plan_shape`, dove
  nasce `ShapeNotDrawableError`)
- `services/api/shaperoute_api/errors.py`, `schemas.py`
- `packages/shared-types/src/index.ts` (`ApiError`)
- `apps/mobile/src/route/RoutePanel.tsx` (`ShapeNote`, `Problem`),
  `problems.ts`, `distance.ts`

## Cosa c'è già

- Nessuna forma: sotto il riquadro compare «No shape in the catalogue for
  "…". Try: circle, heart, …», solo testo.
- Non ci sta: `422 shape_not_drawable` con un messaggio in inglese del
  motore; l'app dice «Try another distance, shape or start.» e mostra il
  messaggio. Il motore sa già perché: somiglianza sotto la soglia, oppure
  il percorso migliore è lontano dalla distanza chiesta di più di quanto
  consentito (es. «−2,7 km»).

## Cosa fare

Scelta dell'utente (2026-09-24): quando la forma non ci sta, l'app propone
**la distanza che ci sta**, senza calcoli in più. Niente prove di altre
forme lato API.

1. **Motore**: `ShapeNotDrawableError` porta, oltre al messaggio, la
   distanza del percorso migliore trovato quando il motivo è la distanza
   (`best_distance_m`), altrimenti `None`.
2. **API**: l'errore `shape_not_drawable` aggiunge un campo facoltativo
   `suggested_distance_m`: la distanza migliore arrotondata al km, dentro
   i limiti del contratto, oppure `null`. Contratto e fixture di
   `shared-types` aggiornati; `API.md` aggiornato.
3. **App, non ci sta**: se c'è una distanza suggerita, un pulsante «Try N
   km» che la scrive nel riquadro e richiede il percorso; il testo dice
   perché. Se non c'è (somiglianza bassa), il testo propone di cambiare
   forma o partenza, con le forme del catalogo da toccare.
4. **App, nessuna forma**: le forme del catalogo diventano pulsanti che
   scrivono la forma nel riquadro; più un suggerimento a descrivere la
   cosa in modo esplicito (es. «cavallino rampante» invece di «stemma
   della Ferrari», da `AI.md` «Limiti»).
5. Test deterministici per ciascun livello; prova sull'iPhone
   dall'utente.

## Criteri di accettazione

- [x] Il motore, quando fallisce per distanza, espone la distanza del
      percorso migliore; per somiglianza, nessuna.
- [x] L'API restituisce `suggested_distance_m` in km interi, tra 1 e 50 km
      (i limiti del contratto; l'app offre il pulsante fino a 21 km), o
      `null`; test API verdi.
- [x] Il contratto in `shared-types` e la fixture hanno il campo; test verdi.
- [x] L'app mostra «Try N km» quando c'è una distanza suggerita e,
      toccandolo, richiede il percorso con quella distanza (test del
      pannello o dell'hook).
- [x] Con «nessuna forma» l'app mostra le forme del catalogo come pulsanti
      che le scrivono nel riquadro.
- [ ] Provato sull'iPhone dall'utente: un caso per ciascun vicolo.

## File toccati

```
services/route-engine/route_engine/optimizer.py
services/route-engine/tests/test_optimizer.py
services/api/shaperoute_api/errors.py
services/api/shaperoute_api/schemas.py
services/api/tests/
packages/shared-types/src/index.ts
packages/shared-types/fixtures/
apps/mobile/src/route/
docs/API.md, docs/UI.md, docs/STATUS.md, docs/DECISIONS.md
```

## Fuori scope

- Provare altre forme del catalogo nella stessa zona e proporre quelle che
  riescono (scartato dall'utente: minuti di attesa).
- Cambiare modello AI o il prompt per conoscere più parole.
- Forme nuove nel catalogo.

## Esito

*(da compilare)*
