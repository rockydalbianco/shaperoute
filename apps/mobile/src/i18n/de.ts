import type { Table } from "./translate";

/**
 * The app's texts in German, by their English text (ADR-0172), in the
 * order of the files that show them. To confirm with someone who speaks it
 * (docs/UI.md).
 */
export const DE: Table = {
  // src/about/AboutPage.tsx
  "Draft — not final yet.": "Entwurf – noch nicht endgültig.",
  "Last updated: {date}": "Zuletzt aktualisiert: {date}",

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

  // src/account/messages.ts (TASK-256: words for whoever uses the phone)
  "The app cannot reach the service. Update the app.":
    "Die App erreicht den Dienst nicht. Aktualisiere die App.",
  "Your session has ended. Log in again.":
    "Deine Sitzung ist abgelaufen. Melde dich erneut an.",
  "Something went wrong on our side. Try again in a moment.":
    "Bei uns ist etwas schiefgelaufen. Versuche es gleich noch einmal.",
  "No connection. Check the network and try again.":
    "Keine Verbindung. Prüfe die Netzverbindung und versuche es noch einmal.",
  "This email already has an account. Log in instead.":
    "Diese E-Mail-Adresse hat schon ein Konto. Melde dich stattdessen an.",
  "This username is taken. Try another one.":
    "Dieser Benutzername ist vergeben. Versuche einen anderen.",
  "Wrong email or password.": "Falsche E-Mail-Adresse oder falsches Passwort.",
  "Accounts are not available right now. Try again later.":
    "Konten sind gerade nicht verfügbar. Versuche es später noch einmal.",
  "This version of the app is no longer allowed in. Update the app.":
    "Diese Version der App wird nicht mehr hereingelassen. Aktualisiere die App.",
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
  Public: "Öffentlich",
  "Delete this run? It cannot be undone.":
    "Diesen Lauf löschen? Das kann nicht rückgängig gemacht werden.",
  // «Keep it» answers two questions (a run, Strava): a word that fits both.
  "Keep it": "Abbrechen",
  "Delete run": "Lauf löschen",
  "Delete the run of {when}": "Lauf vom {when} löschen",
  Delete: "Löschen",
  // A run the API will not take (TASK-257).
  "The server could not take this run: {message}":
    "Der Server konnte diesen Lauf nicht annehmen: {message}",
  "Discard this run? It will not be saved.":
    "Diesen Lauf verwerfen? Er wird nicht gespeichert.",
  "Discard run": "Lauf verwerfen",
  "Send the run of {when} again": "Lauf vom {when} erneut senden",
  "Discard the run of {when}": "Lauf vom {when} verwerfen",
  Discard: "Verwerfen",

  // src/activities/ActivityCard.tsx
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

  // src/activities/RunEnd.tsx
  "The phone holds {count} runs not sent yet. Discard one in My activities first.":
    "Auf dem Telefon liegen schon {count} noch nicht gesendete Läufe. Verwirf zuerst einen in Meine Aktivitäten.",
  "The phone holds {count} runs not sent yet. They go when there is a connection; then save this one.":
    "Auf dem Telefon liegen schon {count} noch nicht gesendete Läufe. Sie werden gesendet, sobald eine Verbindung besteht; speichere diesen danach.",

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

  // src/intro/AppBoundary.tsx
  "Something went wrong.": "Etwas ist schiefgelaufen.",

  // src/map/MapView.tsx
  "The map could not be loaded. Check the network.":
    "Die Karte konnte nicht geladen werden. Prüfe die Netzverbindung.",
  Retry: "Erneut versuchen",

  // src/map/NorthArrow.tsx
  "North arrow": "Nordpfeil",
  "Turns the map north up": "Dreht die Karte nach Norden",
  "Turns the map like the drawing": "Dreht die Karte wie die Zeichnung",

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
  "{shape}, {mi} mi, on the water": "{shape}, {mi} mi, auf dem Wasser",
  "Not drawn": "Nicht gezeichnet",

  // src/paddle/placeSpots.ts
  "Lake, beach, city or street": "See, Strand, Stadt oder Straße",

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

  // src/settings/NotificationsSetting.tsx, notificationFields.ts
  "Sgrava does not send notifications yet. Your choice is kept for when it does.":
    "Sgrava verschickt noch keine Benachrichtigungen. Deine Auswahl bleibt gespeichert, bis es so weit ist.",
  "Notifications are not available on this API yet.":
    "Benachrichtigungen gibt es auf dieser API noch nicht.",

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
  // «Draw» with «Miles» (TASK-182 part B): src/route/RoutePanel.tsx,
  // DistanceStepper.tsx, wordInput.ts
  "Distance in miles": "Distanz in Meilen",
  "Enter a distance between {lowest} and {highest} mi.":
    "Gib eine Distanz zwischen {lowest} und {highest} mi ein.",
  "{count} letter: at least {mi} mi. A word takes a few minutes to draw.":
    "{count} Buchstabe: mindestens {mi} mi. Ein Wort zu zeichnen dauert ein paar Minuten.",
  "{count} letters: at least {mi} mi. A word takes a few minutes to draw.":
    "{count} Buchstaben: mindestens {mi} mi. Ein Wort zu zeichnen dauert ein paar Minuten.",
  "Use {mi} mi": "{mi} mi verwenden",
  "{letters} mi of letters + {between} mi riding between them":
    "{letters} mi Buchstaben + {between} mi mit dem Rad dazwischen",
  "{letters} mi of letters + {between} mi walking between them":
    "{letters} mi Buchstaben + {between} mi zu Fuß dazwischen",
  "{drawn} mi of drawing + {between} mi walking between the parts":
    "{drawn} mi Zeichnung + {between} mi zu Fuß zwischen den Teilen",
  "{drawn} mi of drawing + {between} mi riding between the parts":
    "{drawn} mi Zeichnung + {between} mi Fahrt zwischen den Teilen",
  "{drawn} mi of drawing + {between} mi paddling between the parts":
    "{drawn} mi Zeichnung + {between} mi Paddeln zwischen den Teilen",
  "{name} · on the water · target {mi} mi": "{name} · auf dem Wasser · Ziel {mi} mi",
  "{name} · on roads · target {mi} mi": "{name} · auf Straßen · Ziel {mi} mi",
  "Drawing the picture's outline, {mi} mi…":
    "Der Umriss des Bildes wird gezeichnet, {mi} mi…",
  "Drawing “{word}”, {mi} mi…": "„{word}“ wird gezeichnet, {mi} mi…",
  "Drawing a {mi} mi {name}…": "Wird gezeichnet: {name}, {mi} mi…",
  "At most {most} letters: each needs {each} mi, and the app goes up to {highest} mi.":
    "Höchstens {most} Buchstaben: jeder braucht {each} mi, und die App geht bis {highest} mi.",
  "“{word}” needs at least {mi} mi: {each} mi for each letter.":
    "„{word}“ braucht mindestens {mi} mi: {each} mi pro Buchstabe.",

  // src/route/betterDistance.ts
  "This shape comes out better at about {km} km.":
    "Diese Form gelingt bei etwa {km} km besser.",
  "This word comes out better at about {km} km.":
    "Dieses Wort gelingt bei etwa {km} km besser.",
  "This outline comes out better at about {km} km.":
    "Dieser Umriss gelingt bei etwa {km} km besser.",
  "Try {km} km": "{km} km versuchen",
  "This shape comes out better at about {mi} mi.":
    "Diese Form gelingt bei etwa {mi} mi besser.",
  "This word comes out better at about {mi} mi.":
    "Dieses Wort gelingt bei etwa {mi} mi besser.",
  "This outline comes out better at about {mi} mi.":
    "Dieser Umriss gelingt bei etwa {mi} mi besser.",
  "Try {mi} mi": "{mi} mi versuchen",

  // src/route/problems.ts
  "The route could not be drawn. Try again, or try another start.":
    "Die Route konnte nicht gezeichnet werden. Versuche es noch einmal oder mit einem anderen Start.",
  "This word cannot be read right now. Try one of these: {list}.":
    "Dieses Wort kann gerade nicht gelesen werden. Versuche eines von diesen: {list}.",
  "Drawing this route is taking too long. Try again later, or a shorter distance.":
    "Das Zeichnen dieser Route dauert zu lange. Versuche es später noch einmal oder mit einer kürzeren Distanz.",
  "This request was lost. Try again.":
    "Diese Anfrage ist verloren gegangen. Versuche es noch einmal.",
  "There is no lake or sea near this start. Start from the shore, within 2 km of the water.":
    "In der Nähe dieses Starts gibt es keinen See und kein Meer. Starte am Ufer, höchstens 2 km vom Wasser entfernt.",
  "This shape does not fit on the water here at this distance. It fits at about {km} km.":
    "Diese Form passt hier bei dieser Distanz nicht aufs Wasser. Sie passt bei etwa {km} km.",
  "This shape does not fit on the water here. Try a shorter distance, another shape, or another start:":
    "Diese Form passt hier nicht aufs Wasser. Versuch eine kürzere Distanz, eine andere Form oder einen anderen Start:",
  "This shape does not fit the roads here at this distance. It fits at about {mi} mi.":
    "Diese Form passt hier bei dieser Distanz nicht auf die Straßen. Sie passt bei etwa {mi} mi.",
  "This word does not fit the roads here at this distance. It fits at about {mi} mi.":
    "Dieses Wort passt hier bei dieser Distanz nicht auf die Straßen. Es passt bei etwa {mi} mi.",
  "This image does not fit the roads here at this distance. It fits at about {mi} mi.":
    "Dieses Bild passt hier bei dieser Distanz nicht auf die Straßen. Es passt bei etwa {mi} mi.",
  "There is no lake or sea near this start. Start from the shore, within 1 mile of the water.":
    "In der Nähe dieses Starts gibt es keinen See und kein Meer. Starte am Ufer, höchstens 1 Meile vom Wasser entfernt.",
  "This shape does not fit on the water here at this distance. It fits at about {mi} mi.":
    "Diese Form passt hier bei dieser Distanz nicht aufs Wasser. Sie passt bei etwa {mi} mi.",

  // src/route/warnings.ts
  "Includes {distance} walking the bike.":
    "Davon {distance}, auf denen du das Rad schiebst.",

  // src/route/RoutePanel.tsx (TASK-210, «Draw»)
  Shape: "Form",
  Word: "Wort",
  Image: "Bild",
  Round: "Rund",
  Square: "Eckig",
  DRAW: "ZEICHNEN",
  LETTERS: "BUCHSTABEN",
  DISTANCE: "DISTANZ",
  "heart, star, horse…": "Herz, Stern, Pferd…",
  "Lift the pen between parts": "Stift zwischen den Teilen anheben",
  "Lift the pen between letters": "Stift zwischen den Buchstaben anheben",
  "Square letters follow the street grid: best for short words.":
    "Eckige Buchstaben folgen dem Straßenraster: am besten für kurze Wörter.",
  "Enter a distance between {lowest} and {highest} km.":
    "Gib eine Distanz zwischen {lowest} und {highest} km ein.",
  "Long routes take longer: up to a few minutes.":
    "Lange Routen dauern länger: bis zu ein paar Minuten.",
  "Draw route": "Route zeichnen",
  Start: "Start",
  "Preparing GPX…": "GPX wird vorbereitet…",
  "Export GPX": "GPX exportieren",
  "{letters} km of letters + {between} km walking between them":
    "{letters} km Buchstaben + {between} km zu Fuß dazwischen",
  "Press Done and the AI will read it.": "Tippe auf Fertig, und die KI liest es.",
  "The AI is reading it…": "Die KI liest es…",
  "No shape in the catalogue for “{text}”. Describe what it looks like (“prancing horse”, not “Ferrari badge”), or pick one:":
    "Keine Form im Katalog für „{text}“. Beschreibe, wie sie aussieht („springendes Pferd“, nicht „Ferrari-Logo“), oder wähle eine:",
  "Unknown shape. Try: {list}.": "Unbekannte Form. Versuche: {list}.",
  "{count} letter: at least {km} km. A word takes a few minutes to draw.":
    "{count} Buchstabe: mindestens {km} km. Ein Wort zu zeichnen dauert ein paar Minuten.",
  "{count} letters: at least {km} km. A word takes a few minutes to draw.":
    "{count} Buchstaben: mindestens {km} km. Ein Wort zu zeichnen dauert ein paar Minuten.",
  "Use {km} km": "{km} km verwenden",
  Picture: "Bild",
  "Waiting for the API…": "Warten auf den Dienst…",
  "Downloading map data for this area…":
    "Kartendaten für dieses Gebiet werden geladen…",
  "Drawing the picture's outline, {km} km…":
    "Der Umriss des Bildes wird gezeichnet, {km} km…",
  "Drawing “{word}”, {km} km…": "„{word}“ wird gezeichnet, {km} km…",
  "Drawing a {km} km {name}…": "Wird gezeichnet: {name}, {km} km…",

  // src/route/problems.ts (TASK-210, «Draw»)
  "This shape does not fit the roads here at this distance. It fits at about {km} km.":
    "Diese Form passt hier bei dieser Distanz nicht auf die Straßen. Sie passt bei etwa {km} km.",
  "This word does not fit the roads here at this distance. It fits at about {km} km.":
    "Dieses Wort passt hier bei dieser Distanz nicht auf die Straßen. Es passt bei etwa {km} km.",
  "This image does not fit the roads here at this distance. It fits at about {km} km.":
    "Dieses Bild passt hier bei dieser Distanz nicht auf die Straßen. Es passt bei etwa {km} km.",
  "This word does not fit the roads here. Try a shorter word, or another start.":
    "Dieses Wort passt hier nicht auf die Straßen. Versuche ein kürzeres Wort oder einen anderen Start.",
  "This outline does not fit the roads here. Try another distance, another start, or a simpler picture.":
    "Dieser Umriss passt hier nicht auf die Straßen. Versuche eine andere Distanz, einen anderen Start oder ein einfacheres Bild.",
  "This shape does not fit the roads here. Try another shape, or another start:":
    "Diese Form passt hier nicht auf die Straßen. Versuche eine andere Form oder einen anderen Start:",
  "Map data for this area could not be downloaded. Try again later.":
    "Die Kartendaten für dieses Gebiet konnten nicht geladen werden. Versuche es später noch einmal.",
  "The route engine cannot find one clear outline in this picture.":
    "In diesem Bild ist kein klarer Umriss zu finden.",
  "Only PNG and JPEG pictures work. Choose another one.":
    "Nur PNG- und JPEG-Bilder funktionieren. Wähle ein anderes.",
  "This picture could not be read. Choose another one.":
    "Dieses Bild konnte nicht gelesen werden. Wähle ein anderes.",
  "The background is too busy. Use one subject on a plain background, like a drawing on white paper or an object on a bare table.":
    "Der Hintergrund ist zu unruhig. Nimm ein Motiv auf einfarbigem Hintergrund, etwa eine Zeichnung auf weißem Papier oder einen Gegenstand auf einem leeren Tisch.",
  "Nothing stands out from the background. Use a subject much darker or brighter than what is around it.":
    "Nichts hebt sich vom Hintergrund ab. Nimm ein Motiv, das viel dunkler oder heller ist als seine Umgebung.",
  "The picture shows more than 4 separate things. Use a picture with 4 subjects at most.":
    "Das Bild zeigt mehr als 4 getrennte Dinge. Nimm ein Bild mit höchstens 4 Motiven.",
  "The subject touches the edge of the picture. Leave some background all around it.":
    "Das Motiv berührt den Bildrand. Lass ringsum etwas Hintergrund.",
  "The subject is too small. Get closer, or use a bigger picture.":
    "Das Motiv ist zu klein. Geh näher heran oder nimm ein größeres Bild.",
  "The outline is too jagged to run on roads. Try a simpler subject.":
    "Der Umriss ist zu zackig, um ihn auf Straßen zu laufen. Versuche ein einfacheres Motiv.",
  "This line cannot be added to the outline. Draw it again.":
    "Diese Linie kann dem Umriss nicht hinzugefügt werden. Zeichne sie noch einmal.",
  "This line is too short to add. Draw a longer one.":
    "Diese Linie ist zu kurz. Zeichne eine längere.",
  "This part covers where a detail starts. Undo the detail first, or draw the part elsewhere.":
    "Dieser Teil überdeckt den Anfang eines Details. Mache zuerst das Detail rückgängig oder zeichne den Teil woanders.",
  "That is too much for one route. Undo something, or draw simpler lines.":
    "Das ist zu viel für eine Route. Mache etwas rückgängig oder zeichne einfachere Linien.",
  "Too many requests to the API in the last minute. Wait a minute, then try again.":
    "Zu viele Anfragen in der letzten Minute. Warte eine Minute und versuche es dann noch einmal.",
  "This phone cannot open the share sheet.":
    "Dieses Telefon kann das Teilen-Menü nicht öffnen.",
  "The GPX could not be saved on the phone. Try again.":
    "Die GPX-Datei konnte nicht auf dem Telefon gespeichert werden. Versuche es noch einmal.",
  "This picture is too large: {mb} MB, at most {most} MB. Choose a smaller one.":
    "Dieses Bild ist zu groß: {mb} MB, höchstens {most} MB. Wähle ein kleineres.",
  "The picture could not be opened. Try again, or choose another one.":
    "Das Bild konnte nicht geöffnet werden. Versuche es noch einmal oder wähle ein anderes.",

  // src/route/warnings.ts (TASK-210, «Draw»; the direction is the compass word)
  "The route starts {distance} {direction} of your start, where the shape fits the roads. Go to “Start here”.":
    "Die Route beginnt {distance} in Richtung {direction} von deinem Start, wo die Form auf die Straßen passt. Geh zu „Hier starten“.",
  "There are {distance} of steps along the way.": "Unterwegs sind {distance} Treppen.",
  "{distance} runs along main roads, with traffic.":
    "{distance} verlaufen auf Hauptstraßen, mit Verkehr.",
  "{distance} runs through tunnels.": "{distance} führen durch Tunnel.",
  "About {share}% of the route goes over the same roads twice.":
    "Etwa {share}% der Route führt zweimal über dieselben Straßen.",
  "About {share}% of the route runs alongside itself.":
    "Etwa {share}% der Route verläuft neben sich selbst.",
  "The route is {share}% longer than asked.":
    "Die Route ist {share}% länger als gewünscht.",
  "The route is {share}% shorter than asked.":
    "Die Route ist {share}% kürzer als gewünscht.",
  "The roads here follow the shape only roughly.":
    "Die Straßen hier folgen der Form nur grob.",
  "Few roads here: the route follows the shape loosely.":
    "Wenige Straßen hier: Die Route folgt der Form nur locker.",
  "The nearest road is {distance} away: the route begins there.":
    "Die nächste Straße ist {distance} entfernt: Dort beginnt die Route.",
  "A bit of the shape has no road to follow, so the route skips it.":
    "Ein Stück der Form hat keine Straße, der es folgen kann, und die Route lässt es aus.",

  // src/route/wordInput.ts (TASK-210, «Draw»)
  "Write a word to draw, with the letters A to Z.":
    "Schreib ein Wort zum Zeichnen, mit den Buchstaben A bis Z.",
  "One word only, without spaces.": "Nur ein Wort, ohne Leerzeichen.",
  "No letter “{letter}”: a word can use only the letters A to Z, without accents.":
    "Kein „{letter}“: Ein Wort darf nur die Buchstaben A bis Z haben, ohne Akzente.",
  "At most {most} letters.": "Höchstens {most} Buchstaben.",
  "At most {most} letters: each needs {each} km, and the app goes up to {highest} km.":
    "Höchstens {most} Buchstaben: jeder braucht {each} km, und die App geht bis {highest} km.",
  "“{word}” needs at least {km} km: {each} km for each letter.":
    "„{word}“ braucht mindestens {km} km: {each} km pro Buchstabe.",

  // src/route/ImageChoice.tsx (TASK-210, «Draw»)
  "Choose another": "Ein anderes wählen",
  "Choose picture": "Bild wählen",
  "Take photo": "Foto aufnehmen",
  "Hide the picture": "Bild ausblenden",
  "Show the picture": "Bild einblenden",
  "Edit the outline": "Umriss bearbeiten",
  "One subject on a plain background works best: a drawing, a logo, an object on a bare table. The route follows its outside line. Up to 4 separate subjects are joined in one line.":
    "Am besten ist ein Motiv auf einfarbigem Hintergrund: eine Zeichnung, ein Logo, ein Gegenstand auf einem leeren Tisch. Die Route folgt seiner Außenlinie. Bis zu 4 getrennte Motive werden zu einer Linie verbunden.",
  "Tracing the outline…": "Umriss wird nachgezeichnet…",
  "The yellow line is what the route will draw. If it does not look like the subject, the route will not either: try another picture, or edit the outline. Separate subjects are joined by a short line, which the route runs there and back.":
    "Die gelbe Linie ist das, was die Route zeichnen wird. Sieht sie nicht aus wie das Motiv, wird es die Route auch nicht: Versuche ein anderes Bild oder bearbeite den Umriss. Getrennte Motive werden durch eine kurze Linie verbunden, die die Route hin und zurück läuft.",

  // src/route/OutlineBoard.tsx (TASK-210, «Draw»)
  "Add a part": "Teil hinzufügen",
  "Add a detail": "Detail hinzufügen",
  "Choose what to add. Two fingers zoom and move the picture.":
    "Wähle, was du hinzufügen willst. Zwei Finger zoomen und verschieben das Bild.",
  "Draw a closed shape. Across the yellow line it becomes part of the outline; anywhere else it is joined to the nearest yellow line.":
    "Zeichne eine geschlossene Form. Über der gelben Linie wird sie Teil des Umrisses; überall sonst wird sie mit der nächsten gelben Linie verbunden.",
  "Draw a line anywhere: it is joined to the nearest yellow line, and the route runs along it and back. Close a loop to make an eye.":
    "Zeichne irgendwo eine Linie: Sie wird mit der nächsten gelben Linie verbunden, und die Route läuft sie hin und zurück. Schließe eine Schleife für ein Auge.",
  Fit: "Einpassen",
  "Adding the part…": "Teil wird hinzugefügt…",
  "Adding the detail…": "Detail wird hinzugefügt…",
  Undo: "Rückgängig",

  // src/route/LoadingBar.tsx (TASK-210, «Draw»: what a screen reader hears)
  "Still waiting": "Warte noch",
  "Drawing the route": "Route wird gezeichnet",
  "Reading the shape": "Form wird gelesen",
  "Loading the map": "Karte wird geladen",

  // src/route/DistanceStepper.tsx (TASK-210, «Draw»)
  "Distance in km": "Distanz in km",
  Shorter: "Kürzer",
  Longer: "Länger",

  // src/route/RouteTiles.tsx, ImagePreview.tsx (TASK-210, «Draw»: what a screen reader hears)
  "Route {label}, {distance}, {likeness} like the shape":
    "Route {label}, {distance}, {likeness} wie die Form",
  "The outline traced from the picture": "Der aus dem Bild gezeichnete Umriss",

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
  Mi: "Mi",
  miles: "Meilen",
  "Your first mile will show here.": "Deine erste Meile erscheint hier.",
  "Mile {mile}: {pace}": "Meile {mile}: {pace}",
  "Mile {mile}: {speed} mph": "Meile {mile}: {speed} mph",
  "Your first 500 metres will show here.": "Deine ersten 500 Meter erscheinen hier.",
  "{metres} metres: {pace}": "{metres} Meter: {pace}",

  // src/screens/RunPanel.tsx
  "Speed now": "Geschw.",
  "Avg speed": "Ø Geschw.",
  "Last km": "Letzter km",
  "Last mi": "Letzte mi",
  "Avg /500 m": "Ø /500 m",
  "Last 500 m": "Letzte 500",

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

  // The run: src/screens/{NavigateScreen,FreeRunScreen,RunDashboard,RunPanel,
  // FinishScreen,Countdown,HoldButton,PocketScreen,MapScreen}.tsx and
  // src/navigation/runStats.ts (TASK-210, la corsa)
  "Finding your position…": "Position wird gesucht…",
  "You have arrived.": "Ziel erreicht.",
  "Off the route": "Abseits der Route",
  "Head back to the yellow line.": "Kehre zur gelben Linie zurück.",
  "Follow the route to the end.": "Folge der Route bis zum Ende.",
  "Then {directions}": "Dann {directions}",
  "Heading {direction}": "Richtung {direction}",
  north: "Norden",
  "north-east": "Nordosten",
  east: "Osten",
  "south-east": "Südosten",
  south: "Süden",
  "south-west": "Südwesten",
  west: "Westen",
  "north-west": "Nordwesten",
  "You are at your start": "Du bist am Start",
  "Your start: {distance} in a straight line, to the {direction}":
    "Dein Start: {distance} Luftlinie, Richtung {direction}",
  "Your start, in a straight line": "Dein Start, Luftlinie",
  "Your run": "Dein Lauf",
  "Distance: {distance}": "Distanz: {distance}",
  "Distance: {distance} {units}": "Distanz: {distance} {units}",
  "Keep running": "Weiterlaufen",
  Done: "Fertig",
  "Pocket mode": "Taschenmodus",
  Pocket: "Tasche",
  Finish: "Beenden",
  Stop: "Stopp",
  "Paused: you stopped moving": "Pause: du bist stehen geblieben",
  Paused: "Pause",
  Resume: "Weiter",
  Pause: "Pause",
  Music: "Musik",
  "Opens Spotify": "Öffnet Spotify",
  Map: "Karte",
  Data: "Daten",
  "Auto-pause": "Auto-Pause",
  Voice: "Stimme",
  "Kilometre {km}: {pace}": "Kilometer {km}: {pace}",
  Km: "Km",
  Change: "Änderung",
  "Your first kilometre will show here.": "Dein erster Kilometer erscheint hier.",
  "Pace now": "Tempo jetzt",
  "Avg pace": "Ø Tempo",
  "Elev. gain": "Anstieg",
  Calories: "Kalorien",
  "{minutes} min": "{minutes} Min.",
  "{hours} h {minutes} min": "{hours} Std. {minutes} Min.",
  "about {minutes} min": "etwa {minutes} Min.",
  "about {hours} h {minutes} min": "etwa {hours} Std. {minutes} Min.",
  "Starting in {number}": "Start in {number}",
  "Get ready": "Mach dich bereit",
  "Hold to end the run": "Halten, um den Lauf zu beenden",
  "Hold to stop": "Zum Stoppen halten",
  "The screen goes dark but stays on, so directions go on. Do not lock the phone: if you press the side button, directions stop. To come back, hold the screen for 2 seconds.":
    "Der Bildschirm wird dunkel, bleibt aber an, damit die Ansagen weitergehen. Sperre das Telefon nicht: Drückst du die Seitentaste, stoppen die Ansagen. Zum Zurückkehren den Bildschirm 2 Sekunden lang gedrückt halten.",
  "Go dark": "Abdunkeln",
  "Pocket mode. Hold for 2 seconds to leave.":
    "Taschenmodus. 2 Sekunden halten, um ihn zu verlassen.",
  "Keep holding…": "Weiter halten…",
  "Hold for 2 seconds to leave pocket mode":
    "2 Sekunden halten, um den Taschenmodus zu verlassen",
  // src/permissions/OpenSettings.tsx, src/location/LocationOff.tsx (TASK-259)
  "Open Settings": "Einstellungen öffnen",
  "Location is off": "Standort ist aus",
  "Allow it for Sgrava in Settings to follow the route.":
    "Erlaube ihn für Sgrava in den Einstellungen, um der Route zu folgen.",
  "Allow it for Sgrava in Settings to record your track.":
    "Erlaube ihn für Sgrava in den Einstellungen, um deine Strecke aufzuzeichnen.",
};
