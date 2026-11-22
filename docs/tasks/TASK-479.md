# TASK-479 — Il parapendio completo: lo strumento di volo senza accordi con terzi

**Stato**: In corso · parte 0 chiusa (2026-11-21); B1 in produzione
(OTA 20), B2 in `main` (#1368), C in produzione (OTA 22, 2026-11-22);
prossima A1
**Fase**: 5 · **Branch**: `docs/TASK-479-paragliding-pro` (parte 0), poi
`feat/TASK-479-<parte>-<slug>`, una parte alla volta, ognuna da `main`
**Dipende da**: TASK-305 parti R (in `main`: lo sport «Record only», i
numeri del volo, il live, R5, R6). Nessun accordo con terzi.
**ADR**: ADR-0388 (nuova); supera la parte G di TASK-305 e il punto
«Nessuna guida in volo» di ADR-0375, ADR-0265 resta Proposta.

## Obiettivo

Il parapendio di MuW diventa uno strumento di volo completo come quelli
che i piloti già usano: mappa 3D delle montagne, schermata di volo fatta di
widget personalizzabili, vario sonoro, navigazione e gare, spazi aerei da
un file del pilota, analisi e punteggio dopo il volo, live con la task.
Tutto con dati gratuiti e formati aperti, **senza accordi con terzi e senza
servizi a pagamento**.

## Scelta di prodotto dell'utente (2026-11-21)

- «Il parapendio completo e professionale, come XCTrack, SeeYou Navigator
  e Flyskyhy»: mappa 3D, schermata di volo personalizzabile,
  navigazione, spazi aerei, analisi del volo.
- Si fa solo quello che non chiede accordi né abbonamenti. openAIP,
  XContest (firma, upload, live), LiveTrack24, NOTAM e il meteo a pagamento
  **li valuterà l'utente più avanti**: non si usano, non si chiamano, non
  si nominano nell'interfaccia.
- **Supera** «MuW non fa da navigatore, diamo solo la tratta» (2026-10-26,
  parte G di TASK-305) e «Nessuna guida in volo» di ADR-0375.
- **Restano**, dalle scelte precedenti:
  - l'avviso «MuW is not a flight instrument…» al primo volo e la riga
    fissa (il testo nuovo, approvato, è in «Gli avvisi»);
  - l'app non dice mai «spazio aereo libero», «nessun NOTAM», «condizioni
    sicure», «ce la fai», «qui è legale volare», «quota ok»: dà numeri e
    informazioni, mai ordini né giudizi (`research_rules_instruments.md`
    §A5 dello studio);
  - **MuW non distribuisce dati di spazio aereo**: li carica il pilota, e
    il nome del file e la sua data si vedono sempre.

## Contesto da leggere

- `tasks/TASK-305.md`: «Le parti R», «Fuori scope», la parte G barrata,
  la parte E (import IGC).
- ADR-0375 e le sue precisazioni R5 e R6 (`grep -n "ADR-0375"
  docs/DECISIONS.md`); ADR-0265 in `archive/DECISIONS-fino-al-2026-11.md`.
- Studio sul Mac, `out/TASK-305/` del checkout principale:
  `research_data_sources.md` (licenze: §1 decolli, §3 terreno, §4 meteo),
  `research_rules_instruments.md` (§A5 cosa non dire, §B1 `.xctsk` e QR,
  §B2 `.cup`, §B3 `.wpt`, §B6 IGC).
- Codice esistente: `apps/mobile/src/air/**` (numeri del volo, tratti,
  avviso), `src/sports/paragliding.ts`, `src/map/mapKindStyle.ts`
  (`TERRAIN_SPEC`, `PITCH_3D`, AWS Terrain Tiles) e `src/map/mapPage.ts`
  (la modalità «3d»).

## Cosa si usa e cosa no

| Cosa | Fonte | Licenza | Dove |
|---|---|---|---|
| Terreno 3D in mappa | AWS Terrain Tiles (già nell'app) | aperta, attribuzione (già mostrata) | WebView della mappa |
| Quota sul terreno (AGL) | le stesse tile, lette nella WebView | idem | telefono |
| Terreno sul server, se serve | Copernicus DEM GLO-30/90 | Copernicus, attribuzione | `services/api/` |
| Decolli e atterraggi | OpenStreetMap: `sport=free_flying`, `free_flying:takeoff`, `free_flying:landing`, la vecchia `free_flying:site` | ODbL, attribuzione «© OpenStreetMap contributors» | server (estratto) → telefono |
| Spazi aerei | file **OpenAir (.txt) scelto dal pilota** | del pilota; MuW non lo include né lo spedisce | solo telefono |
| Boe e task | `.cup`, `.wpt`, `.xctsk`, QR di XCTrack | formati aperti / documentati | telefono |
| Tracce | IGC, GPX | formati aperti | telefono |
| Geoide (quota MSL su Android) | EGM96 a griglia grossa (NGA) | pubblico dominio | telefono, tabella nel codice |
| Meteo (parte H, sì dell'utente del 2026-11-21) | DWD ICON-D2, ECMWF open data | CC BY 4.0, attribuzione | server → telefono |

**Non si usano**: openAIP, ParaglidingEarth, XContest (firma, upload,
live, task code), LiveTrack24, NOTAM, Open-Meteo, Windy, Meteo-Parapente,
Burnair, Soaringmeteo.

## Cosa c'è già (TASK-305 R)

Lo sport `paragliding` «Record only»; quota GPS, quota massima, vario su
10 s, velocità, tempo di volo (`src/air/flight.ts`); i tratti a piedi e in
volo (`flightParts.ts`); il live con `alt_m`, `max_alt_m`, `vario_mps`,
`speed_mps` e la pagina `site/live/`; «I tuoi voli», i record, «Pronto al
decollo» (R5); hike & fly (R6). La mappa ha già il 3D (terreno con
esagerazione 1,3, inclinazione 55°). Pacchetti già presenti che servono:
`expo-audio`, `expo-speech`, `expo-keep-awake`, `expo-file-system`,
`expo-sharing`, `expo-document-picker`, `expo-location` in background.
In `app.json` iOS ha già `UIBackgroundModes: ["audio"]`; il plugin
`expo-audio` ha `enableBackgroundPlayback: false`.

## Le parti

Una parte = un branch da `main` = una PR «pronta» al Coordinatore, con la
lista dei file prima della PR. Ordine scelto dall'utente (2026-11-21): **B1 → B2 →
C → A1 → E → D → F (con A2) → G → H**. All'inizio era B1 → C → A1 → E → D →
B2 → …; la sera del 2026-11-21 l'utente ha chiesto di poter spostare i dati
sullo schermo e ha scelto «B2 right after» (l'editor subito dopo B1). Il
motivo: prima i numeri e il loro posto sullo schermo, poi il suono, che
serve in ogni volo e alla prova col pilota; poi la mappa, gli spazi aerei e
la navigazione, i cui widget entrano nell'elenco dell'editor quando la loro
parte è in `main`; dopo il volo e il live; il meteo (H) per ultimo, perché
chiede un servizio nuovo sul server.

Dal Coordinatore (2026-11-21): si lavora a fianco della sessione di
TASK-305 (R6d e la #1218 dell'orologio aperte): prima di ogni lista dei
file si guardano i suoi file aperti e quelli di `src/air/`. Ogni testo
nuovo e ogni frase sulla sicurezza in volo passano dall'utente; server e
OTA col suo sì; il simulatore è quello della sessione («simulatore tuo»).

Per ogni parte: prima la logica pura in `src/air/<nome>.ts` con test
deterministici su tracce e file sintetici, poi i componenti. Le schermate
dal simulatore (volo simulato, come `out/TASK-305/race-sim.sh`) vanno
all'utente prima di «pronta»; i testi nuovi si fanno approvare in 5 lingue.

### Parte 0 — documenti (questa PR)

Questo file, ADR-0388, la riga in `STATUS.md` e in `INDEX.md`; le risposte
dell'utente alle cinque domande (in «Scelte dell'utente sulla parte 0»).

### Parte A — Mappa 3D

**A1, in volo** (dopo B1):
1. Modalità 3d con la camera che segue il pilota: inclinata e girata
   nella direzione di marcia (media sugli ultimi 5 s, per non ballare in
   termica) oppure nord in alto; il pilota sceglie, la scelta resta.
2. La traccia colorata per vario (scala fissa −3…+3 m/s, colori da
   `tokens.ts`), il decollo, gli atterraggi da OSM, le boe e i cilindri
   come anelli in 3D, gli spazi aerei del file come volumi trasparenti
   (`fill-extrusion` con base e cima in metri; i limiti AGL si alzano col
   terreno solo dove MapLibre lo permette: **da misurare in A1**, altrimenti
   le pareti a quota MSL con l'etichetta del limite).
3. Riusa `mapKindStyle.ts`/`mapPage.ts` e la WebView; niente librerie
   nuove. Gli aggiornamenti dal telefono alla WebView al massimo 1 al
   secondo (posizione) e uno ogni 5 s (traccia).
4. Misure in volo simulato sul simulatore e, alla prova, su un telefono
   vero: FPS della WebView, batteria per ora di volo con schermo acceso in
   2D e in 3D. Se il 3D costa più del 2D di oltre il 30 %, il 3D resta una
   scelta e la pagina «Map» del preset parte in 2D.

**A2, dopo il volo** (insieme a F):
1. Replay 3D: cursore del tempo, velocità ×1/×10/×60, pausa.
2. La «tenda» sotto la traccia (pareti dalla traccia al terreno), le
   termiche segnate col numero di salita media.
3. Grafici quota/vario/velocità sotto la mappa, col cursore in comune.

### Parte B — Schermata di volo personalizzabile

**B1 — i numeri e la schermata coi preset** (prima parte di codice):
1. Moduli puri: vario istantaneo (2 s) e medio 30 s, guadagno medio della
   termica, quota guadagnata, efficienza L/D attuale (su 30 s, solo in
   planata), vento dalla deriva in spirale (cerchi completi di velocità al
   suolo: il vettore che li centra), il riconoscimento della termica
   (virata continua > 270° con salita), la quota sul decollo, la
   distanza e la rotta dal decollo, la quota MSL corretta col geoide dove
   il telefono dà quella sull'ellissoide (Android).
2. La schermata di volo: pagine scorrevoli di widget su una griglia
   4 × 6 (verticale) / 6 × 4 (orizzontale); i cinque preset qui sotto;
   cambio pagina con un gesto; caratteri grandi, alto contrasto, tema
   chiaro/scuro da `tokens.ts`; schermo sempre acceso
   (`expo-keep-awake`); verticale e orizzontale; target di almeno 64 pt
   per i guanti; blocco dei tocchi (si sblocca con una pressione lunga di
   1,5 s).
3. La quota sul terreno (AGL) dalle tile del terreno lette nella WebView
   della mappa: prima del decollo «Pronto al decollo» carica le tile
   attorno al decollo (raggio 30 km, zoom 10–12, una volta) per l'uso
   senza rete; dove la tile non c'è il widget mostra «—», mai un numero
   inventato.
4. I widget di navigazione, spazi aerei e gara compaiono nella lista solo
   quando la loro parte è in `main` (D, E).

**Scelte dell'utente su B1 (2026-11-21)**:
- **Dove compare**: «Si apre da sola»: la schermata di volo si apre a
  tutto schermo al decollo (quando la fase passa «In the air»); in alto
  «Map» torna alla schermata di registrazione di oggi (mappa,
  condivisione, Stop) e lì un tasto «Flight screen» la riapre. Lo Stop
  resta solo nella schermata di oggi.
- **Orizzontale**: «Dopo la 1.1»: `app.json` blocca l'app in verticale;
  sbloccarla è nativo (fingerprint iOS), quindi entra nella build dopo la
  1.1 con barometro e fotocamera. B1 è solo verticale.

**Rimandati in B1 per motivi tecnici** (deciso dall'agente su delega
dell'utente):
- **AGL** (widget 2) passa ad A1: le quote del terreno si leggono dalla
  WebView della mappa, che è il lavoro di A1; in B1 il preset «Thermal»
  mostra «Above takeoff» al suo posto.
- **Il geoide su Android** passa a E, dove i limiti MSL degli spazi aerei
  lo rendono necessario; fino ad allora la quota è quella che il telefono
  dà, come in R2.
- **Battery** (widget 24): leggere la batteria chiede `expo-battery`, una
  dipendenza nativa nuova: da chiedere all'utente, con la build dopo la
  1.1.
- I grafici (profilo, assistente di termica, bussola) si disegnano con
  `View`, senza `react-native-svg` (non è nell'app).
- **Battery**: «Sì, con la build» (2026-11-21): `expo-battery` entra
  nella build nativa dopo la 1.1, con barometro, fotocamera e
  orizzontale.

**Testi di B1**, approvati dall'utente il 2026-11-21 (en/it «Sì, approvo»,
poi de/fr/es «Sì, approvo»). «Sun» e «Off» c'erano già con altri sensi
(domenica, «No»): per l'aspetto chiaro «Sunlight», per il live spento
«Not sharing». Le parole che l'app ha già (Map, Layout, Dark, Altitude,
Vario, Speed, Done, Flight time, Sharing live) restano le sue.

| en | it | de | fr | es |
|---|---|---|---|---|
| Flight screen | Schermata di volo | Flugbildschirm | Écran de vol | Pantalla de vuelo |
| GPS altitude | Quota GPS | GPS-Höhe | Altitude GPS | Altitud GPS |
| Above takeoff | Sopra il decollo | Über Startplatz | Au-dessus du déco | Sobre el despegue |
| Average vario | Vario medio | Mittleres Vario | Vario moyen | Vario medio |
| Thermal average | Media termica | Thermikschnitt | Moyenne thermique | Media de térmica |
| Thermal gain | Guadagno termica | Thermikgewinn | Gain thermique | Ganancia en térmica |
| Ground speed | Velocità al suolo | Geschw. über Grund | Vitesse sol | Velocidad sobre el suelo |
| Track | Rotta | Kurs | Route | Rumbo |
| Glide ratio | Efficienza | Gleitzahl | Finesse | Planeo |
| Wind | Vento | Wind | Vent | Viento |
| Thermal assistant | Assistente termica | Thermikassistent | Assistant thermique | Asistente de térmica |
| Takeoff | Decollo | Startplatz | Déco | Despegue |
| Clock | Ora | Uhrzeit | Heure | Hora |
| GPS accuracy | Precisione GPS | GPS-Genauigkeit | Précision GPS | Precisión GPS |
| Live | Dal vivo | Live | En direct | En directo |
| Last 10 min | Ultimi 10 min | Letzte 10 Min. | 10 dernières min | Últimos 10 min |
| Thermal | Termica | Thermik | Thermique | Térmica |
| XC | XC | XC | XC | XC |
| Minimal | Essenziale | Minimal | Minimal | Mínimo |
| Look | Aspetto | Aussehen | Apparence | Aspecto |
| Sunlight | Pieno sole | Sonnenlicht | Plein soleil | Pleno sol |
| Lock | Blocca | Sperren | Verrouiller | Bloquear |
| Hold to unlock | Tieni premuto per sbloccare | Zum Entsperren halten | Maintenez pour déverrouiller | Mantén pulsado para desbloquear |
| Not sharing | Non condivisa | Nicht geteilt | Non partagé | Sin compartir |
| From {bearing} · {minutes} min ago | Da {bearing} · {minutes} min fa | Aus {bearing} · vor {minutes} Min. | De {bearing} · il y a {minutes} min | Desde {bearing} · hace {minutes} min |

**B2 — l'editor** (subito dopo B1, scelta dell'utente del 2026-11-21; i
widget delle parti successive entrano nell'elenco quando la loro parte è in
`main`):
1. Pressione lunga su un widget → aggiungi, togli, sposta, ridimensiona
   (1×1 … 4×2), scegli il campo e l'unità.
2. Più profili (es. «Gara», «Libero»), duplica, ripristina il preset;
   export/import del layout come file JSON (`.muwlayout`), con versione;
   salvato sul telefono (`expo-file-system`), mai sul server.

**Come funziona l'editor** (deciso dall'agente su delega dell'utente):
i preset diventano profili del pilota (copie di un preset, «XC», «XC 2»,
senza nomi da scrivere); una pressione lunga di 0,7 s su un widget, o
«Edit layout» nelle opzioni, apre l'editor su quel widget; frecce grandi
spostano il widget di una cella (sopra un widget della stessa misura i due
si scambiano); «Size» passa alla misura successiva che ci sta; «Unit» dà al
widget un'unità sua (o torna a quella del profilo); pagine fino a 5,
profili fino a 8; «Back to preset» e «Delete» chiedono conferma; il file
`.muwlayout` è JSON con tipo e versione, uno di un'app più nuova si
rifiuta. Le scelte salvate da B1 diventano profili senza perdere nulla.

**Testi di B2**, approvati dall'utente il 2026-11-21 (en/it «Sì, approvo»,
poi de/fr/es «Sì, approvo»). Le parole che l'app ha già (Done, Add,
Remove, Delete, Default, Cancel) restano le sue.

| en | it | de | fr | es |
|---|---|---|---|---|
| Edit layout | Modifica schermata | Layout bearbeiten | Modifier la disposition | Editar diseño |
| Page {n} of {count} | Pagina {n} di {count} | Seite {n} von {count} | Page {n} sur {count} | Página {n} de {count} |
| Touch a widget to move it, size it or take it away. | Tocca un widget per spostarlo, ridimensionarlo o toglierlo. | Tippe auf ein Widget, um es zu verschieben, seine Größe zu ändern oder es zu entfernen. | Touchez un widget pour le déplacer, le redimensionner ou le retirer. | Toca un widget para moverlo, cambiar su tamaño o quitarlo. |
| Size | Dimensione | Größe | Taille | Tamaño |
| Unit | Unità | Einheit | Unité | Unidad |
| Add page | Aggiungi pagina | Seite hinzufügen | Ajouter une page | Añadir página |
| Remove page | Togli pagina | Seite entfernen | Retirer la page | Quitar página |
| Duplicate | Duplica | Duplizieren | Dupliquer | Duplicar |
| Back to preset | Torna al preset | Zurück zur Vorlage | Revenir au préréglage | Volver al ajuste inicial |
| Undo every change to this layout? | Annullare tutte le modifiche a questa schermata? | Alle Änderungen an diesem Layout verwerfen? | Annuler toutes les modifications de cette disposition ? | ¿Deshacer todos los cambios de este diseño? |
| Delete this layout? | Eliminare questa schermata? | Dieses Layout löschen? | Supprimer cette disposition ? | ¿Eliminar este diseño? |
| Send file | Invia file | Datei senden | Envoyer le fichier | Enviar archivo |
| Load file | Carica file | Datei laden | Charger un fichier | Cargar archivo |
| No room there. | Lì non c'è posto. | Dort ist kein Platz. | Pas de place là. | Ahí no hay sitio. |
| No room on this page. | Non c'è posto in questa pagina. | Auf dieser Seite ist kein Platz. | Plus de place sur cette page. | No hay sitio en esta página. |
| No room for another size. | Non c'è posto per un'altra dimensione. | Kein Platz für eine andere Größe. | Pas de place pour une autre taille. | No hay sitio para otro tamaño. |
| No room for another page. | Non c'è posto per un'altra pagina. | Kein Platz für eine weitere Seite. | Pas de place pour une autre page. | No hay sitio para otra página. |
| No room for another layout. | Non c'è posto per un'altra schermata. | Kein Platz für ein weiteres Layout. | Pas de place pour une autre disposition. | No hay sitio para otro diseño. |
| This file is not a MuW layout. | Questo file non è una schermata di MuW. | Diese Datei ist kein MuW-Layout. | Ce fichier n'est pas une disposition MuW. | Este archivo no es un diseño de MuW. |
| This layout is from a newer MuW: update the app. | Questa schermata viene da un MuW più nuovo: aggiorna l'app. | Dieses Layout stammt aus einer neueren MuW-Version: Aktualisiere die App. | Cette disposition vient d'une version plus récente de MuW : mettez l'app à jour. | Este diseño es de un MuW más reciente: actualiza la app. |
| MuW could not read this file. | MuW non è riuscita a leggere questo file. | MuW konnte diese Datei nicht lesen. | MuW n'a pas pu lire ce fichier. | MuW no pudo leer este archivo. |
| MuW could not share the file. | MuW non è riuscita a condividere il file. | MuW konnte die Datei nicht teilen. | MuW n'a pas pu partager le fichier. | MuW no pudo compartir el archivo. |

**I widget** (unità nell'interfaccia: quelle dell'utente, più piedi e nodi
come scelta del volo; nel codice metri, m/s, gradi):

| # | Widget | Contenuto | Parte |
|---|---|---|---|
| 1 | GPS altitude | quota MSL | B1 |
| 2 | Height above ground | AGL dalle tile, «—» se manca | B1 |
| 3 | Above takeoff | quota meno quella del decollo | B1 |
| 4 | Vario | istantaneo, 2 s | B1 |
| 5 | Average vario | media 30 s | B1 |
| 6 | Thermal average | salita media della termica in corso / ultima | B1 |
| 7 | Thermal gain | quota guadagnata nella termica | B1 |
| 8 | Ground speed | velocità sul suolo | B1 |
| 9 | Track / compass | rotta al suolo, rosa dei venti | B1 |
| 10 | Glide ratio | L/D attuale (solo in planata, altrimenti «—») | B1 |
| 11 | Wind | direzione e forza dalla deriva in spirale, con l'età della stima | B1 |
| 12 | Thermal assistant | cerchio con la traccia degli ultimi giri colorata per vario e il punto di salita migliore | B1 |
| 13 | Takeoff | distanza e rotta dal decollo | B1 |
| 14 | Nearest landing | atterraggio più vicino (OSM o preferiti): distanza, rotta, quota richiesta | D |
| 15 | Next turnpoint | distanza al bordo del cilindro, rotta, quota richiesta, tempo stimato | D |
| 16 | Glide to turnpoint | quota d'arrivo alla boa con L/D e vento scelti | D |
| 17 | Glide to goal | quota d'arrivo al goal lungo il percorso ottimizzato | D |
| 18 | Start gate | conto alla rovescia all'apertura, poi «Open» | D |
| 19 | Task distance | percorso ottimizzato rimasto | D |
| 20 | XC distance | dal vivo: libera, triangolo piatto, FAI (con la chiusura che manca) | F (logica), B2 (widget) |
| 21 | Nearest airspace | distanza orizzontale e verticale, nome e classe | E |
| 22 | Flight time | da decollo | B1 |
| 23 | Clock | ora locale | B1 |
| 24 | Battery | livello del telefono | B1 |
| 25 | GPS accuracy | ± metri (`useGpsAccuracy`) | B1 |
| 26 | Live | stato della condivisione dal vivo | B1 |
| 27 | Map | mappa 2D/3D in un riquadro | A1 |
| 28 | Altitude chart | profilo degli ultimi 10 min, con gli spazi aerei (E) | B1, E |

**I preset** (pagine da sinistra a destra; si possono cambiare in B2):

| Preset | Pagina 1 | Pagina 2 |
|---|---|---|
| Thermal | Vario grande, Average vario, Thermal assistant, Thermal gain, GPS altitude, Height above ground | Map, Wind, Flight time |
| XC | GPS altitude, Average vario, Ground speed, Glide ratio, Wind, Takeoff, XC distance, Nearest landing | Map (3D), Altitude chart |
| Competition | Next turnpoint, Glide to turnpoint, Glide to goal, Start gate, Task distance, Average vario, GPS altitude | Map con la task, Nearest airspace |
| Map | Map a tutto schermo con Vario, GPS altitude e Ground speed in alto | — |
| Minimal | Vario, GPS altitude, Flight time | — |

### Parte C — Vario sonoro

1. Bip che sale di tono con la salita (es. 600 Hz a 0 m/s → 1600 Hz a
   +5 m/s, cadenza da 2 a 8 bip al secondo), suono continuo grave sotto la
   soglia di discesa (default −2,5 m/s); soglie di salita (default
   +0,2 m/s) e discesa, volume, muto rapido dalla schermata e dal blocco
   dei tocchi.
2. `expo-audio` con campioni pre-generati (WAV brevi a toni fissi, generati
   da uno script nel repository, nessun download); il suono segue il vario
   istantaneo, con un ritardo misurato (il GPS dà la quota a 1 Hz: il bip
   arriva 1–2 s dopo la salita vera, scritto nelle impostazioni).
3. **A schermo spento**: iOS ha già `UIBackgroundModes: ["audio"]` e la
   registrazione tiene viva l'app con la posizione in background; si prova
   prima così. **Se serve toccare `app.json`/`app.config`** (per esempio
   `enableBackgroundPlayback: true` o un servizio in primo piano Android di
   tipo `mediaPlayback`), **si chiede prima**: cambia il fingerprint iOS e
   chiede una build nativa.

**C fatta** (#1394, in produzione con l'OTA 22 del 2026-11-22). Scelta
dell'utente del 2026-11-22: **il suono parte acceso** al primo volo
(«Acceso»), si spegne col tasto 🔊 accanto al lucchetto, che funziona anche
a schermo bloccato; la scelta resta.

**Com'è fatta** (deciso dall'agente su delega dell'utente):
- 15 loop WAV mono (270 KB) in `apps/mobile/assets/sounds/vario/`, fatti
  da `tools/vario_tones.py` (solo libreria standard, come
  `stretch_chime.py`; `tools/` e non `apps/mobile/scripts/` perché la CI
  prova lì gli script): 11 di salita (0…+5 m/s a passi di 0,5: 600→1600 Hz,
  2→8 bip al secondo; un loop è un bip e il suo silenzio) e 4 di discesa
  (2, 3, 4, 5+ m/s: 400→250 Hz, mezzo secondo di onde intere, senza
  giunture).
- Un player in loop per tono (`varioSound.ts`, expo-audio caricato al
  primo tono); un tono nuovo ferma il precedente, lo stesso tono cambia
  solo il volume; un player fermato dal telefono riparte dopo 2 s. Margine
  di 0,1 m/s ai bordi dei gradini e delle soglie, perché il tono non
  sfarfalli.
- Il suono è della registrazione (`useVarioSound` in `FlightLive`), non
  della schermata di volo: suona anche a schermata chiusa; solo in volo,
  registrando, non in pausa; tace 5 s dopo l'ultimo fix.
- Scelte in un file loro (`vario-sound.json`): acceso o no, bip da +0,1 /
  +0,2 / +0,3 / +0,5 m/s, tono di discesa sotto −1,5 … −4 m/s o mai, volume
  35 / 65 / 100 %; le soglie nell'unità del vario del pilota.
- Nessun tocco ad `app.json`: lo schermo spento non è ancora provato su un
  telefono vero (iOS dovrebbe bastare la modalità audio in background che
  la registrazione già chiede; su Android non è sicuro).

**Testi di C**, approvati dall'utente il 2026-11-22 (en/it «Sì, approvo»,
poi de/fr/es «Sì, approvo»). «Sì»/«No» e i numeri restano quelli dell'app.

| en | it | de | fr | es |
|---|---|---|---|---|
| Vario sound | Suono del vario | Vario-Ton | Son du vario | Sonido del vario |
| Beeps from | Bip da | Piepen ab | Bips dès | Pitidos desde |
| Sink tone below | Tono di discesa sotto | Sinkton unter | Son de descente sous | Tono de descenso bajo |
| Volume | Volume | Lautstärke | Volume | Volumen |
| From GPS: the sound comes 1–2 s after the climb. | Dal GPS: il suono arriva 1–2 s dopo la salita. | Vom GPS: Der Ton kommt 1–2 s nach dem Steigen. | Depuis le GPS : le son arrive 1 à 2 s après la montée. | Desde el GPS: el sonido llega 1–2 s después del ascenso. |
| Mute the vario | Silenzia il vario | Vario stummschalten | Couper le son du vario | Silenciar el vario |
| Turn the vario sound on | Attiva il suono del vario | Vario-Ton einschalten | Activer le son du vario | Activar el sonido del vario |

Resta: la prova al telefono (il suono in volo e a schermo spento).

### Parte D — Navigazione e gare

1. Boe: import `.cup`, `.wpt` (CompeGPS, OziExplorer, GEO), `.xctsk`
   (file e share sheet); boe a mano sulla mappa (pressione lunga);
   atterraggi preferiti. La lettura del **QR di XCTrack con la fotocamera**
   chiede un modulo nativo nuovo (fotocamera): dopo la 1.1 (scelta 4).
2. Task: decollo, start (entrata/uscita, ora d'apertura, gate), boe con
   cilindri, ESS, goal (linea o cilindro); percorso ottimizzato sui
   cilindri (punto più vicino su ogni cerchio, iterato fino a < 1 m);
   sfera FAI o WGS84 come nel file.
3. In volo: la boa è presa quando la traccia entra (o esce, per lo start
   d'uscita) nel cilindro; un suono e la voce (`expo-speech`, già
   nell'app) dicono il nome della boa presa e la successiva; nessuna
   altra frase.
4. Export `.xctsk` e QR (`XCTSK:` versione 2, il codificatore QR scritto
   in TypeScript nel repository, nessuna libreria nuova).
5. Planata: quota d'arrivo alla boa e al goal con L/D e vento scelti dal
   pilota (default L/D 8, vento dalla stima di B1 o zero), **sempre come
   numero** («+340 m» / «−120 m»), mai come «ce la fai» o un colore che
   dice «sì».
6. Atterraggi da OSM: un estratto sul server (`services/api/`, job come
   quelli di Explore) di decolli e atterraggi, scaricato dal telefono per
   la zona del decollo e tenuto per l'uso offline, con «© OpenStreetMap
   contributors». Il server esce prima dell'app, col sì dell'utente.

### Parte E — Spazi aerei dal file del pilota

1. Parser OpenAir puro (`src/air/openair.ts`): `AC`, `AN`, `AL`, `AH`,
   `DP`, `V X=`, `V D=`, `DC`, `DA`, `DB`, `AY`/`AF`/`AG` ignorati se non
   letti; limiti `GND`/`SFC`, `AGL`/`AGL`, `MSL`/`AMSL`, `FL`, `UNL`, in
   piedi o metri. Una riga che non si legge si salta e si conta: il pilota
   vede «N righe non lette».
2. Import da file (`expo-document-picker`) o dallo share sheet; salvato sul
   telefono per l'uso offline; **il nome del file e la data dell'import si
   vedono sempre** sotto ogni vista degli spazi aerei.
3. Sulla mappa 2D/3D (A1) e nel profilo verticale (widget 28); avvisi di
   vicinanza orizzontale (default 1000 m) e verticale (default 100 m),
   regolabili, con suono e una riga sullo schermo; nessun avviso dice
   «libero».
4. I limiti in FL si mostrano «≈» (quota GPS, non barometrica); quelli AGL
   con la quota sul terreno di B1, «—» dove manca.
5. Dopo il volo: il registro dei punti dentro un volume (ora, nome, classe,
   quanto dentro), solo per il pilota, mai nel Feed.
6. Testo fisso sotto ogni vista: «Dati caricati da te: verifica AIP e
   NOTAM prima di volare» (avviso 3).

### Parte F — Dopo il volo

1. Export IGC (record H con `HFFTYFRTYPE:MuW` e il commento «not signed»,
   nessun record G; `HFPLT` solo se il pilota lo scrive) e GPX; import IGC
   (la parte E di TASK-305, qui, record B, quota GNSS o pressione, file
   spezzati; il nome del pilota non si pubblica).
2. Punteggio stile XContest calcolato sul telefono: distanza libera con 3
   boe, triangolo piatto, triangolo FAI (lato minimo ≥ 28 %), chiusura
   (≤ 20 % / ≤ 5 %), coefficienti come le regole pubbliche, con il disegno
   sulla mappa. **Nessun upload, nessuna firma**; il nome «XContest» non
   compare (si dice «XC score»).
3. Analisi: elenco termiche (salita media, quota d'ingresso e uscita,
   durata), planate (L/D, velocità), % del tempo in termica, grafici
   quota/vario/velocità (con A2), confronto coi voli precedenti dallo
   stesso decollo (entro 500 m).
4. Feed: la traccia colorata per vario e i numeri del volo (punteggio XC,
   quota massima, salita migliore); la miniatura 3D solo se la misura di
   A2 dice che si cattura in meno di 2 s.

### Parte G — Live

Task e boe sulla pagina `site/live/` e sulla mappa di chi segue nell'app;
quota e vario ci sono già; vista 3D facoltativa sulla pagina. Il
contratto del live prende la task (campo facoltativo): **il server prima
dell'app e della pagina**, ognuno col sì dell'utente.

### Parte H — Meteo dal nostro server (scelta dell'utente: «Sì, come parte H»)

1. Sul server (`services/api/`, job a sé): scarica DWD ICON-D2 (48 h,
   ~2 km) ed ECMWF open data (oltre le 48 h e fuori dal dominio ICON-D2),
   ritaglia l'Europa dei decolli, tiene il vento u/v su pochi livelli di
   pressione (850, 700, 600, 500 hPa); nessun servizio terzo in mezzo
   (no Open-Meteo, no Windy).
2. API: il vento per livello e ora attorno a un punto, letto dal telefono
   prima del volo e tenuto offline.
3. App: il vento in quota al decollo ora per ora (una scheda in «Pronto
   al decollo») e le frecce sulla mappa 2D/3D; l'attribuzione DWD ed
   ECMWF (CC BY 4.0) e la data della corsa del modello sempre visibili;
   nessun «volabile», «buono», «sicuro»: solo numeri e frecce.
4. Prima del codice: spazio disco e tempo per corsa sul server Hetzner,
   scritti qui. La lettura dei GRIB (eccodes/cfgrib) è una dipendenza
   nuova sul server: **la lista va chiesta prima**. Server e OTA col sì
   dell'utente.
5. Il meteo, come ogni servizio esterno nuovo, va nella privacy (app e
   sito) e passa dall'utente prima della produzione (Coordinatore,
   2026-11-21).

## Gli avvisi (approvati dall'utente il 2026-11-21)

En e it «Sì, approvo», poi de/fr/es «Sì, approvo». L'avviso del primo
volo **sostituisce** quello di R2 nella parte B1 (resta «MuW is not a …
flight instrument»; «Fly with your own instrument» non torna più con una
schermata di volo).

| # | Dove | en | it |
|---|---|---|---|
| 1 | Primo volo con la schermata | MuW is not a certified flight instrument. Its numbers come from the phone's GPS: they can be late or wrong. Fly with your licence and your judgement, and keep a backup instrument. | MuW non è uno strumento di volo certificato. I suoi numeri vengono dal GPS del telefono: possono arrivare in ritardo o essere sbagliati. Vola con il tuo brevetto e il tuo giudizio, e tieni uno strumento di riserva. |
| 2 | Riga fissa in basso nella schermata di volo | GPS numbers · not a certified instrument | Numeri dal GPS · non è uno strumento certificato |
| 3 | Sotto ogni vista degli spazi aerei | Data loaded by you: check the AIP and NOTAMs before you fly. · {file} · loaded {date} | Dati caricati da te: verifica AIP e NOTAM prima di volare. · {file} · caricato il {date} |
| 4 | Nessun file di spazi aerei | No airspace loaded. MuW does not include airspace data. | Nessuno spazio aereo caricato. MuW non include dati di spazi aerei. |
| 5 | Avviso di vicinanza | {name} ({class}) · {dist} · floor {floor} | {name} ({class}) · {dist} · base {floor} |
| 6 | Sotto la planata | Arrival height with glide {ld} and wind {wind}: a number, not a promise. | Quota d'arrivo con efficienza {ld} e vento {wind}: un numero, non una promessa. |
| 7 | Limiti in FL | FL limits from GPS altitude (≈). | Limiti in FL dalla quota GPS (≈). |
| 8 | Export IGC | Not signed: competitions and online contests may not accept it. | Non firmato: gare e classifiche online potrebbero non accettarlo. |

| # | de | fr | es |
|---|---|---|---|
| 1 | MuW ist kein zertifiziertes Fluginstrument. Seine Werte kommen vom GPS des Telefons: Sie können verspätet oder falsch sein. Flieg mit deiner Lizenz und deinem Urteilsvermögen und hab ein Ersatzinstrument dabei. | MuW n'est pas un instrument de vol certifié. Ses valeurs viennent du GPS du téléphone : elles peuvent arriver en retard ou être fausses. Volez avec votre licence et votre jugement, et gardez un instrument de secours. | MuW no es un instrumento de vuelo certificado. Sus datos vienen del GPS del teléfono: pueden llegar con retraso o ser erróneos. Vuela con tu licencia y tu criterio, y lleva un instrumento de reserva. |
| 2 | GPS-Werte · kein zertifiziertes Instrument | Valeurs GPS · pas un instrument certifié | Datos del GPS · no es un instrumento certificado |
| 3 | Von dir geladene Daten: Prüfe AIP und NOTAMs vor dem Flug. · {file} · geladen am {date} | Données chargées par vous : vérifiez l'AIP et les NOTAM avant de voler. · {file} · chargé le {date} | Datos cargados por ti: comprueba el AIP y los NOTAM antes de volar. · {file} · cargado el {date} |
| 4 | Kein Luftraum geladen. MuW enthält keine Luftraumdaten. | Aucun espace aérien chargé. MuW ne fournit pas de données d'espace aérien. | Ningún espacio aéreo cargado. MuW no incluye datos de espacio aéreo. |
| 5 | {name} ({class}) · {dist} · Untergrenze {floor} | {name} ({class}) · {dist} · plancher {floor} | {name} ({class}) · {dist} · base {floor} |
| 6 | Ankunftshöhe mit Gleitzahl {ld} und Wind {wind}: eine Zahl, kein Versprechen. | Hauteur d'arrivée avec finesse {ld} et vent {wind} : un chiffre, pas une promesse. | Altura de llegada con planeo {ld} y viento {wind}: un número, no una promesa. |
| 7 | FL-Grenzen aus der GPS-Höhe (≈). | Limites en FL d'après l'altitude GPS (≈). | Límites en FL según la altitud GPS (≈). |
| 8 | Nicht signiert: Wettbewerbe und Online-Contests akzeptieren es eventuell nicht. | Non signé : les compétitions et les classements en ligne peuvent le refuser. | Sin firmar: las competiciones y clasificaciones en línea pueden no aceptarlo. |

I nomi dei widget nelle 5 lingue si approvano con le schermate di ogni
parte, prima della sua PR.

## Scelte dell'utente sulla parte 0 (2026-11-21)

1. **Ordine delle parti**: B1 → C → A1 → E → D → B2 → F (con A2) → G,
   com'era proposto; la parte H (meteo) dopo G. **Cambiato la sera
   stessa**: «B2 right after», l'editor subito dopo B1 (B1 → B2 → C → A1 →
   E → D → F → G → H).
2. **Testi degli avvisi**: approvati in en/it e poi in de/fr/es (tabelle
   sopra).
3. **Meteo**: «Sì, come parte H» (la proposta era «no per ora»): vento in
   quota da DWD ICON-D2 ed ECMWF open data, elaborati sul nostro server.
4. **Moduli nativi**: «Sì, dopo la 1.1»: barometro (`expo-sensors`) e
   fotocamera per il QR di XCTrack (`expo-camera`) in una build nativa
   dopo la 1.1, ognuno col suo sì prima della build. Fino ad allora quota
   dal GPS e task da file.
5. **Widget e preset**: «Sì, così» (tabelle della parte B).

## Domande che verranno con le parti

I nomi dei widget nelle 5 lingue (B1 e seguenti), l'eventuale tocco di
`app.json` per l'audio a schermo spento (C), la lista delle dipendenze
del server per il meteo (H), il barometro e la fotocamera dopo la 1.1.

## Criteri di accettazione

- [ ] Parte 0: task file e ADR-0388 in `main` con le risposte alle
      domande 1–5 (raccolte il 2026-11-21).
- [ ] Ogni parte: logica pura con test deterministici su file sintetici;
      `tsc` verde; schermate dal simulatore approvate dall'utente; testi
      in 5 lingue approvati; PR «pronta» al Coordinatore.
- [ ] Nessun dato di spazio aereo nel repository, nell'app o sul server
      (nemmeno nei test: file OpenAir sintetici inventati).
- [ ] Nessuna chiamata a openAIP, XContest, LiveTrack24, Open-Meteo,
      Windy, servizi NOTAM (grep nei test di B1).
- [ ] Nessun testo dice «libero», «sicuro», «legale», «ce la fai».
- [ ] A1: FPS e batteria misurati in volo simulato, scritti qui.
- [ ] Prima della pubblicazione: una prova con un pilota vero.

## File toccati

Parte 0:

```
docs/tasks/TASK-479.md          (nuovo)
docs/DECISIONS.md               (ADR-0388, voce e riga d'indice)
docs/STATUS.md                  (la voce del task, righe aggiunte)
docs/INDEX.md                   (una riga)
```

Parti A–G, a grandi linee (la lista vera al Coordinatore prima di ogni
PR; `settings/sport.ts`, `sports/**`, i18n, `social/PublicParts.tsx` e
`map/**` possono essere occupati da altri task):

```
apps/mobile/src/air/**                      (quasi tutto nuovo)
apps/mobile/src/map/mapPage.ts, mapKindStyle.ts   (A1, A2: a turno)
apps/mobile/src/i18n/{it,de,fr,es}.ts       (testi)
apps/mobile/assets/sounds/vario/*           (C, nuovi)
apps/mobile/scripts/vario-tones.*           (C, nuovo)
services/api/shaperoute_api/...             (D: estratto OSM dei siti; G: live; H: meteo)
site/live/*                                 (G)
docs/GPX.md                                 (F)
```

## Fuori scope

- openAIP, XContest, LiveTrack24, NOTAM, meteo a pagamento: rimandati
  all'utente.
- Il pianificatore delle forme nel cono (ADR-0265, parti A1…F di
  TASK-305): resta Proposto.
- Spazi aerei inclusi nell'app o sul server; un elenco di file consigliati.
- La firma IGC (record G) e l'upload a qualsiasi classifica.
- Barometro, fotocamera e parapendio sull'orologio (R4): nativi, dopo la
  1.1, ognuno col suo sì.
- Un meteo da servizi terzi (Open-Meteo, Windy, Meteo-Parapente): la
  parte H usa solo DWD ed ECMWF open data sul nostro server.
- Previsioni di termiche, «giornate volabili» o giudizi sul meteo.
- Una guida a voce oltre al nome della boa presa e della successiva.

## Esito

*(a fine task)*
