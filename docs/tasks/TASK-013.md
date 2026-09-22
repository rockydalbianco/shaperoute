# TASK-013 — Export GPX minimo

**Stato**: Todo
**Fase**: 1 · **Branch**: `feat/TASK-013-gpx-export`

## Obiettivo

La CLI produce un file GPX apribile in un visualizzatore. **È il primo
momento in cui si vede qualcosa.**

## Contesto da leggere

- `docs/ROUTE_ENGINE.md` §7
- `docs/GPX.md` (stub: va riempito in questo task)

## Cosa fare

1. Scrivere la funzione che trasforma una lista di `(lat, lon)` in GPX 1.1
   valido: un `<trk>` con un `<trkseg>` e i `<trkpt>`.
2. Metadati: nome del percorso (forma + distanza + data), autore, data.
3. Collegare `--out` della CLI all'export.
4. Riempire `docs/GPX.md` con le decisioni prese davvero, sostituendo le
   domande dello stub.
5. Test: XML valido, numero di punti corretto, primo e ultimo punto
   coincidono, coordinate nel formato atteso.
6. **Generare i campioni e aprirli** in gpx.studio: heart e circle sulle
   tre zone. Salvarli in `samples/` con la nomenclatura di
   `samples/README.md` e annotarli in `samples/LOG.md`.

## Criteri di accettazione

- [ ] Il GPX si apre senza errori in gpx.studio e in geojson.io.
- [ ] La forma teorica si riconosce a occhio sulla mappa.
- [ ] La distanza mostrata dal visualizzatore è vicina a quella richiesta.
- [ ] `docs/GPX.md` non è più uno stub.
- [ ] I campioni sono in `samples/` e hanno la loro riga in `samples/LOG.md`.
- [ ] `pytest` verde, `ruff` e `black` puliti.
- [ ] `docs/STATUS.md` aggiornato.

## File toccati

```
services/route-engine/route_engine/export_gpx.py
services/route-engine/tests/test_export_gpx.py
samples/TASK-013_*.gpx
samples/LOG.md
docs/GPX.md
docs/STATUS.md
```

## Fuori scope

- Rete stradale: qui si esporta la forma **teorica**, che passa sopra case
  e prati. È voluto e va detto anche nella PR, perché guardandolo sembra
  un errore.
- Quote altimetriche.
- Compatibilità con Garmin e Strava: si verifica quando i percorsi saranno
  reali, non ora.

## Perché questo task viene prima del routing

Dopo TASK-012 esistono coordinate reali ma nessun modo di guardarle.
Con l'export si chiude il ciclo **genera → guarda → correggi** che serve
per tutto il resto della fase 1. Un'ora spesa qui fa risparmiare giorni su
TASK-014 e TASK-015.

## Esito
