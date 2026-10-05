# TASK-236 — I paesi vicini sotto «Near me»

**Stato**: In revisione (PR aperta)
**Fase**: 4 · **Branch**: `feat/TASK-236-nearby-towns`
**Dipende da**: TASK-129, TASK-143, TASK-168, TASK-176 (in `main`) ·
**ADR**: ADR-0200

Chiesto dall'utente il 2026-10-05: «nella sezione Explore di tutti gli
sport favorisci la sezione Near me con una sottocategoria con le città
vicine a me, fai 20, 50 km in base alla città, suggeriscine massimo
quattro, e poi inizia a scaricare tutte le mappe di quei quattro paesi,
qualcosina per qualche campione».

## Obiettivo

In «Explore», con «Near me» acceso, sotto la fila delle città c'è la
sezione «NEARBY TOWNS»: fino a quattro città e paesi intorno alla partenza,
ognuno una scheda che lo apre come città scelta. Mentre la sezione è sulla
pagina, il server scarica la zona di ognuno e ne disegna i primi esempi,
così il paese si apre con le prime schede pronte.

## Contesto da leggere

- `docs/DECISIONS.md` ADR-0200 (questa scelta), ADR-0136 (gli esempi
  tenuti), ADR-0144 (il cerchio per primo), ADR-0155 (il paese scelto)
- `docs/UI.md`, «Explore»: «Near me» e «Da TASK-236»
- `docs/API.md`, `GET /nearby-cities`
- `apps/mobile/src/explore/exampleRoutes.ts` (come si chiedono gli esempi)

## Cosa fare

1. **API**: `GET /nearby-cities?lat=&lon=` (`nearby_cities.py`), fino a 4
   città e paesi di OpenStreetMap dal Places di Geoapify, con la chiave
   che c'è già: quelli entro 20 km, i più grandi; se sono meno di quattro,
   i più vicini oltre i 20, fino a 50 km. Il paese in cui si è (centro entro 1,5 km)
   resta fuori. I centri passano a `route_store.learn`.
2. **App**: `nearbyCities.ts` (la richiesta), `nearbySamples.ts` (i
   campioni in sottofondo: cerchio, cuore, stella da 5 km dal centro di
   ogni paese, uno alla volta, al più dodici richieste al minuto),
   `NearbyTowns.tsx` (la fila di schede), e la sezione in
   `ExploreScreen.tsx` quando non c'è una città scelta.
3. I testi nelle cinque lingue.

## Criteri di accettazione

- [x] `GET /nearby-cities` dà al più quattro paesi, i più vicini per
      primi, con etichetta e punto uguali a quelli di `GET /cities`; 503
      senza chiave o senza risposta, senza la chiave nel messaggio.
- [x] Con quattro paesi entro 20 km non si chiede oltre; con meno, la
      lista si riempie fino a 50 km.
- [x] Al servizio va il centro di un quadrato di circa 1 km, non la
      posizione; la risposta è tenuta un giorno.
- [x] In «Explore» con «Near me» la sezione mostra una scheda per paese,
      con la distanza; un tocco lo apre come città; con una città scelta
      la sezione non c'è; senza paesi o senza risposta non c'è niente.
- [x] I campioni si chiedono uno alla volta, come li chiede una città
      scelta (stessa richiesta: il server ne tiene una sola), e si fermano
      quando la sezione lascia la pagina.
- [x] Test deterministici, senza rete, per API e app.
- [x] Provato dal vero sul Mac (2026-10-05): API del branch sulla porta
      8011, app in Expo Go nel simulatore con la posizione a Caldonazzo.
      «NEARBY TOWNS» mostra Levico, Pergine, Trento, Borgo; i campioni di
      Levico, Pergine e Trento arrivano sulle schede; il tocco su Trento lo
      apre come città. Borgo Valsugana no: la sua zona non è sul Mac e
      Overpass rifiutava la connessione (la scheda resta senza disegno).

## File toccati

```
services/api/shaperoute_api/nearby_cities.py        (nuovo)
services/api/tests/test_nearby_cities.py            (nuovo)
services/api/shaperoute_api/__main__.py             (tre righe)
apps/mobile/src/explore/nearbyCities.ts             (nuovo, con test)
apps/mobile/src/explore/nearbySamples.ts            (nuovo, con test)
apps/mobile/src/explore/NearbyTowns.tsx             (nuovo, con test)
apps/mobile/src/explore/ExploreScreen.tsx           (la sezione)
apps/mobile/src/explore/ExploreScreen.test.tsx
apps/mobile/src/i18n/de.ts, es.ts, fr.ts, it.ts     (tre testi)
docs/API.md, docs/UI.md, docs/DECISIONS.md, docs/STATUS.md
docs/tasks/TASK-236.md
```

L'endpoint si monta da `__main__.py`, come `/phone-zones`: `app.py` non
cambia.

## Fuori scope

- **La canoa**: «Near me» con i laghi vicini è di TASK-233 (#319).
- **Le zone sul telefono** dei paesi vicini: TASK-214 B2, che può
  chiedere i paesi a `GET /nearby-cities`.
- Il segnale «città scelta da un paese vicino» negli `insights`
  (`via: "nearby"` vuole `shared-types`, occupato da TASK-234).
- I campioni tenuti sul telefono fra un'apertura e l'altra dell'app.
- Scaricare le zone dall'estratto invece che da Overpass a richiesta.

## Da confermare con l'utente

- I testi: «NEARBY TOWNS» / «PAESI VICINI», «2.9 km away» / «a 2,9 km».
- La regola dei quattro: i più grandi entro 20 km; dove sono meno, i più
  vicini fino a 50 km. Chi è in una grande città lontano dal centro (oltre
  1,5 km) vede fra i quattro anche la sua città («Roma · 4 km away»).
- Tre campioni per paese (cerchio, cuore, stella), con il cuore sulla
  scheda.

## Esito

*(a fine task)*
