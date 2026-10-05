import type { Table } from "./translate";

/**
 * The app's texts in German, by their English text (ADR-0172), in the
 * order of the files that show them. To confirm with someone who speaks it
 * (docs/UI.md).
 */
export const DE: Table = {
  // src/account/fields.ts
  "You must be at least 16 to sign up.":
    "Du musst mindestens 16 sein, um dich zu registrieren.",
  "Enter the email of your account.": "Gib die E-Mail-Adresse deines Kontos ein.",
  "Enter your password.": "Gib dein Passwort ein.",
  "A username is 3 to 20 letters, digits, _ or . (no spaces).":
    "Ein Benutzername hat 3 bis 20 Buchstaben, Ziffern, _ oder . (keine Leerzeichen).",
  "Enter an email address, like name@example.com.":
    "Gib eine E-Mail-Adresse ein, z. B. name@example.com.",
  "A password is at least {min} characters.":
    "Ein Passwort hat mindestens {min} Zeichen.",
  "A password is at most {max} characters.":
    "Ein Passwort hat höchstens {max} Zeichen.",

  // src/account/messages.ts
  "The app does not know where the API is: open it from the QR code of npm run mobile on the PC.":
    "Die App weiß nicht, wo die API ist: Öffne sie über den QR-Code von npm run mobile auf dem PC.",
  "Your session has ended. Log in again.":
    "Deine Sitzung ist abgelaufen. Melde dich erneut an.",
  "Cannot reach the API at {url}. Check the connection and try again.":
    "Die API unter {url} ist nicht erreichbar. Prüfe die Verbindung und versuche es noch einmal.",
  "The app and the API do not agree (a bug): HTTP {status}.":
    "App und API passen nicht zusammen (ein Fehler): HTTP {status}.",
  "This email already has an account. Log in instead.":
    "Diese E-Mail-Adresse hat schon ein Konto. Melde dich stattdessen an.",
  "This username is taken. Try another one.":
    "Dieser Benutzername ist vergeben. Versuche einen anderen.",
  "Wrong email or password.": "Falsche E-Mail-Adresse oder falsches Passwort.",
  "Accounts are not available on this API: it has no database.":
    "Konten sind auf dieser API nicht verfügbar: Sie hat keine Datenbank.",
  "The API refused the app's key (EXPO_PUBLIC_API_KEY in apps/mobile/.env).":
    "Die API hat den Schlüssel der App abgelehnt (EXPO_PUBLIC_API_KEY in apps/mobile/.env).",
  "The app and the API do not agree (a bug): {message}":
    "App und API passen nicht zusammen (ein Fehler): {message}",
  "Too many tries. Wait a minute and try again.":
    "Zu viele Versuche. Warte eine Minute und versuche es noch einmal.",
  "Too many tries. Wait {minutes} minutes and try again.":
    "Zu viele Versuche. Warte {minutes} Minuten und versuche es noch einmal.",

  // src/activities/ActivitiesList.tsx
  "{count} run is on this phone, waiting for a connection.":
    "{count} Lauf ist auf diesem Handy und wartet auf eine Verbindung.",
  "{count} runs are on this phone, waiting for a connection.":
    "{count} Läufe sind auf diesem Handy und warten auf eine Verbindung.",
  "Loading…": "Lädt…",
  "Show more": "Mehr anzeigen",
  "Loading your activities…": "Deine Aktivitäten werden geladen…",
  "Your activities could not load.": "Deine Aktivitäten konnten nicht geladen werden.",
  "Try again": "Erneut versuchen",
  "No activities yet. Save a run when you finish it, and it is kept here.":
    "Noch keine Aktivitäten. Speichere einen Lauf, wenn du fertig bist, dann findest du ihn hier.",
  "{when}, {where}, {facts}, public, open on the map":
    "{when}, {where}, {facts}, öffentlich, auf der Karte öffnen",
  "{when}, {where}, {facts}, open on the map":
    "{when}, {where}, {facts}, auf der Karte öffnen",
  "Opening…": "Wird geöffnet…",
  "Score: {score} out of 100": "Punktzahl: {score} von 100",
  "Score {score}": "Punktzahl {score}",
  Public: "Öffentlich",
  "Delete this run? It cannot be undone.":
    "Diesen Lauf löschen? Das kann nicht rückgängig gemacht werden.",
  // «Keep it» answers two questions (a run, Strava): a word that fits both.
  "Keep it": "Abbrechen",
  "Delete run": "Lauf löschen",
  "Delete the run of {when}": "Lauf vom {when} löschen",
  Delete: "Löschen",

  // src/activities/ActivityCard.tsx
  "out of 100": "von 100",
  "Yellow: the route. White: what you ran.":
    "Gelb: die Route. Weiß: was du gelaufen bist.",
  "White: what you ran.": "Weiß: was du gelaufen bist.",
  "Back to the list": "Zurück zur Liste",

  // src/activities/activitiesDoor.ts
  "Sign up or log in to keep your runs and share them as drawings.":
    "Registriere dich oder melde dich an, um deine Läufe zu behalten und als Zeichnungen zu teilen.",
  "This run is no longer in your activities.":
    "Dieser Lauf ist nicht mehr in deinen Aktivitäten.",

  // src/activities/activityText.ts
  Sun: "So",
  Mon: "Mo",
  Tue: "Di",
  Wed: "Mi",
  Thu: "Do",
  Fri: "Fr",
  Sat: "Sa",
  Jan: "Jan",
  Feb: "Feb",
  Mar: "März",
  Apr: "Apr",
  May: "Mai",
  Jun: "Juni",
  Jul: "Juli",
  Aug: "Aug",
  Sep: "Sept",
  Oct: "Okt",
  Nov: "Nov",
  Dec: "Dez",
  "{weekday} {day} {month} {year}": "{weekday}, {day}. {month} {year}",
  Run: "Lauf",

  // src/api/comments.ts
  "A comment needs some words.": "Ein Kommentar braucht ein paar Worte.",
  "A comment is at most {max} characters.":
    "Ein Kommentar hat höchstens {max} Zeichen.",
  "Too many comments in a minute. Wait a moment and try again.":
    "Zu viele Kommentare in einer Minute. Warte kurz und versuche es noch einmal.",
  "The comments of this drawing are not available.":
    "Die Kommentare zu dieser Zeichnung sind nicht verfügbar.",

  // src/api/reactions.ts
  "At least 2 characters": "Mindestens 2 Zeichen",
  "Your reaction wasn't saved. Check the connection.":
    "Deine Reaktion wurde nicht gespeichert. Prüfe die Verbindung.",

  // src/api/strava.ts
  "No connection. Try again when you are online.":
    "Keine Verbindung. Versuche es noch einmal, wenn du online bist.",
  "Strava is taking no more runs for now. Try again later.":
    "Strava nimmt gerade keine Läufe mehr an. Versuche es später noch einmal.",
  "Strava could not read this run.": "Strava konnte diesen Lauf nicht lesen.",
  "Strava is not connected. Connect it and try again.":
    "Strava ist nicht verbunden. Verbinde es und versuche es noch einmal.",
  "Strava is not available on this API.": "Strava ist auf dieser API nicht verfügbar.",
  "Strava did not answer. Try again in a while.":
    "Strava hat nicht geantwortet. Versuche es in einer Weile noch einmal.",

  // src/engine/OfflineMapsSetting.tsx
  "Offline maps: {size}": "Offline-Karten: {size}",
  "Maps download on Wi-Fi and mobile data.":
    "Karten werden über WLAN und mobile Daten geladen.",

  // src/engine/ZoneNotice.tsx
  "Downloading the maps of your area ({size}) so routes work without signal.":
    "Die Karten deiner Umgebung werden geladen ({size}), damit Routen auch ohne Empfang funktionieren.",

  // src/engine/sizeText.ts
  "{size} MB": "{size} MB",
  "{size} GB": "{size} GB",

  // src/favorites/FavoriteHeart.tsx
  "Remove from favorites": "Aus Favoriten entfernen",
  "Add to favorites": "Zu Favoriten hinzufügen",

  // src/favorites/FavoritesList.tsx
  "Kept {day} {month} {year}": "Gespeichert am {day}. {month} {year}",
  "{title}, open on the map": "{title}, auf der Karte öffnen",
  "Remove {title} from favorites": "{title} aus Favoriten entfernen",
  "Loading your favorites…": "Deine Favoriten werden geladen…",
  "Your favorites could not load.": "Deine Favoriten konnten nicht geladen werden.",
  "No favorites yet. Tap {heart} on a route on the map to keep it here.":
    "Noch keine Favoriten. Tippe auf {heart} bei einer Route auf der Karte, um sie hier zu behalten.",

  // src/favorites/favoriteRoute.ts
  Route: "Route",

  // src/favorites/favoritesDoor.ts
  "Sign up or log in to keep your favorite routes.":
    "Registriere dich oder melde dich an, um deine Lieblingsrouten zu behalten.",

  // src/feed/FeedAd.tsx
  Sponsored: "Gesponsert",

  // src/feed/FeedPost.tsx
  "OpenFreeMap © OpenMapTiles\nData from OpenStreetMap":
    "OpenFreeMap © OpenMapTiles\nDaten von OpenStreetMap",
  "{user} in {city}: {title}. {facts}.": "{user} in {city}: {title}. {facts}.",
  "Opens the route on the map": "Öffnet die Route auf der Karte",

  // src/i18n/shapeNames.ts
  Circle: "Kreis",
  Heart: "Herz",
  Star: "Stern",
  Horse: "Pferd",
  Moon: "Mond",
  Cat: "Katze",
  Fish: "Fisch",
  Butterfly: "Schmetterling",
  Snail: "Schnecke",
  "Dog head": "Hundekopf",
  "Rabbit head": "Hasenkopf",
  Pumpkin: "Kürbis",
  "Christmas tree": "Weihnachtsbaum",
  Smiley: "Smiley",
  Ghost: "Gespenst",
  Donut: "Donut",
  "The sun": "Sonne",

  // src/explore/NearbyTowns.tsx
  "NEARBY TOWNS": "ORTE IN DER NÄHE",
  "{town}, {km} km away": "{town}, {km} km entfernt",
  "{mi} mi away": "{mi} mi entfernt",
  "{town}, {mi} mi away": "{town}, {mi} mi entfernt",

  // src/paddle/PaddleExplore.tsx
  Next: "Als Nächstes",
  "Drawing…": "Wird gezeichnet…",
  "Your start": "Dein Start",
  "On the water": "Auf dem Wasser",
  "Shapes to paddle, within 1 km of the shore":
    "Formen zum Paddeln, höchstens 1 km vom Ufer",
  "LAKES AND SEA": "SEEN UND MEER",
  "Near me": "In meiner Nähe",
  "Choose a lake or a beach: eight shapes on its water, from the shore.":
    "Wähle einen See oder einen Strand: acht Formen auf seinem Wasser, vom Ufer aus.",
  "Choose a start in Draw first: the shapes start from the shore nearest to it.":
    "Wähle zuerst einen Start in Draw: Die Formen beginnen am nächstgelegenen Ufer.",
  "Near your start": "In der Nähe deines Starts",
  "{km} km away": "{km} km entfernt",
  "Type a lake or a beach": "See oder Strand eingeben",
  "No lake or beach matches “{typed}”.": "Kein See oder Strand passt zu „{typed}“.",
  "{shape}, {km} km, on the water": "{shape}, {km} km, auf dem Wasser",
  "Not drawn": "Nicht gezeichnet",

  // src/paddle/PaddleNotice.tsx
  "Before you paddle": "Bevor du lospaddelst",
  "Wear a life jacket.": "Trag eine Schwimmweste.",
  "Check the weather and the wind before you go out.":
    "Prüf Wetter und Wind, bevor du rausfährst.",
  "Follow the local rules: swimming areas, boat lanes, harbours. Sgrava does not know them.":
    "Halte dich an die Regeln vor Ort: Badezonen, Fahrrinnen, Häfen. Sgrava kennt sie nicht.",
  "The route stays within 1 km of the shore. That does not make it safe or allowed.":
    "Die Route bleibt höchstens 1 km vom Ufer entfernt. Das macht sie weder sicher noch erlaubt.",
  "I understand": "Verstanden",
  "Not now": "Nicht jetzt",

  // src/paddle/MoveShape.tsx, src/route/RoutePanel.tsx
  "Move the shape": "Form verschieben",
  "Drag the shape where you want it, then let go.":
    "Zieh die Form dorthin, wo du sie haben willst, und lass los.",
  "It stays on the water, off the shore, where it fits.":
    "Sie bleibt auf dem Wasser, mit Abstand zum Ufer, wo sie hinpasst.",
  "The shape does not fit there: this is the nearest place.":
    "Dort passt die Form nicht hin: Das ist die nächste Stelle.",

  // src/paddle/waterPlaces.ts
  "from Riva del Garda": "ab Riva del Garda",
  "from Como": "ab Como",
  "from the beach": "vom Strand",

  // src/places/PlaceSearch.tsx
  "City or street": "Stadt oder Straße",
  Search: "Suchen",
  "Searching…": "Suche…",
  "No place found. Try adding the city.":
    "Kein Ort gefunden. Füge die Stadt hinzu und versuche es noch einmal.",
  "The search failed. Check the connection and try again.":
    "Die Suche ist fehlgeschlagen. Prüfe die Verbindung und versuche es noch einmal.",
  "© OpenStreetMap contributors": "© OpenStreetMap-Mitwirkende",

  // src/profile/EditProfile.tsx
  USERNAME: "BENUTZERNAME",
  "3 to 20 letters, digits, _ or .": "3 bis 20 Buchstaben, Ziffern, _ oder .",
  BIO: "BIO",
  "A few words about you": "Ein paar Worte über dich",
  "{length} of {max} characters": "{length} von {max} Zeichen",
  "Saving…": "Wird gespeichert…",
  Save: "Speichern",

  // src/profile/PhotoChoices.tsx
  "Removing…": "Wird entfernt…",
  "Choose a picture": "Bild auswählen",
  "Take a photo": "Foto aufnehmen",
  "Remove picture": "Bild entfernen",

  // src/profile/PhotoRow.tsx
  "Profile picture": "Profilbild",

  // src/profile/ProfileHome.tsx
  "Edit profile": "Profil bearbeiten",
  Favorites: "Favoriten",
  "My activities": "Meine Aktivitäten",
  Settings: "Einstellungen",

  // src/settings/EmailSetting.tsx, PhoneSetting.tsx, contactFields.ts (TASK-183)
  "NEW EMAIL": "NEUE E-MAIL",
  "PHONE NUMBER": "TELEFONNUMMER",
  Add: "Hinzufügen",
  "Remove number": "Nummer entfernen",
  "Only you see your number. Friends who already have it will be able to find you on Sgrava.":
    "Nur du siehst deine Nummer. Freunde, die sie schon haben, können dich auf Sgrava finden.",
  "Changing the email is not available on this API yet.":
    "Die E-Mail lässt sich auf dieser API noch nicht ändern.",
  "The phone number is not available on this API yet.":
    "Die Telefonnummer gibt es auf dieser API noch nicht.",
  "This is already the email of your account.":
    "Das ist schon die E-Mail deines Kontos.",
  "Write the number with its country code, like +39 333 123 4567.":
    "Schreib die Nummer mit Ländervorwahl, zum Beispiel +39 333 123 4567.",
  "Wrong password.": "Falsches Passwort.",
  "Another account has this email.": "Ein anderes Konto hat diese E-Mail.",

  // src/profile/SettingsPage.tsx
  "Change email": "E-Mail ändern",
  "Phone number": "Telefonnummer",
  Units: "Einheiten",
  NOTIFICATIONS: "BENACHRICHTIGUNGEN",
  "Email notifications": "E-Mail-Benachrichtigungen",
  "Push notifications": "Push-Benachrichtigungen",
  ABOUT: "INFO",
  Help: "Hilfe",
  Terms: "Nutzungsbedingungen",
  Privacy: "Datenschutz",
  "{name}, coming soon": "{name}, bald verfügbar",
  Soon: "Bald",
  ACCOUNT: "KONTO",
  PREFERENCES: "PRÄFERENZEN",
  "Log out": "Abmelden",
  "Delete your account? Everything that is yours goes with it, at once. It cannot be undone.":
    "Dein Konto löschen? Alles, was dir gehört, wird sofort mitgelöscht. Das kann nicht rückgängig gemacht werden.",
  "Deleting…": "Wird gelöscht…",
  "Delete my account": "Mein Konto löschen",
  "Keep my account": "Mein Konto behalten",
  "Delete account": "Konto löschen",

  // src/profile/UserProfilePage.tsx
  "Log in to see the profiles of the others.":
    "Melde dich an, um die Profile der anderen zu sehen.",
  "This profile is not available.": "Dieses Profil ist nicht verfügbar.",
  "{count} drawing": "{count} Zeichnung",
  "{count} drawings": "{count} Zeichnungen",
  "Loading the profile…": "Profil wird geladen…",
  "{count} follower": "{count} Follower",
  "{count} followers": "{count} Follower",
  "{count} following": "folgt {count}",

  // src/profile/profileFields.ts
  "Editing the profile is not available on this API yet.":
    "Das Profil kann auf dieser API noch nicht bearbeitet werden.",
  "A bio is at most {max} characters.": "Eine Bio hat höchstens {max} Zeichen.",

  // src/profile/useProfilePhoto.ts
  "The camera is off for this app. Allow it in Settings, or choose a picture instead.":
    "Diese App hat keinen Zugriff auf die Kamera. Erlaube ihn in den Einstellungen oder wähle stattdessen ein Bild.",
  "This picture is too large. Choose a smaller one.":
    "Dieses Bild ist zu groß. Wähle ein kleineres.",
  "Could not open the picture. Try again.":
    "Das Bild konnte nicht geöffnet werden. Versuche es noch einmal.",
  "This picture cannot be used. Choose another one.":
    "Dieses Bild kann nicht verwendet werden. Wähle ein anderes.",
  "Profile pictures are not available on this API yet.":
    "Profilbilder sind auf dieser API noch nicht verfügbar.",

  // src/route/RoutePanel.tsx
  "{letters} km of letters + {between} km riding between them":
    "{letters} km Buchstaben + {between} km mit dem Rad dazwischen",
  "{drawn} km of drawing + {between} km walking between the parts":
    "{drawn} km Zeichnung + {between} km zu Fuß zwischen den Teilen",
  "{drawn} km of drawing + {between} km riding between the parts":
    "{drawn} km Zeichnung + {between} km Fahrt zwischen den Teilen",
  "{drawn} km of drawing + {between} km paddling between the parts":
    "{drawn} km Zeichnung + {between} km Paddeln zwischen den Teilen",
  "On the water, a shape of the catalogue.":
    "Auf dem Wasser eine Form aus dem Katalog.",
  "{name} · on the water · target {km} km": "{name} · auf dem Wasser · Ziel {km} km",
  "{name} · on roads · target {km} km": "{name} · auf Straßen · Ziel {km} km",

  // src/route/betterDistance.ts
  "This shape comes out better at about {km} km.":
    "Diese Form gelingt bei etwa {km} km besser.",
  "This word comes out better at about {km} km.":
    "Dieses Wort gelingt bei etwa {km} km besser.",
  "This outline comes out better at about {km} km.":
    "Dieser Umriss gelingt bei etwa {km} km besser.",
  "Try {km} km": "{km} km versuchen",

  // src/route/problems.ts
  "There is no lake or sea near this start. Start from the shore, within 2 km of the water.":
    "In der Nähe dieses Starts gibt es keinen See und kein Meer. Starte am Ufer, höchstens 2 km vom Wasser entfernt.",
  "This shape does not fit on the water here at this distance. It fits at about {km} km.":
    "Diese Form passt hier bei dieser Distanz nicht aufs Wasser. Sie passt bei etwa {km} km.",
  "This shape does not fit on the water here. Try a shorter distance, another shape, or another start:":
    "Diese Form passt hier nicht aufs Wasser. Versuch eine kürzere Distanz, eine andere Form oder einen anderen Start:",

  // src/route/warnings.ts
  "Includes {distance} walking the bike.":
    "Davon {distance}, auf denen du das Rad schiebst.",

  // src/screens/PeopleScreen.tsx
  "Find friends": "Freunde finden",

  // src/screens/ProfileLayer.tsx
  "Profile, log in again": "Profil, erneut anmelden",
  "Profile, {count} follow request": "Profil, {count} Folgeanfrage",
  "Profile, {count} follow requests": "Profil, {count} Folgeanfragen",
  Profile: "Profil",

  // src/screens/ProfileScreen.tsx
  "Your account and everything that was yours have been deleted.":
    "Dein Konto und alles, was dir gehörte, wurden gelöscht.",
  "You are logged out on this phone.": "Du bist auf diesem Handy abgemeldet.",
  Back: "Zurück",

  // src/screens/RunDashboard.tsx
  Speed: "Geschw.",
  "Kilometre {km}: {speed} km/h": "Kilometer {km}: {speed} km/h",

  // src/screens/RunPanel.tsx
  "Speed now": "Geschw.",
  "Avg speed": "Ø Geschw.",
  "Last km": "Letzter km",

  // src/screens/SignInScreen.tsx
  "Sign up": "Registrieren",
  "Log in": "Anmelden",
  EMAIL: "E-MAIL",
  "name@example.com": "name@example.com",
  PASSWORD: "PASSWORT",
  "At least 8 characters": "Mindestens 8 Zeichen",
  "I am at least 16": "Ich bin mindestens 16",
  "Signing up…": "Registrierung…",
  "Logging in…": "Anmeldung…",

  // src/settings/LanguageSetting.tsx
  Language: "Sprache",
  "Phone language": "Sprache des Handys",

  // src/settings/UnitsSetting.tsx
  Kilometres: "Kilometer",
  Miles: "Meilen",
  "Phone units": "Einheiten des Handys",

  // src/settings/sport.ts
  "Ride without a route": "Ohne Route fahren",
  "Paddle without a route": "Ohne Route paddeln",
  "Run without a route": "Ohne Route laufen",

  // src/share/PostImage.tsx
  "Drag it to move it. Tap it to take it off.":
    "Ziehen zum Verschieben. Tippen zum Entfernen.",

  // src/share/SharePost.tsx
  "Share your run": "Lauf teilen",
  "Drag the emoji to move them. Tap one to take it off.":
    "Zieh die Emojis, um sie zu verschieben. Tipp auf eines, um es zu entfernen.",
  Results: "Ergebnisse",
  "Add emoji": "Emoji hinzufügen",
  "Add {emoji}": "{emoji} hinzufügen",
  "Up to {count} emoji: tap one on the post to take it off.":
    "Höchstens {count} Emojis: Tipp auf eines im Beitrag, um es zu entfernen.",
  "Making the picture…": "Bild wird erstellt…",
  "Pick Instagram in the list: Story, Feed or Messages.":
    "Wähle Instagram in der Liste: Story, Feed oder Nachrichten.",
  Share: "Teilen",

  // src/share/StravaPostRow.tsx
  "To send this post to Strava, save the run, then share it from «My activities».":
    "Um diesen Beitrag an Strava zu senden, speichere den Lauf und teile ihn dann aus «Meine Aktivitäten».",
  "Update on Strava": "Auf Strava aktualisieren",
  "The activity on Strava has this post's text now.":
    "Die Aktivität auf Strava hat jetzt den Text dieses Beitrags.",
  "Strava did not let Sgrava change this activity. Change its text on Strava.":
    "Strava hat Sgrava diese Aktivität nicht ändern lassen. Ändere den Text auf Strava.",
  "Strava takes no pictures from other apps: keep this one in Photos with «Save Image» and add it there.":
    "Strava nimmt keine Bilder aus anderen Apps: leg dieses mit «Bild sichern» in Fotos ab und füg es dort hinzu.",

  // src/share/postRun.ts
  Distance: "Distanz",
  Time: "Zeit",
  Pace: "Pace",

  // src/share/sharePicture.ts
  "This phone cannot open the share sheet.":
    "Dieses Telefon kann das Teilen-Menü nicht öffnen.",
  "The picture could not be made. Try again.":
    "Das Bild konnte nicht erstellt werden. Versuch es noch einmal.",

  // src/social/DrawingCard.tsx
  "Back to the profile": "Zurück zum Profil",

  // src/social/DrawingComments.tsx
  "Opens the comments of this drawing.": "Öffnet die Kommentare zu dieser Zeichnung.",
  Comments: "Kommentare",
  "Delete this comment?": "Diesen Kommentar löschen?",
  Cancel: "Abbrechen",
  "Close the comments": "Kommentare schließen",
  Close: "Schließen",
  "Add a comment…": "Kommentar hinzufügen…",
  Comment: "Kommentar",
  Post: "Posten",
  "{count} of {max} characters": "{count} von {max} Zeichen",
  "Loading the comments…": "Kommentare werden geladen…",
  "No comments yet. Be the first.": "Noch keine Kommentare. Schreib den ersten.",
  "Show more comments": "Mehr Kommentare zeigen",
  "{name}, {ago}: {text}": "{name}, {ago}: {text}",
  "Touch and hold to delete.": "Zum Löschen gedrückt halten.",

  // src/social/DrawingReactions.tsx
  React: "Reagieren",
  "Your reaction: {name}": "Deine Reaktion: {name}",
  "{count} reaction": "{count} Reaktion",
  "{count} reactions": "{count} Reaktionen",

  // src/social/DrawingsGrid.tsx
  Drawings: "Zeichnungen",
  "No public drawings yet. Make a run public in My activities.":
    "Noch keine öffentlichen Zeichnungen. Mach einen Lauf in Meine Aktivitäten öffentlich.",
  "No drawings yet.": "Noch keine Zeichnungen.",
  "{title}, score {score} out of 100, open on the map":
    "{title}, Punktzahl {score} von 100, auf der Karte öffnen",

  // src/social/SuperLikeSheet.tsx
  "Super like": "Super-Like",
  "Write a comment to send your super like":
    "Schreib einen Kommentar, um dein Super-Like zu senden",
  Send: "Senden",

  // src/social/reactionKinds.ts
  "Sgrava heart, super like": "Sgrava-Herz, Super-Like",
  Fire: "Feuer",
  Clap: "Applaus",
  Strong: "Stark",
  Laugh: "Lachen",
  Wow: "Wow",

  // src/social/commentText.ts
  "You can't write negative comments in this app. Try another app.":
    "In dieser App kannst du keine negativen Kommentare schreiben. Nimm eine andere App.",
  "just now": "gerade eben",
  "{count} min ago": "vor {count} Min.",
  "{count} h ago": "vor {count} Std.",
  "{count} d ago": "vor {count} Tg.",
  "Write a comment": "Kommentar schreiben",
  "{count} comment": "{count} Kommentar",
  "{count} comments": "{count} Kommentare",

  // src/social/drawingsDoor.ts
  "This drawing is no longer public.": "Diese Zeichnung ist nicht mehr öffentlich.",

  // src/social/FollowButton.tsx
  "Stop following {name}?": "{name} nicht mehr folgen?",
  Unfollow: "Entfolgen",
  "Takes your request back.": "Zieht deine Anfrage zurück.",
  Follow: "Folgen",
  Requested: "Angefragt",
  Following: "Folge ich",

  // src/social/FollowLists.tsx
  Requests: "Anfragen",
  Followers: "Follower",
  "Nobody is asking to follow you.": "Niemand möchte dir folgen.",
  "Nobody follows you yet.": "Noch folgt dir niemand.",
  "You are not following anyone yet. Find friends from Feed.":
    "Du folgst noch niemandem. Finde Freunde im Feed.",
  Accept: "Annehmen",
  "Accept {name}": "{name} annehmen",
  Decline: "Ablehnen",
  "Decline {name}": "{name} ablehnen",
  "Follow back": "Zurückfolgen",
  "Follow {name} back": "{name} zurückfolgen",
  Remove: "Entfernen",
  "Remove {name}": "{name} entfernen",
  "Remove {name} from your followers?": "{name} aus deinen Followern entfernen?",

  // src/social/PeopleSearch.tsx
  "Log in to find your friends.": "Melde dich an, um deine Freunde zu finden.",
  "This server cannot look for members yet.":
    "Dieser Server kann noch nicht nach Mitgliedern suchen.",
  Name: "Name",
  "Type at least 2 letters of a name.": "Gib mindestens 2 Buchstaben eines Namens ein.",
  "Nobody has a name like that.": "Niemand hat so einen Namen.",

  // src/strava/StravaActivityRow.tsx
  "Sending to Strava…": "Wird an Strava gesendet…",
  "View on Strava": "Auf Strava ansehen",
  "This run is on Strava.": "Dieser Lauf ist auf Strava.",
  "Strava is still reading this run.": "Strava liest diesen Lauf noch.",
  "Check again": "Erneut prüfen",
  "Send to Strava": "An Strava senden",

  // src/strava/StravaParts.tsx
  "Opening Strava…": "Strava wird geöffnet…",
  "Connect with Strava": "Mit Strava verbinden",
  On: "An",
  Off: "Aus",
  "Name on Strava": "Name auf Strava",
  "Leave empty for an automatic name": "Leer lassen für einen automatischen Namen",

  // src/strava/StravaRunEnd.tsx
  "Connect Strava, and Save sends your runs there too.":
    "Verbinde Strava, dann sendet Speichern deine Läufe auch dorthin.",
  "To {athlete}'s Strava, with Save.":
    "Mit Speichern geht der Lauf auch an das Strava-Konto von {athlete}.",

  // src/strava/StravaSetting.tsx
  "Strava, connected": "Strava, verbunden",
  "Strava, connected as {athlete}": "Strava, verbunden als {athlete}",
  Connected: "Verbunden",
  "Connected as {athlete}": "Verbunden als {athlete}",
  "Disconnect Strava? Runs already sent stay on Strava.":
    "Strava trennen? Bereits gesendete Läufe bleiben auf Strava.",
  Disconnect: "Trennen",
  "Disconnecting…": "Wird getrennt…",
  "Disconnect Strava": "Strava trennen",
  "Send the runs you save in Sgrava to your Strava profile.":
    "Sende die Läufe, die du in Sgrava speicherst, an dein Strava-Profil.",

  // src/strava/useStrava.ts
  "Could not open Strava. Try again.":
    "Strava konnte nicht geöffnet werden. Versuche es noch einmal.",
};
