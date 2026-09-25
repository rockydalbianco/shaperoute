# AGENTI — Chi fa cosa, e cosa viene dopo

> L'albero dei lavori degli agenti in parallelo. **Lo aggiorna solo il
> coordinatore** (la sessione «Coordinatore»); gli altri lo leggono.
> Dopo il clear di fine task, un agente trova qui la sua riga: il prossimo
> task, da cosa dipende e quali file non può toccare.

**Ultimo aggiornamento**: 2026-09-25 sera · `main` = `0ddb95c`

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
  ├─ Adesso  TASK-061  `along` nella navigazione (schermo e voce)    060 ✓
  ├─ Dopo    TASK-074  Niente «fuori tracciato» per il marciapiede   dopo 061
  │                    opposto o un GPS impreciso
  └─ Dopo    TASK-070  Modalità tasca: schermo acceso ma nero,       dopo 074
                       tocchi bloccati, voce attiva                  (e non insieme a 073)

Interfaccia Grafica
  ├─ Adesso  TASK-072  La forma da un'immagine: motore e CLI         nessuna
  │                    (campioni, giudizio utente)
  └─ Dopo    TASK-073  L'immagine nell'app e nell'API                dopo 072
                                                                     (e non insieme a 070)

Programmatore Lettere
  ├─ Attesa  TASK-068  Cane: solo la testa (PR #82, giudizio utente)
  ├─ Dopo    TASK-071  Lettere ripassate: andata e ritorno sulla     dopo 068
  │                    stessa strada, tratti sottili
  ├─ Dopo    TASK-067  Lettere unite anche dall'alto, scala per      dopo 071 (da rivedere
  │                    lettera                                       coi risultati di 071)
  └─ Dopo    TASK-065  Gli animali approvati nel catalogo            dopo 068 (e 060 ✓)

Da assegnare (servono l'ok dell'utente sul cosa)
  ├─ Far scegliere fra più percorsi alternativi (la ricerca li ha già)
  ├─ Misurare la prima parola dopo il precaricamento (TASK-052), a PC libero
  ├─ Seconda ricerca fino a 2 km solo se la prima non ha un percorso
  │  disegnabile: taglia i tempi sopra i 15 km ma cambia i percorsi
  │  (TASK-063, proposta 1)
  ├─ Ritaglio della zona senza copia del grafo, nell'API: 6–13 s in meno
  │  a Milano, percorsi identici (TASK-063, proposta 2)
  ├─ Voce e GPS col telefono davvero bloccato: serve una build propria
  │  (account Apple Developer), non Expo Go (TASK-070, prima versione)
  └─ Nuove forme dagli spunti di gpsart.info: temi stagionali (zucca,
     albero di Natale), coniglio, elefante, sagome di mappe
```

## I task, uno per uno

| Task | Titolo | Chi | Stato | Dipende da | ADR |
|---|---|---|---|---|---|
| TASK-061 | `along` nella navigazione | Indicazioni | in corso | 060 ✓ | 0058 |
| TASK-065 | Gli animali approvati nel catalogo (parole, AI, app) | Programmatore Lettere | in coda | 068, 060 ✓ | 0061 |
| TASK-067 | Lettere unite anche dall'alto, scala per lettera | Programmatore Lettere | in coda | 071 | 0063 |
| TASK-068 | Cane: solo la testa, con occhi, naso e bocca | Programmatore Lettere | PR #82 | 064 ✓ | 0065 |
| TASK-070 | Modalità tasca | Indicazioni | in coda | 074 | 0066 |
| TASK-071 | Lettere ripassate, andata e ritorno sulla stessa strada | Programmatore Lettere | in coda | 068 | 0067 |
| TASK-072 | La forma da un'immagine: motore e CLI | Interfaccia Grafica | in corso | — | 0068 |
| TASK-073 | L'immagine nell'app e nell'API | Interfaccia Grafica | in coda | 072 | 0069 |
| TASK-074 | Niente «fuori tracciato» per il marciapiede opposto | Indicazioni | in coda | 061 | 0070 |

Perché quest'ordine:

- **061, 074, 070 in fila**: toccano tutti `src/navigation/`. 074 prima di
  070 perché è un difetto trovato dall'utente sulle strade: oggi basta un
  punto GPS oltre i 40 m (`OFF_ROUTE_M`) per dire «fuori tracciato».
- **070 e 073 mai insieme**: tutti e due aggiungono pacchetti all'app
  (`package.json`, `package-lock.json`). Parte per primo quello pronto per
  primo; l'altro aspetta il merge.
- **070, modalità tasca**: scelta dall'utente il 2026-09-25 (strada «B»).
  La prima versione, a telefono bloccato, non si può fare in Expo Go: la
  documentazione di `expo-location` richiede una build propria. Pacchetti
  autorizzati: `expo-keep-awake`, `expo-brightness`.
- **072 e 073**: chiesto dall'utente: la forma dai contorni di
  un'immagine. Perimetro deciso dall'utente: un soggetto chiaro su sfondo
  uniforme, solo il contorno esterno. Pacchetti autorizzati: Pillow nel
  motore, `expo-image-picker` nell'app.
- **071 prima di 067**: chiesto dall'utente dopo le prove sull'iPhone. Le
  lettere vengono meglio ripassate (andata e ritorno sulla stessa strada),
  come nelle GPS art di riferimento. Se le lettere si ripassano, anche il
  modo di unirle cambia: 067 si rivede dopo i risultati di 071.
- **065 dopo 068**: nel catalogo vanno **farfalla e lumaca** (deciso
  dall'utente il 2026-09-25); il cane dipende dal giudizio sulla testa
  (068); l'uccello resta fuori.

## File occupati adesso

| File | Di chi |
|---|---|
| `apps/mobile/src/navigation/` (+ il componente che mostra l'indicazione), `docs/UI.md` | TASK-061 |
| `services/route-engine/route_engine/shapes/image_outline.py`, `__main__.py`, `pyproject.toml`, `samples/TASK-072_*`, `docs/ROUTE_ENGINE.md` | TASK-072 |
| `route_engine/shapes/outlines/dog_head.json`, `samples/TASK-068_*` | TASK-068 (PR #82) |
| `samples/LOG.md`, `docs/STATUS.md`, `docs/DECISIONS.md` | tutti, ognuno solo le sue righe |
| `docs/AGENTI.md`, `CLAUDE.md` | coordinatore |

## Numeri

- Task: presi fino a **TASK-074**. Il prossimo libero è **TASK-075**.
- ADR: presi fino a **ADR-0070** (0062 riservato e non usato). Il
  prossimo libero è **ADR-0071**.

## Fatto in questa tornata (2026-09-24/25)

TASK-045, 046, 047, 048, 049, 050, 051, 052, 053, 054, 055, 056, 057,
058, 059, 060, 062, 063, 064, 066, 069; test della CLI fuori dalla CI
perché scaricava da Overpass (#68); regole in `CLAUDE.md` (#50, #57, #63)
e questo albero (#66, #73, #76, #80).

Dopo il merge di TASK-049: `npm.cmd install` dalla radice (`expo-speech`).
