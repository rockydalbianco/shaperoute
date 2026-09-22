# AI — Interpretazione del linguaggio naturale

> **Stub.** Si scrive con TASK-030.
> Vedi ADR-0006 in `DECISIONS.md`: documentare decisioni non ancora prese
> produce testo che sembra autorevole ed è inventato.

## Domande a cui questo documento dovrà rispondere

- Quale modello e quale provider.
- Prompt e formato di output vincolato.
- Cosa succede se la richiesta è ambigua o impossibile.
- Costi per richiesta e strategia di cache.
- Comportamento quando il provider non risponde.

## Cosa è già deciso

- L'AI produce solo un `RouteRequest` (ADR-0001).
- Dietro un'interfaccia astratta, provider sostituibile.
- Il prodotto deve funzionare anche senza AI.
