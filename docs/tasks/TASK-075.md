# TASK-075 — Il cuore è peggiorato? Confronto fra il motore di ieri e quello di oggi

**Stato**: Done
**Fase**: 4 · **Branch**: `fix/TASK-075-heart-regression`

## Obiettivo

Sapere, con i numeri, se il cuore da 10 km da Via della Villa (Caldonazzo)
è peggiorato fra il motore di ieri (`87304b0`, `main` a fine 2026-09-24) e
quello di oggi (`709f4f5`), e se sì correggerlo senza perdere il guadagno
di tempo di TASK-063.

Segnalazione dell'utente: «ho visto che la qualità del cuore si è un po'
abbassata nell'app. Ieri me lo aveva fatto meglio.»

## Contesto da leggere

- `docs/ROUTE_ENGINE.md` §2 (geometria delle forme)
- `docs/tasks/TASK-063.md` (il corridoio più veloce)

## Cosa fare

1. Rifare lo stesso cuore con il codice di `87304b0` e di `709f4f5`: stessa
   partenza, stessa cache, senza rete. Confrontare somiglianza, lunghezza,
   forma; un GPX per ciascuno.
2. Se oggi è peggio: trovare il merge responsabile e correggerlo, tenendo il
   tempo di TASK-063.
3. Se sono identici: scriverlo con i numeri e cercare la differenza fra ciò
   che vede l'app e la CLI (partenza, distanza, API vecchia).
4. Campioni in `samples/TASK-075_*` e pagina di giudizio sì / quasi / no.

## Criteri di accettazione

- [x] I due motori rifanno il cuore dalla stessa partenza e cache; il
      confronto (somiglianza, metri, punti, tempo) è scritto qui sotto.
- [x] Se c'è una regressione: merge responsabile trovato e corretto, con
      test deterministico; tempo di TASK-063 misurato prima e dopo.
      *Non c'è: nessun merge da trovare, nessun codice cambiato.*
- [x] Se non c'è: scritto con i numeri, e trovata o esclusa ogni altra
      causa elencata (partenza, distanza, API vecchia, cache).
- [x] GPX prima/dopo in `samples/TASK-075_*` e pagina di giudizio.

## File toccati

```
docs/tasks/TASK-075.md
docs/STATUS.md            (righe di TASK-075)
docs/DECISIONS.md         (righe di TASK-075, se serve una decisione)
samples/TASK-075_*
samples/LOG.md            (righe di TASK-075)
```

Consentiti se serve una correzione: `services/route-engine/route_engine/network.py`,
`optimizer.py` (solo la parte delle forme), i loro test, `docs/ROUTE_ENGINE.md`.

## Fuori scope

- `words.py` e l'instradamento delle parole in `optimizer.py` (TASK-071).
- `apps/mobile`, `packages/shared-types`, `services/api` (TASK-073).
- `image_outline.py`, `letters.json`, `shapes/`.
- La prova sull'iPhone di TASK-074 (PR #86).

## Esito

**Nessuna regressione nel motore.** Il cuore di ieri e quello di oggi sono
lo stesso percorso, punto per punto. Quello che cambia il cuore è la
partenza: 25–100 m bastano a portare la somiglianza da 0,73 a 0,92, e
l'app parte dal GPS del telefono, non dall'indirizzo.

### Come è stato misurato

- Partenza: Via della Villa, Caldonazzo, (45.9934, 11.2580), dai nodi con
  quel nome nel grafo in cache. Cuore, 10 000 m, corsa.
- Cache: copia su `D:/t075/cache` dei 14 grafi in cache che coprono
  Caldonazzo (più il file dei nomi), così nessun ritaglio va su C:. Nessun
  grafo che copre la zona è più recente di ieri sera (l'ultimo è del
  2026-09-24 20:49): i dati sono gli stessi per i due giorni.
- Codice: `git archive` di `services/route-engine` a `87304b0` e a
  `709f4f5`, lanciati con il venv dell'API e `PYTHONPATH` sulla copia
  (verificato con `route_engine.__file__`).
- Due strade: la CLI (`python -m route_engine`) e `plan_route`, la funzione
  che chiama l'API, con un caricatore che ritaglia in memoria come
  `ZoneGraphs`.

### Numeri

Dalla via, CLI:

| | ieri `87304b0` | oggi `709f4f5` |
|---|---|---|
| Somiglianza | 0,86 | 0,86 |
| Su strada | 11 842 m | 11 842 m |
| Punti | 467 | 467 |
| md5 dei `<trkpt>` | `8a744ec5…` | `8a744ec5…` |
| Tempo | 41 s (con il primo ritaglio) | 21 s |

Nove partenze attorno alla via, `plan_route`, i due motori in parallelo:
**9 percorsi su 9 identici** (stesso md5 dei punti). Tempo medio 21,4 s
ieri, 16,9 s oggi: il guadagno di TASK-063 c'è.

| Partenza | Somiglianza | Su strada |
|---|---|---|
| Via della Villa | 0,86 | 11,8 km |
| 25 m nord | 0,82 | 9,7 km |
| 25 m sud | 0,85 | 9,2 km |
| 25 m est | 0,92 | 11,0 km |
| 25 m ovest | 0,86 | 11,7 km |
| 70 m nord-est | 0,73 | 9,7 km |
| 70 m sud-ovest | 0,92 | 9,3 km |
| 100 m nord | 0,91 | 9,4 km |
| 100 m est | 0,81 | 11,1 km |

### Le altre cause, escluse

- **API**: da ieri cambiano solo `along`, la parola e il precaricamento
  del modello; nulla che tocchi la geometria. L'API accesa (dalle 19:21
  del 25) gira dal checkout principale a `dc0b951`, con lo stesso motore
  di oggi per le forme. Nessuna API vecchia da un altro worktree.
- **API contro CLI**: tutte e due ritagliano lo stesso grafo di zona (il
  più piccolo in cache che copre l'area) e chiamano `plan_shape` con la
  stessa inclinazione massima.
- **App**: la richiesta parte come ieri (posizione, forma, distanza);
  cambiano l'interruttore della partenza, spostato in un componente, e il
  campo della parola.
- **Cache**: vedi sopra, nessun grafo nuovo sulla zona.

Non si sa da dove l'utente ha chiesto il cuore ieri: l'API scrive le
richieste solo sulla sua console, e nessun GPX esportato è sul PC.

### Campioni

`samples/TASK-075_heart_10km_caldonazzo_{yesterday,today,n25,s25,e25,w25,ne70,sw70,n100,e100}_v1.gpx`,
righe in `samples/LOG.md`. Pagina di giudizio (sì / quasi / no, e quale
somiglia a quello di ieri nell'app):
https://claude.ai/artifact/2RWMt1kAbYKoT3RTC5XKDm

### Da decidere (non fatto qui)

Quanto il cuore dipende da pochi metri di partenza è il problema vero, ed è
una scelta di prodotto: il motore potrebbe provare alcune partenze vicine
(entro 50–100 m) e tenere il cuore migliore, oppure agganciare la partenza
al nodo più vicino perché lo stesso posto dia sempre lo stesso cuore. Lo
decide il coordinatore con l'utente, in un task nuovo.
