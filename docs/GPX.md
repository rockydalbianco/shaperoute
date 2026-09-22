# GPX — Export della traccia

> **Stub.** Si scrive con TASK-013.
> Vedi ADR-0006 in `DECISIONS.md`: documentare decisioni non ancora prese
> produce testo che sembra autorevole ed è inventato.

## Domande a cui questo documento dovrà rispondere

- Quale struttura GPX: track singolo, waypoint, route?
- Si includono quote? Da quale sorgente?
- Metadati: nome del percorso, forma, distanza, data.
- Compatibilità verificata con Garmin, Strava, Komoot.
- Nomenclatura dei file esportati.

## Cosa è già deciso

- Formato GPX per il MVP; altri formati eventualmente dopo.
- Il modulo vive in `services/export/`.
- I campioni generati si versionano in `samples/` (ADR-0014).
