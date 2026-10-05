import type { Table } from "./translate";

/**
 * The app's texts in Italian, by their English text (ADR-0172), in the
 * order of the files that show them. To confirm with someone who speaks it
 * (docs/UI.md).
 */
export const IT: Table = {
  // src/account/fields.ts
  "You must be at least 16 to sign up.": "Per iscriverti devi avere almeno 16 anni.",
  "Enter the email of your account.": "Scrivi l'email del tuo account.",
  "Enter your password.": "Scrivi la password.",
  "A username is 3 to 20 letters, digits, _ or . (no spaces).":
    "Un nome utente ha da 3 a 20 fra lettere, cifre, _ o . (niente spazi).",
  "Enter an email address, like name@example.com.":
    "Scrivi un indirizzo email, come nome@example.com.",
  "A password is at least {min} characters.":
    "La password deve avere almeno {min} caratteri.",
  "A password is at most {max} characters.":
    "La password può avere al massimo {max} caratteri.",

  // src/account/messages.ts
  "The app does not know where the API is: open it from the QR code of npm run mobile on the PC.":
    "L'app non sa dov'è l'API: aprila dal codice QR di npm run mobile sul PC.",
  "Your session has ended. Log in again.": "La sessione è scaduta. Accedi di nuovo.",
  "Cannot reach the API at {url}. Check the connection and try again.":
    "Impossibile raggiungere l'API su {url}. Controlla la connessione e riprova.",
  "The app and the API do not agree (a bug): HTTP {status}.":
    "L'app e l'API non si capiscono (un bug): HTTP {status}.",
  "This email already has an account. Log in instead.":
    "Questa email ha già un account. Accedi.",
  "This username is taken. Try another one.":
    "Questo nome utente è già preso. Provane un altro.",
  "Wrong email or password.": "Email o password sbagliate.",
  "Accounts are not available on this API: it has no database.":
    "Gli account non sono disponibili su questa API: non ha un database.",
  "The API refused the app's key (EXPO_PUBLIC_API_KEY in apps/mobile/.env).":
    "L'API ha rifiutato la chiave dell'app (EXPO_PUBLIC_API_KEY in apps/mobile/.env).",
  "The app and the API do not agree (a bug): {message}":
    "L'app e l'API non si capiscono (un bug): {message}",
  "Too many tries. Wait a minute and try again.":
    "Troppi tentativi. Aspetta un minuto e riprova.",
  "Too many tries. Wait {minutes} minutes and try again.":
    "Troppi tentativi. Aspetta {minutes} minuti e riprova.",

  // src/activities/ActivitiesList.tsx
  "{count} run is on this phone, waiting for a connection.":
    "{count} corsa è su questo telefono, in attesa di connessione.",
  "{count} runs are on this phone, waiting for a connection.":
    "{count} corse sono su questo telefono, in attesa di connessione.",
  "Loading…": "Caricamento…",
  "Show more": "Mostra altro",
  "Loading your activities…": "Carico le tue attività…",
  "Your activities could not load.": "Non è stato possibile caricare le tue attività.",
  "Try again": "Riprova",
  "No activities yet. Save a run when you finish it, and it is kept here.":
    "Ancora nessuna attività. Salva una corsa quando la finisci e la ritrovi qui.",
  "{when}, {where}, {facts}, public, open on the map":
    "{when}, {where}, {facts}, pubblica, apri sulla mappa",
  "{when}, {where}, {facts}, open on the map":
    "{when}, {where}, {facts}, apri sulla mappa",
  "Opening…": "Apertura…",
  "Score: {score} out of 100": "Punteggio: {score} su 100",
  "Score {score}": "Punteggio {score}",
  Public: "Pubblica",
  "Delete this run? It cannot be undone.":
    "Eliminare questa corsa? Non si può annullare.",
  // «Keep it» answers two questions (a run, Strava): a word that fits both.
  "Keep it": "Annulla",
  "Delete run": "Elimina corsa",
  "Delete the run of {when}": "Elimina la corsa di {when}",
  Delete: "Elimina",

  // src/activities/ActivityCard.tsx
  "out of 100": "su 100",
  "Yellow: the route. White: what you ran.":
    "Giallo: il percorso. Bianco: quello che hai corso.",
  "White: what you ran.": "Bianco: quello che hai corso.",
  "Back to the list": "Torna all'elenco",

  // src/activities/activitiesDoor.ts
  "Sign up or log in to keep your runs and share them as drawings.":
    "Iscriviti o accedi per tenere le tue corse e condividerle come disegni.",
  "This run is no longer in your activities.":
    "Questa corsa non è più fra le tue attività.",

  // src/activities/activityText.ts
  Sun: "Dom",
  Mon: "Lun",
  Tue: "Mar",
  Wed: "Mer",
  Thu: "Gio",
  Fri: "Ven",
  Sat: "Sab",
  Jan: "gen",
  Feb: "feb",
  Mar: "mar",
  Apr: "apr",
  May: "mag",
  Jun: "giu",
  Jul: "lug",
  Aug: "ago",
  Sep: "set",
  Oct: "ott",
  Nov: "nov",
  Dec: "dic",
  "{weekday} {day} {month} {year}": "{weekday} {day} {month} {year}",
  Run: "Corsa",

  // src/api/comments.ts
  "A comment needs some words.": "Un commento ha bisogno di qualche parola.",
  "A comment is at most {max} characters.":
    "Un commento può avere al massimo {max} caratteri.",
  "Too many comments in a minute. Wait a moment and try again.":
    "Troppi commenti in un minuto. Aspetta un momento e riprova.",
  "The comments of this drawing are not available.":
    "I commenti di questo disegno non sono disponibili.",

  // src/api/reactions.ts
  "At least 2 characters": "Almeno 2 caratteri",
  "Your reaction wasn't saved. Check the connection.":
    "La tua reazione non è stata salvata. Controlla la connessione.",

  // src/api/strava.ts
  "No connection. Try again when you are online.":
    "Nessuna connessione. Riprova quando sei online.",
  "Strava is taking no more runs for now. Try again later.":
    "Per ora Strava non accetta altre corse. Riprova più tardi.",
  "Strava could not read this run.": "Strava non è riuscito a leggere questa corsa.",
  "Strava is not connected. Connect it and try again.":
    "Strava non è collegato. Collegalo e riprova.",
  "Strava is not available on this API.": "Strava non è disponibile su questa API.",
  "Strava did not answer. Try again in a while.":
    "Strava non ha risposto. Riprova fra un po'.",

  // src/engine/OfflineMapsSetting.tsx
  "Offline maps: {size}": "Mappe offline: {size}",
  "Maps download on Wi-Fi and mobile data.":
    "Le mappe si scaricano con il Wi-Fi e con i dati mobili.",

  // src/engine/ZoneNotice.tsx
  "Downloading the maps of your area ({size}) so routes work without signal.":
    "Sto scaricando le mappe della tua zona ({size}) perché i percorsi funzionino anche senza segnale.",

  // src/engine/sizeText.ts
  "{size} MB": "{size} MB",
  "{size} GB": "{size} GB",

  // src/favorites/FavoriteHeart.tsx
  "Remove from favorites": "Togli dai preferiti",
  "Add to favorites": "Aggiungi ai preferiti",

  // src/favorites/FavoritesList.tsx
  "Kept {day} {month} {year}": "Salvato il {day} {month} {year}",
  "{title}, open on the map": "{title}, apri sulla mappa",
  "Remove {title} from favorites": "Togli {title} dai preferiti",
  "Loading your favorites…": "Carico i tuoi preferiti…",
  "Your favorites could not load.": "Non è stato possibile caricare i tuoi preferiti.",
  "No favorites yet. Tap {heart} on a route on the map to keep it here.":
    "Ancora nessun preferito. Tocca {heart} su un percorso sulla mappa per tenerlo qui.",

  // src/favorites/favoriteRoute.ts
  Route: "Percorso",

  // src/favorites/favoritesDoor.ts
  "Sign up or log in to keep your favorite routes.":
    "Iscriviti o accedi per tenere i tuoi percorsi preferiti.",

  // src/feed/FeedAd.tsx
  Sponsored: "Sponsorizzato",

  // src/feed/FeedPost.tsx
  "OpenFreeMap © OpenMapTiles\nData from OpenStreetMap":
    "OpenFreeMap © OpenMapTiles\nDati da OpenStreetMap",
  "{user} in {city}: {title}. {facts}.": "{user} a {city}: {title}. {facts}.",
  "Opens the route on the map": "Apre il percorso sulla mappa",

  // src/i18n/shapeNames.ts
  Circle: "Cerchio",
  Heart: "Cuore",
  Star: "Stella",
  Horse: "Cavallo",
  Moon: "Luna",
  Cat: "Gatto",
  Fish: "Pesce",
  Butterfly: "Farfalla",
  Snail: "Lumaca",
  "Dog head": "Testa di cane",
  "Rabbit head": "Testa di coniglio",
  Pumpkin: "Zucca",
  "Christmas tree": "Albero di Natale",
  Smiley: "Faccina",
  Ghost: "Fantasmino",
  Donut: "Ciambella",
  "The sun": "Sole",

  // src/explore/NearbyTowns.tsx
  "NEARBY TOWNS": "PAESI VICINI",
  "{town}, {km} km away": "{town}, a {km} km",
  "{mi} mi away": "a {mi} mi",
  "{town}, {mi} mi away": "{town}, a {mi} mi",

  // src/paddle/PaddleExplore.tsx
  Next: "A seguire",
  "Drawing…": "Disegno in corso…",
  "Your start": "La tua partenza",
  "On the water": "Sull'acqua",
  "Shapes to paddle, within 1 km of the shore":
    "Forme da pagaiare, entro 1 km dalla riva",
  "LAKES AND SEA": "LAGHI E MARE",
  "Near me": "Vicino a me",
  "Choose a lake or a beach: eight shapes on its water, from the shore.":
    "Scegli un lago o una spiaggia: otto forme sulla sua acqua, partendo dalla riva.",
  "Choose a start in Draw first: the shapes start from the shore nearest to it.":
    "Prima scegli una partenza in Draw: le forme partono dalla riva più vicina.",
  "Near your start": "Vicino alla tua partenza",
  "{km} km away": "a {km} km",
  "Type a lake or a beach": "Scrivi un lago o una spiaggia",
  "No lake or beach matches “{typed}”.":
    "Nessun lago o spiaggia corrisponde a «{typed}».",
  "{shape}, {km} km, on the water": "{shape}, {km} km, sull'acqua",
  "Not drawn": "Non disegnato",

  // src/paddle/PaddleNotice.tsx
  "Before you paddle": "Prima di andare in acqua",
  "Wear a life jacket.": "Indossa il giubbotto salvagente.",
  "Check the weather and the wind before you go out.":
    "Controlla il meteo e il vento prima di uscire.",
  "Follow the local rules: swimming areas, boat lanes, harbours. Sgrava does not know them.":
    "Rispetta le regole del posto: zone di balneazione, corridoi di lancio, porti. Sgrava non le conosce.",
  "The route stays within 1 km of the shore. That does not make it safe or allowed.":
    "Il percorso resta entro 1 km dalla riva. Questo non lo rende sicuro né permesso.",
  "I understand": "Ho capito",
  "Not now": "Non ora",

  // src/paddle/MoveShape.tsx, src/route/RoutePanel.tsx
  "Move the shape": "Sposta la forma",
  "Drag the shape where you want it, then let go.":
    "Trascina la forma dove la vuoi, poi lasciala.",
  "It stays on the water, off the shore, where it fits.":
    "Resta sull'acqua, lontana dalla riva, dove ci sta.",
  "The shape does not fit there: this is the nearest place.":
    "Lì la forma non ci sta: questo è il posto più vicino.",

  // src/paddle/waterPlaces.ts
  "from Riva del Garda": "da Riva del Garda",
  "from Como": "da Como",
  "from the beach": "dalla spiaggia",

  // src/places/PlaceSearch.tsx
  "City or street": "Città o via",
  Search: "Cerca",
  "Searching…": "Cerco…",
  "No place found. Try adding the city.":
    "Nessun luogo trovato. Prova ad aggiungere la città.",
  "The search failed. Check the connection and try again.":
    "La ricerca non è riuscita. Controlla la connessione e riprova.",
  "© OpenStreetMap contributors": "© contributori di OpenStreetMap",

  // src/profile/EditProfile.tsx
  USERNAME: "NOME UTENTE",
  "3 to 20 letters, digits, _ or .": "Da 3 a 20 fra lettere, cifre, _ o .",
  BIO: "BIO",
  "A few words about you": "Qualche parola su di te",
  "{length} of {max} characters": "{length} di {max} caratteri",
  "Saving…": "Salvataggio…",
  Save: "Salva",

  // src/profile/PhotoChoices.tsx
  "Removing…": "Rimozione…",
  "Choose a picture": "Scegli una foto",
  "Take a photo": "Scatta una foto",
  "Remove picture": "Togli la foto",

  // src/profile/PhotoRow.tsx
  "Profile picture": "Foto del profilo",

  // src/profile/ProfileHome.tsx
  "Edit profile": "Modifica profilo",
  Favorites: "Preferiti",
  "My activities": "Le mie attività",
  Settings: "Impostazioni",

  // src/settings/EmailSetting.tsx, PhoneSetting.tsx, contactFields.ts (TASK-183)
  "NEW EMAIL": "NUOVA EMAIL",
  "PHONE NUMBER": "NUMERO DI TELEFONO",
  Add: "Aggiungi",
  "Remove number": "Togli il numero",
  "Only you see your number. Friends who already have it will be able to find you on Sgrava.":
    "Il numero lo vedi solo tu. Gli amici che lo hanno già potranno trovarti su Sgrava.",
  "Changing the email is not available on this API yet.":
    "Su questa API non si può ancora cambiare l'email.",
  "The phone number is not available on this API yet.":
    "Su questa API il numero di telefono non c'è ancora.",
  "This is already the email of your account.": "È già l'email del tuo account.",
  "Write the number with its country code, like +39 333 123 4567.":
    "Scrivi il numero con il prefisso del paese, come +39 333 123 4567.",
  "Wrong password.": "Password sbagliata.",
  "Another account has this email.": "Un altro account ha questa email.",

  // src/profile/SettingsPage.tsx
  "Change email": "Cambia email",
  "Phone number": "Numero di telefono",
  Units: "Unità di misura",
  NOTIFICATIONS: "NOTIFICHE",
  "Email notifications": "Notifiche email",
  "Push notifications": "Notifiche push",
  ABOUT: "INFORMAZIONI",
  Help: "Aiuto",
  Terms: "Termini",
  Privacy: "Privacy",
  "{name}, coming soon": "{name}, in arrivo",
  Soon: "Presto",
  ACCOUNT: "ACCOUNT",
  PREFERENCES: "PREFERENZE",
  "Log out": "Esci",
  "Delete your account? Everything that is yours goes with it, at once. It cannot be undone.":
    "Eliminare il tuo account? Tutto quello che è tuo viene eliminato con lui, subito. Non si può annullare.",
  "Deleting…": "Eliminazione…",
  "Delete my account": "Elimina il mio account",
  "Keep my account": "Tieni il mio account",
  "Delete account": "Elimina account",

  // src/profile/UserProfilePage.tsx
  "Log in to see the profiles of the others.":
    "Accedi per vedere i profili degli altri.",
  "This profile is not available.": "Questo profilo non è disponibile.",
  "{count} drawing": "{count} disegno",
  "{count} drawings": "{count} disegni",
  "Loading the profile…": "Carico il profilo…",
  "{count} follower": "{count} follower",
  "{count} followers": "{count} follower",
  "{count} following": "segue {count}",

  // src/profile/profileFields.ts
  "Editing the profile is not available on this API yet.":
    "Su questa API non si può ancora modificare il profilo.",
  "A bio is at most {max} characters.": "La bio può avere al massimo {max} caratteri.",

  // src/profile/useProfilePhoto.ts
  "The camera is off for this app. Allow it in Settings, or choose a picture instead.":
    "Questa app non ha accesso alla fotocamera. Consentilo nelle Impostazioni, oppure scegli una foto.",
  "This picture is too large. Choose a smaller one.":
    "Questa foto è troppo grande. Scegline una più piccola.",
  "Could not open the picture. Try again.": "Impossibile aprire la foto. Riprova.",
  "This picture cannot be used. Choose another one.":
    "Questa foto non si può usare. Scegline un'altra.",
  "Profile pictures are not available on this API yet.":
    "Su questa API le foto del profilo non ci sono ancora.",

  // src/route/RoutePanel.tsx
  "{letters} km of letters + {between} km riding between them":
    "{letters} km di lettere + {between} km in bici fra una lettera e l'altra",
  "{drawn} km of drawing + {between} km walking between the parts":
    "{drawn} km di disegno + {between} km a piedi fra una parte e l'altra",
  "{drawn} km of drawing + {between} km riding between the parts":
    "{drawn} km di disegno + {between} km in bici fra una parte e l'altra",
  "{drawn} km of drawing + {between} km paddling between the parts":
    "{drawn} km di disegno + {between} km pagaiando fra una parte e l'altra",
  "On the water, a shape of the catalogue.": "Sull'acqua, una forma del catalogo.",
  "{name} · on the water · target {km} km": "{name} · sull'acqua · obiettivo {km} km",
  "{name} · on roads · target {km} km": "{name} · su strada · obiettivo {km} km",

  // src/route/betterDistance.ts
  "This shape comes out better at about {km} km.":
    "Questa forma viene meglio a circa {km} km.",
  "This word comes out better at about {km} km.":
    "Questa parola viene meglio a circa {km} km.",
  "This outline comes out better at about {km} km.":
    "Questo contorno viene meglio a circa {km} km.",
  "Try {km} km": "Prova {km} km",

  // src/route/problems.ts
  "There is no lake or sea near this start. Start from the shore, within 2 km of the water.":
    "Non c'è un lago o il mare vicino a questa partenza. Parti dalla riva, entro 2 km dall'acqua.",
  "This shape does not fit on the water here at this distance. It fits at about {km} km.":
    "Qui questa forma non sta sull'acqua a questa distanza. Ci sta a circa {km} km.",
  "This shape does not fit on the water here. Try a shorter distance, another shape, or another start:":
    "Qui questa forma non sta sull'acqua. Prova una distanza più corta, un'altra forma o un'altra partenza:",

  // src/route/warnings.ts
  "Includes {distance} walking the bike.": "Di cui {distance} con la bici a mano.",

  // src/screens/PeopleScreen.tsx
  "Find friends": "Trova amici",

  // src/screens/ProfileLayer.tsx
  "Profile, log in again": "Profilo, accedi di nuovo",
  "Profile, {count} follow request": "Profilo, {count} richiesta di seguirti",
  "Profile, {count} follow requests": "Profilo, {count} richieste di seguirti",
  Profile: "Profilo",

  // src/screens/ProfileScreen.tsx
  "Your account and everything that was yours have been deleted.":
    "Il tuo account e tutto quello che era tuo sono stati eliminati.",
  "You are logged out on this phone.": "Hai chiuso la sessione su questo telefono.",
  Back: "Indietro",

  // src/screens/RunDashboard.tsx
  Speed: "Velocità",
  "Kilometre {km}: {speed} km/h": "Chilometro {km}: {speed} km/h",

  // src/screens/RunPanel.tsx
  "Speed now": "Vel. ora",
  "Avg speed": "Vel. media",
  "Last km": "Ultimo km",

  // src/screens/SignInScreen.tsx
  "Sign up": "Iscriviti",
  "Log in": "Accedi",
  EMAIL: "EMAIL",
  "name@example.com": "nome@example.com",
  PASSWORD: "PASSWORD",
  "At least 8 characters": "Almeno 8 caratteri",
  "I am at least 16": "Ho almeno 16 anni",
  "Signing up…": "Iscrizione…",
  "Logging in…": "Accesso…",

  // src/settings/LanguageSetting.tsx
  Language: "Lingua",
  "Phone language": "Lingua del telefono",

  // src/settings/UnitsSetting.tsx
  Kilometres: "Chilometri",
  Miles: "Miglia",
  "Phone units": "Unità del telefono",

  // src/settings/sport.ts
  "Ride without a route": "Pedala senza percorso",
  "Paddle without a route": "Pagaia senza percorso",
  "Run without a route": "Corri senza percorso",

  // src/share/PostImage.tsx
  "Drag it to move it. Tap it to take it off.":
    "Trascinala per spostarla. Toccala per toglierla.",

  // src/share/SharePost.tsx
  "Share your run": "Condividi la corsa",
  "Drag the emoji to move them. Tap one to take it off.":
    "Trascina le emoji per spostarle. Toccane una per toglierla.",
  Results: "Risultati",
  "Add emoji": "Aggiungi emoji",
  "Add {emoji}": "Aggiungi {emoji}",
  "Up to {count} emoji: tap one on the post to take it off.":
    "Al massimo {count} emoji: toccane una sul post per toglierla.",
  "Making the picture…": "Preparo l'immagine…",
  "Pick Instagram in the list: Story, Feed or Messages.":
    "Scegli Instagram nell'elenco: Storia, Feed o Messaggi.",
  Share: "Condividi",

  // src/share/StravaPostRow.tsx
  "To send this post to Strava, save the run, then share it from «My activities».":
    "Per mandare questo post a Strava, salva la corsa e poi condividila da «Le mie attività».",
  "Update on Strava": "Aggiorna su Strava",
  "The activity on Strava has this post's text now.":
    "Ora l'attività su Strava ha il testo di questo post.",
  "Strava did not let Sgrava change this activity. Change its text on Strava.":
    "Strava non ha permesso a Sgrava di cambiare questa attività. Cambia il testo su Strava.",
  "Strava takes no pictures from other apps: keep this one in Photos with «Save Image» and add it there.":
    "Strava non accetta immagini da altre app: tieni questa in Foto con «Salva immagine» e aggiungila lì.",

  // src/share/postRun.ts
  Distance: "Distanza",
  Time: "Tempo",
  Pace: "Passo",

  // src/share/sharePicture.ts
  "This phone cannot open the share sheet.":
    "Questo telefono non riesce ad aprire il menu di condivisione.",
  "The picture could not be made. Try again.":
    "Non è stato possibile creare l'immagine. Riprova.",

  // src/social/DrawingCard.tsx
  "Back to the profile": "Torna al profilo",

  // src/social/DrawingComments.tsx
  "Opens the comments of this drawing.": "Apre i commenti di questo disegno.",
  Comments: "Commenti",
  "Delete this comment?": "Eliminare questo commento?",
  Cancel: "Annulla",
  "Close the comments": "Chiudi i commenti",
  Close: "Chiudi",
  "Add a comment…": "Aggiungi un commento…",
  Comment: "Commento",
  Post: "Pubblica",
  "{count} of {max} characters": "{count} di {max} caratteri",
  "Loading the comments…": "Carico i commenti…",
  "No comments yet. Be the first.": "Ancora nessun commento. Scrivi il primo.",
  "Show more comments": "Mostra altri commenti",
  "{name}, {ago}: {text}": "{name}, {ago}: {text}",
  "Touch and hold to delete.": "Tieni premuto per eliminare.",

  // src/social/DrawingReactions.tsx
  React: "Reagisci",
  "Your reaction: {name}": "La tua reazione: {name}",
  "{count} reaction": "{count} reazione",
  "{count} reactions": "{count} reazioni",

  // src/social/DrawingsGrid.tsx
  Drawings: "Disegni",
  "No public drawings yet. Make a run public in My activities.":
    "Ancora nessun disegno pubblico. Rendi pubblica una corsa in Le mie attività.",
  "No drawings yet.": "Ancora nessun disegno.",
  "{title}, score {score} out of 100, open on the map":
    "{title}, punteggio {score} su 100, apri sulla mappa",

  // src/social/SuperLikeSheet.tsx
  "Super like": "Super like",
  "Write a comment to send your super like":
    "Scrivi un commento per inviare il tuo super like",
  Send: "Invia",

  // src/social/reactionKinds.ts
  "Sgrava heart, super like": "Cuore di Sgrava, super like",
  Fire: "Fuoco",
  Clap: "Applauso",
  Strong: "Forza",
  Laugh: "Risata",
  Wow: "Wow",

  // src/social/commentText.ts
  "You can't write negative comments in this app. Try another app.":
    "In questa app non puoi scrivere commenti negativi, cambia app.",
  "just now": "adesso",
  "{count} min ago": "{count} min fa",
  "{count} h ago": "{count} h fa",
  "{count} d ago": "{count} g fa",
  "Write a comment": "Scrivi un commento",
  "{count} comment": "{count} commento",
  "{count} comments": "{count} commenti",

  // src/social/drawingsDoor.ts
  "This drawing is no longer public.": "Questo disegno non è più pubblico.",

  // src/social/FollowButton.tsx
  "Stop following {name}?": "Smettere di seguire {name}?",
  Unfollow: "Non seguire più",
  "Takes your request back.": "Ritira la tua richiesta.",
  Follow: "Segui",
  Requested: "Richiesta inviata",
  Following: "Segui già",

  // src/social/FollowLists.tsx
  Requests: "Richieste",
  Followers: "Follower",
  "Nobody is asking to follow you.": "Nessuno chiede di seguirti.",
  "Nobody follows you yet.": "Ancora nessuno ti segue.",
  "You are not following anyone yet. Find friends from Feed.":
    "Non segui ancora nessuno. Trova amici da Feed.",
  Accept: "Accetta",
  "Accept {name}": "Accetta {name}",
  Decline: "Rifiuta",
  "Decline {name}": "Rifiuta {name}",
  "Follow back": "Segui anche tu",
  "Follow {name} back": "Segui anche tu {name}",
  Remove: "Togli",
  "Remove {name}": "Togli {name}",
  "Remove {name} from your followers?": "Togliere {name} dai tuoi follower?",

  // src/social/PeopleSearch.tsx
  "Log in to find your friends.": "Accedi per trovare i tuoi amici.",
  "This server cannot look for members yet.":
    "Questo server non sa ancora cercare gli iscritti.",
  Name: "Nome",
  "Type at least 2 letters of a name.": "Scrivi almeno 2 lettere di un nome.",
  "Nobody has a name like that.": "Nessuno ha un nome così.",

  // src/strava/StravaActivityRow.tsx
  "Sending to Strava…": "Invio a Strava…",
  "View on Strava": "Visualizza su Strava",
  "This run is on Strava.": "Questa corsa è su Strava.",
  "Strava is still reading this run.": "Strava sta ancora leggendo questa corsa.",
  "Check again": "Controlla di nuovo",
  "Send to Strava": "Invia a Strava",

  // src/strava/StravaParts.tsx
  "Opening Strava…": "Apro Strava…",
  "Connect with Strava": "Connetti con Strava",
  On: "Sì",
  Off: "No",
  "Name on Strava": "Nome su Strava",
  "Leave empty for an automatic name": "Lascia vuoto per un nome automatico",

  // src/strava/StravaRunEnd.tsx
  "Connect Strava, and Save sends your runs there too.":
    "Collega Strava: con Salva le tue corse andranno anche lì.",
  "To {athlete}'s Strava, with Save.": "Con Salva va anche sullo Strava di {athlete}.",

  // src/strava/StravaSetting.tsx
  "Strava, connected": "Strava, collegato",
  "Strava, connected as {athlete}": "Strava, collegato come {athlete}",
  Connected: "Collegato",
  "Connected as {athlete}": "Collegato come {athlete}",
  "Disconnect Strava? Runs already sent stay on Strava.":
    "Scollegare Strava? Le corse già inviate restano su Strava.",
  Disconnect: "Scollega",
  "Disconnecting…": "Scollegamento…",
  "Disconnect Strava": "Scollega Strava",
  "Send the runs you save in Sgrava to your Strava profile.":
    "Invia al tuo profilo Strava le corse che salvi in Sgrava.",

  // src/strava/useStrava.ts
  "Could not open Strava. Try again.": "Impossibile aprire Strava. Riprova.",
};
