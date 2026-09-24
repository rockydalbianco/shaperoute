# TASK-035 — Una somiglianza che vede i dettagli

**Stato**: Done
**Fase**: 3 · **Branch**: `feat/TASK-035-similarity-details` (parte da
`feat/TASK-034-candidate-shapes`)

## Obiettivo

Capire perché la somiglianza calcolata dà voti alti a percorsi che l'utente
non riconosce, e trovare una misura, o una regola del motore, che vada
d'accordo con il suo occhio.

## Contesto da leggere

- `docs/ROUTE_ENGINE.md` §5 (somiglianza); `docs/DECISIONS.md` ADR-0023,
  ADR-0025, ADR-0035, ADR-0036
- `samples/LOG.md`, righe di TASK-016, TASK-032 e TASK-034
- `services/route-engine/route_engine/metrics.py`, `optimizer.py`

## Cosa c'è già

- La somiglianza del motore (`shape`) è `fit`, la media armonica di
  copertura e precisione con una tolleranza del 2% del perimetro, meno 0,10
  per ogni angolo della forma che il percorso manca (ADR-0025). Guida la
  ricerca, fa scattare l'avviso sotto 0,90 e il rifiuto sotto 0,60.
- I giudizi dell'utente sul motore di oggi sono 72: TASK-016 (cuore e
  cerchio), TASK-032 (stella, casa, cavallo), TASK-034 (sei candidate).

## Decisioni

Prese dall'agente il 2026-09-24, su delega dell'utente.

- **A. Si misura prima di cambiare.** Il motore è deterministico: i 72 casi
  giudicati si rigenerano identici (verificato: stessa somiglianza del LOG
  per tutti), con la forma piazzata a cui la ricerca li ha confrontati. Su
  quelli si provano altre misure e si guarda quale mette i casi nello
  stesso ordine dell'occhio.
- **B. La casa si guarda a parte**: per la casa di Milano il percorso segue
  bene il contorno, ed è il disegno a non sembrare una casa. Lì la misura
  non può sapere cosa pensa l'occhio.
- **C. Nessun parametro del motore cambia in questo task senza campioni
  nuovi giudicati dall'utente**: una misura diversa dentro la ricerca cambia
  tutti i percorsi.

## Analisi (2026-09-24)

Per ogni misura: la media per giudizio e la quota di coppie con giudizio
diverso che la misura ordina come l'occhio (0,50 è il caso, 1,00 è
perfetto). 60 casi, senza la casa: 29 `sì`, 7 `quasi`, 24 `no`.

| Misura | sì | quasi | no | coppie ordinate come l'occhio |
|---|---|---|---|---|
| somiglianza del motore (fit al 2%, angoli) | 0,98 | 0,85 | 0,92 | 0,79 |
| fit all'1% | 0,78 | 0,56 | 0,63 | 0,81 |
| precisione allo 0,5% | 0,46 | 0,27 | 0,31 | 0,83 |
| copertura allo 0,5% | 0,50 | 0,35 | 0,40 | 0,77 |
| angoli mancati, tolleranza 1–0,5% | — | — | — | 0,61 |
| Hausdorff | 0,83 | 0,66 | 0,76 | 0,75 |
| Fréchet | 0,81 | 0,64 | 0,74 | 0,73 |
| percorso pulito (lunghezza semplificata / lunghezza) | 0,78 | 0,75 | 0,72 | 0,72 |
| percorso calmo (poche svolte per km) | 1,45 | 1,47 | 1,39 | 0,56 |

Cosa dicono i numeri:
- **Nessuna misura separa i `no`.** In tutte, la media dei `no` sta fra
  quella dei `sì` e quella dei `quasi`: i percorsi bocciati seguono il
  contorno piazzato, in media, bene quanto quelli promossi.
- Una tolleranza più stretta separa un po' meglio i `sì` dai `quasi`
  (0,83 contro 0,79), non i `no`.
- Neanche gli angoli mancati o il «rumore» del percorso (zigzag, svolte)
  spiegano i `no`.

Quindi la somiglianza non è più generosa dell'occhio perché la tolleranza è
larga: misura una cosa diversa da quella che l'occhio giudica.

### L'orientamento

La ricerca ruota la forma su tutti i 360°, a passi di 15°. Rigenerati i 72
casi, con la rotazione scelta (inclinazione = distanza dalla forma dritta):

| Giudizio | Casi | Dritti (≤ 5°) | Inclinati (≥ 15°) |
|---|---|---|---|
| `sì` | 26 | 25 | 1 (cuore di Trento, 15 km, 45°) |
| `quasi` | 4 | 3 | 1 (cuore di Levico, 15 km, 60°) |
| `no` | 24 | 16 | 8 (fra 15° e 60°) |

Senza cerchio (la rotazione non lo cambia) e casa (conta il disegno). Dei
10 casi inclinati di 15° o più, 8 sono `no`. L'orientamento spiega una
parte dei `no`, non tutti: 16 sono dritti, e lì sono le strade di Trento e
Levico a non reggere la forma a 10–15 km.

## Esito

Nessuna misura di somiglianza separa i `no` dell'utente: la somiglianza
resta com'è (ADR-0037). Misura quanto il percorso segue il contorno
piazzato, non se la forma si riconosce; la spiegazione di ADR-0035 (la
tolleranza del 2% copre i dettagli) era sbagliata. Quello che conta per
l'occhio e che il motore può cambiare è l'orientamento: il prossimo task
tiene dritte le forme che hanno un alto e un basso. Gli script di analisi
sono usa-e-getta; il metodo sta qui e in ADR-0037.
