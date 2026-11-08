# TASK-408 — L'editor del video dell'attività: un animale 3D corre il percorso, le modifiche, il prompt

**Stato**: Proposto · nessun codice prima delle scelte dell'utente e della
lista dei file di ogni parte, approvata dal Coordinatore
**Fase**: 5 · **Branch**: `docs/TASK-408-video-editor` (documenti); il
codice `feat/TASK-408-b-…`
**Dipende da**: TASK-351 (il video con la mappa sotto, i tre stili, il 3D
che gira). TASK-351 resta chiuso così com'è.
**ADR**: ADR-0339 (proposto)

## Obiettivo

L'utente il 2026-11-06, testuale:

> «Aggiungi la possibilità di modificare i video dell'attività di poter
> raggiungere i vari mini o un elefante e un cavallo eccetera eccetera che
> corre il percorso e il cavallo si sposta e deve essere tutto l'animazione
> 3D dare tante possibilità di modifica dei video della fine colori emoji
> tramite un prompt per fare un video tutto in 3D 2D cambi di scena,
> migliora quella sezione»

Si vuole questo:
- **un personaggio** (un cavallo, un elefante, altri animali) che **corre
  il percorso** nel video, animato in 3D;
- **tante modifiche**: il finale, i colori, le emoji;
- **un prompt**: l'utente scrive com'è il video che vuole;
- **video in 3D e in 2D**, con **cambi di scena**.

## Cosa c'è già (TASK-295, TASK-301, TASK-351)

- **Il video**: 12 secondi, 1080 × 1920 a 30 fotogrammi. Lo disegna una
  WebView nascosta su un canvas e lo codifica in H.264 con WebCodecs
  (`share/videoPage.ts`); l'app fa il file MP4 (`share/mp4.ts`). Niente di
  nativo.
- **La scena** (`share/videoScene.ts`): l'elenco delle cose da disegnare a
  ogni istante, cioè la linea che si disegna in 8 secondi, i numeri, le
  emoji che saltano fuori, il nome, il cuore.
- **La mappa sotto** (TASK-351): MapLibre nella stessa pagina. Tre stili in
  «Share your run» (`share/StyleRow.tsx`): «Night», «Day» e «3D», dove la
  mappa poggia sulle colline e la camera gira attorno al percorso quando il
  telefono ce la fa (modo `orbit`).
- **La musica** (TASK-301, `share/MusicRow.tsx`) e **le emoji del post**
  (TASK-231, `share/stickers.ts`).

## Come si fa (proposta)

### Il personaggio 3D

- **Disegnato nella stessa pagina del video**, sulla mappa 3D di MapLibre,
  come «custom layer» con **three.js**: è il modo che la documentazione di
  MapLibre mostra per un modello 3D sulla mappa. three.js (licenza MIT) si
  carica nella WebView come MapLibre, da un indirizzo con la versione
  fissata e l'hash SRI: **nessun cambio nativo, l'impronta iOS non
  cambia**, si pubblica con un OTA. È una dipendenza nuova: domanda 1.
- **I modelli**: file glTF animati, con **licenza chiara e nessun
  personaggio di altri** (vincolo del Coordinatore). Candidato:
  **Quaternius, «Ultimate Animated Animal Pack»**: CC0 (uso commerciale
  libero, senza crediti), glTF, 12 animali con il galoppo e il passo. La
  lista esatta degli animali va letta nel pacchetto scaricato prima di
  prometterla. **L'elefante non c'è in nessun pacchetto CC0 trovato**: le
  strade sono un modello a pagamento con licenza royalty-free o un modello
  fatto per MuW (domanda 2).
- **Come corre**: il personaggio sta sul punto del percorso dove arriva la
  linea in quel fotogramma, girato nella direzione della strada, con
  l'animazione della corsa al passo del video. La traccia è quella della
  corsa, mai inventata.
- **La camera** lo segue da dietro e un po' dall'alto («chase»), al posto
  del giro attorno. Se il telefono non ce la fa (lo misura la prova già
  usata per `orbit`), la camera resta ferma sulla mappa intera e il
  personaggio corre lo stesso: il video esce sempre.
- **I file dei modelli** stanno nel pacchetto dell'app (asset JS, quindi
  OTA) o su `api.getmuw.app`: si decide con la misura del peso.

### L'editor

Un foglio «Edit video» dentro «Share your run», con righe come quelle di
oggi:
- **Personaggio**: nessuno, o uno degli animali;
- **Stile**: Night, Day, 3D (quelli di TASK-351) più 2D;
- **Colori**: la linea e le scritte, da tavolozze fatte con i token
  dell'app (nessun colore scritto a mano);
- **Emoji**: lungo il percorso (saltano fuori quando il personaggio ci
  passa) e all'arrivo;
- **Scene**: l'ordine e il tipo dei pezzi del video, per esempio il disegno
  in 2D → la corsa in 3D → il disegno intero dall'alto;
- **Finale**: i numeri, il disegno, il cuore, o tutti.

### Il prompt

- Un riquadro «Describe your video» in cima al foglio.
- **Nessun servizio AI a pagamento, nessun costo per richiesta** (scelta
  dell'utente, 2026-11-06). Le parole le legge **il telefono**, con una
  tabella come quella delle forme (`shapeWords.ts`, ADR-0036): «cavallo»,
  «horse» → il cavallo; «notte», «blu», «fuochi d'artificio», «finale con i
  numeri» → le voci dell'editor, nelle cinque lingue dell'app. Niente rete,
  niente server, niente riga nuova nella privacy.
- **Le parole scelgono solo fra le voci dell'editor**: personaggio, stile,
  colori, emoji, scene, finale. Non producono coordinate, tracce o geometrie
  (ADR-0001, vincolo del Coordinatore): il percorso resta quello della
  corsa. Una parola che la tabella non conosce si ignora, e il riquadro lo
  dice senza errori.
- Il risultato riempie le righe dell'editor, che l'utente può cambiare a
  mano prima di esportare.
- Più avanti, solo se l'utente lo chiede: il modello di Ollama che MuW
  tiene già per le forme (`AI.md`), sul proprio computer, senza un costo per
  richiesta. Non fa parte di questo task.

## Scelte dell'utente

1. **L'ordine delle parti** (2026-11-06): «Sì, quest'ordine», cioè prima il
   personaggio 3D, poi l'editor, poi il prompt.
2. **Il prompt senza costi** (2026-11-06): «senza la questione richiesta AI
   con un costo per ogni richiesta». Il prompt si legge sul telefono con una
   tabella di parole.
3. **three.js e i modelli CC0** (2026-11-06): «Sì, vai». three.js entra
   nella pagina del video (versione fissata, SRI, niente di nativo); i
   modelli sono quelli CC0 di Quaternius, con la lista degli animali letta
   nel pacchetto prima di prometterla.
4. **L'elefante subito** (2026-11-06): «Elefante subito». L'elefante è nella
   prima versione, accanto agli animali CC0. Quale modello: domanda 2b.
5. **Quale elefante** (2026-11-06): «Gratis, CC BY». «Elephant Anim» di
   Shivoahm su Sketchfab, CC BY 4.0
   (https://sketchfab.com/3d-models/elephant-anim-766f267ff6bd4a87a45e3d26286b9d27).
   CC BY chiede il titolo, l'autore, la fonte, la licenza e di dire se il
   modello è stato cambiato (MuW lo converte e ne riduce le texture): una
   riga nei crediti dell'app, testo nuovo da approvare (domanda 2c, vincolo
   del Coordinatore).
6. **La riga dei crediti** (2026-11-06): «Sì, questa». Un punto nuovo in
   «Terms» › «Services of others» (`about/content/*.ts`, cinque lingue, più
   la pagina del sito). Testo approvato, in inglese: «The 3D animals in the
   video come from Quaternius (CC0); the elephant is "Elephant Anim" by
   Shivoahm on Sketchfab (CC BY 4.0), adapted by MuW.» In italiano: «Gli
   animali 3D del video vengono da Quaternius (CC0); l'elefante è "Elephant
   Anim" di Shivoahm su Sketchfab (CC BY 4.0), adattato da MuW.» Tedesco,
   spagnolo e francese con la domanda 6. Entra con la parte B, insieme al
   modello.
7. **Quali personaggi** (2026-11-06): «Tutti i 13». I 12 animali del
   pacchetto Quaternius «Ultimate Animated Animals» (luglio 2021, CC0, glTF;
   lista letta il 2026-11-06 nella cartella pubblica linkata da
   https://quaternius.com/packs/ultimateanimatedanimals.html, senza
   scaricare): Alpaca, Bull, Cow, Deer, Donkey, Fox, Horse, Horse_White,
   Husky, ShibaInu, Stag, Wolf; più l'elefante di Shivoahm. Con «None» sono
   14 caselle: la riga «Character» scorre di lato. Il peso dei file e i nomi
   delle animazioni si leggono nella parte B, scaricando la cartella glTF col
   sì dell'utente (nome, fonte, misura).
8. **Le scene e il finale** (2026-11-06): «Sì, così». Il video resta di
   **12 secondi**, in tre pezzi:
   - **Apertura** (0–3 s): il disegno 2D che si traccia sulla mappa piatta
     (come oggi), il titolo, o niente; poi un taglio o una dissolvenza verso
     il 3D.
   - **La corsa** (3–9 s): l'animale in 3D con la camera dietro, la camera
     che gira intorno al percorso (come oggi), o la linea 2D con l'animale
     sopra; le emoji spuntano dove passa.
   - **Finale** (9–12 s): i numeri, il disegno intero, il cuore, o tutti e
     tre; le emoji della fine; il marchio MuW sempre per ultimo.
   I pezzi si riordinano o si spengono, almeno uno resta acceso; se uno è
   spento gli altri si allungano e il video dura sempre 12 secondi. Tutto
   viene dalla traccia vera.
9. **Il prompt** (2026-11-06): «Sì, approvo». Testi approvati, in inglese
   (le altre lingue con la domanda 6):
   - titolo del campo: «Describe your video»;
   - esempio dentro il campo: «a horse at night, fireworks at the end»;
   - riga sotto: «An animal, colours, emoji, the ending. Read on your
     phone.»
   Le parole scelgono solo voci dell'editor, che poi si cambiano a mano;
   una parola sconosciuta si salta senza errore; niente rete. La prima
   tabella, in it/en/de/es/fr (esempi in italiano):
   - **Personaggio**: i 13 nomi con i sinonimi (cavallo, cavallo bianco,
     elefante, cervo, capriolo, volpe, lupo, cane/husky, shiba, mucca, toro,
     asino, alpaca); «nessuno» → None.
   - **Stile**: notte, giorno, 2D/piatto, 3D.
   - **Colore della linea**: giallo, azzurro, rosa, verde, bianco (i cinque
     dei token).
   - **Emoji**: fuochi d'artificio 🎆, stelle ⭐, cuore ❤️, fuoco 🔥, fulmine
     ⚡, coriandoli 🎉, trofeo 🏆; con «alla fine» al finale, altrimenti lungo
     il percorso.
   - **Scene**: «senza apertura»; «da dietro»/«segui» → camera dietro;
     «gira»/«intorno» → camera che gira.
   - **Finale**: numeri, disegno, cuore, «tutto».
   La tabella è un file dell'app: parole nuove arrivano con un OTA.
10. **I testi in cinque lingue** (2026-11-06): «Sì, approvo». Sono nella
   sezione «Testi approvati» qui sotto, compresa la riga dei crediti in
   tedesco, spagnolo e francese.
11. **Com'è fatto lo stile «2D»** (2026-11-06, parte C1): «Fondo scuro». Il
   fondo della notte senza mappa, niente velo e niente crediti della
   mappa, la linea nel colore scelto. L'altra strada era il giallo di oggi
   con la linea nera, dove il colore della linea non avrebbe contato.
12. **Le scene di base** (2026-11-07, parte C2): «Come oggi». Chi non
   tocca le scene ha il video di oggi: «Opening» spento, la linea che si
   disegna per 9 secondi, poi 3 secondi di «Ending» con il disegno intero e
   i numeri. «Camera behind» e «Camera around» compaiono solo con lo stile
   3D; su 2D, Night e Day il percorso si vede dall'alto. L'altra strada era
   il video della tavola (2D → percorso → finale) per tutti.

## Domande aperte (una alla volta)

1. ~~three.js e i modelli CC0~~: risposta sopra (scelta 3).
2. ~~L'elefante~~: risposta sopra (scelta 4).
2b. ~~Quale elefante~~: risposta sopra (scelta 5).
2c. ~~La riga dei crediti~~: risposta sopra (scelta 6). Era la proposta: un punto nuovo in
   «Terms» › «Services of others» (`about/content/*.ts`, cinque lingue, più
   la pagina del sito), in inglese: «The 3D animals in the video come from
   Quaternius (CC0); the elephant is "Elephant Anim" by Shivoahm on
   Sketchfab (CC BY 4.0), adapted by MuW.» I modelli CC0 non chiedono
   crediti: Quaternius si nomina per cortesia.
   I due candidati della domanda 2b (2026-11-06), per la storia:
   - **«Elephant Anim» di Shivoahm su Sketchfab**
     (https://sketchfab.com/3d-models/elephant-anim-766f267ff6bd4a87a45e3d26286b9d27):
     gratis, **CC BY 4.0** (uso commerciale permesso, con il nome
     dell'autore nei crediti dell'app), 6k triangoli, animazioni idle, passo,
     corsa e in piedi su due zampe. L'autore lo chiama «realistico»: accanto
     agli animali low-poly di Quaternius può sembrare di un altro stile.
     Scelto dall'utente.
   - **«African elephant» su CGTrader**, circa 7 $, licenza «Royalty Free»
     di CGTrader, glTF, circa 6k poligoni, 15 animazioni; texture 8K da
     ridurre per il telefono. Da comprare l'utente stesso, dopo aver letto
     se la licenza permette un file che l'app scarica nella WebView.
   Nessun elefante animato CC0 trovato.
3. ~~Quali personaggi~~: risposta sopra (scelta 7). Era la proposta: sei
   (Horse, l'elefante, Stag, Fox, Wolf, Husky) più «None».
4. ~~Le scene e il finale~~: risposta sopra (scelta 8).
5. ~~Il prompt~~: risposta sopra (scelta 9).
6. ~~I testi in cinque lingue~~: risposta sopra (scelta 10). Le
   domande sono finite: prossima la parte B.

## Testi approvati (scelta 10)

Riusati senza cambiarli, perché l'app li ha già: «Style», «Night», «Day»,
«3D», «Heart», «Title», «Emoji», «Done», «Video».

### Il foglio «Edit video»

| en | it | de | es | fr |
|---|---|---|---|---|
| Edit video | Modifica video | Video bearbeiten | Editar vídeo | Modifier la vidéo |
| Character | Personaggio | Figur | Personaje | Personnage |
| No animal | Nessun animale | Kein Tier | Ningún animal | Aucun animal |
| 2D | 2D | 2D | 2D | 2D |
| Line colour | Colore della linea | Linienfarbe | Color de la línea | Couleur de la ligne |
| Along the way | Lungo il percorso | Unterwegs | Por el camino | En chemin |
| At the end | Alla fine | Am Ende | Al final | À la fin |
| Scenes | Scene | Szenen | Escenas | Scènes |
| Opening | Apertura | Anfang | Inicio | Ouverture |
| The route | Il percorso | Die Strecke | El recorrido | Le parcours |
| Ending | Finale | Ende | Final | Fin |
| Drawing in 2D | Disegno in 2D | Zeichnung in 2D | Dibujo en 2D | Dessin en 2D |
| Nothing | Niente | Nichts | Nada | Rien |
| Cut | Taglio | Schnitt | Corte | Coupe |
| Fade | Dissolvenza | Überblendung | Fundido | Fondu |
| Camera behind | Camera dietro | Kamera dahinter | Cámara detrás | Caméra derrière |
| Camera around | Camera intorno | Kamera rundherum | Cámara alrededor | Caméra autour |
| Line in 2D | Linea in 2D | Linie in 2D | Línea en 2D | Ligne en 2D |
| Numbers | Numeri | Zahlen | Números | Chiffres |
| Whole drawing | Disegno intero | Ganze Zeichnung | Dibujo entero | Dessin entier |
| All three | Tutti e tre | Alle drei | Los tres | Les trois |
| At least one scene stays on. | Almeno una scena resta accesa. | Mindestens eine Szene bleibt an. | Al menos una escena sigue activa. | Au moins une scène reste active. |

### I colori (nomi per VoiceOver)

| en | it | de | es | fr |
|---|---|---|---|---|
| Yellow | Giallo | Gelb | Amarillo | Jaune |
| Light blue | Azzurro | Hellblau | Celeste | Bleu clair |
| Pink | Rosa | Rosa | Rosa | Rose |
| Green | Verde | Grün | Verde | Vert |
| White | Bianco | Weiß | Blanco | Blanc |

### I personaggi

| en | it | de | es | fr |
|---|---|---|---|---|
| Horse | Cavallo | Pferd | Caballo | Cheval |
| White horse | Cavallo bianco | Schimmel | Caballo blanco | Cheval blanc |
| Elephant | Elefante | Elefant | Elefante | Éléphant |
| Stag | Cervo | Hirsch | Ciervo | Cerf |
| Deer | Capriolo | Reh | Corzo | Chevreuil |
| Fox | Volpe | Fuchs | Zorro | Renard |
| Wolf | Lupo | Wolf | Lobo | Loup |
| Husky | Husky | Husky | Husky | Husky |
| Shiba Inu | Shiba Inu | Shiba Inu | Shiba Inu | Shiba Inu |
| Cow | Mucca | Kuh | Vaca | Vache |
| Bull | Toro | Stier | Toro | Taureau |
| Donkey | Asino | Esel | Burro | Âne |
| Alpaca | Alpaca | Alpaka | Alpaca | Alpaga |

### Il prompt

| en | it | de | es | fr |
|---|---|---|---|---|
| Describe your video | Descrivi il tuo video | Beschreibe dein Video | Describe tu vídeo | Décris ta vidéo |
| a horse at night, fireworks at the end | un cavallo di notte, fuochi d'artificio alla fine | ein Pferd bei Nacht, Feuerwerk am Ende | un caballo de noche, fuegos artificiales al final | un cheval la nuit, un feu d'artifice à la fin |
| An animal, colours, emoji, the ending. Read on your phone. | Un animale, i colori, le emoji, il finale. Letto sul telefono. | Ein Tier, Farben, Emoji, das Ende. Auf dem Handy gelesen. | Un animal, colores, emojis, el final. Se lee en el móvil. | Un animal, des couleurs, des emojis, la fin. Lu sur ton téléphone. |

### La riga dei crediti (Termini › «Services of others»)

- **en** (approvata): The 3D animals in the video come from Quaternius (CC0); the elephant is "Elephant Anim" by Shivoahm on Sketchfab (CC BY 4.0), adapted by MuW.
- **it** (approvata): Gli animali 3D del video vengono da Quaternius (CC0); l'elefante è "Elephant Anim" di Shivoahm su Sketchfab (CC BY 4.0), adattato da MuW.
- **de**: Die 3D-Tiere im Video stammen von Quaternius (CC0); der Elefant ist „Elephant Anim“ von Shivoahm auf Sketchfab (CC BY 4.0), angepasst von MuW.
- **es**: Los animales 3D del vídeo vienen de Quaternius (CC0); el elefante es «Elephant Anim» de Shivoahm en Sketchfab (CC BY 4.0), adaptado por MuW.
- **fr**: Les animaux 3D de la vidéo viennent de Quaternius (CC0) ; l'éléphant est « Elephant Anim » de Shivoahm sur Sketchfab (CC BY 4.0), adapté par MuW.

Note: «No animal» al posto di «None», perché «None» c'è già al femminile
(«Nessuna»). Il foglio ha solo «Done»: il video si esporta dal tasto che
c'è già in «Share your run», quindi niente «Export video».

## Le parti

- **A — la proposta** (questa PR): il task file, ADR-0339, la tavola.
- **B — il personaggio 3D**: three.js e i modelli nella pagina del video,
  la riga «Personaggio», la camera che segue, la misura sul telefono. In
  due PR (ADR-0339, precisazione B):
  - **B1** (branch `feat/TASK-408-b-character`): i 12 animali di Quaternius
    sulla punta della linea, in ogni stile, la riga «Character», il video
    che esce anche senza rete. Lista approvata dal Coordinatore il
    2026-11-06, con `SharePostVideo.test.tsx` aggiunto lo stesso giorno.
    **In main** il 2026-11-06 (#911, 32cbb012), impronta iOS invariata.
    Video del simulatore per l'utente il 2026-11-06 (cavallo Notte, volpe
    Giorno, cervo 3D, lupo Notte; `out/TASK-408/sim/`, fuori dal
    repository). **Limite noto:** sul 3D, con le tessere del rilievo non
    ancora in cache, la mappa può non arrivare entro i 15 s di
    `MAP_WAIT_MS` e il video esce giallo, di riserva, con l'animale sopra
    (simulatore: prima prova 15,0 s e giallo, seconda 6,8 s con la mappa).
    È il comportamento di TASK-351, non nuovo di B1; la misura sul telefono
    è della parte E.
  - **B2**: l'elefante (il file lo scarica l'utente da Sketchfab, che chiede
    un account) e la riga dei crediti nei Termini (`about/content/*.ts`,
    dopo la #908). La camera dietro l'animale sul 3D passa a C2.
- **C — l'editor**: il foglio «Edit video», colori, emoji lungo il
  percorso, scene, finale, lo stile 2D. In due PR (ADR-0339, precisazione
  C):
  - **C1** (branch `feat/TASK-408-c1-edit-sheet`): il foglio «Edit video»
    (dal basso, con «Done») aperto da una riga «Edit video» in «Share your
    run», con sotto il riassunto delle scelte; dentro «Style» con il 2D,
    «Character», «Line colour» (cinque colori) e le emoji «Along the way»
    (tre, dove passa la linea) e «At the end» (sei, intorno al disegno).
    Lista approvata dal Coordinatore il 2026-11-06, con
    `videoPage.test.ts`, `StyleRow.test.tsx` e `videoStyle.test.ts` chiesti
    lo stesso giorno. Provato nel simulatore (video in
    `out/TASK-408/sim-c1/`, fuori dal repository).
  - **C2**: «Scenes» (apertura, percorso, finale; riordino e spegnimento,
    sempre 12 secondi), «Ending», la camera dietro l'animale sul 3D (tolta
    da B2) e l'anteprima nel foglio. In due PR (ADR-0339, precisazione C2):
    - **C2a** (branch `feat/TASK-408-c2-scenes`): «Scenes» e «Ending». Tre
      riquadri «Opening › The route › Ending» nell'ordine del video, che si
      accendono e si spengono con un tocco e si spostano con «‹ ›» (testi
      «Move left»/«Move right», già approvati); l'ultimo acceso resta
      acceso. Sotto, cosa mostra l'apertura («Drawing in 2D», «Title») e
      come passa alla scena dopo («Cut», «Fade»), e il finale («Numbers»,
      «Whole drawing», «Heart», «All three»). Il video di base è identico a
      prima, fotogramma per fotogramma (scelta 12). Provato nel simulatore il
      2026-11-08: 3D con apertura dall'alto, cavallo e finale «Heart»;
      Notte con titolo, volpe e finale «Numbers» (video in
      `out/TASK-408/sim-c2/`, fuori dal repository).
    - **C2b** (branch `feat/TASK-408-c2b-chase`): sul 3D, sotto «The
      route», tre scelte: «Camera around» (di base, il giro di prima),
      «Camera behind» (la camera segue l'animale da dietro e un po'
      dall'alto, scendendo dalla vista intera nel primo secondo del
      percorso e risalendo dopo) e «Line in 2D» (tutto il video dall'alto,
      sulla foto piatta di C2a). Se il telefono non regge la camera dietro,
      la mappa resta ferma con lo zoom lento e l'animale corre lo stesso.
    - **C2c**: l'anteprima nel foglio (un modo «play» della pagina del
      video), con la sua lista.
- **D — il prompt**: la tabella di parole nell'app e il riquadro; niente
  server.
- **E — la prova sul telefono**: il tempo dell'esportazione con ogni
  personaggio, nei tre stili.

Ogni parte manda prima al Coordinatore la sua lista dei file. Il
2026-11-06 sono liberi `videoScene.ts`, `videoPage.ts`, `videoStyle.ts`,
`StyleRow.tsx` e `RunVideo.tsx`; `SharePost.tsx` e `postRun.ts` sono di
TASK-400 C.

## Tavola della proposta

La tavola (Design, privata): https://claude.ai/artifact/JaZ4aoPxXngkLGJc2uKQn7
— quattro tavole: il foglio «Edit video» (prompt, anteprima, «Character»,
«Style», «Colours», emoji, scene, finale), tre fotogrammi del cavallo sul
percorso (0:03, 0:06, 0:11), le scene in 12 secondi, il prompt letto dal
telefono. Gli animali disegnati sono segnaposto finché non si legge il
pacchetto CC0. Sorgenti in `out/TASK-408/canvas/` (non nel repository).

## File toccati

Questa PR (documenti): `docs/tasks/TASK-408.md` (nuovo), `docs/DECISIONS.md`
(ADR-0339), `docs/STATUS.md` (una voce), `docs/INDEX.md` (una riga).

Parti B–E: si elencano prima di ciascuna.

Parte B1: `apps/mobile/assets/characters/*.zip` (12, nuovi),
`apps/mobile/src/share/videoCharacter.ts` e `.test.ts` (nuovi),
`CharacterRow.tsx` (nuovo), `videoPage.ts` e `.test.ts`, `videoScene.ts` e
`.test.ts`, `RunVideo.tsx`, `SharePost.tsx` e `.test.tsx`,
`SharePostVideo.test.tsx` (aggiunto dal Coordinatore il 2026-11-06),
`apps/mobile/src/tabs/TabSwipeOwners.test.ts` (una riga in `ROWS`, aggiunto
dal Coordinatore il 2026-11-06),
`apps/mobile/src/i18n/{it,de,es,fr}.ts`, `docs/tasks/TASK-408.md`,
`docs/STATUS.md`, `docs/DECISIONS.md`. Fuori dal repository:
`out/TASK-408/` (i glTF scaricati, `shrink.mjs`, i .glb, la pagina di prova
per il browser).

Parte C1: `apps/mobile/src/share/EditVideoSheet.tsx` e `.test.tsx`,
`LineColourRow.tsx`, `VideoEmojiRow.tsx`, `videoEdit.ts` e `.test.ts`
(nuovi); `SharePost.tsx` e `.test.tsx`, `SharePostVideo.test.tsx`,
`StyleRow.tsx` e `.test.tsx`, `videoStyle.ts` e `.test.ts`, `videoScene.ts`
e `.test.ts`, `videoPage.ts` e `.test.ts` (i tre test `StyleRow.test.tsx`,
`videoStyle.test.ts` e `videoPage.test.ts` aggiunti dal Coordinatore il
2026-11-06); lo stile all'apertura resta «Night», anche con «2D» primo
nella riga; `apps/mobile/src/theme/tokens.ts`
(il blocco `videoLine`); `apps/mobile/src/i18n/{it,de,es,fr}.ts`;
`apps/mobile/src/tabs/TabSwipeOwners.test.ts` (una riga in `ROWS`);
`docs/tasks/TASK-408.md`, `docs/STATUS.md`, `docs/DECISIONS.md`.

Parte C2a (lista mandata al Coordinatore il 2026-11-08):
`apps/mobile/src/share/videoScenes.ts` e `.test.ts`, `ScenesRows.tsx`,
`EndingRow.tsx` (nuovi); `videoEdit.ts` e `.test.ts`, `EditVideoSheet.tsx`
e `.test.tsx`, `videoScene.ts` e `.test.ts`, `videoPage.ts` e `.test.ts`,
`SharePost.tsx`, `SharePostVideo.test.tsx`;
`apps/mobile/src/i18n/{it,de,es,fr}.ts`; `docs/tasks/TASK-408.md`,
`docs/STATUS.md`, `docs/DECISIONS.md`. `SharePost.test.tsx` e
`TabSwipeOwners.test.ts` erano nella lista ma non sono serviti.

Parte C2b (lista mandata al Coordinatore il 2026-11-08):
`apps/mobile/src/share/videoChase.ts` e `.test.ts` (nuovi); `videoEdit.ts`
e `.test.ts`, `videoScenes.ts`, `ScenesRows.tsx`, `EditVideoSheet.test.tsx`,
`videoScene.ts` e `.test.ts`, `videoPage.ts` e `.test.ts`,
`SharePostVideo.test.tsx`; `apps/mobile/src/i18n/{it,de,es,fr}.ts`;
`docs/tasks/TASK-408.md`, `docs/STATUS.md`, `docs/DECISIONS.md`.

## Criteri di accettazione

- [ ] Le domande 1–6 hanno una risposta scritta qui.
- [ ] Ogni modello 3D ha la licenza scritta qui, con il link alla pagina.
- [ ] Il prompt sceglie solo voci dell'editor e non chiama la rete: un
  test lo prova con parole sconosciute e con numeri che sembrano
  coordinate.
- [ ] Ogni parte ha la lista dei file approvata dal Coordinatore e test
  deterministici.
- [ ] Il video esce sempre: senza mappa, senza modello o su un telefono
  lento, il personaggio si toglie o la camera si ferma, mai un errore.
- [ ] L'impronta iOS non cambia, salvo una lista che lo dica.
