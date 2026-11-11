# Ciaspole (snowshoes)

TASK-413, ADR-0342. Scelta dell'utente del 2026-11-07: «SI ANCHE FORME
LIBERE SULLA NEVE PIÙ PICCOLE». Le ciaspole sono quindi «Record only»
(TASK-375, ADR-0319), con in più **forme piccole piazzate libere sulla
neve**, più corte di quelle degli altri sport. Le scelte del 2026-11-08 sono
in `tasks/TASK-413.md`:

- «Snowshoes» ❄️, da 0,5 a 3 km;
- la forma fino a 25° di pendenza e **fuori dai boschi** (variante
  `s25open` qui sotto: 48 forme su 60);
- nel gioco come Hike, acceso appena pronto.

Qui ci sono le misure che hanno preparato le scelte.

## Il modello: la forma libera dell'acqua, sulla neve

Sulla neve non c'è una rete: chi va con le ciaspole cammina dove la neve
lo porta. Il modello è quello della canoa e del nuoto (`water_fit.py`,
ADR-0154): **la forma piazzata è il percorso**, se sta tutta dentro
un'area permessa, e si raggiunge da un punto da cui si entra a piedi.
Al posto della fascia d'acqua c'è la **neve su cui si cammina**:

- **il riquadro** attorno alla partenza, 6,6 × 6,6 km (2 km di spostamento
  più 300 m di raccordo, come sull'acqua, più la forma);
- **fuori**:
  - edifici (con 10 m attorno), paesi, campi sportivi, giardini, cave;
  - acqua e zone umide, fiumi (8 m);
  - ghiacciai, roccia, ghiaioni, pareti (20 m);
  - **piste** da discesa, da fondo, da slittino e snow park (30 m dalla
    linea, 10 m dall'area): sulle piste non si cammina;
  - impianti (10 m), ferrovie e strade principali e secondarie (8 m);
  - **i pendii ripidi**: ogni cella di 25 m più ripida di 25°, e 30 m
    attorno a ogni cella oltre i 30° (dove partono le valanghe). Le quote
    sono quelle delle tegole Terrarium, zoom 13, circa 30 m (`CONDIVISO.md`,
    «Le quote»);
- **dentro**: prati e pascoli; nelle misure di base anche i boschi e i
  ruscelli (le varianti li tolgono; la scelta li tiene fuori tutti e due);
- **i punti da cui si entra** (la «riva» dell'acqua): ogni 25 m di strada
  minore, carrareccia o sentiero dentro la neve permessa. La partenza è il
  più vicino che regge la forma, entro 2 km da dove si chiede.

Nella parte 0 era un prototipo del banco (`out/TASK-413/snow.py`, ignorato
da git); dalla parte A1 è il motore: `route_engine/snow.py` costruisce la
neve come `water.WaterArea`, `snowshoeing.plan_snowshoeing` la passa a
`water_fit.fit_shape` così com'è, e le pendenze vengono da
`route_engine/heights.py`, il modulo delle quote condiviso (ADR-0300 G).

## Le misure (parte 0, 2026-11-07)

Sul Mac, `main` `8c1e84da`, `nice -n 10`, un giro per volta dopo i banchi
della sessione carrozzina. Il banco `tools/sport_bench/` misura reti di
strade (`--loader` vuole un grafo): per la neve il giro è `out/TASK-413/snow.py`,
con le stesse forme di base (cerchio, cuore, stella) e le distanze proposte,
**0,5, 1, 2 e 3 km**. Un download Overpass per posto (23–38 s, uno ha preso
un 502 ed è stato rifatto dopo un minuto), 43 tegole delle quote (5 MB).

I posti: le due zone di montagna del banco (Fiemme a Cavalese e Asiago,
tutte e due a 1000 m) e tre posti dove si va davvero con le ciaspole, nella
stessa area:

| Posto | Partenza | Quota | Neve permessa nel riquadro | Punti da cui si entra |
|---|---|---|---|---|
| Fiemme (Cavalese), zona del banco | 46,2915, 11,4605 | 1000 m | 72% | 8253 |
| Asiago, zona del banco | 45,8757, 11,5097 | 1000 m | 78% | 5684 |
| Viote del Monte Bondone | 46,0180, 11,0420 | 1555 m | 43% | 4378 |
| Passo Lavazè (Fiemme) | 46,3567, 11,4947 | 1813 m | 55% | 4857 |
| Passo Rolle (Paneveggio) | 46,2976, 11,7870 | 1989 m | 54% | 4130 |

Cosa toglie di più: i pendii ripidi (Bondone 50% del riquadro, Rolle 36%,
Lavazè 33%, Fiemme 17%, Asiago 3%), la roccia a Rolle (21%), paesi ed
edifici ad Asiago (23%), le piste a Lavazè (11%).

### Forme

Variante di base (`s25`: fino a 25°, 30 m dai pendii oltre 30°, boschi
dentro):

| Posto | Forme entro il 10% della distanza | Spostamento (mediana, max) | Pendenza (98° percentile, max) | Nel bosco (mediana) | Tempo |
|---|---|---|---|---|---|
| Fiemme | 12 su 12 | 294 m, 466 m | 22,9° | 23% | 0,3–0,6 s |
| Asiago | 12 su 12 | 502 m, 1878 m | 10,9° | 0% | 0,5–0,9 s |
| Bondone | 12 su 12 | 403 m, 1208 m | 22,6° | 21% | 0,2–0,4 s |
| Lavazè | 12 su 12 | 178 m, 272 m | 21,9° | 51% | 0,2–0,4 s |
| Rolle | 12 su 12 | 404 m, 508 m | 22,5° | 5% | 0,3–0,5 s |

**60 su 60**: sulla neve una forma piccola entra sempre, quasi sempre a
grandezza piena (tre volte su 60 un po' più piccola: 0,91–0,97). Altre
quattro forme del catalogo (luna, cavallo, albero di Natale, fantasmino) a
1 e 2 km: **40 su 40**.

Per distanza (tutti i posti, variante di base):

| Distanza | Dislivello in salita (mediana, max) | Pendenza (98° percentile, mediana) | Spostamento (mediana, max) |
|---|---|---|---|
| 0,5 km | 20 m, 48 m | 12,9° | 327 m, 465 m |
| 1 km | 37 m, 77 m | 12,8° | 308 m, 500 m |
| 2 km | 82 m, 149 m | 14,6° | 414 m, 979 m |
| 3 km | 165 m, 264 m | 16,6° | 466 m, 1878 m |

Lo spostamento è in linea d'aria, dalla partenza chiesta al punto da cui si
entra: lì ci si arriva a piedi, come alla riva per la canoa.

### Le varianti

| Variante | Cosa cambia | Forme | Dove mancano |
|---|---|---|---|
| `s25` (base) | fino a 25°, 30 m dai pendii oltre 30° | 60 su 60 | — |
| `s20` | fino a 20° | 56 su 60 | Bondone a 2–3 km |
| `s30` | fino a 30°, nessun margine | 60 su 60 | — (ma pendenza fino a 28,5°) |
| `s25open` | senza boschi | 48 su 60 | Bondone, Lavazè, Rolle a 3 km, Fiemme a 3 km |
| `s25dry` | senza attraversare ruscelli | 60 su 60 | — |

- **La pendenza** è la scelta che pesa: 20° fa perdere i 2–3 km al Bondone,
  30° fa passare la forma su pendii da valanga. 25° con il margine è la
  proposta.
- **I boschi**: a Lavazè metà del percorso è nel bosco. Tenerli fuori fa
  perdere un quinto delle forme e allunga lo spostamento (Lavazè, mediana
  da 178 a 768 m). La proposta era tenerli dentro; **l'utente li ha voluti
  fuori** (2026-11-08). Con `s25open` entrano tutte le forme fino a 2 km
  tranne due al Bondone; a 3 km entrano solo ad Asiago e una stella a
  Fiemme e a Rolle. Spostamento: mediana 377–768 m, al massimo 2 km
  (Lavazè).
- **I ruscelli**: ad Asiago 5 attraversamenti su 60 percorsi; tenerli fuori
  non costa nulla. Si propone di tenerli fuori (sotto la neve un ruscello
  può cedere).

### La variante scelta (`chosen`, 2026-11-08)

Fino a 25°, 30 m dai pendii oltre 30°, **senza boschi e senza ruscelli**:

| Posto | Neve permessa | Forme entro il 10% | Spostamento (mediana, max) | Pendenza (98° percentile, max) | Salita (max) | Tempo (max) |
|---|---|---|---|---|---|---|
| Fiemme | 34% | 10 su 12 | 377 m, 440 m | 17,9° | 159 m | 0,35 s |
| Asiago | 52% | 12 su 12 | 502 m, 1863 m | 10,8° | 68 m | 0,68 s |
| Bondone | 15% | 7 su 12 | 439 m, 929 m | 23,2° | 125 m | 0,25 s |
| Lavazè | 25% | 9 su 12 | 768 m, 1999 m | 24,2° | 165 m | 0,76 s |
| Rolle | 24% | 10 su 12 | 478 m, 1269 m | 23,6° | 176 m | 0,31 s |

**48 su 60**. Dove la forma non entra, l'errore dell'acqua dice già a quale
distanza entra: 1,2–1,7 km al Bondone, 1,8–2,6 km altrove. Fino a 2 km
mancano solo il cerchio e il cuore di 2 km al Bondone; a 3 km entrano le
tre forme ad Asiago e la stella a Fiemme e a Rolle. Il testo dell'errore
parla d'acqua: la parte A ne fa uno per la neve.

### Aree protette

Nei cinque riquadri: la Riserva integrale Tre Cime del Monte Bondone e il
Biotopo Torbiera delle Viote (Bondone, 6% del riquadro), due biotopi a
Lavazè (0,2%), il Parco naturale Paneveggio-Pale di San Martino a Rolle
(`protect_class=2`). Delle 60 forme di base **una sola** passa in una
riserva o in un biotopo (Bondone); tenendoli fuori entrano lo stesso tutte
e 60 (`snow.py run --protected`). Si propone di tenere fuori riserve e biotopi e di
lasciare dentro i parchi, dove le ciaspole sono permesse sui percorsi
segnati o fuori a seconda delle regole del parco: l'avviso lo dice.

### Quello che il banco non sa

- **Se c'è neve.** Le zone del banco sono a 1000 m: d'inverno la neve c'è o
  non c'è. Il motore non lo sa; il meteo e la neve di ADR-0338 (stazioni
  sciistiche, MET Norway) sono una stima per le stazioni, non per un prato.
- **Il pericolo valanghe del giorno.** Il bollettino (AINEVA, Meteotrentino)
  non è nei dati; i pendii sopra 25° restano fuori, ma una valanga può
  arrivare da sopra. L'avviso lo dice.
- **Prati privati e divieti locali** (zone di quiete per la fauna, che in
  OSM in Italia quasi non ci sono): fuori dai dati.
- **La neve battuta** dei sentieri invernali segnati (`piste:type=hike`,
  `snowshoe=yes`): in questi cinque riquadri non ci sono. Una forma libera
  non li segue.

## Il costo

- **Il motore**: il piazzamento è quello dell'acqua, 0,2–0,9 s. Costruire
  l'area dai dati: 5–8 s per un riquadro, quasi tutti per leggere 3–7 MB di
  JSON e scaricare le quote la prima volta; l'area di neve in sé 0,3–0,6 s.
  Un modulo nuovo (la neve) e un'attività disegnata come la canoa:
  `water_fit.py` non cambia, quindi canoa e nuoto restano identici, e un
  modulo che nessun file di disegno importa resta fuori dall'impronta
  (come `DRAWN_WATER_ONLY`, `WALK_ONLY`).
- **L'API**: come la canoa, solo dal server (sul telefono nessuna neve,
  come nessuna acqua). Una cartella `snow/` accanto a `water/`, riempita da
  Overpass alla prima richiesta di un posto (3–7 MB grezzi per riquadro,
  meno dopo `compact`), e una cartella delle tegole delle quote (circa
  10 tegole e 1 MB per riquadro). Nessuna zona in memoria: niente grafo.
- **Overpass**: una richiesta per riquadro, 23–38 s. Una prima richiesta in
  un posto nuovo aspetta quel tempo, come la prima acqua di un lago.
- **Le quote**: le tegole Terrarium di AWS, gratuite e senza chiave, già
  usate da 3D, sci e Roller. ADR-0300 (parte G di TASK-347) vuole un
  modulo condiviso per il dislivello: la parte A si accorda con lui tramite
  il Coordinatore invece di farne un altro.

## La parte A1 sul motore vero (2026-11-08)

Banco sul Mac, branch `feat/TASK-413-a1-snow-engine`, `nice -n 10`, un
comando per volta: `out/TASK-413/engine_bench.py` (ignorato da git), con la
neve scaricata dal filtro del motore (`snow.SNOW_QUERY`) e le quote di
`heights.py`, in cache in `out/TASK-413/cache/`. Overpass ha risposto 502
più volte (Asiago, Rolle, Milano): lo script riprova dopo 90 s.

- **Canoa e nuoto non cambiano.** Contro `main`, con la stessa cache: 27
  percorsi di canoa identici punto per punto (`compare --same`: «Nothing
  worse»). I nove percorsi fissi di `test_same_routes.py` (corsa, bici,
  canoa, nuoto) hanno gli stessi hash: l'impronta resta (`SAME_ROUTES_AS`,
  aggiunta di ADR-0342).
- **Le forme sulla neve**, variante scelta (`snow.CHOSEN`), cerchio, cuore e
  stella a 0,5, 1, 2 e 3 km:

  | Posto | Neve permessa | Forme entro il 10% | Spostamento (mediana, max) | Pendenza (98° percentile, max) | Salita (max) | Tempo (max) |
  |---|---|---|---|---|---|---|
  | Fiemme | 33% | 10 su 12 | 377 m, 440 m | 18,1° | 157 m | 3,2 s |
  | Asiago | 50% | 12 su 12 | 502 m, 1863 m | 11,0° | 67 m | 3,0 s |
  | Bondone | 13% | 7 su 12 | 439 m, 1349 m | 23,4° | 146 m | 3,4 s |
  | Lavazè | 25% | 9 su 12 | 735 m, 1999 m | 24,5° | 165 m | 1,7 s |
  | Rolle | 23% | 10 su 12 | 488 m, 1269 m | 23,5° | 181 m | 1,4 s |

  **48 su 60, come il prototipo**, con le stesse forme che mancano: a 3 km
  (tranne Asiago e la stella a Fiemme) e al Bondone da 2 km. L'errore dice
  la distanza a cui la forma entra («the heart does not fit at 3 km on open
  snow here: it fits at 2.4 km»). Il tempo comprende la lettura della neve
  in cache e l'area (0,8–2,2 s per riquadro).
- **Milano (Duomo), il posto senza neve:** 0 su 12. Il primo giro ne dava 6
  nel Parco Sempione: un parco di città disegnato come `relation`, che il
  filtro del prototipo non chiedeva. Il filtro chiede ora anche le
  relation di parchi, giardini, golf e campi. Due cose per A2:
  - **una città è lenta**: 83.000 elementi, 10 s per l'area e fino a 44 s
    per una richiesta, che cerca in briciole di neve permessa (9% del
    riquadro) a ogni scala e inclinazione. L'API può dire prima «niente
    neve» quando attorno alla partenza la neve permessa è poca;
  - **l'errore può proporre meno di 0,5 km** («it fits at 0.2 km»):
    `errors.py` dell'API scarta già le distanze sotto il minimo per
    l'acqua (`WATER_ACTIVITIES`), va esteso alla neve (`FREE_ACTIVITIES`).

## Da rifare nella parte A2

- La neve scaricata dal server alla prima richiesta di un posto, e i tempi
  sul server (la città sopra).

## La parte A3: la città detta subito (2026-11-12)

Sul server, al passo 8, Trento (cuore di 3 km, la prima volta) ha risposto
`shape_not_drawable` in 76,4 s. Al banco sul Mac (Milano dalla cache,
83.000 elementi) la ricerca costa 0,7 s e `snow.build_area` 16–19 s,
quasi tutto shapely elemento per elemento; sul server c'è in più lo
scarico della prima volta. Un controllo «poca neve» prima della ricerca
non serve: il tempo va prima. A3 conta gli edifici attorno alla partenza
prima di leggere la neve.

**Gli edifici per km²** nel riquadro di 4,8 km di lato attorno alla
partenza (`snow.town_bbox`), dalla neve in cache del banco o da Overpass
(`out count`, una richiesta per volta, 2026-11-12; fixture
`snow_built_up.json`):

| Con neve | per km² | Città | per km² |
|---|---|---|---|
| Asiago | 180 | Milano (Duomo) | 700 |
| Cortina d'Ampezzo | 145 | Trento | 350 |
| Bormio | 114 | Belluno | 345 |
| Cavalese | 100 | Aosta | 247 |
| Pinzolo | 77 | Bolzano | 207 |
| Ortisei | 75 | | |
| Livigno | 63 | | |
| Folgaria | 54 | | |
| Selva di Val Gardena | 52 | | |
| Moena | 45 | | |
| Canazei | 43 | | |
| Madonna di Campiglio | 26 | | |
| Sestriere | 20 | | |
| Viote del Monte Bondone | 6 | | |
| Passo Rolle, Passo Lavazè | 2 | | |

- **Soglia 280**: dette subito Milano, Trento (1,25 volte la soglia) e
  Belluno; Asiago resta al 64%. Bolzano e Aosta vanno avanti come prima:
  una soglia sotto 200 starebbe all'11% da Asiago.
- **Il riquadro della richiesta non va**: cresce con la forma, e per un
  cuore di 3 km Bolzano scendeva a 135 per km² (le montagne attorno),
  sotto Asiago (128–170 a seconda della distanza).
- **Overpass, stanotte**: anche un `out count` ha chiesto 30–50 s, o ha
  risposto 502, 504, 429. Col tempo massimo di 6 s il conteggio spesso non
  arriva: la richiesta va avanti come prima e la volta dopo il rifiuto
  viene dalla neve in cache.
- **I tempi** (banco sul Mac, col turno del Mac del Coordinatore): da
  misurare.
