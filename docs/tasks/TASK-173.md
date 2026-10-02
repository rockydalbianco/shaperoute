# TASK-173 — La musica nella corsa (Spotify)

**Stato**: Done (prima parte) · la seconda parte aspetta la risposta dell'utente
**Fase**: 4 · **Branch**: `feat/TASK-173-run-music`

## Obiettivo

Durante una corsa, con un percorso o senza, un pulsante «Music» apre
Spotify, l'app di musica dell'utente («uso Spotify», 2026-10-02). Seguito
di TASK-169, dove la musica era rimasta fuori in attesa di sapere quale app.

## Contesto da leggere

- `docs/UI.md` «La navigazione» → «La corsa»
- `docs/DECISIONS.md` ADR-0141, ADR-0137
- `docs/tasks/TASK-169.md`
- `apps/mobile/src/screens/RunDashboard.tsx`

## Cosa fare

1. `music.ts`: aprire Spotify con il suo link (`spotify:`); su un telefono
   senza Spotify, la sua pagina nello store.
2. «Music» nella scheda della corsa (`RunDashboard.tsx`), sulle due pagine.
3. Test; `UI.md`, ADR-0141.
4. I documenti di TASK-169: «da chiedere quale app di musica» diventa
   «l'utente usa Spotify (TASK-173)».
5. La seconda parte (brano, pausa e avanti dentro Sgrava): solo la domanda
   all'utente, qui sotto. Non si parte senza il suo sì.

## Criteri di accettazione

- [x] Mentre si corre, su «Map» e su «Data», c'è «Music» di fronte a
      «Pocket», con «Pause» in mezzo.
- [x] «Music» apre `spotify:`; se il telefono lo rifiuta, la pagina di
      Spotify nello store del telefono; se non si apre nemmeno quella, non
      succede niente e la corsa va avanti.
- [x] «Music» non mette in pausa e non cambia niente della corsa.
- [x] In pausa, prima della prima posizione e all'arrivo «Music» non c'è.
- [x] Nessuna dipendenza nuova; test, lint, typecheck e format dell'app verdi.
- [x] Visto nel simulatore, in una corsa con il GPS simulato: il pulsante
      sulle due pagine; senza Spotify il link è rifiutato («Unable to open
      URL: spotify:») e parte la pagina dello store.
- [ ] Prova sull'iPhone (dell'utente, dopo la pubblicazione), vedi sotto.

## Da provare sull'iPhone

Con Spotify installato e una canzone che suona:

1. **«Music» apre Spotify?** E «◀ Expo Go», in alto a sinistra, riporta
   alla corsa? Nel simulatore Spotify non c'è: si è visto solo il caso
   senza.
2. **La voce con la musica accesa**: a una svolta, o a un km, la voce
   abbassa la musica, la ferma, o ci parla sopra? E se la ferma, la musica
   riparte da sola dopo? Oggi l'app non dice niente al telefono su come
   mescolare i suoni (`expo-speech` e basta): quello che succede lo decide
   iOS, e si vede solo sul telefono. Se la voce ferma la musica o non si
   sente, il rimedio è dire a iOS di abbassarla mentre l'app parla: vuole
   `expo-audio`, una dipendenza nuova, in un task a parte.
3. **La corsa mentre si è in Spotify**: Sgrava registra solo in primo
   piano (`UI.md`, «La navigazione»). Scegliendo una playlist la corsa non riceve posizioni;
   al ritorno riprende. Da guardare: con «Auto-pause» accesa, quei secondi
   diventano una pausa (e i metri fatti intanto non contano)? Se dà
   fastidio, si decide in un task a parte cosa fare (non è di questo task:
   vale per ogni uscita dall'app, anche per rispondere a un messaggio).

## La seconda parte: una domanda per l'utente

**Brano, pausa e avanti dentro Sgrava.** Si può fare solo passando da
Spotify, che lo permette a queste condizioni (pagine di Spotify per
sviluppatori, lette il 2026-10-02):

- un'**app Spotify Developer creata dall'utente** (developer.spotify.com),
  e l'utente deve avere **Premium**: senza, l'app Developer smette di
  funzionare;
- finché l'app Developer è «in sviluppo» la possono usare **al massimo 5
  persone, aggiunte a mano una per una** dall'utente. Per tutti gli altri
  serve l'accesso esteso, che Spotify dà solo ad aziende che lo chiedono e
  che approva;
- chi ascolta deve avere Premium anche lui: pausa e avanti non funzionano
  con Spotify gratis;
- in Sgrava: un «Connect Spotify» con l'accesso al conto Spotify (OAuth),
  cioè **dipendenze nuove** (`expo-auth-session`, `expo-web-browser`,
  `expo-crypto`), e una richiesta a Spotify ogni pochi secondi per sapere
  che brano suona.

**Proposta dell'agente: non farla adesso.** Funzionerebbe per l'utente e
per altre quattro persone, non per chi scarica Sgrava; e pausa e avanti ci
sono già senza uscire dalla corsa, dalle cuffie e dal Centro di Controllo.
Si riprende quando Sgrava è sull'App Store (TASK-152) e ha senso chiedere a
Spotify l'accesso esteso.

**La domanda**: ti basta «Music» che apre Spotify, o vuoi brano, pausa e
avanti dentro Sgrava anche sapendo che per ora funzionano solo per te e
per chi aggiungi a mano (fino a 5)?

## File toccati

```
apps/mobile/src/navigation/music.ts
apps/mobile/src/navigation/music.test.ts
apps/mobile/src/screens/RunDashboard.tsx
apps/mobile/src/screens/RunDashboard.test.tsx
docs/UI.md
docs/DECISIONS.md
docs/STATUS.md
docs/tasks/TASK-169.md
docs/tasks/TASK-173.md
```

## Fuori scope

- Brano, pausa e avanti dentro Sgrava: la domanda qui sopra.
- Apple Music e le altre app di musica: l'utente usa Spotify. Una scelta
  dell'app di musica nel profilo, se qualcuno la chiede.
- Abbassare la musica mentre la voce parla (`expo-audio`): dopo la prova
  sull'iPhone, se serve.
- Cosa fa la corsa mentre l'app è dietro un'altra (la registrazione con lo
  schermo spento o l'app in secondo piano vuole una build propria).
- «Music» su una corsa in pausa: lì ci sono «Stop» e «Resume», e la scheda
  è già alta.

## Esito

Fatto (2026-10-02): mentre si corre, «Music» è di fronte a «Pocket» sulle
pagine «Map» e «Data» e apre Spotify; senza Spotify apre la sua pagina
nello store. Nessuna dipendenza nuova, `App.tsx` non toccato. 2 file nuovi
(`music.ts` e il suo test), 5 test nuovi. Visto nel simulatore in una corsa
con il GPS simulato; lì Spotify non c'è, quindi **l'apertura di Spotify
vero e la voce sopra la musica restano per l'iPhone** («Da provare
sull'iPhone»).

Emerso: uscire da Sgrava per scegliere la musica ferma la registrazione
finché non si torna (è così per ogni uscita dall'app). Rimandato, con una
domanda sola per l'utente: brano, pausa e avanti dentro Sgrava («La seconda
parte»).
