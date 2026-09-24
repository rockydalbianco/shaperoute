# TASK-050 — Lettere una per una: ognuna cerca le sue strade, poi si collegano

**Stato**: In corso
**Fase**: 4 · **Branch**: `feat/TASK-050-letters-one-by-one` (parte da `main`)

Era TASK-047: quel numero è passato alle indicazioni di svolta, scritte
dall'utente in un'altra sessione. Il testo è lo stesso, con il piano
deciso dall'agente su delega dell'utente.

## Obiettivo

«CIAO» chiuso a 15 km con lettere più dritte e più distanziate: ogni
lettera si sposta di poco per stare sulle strade, la I si corre andata e
ritorno sulla stessa strada, e le lettere si collegano lungo la base.

## Contesto da leggere

- `docs/DECISIONS.md` ADR-0042, ADR-0043, ADR-0023 (ricerca), ADR-0039
- `services/route-engine/route_engine/optimizer.py` (`search`, `RoadMask`,
  `plan_shape`), `network.py` (`snap_to_network`)
- `samples/LOG.md`, righe TASK-040 e TASK-041

## Richieste dell'utente (2026-09-24)

- Il giro chiuso era meglio dell'aperto (TASK-041).
- Lettere più distanziate.
- A Trento c'era una strada per una I dritta, centrata fra C e A:
  andata e ritorno sulla stessa strada l'avrebbero deformata meno.
- «Meglio intensificare i punti di passaggio e creare le lettere
  separatamente e poi connetterle.»

## Cosa c'è già

Perché la I di Trento non è venuta (TASK-041): «CIAO» ha 67 vertici, sopra
i 64 punti del motore, quindi i punti di passaggio sono solo i vertici e
lungo la I non ce n'è nessuno. Il percorso sale e scende per due strade
diverse, 100–250 m a destra dell'asse, e la parola è ruotata di 15°. Con
più punti, su «CIAO» chiuso a Trento: 128 punti, rotazione 0°, scarto
mediano del disegno dal percorso 32 m (era 44), 10 s; 256 punti, 30 m,
20 s.

## Cosa fare

Deciso dall'agente su delega dell'utente:

1. **Alfabeto a tratto singolo** (`shapes/letters.json`), per ora C, I, A,
   O. Ogni lettera è alta 1 e ha un'andata, dall'ingresso all'uscita, tutti
   e due sulla base; e, se ingresso e uscita non coincidono, un ritorno.
   La A esce dal piede destro e torna per le gambe: la base non la chiude.
2. **Parola composta dal motore** (`words.py`): le lettere in fila, con
   0,6 dell'altezza fra una e l'altra (era 0,3), unite da tratti di base;
   il ritorno ripassa la base e i ritorni delle lettere. La linea parte a
   metà del primo spazio. Il motore sa quali punti sono di quale lettera.
3. **Più punti di passaggio**: ogni lato diviso in pezzi di al più 1/16
   dell'altezza (circa 250 punti per «CIAO»).
4. **Ogni lettera cerca le sue strade**: a ogni tracciamento, fissati
   posto, scala e rotazione della parola, ogni lettera prova spostamenti
   fino a 1/4 dell'altezza, su una griglia di 1/16, e tiene quello con più
   strade lungo la parola intera (`RoadMask`), con una piccola penalità per
   lo spostamento. I tratti di base si allungano o accorciano. La partenza
   resta a metà di uno spazio, ferma: la ricerca entra nella parola solo lì.
5. **CLI**: `--word CIAO`, al posto di `--shape` e `--outline`.
6. **Campioni** a 15 km a Trento, Levico e Milano
   (`TASK-050_ciao_15km_<zona>_v1.gpx`), accanto a quelli di TASK-040.

## Criteri di accettazione

- [ ] Una parola si compone dalle lettere, con lo spazio e la base, e il
      ritorno non chiude la A (test).
- [ ] Ogni lato di una parola è lungo al più 1/16 dell'altezza (test).
- [ ] Lo spostamento di una lettera la porta dove ha più strade, resta
      entro il limite, e la partenza non si muove (test su un grafo con una
      strada sola).
- [ ] Contorni e forme del catalogo danno gli stessi punti di prima (test
      esistenti verdi).
- [ ] `ruff`, `black`, `pytest -m "not network"` puliti.
- [ ] Campioni nelle tre zone e giudizio dell'utente, contro TASK-040.

## File toccati

```
services/route-engine/route_engine/shapes/letters.json   (nuovo)
services/route-engine/route_engine/words.py              (nuovo)
services/route-engine/route_engine/optimizer.py
services/route-engine/route_engine/__main__.py
services/route-engine/pyproject.toml                     (letters.json nel pacchetto)
services/route-engine/tests/test_words.py                (nuovo)
services/route-engine/tests/test_optimizer.py
services/route-engine/tests/test_cli.py
samples/TASK-050_*.gpx, samples/LOG.md
docs/tasks/TASK-050.md, docs/ROUTE_ENGINE.md, docs/ROADMAP.md
docs/DECISIONS.md (ADR-0044), docs/STATUS.md
```

## Fuori scope

- Tutto l'alfabeto, cifre, minuscole, spazi: dopo il giudizio su «CIAO».
- Parole nell'API e nell'app.
- Parole a sola andata (TASK-041): l'utente preferisce il giro chiuso.
- Ruotare o scalare le lettere una per una: si spostano soltanto.
- `network.py` e le indicazioni di svolta (TASK-047, un'altra sessione).

## Esito

*(da compilare)*
