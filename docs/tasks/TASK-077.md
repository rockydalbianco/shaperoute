# TASK-077 — Lettere squadrate: un secondo alfabeto da provare accanto a quello di oggi

**Stato**: Done
**Fase**: 4 · **Branch**: `feat/TASK-077-block-letters`

## Obiettivo

Una parola si può scrivere anche con **lettere squadrate**, scelte con un
parametro: tratti dritti ad angolo retto o a 45°, lettere larghe quasi
quanto alte e vicine, la parola girata sulla griglia delle vie. Lo stile di
oggi non cambia, e i campioni dei due stili stanno uno accanto all'altro
per il giudizio dell'utente.

Chiesto dall'utente dopo TASK-071 («sì, provale»), sulla proposta scritta
in fondo a `docs/tasks/TASK-071.md`.

## Contesto da leggere

- `docs/tasks/TASK-071.md` («Proposta per l'utente: lettere squadrate»,
  giudizio dei campioni v1)
- `docs/ROUTE_ENGINE.md` §2 «Parole lettera per lettera», §5 «Lettere che
  si spostano»
- `docs/DECISIONS.md` ADR-0038 (forme dritte entro ±15°), ADR-0044 e
  ADR-0056 (alfabeto a tratto singolo)
- Riferimento dell'utente: screenshot di GPS art su Strava («2024»,
  «2025», «2026», «HURRY»): lettere squadrate, ogni tratto una linea sola
  corsa all'andata e al ritorno lungo una via, alte uguali, larghe e
  vicine; quattro cifre in circa 7–9 km. gpsart.info: prima i tratti che
  fanno riconoscere il soggetto, poi i dettagli.

## Cosa fare

1. `letters_block.json`, nello stesso formato di `letters.json`: O e D
   rettangoli, C e U rettangoli aperti, S e G a gradini, E F H I L T come
   oggi, le diagonali (A, K, M, N, V, W, X, Y, Z) a 45°. Lettere larghe
   0,8–1 dell'altezza, spazi di 0,3 invece di 0,6.
2. Lo stile si sceglie con un parametro (`style="block"`): senza, tutto
   come prima.
3. Una parola squadrata gira sulla griglia delle vie attorno alla partenza
   invece di restare dritta entro ±15° (ADR-0038).
4. Campioni «CIAO», «BELLO», «MAX» squadrati a 15 km a Trento, Levico e
   Milano (solo zone in cache), accanto ai `TASK-071_*_v1.gpx` di oggi, più
   una parola con altre diagonali. Pagina di giudizio con sì / quasi / no,
   «Copia le risposte» e «quale stile preferisci».
5. Dimostrare che le forme che non sono parole, e le parole nello stile di
   oggi, non cambiano.

## Criteri di accettazione

- [x] `letters_block.json` ha le 26 maiuscole; test: ogni tratto è
      orizzontale, verticale o a 45°; larghezze 0,8–1 (I, J, K più
      strette); sulla base solo le lettere che ci stanno sopra (B, D, O,
      Q, U, Z).
- [x] `compose(..., style="block")` usa l'alfabeto squadrato e spazi di
      0,3; senza `style` la parola è identica a prima (test).
- [x] La direzione della griglia delle vie attorno a un punto (test su
      griglie sintetiche girate), e una parola squadrata piazzata sulla
      griglia girata (test).
- [x] Forme e parole nello stile di oggi: stessi punti di `main` (test, e
      cuore, gatto e stella a 15 km nelle tre zone con la stessa impronta).
- [x] Campioni in `samples/`, righe in `LOG.md`, pagina di giudizio
      pubblicata; giudizio dell'utente scritto qui.
- [x] Test, `ruff` e `black` verdi; CI verde.

## File toccati

```
services/route-engine/route_engine/letters_block.json      (nuovo)
services/route-engine/route_engine/street_grid.py          (nuovo)
services/route-engine/route_engine/words.py
services/route-engine/route_engine/optimizer.py            (solo le parole)
services/route-engine/tests/test_block_letters.py          (nuovo)
services/route-engine/tests/test_street_grid.py            (nuovo)
services/route-engine/tests/measure_words.py               (nuovo)
samples/TASK-077_*                                         (nuovi)
samples/LOG.md                                             (righe di TASK-077)
docs/ROUTE_ENGINE.md                                       (sezione parole)
docs/DECISIONS.md                                          (ADR-0072)
docs/STATUS.md                                             (righe di TASK-077)
docs/tasks/TASK-077.md
```

## Fuori scope

- `route_engine/__main__.py` (TASK-076), `network.py`, `image_outline.py`,
  `shapes/`, `services/api`, `packages/shared-types`, `apps/mobile`
  (TASK-073): lo stile nell'app o nell'API è un task a parte, dopo il
  giudizio.
- Cifre: l'alfabeto e le richieste accettano solo A–Z.
- Lettere unite dall'alto e scala per lettera: TASK-067.
- Nessuna dipendenza nuova.

## Cosa è stato fatto

- `letters_block.json`: le 26 maiuscole squadrate (disegno in
  `docs/ROUTE_ENGINE.md` §2, «Lettere squadrate»). Sul disegno le parole
  squadrate sono un po' più lunghe (lettere più larghe): a 15 km «CIAO»
  ha lettere alte 827 m invece di 924, «BELLO» 507 invece di 571, «MAX»
  851 invece di 854.
- `words.compose(..., style="block")` e `optimizer.plan_route(...,
  style="block")`; senza `style`, tutto come prima.
- `street_grid.py`: le direzioni delle vie attorno a un punto; una parola
  squadrata prova, per ogni partenza, le direzioni al più 30° fuori
  dall'orizzontale (`optimizer.grid_turns`).
- `tests/measure_words.py`: scrive e misura le parole in uno dei due
  stili, dalla cache e senza scaricare né salvare zone.

Primo giro, senza limite alla rotazione: a Levico la griglia a 43° vinceva
il conteggio delle strade e «MAX» e «BELLO» venivano di traverso sulla
mappa, illeggibili (lettere di 346 m per «BELLO»). Da qui il limite di 30°
(ADR-0072).

## Campioni

12 GPX squadrati in `samples/` (`TASK-077_*-block_15km_*_v1.gpx`), e
«HURRY» nelle lettere di oggi per il confronto
(`TASK-077_hurry-round_15km_*_v1.gpx`); righe in `samples/LOG.md`. Le
lettere di oggi di «CIAO», «BELLO» e «MAX» sono i `TASK-071_*_v1.gpx`.
Tempi sul PC con due casi alla volta e le altre sessioni al lavoro.
`tests/measure_words.py --words CIAO --zones milano --style block` rifà
`TASK-077_ciao-block_15km_milano_v1.gpx` con gli stessi punti.

Pagina di giudizio (sì / quasi / no, «quale stile preferisci», «Copia le
risposte»): https://claude.ai/artifact/K4e7J6Ue2j9czXKpYWiMYd

| Caso | Squadrate: somigl. · lettere · km · rotazione | Oggi (TASK-071 v1): somigl. · lettere · giudizio |
|---|---|---|
| CIAO Trento | 0,91 · 539 m · 14,9 · −23° | 0,82 · 773 m · sì |
| CIAO Levico | 0,91 · 679 m · 16,4 · −4° (partenza a 1 km) | 0,87 · 693 m · sì |
| CIAO Milano | 0,95 · 827 m · 16,1 · +3° | 0,97 · 810 m · sì |
| BELLO Trento | 0,82 · 451 m · 16,0 · −13° | 0,74 · 571 m · no |
| BELLO Levico | 0,78 · 431 m · 13,6 · +15° | 0,75 · 493 m · quasi |
| BELLO Milano | 0,87 · 507 m · 14,6 · +3° | 0,91 · 571 m · sì |
| MAX Trento | 0,87 · 482 m · 14,6 · +5° | 0,92 · 655 m · sì |
| MAX Levico | 0,85 · 518 m · 14,7 · −6° | 0,89 · 542 m · sì |
| MAX Milano | 0,95 · 734 m · 15,2 · +3° | 0,95 · 724 m · sì |
| HURRY Trento | 0,83 · 441 m · 14,6 · −18° | 0,72 · 428 m · non giudicato (TASK-077_hurry-round) |
| HURRY Levico | 0,76 · 451 m · 16,0 · −22° | 0,79 · 432 m · non giudicato |
| HURRY Milano | 0,91 · 520 m · 15,4 · +8° | 0,90 · 537 m · non giudicato |

Cosa si vede sovrapponendo percorso, disegno e vie:

- **Milano**: la griglia è regolare e le lettere cadono sulle vie; «CIAO»
  e «MAX» squadrati sono grandi come oggi e con angoli netti (una sola
  traccia per «CIAO»).
- **Trento e Levico**: le vie non fanno una griglia. Il percorso fa
  zig-zag come oggi, e la ricerca stringe le lettere per stare nei 15 km:
  a Trento il 65–80% dell'altezza di oggi. A Trento «CIAO» è girata di
  −23° e la C finisce sulla strada attorno al Doss Trento.
- Le diagonali a 45° (M, A, X, R, Y) sulle strade diventano gradini, come
  previsto; dove la griglia manca, zig-zag.
- La somiglianza misurata dal motore è spesso più alta di quanto si
  legga: decide il giudizio a occhio.

## Lo stile di oggi non cambia

Con il codice di `main` (`7212156`) e con quello del branch, a 15 km a
Trento, Levico e Milano (fuori dal repository, `out/t077/`):

- cuore, gatto e stella: stessa impronta SHA-256 dei punti, stessa
  distanza e somiglianza in tutti e 9 i casi;
- «CIAO», «BELLO» e «MAX» senza `style`: stessi punti dei
  `TASK-071_*_v1.gpx` in tutti e 9 i casi.

Nei test: `compose("ciao")` è uguale a `compose("ciao", ALPHABET,
LETTER_GAP)`, e una parola di oggi resta dritta entro ±15° anche su una
griglia girata di 20°.

## Giudizio dell'utente

2026-09-26, sulle lettere squadrate, con quelle di oggi fra parentesi
(TASK-071 v1):

| | Trento | Levico | Milano |
|---|---|---|---|
| CIAO | sì (sì) | quasi (sì) | sì (sì) |
| BELLO | quasi (no) | no (quasi) | no (sì) |
| MAX | no (sì) | quasi (sì) | sì (sì) |
| HURRY | no | no | no |

«HURRY» nelle lettere di oggi non è stato giudicato. **Stile scelto
dall'utente: tutte e due, una scelta nell'app.**

Rispetto a oggi: uno meglio («BELLO» a Trento), tre uguali («CIAO» a
Trento e Milano, «MAX» a Milano), cinque peggio. Vanno bene le parole
corte dove le lettere restano grandi (CIAO e MAX a Milano, 734–827 m);
con cinque lettere a 15 km (BELLO, HURRY: 431–520 m) no, anche sulla
griglia di Milano. Come in TASK-071, la dimensione delle lettere conta più
dello stile.

## Esito

Le lettere squadrate ci sono nel motore come secondo stile
(`style="block"`, ADR-0072), con la parola girata sulla griglia delle vie
al più di 30°; lo stile di oggi resta il predefinito e non cambia di un
punto. Giudizio: squadrate bene per parole corte su una griglia regolare,
peggio di oggi per parole di cinque lettere e dove le vie non fanno
griglia. L'utente vuole **tutti e due gli stili, da scegliere nell'app**:
è un task a parte (lo stile nella richiesta, nell'API, in `shared-types` e
un selettore accanto al campo della parola), da assegnare dal
coordinatore. Da valutare lì: consigliare le squadrate solo per parole
fino a quattro lettere, o più chilometri per lettera.
