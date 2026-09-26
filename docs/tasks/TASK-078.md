# TASK-078 — Nuove forme candidate: testa di coniglio, zucca, albero di Natale

**Stato**: In corso (in attesa del giudizio dell'utente)
**Fase**: 4 · **Branch**: `feat/TASK-078-rabbit-pumpkin-tree` (parte da `main`)

Assegnato dal coordinatore su richiesta dell'utente (2026-09-26), dopo gli
spunti di gpsart.info (GPS ART Japan): fra i temi più riusciti gli animali
«solo la testa», i temi stagionali e le sagome semplici, fissando prima i
tratti che fanno riconoscere il soggetto. ADR-0073.

## Obiettivo

Tre contorni nuovi, provati sulle strade delle tre zone e pronti per il
giudizio a occhio dell'utente: una testa di coniglio, una zucca di
Halloween, un albero di Natale. Quali entrano nel catalogo lo decide
l'utente, con TASK-065 o dopo.

## Contesto da leggere

- `docs/DECISIONS.md` ADR-0035, ADR-0038, ADR-0039, ADR-0060, ADR-0065
- `docs/tasks/TASK-068.md` (la testa di cane, `sì` in tutte e tre le zone)
- `route_engine/shapes/outlines/dog_head.json`, `tree.json`

## Cosa fare

Deciso dall'agente su delega dell'utente (ADR-0073):

1. **Tre contorni nuovi** in `route_engine/shapes/outlines/`, disegnati
   dall'agente (nessuna immagine, nessuna licenza di terzi), dritti
   (ADR-0038):
   - `rabbit_head.json`: la testa di fronte, tonda, con due orecchie lunghe
     e dritte, strette alla base, aperte di 10°; occhi (anelli di otto
     punti appesi all'angolo fra orecchio e testa), naso (anello su una
     linea che sale dal mento) e bocca (due linee corte) ripassati, come la
     testa di cane;
   - `pumpkin.json`: tre spicchi che si toccano in quattro tacche, due
     sopra e due sotto, e il picciolo storto in cima, nel contorno; occhi a
     triangolo appesi alle tacche di sopra e un sorriso appeso al fondo,
     ripassati;
   - `christmas_tree.json`: un abete a tre piani, ogni piano con il bordo
     che risale verso il tronco, e il tronco; la stella a cinque punte
     ripassata, appesa alla cima.
2. **Test** `tests/test_seasonal_outlines.py`, come
   `test_animal_outlines.py` e `test_dog_head_outline.py`; i contorni sono
   controllati anche da `test_outline.py`.
3. **Campioni** a 15 km a Trento, Levico e Milano come TASK-064 e
   TASK-068: `read_outline`, `plan_shape`, `tilt_limit` come `--outline`,
   con i grafi di zona dell'API in memoria (`ZoneGraphs`, con il download
   vietato), solo zone in cache, nessun ritaglio su C:.
4. **Pagina di giudizio** con sì / quasi / no per forma e zona e «Copia le
   risposte».

## Criteri di accettazione

- [x] Tre contorni validi (`test_outline.py`) e con i test propri
      (`test_seasonal_outlines.py`).
- [x] `ruff`, `black --check`, `pytest -m "not network"` puliti in
      `services/route-engine`.
- [x] 9 campioni in `samples/`, righe in `samples/LOG.md` «in attesa».
- [x] Pagina di giudizio pubblicata.
- [ ] Giudizio dell'utente in `samples/LOG.md` (dopo la PR, non per il
      merge).

## File toccati

```
services/route-engine/route_engine/shapes/outlines/rabbit_head.json      (nuovo)
services/route-engine/route_engine/shapes/outlines/pumpkin.json          (nuovo)
services/route-engine/route_engine/shapes/outlines/christmas_tree.json   (nuovo)
services/route-engine/tests/test_seasonal_outlines.py                    (nuovo)
samples/TASK-078_{rabbit-head,pumpkin,christmas-tree}_15km_{trento,levico,milano}_v1.gpx  (nuovi)
samples/LOG.md                                   (righe in più)
docs/tasks/TASK-078.md                           (nuovo)
docs/DECISIONS.md (ADR-0073), docs/STATUS.md     (righe in più)
```

## Fuori scope

- Il catalogo: `shapes/__init__.py`, `packages/shared-types`, il prompt
  dell'AI, `apps/mobile`. Ci entra solo ciò che l'utente approva.
- `tree.json` (l'albero di TASK-034/037): resta com'è.
- `__main__.py` (TASK-076), `words.py`, `letters*.json`, `optimizer.py`
  (TASK-077), `network.py`, `image_outline.py`: nessun parametro del motore
  cambia.
- Scaricare zone nuove.

## Bozze scartate (2026-09-26)

Provate sulle strade prima dei campioni, con lo stesso motore; confronto a
occhio dell'agente, non un giudizio. Non sono nei campioni.

- **Coniglio con orecchie strette** (larghe 0,34, lunghe 1,0): a Trento si
  legge (0,98), a Levico un orecchio finisce in montagna e la testa si
  aggroviglia (0,78). Con le orecchie più larghe e un po' più corte (0,42
  per 0,92) e occhi più grandi, Levico sale a 0,88 e le orecchie si
  vedono; Trento resta 0,97.
- **Zucca con i denti nel sorriso**: i denti, larghi 0,12, spariscono in
  tutte e tre le zone e il sorriso diventa un groviglio a Trento. Tolti i
  denti e ingranditi gli occhi, gli occhi a triangolo si leggono a Milano.
- **Zucca con le tacche più profonde** (spicchi di lato più piccoli): a
  Levico peggiore, 13,1 km invece di 15, sagoma spezzata; a Trento uguale.
- **Albero con piani poco sporgenti e stella piccola**: a Trento la stella
  sale sulla collina e i piani si perdono (0,92). Con i piani più larghi e
  la stella più grande i piani si intuiscono sul lato sinistro (0,93, ma
  la partenza si sposta di 1 km).

## Campioni (2026-09-26)

15 km, partenze di `docs/TESTING.md`, solo zone già in cache. Somiglianza
del motore · distanza reale · tempo. Tutti e 9 hanno un percorso.
Pagina di giudizio: https://claude.ai/artifact/JGNRhquxcfjtj6a1zxcTJB

| | Trento | Levico | Milano |
|---|---|---|---|
| coniglio (`rabbit_head`) | 0,97 · 15,3 km · 11 s | 0,88 · 15,1 km · 28 s, partenza a 250 m | 0,97 · 15,2 km · 26 s |
| zucca (`pumpkin`) | 0,92 · 16,2 km · 13 s | 0,83 · 15,7 km · 23 s | 1,00 · 16,0 km · 19 s |
| albero di Natale (`christmas_tree`) | 0,93 · 16,0 km · 44 s, partenza a 1 km | 0,81 · 14,5 km · 24 s | 1,00 · 15,7 km · 30 s |

Prima impressione dell'agente, **non un giudizio**: il coniglio si
riconosce a Trento e Milano (due orecchie dritte, occhi come riquadri), a
Levico si intuisce; la zucca a Milano ha sagoma, picciolo e occhi, il
sorriso esce come un rettangolo; a Trento e Levico sagoma e picciolo, i
dettagli poco; l'albero a Milano è netto (piani, tronco, stella come
macchia in cima), a Trento e Levico no, come l'albero di TASK-034/037.
Il giudizio lo dà l'utente, e va in `samples/LOG.md`.

## Esito

*(dopo il giudizio dell'utente)*
