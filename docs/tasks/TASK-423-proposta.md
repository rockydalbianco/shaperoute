# TASK-423 / ADR-0351 — «Play» grande: la proposta

> **Approvata dall'utente il 2026-11-08 con «Sì, approvo»**, così com'è,
> comprese le tre scelte del §9 (catalogo, `utc_offset_min`, premi sul
> profilo solo se scelti).
>
> Copia congelata della proposta approvata (l'originale era in
> `out/TASK-423/proposta.md`). Il task file è `TASK-423.md`; le regole
> del gioco restano in `docs/GIOCO.md`. I testi finali nelle 5 lingue si
> approvano con ogni parte: dove cambiano, vale il codice.
> Stato di partenza verificato su `main` (6d140645, 2026-11-08): **12 forme**
> (non 14: 8 per distanza da 5 a 1 000 km e 4 di passo), tempi migliori su
> 1 000 / 5 000 / 10 000 / 21 097 m, `RULES_VERSION = 2`, sfide di squadra
> (TASK-296 C/D), sfide del mese di TASK-343 (la parte B, #667, è già in
> `main`).

## 0. In breve

- **94 forme in 10 collezioni** (oggi 12 in una griglia). Le 12 forme di
  oggi restano con **lo stesso id e lo stesso requisito**: chi le ha, le
  tiene, e nessuno perde niente.
- **Km da 1 a 10 000**: 24 gradini sui km totali + 6 traguardi di una sola
  corsa (prima 5K, 10K, mezza, 30K, maratona, ultra 50K).
- **Passo su 10 distanze** (400 m, 1 km, miglio, 3 km, 5 km, 10 km, 15 km,
  mezza, 30 km, maratona), **64 livelli** in tutto, da principiante a forte.
- **Sfide personali** che ruotano da sole: 3 a settimana e 2 al mese, ognuna
  con tre gradini (bronzo, argento, oro). **Streak** di settimane di fila.
- **Una lista sola in «Challenges»**: In corso · Disponibili · Finite, con
  personali, streak, squadra e il link alla sfida del mese.
- **Premi solo dentro l'app**: edizioni bronzo/argento/oro, 10 cornici
  (una per collezione completa), 8 titoli, 8 badge. Niente punti, niente
  classifiche (TASK-241), niente denaro, niente pubblicità.
- Ogni forma è un requisito e ogni requisito è una forma: «Play mostra
  tutto», senza tabelle a parte.

## 1. Le collezioni

Ogni collezione ha la sua pagina, con «7 / 13», la griglia delle sue forme
in ordine di difficoltà e il premio in fondo (la cornice, §6.2). La pagina
«Collection» diventa la lista delle 10 collezioni, ognuna con il nome, il
contorno della prima forma non ancora presa, «7 / 13» e la barra.

| # | id | en | de | it | es | fr | Forme | Che cosa la riempie |
|---|---|---|---|---|---|---|---|---|
| 1 | `geometry` | Geometry | Geometrie | Geometrie | Geometría | Géométrie | 10 | i primi km (1–42) e due passi |
| 2 | `animals` | Animals | Tiere | Animali | Animales | Animaux | 13 | i passi su 400 m e 1 km: dalla lumaca al ghepardo |
| 3 | `sea` | Sea | Meer | Mare | Mar | Mer | 5 | i passi sul miglio |
| 4 | `sky` | Sky | Himmel | Cielo | Cielo | Ciel | 9 | i km grandi, fino a 10 000 |
| 5 | `nature` | Nature | Natur | Natura | Naturaleza | Nature | 12 | i km di mezzo e i passi sui 15 km |
| 6 | `city` | City | Stadt | Città | Ciudad | Ville | 13 | i passi su 3 km e 5 km |
| 7 | `milestones` | Milestones | Meilensteine | Traguardi | Hitos | Jalons | 7 | le corse singole (5K → 50K) |
| 8 | `seasons` | Holidays & seasons | Feste & Jahreszeiten | Feste e stagioni | Fiestas y estaciones | Fêtes et saisons | 7 | i passi sui 10 km |
| 9 | `legends` | Legends | Legenden | Leggende | Leyendas | Légendes | 11 | i passi su mezza e 30 km |
| 10 | `greece` | Ancient Greece | Antikes Griechenland | Antica Grecia | Antigua Grecia | Grèce antique | 7 | i passi sulla maratona (nata in Grecia) |
| | | | | | | | **94** | |

## 2. Il catalogo completo (94 forme)

Legenda del **requisito**: «K 42» = 42 km contati in totale; «1×5K» = una
corsa con 5 km di fila (§3.2); «5k 5:30» = 5 km di fila in una corsa a
5:30/km o meglio. **Premio**: «forma» = solo la forma; «+ ed.» = la forma
con le edizioni bronzo/argento/oro (§6.1); un titolo, se ne dà uno (§6.3).
**Contorno**: ★ = una delle 12 forme di oggi (invariata); E = contorno che
esiste già in `route_engine/shapes/` (letto, il motore non si tocca);
P = calcolato in `game_catalog.py` (poligono regolare o curva); D = disegno
nuovo, un poligono in coordinate del disegno (0–1) dentro `game_catalog.py`.

### 2.1 Geometrie — 10

| id | en | de | it | es | fr | Requisito | Premio | Contorno |
|---|---|---|---|---|---|---|---|---|
| `oval` | Oval | Oval | Ovale | Óvalo | Ovale | K 1 | forma | P |
| `pentagon` | Pentagon | Fünfeck | Pentagono | Pentágono | Pentagone | K 3 | forma | P |
| `triangle` | Triangle | Dreieck | Triangolo | Triángulo | Triangle | K 5 | forma | ★ |
| `square` | Square | Quadrat | Quadrato | Cuadrado | Carré | K 10 | forma | ★ |
| `octagon` | Octagon | Achteck | Ottagono | Octógono | Octogone | K 15 | forma | P |
| `hexagon` | Hexagon | Sechseck | Esagono | Hexágono | Hexagone | K 20 | forma | ★ |
| `plus` | Plus | Plus | Più | Más | Plus | K 30 | forma | P |
| `circle` | Circle | Kreis | Cerchio | Círculo | Cercle | K 42 | forma | ★ |
| `diamond` | Diamond | Raute | Diamante | Diamante | Losange | 5k 5:30 | + ed. | ★ |
| `arrow` | Arrow | Pfeil | Freccia | Flecha | Flèche | 10k 6:00 | + ed. | ★ |

### 2.2 Animali — 13 (400 m e 1 km)

| id | en | de | it | es | fr | Requisito | Premio | Contorno |
|---|---|---|---|---|---|---|---|---|
| `snail` | Snail | Schnecke | Lumaca | Caracol | Escargot | 400m 6:00 | + ed. | E |
| `turtle` | Turtle | Schildkröte | Tartaruga | Tortuga | Tortue | 400m 5:00 | + ed. | D |
| `duck` | Duck | Ente | Anatra | Pato | Canard | 400m 4:30 | + ed. | D |
| `rabbit` | Rabbit | Hase | Coniglio | Conejo | Lapin | 400m 4:00 | + ed. | E (`rabbit_head`) |
| `dog` | Dog | Hund | Cane | Perro | Chien | 400m 3:30 | + ed. | E |
| `cheetah` | Cheetah | Gepard | Ghepardo | Guepardo | Guépard | 400m 3:00 | + ed. | D |
| `penguin` | Penguin | Pinguin | Pinguino | Pingüino | Pingouin | 1k 7:00 | + ed. | D |
| `cat` | Cat | Katze | Gatto | Gato | Chat | 1k 6:30 | + ed. | E |
| `bear` | Bear | Bär | Orso | Oso | Ours | 1k 6:00 | + ed. | D |
| `butterfly` | Butterfly | Schmetterling | Farfalla | Mariposa | Papillon | 1k 5:30 | + ed. | E |
| `bird` | Bird | Vogel | Uccello | Pájaro | Oiseau | 1k 4:30 | + ed. | E |
| `fox` | Fox | Fuchs | Volpe | Zorro | Renard | 1k 4:00 | + ed. | D |
| `horse` | Horse | Pferd | Cavallo | Caballo | Cheval | 1k 3:30 | + ed. | E |

(Il gradino 1k 5:00 è il fulmine di oggi, nel Cielo.)

### 2.3 Mare — 5 (il miglio, 1 609 m)

| id | en | de | it | es | fr | Requisito | Premio | Contorno |
|---|---|---|---|---|---|---|---|---|
| `crab` | Crab | Krabbe | Granchio | Cangrejo | Crabe | mile 7:00 | + ed. | D |
| `octopus` | Octopus | Krake | Polpo | Pulpo | Pieuvre | mile 6:00 | + ed. | D |
| `fish` | Fish | Fisch | Pesce | Pez | Poisson | mile 5:00 | + ed. | E |
| `whale` | Whale | Wal | Balena | Ballena | Baleine | mile 4:30 | + ed. | D |
| `dolphin` | Dolphin | Delfin | Delfino | Delfín | Dauphin | mile 4:00 | + ed. | D |

### 2.4 Cielo — 9

| id | en | de | it | es | fr | Requisito | Premio | Contorno |
|---|---|---|---|---|---|---|---|---|
| `star` | Star | Stern | Stella | Estrella | Étoile | K 100 | forma · titolo «Corridore» | ★ |
| `lightning` | Lightning | Blitz | Fulmine | Rayo | Éclair | 1k 5:00 | + ed. | ★ |
| `moon` | Moon | Mond | Luna | Luna | Lune | K 500 | forma | ★ |
| `sun` | Sun | Sonne | Sole | Sol | Soleil | K 1 000 | forma · titolo «Esploratore» | ★ |
| `cloud` | Cloud | Wolke | Nuvola | Nube | Nuage | K 1 500 | forma | E |
| `rainbow` | Rainbow | Regenbogen | Arcobaleno | Arcoíris | Arc-en-ciel | K 2 000 | forma | D |
| `comet` | Comet | Komet | Cometa | Cometa | Comète | K 3 000 | forma · titolo «Viaggiatore» | D |
| `planet` | Planet | Planet | Pianeta | Planeta | Planète | K 5 000 | forma | D |
| `rocket` | Rocket | Rakete | Razzo | Cohete | Fusée | K 10 000 | forma · titolo «Giramondo» | D |

### 2.5 Natura — 12

| id | en | de | it | es | fr | Requisito | Premio | Contorno |
|---|---|---|---|---|---|---|---|---|
| `drop` | Drop | Tropfen | Goccia | Gota | Goutte | K 50 | forma | E |
| `leaf` | Leaf | Blatt | Foglia | Hoja | Feuille | K 75 | forma | D |
| `tree` | Tree | Baum | Albero | Árbol | Arbre | K 150 | forma | E |
| `flower` | Flower | Blume | Fiore | Flor | Fleur | K 200 | forma | P (5 petali) |
| `apple` | Apple | Apfel | Mela | Manzana | Pomme | K 300 | forma | E |
| `mushroom` | Mushroom | Pilz | Fungo | Seta | Champignon | K 400 | forma | D |
| `mountain` | Mountain | Berg | Montagna | Montaña | Montagne | K 750 | forma | D |
| `cactus` | Cactus | Kaktus | Cactus | Cactus | Cactus | 15k 7:00 | + ed. | D |
| `clover` | Clover | Kleeblatt | Quadrifoglio | Trébol | Trèfle | 15k 6:00 | + ed. | P (4 petali) |
| `palm` | Palm tree | Palme | Palma | Palmera | Palmier | 15k 5:30 | + ed. | D |
| `acorn` | Acorn | Eichel | Ghianda | Bellota | Gland | 15k 5:00 | + ed. | D |
| `volcano` | Volcano | Vulkan | Vulcano | Volcán | Volcan | 15k 4:30 | + ed. | D |

### 2.6 Città — 13 (3 km e 5 km)

| id | en | de | it | es | fr | Requisito | Premio | Contorno |
|---|---|---|---|---|---|---|---|---|
| `house` | House | Haus | Casa | Casa | Maison | 3k 7:00 | + ed. | E |
| `igloo` | Igloo | Iglu | Igloo | Iglú | Igloo | 3k 6:00 | + ed. | D |
| `shop` | Shop | Laden | Negozio | Tienda | Boutique | 3k 5:30 | + ed. | D |
| `windmill` | Windmill | Windmühle | Mulino a vento | Molino | Moulin | 3k 5:00 | + ed. | D |
| `tower` | Tower | Turm | Torre | Torre | Tour | 3k 4:30 | + ed. | D |
| `clock_tower` | Clock tower | Uhrturm | Torre dell'orologio | Torre del reloj | Tour de l'horloge | 3k 4:00 | + ed. | D |
| `bridge` | Bridge | Brücke | Ponte | Puente | Pont | 5k 7:30 | + ed. | D |
| `arch` | Arch | Torbogen | Arco | Arco | Arc | 5k 7:00 | + ed. | D |
| `lighthouse` | Lighthouse | Leuchtturm | Faro | Faro | Phare | 5k 6:30 | + ed. | D |
| `ferris_wheel` | Ferris wheel | Riesenrad | Ruota panoramica | Noria | Grande roue | 5k 6:00 | + ed. | D |
| `castle` | Castle | Burg | Castello | Castillo | Château | 5k 5:00 | + ed. | D |
| `pyramid` | Pyramid | Pyramide | Piramide | Pirámide | Pyramide | 5k 4:30 | + ed. | D |
| `skyscraper` | Skyscraper | Wolkenkratzer | Grattacielo | Rascacielos | Gratte-ciel | 5k 4:00 | + ed. | D |

(Il gradino 5k 5:30 è il diamante di oggi, in Geometrie.)

### 2.7 Traguardi — 7 (una corsa sola)

| id | en | de | it | es | fr | Requisito | Premio | Contorno |
|---|---|---|---|---|---|---|---|---|
| `balloon` | Balloon | Ballon | Palloncino | Globo | Ballon | 1×5K | + ed. | E |
| `gift` | Gift | Geschenk | Regalo | Regalo | Cadeau | 1×10K | + ed. | D |
| `cake` | Cake | Torte | Torta | Pastel | Gâteau | 1×21,1K (mezza) | + ed. | D |
| `heart` | Heart | Herz | Cuore | Corazón | Cœur | K 250 | forma | ★ |
| `fireworks` | Fireworks | Feuerwerk | Fuochi d'artificio | Fuegos artificiales | Feu d'artifice | 1×30K | + ed. | P (stella a 12 raggi) |
| `medal` | Medal | Medaille | Medaglia | Medalla | Médaille | 1×42,2K (maratona) | + ed. · titolo «Maratoneta» | D |
| `trophy` | Trophy | Pokal | Trofeo | Trofeo | Trophée | 1×50K (ultra) | + ed. · titolo «Ultramaratoneta» | D |

### 2.8 Feste e stagioni — 7 (10 km)

| id | en | de | it | es | fr | Requisito | Premio | Contorno |
|---|---|---|---|---|---|---|---|---|
| `ice_cream` | Ice cream | Eis | Gelato | Helado | Glace | 10k 7:30 | + ed. | E |
| `umbrella` | Umbrella | Regenschirm | Ombrello | Paraguas | Parapluie | 10k 7:00 | + ed. | D |
| `snowman` | Snowman | Schneemann | Pupazzo di neve | Muñeco de nieve | Bonhomme de neige | 10k 6:30 | + ed. | D |
| `pumpkin` | Pumpkin | Kürbis | Zucca | Calabaza | Citrouille | 10k 5:30 | + ed. | E |
| `ghost` | Ghost | Gespenst | Fantasma | Fantasma | Fantôme | 10k 5:00 | + ed. | E |
| `snowflake` | Snowflake | Schneeflocke | Fiocco di neve | Copo de nieve | Flocon | 10k 4:30 | + ed. | P |
| `christmas_tree` | Christmas tree | Weihnachtsbaum | Albero di Natale | Árbol de Navidad | Sapin de Noël | 10k 4:00 | + ed. | E |

(Il gradino 10k 6:00 è la freccia di oggi, in Geometrie.)

### 2.9 Leggende — 11 (mezza e 30 km)

| id | en | de | it | es | fr | Requisito | Premio | Contorno |
|---|---|---|---|---|---|---|---|---|
| `shield` | Shield | Schild | Scudo | Escudo | Bouclier | half 7:30 | + ed. | D |
| `wand` | Magic wand | Zauberstab | Bacchetta magica | Varita mágica | Baguette magique | half 7:00 | + ed. | D |
| `wizard_hat` | Wizard hat | Zauberhut | Cappello da mago | Sombrero de mago | Chapeau de magicien | half 6:30 | + ed. | D |
| `crown` | Crown | Krone | Corona | Corona | Couronne | half 6:00 | + ed. | ★ |
| `unicorn` | Unicorn | Einhorn | Unicorno | Unicornio | Licorne | half 5:30 | + ed. | D |
| `dragon` | Dragon | Drache | Drago | Dragón | Dragon | half 5:00 | + ed. | D |
| `phoenix` | Phoenix | Phönix | Fenice | Fénix | Phénix | half 4:30 | + ed. | D |
| `chest` | Treasure chest | Schatztruhe | Forziere | Cofre | Coffre au trésor | 30k 7:00 | + ed. | D |
| `lamp` | Magic lamp | Wunderlampe | Lampada magica | Lámpara mágica | Lampe magique | 30k 6:00 | + ed. | D |
| `mermaid` | Mermaid | Meerjungfrau | Sirena | Sirena | Sirène | 30k 5:30 | + ed. | D |
| `griffin` | Griffin | Greif | Grifone | Grifo | Griffon | 30k 5:00 | + ed. | D |

### 2.10 Antica Grecia — 7 (maratona)

| id | en | de | it | es | fr | Requisito | Premio | Contorno |
|---|---|---|---|---|---|---|---|---|
| `amphora` | Amphora | Amphore | Anfora | Ánfora | Amphore | marathon 7:30 | + ed. | D |
| `laurel` | Laurel wreath | Lorbeerkranz | Corona d'alloro | Corona de laurel | Couronne de laurier | marathon 7:00 | + ed. | D |
| `helmet` | Helmet | Helm | Elmo | Casco | Casque | marathon 6:30 | + ed. | D |
| `lyre` | Lyre | Leier | Lira | Lira | Lyre | marathon 6:00 | + ed. | D |
| `column` | Column | Säule | Colonna | Columna | Colonne | marathon 5:30 | + ed. | D |
| `pegasus` | Pegasus | Pegasus | Pegaso | Pegaso | Pégase | marathon 5:00 | + ed. | D |
| `torch` | Torch | Fackel | Fiaccola | Antorcha | Flambeau | marathon 4:30 | + ed. | D |

**Contorni**: 12 di oggi, 18 dal motore, 8 calcolati, **56 disegni nuovi**.
I disegni nuovi sono silhouette semplici (20–60 punti), riconoscibili a
60 px. Nella parte A preparo un foglio con tutte le 94 forme
(`out/TASK-423/forme.png`): lo approvi prima del merge, e una forma che non
convince si cambia con una più semplice.

## 3. Le scale

### 3.1 Km totali — 24 gradini

1 · 3 · 5★ · 10★ · 15 · 20★ · 30 · 42★ · 50 · 75 · 100★ · 150 · 200 ·
250★ · 300 · 400 · 500★ · 750 · 1 000★ · 1 500 · 2 000 · 3 000 · 5 000 ·
10 000 km (★ = forma di oggi). Contano come oggi: corse, camminate,
escursioni e roller registrati dall'app, con il tetto di 120 km al giorno.

### 3.2 Traguardi di una corsa — 6

Prima 5K · 10K · mezza (21 097 m) · 30K · maratona (42 195 m) · ultra 50K.
Vale **una corsa** (`running`) con quella distanza di fila: cioè la corsa ha
un tempo migliore su quella distanza (`best_s`). Così valgono le stesse
regole dei tempi (niente buchi oltre 30 s, una posizione ogni 10 s, niente
pause manuali) e le camminate restano fuori, come per i tempi (TASK-371).
Per questo i tempi migliori si calcolano anche su **50 000 m**.

**Compatibilità con le app già installate.** L'app di oggi rifiuta tutto il
catalogo se trova un tipo di requisito che non conosce (`isGoal` in
`gameApi.ts`), e «Play» sparirebbe. Quindi un traguardo resta un requisito
`pace` con passo 20:00/km (qualunque corsa lo soddisfa) più un campo nuovo
`single_run: true`: l'app nuova scrive «One run of 5 km», quella vecchia
«5 km under 20:00/km», che resta vero.

### 3.3 Passo — 10 distanze, 64 livelli

| Distanza | Livelli (min/km), da principiante a forte | N |
|---|---|---|
| 400 m | 6:00 · 5:00 · 4:30 · 4:00 · 3:30 · 3:00 | 6 |
| 1 km | 7:00 · 6:30 · 6:00 · 5:30 · 5:00★ · 4:30 · 4:00 · 3:30 | 8 |
| 1 miglio (1 609 m) | 7:00 · 6:00 · 5:00 · 4:30 · 4:00 | 5 |
| 3 km | 7:00 · 6:00 · 5:30 · 5:00 · 4:30 · 4:00 | 6 |
| 5 km | 7:30 · 7:00 · 6:30 · 6:00 · 5:30★ · 5:00 · 4:30 · 4:00 | 8 |
| 10 km | 7:30 · 7:00 · 6:30 · 6:00★ · 5:30 · 5:00 · 4:30 · 4:00 | 8 |
| 15 km | 7:00 · 6:00 · 5:30 · 5:00 · 4:30 | 5 |
| mezza (21 097 m) | 7:30 · 7:00 · 6:30 · 6:00★ · 5:30 · 5:00 · 4:30 | 7 |
| 30 km | 7:00 · 6:00 · 5:30 · 5:00 | 4 |
| maratona (42 195 m) | 7:30 · 7:00 · 6:30 · 6:00 · 5:30 · 5:00 · 4:30 | 7 |

- `BEST_DISTANCES_M` passa da 4 a 11 distanze (le 10 sopra + 50 000 m per
  l'ultra), con lo stesso calcolo O(n) di oggi. `RULES_VERSION` 2 → 3 e
  backfill: i tempi nuovi valgono anche per le corse vecchie.
- Le camminate continuano a non avere tempi. L'app mostra i passi nelle
  unità scelte (min/mi con le miglia).

## 4. Le sfide personali

Da soli, **senza iscriversi**: ci sono per tutti, ogni settimana e ogni
mese, e contano da sole. Tutti hanno le stesse sfide nella stessa settimana
(se ne può parlare con gli amici). Ogni sfida ha **tre gradini** — bronzo,
argento, oro — su una barra sola: fare l'oro vuol dire avere anche argento
e bronzo. Il premio è la **medaglia** del gradino più alto (§6.4).

**Che cosa conta.** «Uscita» = una corsa, camminata, escursione o roller
che conta per il gioco con almeno 1 km. I km sono quelli contati (come le
forme). Le sfide di passo valgono solo per le corse.

### 4.1 Settimanali — 3 per settimana, da lunedì a domenica

Tre posti; ogni posto gira sulla sua lista, una voce a settimana, con il
numero della settimana: le combinazioni si ripetono ogni 15 settimane.

| Posto | Sfida | Bronzo · Argento · Oro |
|---|---|---|
| 1 Volume | Km della settimana | 10 · 20 · 40 km |
| | Giorni attivi | 2 · 4 · 6 giorni con un'uscita |
| | Uscite lunghe | 2 · 3 · 5 uscite di almeno 3 km |
| 2 Abitudine | Di buon'ora | 1 · 2 · 3 uscite iniziate prima delle 8:00 |
| | Weekend | 5 · 10 · 20 km fra sabato e domenica |
| | Di sera | 1 · 2 · 3 uscite iniziate dopo le 19:00 |
| 3 Corsa | 5 km di passo | 5 km di fila sotto 7:00 · 6:00 · 5:00 /km |
| | Lungo | un'uscita di 8 · 12 · 18 km |
| | 1 km veloce | 1 km sotto 6:00 · 5:00 · 4:15 /km |
| | 10 km di passo | 10 km di fila sotto 7:30 · 6:30 · 5:30 /km |
| | Doppietta | 2 · 3 · 4 corse di almeno 5 km |

### 4.2 Mensili — 2 per mese

| Posto | Mesi | Sfida | Bronzo · Argento · Oro |
|---|---|---|---|
| 1 | dispari | Km del mese | 50 · 100 · 200 km |
| | pari | Giorni attivi | 8 · 12 · 16 giorni |
| 2 | dispari | Le lunghe del mese | 1 · 3 · 6 uscite di almeno 10 km |
| | pari | Mattiniero | 3 · 6 · 10 uscite prima delle 8:00 |

### 4.3 L'ora del telefono — dato nuovo, la privacy passa da te

«Prima delle 8», «dopo le 19», il weekend e l'inizio della settimana
vogliono l'ora **locale** della corsa. Oggi il server ha solo l'ora UTC.
Proposta: l'app manda con la corsa la differenza del suo orologio da UTC
(`utc_offset_min`, per esempio `+60`), salvata in `game_runs`; la tabella
`runs` non cambia. Non dice dove si è, solo il fuso. Le corse vecchie e le
app vecchie valgono in UTC. **Il testo della privacy cambia**: lo scrivo
nella parte C e te lo faccio approvare. (Senza questo dato: settimane in
UTC e niente sfide di orario.)

### 4.4 Streak

Una carta sola con **tre righe**, senza scegliere niente:
«1 uscita a settimana: 14 settimane · 2: 6 · 3: 2». Una settimana conta
quando ha almeno N uscite; la streak è il numero di settimane di fila fino
all'ultima finita, più quella in corso se ha già raggiunto N (una settimana
in corso non la rompe finché non finisce). Si calcola da tutta la storia
del gioco, quindi chi corre da mesi ha la sua streak dal primo giorno.
Si tiene anche la streak più lunga di sempre. Funzione pura, testata.

### 4.5 Squadra e sfide del mese

- **Squadra**: come oggi, con tutte le 94 forme, **fino a 20 pezzi**
  (oggi 12) e **fino a 30 giorni** (oggi 14). Nella scelta della forma, le
  forme divise per collezione. Le app vecchie continuano a offrire fino a
  12 pezzi.
- **Sfide del mese** (TASK-343, già in `main`): solo **una riga con il
  link** alla loro pagina, con il tema del mese. Niente copie.

### 4.6 «Challenges»: una lista sola

- **In corso**: le 3 settimanali e le 2 mensili con barra a tre gradini e
  «2 days left»; la streak; la sfida attiva di ogni mia squadra; la sfida
  del mese se mi sono iscritto.
- **Disponibili**: le squadre senza sfida («New challenge»), «Create team»
  e «Join team», la sfida del mese se non mi sono iscritto (link).
- **Finite**: le personali delle ultime 8 settimane con la medaglia presa,
  le sfide di squadra finite o scadute, il link all'archivio delle sfide del
  mese. Le personali cominciano la settimana del rilascio (niente medaglie
  per il passato).

## 5. Che cosa conta il server (dati)

- Parte B: niente migrazione (`best_s` è già jsonb).
- Parte C, una migrazione: `game_runs.utc_offset_min` (smallint, `NULL` =
  UTC) e `game_personal` — `(user_id, period_start, challenge_id)`,
  `tier` (1–3), `done_at`, `run_id` (`SET NULL`), `CASCADE` con l'account.
  Si scrive nella transazione del salvataggio, come i pezzi; il backfill non
  la tocca.
- Parte E, una migrazione: `game_unlocks.edition` accetta anche `silver` e
  `gold` (la riga `solo` di oggi è il bronzo); `game_prefs` — `user_id`,
  `title_id`, `frame_id`, `shown_badges` (fino a 3).
- Numeri delle migrazioni: il primo libero al merge.

## 6. I premi (solo dentro l'app)

### 6.1 Edizioni bronzo / argento / oro

Per le **70 forme di passo e di traguardo**: **bronzo** quando la sblocchi
(è la forma di oggi), **argento** quando il requisito è fatto in **3 corse
diverse**, **oro** in **10 corse diverse**. «Più veloce» è già il livello di
passo successivo, quindi l'edizione premia il rifarla. Le 24 forme dei km
totali non hanno edizioni (i km crescono e basta: la prossima è il
gradino dopo). Si contano da `game_runs`, anche sulle corse vecchie col
backfill. L'edizione squadra di oggi resta com'è, a parte.

### 6.2 Cornici — 10, una per collezione completa

Completata una collezione, la sua **cornice** per la foto del profilo: un
anello del colore della collezione con il contorno della sua forma più
difficile in piccolo. Dieci colori nuovi in `tokens.ts`.

### 6.3 Titoli — 8

| id | en | it | Come |
|---|---|---|---|
| `runner` | Runner | Corridore | 100 km in totale |
| `explorer` | Explorer | Esploratore | 1 000 km |
| `traveller` | Traveller | Viaggiatore | 3 000 km |
| `globetrotter` | Globetrotter | Giramondo | 10 000 km |
| `marathoner` | Marathoner | Maratoneta | una maratona |
| `ultra` | Ultrarunner | Ultramaratoneta | una ultra da 50 km |
| `steady` | Steady | Costante | streak di 26 settimane (1 a settimana) |
| `collector` | Collector | Collezionista | tutte le 10 collezioni |

Il titolo è un nome, senza numero («Esploratore», non «Esploratore 1 000
km»), così non cambia con le miglia; il requisito si legge sotto.
Le traduzioni de/es/fr arrivano con i testi della parte E.

### 6.4 Badge — 8, e le medaglie

| id | it | Come |
|---|---|---|
| `streak_4` · `streak_12` · `streak_52` | Streak 4 / 12 / 52 settimane | streak più lunga, 1 a settimana |
| `medals_10` · `medals_50` | 10 / 50 sfide personali | medaglie prese, di qualunque gradino |
| `gold_10` | 10 edizioni oro | |
| `team_1` · `team_10` | 1 / 10 sfide di squadra completate | |

Ogni sfida personale finita dà la sua **medaglia** (bronzo/argento/oro),
che resta nella lista «Finite» e conta per i badge.

### 6.5 Dove si vedono — privacy

- In «Play», in cima a «Collection», una riga **«Prizes»** apre la pagina
  dei premi: cornici, titoli e badge, presi e da prendere, con il
  requisito.
- **Sul profilo pubblico non compare niente del gioco finché non lo
  scegli tu**: la cornice, un titolo e fino a 3 badge, scelti nella pagina
  dei premi. Di default niente. Il testo della privacy cambia (il profilo
  può mostrare premi del gioco): lo scrivo nella parte E e lo approvi.

### 6.6 La scheda di sblocco e le push

- La scheda «New shape unlocked» dice anche la collezione («Animals ·
  8 / 13»), mostra le edizioni nuove («Silver edition») e, quando una
  collezione è completa, la cornice. Se una corsa sblocca **più di 3**
  cose, una scheda sola di riepilogo («5 new shapes») invece di 5 di fila.
- Push: `shape_unlocked` resta; due nuove, come lei solo per le corse
  arrivate più tardi dalla coda: `edition_up` («Lightning: silver
  edition») e `collection_done` («Animals complete: new frame»).
  **Niente push per le sfide personali e niente promemoria della streak**
  (niente insistenza). Interruttori e blocchi come oggi.

## 7. Le parti

| Parte | Che cosa | Migrazione | Dipende da |
|---|---|---|---|
| Doc | GIOCO.md, TASK-423.md, ADR-0351, STATUS/DECISIONS (formato snello) | — | il tuo sì |
| **A** | API: catalogo a 94 forme con collezioni e scala km, `single_run`, `GET /game/catalog` con `collections`, `GET /game/me` con l'avanzamento per collezione; foglio delle forme; test | — | Doc |
| **B** | Regole: 11 distanze dei tempi, `RULES_VERSION` 3, backfill, test deterministici su tracce finte (400 m, miglio, 50 km, buchi, pause) | — | A |
| **C** | Sfide personali e streak: regole pure (rotazione, gradini, streak), `game_personal`, `utc_offset_min`, `GET /game/personal`, squadra a 20 pezzi e 30 giorni; privacy | una | B |
| **D** | App: «Collection» in collezioni con le loro pagine, «Challenges» in lista unica, carte personali e streak, link alla sfida del mese, l'app manda `utc_offset_min`; testi | — | C, e **#971 di TASK-422 in `main`** |
| **E** | Premi: edizioni, cornici, titoli, badge, pagina «Prizes», profilo, scheda di sblocco, 2 push; privacy | una | D |

- **Server**: A+B insieme (una volta sola, poi il backfill: le forme nuove
  si sbloccano **senza push**, con la data della corsa che le ha
  raggiunte); poi C; poi E. Ogni passo col tuo sì e il via del
  Coordinatore.
- **App**: un OTA solo dopo D+E. Fino ad allora l'app di oggi mostra le
  94 forme nella griglia di sempre, che funziona.
- **Impronta iOS** invariata: niente dipendenze, niente codice nativo
  (misurata su una copia pulita prima di ogni PR dell'app).
- **Testi** (nomi qui sopra, sfide, premi, push, privacy) nelle 5 lingue:
  te li porto in tabella prima del merge di ogni parte.
- Prima del codice di ogni parte, la lista dei file al Coordinatore.

## 8. Fuori

Punti, classifiche, confronti fra persone (TASK-241); denaro, premi veri,
pubblicità (AdMob spento); promemoria e push di insistenza; sfide personali
su misura del passato di ognuno (tutti hanno le stesse, con tre gradini);
il route engine; la cadenza dall'accelerometro.

## 9. Da decidere con il sì

1. Il catalogo (94 forme, collezioni, requisiti, nomi) com'è sopra?
2. L'ora del telefono (`utc_offset_min`, §4.3): sì, con il testo della
   privacy che ti porto in C?
3. Premi sul profilo **solo se scelti** (§6.5)?
