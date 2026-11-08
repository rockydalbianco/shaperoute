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

**Deciso dall'utente il 2026-11-09** («Sì, tre su Map»): la pagina «Map»
resta con i suoi tre numeri (distanza, passo o velocità, tempo) e il
battito; «Data» è la pagina con tutti i dati di ogni sport, battito
compreso (punto 1).

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
- **B — L'app**: il pulsante, il consenso, l'invio dei punti e dei dati,
  lo stop, per tutti gli sport, piscina e palestra comprese (scelta 7). B1
  gli sport col GPS, da `main` **dopo** TASK-422 (#971,
  `RunDashboard.tsx`); B2 piscina e palestra, **dopo** TASK-409 B e
  TASK-411 C (`src/pool/`, `src/gym/`). L'OTA pubblica B1 e B2 insieme.
- **C — I dati dal vivo che mancano** (l'elenco sopra). Parte dopo
  TASK-422, TASK-370 B3, TASK-409 B e TASK-411 C, che toccano quei file.

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
- **La mappa della pagina**: MapLibre copiato sul sito alla stessa
  versione dell'app, le tile di OpenFreeMap (scelta 8). È la prima pagina
  del sito che carica qualcosa da fuori: va detto nella privacy del sito.

### Scelte di prodotto per l'utente (una alla volta)

Ognuna con una proposta. Si scrivono qui con la risposta.

1. **Chi può ricevere il link** — **deciso dall'utente il 2026-11-09**
   («Sì, chiunque lo abbia»): chiunque abbia il link, senza app e senza
   account; si manda a chi si vuole.
2. **Quanto dura il link** — **deciso dall'utente il 2026-11-09** («Sì,
   così»): vale fino alla fine dell'attività; poi la pagina mostra
   «Finished» con il riepilogo e il percorso per 1 ora, poi il link scade e
   i punti si cancellano; al massimo 24 ore dall'inizio in ogni caso (anche
   se il telefono si spegne). Uno stop dall'app fa scadere il link e
   cancella i punti subito.
3. **Cosa vede chi lo apre** — **deciso dall'utente il 2026-11-09**
   («Esatta e col battito»): la posizione esatta, non sfocata, e il battito
   quando un orologio lo manda, oltre a distanza, tempo, passo o velocità,
   dislivello, calorie e la fine. Il battito è un dato di salute (art. 9
   GDPR): il consenso della prima volta lo deve dire in chiaro, va al
   server solo durante la condivisione e si cancella con i punti; la
   privacy lo nomina.
4. **Se parte da sola a ogni registrazione** — **deciso dall'utente il
   2026-11-09** («Sì, col pulsante»): no, ogni volta col pulsante; nessuna
   impostazione per farla partire da sola.
5. **Come si manda** — **deciso dall'utente il 2026-11-09** («Sì, il
   foglio»): il foglio di condivisione del telefono (`Share` di React
   Native: WhatsApp, SMS, Mail, «Copia»), con una riga breve e il link.
6. **Chi può condividere** — **deciso dall'utente il 2026-11-09** («Sì,
   serve»): serve l'account per creare il link (legato a chi lo crea, con
   un limite contro gli abusi, fermabile da un altro telefono, cancellato
   con l'account); senza account il pulsante invita ad entrare. Chi riceve
   il link non ha bisogno di nulla (scelta 1).
7. **Piscina e palestra** — **deciso dall'utente il 2026-11-09** («Subito
   con gli altri»): la condivisione arriva insieme agli sport col GPS, non
   dopo. La pagina, senza mappa, mostra i dati (piscina: tempo, vasche
   stimate, calorie, battito; palestra: tempo, esercizio in corso, calorie,
   battito). Entrano nella parte B; la pubblicazione di B aspetta anche
   loro.
8. **La mappa della pagina** — **deciso dall'utente il 2026-11-09** («Sì,
   così»): il file di MapLibre copiato sul sito (`site/live/`), alla stessa
   versione dell'app; solo le tile e i font da OpenFreeMap, che vede l'IP di
   chi apre la pagina ma non il token né la posizione. Una riga nella
   privacy del sito; `SITO.md` aggiornato nella parte A2.
9. **I testi** in en/it/de/fr/es (pulsante, consenso, foglio, pagina,
   privacy dell'app e del sito): li scrive l'agente, li approva l'utente.
10. **App Privacy e Data safety**: proposta più sotto, ogni passo col sì.

### Testi

**Tutti approvati dall'utente il 2026-11-09**: en e it («Sì, approvo»),
poi de/fr/es («Sì, approvo»).

**App**

| Dove | en | it |
|---|---|---|
| Pulsante | Share live | Condividi dal vivo |
| Etichetta attiva | Sharing live | Condivisione attiva |
| Senza account | Sign in to share live | Accedi per condividere dal vivo |
| Foglio, titolo | Share this activity live | Condividi l'attività dal vivo |
| Foglio, testo 1 | Anyone with the link can follow you on a web page, without the app: your exact position on the map, the route so far, distance, time, pace or speed, elevation gain, calories and your heart rate when a watch sends it. | Chiunque abbia il link può seguirti su una pagina web, senza l'app: la tua posizione esatta sulla mappa, il percorso fatto, distanza, tempo, passo o velocità, dislivello, calorie e il battito quando un orologio lo manda. |
| Foglio, testo 2 | The link stops working one hour after you finish, or as soon as you stop sharing. Then your positions are deleted. | Il link smette di funzionare un'ora dopo la fine, o appena smetti di condividere. Poi le tue posizioni vengono cancellate. |
| Foglio, pulsanti | Share link · Not now | Condividi il link · Non ora |
| Messaggio | Follow my activity live on MuW: {url} | Segui la mia attività dal vivo su MuW: {url} |
| Stop, titolo | Stop sharing? | Smettere di condividere? |
| Stop, testo | The link stops working now. | Il link smette di funzionare adesso. |
| Stop, pulsanti | Stop sharing · Keep sharing | Smetti · Continua |
| Errore | Couldn't create the link. Try again. | Non è stato possibile creare il link. Riprova. |

**Pagina web** (`site/live/`, lingua dal browser)

| en | it |
|---|---|
| Live activity | Attività dal vivo |
| Live | Dal vivo |
| Updated {n} s ago | Aggiornato {n} s fa |
| No update since {time} | Nessun aggiornamento dalle {time} |
| Paused | In pausa |
| Finished at {time} | Finita alle {time} |
| Sharing stopped | Condivisione interrotta |
| This link has expired | Questo link è scaduto |
| Distance · Time · Pace · Speed · Elev. gain · Calories · Heart rate | Distanza · Tempo · Passo · Velocità · Dislivello · Calorie · Battito |
| Lengths (est.) · Exercise | Vasche (stima) · Esercizio |
| Shared from MuW. The link stops working one hour after the activity ends. | Condiviso da MuW. Il link smette di funzionare un'ora dopo la fine dell'attività. |

**Privacy dell'app e del sito**: sezione nuova «Sharing live» («Condivisione
dal vivo»), dopo «Your position».

> en — During an activity you can tap «Share live» to create a link. While
> you share, our server receives every 15 seconds your exact position with
> its time, the activity's numbers (distance, time, pace or speed,
> elevation gain, calories) and your heart rate when a watch sends it.
> Anyone who has the link can see them on a page of getmuw.app, without an
> account: you choose whom you send it to, and whoever has it can pass it
> on. The link is random and cannot be guessed; our server keeps only a
> hash of it. It stops working one hour after the activity ends, at most 24
> hours after it started, or as soon as you stop sharing; then the
> positions and the heart rate are deleted. Your heart rate is health data:
> it is shared only after you have read it on the screen that comes before
> the link. The map on that page comes from OpenFreeMap, which sees the
> internet (IP) address of whoever opens it, but not the link or your
> position. Sharing needs an account; deleting the account deletes its
> shares.

> it — Durante un'attività puoi toccare «Condividi dal vivo» per creare un
> link. Mentre condividi, il nostro server riceve ogni 15 secondi la tua
> posizione esatta con l'ora, i numeri dell'attività (distanza, tempo, passo
> o velocità, dislivello, calorie) e il battito quando un orologio lo manda.
> Chiunque abbia il link li vede su una pagina di getmuw.app, senza
> account: scegli tu a chi mandarlo, e chi lo ha può inoltrarlo. Il link è
> casuale e non si può indovinare; il nostro server ne tiene solo un hash.
> Smette di funzionare un'ora dopo la fine dell'attività, al massimo 24 ore
> dopo l'inizio, o appena smetti di condividere; poi le posizioni e il
> battito vengono cancellati. Il battito è un dato sulla salute: si
> condivide solo dopo che l'hai letto nella schermata che viene prima del
> link. La mappa di quella pagina viene da OpenFreeMap, che vede l'indirizzo
> internet (IP) di chi la apre, ma non il link né la tua posizione. Per
> condividere serve un account; cancellando l'account si cancellano le sue
> condivisioni.

**«Your position»**, una frase in fondo al primo paragrafo:

> en — When you share an activity live, your exact position goes to our
> server and to whoever has the link, as described under «Sharing live».

> it — Quando condividi un'attività dal vivo, la tua posizione esatta va al
> nostro server e a chi ha il link, come spiegato in «Condivisione dal
> vivo».

**de / fr / es**

| en | de | fr | es |
|---|---|---|---|
| Share live | Live teilen | Partager en direct | Compartir en directo |
| Sharing live | Live-Teilen aktiv | Partage en direct activé | Compartiendo en directo |
| Sign in to share live | Melde dich an, um live zu teilen | Connecte-toi pour partager en direct | Inicia sesión para compartir en directo |
| Share this activity live | Diese Aktivität live teilen | Partager cette activité en direct | Compartir esta actividad en directo |
| Anyone with the link can follow you on a web page, without the app: your exact position on the map, the route so far, distance, time, pace or speed, elevation gain, calories and your heart rate when a watch sends it. | Wer den Link hat, kann dir auf einer Webseite folgen, ohne die App: deine genaue Position auf der Karte, die bisherige Strecke, Distanz, Zeit, Pace oder Tempo, Höhenmeter, Kalorien und deinen Puls, wenn eine Uhr ihn sendet. | Toute personne qui a le lien peut te suivre sur une page web, sans l'app : ta position exacte sur la carte, le parcours déjà fait, la distance, le temps, l'allure ou la vitesse, le dénivelé, les calories et ta fréquence cardiaque quand une montre l'envoie. | Cualquiera que tenga el enlace puede seguirte en una página web, sin la app: tu posición exacta en el mapa, el recorrido hecho, distancia, tiempo, ritmo o velocidad, desnivel, calorías y tu pulso cuando un reloj lo envía. |
| The link stops working one hour after you finish, or as soon as you stop sharing. Then your positions are deleted. | Der Link funktioniert eine Stunde nach dem Ende nicht mehr, oder sobald du das Teilen beendest. Dann werden deine Positionen gelöscht. | Le lien cesse de fonctionner une heure après la fin, ou dès que tu arrêtes le partage. Tes positions sont alors supprimées. | El enlace deja de funcionar una hora después de terminar, o en cuanto dejas de compartir. Después se borran tus posiciones. |
| Share link · Not now | Link teilen · Nicht jetzt | Partager le lien · Pas maintenant | Compartir enlace · Ahora no |
| Follow my activity live on MuW: {url} | Verfolge meine Aktivität live auf MuW: {url} | Suis mon activité en direct sur MuW : {url} | Sigue mi actividad en directo en MuW: {url} |
| Stop sharing? | Teilen beenden? | Arrêter le partage ? | ¿Dejar de compartir? |
| The link stops working now. | Der Link funktioniert ab jetzt nicht mehr. | Le lien cesse de fonctionner maintenant. | El enlace deja de funcionar ahora. |
| Stop sharing · Keep sharing | Beenden · Weiter teilen | Arrêter · Continuer | Dejar de compartir · Seguir |
| Couldn't create the link. Try again. | Der Link konnte nicht erstellt werden. Versuch es noch einmal. | Impossible de créer le lien. Réessaie. | No se ha podido crear el enlace. Inténtalo de nuevo. |
| Live activity | Live-Aktivität | Activité en direct | Actividad en directo |
| Live | Live | En direct | En directo |
| Updated {n} s ago | Vor {n} s aktualisiert | Mis à jour il y a {n} s | Actualizado hace {n} s |
| No update since {time} | Keine Aktualisierung seit {time} | Aucune mise à jour depuis {time} | Sin actualizaciones desde las {time} |
| Paused | Pausiert | En pause | En pausa |
| Finished at {time} | Beendet um {time} | Terminée à {time} | Terminada a las {time} |
| Sharing stopped | Teilen beendet | Partage arrêté | Se ha dejado de compartir |
| This link has expired | Dieser Link ist abgelaufen | Ce lien a expiré | Este enlace ha caducado |
| Distance · Time · Pace · Speed · Elev. gain · Calories · Heart rate | Distanz · Zeit · Pace · Tempo · Höhenmeter · Kalorien · Puls | Distance · Temps · Allure · Vitesse · Dénivelé · Calories · Fréquence cardiaque | Distancia · Tiempo · Ritmo · Velocidad · Desnivel · Calorías · Pulso |
| Lengths (est.) · Exercise | Bahnen (geschätzt) · Übung | Longueurs (estim.) · Exercice | Largos (estim.) · Ejercicio |
| Shared from MuW. The link stops working one hour after the activity ends. | Geteilt über MuW. Der Link funktioniert eine Stunde nach dem Ende der Aktivität nicht mehr. | Partagé depuis MuW. Le lien cesse de fonctionner une heure après la fin de l'activité. | Compartido desde MuW. El enlace deja de funcionar una hora después de que termine la actividad. |

Privacy, sezione «Sharing live»:

> de — «Live teilen»: Während einer Aktivität kannst du auf «Live teilen»
> tippen, um einen Link zu erstellen. Solange du teilst, erhält unser
> Server alle 15 Sekunden deine genaue Position mit der Uhrzeit, die Werte
> der Aktivität (Distanz, Zeit, Pace oder Tempo, Höhenmeter, Kalorien) und
> deinen Puls, wenn eine Uhr ihn sendet. Wer den Link hat, sieht sie auf
> einer Seite von getmuw.app, ohne Konto: Du entscheidest, wem du ihn
> schickst, und wer ihn hat, kann ihn weitergeben. Der Link ist zufällig und
> nicht zu erraten; unser Server speichert nur einen Hash davon. Er
> funktioniert eine Stunde nach dem Ende der Aktivität nicht mehr,
> spätestens 24 Stunden nach ihrem Beginn, oder sobald du das Teilen
> beendest; dann werden die Positionen und der Puls gelöscht. Dein Puls ist
> ein Gesundheitsdatum: Er wird nur geteilt, nachdem du es auf dem
> Bildschirm vor dem Link gelesen hast. Die Karte auf dieser Seite kommt von
> OpenFreeMap, das die Internetadresse (IP) der Person sieht, die sie
> öffnet, aber weder den Link noch deine Position. Zum Teilen brauchst du
> ein Konto; wenn du das Konto löschst, werden auch seine Freigaben
> gelöscht.

> fr — «Partage en direct» : Pendant une activité, tu peux toucher
> «Partager en direct» pour créer un lien. Tant que tu partages, notre
> serveur reçoit toutes les 15 secondes ta position exacte avec l'heure,
> les chiffres de l'activité (distance, temps, allure ou vitesse, dénivelé,
> calories) et ta fréquence cardiaque quand une montre l'envoie. Toute
> personne qui a le lien les voit sur une page de getmuw.app, sans compte :
> tu choisis à qui l'envoyer, et qui l'a peut le transmettre. Le lien est
> aléatoire et impossible à deviner ; notre serveur n'en garde qu'un hash.
> Il cesse de fonctionner une heure après la fin de l'activité, au plus
> tard 24 heures après son début, ou dès que tu arrêtes le partage ; les
> positions et la fréquence cardiaque sont alors supprimées. La fréquence
> cardiaque est une donnée de santé : elle n'est partagée qu'après que tu
> l'as lu sur l'écran qui précède le lien. La carte de cette page vient
> d'OpenFreeMap, qui voit l'adresse internet (IP) de qui l'ouvre, mais ni
> le lien ni ta position. Pour partager, il faut un compte ; supprimer le
> compte supprime ses partages.

> es — «Compartir en directo»: Durante una actividad puedes tocar
> «Compartir en directo» para crear un enlace. Mientras compartes, nuestro
> servidor recibe cada 15 segundos tu posición exacta con la hora, los
> datos de la actividad (distancia, tiempo, ritmo o velocidad, desnivel,
> calorías) y tu pulso cuando un reloj lo envía. Cualquiera que tenga el
> enlace los ve en una página de getmuw.app, sin cuenta: tú eliges a quién
> se lo mandas, y quien lo tenga puede reenviarlo. El enlace es aleatorio y
> no se puede adivinar; nuestro servidor guarda solo un hash. Deja de
> funcionar una hora después de que termine la actividad, como mucho 24
> horas después de empezar, o en cuanto dejas de compartir; entonces se
> borran las posiciones y el pulso. El pulso es un dato de salud: solo se
> comparte después de que lo hayas leído en la pantalla que aparece antes
> del enlace. El mapa de esa página viene de OpenFreeMap, que ve la
> dirección de internet (IP) de quien la abre, pero no el enlace ni tu
> posición. Para compartir hace falta una cuenta; al borrar la cuenta se
> borran sus enlaces compartidos.

«Your position», la frase in più:

> de — Wenn du eine Aktivität live teilst, geht deine genaue Position an
> unseren Server und an alle, die den Link haben, wie unter «Live teilen»
> beschrieben.

> fr — Quand tu partages une activité en direct, ta position exacte va à
> notre serveur et à qui a le lien, comme décrit dans «Partage en direct».

> es — Cuando compartes una actividad en directo, tu posición exacta va a
> nuestro servidor y a quien tenga el enlace, como se explica en
> «Compartir en directo».

### Privacy

- Consenso chiaro la prima volta, con cosa vede chi riceve il link,
  battito compreso (dato di salute, scelta 3).
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

Le liste delle parti A1, A2, B1, B2, C vanno al Coordinatore prima del codice.

## Fuori scope

- Vedere dal vivo nell'app gli amici che corrono (questa è una pagina web).
- Avvisi automatici al genitore (partenza, arrivo, «fermo da 10 minuti»).
- Le corse di gruppo dal vivo.
- Cambiare la striscia della pagina «Map» (l'utente l'ha voluta a tre
  numeri, 2026-11-09).

## Esito

*(a fine task)*
