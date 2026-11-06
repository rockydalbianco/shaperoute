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

## Domande aperte (una alla volta)

1. **three.js e i modelli CC0** — la prossima. Proposta: sì a three.js
   nella pagina del video (versione fissata, SRI, nessun cambio nativo) e ai
   modelli CC0 di Quaternius.
2. **L'elefante**. Proposta: per la prima versione gli animali del
   pacchetto CC0; l'elefante dopo, con un modello a pagamento di cui si
   legge la licenza, o fatto per MuW.
3. **Quali personaggi** nella riga, e quanti. Proposta: 5 o 6, scelti dalla
   tavola dopo aver visto il pacchetto.
4. **Le scene e il finale**: quali pezzi si offrono, e se la durata resta
   12 secondi. Proposta: tre pezzi fissi da scegliere e riordinare, 12
   secondi.
5. **Il prompt**: cosa si promette nel testo del riquadro, e la prima
   tabella di parole. Proposta: «Describe your video: an animal, colours,
   emoji, the ending», con le parole di ogni voce dell'editor.
6. **I testi** in cinque lingue.

## Le parti

- **A — la proposta** (questa PR): il task file, ADR-0339, la tavola.
- **B — il personaggio 3D**: three.js e i modelli nella pagina del video,
  la riga «Personaggio», la camera che segue, la misura sul telefono.
- **C — l'editor**: il foglio «Edit video», colori, emoji lungo il
  percorso, scene, finale, lo stile 2D.
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
