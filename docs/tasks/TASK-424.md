# TASK-424 — I dati dal vivo per ogni sport e «Share live activity»

**Stato**: Proposto (parte 0)
**Fase**: 5 · **Branch**: `docs/TASK-424-live-share` (parte 0) · **ADR**:
ADR-0352 · numeri dal Coordinatore (2026-11-09)

## Obiettivo

Chiesto dall'utente il 2026-11-08. Due cose:

1. **Tutti i dati in tempo reale sul telefono mentre si registra, per ogni
   sport**: distanza, tempo, passo o velocità, calorie, dislivello; il
   battito quando un orologio lo manda (TASK-370 A3, `src/watch/`). Nel
   nuoto in piscina: tempo, vasche stimate dal passo, calorie stimate
   (TASK-409).
2. **«Share live activity»**: un pulsante sullo schermo della registrazione
   crea un link da mandare a qualcuno (per esempio un genitore) che non ha
   l'app né un account. Dal link, in una pagina web, si vedono dal vivo la
   posizione sulla mappa, il percorso fatto, i dati e quando l'attività è
   finita. La condivisione si ferma quando si vuole. **Vale per tutti gli
   sport** (aggiunta dell'utente, stesso giorno: «bici, sci, tutti gli sport
   in pratica»).

## Contesto da leggere

- `apps/mobile/src/screens/RunPanel.tsx` (`useRunNumbers`, `RunStrip`,
  `RunGrid`), `screens/RunDashboard.tsx` (`RunCard`)
- `apps/mobile/src/navigation/runPosition.ts` (la posizione a telefono
  bloccato), `navigation/trackRecorder.ts`, `navigation/trackStore.ts`
- `apps/mobile/src/watch/useWatch.ts`, `watch/WatchHeart.tsx`
- `apps/mobile/src/pool/`, `apps/mobile/src/gym/WorkoutScreen.tsx`
- `docs/API.md` (intro, «Account»), `docs/DATABASE.md`, `docs/DEPLOY.md`
  (Caddy, il sito copiato a mano), `docs/SITO.md`
- `services/api/shaperoute_api/access.py` (`OPEN_PATHS`),
  `account_email.py` (le pagine a token), `message_media.py` (`SweepRound`)
- Privacy: `apps/mobile/src/about/content/*.ts` («Your position», «Your
  runs and their GPS tracks»), `site/tools/make_privacy.mjs`; ADR-0092,
  ADR-0096, ADR-0218, ADR-0306, `tasks/TASK-363.md`

## Parte 0 — Cosa c'è già e cosa manca

### Cosa mostra lo schermo oggi, sport per sport

Ogni sport con il GPS passa da `RunCard` (`RunDashboard.tsx`), con i numeri
di `useRunNumbers` (`RunPanel.tsx`): lungo un percorso (`NavigationCard`) o
senza (`FreeRunCard`, con `freeRunAs` dello sport). Sulla pagina «Map», in
corsa, c'è la striscia: **distanza, passo o velocità adesso, tempo**. Sulla
pagina «Data» e in pausa c'è la griglia: passo o velocità adesso e media,
tempo, poi una riga che cambia con lo sport. Il battito dell'orologio
(`WatchHeart`) sta **solo sulla pagina «Map»**.

| Sport | Distanza | Tempo | Passo / velocità | Calorie | Dislivello | Battito |
|---|---|---|---|---|---|---|
| Corsa, walk, hike | sì | sì | passo (adesso, media, ultimo km) | solo «Data»/pausa | solo «Data»/pausa | solo «Map», con orologio |
| Bici, gravel, MTB, roller | sì | sì | velocità | solo «Data»/pausa | solo «Data»/pausa | solo «Map» |
| Canoa | sì | sì | velocità, media /500 m | solo «Data»/pausa | — (sull'acqua non serve) | solo «Map» |
| Nuoto in acque libere | sì | sì | velocità, media /100 m | **manca** (niente formula) | — | l'orologio non ha il nuoto |
| Sci alpino («Record only») | sì | sì | velocità (della bici) | sì, ma **con la formula della bici** | solo «Data»/pausa | solo «Map» |
| Sci di fondo (non ancora acceso) | sì | sì | passo (della corsa) | formula della corsa | sì | solo «Map» |
| Palestra | — | orologio | — | sì, riga «N kcal» | — | **manca** |
| Nuoto in piscina | — | orologio | **manca** | **manca dal vivo** (solo alla fine) | — | **manca** |

Scialpinismo, carrozzina e ciaspole non sono ancora sport sceglibili
nell'app (TASK-415, 414, 413 in corso): quando arrivano usano `RunCard` e
prendono quello che c'è.

Il battito è vuoto finché l'app non ha il modulo nativo dell'orologio (la
build 1.1, TASK-370 A-flip): oggi `watchLink()` dà `null`. Il lavoro sul
battito quindi si vede solo con quella build.

### Cosa manca (parte C)

1. **Il battito anche sulla pagina «Data»**, non solo su «Map».
2. **Calorie del nuoto in acque libere**: la formula a MET per passo del
   nuoto in piscina (`pool/poolKcal.ts`) vale anche qui.
3. **Calorie dello sci alpino** con una formula da sci, non quella della
   bici (e lo sci di fondo con la sua, quando si accende).
4. **Nuoto in piscina dal vivo**: vasche stimate (`estimateLengths`, oggi
   solo alla fine) e calorie stimate (`poolKcal`), aggiornate col tempo.
5. **Battito nella palestra e in piscina**: va con TASK-385 G e TASK-409 B
   (che lo stanno facendo); qui solo se resta qualcosa.

Calorie e dislivello sulla pagina «Map» (la striscia ha tre caselle) sono
una scelta di prodotto: sono già su «Data», a uno swipe.

### Cosa c'è per la condivisione dal vivo

**Niente**: nessuna parte dell'app manda punti al server durante una
registrazione; la traccia resta sul telefono fino al salvataggio
(`trackStore.ts`). Le corse di gruppo (TASK-309) sono solo un appuntamento.
Il sito è statico, senza mappe e senza chiamate all'API. Le pagine a token
dell'API (conferma email, password) sono il modello per un link pubblico.

## Proposta

### Come funziona (per l'utente)

1. Sullo schermo della registrazione, un pulsante «Share live».
2. La prima volta un foglio spiega cosa vede chi riceve il link e chiede il
   consenso; poi il foglio di condivisione del telefono (WhatsApp, SMS,
   Mail…) con un testo breve e il link.
3. Mentre si registra, una piccola etichetta «Sharing live» sullo schermo
   ricorda che la condivisione è attiva; un tocco la ferma.
4. Chi apre il link vede una pagina su `getmuw.app`: la mappa con la
   posizione e il percorso fatto, i dati (distanza, tempo, passo o
   velocità, dislivello, calorie), «aggiornato 10 s fa», e quando
   l'attività finisce «Finished» con il riepilogo. Se il telefono non
   manda più niente per un po', la pagina lo dice («No update since
   10:42»).
5. A fine attività il link scade e i punti si cancellano.

### Le parti (una PR ciascuna)

- **A1 — Server**: tabelle, rotte, pulizia, la riga della privacy. Il
  server va aggiornato col sì dell'utente.
- **A2 — La pagina web** `site/live/`: statica, legge l'API ogni 10 s.
- **B — L'app**: il pulsante, il consenso, l'invio dei punti, lo stop.
  Parte da `main` **dopo** TASK-422 (#971, `RunDashboard.tsx`).
- **C — I dati dal vivo che mancano** (l'elenco sopra). Parte dopo
  TASK-422, TASK-370 B3, TASK-409 B e TASK-411 C, che toccano quei file.
- **D — Piscina e palestra in condivisione** (senza mappa, solo i dati), se
  l'utente lo vuole: dopo B.

### La tecnica (ADR-0352, decisa dall'agente)

- **Il telefono manda i punti ogni 15 s** mentre ci si muove, in un solo
  `POST` con i punti nuovi (al massimo uno ogni 5 s) e i numeri del
  momento. Subito anche a pausa, ripresa e fine. In pausa un segnale ogni
  60 s. L'invio parte dal task della posizione che già gira a telefono
  bloccato (`runPosition.ts`): nessun task nuovo. Se la rete manca i punti
  restano in coda (al massimo 500) e partono al giro dopo.
- **La pagina chiede ogni 10 s** (`GET /live?t=…&after=<seq>`, solo i punti
  nuovi). Niente WebSocket né SSE: Caddy e l'API restano come sono.
- **Il link**: `https://getmuw.app/live/#<token>`, un token casuale di 128
  bit fatto dal server (`secrets.token_urlsafe`), salvato solo come hash
  SHA-256. Dopo il `#` il token non arriva mai al server del sito né nel
  Referer; la pagina lo manda all'API in query, che il log non scrive
  (ADR-0096). `/live` entra in `OPEN_PATHS`; solo lì la risposta ha
  `Access-Control-Allow-Origin: https://getmuw.app`. Un limite di richieste
  per token sul `GET`.
- **Il server**: `live_shares` (proprietario, sport, inizio, fine, stop,
  scadenza, ultimi numeri) e `live_share_points` (seq, lat, lon, tempo),
  con `ON DELETE CASCADE` dall'account. Una pulizia ogni 5 minuti nello
  stile di `SweepRound` cancella i punti scaduti. Il log non scrive
  posizioni (ADR-0092).
- **Nessuna dipendenza nuova**: nell'app `fetch` e `Share` di React Native
  (già usato in `game/shareCode.ts`); sul server la libreria standard.
  L'impronta iOS dovrebbe restare `83793e26`: si misura nella parte B.
- **La mappa della pagina**: MapLibre alla stessa versione dell'app, con le
  tile di OpenFreeMap. È la prima pagina del sito che carica qualcosa da
  fuori: va detto nella privacy del sito (scelta dell'utente sotto).

### Scelte di prodotto per l'utente (una alla volta)

Ognuna con una proposta. Si scrivono qui con la risposta.

1. **Chi può ricevere il link** — proposta: chiunque lo abbia, senza app e
   senza account; si manda a chi si vuole.
2. **Quanto dura il link** — proposta: fino alla fine dell'attività, poi la
   pagina mostra «Finished» e il riepilogo per 1 ora, poi scade e i punti
   si cancellano; al massimo 24 ore in ogni caso.
3. **Cosa vede chi lo apre** — posizione esatta o sfocata vicino a casa;
   battito sì o no. Proposta: posizione esatta (lo scopo è sapere dove si
   è), battito no (è un dato di salute).
4. **Se parte da sola a ogni registrazione** — proposta: no, ogni volta col
   pulsante.
5. **Come si manda** — proposta: il foglio di condivisione del telefono.
6. **Chi può condividere** — proposta: serve l'account (il link è legato a
   chi lo crea e si ferma anche da un altro telefono).
7. **Piscina e palestra** (parte D) — proposta: dopo, solo i dati.
8. **La mappa della pagina**: MapLibre e OpenFreeMap caricati da fuori,
   scritto nella privacy del sito.
9. **I testi** in en/it/de/fr/es (pulsante, consenso, foglio, pagina,
   privacy dell'app e del sito): li scrive l'agente, li approva l'utente.
10. **App Privacy e Data safety**: proposta più sotto, ogni passo col sì.

### Privacy

- Consenso chiaro la prima volta, con cosa vede chi riceve il link.
- Link non indovinabile (128 bit), che scade; stop in ogni momento
  dall'app, che cancella subito i punti.
- I punti si cancellano dopo la fine (scelta 2); la riga di
  `live_shares` resta solo senza posizioni, per i limiti, poi va via.
- Una sezione nuova «Sharing live» nella privacy dell'app (e quindi del
  sito, rigenerata con `make_privacy.mjs`) e una frase in «Your position».
- **App Privacy**: la posizione precisa è già dichiarata; l'invio scelto
  dall'utente a una persona di sua scelta non è «tracking». Da rivedere
  col sì dell'utente.
- **Data safety**: Google non conta come «condivisione» un invio fatto
  dall'utente a chi sceglie lui; la riga sulla posizione va comunque
  rivista. Col sì dell'utente.

### Rischi

- **Batteria**: un invio ogni 15 s a telefono bloccato. Il GPS è già
  acceso; la radio costa poco con richieste piccole. Si misura in B.
- **iOS a telefono bloccato**: il task della posizione resta vivo durante
  la registrazione, quindi il `fetch` parte; se iOS lo ferma, la pagina dice
  «No update since…».
- **Abuso del link**: chi lo inoltra lo dà ad altri. Per questo scade e si
  ferma.
- **Il sito carica da fuori** (MapLibre, tile): cambia una promessa di
  `SITO.md`.
- **Confini**: `RunDashboard.tsx` è di TASK-422 (#971), `src/watch/` di
  TASK-370 B3, `src/pool/` di TASK-409 B, `src/gym/` di TASK-411 C.

## File toccati

Parte 0 (questa PR):

```
docs/tasks/TASK-424.md
docs/DECISIONS.md
docs/STATUS.md
docs/INDEX.md
```

Le liste delle parti A1, A2, B, C vanno al Coordinatore prima del codice.

## Fuori scope

- Vedere dal vivo nell'app gli amici che corrono (questa è una pagina web).
- Avvisi automatici al genitore (partenza, arrivo, «fermo da 10 minuti»).
- Le corse di gruppo dal vivo.
- Cambiare la striscia della pagina «Map» senza una scelta dell'utente.

## Esito

*(a fine task)*
