# TASK-249 — Un paese toccato in «NEARBY TOWNS» e lo stesso paese cercato per nome sono la stessa città

**Stato**: Done — in `main` dalla #381 (`c290d04`, 2026-10-06); sul server con il prossimo aggiornamento dell'API (del coordinatore, con l'ok dell'utente)
**Fase**: 4 · **Branch**: `fix/TASK-249-one-town-one-point`
**Dipende da**: TASK-236 (`GET /nearby-cities`, ADR-0200), TASK-168 (gli
esempi tenuti, ADR-0136), TASK-129 (`GET /cities`, ADR-0099)

## Obiettivo

Un luogo ha **un punto solo**. Oggi un villaggio toccato in «NEARBY TOWNS»
e lo stesso villaggio cercato per nome partono da due punti diversi, e
quindi mostrano percorsi diversi e tengono sul server due serie di esempi.

## Il difetto, misurato

Sul server, il 2026-10-05 (dal coordinatore):

| Luogo | `GET /cities` | `GET /nearby-cities` | Distanza |
| --- | --- | --- | --- |
| Tenna | 46.0215385, 11.2599038 | 46.015703, 11.264283 | 650 m |
| Calceranica al Lago | 45.9978947, 11.2421869 | 46.004241, 11.242883 | 700 m |

Borgo Valsugana, Pergine e Vigolo Vattaro coincidevano.

**La causa** (provata con Geoapify dal Mac il 2026-10-06): la geocodifica
`type=city` di `/cities` per questi luoghi non dà il paese ma il **confine
del comune** (`category: administrative`), e il suo punto è il centro
dell'area. Il Places di `/nearby-cities` e l'autocompletamento di
`/city-suggestions` danno il **nodo `place`** di OpenStreetMap, cioè il
centro del paese. Per molti comuni la geocodifica lega da sola il confine
al suo nodo (Levico Terme, Trento, Milano: stesso punto); per altri no.
Quindi l'unico fuori era `/cities`, anche rispetto al suggerimento toccato
mentre si scrive lo stesso nome.

Non sono solo villaggi: Caldonazzo si spostava di 1127 m, Riva del Garda
(un paese, `place=town`) di 519 m, Jesolo di 1228 m.

## Contesto da leggere

- `docs/DECISIONS.md` ADR-0213 (e ADR-0200, ADR-0136, ADR-0099)
- `docs/API.md`, `GET /cities` e `GET /nearby-cities`
- `services/api/shaperoute_api/cities.py`, `nearby_cities.py`,
  `route_store.py` (solo letto)

## Cosa fare

1. `cities.py`: per ogni risultato di `/cities` che è un'area
   (`administrative`), chiedere al Places i luoghi con quel nome dentro il
   suo `bbox`, e dare il punto di quello con **la stessa etichetta**.
   Senza un luogo con quell'etichetta resta il punto della geocodifica.
2. La regola dell'etichetta di un luogo del Places in un posto solo
   (`place_label`), usata da `/cities` e da `/nearby-cities`.
3. Se il Places non risponde, la ricerca risponde lo stesso col punto
   della geocodifica (quello di prima), **senza tenere la risposta**: la
   ricerca dopo richiede. Dopo il primo che non risponde non si chiedono
   gli altri: un'attesa sola. (Chiesto dal coordinatore; la prima
   stesura falliva con 503.)
4. Test senza rete, con risposte tagliate da quelle vere.

## Criteri di accettazione

- [x] `GET /cities?q=Tenna` e `GET /nearby-cities` da Caldonazzo danno per
      Tenna la stessa etichetta e lo stesso punto, e `route_store` impara
      una cella sola (test con l'app vera, `test_city_points.py`).
- [x] Un risultato che è già un luogo (`populated_place`) non chiede
      niente in più; un'area chiede una volta sola, e la risposta è tenuta
      un giorno con quella della ricerca.
- [x] Un'area il cui punto è già quello del suo luogo (Levico Terme) resta
      dov'è; un'area senza un luogo con la sua etichetta (Milano, che nel
      Places è «Milano» e nella geocodifica «Milan») tiene il punto di
      prima.
- [x] Se il Places non risponde la ricerca non fallisce: tornano i punti
      di prima, niente in cache, la chiave mai nel log; un'attesa sola
      anche con più aree; la ricerca dopo richiede e trova il paese. Se è
      la geocodifica a non rispondere, 503 come prima.
- [x] `/nearby-cities` non fa nessuna chiamata in più e non cambia punti.
- [x] `ruff`, `black` e tutti i test dell'API verdi.
- [x] Provato col servizio vero dal Mac: i sei posti di `/nearby-cities` da
      Caldonazzo hanno in `/cities` lo stesso punto (vedi «Esito»).

## File toccati

```
services/api/shaperoute_api/cities.py
services/api/shaperoute_api/nearby_cities.py   (docstring, `place_label`)
services/api/tests/test_city_points.py         (nuovo)
docs/tasks/TASK-249.md                         (nuovo)
docs/API.md
docs/DECISIONS.md
docs/STATUS.md
```

## Fuori scope

- L'app: non cambia. Chi ha già scelto un paese tiene sul telefono il
  punto di prima finché non lo sceglie di nuovo.
- `route_store.py`, il motore, il database.
- Le etichette (vedi «Emerso»).

## Esito

Col servizio vero, dal Mac, il 2026-10-06:

- Tenna, Calceranica al Lago, Levico Terme, Pergine Valsugana, Trento e
  Borgo Valsugana, i sei posti di `/nearby-cities` da Caldonazzo: in
  `/cities` stessa etichetta e stesso punto.
- **La ricerca vecchia e la nuova sull'elenco di `draw_examples`**
  (chiesto dal coordinatore): il primo risultato di ogni nome, prima e
  dopo.

  | Elenco | Nomi | Cambiano punto |
  | --- | --- | --- |
  | `--preset italy` | 52 | 0 |
  | `--preset featured` | 14 | 0 |
  | Rovereto, Borgo Valsugana, Pergine Valsugana, Vigolo Vattaro | 4 | 0 |
  | Caldonazzo | 1 | 1: 1127 m |
  | Tenna, Calceranica al Lago | 2 | 2: 650 m, 700 m |
  | Altri provati: Levico Terme, Riccione | 2 | 0 |
  | Altri provati: Riva del Garda, Jesolo | 2 | 2: 519 m, 1228 m |

  **Il catalogo non va ridisegnato**: nessuna delle 66 città cambia.
- **Sul telefono**: la chiave degli esempi di una città è il suo punto
  (`cityKey`, 4 decimali). Le città in evidenza e quelle dentro l'app non
  cambiano punto, quindi niente cambia per loro. Chi ha fra le recenti
  Caldonazzo, Tenna o Calceranica cercate per nome le tiene col punto di
  prima, e il server continua a servire i loro esempi tenuti da lì finché
  non scadono. Le zone del telefono si chiedono per area contenuta
  (`covering_path`), non per punto uguale: uno spostamento di 1 km resta
  dentro la zona del paese.
- **Limitare la regola ai villaggi non conviene**: non sposterebbe nessuna
  città del catalogo in meno (sono già zero), e lascerebbe con due punti
  i paesi come Riva del Garda (`place=town`), che `/nearby-cities` dà come
  uno dei quattro grandi. La regola resta per ogni area.
- Il costo: una ricerca nuova fa una richiesta in più al Places per ogni
  area fra i suoi risultati, una dopo l'altra, circa 0,35 s l'una:
  «Tenna» 0,6 s invece di 0,3, «Trento» 1,5 s, «Roma» (quattro aree)
  1,8 s. Poi la risposta è tenuta un giorno. Se il Places resta appeso,
  la ricerca aspetta una volta sola il suo tempo massimo (8 s,
  `places.TIMEOUT_S`, lo stesso che ha già la geocodifica) e risponde coi
  punti di prima.

## Dopo il merge (del coordinatore, con l'ok dell'utente)

- **Aggiornare il server**: solo l'API, nessuna migrazione, `route_engine`
  non cambia (gli esempi tenuti restano validi, niente `draw_examples`
  del catalogo).
- **Gli esempi**: quelli di Tenna e Calceranica disegnati dai punti di
  `/nearby-cities` sono già al punto giusto. Quelli disegnati dai punti
  vecchi di `/cities` (anche Caldonazzo) restano sul disco senza che
  nessuno li chieda più, e scadono da soli. Per non far aspettare il primo
  telefono: `draw_examples Tenna "Calceranica al Lago" Caldonazzo` dopo
  l'aggiornamento (passa da `/cities`, quindi dal punto nuovo).
- **Da guardare**: che la zona di Caldonazzo sul server contenga il cerchio
  di 5 km dal punto nuovo (1,1 km più a nord-ovest); se no la scarica da
  Overpass alla prima richiesta.

## Emerso

- **Le etichette possono ancora differire, i punti no.** Una frazione
  cercata per nome ha in `/cities` l'etichetta del suo comune («Ischia» di
  Pergine → «Pergine Valsugana, …», col punto della frazione), in
  `/nearby-cities` il suo nome. Un luogo col nome tradotto è «Munich» in
  `/cities` e «München» in `/nearby-cities`. Il punto è lo stesso, e gli
  esempi tenuti vanno per punto: è solo il testo. Seguito, da chiedere
  all'utente quale nome vuole leggere.
- Un'area col nome tradotto il cui confine non è legato al suo nodo
  resterebbe con due punti: non ne è stata trovata nessuna (le città
  grandi sono tutte legate).
- `themed.py` e `prefetch_zones.py` usano la stessa ricerca: anche i
  percorsi a tema e le zone scaricate prima partono dal punto del luogo.
