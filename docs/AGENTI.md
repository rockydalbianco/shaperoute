# AGENTI — Chi fa cosa, e cosa viene dopo

> L'albero dei lavori degli agenti in parallelo. **Lo aggiorna solo il
> coordinatore** (la sessione «Coordinatore»); gli altri lo leggono.
> Dopo il clear di fine task, un agente trova qui la sua riga: il prossimo
> task, da cosa dipende e quali file non può toccare.

**Ultimo aggiornamento**: 2026-09-25 · `main` = `52ab8e3`

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
  ├─ Adesso  TASK-060  `along` nell'API e nei tipi condivisi         059 ✓, 053 ✓
  └─ Dopo    TASK-061  `along` nella navigazione (schermo e voce)    dopo 060 (e 049 ✓)

Interfaccia Grafica
  └─ Adesso  TASK-057  Campo per scrivere la parola da disegnare     059 ✓, 058 ✓

Programmatore Lettere
  ├─ Adesso  TASK-064  Animali candidati: farfalla, uccello, cane,   059 ✓
  │                    lumaca (contorni e campioni, giudizio utente)
  ├─ Dopo    TASK-067  Lettere unite anche dall'alto, scala per      dopo 064 (e 063 ✓)
  │                    lettera
  └─ Dopo    TASK-065  Gli animali approvati nel catalogo            dopo 064, 057

Da assegnare (servono l'ok dell'utente sul cosa)
  ├─ Far scegliere fra più percorsi alternativi (la ricerca li ha già)
  ├─ Misurare la prima parola dopo il precaricamento (TASK-052), a PC libero
  ├─ Seconda ricerca fino a 2 km solo se la prima non ha un percorso
  │  disegnabile: taglia i tempi sopra i 15 km ma cambia i percorsi
  │  (TASK-063, proposta 1)
  └─ Ritaglio della zona senza copia del grafo, nell'API: 6–13 s in meno
     a Milano, percorsi identici (TASK-063, proposta 2)
```

## I task, uno per uno

| Task | Titolo | Chi | Stato | Dipende da | ADR |
|---|---|---|---|---|---|
| TASK-057 | Campo per la parola da disegnare, nell'app | Interfaccia Grafica | in corso | 059 ✓, 058 ✓ | 0053 |
| TASK-060 | `along` nell'API e in `shared-types` | Indicazioni | in corso | 059 ✓, 053 ✓ | 0057 |
| TASK-061 | `along` nella navigazione | Indicazioni | in coda | 060, 049 ✓ | 0058 |
| TASK-064 | Animali candidati: farfalla, uccello, cane, lumaca | Programmatore Lettere | in corso | 059 ✓ | 0060 |
| TASK-065 | Gli animali approvati nel catalogo (parole, AI, app) | Programmatore Lettere | in coda | 064, 057 | 0061 |
| TASK-067 | Lettere unite anche dall'alto, scala per lettera | Programmatore Lettere | in coda | 064, 063 ✓ | 0063 |

Perché quest'ordine:

- **060 adesso**: tocca `schemas.py` e `packages/shared-types`, liberi
  dopo il merge di 059; l'app resta di 057.
- **061 dopo 060**: la voce sta in `src/navigation/phrases.ts`, il dato
  `along` arriva con 060.
- **065 dopo 064 e 057**: entra nel catalogo solo ciò che l'utente approva
  (ADR-0036); tocca `shared-types`, `shapes/__init__.py`, il prompt dell'AI
  e l'app (`shapeWords.ts`, `ShapeTiles.tsx`), vicini al campo di 057.
- **067 dopo 064**: stesso agente; tocca `words.py` e `optimizer.py`
  (063 ha toccato solo `network.py`). Chiesto dall'utente il 2026-09-25
  dopo i campioni di 059: collegare le lettere anche dall'alto se aiuta, e
  scale diverse fra lettere purché non troppo diverse dalle vicine. Niente
  tratto di base per I e F in testa alla parola: deciso dall'utente, non
  serve.

## File occupati adesso

| File | Di chi |
|---|---|
| `apps/mobile/App.tsx`, `src/route/RoutePanel.tsx`, `problems.ts`, `useRouteRequest.ts`, `wordInput.ts`, `src/screens/ChooseScreen.tsx`, `Segmented.tsx` (+ test), `docs/UI.md` | TASK-057 |
| `services/api` (`schemas.py`, indicazioni, + test), `packages/shared-types`, `docs/API.md` | TASK-060 |
| `services/route-engine/shapes/outlines/*.json`, `samples/TASK-064_*` | TASK-064 |
| `docs/STATUS.md`, `docs/DECISIONS.md` | tutti, ognuno solo le sue righe |
| `docs/AGENTI.md`, `CLAUDE.md` | coordinatore |

## Numeri

- Task: presi fino a **TASK-067**. Il prossimo libero è **TASK-068**.
- ADR: presi fino a **ADR-0063** (0062 riservato e non usato). Il
  prossimo libero è **ADR-0064**.

## Fatto in questa tornata (2026-09-24/25)

TASK-045, 046, 047, 048, 049, 050, 051, 052, 053, 054, 055, 056, 058,
059, 062, 063, 066; test della CLI fuori dalla CI perché scaricava da
Overpass (#68); regole in `CLAUDE.md` (#50, #57, #63) e questo albero
(#66, #73).

Dopo il merge di TASK-049: `npm.cmd install` dalla radice (`expo-speech`).
