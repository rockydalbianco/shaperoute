# AGENTI — Chi fa cosa, e cosa viene dopo

> L'albero dei lavori degli agenti in parallelo. **Lo aggiorna solo il
> coordinatore** (la sessione «Coordinatore»); gli altri lo leggono.
> Dopo il clear di fine task, un agente trova qui la sua riga: il prossimo
> task, da cosa dipende e quali file non può toccare.

**Ultimo aggiornamento**: 2026-09-26 · `main` = `7212156`

## Come si usa

1. Trova la tua sessione qui sotto: **Adesso** è il task in corso,
   **Dopo** la coda, in ordine.
2. Un task della coda parte solo quando le sue **dipendenze** sono in `main`.
   Se non lo sono, avvisa il coordinatore e aspetta.
3. Il messaggio di partenza lo manda il coordinatore, completo (numero,
   ADR, file, confini). Se non arriva, chiedilo: non partire da solo.
4. Numeri di task e di ADR: solo dal coordinatore (`CLAUDE.md`).
5. **Worktree nuovi su D:** (`D:\shaperoute-TASK-XXX`). Su C: lo spazio è
   poco: niente installazioni né zone nuove. La cache delle zone sta in
   `D:\shaperoute-data\cache`; `data\cache` del checkout principale è un
   collegamento (junction) a quella cartella.

## L'albero

```
Indicazioni
  ├─ Adesso  TASK-076  Il cuore meno sensibile alla partenza: più     075 ✓
  │                    partenze vicine, si tiene la migliore
  ├─ Attesa  TASK-074  Niente «fuori tracciato» per il marciapiede     PR #86, prova
  │                    opposto (prova sull'iPhone alla prossima corsa)  dell'utente
  └─ Dopo    TASK-070  Modalità tasca: schermo acceso ma nero,         dopo 073
                       tocchi bloccati, voce attiva                    (package.json)

Interfaccia Grafica
  └─ Attesa  TASK-073  L'immagine nell'app e nell'API                  PR #89, prova
                                                                       dell'utente

Programmatore Lettere
  ├─ Adesso  TASK-077  Lettere squadrate: un secondo alfabeto          071 ✓
  ├─ Dopo    TASK-065  Gli animali approvati nel catalogo              dopo 073
  │                    (farfalla, lumaca, testa di cane)               (shared-types)
  └─ Dopo    TASK-067  Lettere unite dall'alto, scala per lettera      da rivedere
                                                                       dopo 071 e 077

Da assegnare (servono l'ok dell'utente sul cosa)
  ├─ Far scegliere fra più percorsi alternativi (la ricerca li ha già)
  ├─ Misurare la prima parola dopo il precaricamento (TASK-052), a PC libero
  ├─ Seconda ricerca fino a 2 km solo se la prima non ha un percorso
  │  disegnabile: taglia i tempi sopra i 15 km ma cambia i percorsi
  │  (TASK-063, proposta 1)
  ├─ Ritaglio della zona senza copia del grafo, nell'API: 6–13 s in meno
  │  a Milano, percorsi identici (TASK-063, proposta 2)
  ├─ Voce e GPS col telefono davvero bloccato: serve una build propria
  │  (account Apple Developer), non Expo Go
  ├─ Nuove forme dagli spunti di gpsart.info: temi stagionali (zucca,
  │  albero di Natale), coniglio, elefante, sagome di mappe
  └─ Registrare le richieste dell'API su file, per rifare un percorso visto
     nell'app (in TASK-075 non si è potuto)
```

## I task, uno per uno

| Task | Titolo | Chi | Stato | Dipende da | ADR |
|---|---|---|---|---|---|
| TASK-065 | Gli animali approvati nel catalogo (parole, AI, app) | Programmatore Lettere | in coda | 073 | 0061 |
| TASK-067 | Lettere unite dall'alto, scala per lettera | Programmatore Lettere | in coda | 077 | 0063 |
| TASK-070 | Modalità tasca | Indicazioni | in coda | 073 | 0066 |
| TASK-073 | L'immagine nell'app e nell'API | Interfaccia Grafica | PR #89 | 072 ✓ | 0069 |
| TASK-074 | Niente «fuori tracciato» per il marciapiede opposto | Indicazioni | PR #86 | 061 ✓ | 0070 |
| TASK-076 | Più partenze vicine, si tiene il percorso migliore | Indicazioni | in corso | 075 ✓ | 0071 |
| TASK-077 | Lettere squadrate: un secondo alfabeto | Programmatore Lettere | in corso | 071 ✓ | 0072 |

Perché quest'ordine:

- **076 senza `optimizer.py`**: la ricerca delle partenze sta in un modulo
  nuovo che chiama `plan_route`; il collegamento all'API (`app.py`,
  `jobs.py`) solo dopo il merge di 073, che li sta modificando. Scelta
  dell'utente dopo TASK-075: il motore di ieri e di oggi davano lo stesso
  cuore, a cambiarlo era la partenza GPS (25–100 m: somiglianza da 0,73 a
  0,92).
- **077 senza `__main__.py`**: la CLI la sta modificando 076; i campioni
  delle lettere squadrate passano da uno script a parte. Scelta
  dell'utente dopo TASK-071 (ripasso sulla stessa strada provato e
  scartato: 4 parole su 9 peggio, nessuna meglio).
- **065 e 070 dopo 073**: 073 tocca `packages/shared-types` e aggiunge un
  pacchetto all'app (`package.json`, `package-lock.json`); 065 tocca
  `shared-types`, 070 aggiunge `expo-keep-awake` ed `expo-brightness`.
- **067**: dopo 071 si sa che lettere più piccole si leggono peggio; si
  rivede coi risultati di 077.

## File occupati adesso

| File | Di chi |
|---|---|
| `apps/mobile/` (App, route, api, `package.json`), `package-lock.json`, `packages/shared-types`, `services/api` (`app.py`, `jobs.py`, `schemas.py`, test) | TASK-073 (PR #89) |
| `apps/mobile/src/navigation/` | TASK-074 (PR #86) |
| `route_engine/__main__.py`, il modulo nuovo delle partenze vicine, `samples/TASK-076_*` | TASK-076 |
| `route_engine/letters_block.json`, `words.py`, `optimizer.py` (solo la parte delle parole), `samples/TASK-077_*` | TASK-077 |
| `samples/LOG.md`, `docs/STATUS.md`, `docs/DECISIONS.md` | tutti, ognuno solo le sue righe |
| `docs/AGENTI.md`, `CLAUDE.md` | coordinatore |

## Numeri

- Task: presi fino a **TASK-077**. Il prossimo libero è **TASK-078**.
- ADR: presi fino a **ADR-0072** (0062 riservato e non usato; 0067
  «Scartata»). Il prossimo libero è **ADR-0073**.

## Fatto in questa tornata (2026-09-24/26)

TASK-045 … 064, 066, 068, 069, 071 (scartato, solo verifica e campioni),
072, 075 (nessuna regressione: la causa era la partenza GPS); test della
CLI fuori dalla CI (#68); regole in `CLAUDE.md` (#50, #57, #63) e questo
albero (#66, #73, #76, #80, #83).

Dopo un merge che aggiunge pacchetti all'app: `npm.cmd install` dalla
radice del checkout principale (è successo con `expo-speech`).
