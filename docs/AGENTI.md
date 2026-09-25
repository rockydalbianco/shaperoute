# AGENTI — Chi fa cosa, e cosa viene dopo

> L'albero dei lavori degli agenti in parallelo. **Lo aggiorna solo il
> coordinatore** (la sessione «Coordinatore»); gli altri lo leggono.
> Dopo il clear di fine task, un agente trova qui la sua riga: il prossimo
> task, da cosa dipende e quali file non può toccare.

**Ultimo aggiornamento**: 2026-09-25 · `main` = `3cc6064`

## Come si usa

1. Trova la tua sessione qui sotto: **Adesso** è il task in corso,
   **Dopo** la coda, in ordine.
2. Un task della coda parte solo quando le sue **dipendenze** sono in `main`.
   Se non lo sono, avvisa il coordinatore e aspetta.
3. Il messaggio di partenza lo manda il coordinatore, completo (numero,
   ADR, file, confini). Se non arriva, chiedilo: non partire da solo.
4. Numeri di task e di ADR: solo dal coordinatore (`CLAUDE.md`).

## L'albero

```
Indicazioni
  ├─ Adesso  TASK-049  Navigazione GPS a svolte, voce e vibrazione   PR #65
  ├─ Dopo    TASK-060  `along` nell'API e nei tipi condivisi         dopo 049 (e 053 ✓)
  └─ Dopo    TASK-061  `along` nella navigazione (schermo e voce)    dopo 060

Interfaccia Grafica
  ├─ Adesso  TASK-058  Barra di caricamento anche per mappa e API
  └─ Dopo    TASK-057  Campo per scrivere la parola da disegnare     dopo 059 e 049

Programmatore Lettere
  ├─ Adesso  TASK-059  Alfabeto completo, A–Z a tratto singolo
  └─ Dopo    TASK-062  Dichiarare `numpy` nel route-engine           dopo 059

Da assegnare (servono l'ok dell'utente sul cosa)
  ├─ Motore lento oltre i 10 km: `PRODUCT.md` chiede ≤ 30 s
  ├─ Far scegliere fra più percorsi alternativi (la ricerca li ha già)
  └─ Misurare la prima parola dopo il precaricamento (TASK-052), a PC libero
```

## I task, uno per uno

| Task | Titolo | Chi | Stato | Dipende da | ADR |
|---|---|---|---|---|---|
| TASK-049 | Navigazione GPS a svolte, voce e vibrazione | Indicazioni | PR #65 | 048 ✓ | 0052 |
| TASK-057 | Campo per la parola da disegnare, nell'app | Interfaccia Grafica | in coda | 059, 049 | 0053 |
| TASK-058 | Barra di caricamento per mappa e connessione API | Interfaccia Grafica | in corso | 055 ✓ | 0055 |
| TASK-059 | Alfabeto completo, A–Z a tratto singolo | Programmatore Lettere | in corso | 056 ✓ | 0056 |
| TASK-060 | `along` nell'API e in `shared-types` | Indicazioni | in coda | 049, 053 ✓ | 0057 |
| TASK-061 | `along` nella navigazione | Indicazioni | in coda | 060 | 0058 |
| TASK-062 | Dichiarare `numpy` in `pyproject.toml` | Programmatore Lettere | in coda | 059 | — |

Perché quest'ordine:

- **057 dopo 059**: il campo arriva con tutte le lettere, non con quattro.
- **057 dopo 049**: 049 tiene `App.tsx`, `RoutePanel.tsx` e le schermate.
- **060 dopo 049**: `along` passa dall'API (`jobs.py`, `schemas.py`,
  `shared-types`) e 049 cambia il contratto con `expo-speech` e le
  indicazioni; uno alla volta.
- **062 dopo 059**: tutti e due toccano `services/route-engine/`.

## File occupati adesso

| File | Di chi |
|---|---|
| `apps/mobile/App.tsx`, `src/route/RoutePanel.tsx`, `src/screens/*`, `src/map/*`, `src/navigation/*`, `package.json`, `package-lock.json` | TASK-049 |
| `apps/mobile/src/route/LoadingBar.tsx`, `progress.ts` (+ test) | TASK-058 |
| `route_engine/letters.json`, `words.py`, `tests/test_words.py`, `packages/shared-types` (LETTERS, `contract.json`), `schemas.py` (descrizione di `word`) | TASK-059 |
| `docs/STATUS.md`, `docs/DECISIONS.md` | tutti, ognuno solo le sue righe |
| `docs/AGENTI.md`, `CLAUDE.md` | coordinatore |

## Numeri

- Task: presi fino a **TASK-062**. Il prossimo libero è **TASK-063**.
- ADR: presi fino a **ADR-0058**. Il prossimo libero è **ADR-0059**.

## Fatto in questa tornata (2026-09-24/25)

TASK-045, 046, 047, 048, 050, 051, 052, 053, 054, 055, 056; regole in
`CLAUDE.md` (#50, #57, #63).
