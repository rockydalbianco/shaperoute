# TASK-014 — Snapping alla rete reale con OSMnx

**Stato**: Done
**Fase**: 1 · **Branch**: `feat/TASK-014-network-snapping`

## Obiettivo

`python -m route_engine --shape heart --distance 5000 --start ... --out ...`
produce un GPX che segue **strade e sentieri reali**, chiuso sul punto di
partenza, e dice quanto è lungo davvero e dove la rete non basta.

## Contesto da leggere

- `docs/ROUTE_ENGINE.md` §4
- `docs/DECISIONS.md` ADR-0008, ADR-0020
- `docs/TESTING.md`, paragrafi "Non deterministico, va isolato" e "Fixture"
- `docs/MAPS.md` (stub: va riempito in questo task)

## Cosa fare

1. **Dipendenze: fermarsi e chiedere.** Proporre l'elenco esatto con le
   versioni: `osmnx` e ciò che serve a `nearest_nodes` (scikit-learn per
   grafi non proiettati, oppure scipy dopo `project_graph`). Installare solo
   dopo conferma. Vanno nelle dipendenze runtime del pacchetto, non in `dev`.
2. **Interfaccia del grafo** in `network.py` (ADR-0020): una funzione o un
   protocollo che, data un'area, restituisce il grafo. Due implementazioni:
   - da OSMnx, `network_type="walk"`, con cache su disco in `data/cache/`
     (già ignorata): la stessa area non si scarica due volte;
   - da file, per i test.
   Nessun altro modulo chiama OSMnx direttamente.
3. **Area da scaricare**: rettangolo che contiene la forma teorica
   proiettata, allargato di un margine (valore iniziale: 500 m per lato, da
   annotare in `MAPS.md`).
4. **Snapping** come in §4: nodo più vicino per ogni punto della forma,
   rimozione dei nodi duplicati consecutivi. Il primo nodo è il più vicino
   al punto di partenza.
5. **Routing**: percorso più breve fra nodi consecutivi, segmenti
   concatenati, l'ultimo torna al primo.
6. **Penalità sugli archi già percorsi**: il peso di un arco usato viene
   moltiplicato per un fattore fisso (valore iniziale 2.0, parametro con
   nome). Si tara a occhio sui campioni, non con un ottimizzatore.
7. **Warning** raccolti in una lista di stringhe (diventeranno
   `RouteResult.warnings`):
   - distanza media punto-forma → nodo sopra una soglia (valore iniziale
     150 m, da tarare): rete troppo rada;
   - nodo di partenza a più di quella soglia dal punto dell'utente.
8. **CLI**: con `--out` il GPX contiene il percorso sulla rete. Stampa
   distanza reale, distanza target e warning. Se il grafo non è in cache lo
   scarica e lo dice; se è in cache gira offline.
9. **Test** (ADR-0020):
   - unità su un grafo sintetico a griglia costruito nel test, dove il
     risultato atteso si calcola a mano: snapping, deduplica, chiusura,
     penalità che evita un arco già usato quando esiste un'alternativa,
     warning di rete rada;
   - un grafo reale piccolo (≈ 1 km² attorno a Levico, < 1 MB) versionato
     in `tests/fixtures/`, con lo script che lo rigenera;
   - un test di integrazione vero marcato `@pytest.mark.network`, escluso
     da CI.
10. **Documentazione**:
    - riempire `docs/MAPS.md` con ciò che è stato deciso davvero;
    - `ROUTE_ENGINE.md` §4: area = bbox + margine, non raggio = distanza;
    - `TESTING.md`: si versionano fixture piccole, non i grafi di zona.
11. **Campioni**: heart e circle, 5 e 15 km, sulle tre zone di `TESTING.md`
    (12 file `TASK-014_*_v1.gpx`), aperti in gpx.studio e annotati in
    `samples/LOG.md` con distanza reale / target e giudizio.

## Criteri di accettazione

- [ ] Il GPX segue la rete: nessun tratto attraversa edifici o campi (a
      occhio, sui 12 campioni).
- [ ] Il percorso è chiuso e inizia dal nodo più vicino alla partenza.
- [ ] La distanza reale è stampata dalla CLI e annotata nel LOG per tutti i
      campioni.
- [ ] Con la penalità, i tratti ripercorsi sono visibilmente meno che senza
      (confronto su almeno un campione, annotato nel LOG).
- [ ] In una zona a rete rada compare il warning, e il valore della soglia
      usata è annotato in `MAPS.md`.
- [ ] Rieseguire lo stesso comando non riscarica il grafo.
- [ ] `pytest -m "not network"` verde e offline; `ruff` e `black` puliti.
- [ ] `docs/MAPS.md` non è più uno stub; §4 e `TESTING.md` aggiornati.
- [ ] `docs/STATUS.md` aggiornato.

## File toccati

```
services/route-engine/pyproject.toml
services/route-engine/route_engine/network.py
services/route-engine/route_engine/__main__.py
services/route-engine/tests/test_network.py
services/route-engine/tests/fixtures/
docs/MAPS.md
docs/ROUTE_ENGINE.md
docs/TESTING.md
samples/TASK-014_*.gpx
samples/LOG.md
docs/STATUS.md
```

## Fuori scope

- Metrica di somiglianza e ottimizzazione di scala, rotazione e fase
  (TASK-015). Qui i parametri restano quelli di TASK-013: scala iniziale,
  rotazione 0, fase 0. Che la distanza reale superi il target è atteso.
- `RouteResult` completo: senza metrica non c'è `similarity` (TASK-015).
- Validazione di percorribilità e misura della ripercorrenza (TASK-016).
- Filtri per attività diversi da `walk`, motori di produzione (ADR-0009).
- Tiles e mappa dell'app (fase 2).

## Esito

La CLI produce un GPX chiuso che segue strade e sentieri reali (OSMnx,
cache offline, potatura degli speroni, ADR-0021) e stampa distanza reale,
target e warning. Distanza su strada ancora 2,2–3,8× il target; la penalità
2.0 da sola non riduce le ripercorrenze in modo visibile (0–3%, annotato in
`MAPS.md`), lo fa la potatura. Seguire il contorno invece dei waypoint
passa a TASK-017.
