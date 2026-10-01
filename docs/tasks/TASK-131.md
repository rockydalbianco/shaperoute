# TASK-131 — Un cuore più bello a occhio

**Stato**: Todo
**Fase**: 4 · **Branch**: `feat/TASK-131-better-heart`

Chiesto dall'utente il 2026-10-01, dopo la prova di TASK-093: «ad occhio
saprei farlo un po' meglio il cuore». Il numero è il primo libero:
TASK-128 è riservato al giro del catalogo (TASK-129, TASK-130).

## Obiettivo

Sui percorsi veri, il cuore che il motore sceglie piace di più all'occhio
dell'utente di quello di oggi, senza peggiorare le altre forme e senza
richieste più lente.

## Il problema, oggi

Il motore giudica un cuore con la **somiglianza** (`ROUTE_ENGINE.md` §5):
quanto del contorno ha una strada vicina, quanto del percorso sta vicino al
contorno, e se l'incavo in alto e la punta in basso sono toccati. Il
giudizio dell'occhio guarda altro, e oggi non si sa con precisione cosa:
un 0,85 è stato giudicato sia «sì» sia «quasi» (TASK-075). Prima di
cambiare il motore serve sapere **che cosa l'utente correggerebbe**.

Cosa può cambiare, dal più semplice:

1. **La forma ideale del cuore** (`shapes/heart.py`): oggi la curva classica
   `16 sin³t`, con lobi stretti e una punta lunga. Lobi più tondi, incavo
   più profondo o punta più corta cambiano tutti i cuori.
2. **Cosa conta nella somiglianza per il cuore**: per esempio che i due lobi
   siano simmetrici e della stessa misura, o che l'incavo sia una V e non
   una linea piatta. È il giudizio dell'occhio messo in numeri.
3. **Come la ricerca piazza il cuore**: rotazione oggi entro ±15°, scala,
   più partenze vicine (ADR-0071) solo per il cuore.
4. **Quale percorso si sceglie fra quelli calcolati** (oggi il punteggio più
   alto, ADR-0071): con le tessere di TASK-093 l'utente già sceglie; le sue
   scelte, nel registro delle richieste, dicono cosa preferisce.

## Cosa fare

**Prima di scrivere codice, con l'utente** (una domanda per volta):

1. **Cosa non va**: mostrargli 6–8 cuori veri (Caldonazzo, Levico, Trento,
   Milano, 5–15 km, dal registro delle richieste e dai campioni) e chiedere,
   per ciascuno, `sì` / `quasi` / `no` e che cosa cambierebbe: lobi, incavo,
   punta, simmetria, angoli, tratti ripassati. Se vuole, il cuore lo disegna
   lui: la lavagna di TASK-079 dà già un contorno (`POST /image-outline-edits`).
2. **Quale strada provare per prima**, fra le quattro sopra, in base alle
   risposte. Proposta: prima la forma ideale (1), che costa poco e si vede
   subito; la somiglianza (2) solo se la forma non basta.

**Poi** (tecnico, su delega):

3. Due o tre varianti della strada scelta, dalla CLI del motore, sugli stessi
   punti di partenza e cache; GPX e una pagina di giudizio sì / quasi / no
   (`samples/TASK-131_*`, come TASK-078).
4. Il giudizio dell'utente in `samples/LOG.md`; entra solo la variante che
   l'utente approva (ADR-0036).
5. Test deterministici; tempi misurati prima e dopo; le altre forme del
   catalogo invariate punto per punto, se si cambia solo il cuore.

## Criteri di accettazione

- [ ] L'utente ha detto cosa correggerebbe, scritto qui sotto con i cuori
      guardati.
- [ ] Una variante giudicata dall'utente migliore di oggi sulla maggior
      parte dei cuori di prova (`samples/LOG.md`), e nessuno peggiore.
- [ ] Le altre forme danno gli stessi percorsi di prima punto per punto
      (o, se si cambia la somiglianza per tutte, rigiudicate).
- [ ] Il tempo di una richiesta di cuore non cresce più del 10% (cuore
      10 km Caldonazzo, 15 km Trento).
- [ ] Test deterministici; decisione in `DECISIONS.md`;
      `ROUTE_ENGINE.md` aggiornato.
- [ ] Provato sull'iPhone dall'utente.

## File toccati

Previsti, da confermare all'inizio con `STATUS.md` «In lavorazione» e le PR
aperte (`shapes/__init__.py` è di TASK-088, PR #112, finché non entra):

```
services/route-engine/route_engine/shapes/heart.py      (strada 1)
services/route-engine/route_engine/metrics.py o optimizer.py (strade 2-3)
services/route-engine/tests/
samples/TASK-131_*, samples/LOG.md
docs/ROUTE_ENGINE.md, docs/DECISIONS.md, docs/STATUS.md,
docs/tasks/TASK-131.md
```

## Fuori scope

- Le altre forme del catalogo e le lettere: un task per ciascuna, se
  servono, dopo aver visto cosa funziona col cuore.
- Cambiare le tessere o la schermata (TASK-093).
- Imparare in automatico dalle scelte degli utenti (TASK-130).

## Esito
