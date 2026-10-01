# TASK-092 — Percorsi consigliati: tutti salvati, i migliori proposti

**Stato**: Todo
**Fase**: 4 · **Branch**: `feat/TASK-092-recommended-routes`

Chiesto dall'utente il 2026-10-01: «salvali tutti… per ripopolare anche
strade non visitate solitamente». Decisione di prodotto in ADR-0086.

## Obiettivo

Ogni percorso generato dall'API resta salvato nel database; l'app propone
a chi cerca un percorso quelli migliori già fatti nella sua zona, e i
migliori si possono usare sui social del progetto.

## Dipende da

- **TASK-110** (scelte social): privacy, hosting, database.
- **TASK-114** (database e account) e **TASK-122** (API e database sempre
  accesi): senza, i percorsi degli altri utenti non arrivano da nessuna
  parte.

## Contesto da leggere

- `docs/DECISIONS.md` ADR-0086, ADR-0085 (registro delle richieste)
- `docs/tasks/TASK-110.md`, punti 5 e 6
- `docs/DATABASE.md` (dopo TASK-110)

## Cosa fare

Da precisare quando le dipendenze sono in `main`; oggi i punti sono questi.

1. **Salvare**: ogni percorso finito dell'API (forma, parola o immagine)
   va nel database con la richiesta, i punti, la distanza e la
   somiglianza, la zona e la data. Lo fa l'API, non l'app.
2. **Scegliere i migliori**: per zona e per forma, la somiglianza più alta;
   da decidere con l'utente se contano anche like (TASK-119) e corse fatte
   (punteggio di TASK-113).
3. **A parità di qualità si tengono e si propongono tutti** (scelta
   dell'utente, 2026-10-01): nessun percorso ne scarta un altro altrettanto
   buono, anche se passano dalle stesse strade. Così si propongono anche
   strade di solito poco frequentate, accanto a quelle già note.
4. **Proporli nell'app**: cosa si vede e dove (per esempio «Best hearts
   near you») è una scelta di prodotto: proposta con un'immagine prima di
   scrivere codice.
5. **Social**: come si esportano i migliori (immagine della mappa, GPX) per
   i canali del progetto.
6. Privacy secondo quanto deciso in TASK-110.

## Criteri di accettazione

Da scrivere prima di iniziare, dopo TASK-110: oggi dipenderebbero da
scelte non ancora prese.

## File toccati

Da scrivere prima di iniziare.

## Fuori scope

- Salvare i percorsi del Mac di oggi in un database: il registro delle
  richieste (ADR-0085) basta finché l'API è solo sul Mac.
- Classifiche e sfide fra utenti (fuori scope anche in TASK-110).

## Esito
