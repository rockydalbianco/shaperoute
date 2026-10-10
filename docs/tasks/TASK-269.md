# TASK-269 — «Paddle»: laghi e mare suggeriti vicino a dove si vive, con un piccolo filtro

**Stato**: In lavorazione (2026-10-10)
**Fase**: 4 · **Branch**: `feat/TASK-269-paddle-places-near-home`
**Dipende da**: TASK-233 («Explore» con «Paddle», «Near me», ADR-0196),
TASK-245 (le spiagge), TASK-246 (le forme dei tre posti più vicini già sul
telefono, ADR-0211) — tutti in `main` · **ADR**: ADR-0239

## Obiettivo

Richiesta dell'utente del 2026-10-09: «consiglia alle persone i posti in
base a dove vivono, o fai una sezione filtro e decidi tu come suggerire le
cose». In «Explore» con «Paddle» i laghi e i posti di mare da toccare sono
quelli vicini a dove la persona di solito parte, con un filtro «Lakes» /
«Sea». Il come è **deciso dall'agente su delega dell'utente** (ADR-0239).

Per la corsa l'utente aveva chiesto il 2026-10-02 «niente filtri» in
«Explore» (TASK-176): questa è una richiesta nuova ed esplicita, solo per
«Paddle».

## Il disegno (deciso dall'agente su delega dell'utente)

1. **La zona di casa, solo sul telefono**: il centro della zona da cui
   partono più spesso le attività di «My activities» (la prima pagina, le
   20 più recenti, qualunque sport). Senza attività, la prima partenza nota
   dell'app, quella da cui parte «Near me» oggi. Nessun permesso nuovo,
   nessun indirizzo chiesto, niente di nuovo mandato al server o tenuto
   sull'account. Una riga sotto la fila dice da dove vengono i suggerimenti:
   «Suggested near Trento» con il paese che l'API ha già dato alle attività
   (`Activity.place`); «Suggested near where you usually start» se non ne
   ha dato nessuno; «Suggested near your start» senza attività. «Near me»
   resta com'è, sulla partenza.
2. **I posti suggeriti**: i laghi e i posti di mare dal più vicino alla
   zona di casa, otto come oggi (`SPOTS_SHOWN`); in fondo alla fila un
   «Show more» ne aggiunge altri otto, senza pagine nuove.
3. **Il filtro**: due chip accanto a «LAKES AND SEA», «Lakes» e «Sea»,
   accesi tutti e due. Toccarne uno mostra solo quel tipo; toccarlo di
   nuovo li riaccende tutti e due; toccare l'altro passa all'altro. La
   scelta resta sul telefono. Il filtro vale per la fila dei posti, non per
   «Near me» né per la ricerca per nome. Nessun altro filtro.
4. **Le forme già sul telefono** (TASK-246): i tre posti più vicini alla
   stessa zona di casa, così i suggerimenti si aprono subito.

Fuori: «Explore» della corsa (ha già «Near me», «NEARBY TOWNS» e
«Recommended»). Un seguito possibile: usare la stessa zona di casa anche lì.

## Contesto da leggere

- `docs/DECISIONS.md` ADR-0239 (questa scelta), ADR-0196, ADR-0211
- `docs/UI.md`, «Sull'acqua: «Paddle»», «Explore»
- `apps/mobile/src/paddle/PaddleExplore.tsx`, `waterSpots.ts`,
  `aheadExamples.ts`

## Cosa fare

1. `src/paddle/homeArea.ts` (nuovo): la zona di casa dalle partenze delle
   attività, scritta in `Documents/home-area.json`; letta da «Explore» e dal
   giro delle forme.
2. `src/activities/useActivities.ts`: alla prima pagina della lista, una
   chiamata che annota la zona di casa (la lista vive in `App.tsx`, che
   questo task non tocca).
3. `src/paddle/waterPlaces.ts`, `waterSpots.ts`: ogni posto dice se è lago
   o mare, dall'elenco da cui viene (letto, mai copiato: i posti nuovi di
   TASK-245 C entrano da soli).
4. `src/paddle/waterKinds.ts` (nuovo): il filtro e la sua memoria,
   `Documents/water-filter.json`.
5. `src/paddle/PaddleExplore.tsx`: i chip del filtro, la fila dalla zona di
   casa, «Show more», la riga «Suggested near …».
6. `src/paddle/aheadExamples.ts`: il giro parte dalla zona di casa.
7. Testi nuovi in `i18n/*` in fondo; `docs/UI.md`.

## Criteri di accettazione

- [x] La zona di casa è quella da cui partono più attività, non l'ultima;
      a pari merito vince la più recente; il paese è quello più frequente
      nella zona (test).
- [x] Senza attività la fila parte dalla partenza di «Near me»; senza
      niente, i quattro posti scelti a mano come oggi (test).
- [x] La fila è in ordine di distanza dalla zona di casa, otto posti, e
      «Show more» ne aggiunge altri otto (test).
- [x] «Lakes» e «Sea»: uno tocca mostra solo quel tipo, la scelta resta
      sul telefono (test).
- [x] Il giro delle forme già sul telefono parte dalla zona di casa (test).
- [x] Nessuna richiesta in più all'API: la zona di casa viene dalla lista
      che l'app chiede già (test).
- [x] Testi nuovi approvati dall'utente nelle cinque lingue (2026-10-10,
      «sì, vanno bene tutti»: i cinque testi e la frase della privacy).
- [x] La frase della privacy nell'app e su `getmuw.app/privacy` (nei file
      del sito; la copia sul server la fa il coordinatore, F.14), dopo «451
      in main» (indicazione del coordinatore).

## File toccati

- `apps/mobile/src/paddle/homeArea.ts` (nuovo) + `homeArea.test.ts` (nuovo)
- `apps/mobile/src/paddle/waterKinds.ts` (nuovo) + `waterKinds.test.ts` (nuovo)
- `apps/mobile/src/paddle/PaddleExplore.tsx`
- `apps/mobile/src/paddle/PaddleExploreHome.test.tsx` (nuovo)
- `apps/mobile/src/paddle/waterSpots.ts`, `waterSpots.test.ts`
- `apps/mobile/src/paddle/waterPlaces.ts`
- `apps/mobile/src/paddle/aheadExamples.ts`, `aheadExamples.test.ts`
- `apps/mobile/src/activities/useActivities.ts`, `useActivities.test.ts`
- `apps/mobile/src/i18n/{it,de,es,fr}.ts` (righe nuove in fondo)
- `apps/mobile/src/about/content/{en,it,de,es,fr}.ts` (solo la frase della
  privacy «On your phone: …»; la data della privacy era già il 10 ottobre
  2026) e `site/privacy/**` rigenerato con `node site/tools/make_privacy.mjs`
  (indicazione del coordinatore dopo «451 in main»)
- `docs/UI.md`, `docs/DECISIONS.md` (ADR-0239), `docs/STATUS.md`,
  `docs/tasks/TASK-269.md`

Non toccati: `App.tsx`, `src/feed/*`, `beaches.json`, `beach_catalog.py`.

## Cosa resta sul telefono, e quando se ne va

- `Documents/home-area.json`: **un punto** (il centro della zona di casa,
  lat/lon) e **il nome di un paese** (o niente). Non le partenze delle
  singole attività: quelle si leggono dalla lista che l'app ha già e si
  buttano. Scritto a ogni prima pagina di «My activities» (all'apertura
  dell'app con un account, e a ogni «refresh»).
- Se ne va: al **logout**, quando la **sessione finisce**, quando
  l'**account è cancellato** (in tutti e tre i casi nessuno è più entrato,
  e `useActivities` cancella il file), e quando la lista arriva vuota
  (attività tutte cancellate). Senza account il file non c'è mai.
- `Documents/water-filter.json`: solo la scelta del filtro (`all`,
  `lake`, `sea`), come le altre scelte dell'app.
- Niente va al server: il giro delle forme già sul telefono chiede le
  forme dei posti dell'elenco (punti pubblici sulla riva), non la zona di
  casa.
- **Privacy**: il testo dice cosa resta sul telefono («the session, your
  choices (language, sport), the offline maps and the runs still waiting
  to be sent»); il punto della zona di casa è un dato di posizione nuovo,
  quindi serve una riga. Proposta al coordinatore, che decide prima di
  toccare `src/about/content/*` (non in questo task).

## Testi nuovi (approvati dall'utente il 2026-10-10)

| en | it | de | es | fr |
|---|---|---|---|---|
| Lakes | Laghi | Seen | Lagos | Lacs |
| Sea | Mare | Meer | Mar | Mer |
| Suggested near {place} | Consigliati vicino a {place} | Vorschläge in der Nähe von {place} | Sugeridos cerca de {place} | Suggérés près de {place} |
| Suggested near where you usually start | Consigliati vicino a dove parti di solito | Vorschläge in der Nähe deines üblichen Starts | Sugeridos cerca de donde sueles salir | Suggérés près de ton départ habituel |
| Suggested near your start | Consigliati vicino alla tua partenza | Vorschläge in der Nähe deines Starts | Sugeridos cerca de tu salida | Suggérés près de ton départ |

«Show more» c'era già («Mostra altro»).

**La frase della privacy** (approvata il 2026-10-10), al posto della riga
«On your phone: …» di «Where your data is and for how long» in
`src/about/content/*.ts`, poi `node site/tools/make_privacy.mjs`:

- en: On your phone: the session, your choices (language, sport, lakes or sea), the offline maps, the runs still waiting to be sent and, with an account, the area your activities usually start from, to suggest lakes and the sea near it; it is deleted when you log out.
- it: Sul tuo telefono: la sessione, le tue scelte (lingua, sport, laghi o mare), le mappe offline, le corse che aspettano ancora di partire e, con un account, la zona da cui partono di solito le tue attività, per suggerirti laghi e mare vicini; si cancella quando esci dall'account.
- de: Auf deinem Handy: die Sitzung, deine Einstellungen (Sprache, Sport, Seen oder Meer), die Offline-Karten, die Läufe, die noch darauf warten, gesendet zu werden, und mit einem Konto die Gegend, in der deine Aktivitäten meist beginnen, um dir Seen und Meer in der Nähe vorzuschlagen; sie wird gelöscht, wenn du dich abmeldest.
- es: En tu teléfono: la sesión, tus elecciones (idioma, deporte, lagos o mar), los mapas sin conexión, las carreras que aún esperan para enviarse y, con una cuenta, la zona desde la que suelen empezar tus actividades, para sugerirte lagos y mar cerca; se borra al cerrar sesión.
- fr: Sur ton téléphone : la session, tes choix (langue, sport, lacs ou mer), les cartes hors ligne, les courses qui attendent encore d'être envoyées et, avec un compte, la zone d'où partent d'habitude tes activités, pour te suggérer des lacs et la mer à proximité ; elle est effacée quand tu te déconnectes.

## Esito

(da scrivere alla chiusura)
