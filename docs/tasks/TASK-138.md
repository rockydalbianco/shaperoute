# TASK-138 — «Explore»: suggerimenti di città e luoghi mentre si scrive

**Stato**: Done
**Fase**: 4 · **Branch**: `feat/TASK-138-place-suggestions`

Chiesto dall'utente il 2026-10-01 dopo una prova sull'iPhone: in
«Explore», scrivendo la città non compariva nessun suggerimento. Vuole
suggerimenti da toccare a metà parola, città e luoghi: «scrivo ver, devono
uscirmi Verona centro, Arena di Verona…».

Perché non comparivano: l'app sul telefono era quella di prima di TASK-134
(nessuna chiamata a `/city-suggestions` nel log dell'API) e l'API sul Mac
era partita prima del merge di TASK-134 (`/city-suggestions` → 404). Serve
riavviare l'API e ripubblicare l'app. Ma anche con TASK-134 i suggerimenti
erano solo città: «Arena di Verona» non sarebbe uscita.

## Obiettivo

Il campo della città di «Explore» suggerisce, mentre si scrive, città e
luoghi (monumenti, piazze, quartieri, vie); un tocco sceglie il punto da
cui partono la lista e le richieste.

## Contesto da leggere

- ADR-0105 (suggerimenti di TASK-134); `docs/API.md` (`/city-suggestions`)
- `docs/UI.md` («Explore»)

## Cosa fare

1. API: `GET /city-suggestions` chiede l'autocompletamento di Geoapify
   senza `type`; tiene città e luoghi, scarta contee, regioni, stati e CAP;
   l'ordine del servizio; ogni voce ha `kind` (`city` | `place`). Due
   luoghi a meno di 150 m sono lo stesso punto: resta il primo.
2. App: le voci su due righe (nome; «City centre · regione» per una città,
   la città per un luogo); «Type a city or a place»; Invio sceglie il primo
   suggerimento.
3. Un luogo scelto: le categorie chiedono il tema col solo nome
   («Food») e il punto del luogo, come dalla partenza, non «Food in Arena
   di Verona» (le parole farebbero cercare una città con quel nome).
4. Prove dal vivo: «ver», «arena di ver», «duomo di mil», «casa di giu».

## Criteri di accettazione

- [x] «arena di ver» suggerisce l'Arena di Verona; «ver» suggerisce
      Verona come centro città.
- [x] Un tocco su un luogo lo sceglie; una categoria parte dal suo punto.
- [x] Le città restano come prima: punto del centro, «Food in Verona».
- [x] Un'API senza `kind` (vecchia) dà ancora città.
- [x] Test verdi (app 548, API 353); lint, tipi e formattazione.

## File toccati

```
services/api/shaperoute_api/cities.py
services/api/shaperoute_api/app.py
services/api/tests/test_explore_categories.py
services/api/tests/test_place_suggestions.py
apps/mobile/src/places/photon.ts
apps/mobile/src/explore/cities.ts
apps/mobile/src/explore/cities.test.ts
apps/mobile/src/explore/presets.ts
apps/mobile/src/explore/presets.test.ts
apps/mobile/src/explore/ExploreTools.tsx
apps/mobile/src/explore/ExploreTools.test.tsx
docs/API.md
docs/UI.md
docs/DECISIONS.md
docs/STATUS.md
docs/tasks/TASK-138.md
```

## Fuori scope

- I luoghi più famosi di una città già da «ver» (come Google): Geoapify
  non li ordina per fama; la ricerca dei luoghi li dà per distanza (a Roma
  statue prima del Colosseo). Servirebbe un'altra fonte.
- Suggerimenti vicini alla posizione dell'utente (`bias`): in «Explore» si
  cerca soprattutto altrove.
- `App.tsx` (lo tocca la PR #130, TASK-132).

## Esito

Dall'API del branch, con Geoapify vero (2026-10-01):

| Scritto | Suggerimenti (i primi) |
|---|---|
| «ver» | Verona, Vercelli, Versailles (città) |
| «arena di ver» | Verona Arena (Verona), Via Arena di Verona (Statte)… |
| «duomo di mil» | Milan Cathedral, Basilica of Sant'Ambrogio… |
| «casa di giu» | Casa di Giulio Romano (Mantova), Juliet's House (Verona)… |
| «colosseo» | Piazza del Colosseo (Roma)… |
| «par» | Paris, Parma, Parè (Colverde)… |

Duomo di Milano scelto → Food: cerchio di 9,8 km, somiglianza 1,00, 4
ristoranti, partenza a 60 m dal Duomo. «ver» dà solo città: i luoghi
famosi di una città per prefisso restano fuori (vedi Fuori scope).
Prima scelta «prima le città», cambiata dopo la prova: «casa di giu»
metteva davanti una frazione. La prova sull'iPhone dopo riavvio dell'API
ed `eas update`.
