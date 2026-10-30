# TASK-348 — Il compositore del post: foto e video in primo piano, il disegno GPS, un editor

**Stato**: Proposta · 2026-10-30 · le scelte di prodotto sono da chiedere
all'utente una per volta; nulla di nativo prima del taglio della 1.0.2
**Fase**: 4 · **Branch**: `docs/TASK-348-post-composer` (documenti), poi
una PR per parte
**ADR**: ADR-0301 (proposta), che estende ADR-0170 (le foto dei post),
ADR-0275 (la striscia del Feed) e ADR-0292 (il video nei post, TASK-336);
usa ADR-0254 (il video della corsa)
**Numeri**: TASK-348 / ADR-0301, **assegnati dal Coordinatore** il
2026-10-30.

## Obiettivo

Quando pubblica una corsa, l'utente compone un post di più elementi: le
sue foto e i suoi video in primo piano, il disegno GPS come secondo piano
o come pagina a sé, e li ritocca con un editor integrato prima di
«Publish».

Richiesta dell'utente del 2026-10-30 (testo incollato, interrotto a
«Layout tra cui scegliere, con»), approvata con «Vai con la proposta»:

- l'utente sceglie il disegno GPS e aggiunge foto o video dalla galleria
  o dalla fotocamera;
- post a più contenuti (carosello): fino a 10 elementi tra foto, video e
  disegno, riordinabili trascinandoli;
- layout tra cui scegliere (il resto del testo manca);
- un editor foto e video «professionale» (stile Instagram, Strava,
  CapCut, VSCO).

La proposta di partenza, con l'analisi del codice, è in
`out/post-editor/PROPOSTA.md` (fuori dal repository).

## Contesto da leggere

- `docs/DECISIONS.md` ADR-0170 «Parte B» (foto sul telefono, `syncPhotos`),
  ADR-0275 (la striscia del Feed), ADR-0292 (il video nei post), ADR-0289
  (file su disco, `media_files.py`), ADR-0254 (il video della corsa).
- `docs/tasks/TASK-336.md` «Le scelte dell'utente»: un video per post,
  30 s, 40 MB, 960 × 540, tetto 15 GB, `expo-video` nella 1.0.2.
- `docs/API.md` «Drawings».

## Vincoli (dal Coordinatore, 2026-10-30)

- **TASK-336 / ADR-0292** (il video nei post) e **ADR-0289** (la regola
  comune dei media): qui si citano le loro regole, non se ne scrivono di
  nuove. Se l'utente vuole più video per post, serve una modifica
  esplicita ad ADR-0292 con lo spazio sul server ricalcolato.
- **`FeedPost.tsx`** lo toccano anche TASK-336 B, TASK-339 B (il nuovo
  aspetto) e TASK-345 A (una riga): prima del codice si chiede l'ordine al
  Coordinatore.
- **Parte A** con `react-native-view-shot` e `PanResponder`, nessuna
  dipendenza nuova, impronta iOS `83793e26` invariata.
  `react-native-view-shot` 5.1.0 è già in `apps/mobile/package.json` e lo
  usa `share/sharePicture.ts` (TASK-231): non è una dipendenza nuova.

## Cosa c'è già e cosa si riusa

| Pezzo | Dove | Riuso |
|---|---|---|
| Form di pubblicazione | `social/PublicParts.tsx` (`PhotosRow`, `nextPlace`), `activities/RunEnd.tsx` | Punto d'ingresso: «Add photo» apre il compositore |
| Scelta e riduzione | `social/pickDrawingPhoto.ts` | Scelta multipla (`allowsMultipleSelection`, `selectionLimit`), foto e video; riduzione a 1080 px invariata |
| Foto sul telefono e invio | `social/drawingPhotos.ts`, `drawingOutbox.ts`, `drawingsDoor.ts` | Stessa via: un file sul telefono per elemento, inviato dopo il `PUT` del disegno |
| Carosello del Feed | `feed/FeedPost.tsx` (TASK-315, TASK-330) | Lettore del carosello; `Pressable` dentro lo `ScrollView` |
| Video della corsa | `share/videoScene.ts`, `videoPage.ts`, `mp4.ts`, `videoMusic.ts` | Un elemento del carosello con un tocco |
| Immagine composta | `share/PostImage.tsx`, `sharePicture.ts`, `react-native-view-shot` | I layout delle foto nella parte A senza nulla di nativo |
| Linea del disegno | `feed/feedRoute.ts`, `turnedLine.ts` | La linea sopra la foto |
| Video nei post | TASK-336, `media_files.py` | Caricamento, lettura con `Range`, tetto, lettore |

Nell'app mancano `react-native-gesture-handler`, `react-native-reanimated`,
`@shopify/react-native-skia` ed `expo-video`: tutti nativi, quindi solo
dalla build 1.0.2 (l'impronta iOS `83793e26` resta per la 1.0.1).

## Il disegno tecnico (proposta, deciso dall'agente su delega dell'utente)

1. **Un post è una lista ordinata di elementi**, al più 10: il disegno
   (sempre uno, la mappa viva del Feed), foto, video, il video della corsa.
2. **Modifiche non distruttive**: l'originale resta sul telefono; le
   modifiche sono un JSON (ritaglio, rotazione, filtro, regolazioni,
   testo, adesivi; per i video anche inizio e fine) fino a «Publish».
3. **Il layout è una funzione pura** (`layoutFrame(layout, size)` →
   rettangoli), la stessa per anteprima ed esportazione, con test
   deterministici.
4. **«Publish» appiattisce**: ogni foto diventa un JPEG 1080 × 1350 (4:5)
   con disegno e modifiche dentro, ogni video un MP4 con i limiti di
   TASK-336. Il server riceve file normali e non sa nulla dell'editor.
5. **API**: `DRAWING_MAX_PHOTOS` da 3 a 10 e un ordine riscrivibile degli
   elementi (oggi «un posto svuotato resta vuoto»); un'app vecchia continua
   a vedere le foto in ordine.
6. **Librerie** (ognuna è una dipendenza nuova e va chiesta all'utente):
   - parte A, nessuna: riordino con `PanResponder` + `Animated` di React
     Native, layout con `react-native-view-shot` (c'è già);
   - dalla 1.0.2: `react-native-gesture-handler` + `react-native-reanimated`
     (gesti), `@shopify/react-native-skia` (filtri come matrici di colore e
     LUT, regolazioni, testo, adesivi, JPEG finale con `makeImageSnapshot`),
     `expo-video` (già scelto in TASK-336);
   - per esportare un video modificato: un modulo Expo nostro in
     `apps/mobile/modules/` (AVFoundation su iOS, Media3 Transformer su
     Android), senza librerie di terzi.
   - Scartati: ffmpeg-kit (ritirato nel 2025, licenza GPL, 30–60 MB);
     WebCodecs nella WebView per i video dell'utente (serve un demuxer MP4,
     lento a 1080p, non garantito su Android).

## Le scelte dell'utente

Da chiedere una alla volta, ognuna con la proposta già pronta. Le
risposte si scrivono qui.

1. **Il resto della richiesta**: il testo incollato si ferma a «Layout tra
   cui scegliere, con».
   — *Risposta (2026-10-30):* «Vai con la proposta»: si procede con
   quello che c'è; i layout e l'editor li propone l'agente qui sotto.
2. **Quanti video per post.** TASK-336 ha il sì per un video ≤ 30 s; la
   richiesta parla di 10 elementi tra foto e video. Proposta: fino a 10
   elementi, al più 3 video da 30 s; il tetto di 15 GB si riempie circa
   tre volte più in fretta. Se l'utente dice sì: una modifica esplicita
   ad ADR-0292 con la stima dello spazio rifatta.
   — *Risposta (2026-10-30):* «Sì, al più 3». Fino a 10 elementi, al più
   3 video da 30 s l'uno (il video della corsa conta come uno). La modifica
   è «ADR-0292, aggiunta» in `DECISIONS.md`: il tetto di 15 GB non cambia,
   e con l'ipotesi media si raggiunge in 5–10 settimane invece di circa
   quattro mesi.
3. **I layout.** Proposta, quattro: foto a tutto schermo con il disegno in
   un riquadro d'angolo; la linea del disegno sopra la foto, trasparente;
   metà foto e metà disegno; disegno grande con la foto nell'angolo.
   — *Risposta (2026-10-30):* «Sì, i quattro».
4. **Il disegno nel carosello.** Proposta: spostabile; la scheda del Feed
   mostra come copertina il primo elemento.
   — *Risposta (2026-10-30):* «Sì, spostabile».
5. **Appiattire o no.** Proposta: appiattire (foto con il disegno dentro).
   Alternativa: il layout ricostruito nel Feed, con la linea nitida, ma
   un'app vecchia vedrebbe solo la foto nuda.
   — *Risposta (2026-10-30):* «Sì, appiattire».
6. **Cosa c'è nell'editor.** Proposta: ritaglio e raddrizza, 12–15 filtri,
   regolazioni (esposizione, contrasto, saturazione, calore, ombre e luci,
   vignettatura, grana), testo, adesivi, prima/dopo, annulla e ripeti,
   «applica a tutte»; per i video taglio di inizio e fine, ritaglio 4:5 o
   9:16, filtri, il disegno sopra.
   — *Risposta:* da chiedere.
7. **I testi e la privacy**: in inglese da approvare, la privacy nelle
   cinque lingue se cambia (10 foto invece di 3, più video).
   — *Risposta:* da chiedere.

## Cosa fare (le parti)

Ogni parte ha la sua PR e parte da `main` solo col via del Coordinatore.

- **A — Carosello di foto e layout, con un OTA.** API: fino a 10 foto e
  l'ordine (migrazione, il primo numero libero in `main` al merge). App:
  scelta multipla, riordino col dito, i layout, «Publish» che appiattisce
  con `view-shot`, il Feed con fino a 10 pagine. Impronta iOS invariata.
- **B — Editor foto (1.0.2).** Skia, gesture-handler, reanimated, dopo il
  sì a ciascuna dipendenza.
- **C — Video nel carosello (1.0.2, dopo TASK-336 A–D).** Taglio, ritaglio,
  filtri, disegno sopra, il modulo di esportazione nativo.
- **D — Rifiniture.** Preset salvati, musica (`videoMusic.ts`), velocità.

## Criteri di accettazione

- [ ] Le scelte 2–7 hanno una risposta dell'utente scritta qui.
- [ ] Ogni dipendenza nuova ha il sì dell'utente scritto qui.
- [ ] Parte A: un post con 10 foto e il disegno, riordinato, si pubblica e
      si vede nel Feed nello stesso ordine; un'app vecchia vede le foto.
- [ ] Parte A: `layoutFrame` ha test deterministici per ogni layout.
- [ ] Parte A: l'impronta iOS resta `83793e26` su una copia pulita.
- [ ] Parti B e C: entrano solo nella build 1.0.2.

## File toccati

Questa PR (solo documenti):

```
docs/tasks/TASK-348.md
docs/DECISIONS.md
docs/STATUS.md
docs/INDEX.md
```

Le parti elencano i loro file prima del codice e li mandano al
Coordinatore; `PublicParts.tsx` e `drawingsDoor.ts` sono anche di
TASK-336, `FeedPost.tsx` anche di TASK-336 B, TASK-339 B e TASK-345 A:
l'ordine lo decide il Coordinatore.

## Fuori scope

- Montaggio di più clip in un video solo, transizioni, sottotitoli
  automatici (CapCut vero e proprio).
- Un'AI che ritocca le foto o sceglie il layout.
- Modificare foto e video dopo «Publish» (si toglie e si rimette).
- Condividere il carosello su Instagram come carosello (oggi si condivide
  un'immagine sola).

## Esito

*(a fine task)*
