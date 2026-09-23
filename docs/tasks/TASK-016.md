# TASK-016 — Validazione: distanza, ripercorrenza, percorribilità

**Stato**: Done
**Fase**: 1 · **Branch**: `feat/TASK-016-validation`

## Obiettivo

Ogni percorso esce con un controllo esplicito di cosa non va: ripercorre
strade già fatte, passa su scale o strade trafficate, sbaglia distanza o
forma. La CLI lo dice in chiaro e le misure dei 12 casi lo mostrano.

## Contesto da leggere

- `docs/ROUTE_ENGINE.md` §6 (validazione) e §4 (potatura degli speroni)
- `docs/DECISIONS.md` ADR-0025
- `docs/MAPS.md`, "Cosa si è misurato" (difetto delle punte)
- `docs/TESTING.md`, paragrafo "Fixture"

## Cosa c'è già

Da TASK-015 il motore segnala distanza oltre ±10% e somiglianza sotto 0,90
con un warning, e rifiuta (forma non disponibile) sotto 0,60 o oltre ±2 km.
Mancano la ripercorrenza, la percorribilità e un punto unico dove i
controlli stanno insieme.

## Cosa fare

1. **Confermato dall'utente il 2026-09-23**: soglie e categorie come
   proposte qui sotto, e il passo 6 (togliere le punte) si fa. Valori
   iniziali, da tarare sui campioni:
   - **ripercorrenza esatta**: quota della lunghezza su archi già percorsi,
     warning sopra il **5%**;
   - **ripercorrenza visiva**: quota della lunghezza che corre entro
     **20 m** da un altro tratto del percorso lontano più di 200 m lungo il
     percorso stesso (andata e ritorno su marciapiede e strada, le "punte");
     warning sopra il **10%**;
   - **percorribilità**, solo con i tag già in cache (`highway`, `tunnel`),
     senza riscaricare: warning con i metri su **scale** (`steps`), su
     **strade principali** (`trunk`, `primary` e i loro `_link`) e in
     **galleria**. Sterrati, sentieri difficili e marciapiedi richiedono
     `surface`, `sac_scale` e `sidewalk`: fuori scope, vedi sotto.
2. **Modulo `validation.py`**: una funzione che, dato il percorso, la
   richiesta e il grafo, restituisce l'elenco dei problemi (codice, misura,
   soglia, messaggio). `plan_route` la chiama e mette i messaggi in
   `RouteResult.warnings`; `RouteResult` non cambia forma.
   `NetworkRoute` torna a portare i nodi del percorso, che servono per
   leggere i tag degli archi.
3. **Chiusura**: il percorso finisce dove comincia, e la partenza è entro
   500 m dal punto richiesto (ADR-0025); altrimenti è un errore del motore,
   non un warning: un test lo garantisce.
4. **CLI**: i warning escono già; `tests/measure_optimizer.py` aggiunge le
   colonne di ripercorrenza e percorribilità.
5. **Misure**: i 12 casi più Milano, con i numeri in `MAPS.md`. Non servono
   campioni nuovi se i percorsi non cambiano.
6. **Confermato**: togliere le punte di andata e ritorno
   su strade parallele che non portano a una punta della forma, con la
   stessa regola della ripercorrenza visiva. Cambia lo snapping, quindi
   servono campioni `TASK-016_*_v1` giudicati a occhio.
7. **Test** deterministici su grafi sintetici: arco ripercorso, andata e
   ritorno su due strade parallele a 15 m, scala e strada principale nel
   percorso, percorso non chiuso rifiutato.
8. **Documentazione**: `ROUTE_ENGINE.md` §6 allineata ad ADR-0025 (niente
   più "passa per il punto di partenza", ±2 km), `MAPS.md`, `STATUS.md`;
   ADR per soglie e categorie scelte.

## Criteri di accettazione

Stato sui campioni `TASK-016_*_v1` (numeri in `MAPS.md`).

- [x] Sui 12 casi più Milano la CLI stampa ripercorrenza esatta e visiva e
      i metri su scale, strade principali e gallerie (riga `checks`).
- [x] I warning compaiono solo sopra soglia, e ogni warning dice misura e
      soglia (test in `tests/test_validation.py`).
- [x] Un percorso non chiuso, o con la partenza a più di 500 m, non esce
      mai dal motore (`check_closed`, test).
- [x] Le punte sul cerchio da 15 km a Trento spariscono a occhio, senza
      peggiorare gli altri casi: campioni giudicati dall'utente il
      2026-09-23, giudizi d'accordo con la metrica. Il cuore da 15 km a
      Trento scende da 0,94 a 0,89 (ADR-0026, conseguenza) ed è accettato.
- [x] `pytest -m "not network"` verde e offline; `ruff` e `black` puliti.
- [x] `ROUTE_ENGINE.md` §4 e §6, `MAPS.md` e `docs/STATUS.md` aggiornati;
      ADR-0026.

Differenze dal piano: la ripercorrenza visiva usa 60 m di distanza lungo il
percorso, non 200 (a 200 le punte corte sfuggivano); la ricerca passa da
16 a 20 tracciamenti.

## File toccati

```
services/route-engine/route_engine/validation.py
services/route-engine/route_engine/optimizer.py
services/route-engine/route_engine/network.py
services/route-engine/tests/test_validation.py
services/route-engine/tests/measure_optimizer.py
services/route-engine/route_engine/__main__.py
services/route-engine/tests/test_export_gpx.py
samples/TASK-016_*.gpx
samples/LOG.md
docs/ROUTE_ENGINE.md
docs/MAPS.md
docs/DECISIONS.md
docs/STATUS.md
```

## Fuori scope

- Tag `surface`, `sac_scale`, `sidewalk`: servono un nuovo download dei
  grafi di zona e una scelta su cosa è adatto alla corsa. Si annota, non si
  fa.
- Evitare scale e strade trafficate nella ricerca (costo sugli archi): qui
  si misura e si avvisa soltanto.
- Cambiare metrica, soglie o ricerca di TASK-015.
- Attività diverse dalla corsa (fase 4).

## Esito

Ogni percorso esce con la riga `checks` (ripercorso esatto e a vista,
metri su scale, strade principali e gallerie) e i warning sopra soglia; un
percorso non chiuso o con la partenza oltre 500 m non esce dal motore. Le
punte di andata e ritorno su strade parallele sono tolte: ripercorso a
vista sotto il 10% in tutti i casi. Milano e Trento si riconoscono, Levico
quasi, Valsugana sospesa (ADR-0026).
