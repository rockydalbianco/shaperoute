# AGENTI — Chi fa cosa, e cosa viene dopo

> L'albero dei lavori degli agenti in parallelo. **Lo aggiorna solo il
> coordinatore** (la sessione «Coordinatore»); gli altri lo leggono.
> Dopo il clear di fine task, un agente trova qui la sua riga: il prossimo
> task, da cosa dipende e quali file non può toccare.

**Ultimo aggiornamento**: 2026-09-25 · `main` = `f3ffc7b`

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
  ├─ Adesso  TASK-063  Dove va il tempo del motore oltre i 10 km     nessuna
  ├─ Dopo    TASK-060  `along` nell'API e nei tipi condivisi         dopo 059 (e 053 ✓)
  └─ Dopo    TASK-061  `along` nella navigazione (schermo e voce)    dopo 060 (e 049 ✓)

Interfaccia Grafica
  ├─ Attesa  TASK-058  Barre di caricamento: mappa, AI, attesa API   PR #72, merge dell'utente
  ├─ Adesso  TASK-066  L'app non si blocca senza `directions`        nessuna
  └─ Dopo    TASK-057  Campo per scrivere la parola da disegnare     dopo 059 e 058

Programmatore Lettere
  ├─ Attesa  TASK-059  Alfabeto completo, A–Z a tratto singolo       PR #71, giudizio dato
  ├─ Dopo    TASK-064  Animali candidati: farfalla, uccello, cane,   dopo 059
  │                    lumaca (contorni e campioni, giudizio utente)
  ├─ Dopo    TASK-067  Lettere unite anche dall'alto, scala per      dopo 064 e 063
  │                    lettera
  └─ Dopo    TASK-065  Gli animali approvati nel catalogo            dopo 064, 057

Da assegnare (servono l'ok dell'utente sul cosa)
  ├─ Far scegliere fra più percorsi alternativi (la ricerca li ha già)
  └─ Misurare la prima parola dopo il precaricamento (TASK-052), a PC libero
```

## I task, uno per uno

| Task | Titolo | Chi | Stato | Dipende da | ADR |
|---|---|---|---|---|---|
| TASK-057 | Campo per la parola da disegnare, nell'app | Interfaccia Grafica | in coda | 059, 058 | 0053 |
| TASK-058 | Barre di caricamento: mappa, «The AI is reading it…», attesa API | Interfaccia Grafica | PR #72 | 055 ✓, 049 ✓ | 0055 |
| TASK-059 | Alfabeto completo, A–Z a tratto singolo | Programmatore Lettere | PR #71 | 056 ✓ | 0056 |
| TASK-060 | `along` nell'API e in `shared-types` | Indicazioni | in coda | 059, 053 ✓ | 0057 |
| TASK-061 | `along` nella navigazione | Indicazioni | in coda | 060, 049 ✓ | 0058 |
| TASK-063 | Dove va il tempo del motore oltre i 10 km, e un primo taglio | Indicazioni | in corso | — | 0059 |
| TASK-064 | Animali candidati: farfalla, uccello, cane, lumaca | Programmatore Lettere | in coda | 059 | 0060 |
| TASK-065 | Gli animali approvati nel catalogo (parole, AI, app) | Programmatore Lettere | in coda | 064, 057 | 0061 |
| TASK-066 | L'app mostra «risposta non valida» invece di bloccarsi se mancano `directions` | Interfaccia Grafica | in corso | — | — |
| TASK-067 | Lettere unite anche dall'alto, scala per lettera | Programmatore Lettere | in coda | 064, 063 | 0063 |

Perché quest'ordine:

- **057 dopo 059**: il campo arriva con tutte le lettere, non con quattro.
- **057 dopo 058**: tutti e due toccano `RoutePanel.tsx` e le schermate.
- **060 dopo 059**: tutti e due toccano `schemas.py` e
  `packages/shared-types` (`index.ts`, fixture); uno alla volta.
- **061 dopo 060**: la voce sta in `src/navigation/phrases.ts`, il dato
  `along` arriva con 060.
- **063 subito**: tocca il motore (`optimizer.py`, `network.py`), che nessun
  task in corso usa; `words.py` resta di 059.
- **064 dopo 059**: stesso agente; i contorni sono file nuovi
  (`shapes/outlines/*.json`) e i campioni passano dalla CLI (`--outline`),
  come TASK-034: niente catalogo, niente `shared-types`. Scelti dall'utente
  il 2026-09-25: «Animali» (farfalla, uccello, cane, lumaca).
- **065 dopo 064 e 057**: entra nel catalogo solo ciò che l'utente approva
  (ADR-0036); tocca `shared-types`, `shapes/__init__.py`, il prompt dell'AI
  e l'app (`shapeWords.ts`, `ShapeTiles.tsx`), vicini al campo di 057.
- **066 subito**: solo `apps/mobile/src/api/routes.ts` (+ test); trovato
  nella prova di 058 con un'API vecchia sul PC.
- **067 dopo 063**: tocca `words.py` e `optimizer.py`, che 063 sta
  misurando. Chiesto dall'utente il 2026-09-25 dopo i campioni di 059:
  collegare le lettere anche dall'alto se aiuta, e scale diverse fra
  lettere purché non troppo diverse dalle vicine. Niente tratto di base
  per I e F in testa alla parola: deciso dall'utente, non serve.

## File occupati adesso

| File | Di chi |
|---|---|
| `apps/mobile/src/route/LoadingBar.tsx`, `progress.ts`, `RoutePanel.tsx`, `src/map/mapPage.ts`, `messages.ts`, `MapView.tsx` (+ test) | TASK-058 (PR #72) |
| `apps/mobile/src/api/routes.ts` (+ test) | TASK-066 |
| `route_engine/letters.json`, `words.py`, `tests/test_words.py`, `packages/shared-types` (LETTERS, `contract.json`), `schemas.py` (descrizione di `word`) | TASK-059 |
| `route_engine/optimizer.py`, `network.py` (+ test), `docs/ROUTE_ENGINE.md` | TASK-063 |
| `docs/STATUS.md`, `docs/DECISIONS.md` | tutti, ognuno solo le sue righe |
| `docs/AGENTI.md`, `CLAUDE.md` | coordinatore |

## Numeri

- Task: presi fino a **TASK-067**. Il prossimo libero è **TASK-068**.
- ADR: presi fino a **ADR-0063** (0062 riservato a 066 se serve). Il prossimo
  libero è **ADR-0064**.

## Fatto in questa tornata (2026-09-24/25)

TASK-045, 046, 047, 048, 049, 050, 051, 052, 053, 054, 055, 056, 062; test
della CLI fuori dalla CI perché scaricava da Overpass (#68); regole in
`CLAUDE.md` (#50, #57, #63) e questo albero (#66).

Dopo il merge di TASK-049: `npm.cmd install` dalla radice (`expo-speech`).
