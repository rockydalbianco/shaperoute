# AGENTI — Chi fa cosa, e cosa viene dopo

> L'albero dei lavori degli agenti in parallelo. **Lo aggiorna solo il
> coordinatore** (la sessione «Coordinatore»); gli altri lo leggono.
> Dopo il clear di fine task, un agente trova qui la sua riga: il prossimo
> task, da cosa dipende e quali file non può toccare.

**Ultimo aggiornamento**: 2026-09-25 · `main` = `bf34a07`

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
  └─ Adesso  TASK-069  La barra di caricamento stima le parole       057 ✓, 058 ✓

Programmatore Lettere
  ├─ Adesso  TASK-068  Cane: solo la testa, con occhi, naso e bocca  064 ✓
  │                    (contorno e campioni, giudizio utente)
  ├─ Dopo    TASK-067  Lettere unite anche dall'alto, scala per      064 ✓, 063 ✓
  │                    lettera
  └─ Dopo    TASK-065  Gli animali approvati nel catalogo            dopo 068 e 060

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
| TASK-060 | `along` nell'API e in `shared-types` | Indicazioni | in corso | 059 ✓, 053 ✓ | 0057 |
| TASK-061 | `along` nella navigazione | Indicazioni | in coda | 060, 049 ✓ | 0058 |
| TASK-065 | Gli animali approvati nel catalogo (parole, AI, app) | Programmatore Lettere | in coda | 068, 060 | 0061 |
| TASK-067 | Lettere unite anche dall'alto, scala per lettera | Programmatore Lettere | in coda | 064 ✓, 063 ✓ | 0063 |
| TASK-068 | Cane: solo la testa, con occhi, naso e bocca | Programmatore Lettere | in corso | 064 ✓ | 0065 |
| TASK-069 | La barra di caricamento con una stima per le parole | Interfaccia Grafica | in corso | 057 ✓ | 0064 |

Perché quest'ordine:

- **061 dopo 060**: la voce sta in `src/navigation/phrases.ts`, il dato
  `along` arriva con 060.
- **068 prima di 067 e 065**: chiesto dall'utente il 2026-09-25 dopo il
  giudizio di 064 (il cane intero: `no` a Trento e Levico). Il catalogo
  aspetta il giudizio sulla testa per decidere il cane.
- **065 dopo 068 e 060**: tocca `packages/shared-types`, che ora è di
  060. Deciso dall'utente il 2026-09-25: nel catalogo **farfalla e
  lumaca**; il cane dipende dalla testa (068); l'uccello resta fuori.
- **067**: tocca `words.py` e `optimizer.py`. Chiesto dall'utente il
  2026-09-25 dopo i campioni di 059: collegare le lettere anche dall'alto
  se aiuta, e scale diverse fra lettere purché non troppo diverse dalle
  vicine. Niente tratto di base per I e F in testa alla parola: deciso
  dall'utente, non serve.
- **069**: seguito di 057 proposto dall'agente e approvato dall'utente;
  solo l'app (`progress.ts`, `LoadingBar.tsx`).

## File occupati adesso

| File | Di chi |
|---|---|
| `services/api` (`schemas.py`, indicazioni, + test), `packages/shared-types`, `docs/API.md` | TASK-060 |
| `apps/mobile/src/route/progress.ts`, `LoadingBar.tsx`, `RoutePanel.tsx` (+ test), `docs/UI.md` | TASK-069 |
| `services/route-engine/route_engine/shapes/outlines/dog_head.json`, `samples/TASK-068_*`, `samples/LOG.md` (sue righe) | TASK-068 |
| `docs/STATUS.md`, `docs/DECISIONS.md` | tutti, ognuno solo le sue righe |
| `docs/AGENTI.md`, `CLAUDE.md` | coordinatore |

## Numeri

- Task: presi fino a **TASK-069**. Il prossimo libero è **TASK-070**.
- ADR: presi fino a **ADR-0065** (0062 riservato e non usato; 0064 a
  069 se serve). Il prossimo libero è **ADR-0066**.

## Fatto in questa tornata (2026-09-24/25)

TASK-045, 046, 047, 048, 049, 050, 051, 052, 053, 054, 055, 056, 057,
058, 059, 062, 063, 064, 066; test della CLI fuori dalla CI perché
scaricava da Overpass (#68); regole in `CLAUDE.md` (#50, #57, #63) e
questo albero (#66, #73, #76).

Dopo il merge di TASK-049: `npm.cmd install` dalla radice (`expo-speech`).
