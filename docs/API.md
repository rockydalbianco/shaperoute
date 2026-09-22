# API — Contratti REST

> **Stub.** Si scrive con TASK-022.
> Vedi ADR-0006 in `DECISIONS.md`: documentare decisioni non ancora prese
> produce testo che sembra autorevole ed è inventato.

## Domande a cui questo documento dovrà rispondere

- Endpoint esposti e loro forma.
- Schemi Pydantic di richiesta e risposta.
- Gestione degli errori e dei warning del route-engine.
- Timeout: la generazione può durare decine di secondi.
- Versionamento e autenticazione.

## Cosa è già deciso

- FastAPI + Pydantic.
- `RouteRequest` e `RouteResult` come da `ARCHITECTURE.md` §3.
- L'API orchestra, non calcola.
