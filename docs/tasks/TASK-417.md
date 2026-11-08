# TASK-417 — La mia immagine al posto dell'animale, e il video «Together» con le persone taggate

**Stato**: Proposto · nessun codice prima delle scelte dell'utente e della
lista dei file di ogni parte, approvata dal Coordinatore
**Fase**: 5 · **Branch**: `docs/TASK-417-my-image-video-proposal`
(documenti); il codice `feat/TASK-417-b-…`
**Dipende da**: TASK-408 (l'editor del video, ADR-0339): l'animale è l'op
`character` di `share/videoScene.ts`, disegnato da three.js nella WebView
nascosta (`share/videoPage.ts`); il foglio «Edit video» è
`share/EditVideoSheet.tsx` (parte C1, non ancora in `main` il 2026-11-08).
**ADR**: ADR-0345 (proposto). Numeri dal Coordinatore il 2026-11-08.

## Obiettivo

La richiesta, arrivata il 2026-11-08 come proposta di task:

- **la mia immagine**: nel video della corsa, al posto dell'animale, corre
  un'immagine o una GIF dell'utente;
- **«Together»**: se la corsa è stata fatta con persone taggate nel post,
  un solo video con i percorsi di tutti sulla stessa mappa.

Tutto viene dalle tracce vere: l'app non inventa né sposta coordinate, e
nessuna AI produce percorsi (CLAUDE.md, ADR-0001).

## Cosa c'è già (letto il 2026-11-08)

- **L'animale** (TASK-408 B1, in `main`): l'op `character` (`path`, `upTo`,
  `size`, `tilt`, `clip`: `run`/`rest`) e `scene.character`, uno dei 12
  animali di `videoCharacter.ts`. L'app apre lo `.zip` del modello e lo passa
  alla pagina in base64 (`prepareCharacter`); la pagina lo disegna in un
  canvas suo e lo posa sul fotogramma alla punta della linea (ADR-0339,
  precisazione B). La pagina ha **un solo** `actor`.
- **Immagini nella pagina del video**: oggi nessuna. Le emoji sono testo;
  si disegnano solo la mappa, il suo sfondo e il canvas dell'animale.
- **Librerie già nell'app**: `expo-image-picker` (con il permesso della
  fotocamera e delle foto già in `app.json`), `expo-image-manipulator`,
  `expo-file-system`. Non ci sono `expo-camera`, `react-native-svg`, Skia.
- **ImageDecoder** (WebCodecs) **non c'è su Safari iOS**, fino alla 27
  compresa (caniuse, letto il 2026-11-08): le GIF non si possono leggere
  con lui nella WebView.
- **Le tracce con l'ora**: l'app registra `timeMs` per ogni punto, anche
  nelle attività importate, e le manda al server con il salvataggio. Il
  server le tiene in `runs.track` (`LineStringM`, M = secondi dal primo
  punto, pause comprese) con `started_at` e `pauses`. **Nessun endpoint le
  restituisce**, nemmeno al proprietario: `GET /me/activities/{key}` dà
  `ST_Force2D(track)`, i disegni e il Feed danno la traccia senza tempi.
  Solo l'invio a Strava legge M. Nell'app resta con i tempi solo la corsa
  in corso (`current-run.json`).
- **La privacy** promette che gli altri vedono una corsa «senza orari,
  pause o percorso previsto» (`about/content/*.ts`, «Your runs and their
  GPS tracks»).
- **I tag** (`social/TagPeople.tsx`, `drawing_tags`): un tocco sul nome e
  la persona è taggata, fino a 10; nessun «accetta», solo una notifica
  «{name} tagged you in a post.». Il tag è solo un utente: nessun legame
  con la sua attività. Le corse di gruppo (TASK-309) non si legano alle
  corse registrate (`EVENTI.md` §13, fuori da quella versione).
- **La visibilità** è di ogni disegno: `everyone`, `followers`, `only_me`
  (l'inizio). Una corsa senza disegno è privata. Il controllo è in un posto
  solo, `drawing_seen_sql` (`drawings.py`).

## Scelte dell'utente

1. **Come si crea l'immagine nell'app** (2026-11-08): «Foto ritagliata
   tonda». Nella prima versione si crea solo così: una foto (dalla libreria
   o scattata) ritagliata a tondo, che saltella. Gli scatti in fila e il
   disegno a dito non entrano; dalla libreria si può sempre scegliere una
   GIF già fatta.
2. **Nel Feed** (2026-11-08): «Com'è». Il video con la propria immagine si
   pubblica come le foto e i video propri dei post: decide la visibilità
   del post, chi lo vede può segnalarlo. Nessun controllo in più.
3. **«Together», chi dice sì** (2026-11-08): «Basta tag e visibilità».
   Nessuna richiesta in più: la traccia di una persona entra nel video se
   è taggata nel post e la sua attività della stessa corsa è visibile a chi
   fa il video. La promessa «senza orari» della privacy va riscritta per
   questo caso (testo approvato, scelta 5).
4. **Quante persone** (2026-11-08): «4». Chi fa il video più al massimo 3
   persone taggate; ognuna con il suo colore della linea dai token.
5. **I testi in cinque lingue** (2026-11-08): «Sì, approvo». Sono nella
   sezione «Testi approvati» qui sotto, compresa la riga nuova della
   privacy.

## Come si fa (proposta)

### Parte 1 — la mia immagine al posto dell'animale

**Dove si sceglie.** Nella riga «Character» c'è una casella nuova, prima
degli animali: «My image». Vuota ha un «+»; toccata apre un foglietto con
«Choose a photo» (libreria: foto o GIF) e «Take a photo» (fotocamera, dallo
stesso `expo-image-picker`). Con un'immagine scelta la casella la mostra
tonda, e il foglietto ha anche «Remove image».

**Il ritaglio tondo.** `expo-image-picker` con `allowsEditing` e
`aspect: [1, 1]` fa scegliere il quadrato con le dita (il ritaglio di
sistema, niente codice nostro); `expo-image-manipulator` lo riduce a
**256 px** in JPEG. La pagina lo disegna dentro un cerchio con un bordo
del colore della linea. Niente sagoma scontornata: vorrebbe codice nativo.

**Le GIF dalla libreria.** Non c'è ImageDecoder su iOS, quindi un lettore
GIF **piccolo e nostro** in TypeScript (`share/gifFrames.ts`, LZW e
fotogrammi, nessuna dipendenza): legge il file, tiene **al massimo 8
fotogrammi** presi a distanza uguale, li riduce a 256 px al massimo e li
passa alla pagina. Il formato con cui passano (RGBA in base64 o BMP come
data URL) e il tetto del peso (proposta: 2 MB in tutto, altrimenti si
tiene il primo fotogramma) si misurano nella parte B. Un test lo prova su
GIF piccole scritte nel test, byte per byte.

**Nel video.**
- L'immagine sta sulla **punta della linea**, al posto dell'animale, con un
  **saltello** piccolo (un'onda di pochi pixel al passo del video) e
  inclinata un poco nel verso della strada, senza capovolgersi.
- La GIF gira a ciclo con i suoi tempi; l'immagine ferma no.
- **Sul 3D** è un **cartellino in piedi** sulla linea già posata sulle
  colline: un'asticella sottile dal punto della traccia, l'immagine sopra e
  un'ombra tonda sul terreno. Si disegna sul fotogramma 2D, come l'animale
  (ADR-0339, precisazione B).
- **A fine percorso si ferma** come l'animale (`clip: "rest"`): il saltello
  si spegne.
- **Se l'immagine non si legge** (file rotto, GIF troppo grande, memoria),
  il video esce senza, come oggi senza animale: mai un errore. Il foglietto
  lo dice con una riga.

**Nella scena.** Un tipo di personaggio in più accanto agli animali (per
esempio `{ kind: "image", frames, frameMs }`) e un modo della pagina per
riceverlo (come `prepareCharacter`). Sono file di TASK-408: si toccano solo
dopo C2, con la lista al Coordinatore.

**Privacy.** L'immagine resta sul telefono, nella cartella dell'app, e non
va al server; ne esce solo dentro il video che l'utente condivide o
pubblica. La privacy dice già che il video si fa sul telefono ed esce solo
dal foglio di condivisione: per l'immagine **nessuna riga nuova**; se il
video si pubblica nel Feed vale quello che la privacy dice dei video dei
post. **Nessun personaggio di altri** tra le immagini: l'app non offre
immagini sue, solo quelle dell'utente.

### Parte 2 — «Together», il video insieme alle persone taggate

**Quando c'è.** Nel foglio «Edit video» di un post con persone taggate,
una riga «Together» (un interruttore) se almeno una persona taggata ha
**corso la stessa corsa**: un'attività sua che si sovrappone nel tempo a
quella del post (proposta: almeno metà della più corta in comune) e la cui
partenza è a meno di 2 km. Altrimenti la riga c'è, spenta, con «No one
tagged ran at the same time.». Al massimo 3 persone oltre a chi fa il video
(scelta 4), le prime nell'ordine dei tag.

**Chi entra** (scelta 3). La traccia di una persona taggata entra se:
- è taggata nel post;
- la sua attività della stessa corsa è **visibile a chi fa il video**
  secondo `drawing_seen_sql` (un disegno `everyone`, o `followers` con il
  follow accettato; mai `only_me`, mai bloccati, mai nascosti).
Nessuna richiesta, nessun «accetta». Se la persona rende privata la sua
attività o toglie il disegno, il server non la dà più (un video già fatto
resta com'è).

**I tempi.** Il server ha i tempi (M di `runs.track`) ma non li dà a
nessuno. Serve un endpoint nuovo, per esempio
`GET /drawings/{id}/together`, solo per l'autore del post, che risponde con
le tracce di tutti (l'autore compreso: nemmeno lui oggi riceve i suoi
tempi):
- per ognuno `public_id`, `username`, i punti `[lat, lon]` e accanto i
  **secondi dalla prima partenza del gruppo** (mai l'ora del giorno, mai
  la data), le pause sullo stesso orologio;
- al più 600 punti a traccia, tolti con lo stesso semplificatore del
  server, senza spostarne nessuno;
- con le regole di visibilità di oggi, in `drawing_seen_sql`.

**Nel video.**
- **Un orologio solo**, vero: dalla prima partenza all'ultimo arrivo,
  compresso nei secondi del pezzo «The route» della scena. A ogni
  fotogramma ognuno è nel punto della sua traccia dove era in quel
  secondo, fra due punti registrati; in pausa sta fermo. Chi va più
  veloce avanza di più. Le coordinate sono quelle registrate.
- **Ognuno ha il suo colore** della linea dai token (giallo, azzurro, rosa,
  verde, bianco: chi fa il video sceglie il suo, gli altri prendono i
  successivi) e **il suo animale o la sua immagine**: chi fa il video
  può usare la sua immagine; agli altri si dà un animale diverso a testa,
  che chi fa il video può cambiare. Un nome piccolo sotto ognuno (lo
  username).
- **Dove le tracce si incrociano nello stesso momento** (meno di 25 m, in
  una finestra di 10 s vera) spunta un segno: ⚡, come le emoji che saltano
  fuori oggi. Al più un segno ogni 3 secondi di video, per non coprire
  tutto quando si corre affiancati.
- La mappa inquadra tutte le tracce. Su 3D la camera resta sul gruppo
  intero, non dietro a uno solo.
- La pagina oggi ha un solo `actor`: va estesa a più personaggi (file di
  TASK-408). Se il telefono non ce la fa con 4 personaggi 3D (misura nella
  parte E), gli altri diventano punti colorati e il video esce comunque.

**Privacy.** Cambia: chi è taggato e ha l'attività visibile a chi fa il
video si vede nel video con il suo **passo vero** (quanto andava veloce,
dove si è fermato), senza l'ora del giorno. Va scritto nella privacy, nelle
cinque lingue (testo approvato, scelta 5), e la frase «senza orari» prende
l'eccezione.

## Domande aperte (una alla volta)

1. ~~Come si crea l'immagine~~: risposta sopra (scelta 1).
2. ~~Nel Feed com'è o con un controllo~~: risposta sopra (scelta 2).
3. ~~«Together», chi dice sì~~: risposta sopra (scelta 3).
4. ~~Quante persone~~: risposta sopra (scelta 4).
5. ~~I testi in cinque lingue~~: risposta sopra (scelta 5). Le domande
   sono finite: prossima la parte B, quando C2 di TASK-408 è chiusa.

## Testi approvati (scelta 5)

Riusati senza cambiarli, perché l'app li ha già: «Take a photo»,
«Character», «Edit video», «Done».

### La riga «Character» e il foglietto dell'immagine

| en | it | de | es | fr |
|---|---|---|---|---|
| My image | La mia immagine | Mein Bild | Mi imagen | Mon image |
| Choose a photo | Scegli una foto | Foto auswählen | Elegir una foto | Choisir une photo |
| Remove image | Togli l'immagine | Bild entfernen | Quitar la imagen | Retirer l'image |
| Your image stays on this phone. It leaves only in the video you share. | La tua immagine resta sul telefono. Esce solo nel video che condividi. | Dein Bild bleibt auf dem Handy. Es verlässt es nur im Video, das du teilst. | Tu imagen se queda en el móvil. Solo sale en el vídeo que compartes. | Ton image reste sur ton téléphone. Elle n'en sort que dans la vidéo que tu partages. |
| This image can't be read. The video goes out without it. | Questa immagine non si legge. Il video esce senza. | Dieses Bild lässt sich nicht lesen. Das Video kommt ohne es. | Esta imagen no se puede leer. El vídeo sale sin ella. | Cette image est illisible. La vidéo sort sans elle. |

### «Together»

| en | it | de | es | fr |
|---|---|---|---|---|
| Together | Insieme | Zusammen | Juntos | Ensemble |
| Your run and the runs of the people tagged here, on the same clock. | La tua corsa e quelle delle persone taggate qui, sullo stesso orologio. | Dein Lauf und die Läufe der hier markierten Personen, auf derselben Uhr. | Tu carrera y las de las personas etiquetadas aquí, con el mismo reloj. | Ta course et celles des personnes identifiées ici, sur la même horloge. |
| No one tagged ran at the same time. | Nessuna persona taggata ha corso nello stesso momento. | Niemand der Markierten ist zur selben Zeit gelaufen. | Nadie etiquetado corrió a la misma hora. | Personne parmi les personnes identifiées n'a couru au même moment. |
| Up to 4 people in one video. | Fino a 4 persone in un video. | Bis zu 4 Personen in einem Video. | Hasta 4 personas en un vídeo. | Jusqu'à 4 personnes dans une vidéo. |

### La privacy (`about/content/*.ts`, «Your runs and their GPS tracks»)

Nella frase di oggi «…and without times, pauses or the planned route.»
si aggiunge «, except in a «Together» video (below)». Poi un punto nuovo:

- **en**: If someone tags you in the post of a run and you recorded that same run at the same time, and your run is visible to them, they can put your track in a «Together» video. Your line moves at your real pace, with your pauses, from the first start to the last finish: whoever sees the video sees how fast you went, but not the time of day or the date. Make your run «Only me» and it can no longer be used; a video already made stays as it is.
- **it**: Se qualcuno ti tagga nel post di una corsa e tu hai registrato la stessa corsa nello stesso momento, e la tua corsa è visibile a quella persona, può mettere la tua traccia in un video «Together». La tua linea si muove al tuo passo vero, con le tue pause, dalla prima partenza all'ultimo arrivo: chi vede il video vede quanto andavi veloce, ma non l'ora né la data. Metti la tua corsa su «Only me» e non si può più usare; un video già fatto resta com'è.
- **de**: Wenn dich jemand im Beitrag eines Laufs markiert und du denselben Lauf zur selben Zeit aufgezeichnet hast und dein Lauf für diese Person sichtbar ist, kann sie deine Strecke in ein «Together»-Video aufnehmen. Deine Linie bewegt sich in deinem echten Tempo, mit deinen Pausen, vom ersten Start bis zum letzten Ziel: Wer das Video sieht, sieht, wie schnell du warst, aber nicht die Uhrzeit oder das Datum. Stell deinen Lauf auf «Only me», dann kann er nicht mehr verwendet werden; ein schon gemachtes Video bleibt, wie es ist.
- **es**: Si alguien te etiqueta en la publicación de una carrera y tú grabaste esa misma carrera a la misma hora, y tu carrera es visible para esa persona, puede poner tu recorrido en un vídeo «Together». Tu línea avanza a tu ritmo real, con tus pausas, desde la primera salida hasta la última llegada: quien vea el vídeo verá lo rápido que ibas, pero no la hora ni la fecha. Pon tu carrera en «Only me» y ya no se podrá usar; un vídeo ya hecho se queda como está.
- **fr**: Si quelqu'un t'identifie dans la publication d'une course et que tu as enregistré la même course au même moment, et que ta course lui est visible, il peut mettre ton tracé dans une vidéo «Together». Ta ligne avance à ton vrai rythme, avec tes pauses, du premier départ à la dernière arrivée : qui voit la vidéo voit à quelle vitesse tu allais, mais pas l'heure ni la date. Mets ta course sur «Only me» et elle ne peut plus être utilisée ; une vidéo déjà faite reste telle quelle.

## Le parti

- **A — la proposta** (questa PR): il task file, ADR-0345, la tavola.
- **B — l'immagine al posto dell'animale**: la casella «My image», la foto
  o la GIF dalla libreria, il lettore GIF, il personaggio `image` nella
  scena e nella pagina, il cartellino sul 3D. Tocca file di TASK-408: parte
  quando C2 è chiusa, con la lista al Coordinatore.
- **C — l'immagine creata nell'app**: «Take a photo» e il ritaglio tondo
  (scelta 1). Piccola: può entrare nella PR di B se il Coordinatore lo
  approva nella lista.
- **D — «Together»**: l'endpoint dei tempi sul server, la «stessa corsa»,
  la riga nel foglio, più personaggi nella pagina, l'orologio unico, i
  segni dove ci si incrocia, la riga della privacy. Probabilmente in due
  PR: D1 server, D2 app.
- **E — la prova sul telefono**: il tempo dell'esportazione con
  l'immagine, con una GIF di 8 fotogrammi e con 4 persone, nei tre stili;
  l'impronta iOS uguale a prima.

Ogni parte manda prima al Coordinatore la lista dei file e ha test
deterministici.

## Tavola della proposta

La tavola (Design, privata): https://claude.ai/artifact/9mbg6VzP4hPRiSR1yULx5G
— tre tavole: il foglio «Edit video» con «My image» nella riga «Character»
e la riga «Together», più il foglietto dell'immagine; tre fotogrammi
dell'immagine sulla linea (0:03 Notte, 0:06 il cartellino sul 3D, 0:11
ferma all'arrivo); il video «Together» in quattro, con l'orologio vero
compresso nel pezzo «The route» e i ⚡ dove ci si incrocia. La foto e i
tempi sono segnaposto. Sorgenti nella cartella temporanea della sessione,
non nel repository.

## File toccati

Questa PR (documenti): `docs/tasks/TASK-417.md` (nuovo),
`docs/DECISIONS.md` (ADR-0345, in fondo), `docs/STATUS.md` (una voce),
`docs/INDEX.md` (una riga).

Parti B–E: si elencano prima di ciascuna.

## Fuori scope

- Gli scatti in fila e il disegno a dito (scelta 1): un task a parte se
  l'utente li chiede.
- La sagoma scontornata: vuole codice nativo.
- Immagini o personaggi offerti dall'app oltre agli animali di TASK-408.
- Un controllo automatico delle immagini (scelta 2).
- Legare le corse registrate alle corse di gruppo di TASK-309.
- Un «accetta» del tag o un «togli il mio tag» (scelta 3).

## Criteri di accettazione

- [ ] Le domande 1–5 hanno una risposta scritta qui.
- [ ] Nessun file di TASK-408 toccato prima che C2 sia chiusa e la lista
  approvata dal Coordinatore.
- [ ] Se l'immagine non si legge, il video esce senza: un test lo prova con
  una GIF rotta e con un file vuoto.
- [ ] Il lettore GIF ha test con file scritti nel test e nessuna
  dipendenza nuova.
- [ ] L'immagine non va al server: un test prova che l'esportazione non
  chiama la rete con l'immagine.
- [ ] «Together»: il server dà le tracce con i tempi solo all'autore del
  post, solo delle persone taggate con l'attività visibile a lui, solo in
  secondi dalla prima partenza; test sul server per ognuno di questi casi.
- [ ] L'orologio unico usa solo punti registrati: un test prova che ogni
  posizione disegnata sta su un segmento fra due punti della traccia.
- [ ] La privacy ha la riga nuova nelle cinque lingue prima che «Together»
  vada in produzione.
- [ ] L'impronta iOS non cambia.

## Esito

*(a fine task)*
