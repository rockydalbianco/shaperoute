# CLAUDE.md — Regole permanenti

> Questo file viene caricato in **ogni** sessione: deve restare corto.
> Tutto ciò che serve solo a volte va in `docs/`, non qui.
> Se una regola vale per un solo task, **non** appartiene a questo file.

## Il progetto in tre righe

ShapeRoute genera percorsi reali (running, poi walking e cycling) che sulla
mappa disegnano una forma richiesta dall'utente, a partire da posizione,
distanza e forma. Output: percorso visualizzato + file GPX.

**Principio non negoziabile: l'AI interpreta la richiesta, il Route Engine
decide il percorso.** L'AI non produce mai coordinate, tracce o geometrie.

## Prima di iniziare qualsiasi task

1. Leggi `docs/STATUS.md` — dice a che punto siamo davvero.
2. Leggi il file `docs/tasks/TASK-XXX.md` del task assegnato.
3. Leggi **solo** i documenti che `docs/INDEX.md` associa a quel task.

Non leggere l'intera cartella `docs/`. Non leggere codice di servizi
che il task non tocca.

## Regole di lavoro

- Un task = un branch = una Pull Request. Mai commit diretti su `main`.
- Branch: `feat/TASK-012-shape-projection`, `fix/...`, `docs/...`, `chore/...`.
- Resta dentro i confini del task. Se serve altro, **fermati e segnalalo**:
  non allargare lo scope di tua iniziativa.
- Se una scelta tecnica non è già in `docs/DECISIONS.md`, proponila e
  aspetta conferma invece di deciderla in silenzio.
- Niente dipendenze nuove senza chiederlo prima.
- Nessun segreto nel repository: solo `.env` locale, aggiornando
  `.env.example` quando serve una variabile nuova.
- Codice senza test deterministici non è considerato finito
  (vedi `docs/TESTING.md`).

## A fine task, sempre

- [ ] Test verdi in locale.
- [ ] `docs/STATUS.md` aggiornato (cosa è fatto, cosa è il prossimo passo).
- [ ] Se è stata presa una decisione tecnica: nuova voce in `docs/DECISIONS.md`.
- [ ] Se il comportamento è cambiato: documento di dominio aggiornato.
- [ ] Task file spostato a stato `Done` con una riga di esito.

## Convenzioni

- **Lingua**: documentazione in italiano; codice, nomi, commenti, commit e
  PR in inglese.
- **Commit**: `TASK-012: add shape projection to WGS84` — imperativo,
  una riga, prefisso del task.
- **Python**: 3.11+, type hints obbligatori, `ruff` + `black`, `pytest`.
- **TypeScript**: strict mode, niente `any` impliciti.
- **Unità**: distanze in **metri**, angoli in **gradi**, coordinate come
  `(lat, lon)` in quest'ordine, sempre WGS84 (EPSG:4326).
- Il codice geometrico lavora in metri su piano proiettato, mai in gradi.

## Confini dei moduli

`services/route-engine/` non importa nulla da `services/api/` né da
`services/ai/`. È una libreria pura: dati in, geometria fuori.
Deve restare eseguibile da riga di comando senza server, senza rete e
senza chiavi API.

## Economia di contesto

- Preferisci leggere un file preciso invece di esplorare a tappeto.
- Non incollare output lunghi nella chat: scrivili su file.
- Non riassumere ciò che hai appena fatto se è già scritto in `STATUS.md`.
- Se il contesto si sta riempiendo, chiudi il task e apri il successivo
  invece di continuare nella stessa sessione.
