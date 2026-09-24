# TASK-052 — Precaricare il modello dell'AI all'avvio dell'API

**Stato**: Done
**Fase**: 4 · **Branch**: `feat/TASK-052-preload-model`

## Obiettivo

La prima parola letta dall'AI dopo l'avvio dell'API risponde in secondi,
non nei 40–49 s di caricamento del modello dal disco (`AI.md`, «Domande
ancora aperte»).

## Contesto da leggere

- `docs/AI.md`, «Modello» e «Domande ancora aperte»
- `services/ai/shaperoute_ai/ollama.py`, `reading.py`
- `services/api/shaperoute_api/app.py` (`lifespan`)

## Cosa fare

1. `OllamaModel.preload()`: chiedere a Ollama di caricare il modello
   (`/api/generate` senza prompt), con lo stesso `KEEP_ALIVE`.
2. `ShapeReader.warm_up()`: precarica se il modello lo sa fare, e non
   solleva mai: Ollama spento o modello mancante non fermano niente.
3. All'avvio dell'API, in un thread in background, con una riga di log:
   l'API risponde subito.
4. Test senza Ollama (modelli e `post` finti).

## Criteri di accettazione

- [x] `ruff`, `black`, `pytest` di `services/ai` e `services/api` puliti.
- [x] L'API risponde mentre il modello si carica (test).
- [x] L'API parte e risponde con Ollama spento o il modello mancante (test).
- [ ] La prima parola dopo l'avvio misurata su questo PC: vedi Esito.
- [x] Nuovo ADR; `docs/AI.md` e `docs/STATUS.md` aggiornati.

## File toccati

```
services/ai/shaperoute_ai/ollama.py
services/ai/shaperoute_ai/reading.py
services/ai/tests/test_ollama.py
services/ai/tests/test_reading.py
services/api/shaperoute_api/app.py
services/api/tests/test_preload.py                 (nuovo)
docs/AI.md, docs/DECISIONS.md, docs/STATUS.md
docs/tasks/TASK-052.md                             (nuovo)
```

## Fuori scope

- Un'opzione per spegnere il precaricamento: vorrebbe
  `services/api/shaperoute_api/__main__.py`, non assegnato a questo task.
- Tenere il modello in memoria per sempre (`keep_alive: -1`): vedi
  ADR-0049.

## Esito

Fatto il 2026-09-24 (ADR-0049): all'avvio l'API chiede a Ollama di
caricare il modello, in background; se non ci riesce lo scrive nel log e
va avanti. Test senza Ollama: AI 32, API 78.

**Misura non fatta**: stasera, con altre sessioni aperte, il PC aveva
1,9 GB liberi su 6,9 e Ollama non ha caricato i 3,2 GB del modello entro
i 90 s (`TIMEOUT_S`). Resta da misurare con il PC scarico: avvio dell'API,
riga «AI model loaded in … s» nel log, poi una parola dall'app.
