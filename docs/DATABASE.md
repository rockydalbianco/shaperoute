# DATABASE — Persistenza

> **Stub.** Si scrive con la fase 4.
> Vedi ADR-0006 in `DECISIONS.md`: documentare decisioni non ancora prese
> produce testo che sembra autorevole ed è inventato.

## Domande a cui questo documento dovrà rispondere

- Schema di utenti e percorsi salvati.
- Come si memorizza una traccia: PostGIS o GPX su storage?
- Migrazioni e versionamento dello schema.
- Backup e privacy dei dati di posizione.

## Cosa è già deciso

- Ipotesi: PostgreSQL + PostGIS (ADR-0013, aperta).
- Non serve prima di avere account e percorsi salvati.
