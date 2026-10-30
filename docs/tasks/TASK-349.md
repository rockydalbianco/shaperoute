# TASK-349 — Più tempo al job `api` della CI

**Stato**: Done — chiuso nella stessa PR
**Fase**: 4 · **Branch**: `chore/TASK-349-api-ci-time` · numero dal
Coordinatore (2026-10-30)

## Obiettivo

Il job `api` non deve più fermarsi a metà quando più PR girano insieme.

## Contesto

Il limite è di 25 minuti (TASK-248). Con 6–7 PR aperte il job ci arriva e
GitHub lo cancella senza che un test sia fallito: è successo alla #632 il
2026-10-29 e alla #655 il 2026-10-30 (cancellato a 25 minuti).
Da solo il job dura 17–22 minuti.

## File toccati

```
.github/workflows/ci.yml
docs/tasks/TASK-349.md
docs/STATUS.md
```

## Criteri di accettazione

- [x] `timeout-minutes` del job `api` a 40; gli altri job invariati.

## Fuori scope

Rendere più veloci i test dell'API: è un altro lavoro.

## Esito

Limite a 40 minuti. Un test appeso resta fermato dal limite, solo più tardi:
TASK-248 stampa comunque dove si è fermato.
