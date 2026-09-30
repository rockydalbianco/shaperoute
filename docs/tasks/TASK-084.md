# TASK-084 — Più soggetti in una foto, collegati in una linea sola

**Stato**: In lavorazione (2026-09-30)
**Fase**: 4 · **Branch**: `feat/TASK-084-multi-subject` (parte da `main`)

Chiesto dall'utente il 2026-09-30, provando TASK-079 sull'iPhone: una foto
con più soggetti è rifiutata («The picture shows more than one thing»), e
lui vuole che il motore li disegni tutti, «collegandoli nel punto meno
problematico per non intaccare il disegno». ADR-0079.

**Dipende da TASK-079** (PR #101): usa i `strokes` di un contorno da
immagine nell'API e nell'app. Non partire prima del suo merge; poi
aggiornare questo branch da `main`.

## Deciso dall'utente (non ridiscutere)

- **Il collegamento si vede**: fra due soggetti il percorso fa un tratto
  andata e ritorno, che sulla mappa è una linea fra i due. L'utente lo sa e
  lo accetta.
- **Al più 4 soggetti.** Con più di 4 la foto è rifiutata, con un
  messaggio chiaro.

## Obiettivo

Una foto con 2–4 soggetti chiari su sfondo uniforme dà un contorno solo,
che il percorso disegna in una linea: il soggetto più grande come
contorno, gli altri appesi con un tratto di collegamento nel punto dove
sono più vicini.

## Contesto da leggere

- `docs/DECISIONS.md` ADR-0068 (contorno da immagine, il rifiuto
  `scattered`), ADR-0074 (TASK-079: `strokes` per le immagini)
- `route_engine/image_outline.py` (`_main_piece`: dove oggi si scartano gli
  altri pezzi), `route_engine/shapes/outline.py` (il formato `strokes`: un
  tratto che finisce su un suo punto chiude un anello, e solo il gambo si
  rifà al ritorno)
- `route_engine/outline_edits.py` (TASK-079: limiti e stile dei rifiuti)
- `docs/tasks/TASK-071.md`: andata e ritorno su strade vere prendono a
  volte vie diverse

## Idea tecnica (proposta, da verificare)

Un soggetto in più è uno **`stroke` con l'anello in fondo**, come l'occhio
di TASK-079: il gambo è il collegamento, l'anello è il contorno del
soggetto. `parse_outline` e `plan_shape` lo disegnano già; il lavoro è
nella lettura della foto.

1. In `image_outline.py` tenere fino a 4 pezzi (dopo le macchioline sotto
   l'1%), ognuno lisciato e semplificato come oggi il pezzo più grande.
2. Il più grande è `points`. Gli altri, dal più vicino, si attaccano a ciò
   che è già collegato (contorno o un soggetto prima): il collegamento è
   il segmento più corto fra i due (`shapely.ops.nearest_points`), che non
   attraversa nessun disegno.
3. Ogni soggetto diventa `[attacco, punto sul soggetto, …giro…, punto sul
   soggetto]`. Un collegamento che attraverserebbe un altro soggetto va
   evitato attaccando nell'ordine giusto; se non c'è modo, rifiuto.
4. `MAX_DETAIL_POINTS` (50, TASK-079) non basta per tre contorni: serve un
   limite suo per i soggetti, e va deciso quanti angoli ha ognuno.
5. `/image-outlines` risponde già con `strokes` e `image_strokes` (vuoti
   fino a TASK-079): l'app li disegna e li rimanda senza cambiare niente.
   Da controllare: «Add a part» su un soggetto secondario (l'unione di
   TASK-079 lavora solo sul contorno principale).

## Cosa fare

1. Motore: più soggetti in `image_outline.py`, con test su immagini
   disegnate (due dischi, tre, cinque → rifiuto, uno dentro l'altro).
2. Motivo di rifiuto per più di 4 soggetti (nuovo, o `scattered` con un
   testo diverso): nel contratto e nell'app, in parole semplici.
3. Campioni a 10–15 km a Milano e in una zona di montagna, con il giudizio
   dell'utente (`samples/LOG.md`): il collegamento disturba?
4. App: il testo dell'anteprima («Only the largest piece is kept») non è
   più vero; aggiornarlo.
5. Documenti: `ROUTE_ENGINE.md`, `API.md`, `UI.md`, ADR-0079.

## Criteri di accettazione

- [ ] Due soggetti staccati danno un contorno con un `stroke` ad anello;
      il percorso della CLI li disegna tutti e due in una linea.
- [ ] Il collegamento è il segmento più corto fra i due soggetti e non
      incrocia nessuna linea (`parse_outline` passa).
- [ ] 3 e 4 soggetti funzionano; 5 sono rifiutati con il motivo.
- [ ] Una foto con un soggetto solo dà lo stesso contorno di prima, punto
      per punto.
- [ ] Macchioline, soggetto sul bordo, sfondo non uniforme: come prima.
- [ ] Campioni giudicati dall'utente.
- [ ] Prova sull'iPhone con la foto che oggi è rifiutata.
- [ ] `ruff`, `black --check`, `pytest -m "not network"`; `npm run
      typecheck`, `npm test`, `npm run lint`, `format:check`.

## File toccati

Confermati all'inizio del task (2026-09-30, nessun altro task in
lavorazione). Rispetto ai previsti: in più `outline_edits.py` (solo il
limite `MAX_DETAIL_POINTS`), `docs/PASSAGGIO.md` e i file dei campioni; non
servono `test_contract.py`, il test di `shared-types` e i test dell'app.

```
services/route-engine/route_engine/image_outline.py
services/route-engine/route_engine/outline_edits.py (MAX_DETAIL_POINTS)
services/route-engine/tests/test_image_outline.py
services/api/shaperoute_api/images.py, schemas.py (strokes, descrizioni)
services/api/tests/test_images.py
packages/shared-types/src/index.ts, fixtures/image-limits.json
apps/mobile/src/route/ImageChoice.tsx, problems.ts
docs/ROUTE_ENGINE.md, docs/API.md, docs/UI.md, docs/DECISIONS.md (ADR-0079),
  docs/STATUS.md, docs/PASSAGGIO.md, samples/LOG.md
samples/TASK-084_* (immagini, GPX, overview)
docs/tasks/TASK-084.md
```

## Fuori scope

- Soggetti che si toccano o si sovrappongono (sono già un pezzo solo).
- Scegliere a mano dove collegare, o quali soggetti tenere.
- Più di 4 soggetti; soggetti dentro i buchi di un altro.
- Foto con sfondo non uniforme.

## A che punto siamo (2026-09-30)

Fatto: motore, API, app, documenti, ADR-0079, campioni. Come è andata
rispetto all'idea tecnica:

- i soggetti si lisciano e si semplificano alla scala di **tutto il
  disegno**, non ognuno alla sua (con un soggetto solo è uguale a prima,
  punto per punto: verificato contro il codice di `main`);
- il collegamento può partire anche da un collegamento di prima, non solo
  da un contorno: così non si incrociano mai;
- soggetti più vicini del 2,5% del disegno diventano uno;
- il motivo del rifiuto resta `scattered`, con un testo nuovo;
- `MAX_DETAIL_POINTS` da 50 a 200 (150 per i soggetti, 50 per i dettagli);
- «Add a part» su un soggetto secondario: diventa un anello appeso, non si
  unisce (l'unione resta solo sul contorno principale).

Manca: il giudizio dell'utente sui campioni (`samples/LOG.md`, righe «da
giudicare»; `samples/TASK-084_overview.png`), la prova sull'iPhone, la CI
e il merge.

## Esito

*(a fine task)*
