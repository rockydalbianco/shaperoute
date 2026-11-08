# TASK-422 — La corsa a tre pagine: «Compass», la mappa grande che gira dove punta il telefono

**Stato**: Done
**Fase**: 4 · **Branch**: `feat/TASK-422-compass-page` · **ADR**: ADR-0350 ·
numero dal Coordinatore (2026-11-08)

## Obiettivo

La schermata della corsa in registrazione passa da due pagine a tre. La
pagina nuova, «Compass», è solo la mappa, grande: niente numeri, solo i
pulsanti della corsa. La mappa gira dove punta il telefono (heading-up): la
direzione verso cui si è rivolti sta sempre in alto. Un tocco sulla freccia
del nord rimette il nord in alto. Chiesta dall'utente il 2026-11-08.

## Contesto da leggere

- `docs/UI.md` «La navigazione» («La corsa: tre pagine…», «La mappa girata
  e la freccia del nord», «La freccia di direzione»)
- `docs/DECISIONS.md` ADR-0137 (le due pagine), ADR-0195 (la mappa girata),
  ADR-0350 (questo task)
- `apps/mobile/src/screens/RunDashboard.tsx`, `src/map/turnedMap.ts`,
  `src/map/NorthArrow.tsx`, `src/map/MapView.tsx` (`turn`, `onTurned`)

## Scelte (proposte dall'agente, approvate dall'utente)

**Approvate dall'utente il 2026-11-08** nella sessione del Coordinatore
(«approvo tutto»): il nome «Compass», l'ordine Compass | Map | Data con
l'apertura su «Map», la freccia del nord a due tocchi, i due testi nelle
cinque lingue («Compass», «Turns the map where you face»). La regola
tecnica dell'heading (bussola o traccia, le soglie) è dell'agente, in
ADR-0350.

- **Ordine e apertura**: «Compass» a sinistra, «Map» al centro, «Data» a
  destra. La corsa si apre su «Map», come oggi. Lo swipe passa una pagina
  alla volta; i tre nomi in fondo con un tocco. Vale per tutti gli sport
  che usano `RunCard` (corsa, bici, canoa, nuoto, free run): la scheda è
  una.
- **Nome**: «Compass», perché la mappa di quella pagina segue la bussola.
- **Cosa c'è su «Compass»**: sotto la mappa solo i pulsanti della corsa
  (Pocket, Pause, Music; in pausa Stop da tenere e Resume; all'arrivo
  Finish) e le tre schede. Niente numeri, barra del percorso, riga del
  gioco né battito dell'orologio. Il banner in alto sulla mappa (la svolta,
  o la partenza) resta: dice dove si va.
- **Il nord**: la freccia del nord di TASK-232, nello stesso posto, sempre
  visibile su «Compass». Un tocco mette il nord in alto e lo tiene; un
  secondo tocco rimette la mappa dove punta il telefono. Lasciando la pagina
  (o a fine corsa) la mappa torna com'era: girata come il disegno, o col
  nord in alto.
- **Da dove viene la direzione** (ADR-0350): la bussola del telefono
  (`expo-location`, `watchHeadingAsync`; `trueHeading`, o `magHeading` se
  manca) da fermi sempre, e in corsa quando la sua calibrazione è media o
  alta (≥ 2 su 0–3). In movimento (un fix GPS negli ultimi 10 s, la soglia
  dell'auto-pausa) con la bussola a calibrazione bassa o nulla vince la
  direzione della traccia (`headingDeg`, gli ultimi 10 m). La mappa gira
  solo per cambi di almeno 4° e non più di una volta ogni 400 ms, per non
  tremare in mano. La bussola è accesa solo con «Compass» aperta.
- **Nessuna dipendenza nuova**: `expo-location` basta.

## Criteri di accettazione

- [x] Tre schede in fondo alla scheda della corsa, «Compass», «Map» e
      «Data», tutte larghe uguali e alte più del tocco minimo; la corsa si
      apre su «Map».
- [x] Lo swipe passa una pagina alla volta in entrambi i versi, dalla
      scheda; da «Data» lo swipe a destra torna a «Map», da «Compass» lo
      swipe a sinistra va a «Map»; oltre i bordi non fa niente.
- [x] Su «Compass» non ci sono numeri, barra del percorso, riga del gioco
      né battito: solo i pulsanti della corsa e le schede. La pausa e
      «Stop» funzionano come sulle altre pagine.
- [x] Con «Compass» aperta la mappa gira sulla direzione scelta
      (bussola o traccia, ADR-0350); la freccia del nord c'è, un tocco
      mette il nord in alto e lo tiene, un secondo rimette la direzione.
- [x] Lasciando «Compass» la mappa torna alla sua inclinazione di prima.
- [x] Test deterministici: `swipedTo` con tre pagine, la scelta
      bussola/traccia, la soglia dei 4° e dei 400 ms, il pulsante del nord,
      la bussola accesa e spenta con la pagina; `RunDashboard*` aggiornati.
- [x] Nessuna dipendenza nuova; colori solo da `tokens.ts`; typecheck,
      lint e format puliti.
- [ ] Prova sul telefono (dell'utente): la rotazione in mano, da fermo e
      correndo.

## File toccati

```
apps/mobile/App.tsx
apps/mobile/src/i18n/de.ts
apps/mobile/src/i18n/es.ts
apps/mobile/src/i18n/fr.ts
apps/mobile/src/i18n/it.ts
apps/mobile/src/map/NorthArrow.tsx
apps/mobile/src/map/NorthArrow.test.tsx
apps/mobile/src/map/useHeadingUpMap.ts
apps/mobile/src/map/useHeadingUpMap.test.tsx
apps/mobile/src/navigation/headingUp.ts
apps/mobile/src/navigation/headingUp.test.ts
apps/mobile/src/navigation/runPage.ts
apps/mobile/src/navigation/runPage.test.ts
apps/mobile/src/navigation/useCompass.ts
apps/mobile/src/navigation/useCompass.test.tsx
apps/mobile/src/screens/RunDashboard.tsx
apps/mobile/src/screens/RunDashboard.test.tsx
docs/DECISIONS.md
docs/INDEX.md
docs/STATUS.md
docs/UI.md
docs/tasks/TASK-422.md
```

## Fuori scope

- Nascondere il banner della svolta su «Compass»: oggi resta, è la scelta
  più prudente; se l'utente lo vuole via, è una riga in `App.tsx`.
- Un'animazione della scheda che si abbassa passando a «Compass».
- La pagina con la mappa grande a fine corsa e nelle corse salvate.
- Ricordare la pagina aperta fra una corsa e l'altra.

## Esito

Fatto (2026-11-08): tre pagine, «Compass» | «Map» | «Data», apertura su
«Map»; su «Compass» la scheda tiene solo i pulsanti e le schede, la mappa
gira dove punta il telefono con la regola di ADR-0350, la freccia del nord
alterna nord in alto e direzione. Quattro moduli nuovi con i loro test;
`RunDashboard.tsx` cambia solo per la terza pagina, `App.tsx` per cinque
righe. Due testi nuovi nelle cinque lingue («Compass», «Turns the map
where you face»), approvati dall'utente con le altre scelte il
2026-11-08. PR #971, unita dal Coordinatore; restano la prova sul
telefono e l'OTA col sì dell'utente.
