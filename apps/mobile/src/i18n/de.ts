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
  "No activities yet": "Noch keine Aktivitäten",
  "When you finish an activity and save it, you find it here.":
    "Wenn du eine Aktivität beendest und speicherst, findest du sie hier.",
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
  "Edit post": "Beitrag bearbeiten",

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
  "Add a place": "Ort hinzufügen",
  "Preparing the map…": "Karte wird vorbereitet…",
  "Trying again later": "Neuer Versuch später",
  "Up to {count} places.": "Bis zu {count} Orte.",
  "Places you add stay on the phone, so shapes there are drawn faster, even without signal.":
    "Hinzugefügte Orte bleiben auf dem Telefon: Dort werden Formen schneller gezeichnet, auch ohne Empfang.",

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
  "No favorites yet": "Noch keine Favoriten",
  "Tap {heart} on a route on the map to keep it here.":
    "Tippe auf {heart} bei einer Route auf der Karte, um sie hier zu behalten.",

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

  // src/health/HealthRunEnd.tsx (TASK-321: Apple Health and Health Connect)
  "Save to Apple Health": "In Apple Health speichern",
  "Save to Health Connect": "In Health Connect speichern",
  "Your activities also go to the Fitness app, with the route.":
    "Deine Aktivitäten kommen auch in die Fitness-App, mit der Route.",
  "Your activities also go to Health Connect, with the route.":
    "Deine Aktivitäten kommen auch in Health Connect, mit der Route.",
  "Also to Apple Health, with Save.":
    "Mit Speichern geht die Aktivität auch an Apple Health.",
  "Also to Health Connect, with Save.":
    "Mit Speichern geht die Aktivität auch an Health Connect.",
  "MuW can't write to Apple Health. Allow it in the Health app: your profile › Apps › MuW.":
    "MuW kann nicht in Apple Health schreiben. Erlaube es in der Health-App: dein Profil › Apps › MuW.",
  "MuW can't write to Health Connect. Allow it in Health Connect › App permissions › MuW.":
    "MuW kann nicht in Health Connect schreiben. Erlaube es in Health Connect › App-Berechtigungen › MuW.",

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
  Airplane: "Flugzeug",
  Anchor: "Anker",
  "Bear head": "Bärenkopf",
  Bicycle: "Fahrrad",
  Cherries: "Kirschen",
  "Espresso cup": "Espressotasse",
  "Four-leaf clover": "Vierblättriges Kleeblatt",
  "Leaning Tower": "Schiefer Turm",
  "Music note": "Musiknote",
  Pear: "Birne",
  Sailboat: "Segelboot",
  Swan: "Schwan",
  Windmill: "Windmühle",
  "Wine glass": "Weinglas",
  // TASK-516 (ADR-0411)
  Football: "Fußball",
  Bell: "Glocke",
  "Candy cane": "Zuckerstange",
  Colosseum: "Kolosseum",
  Croissant: "Croissant",
  Dolphin: "Delfin",
  Dome: "Kuppel",
  "Easter egg": "Osterei",
  Flower: "Blume",
  "Fox head": "Fuchskopf",
  Gift: "Geschenk",
  Infinity: "Unendlichkeit",
  "Light bulb": "Glühbirne",
  Medal: "Medaille",
  Mountain: "Berg",
  Owl: "Eule",
  Padlock: "Vorhängeschloss",
  "Peace sign": "Friedenszeichen",
  Penguin: "Pinguin",
  "Pizza slice": "Pizzastück",
  "Tennis racket": "Tennisschläger",
  Reindeer: "Rentier",
  "Santa hat": "Weihnachtsmütze",
  Scooter: "Motorroller",
  Snowflake: "Schneeflocke",
  Snowman: "Schneemann",
  "Christmas stocking": "Weihnachtsstrumpf",
  Strawberry: "Erdbeere",
  "Triumphal arch": "Triumphbogen",
  Turtle: "Schildkröte",
  Umbrella: "Regenschirm",

  // src/explore/NearbyTowns.tsx
  "NEARBY TOWNS": "ORTE IN DER NÄHE",
  "{town}, {km} km away": "{town}, {km} km entfernt",
  "{mi} mi away": "{mi} mi entfernt",
  "{town}, {mi} mi away": "{town}, {mi} mi entfernt",

  // src/explore/CityWords.tsx
  WORDS: "WÖRTER",

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
  "Turns the map where you face": "Dreht die Karte in deine Blickrichtung",

  // src/map/MapKindButton.tsx
  "Map type": "Kartentyp",
  Standard: "Standard",
  Satellite: "Satellit",
  "3D": "3D",

  // src/paddle/PaddleExplore.tsx
  Next: "Als Nächstes",
  "Drawing…": "Wird gezeichnet…",
  "Your start": "Dein Start",
  "On the water": "Auf dem Wasser",
  "Shapes to paddle, within 1 km of the shore":
    "Formen zum Paddeln, höchstens 1 km vom Ufer",
  // The swim's (TASK-323 C4).
  "Shapes to swim, within 150 m of the shore":
    "Formen zum Schwimmen, höchstens 150 m vom Ufer",
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
  "Follow the local rules: swimming areas, boat lanes, harbours. MuW does not know them.":
    "Halte dich an die Regeln vor Ort: Badezonen, Fahrrinnen, Häfen. MuW kennt sie nicht.",
  "The route stays within 1 km of the shore. That does not make it safe or allowed.":
    "Die Route bleibt höchstens 1 km vom Ufer entfernt. Das macht sie weder sicher noch erlaubt.",
  "I understand": "Verstanden",
  "Not now": "Nicht jetzt",

  // src/swim/SwimNotice.tsx, src/swim/SwimRouteNote.tsx (TASK-323 C: the swim's
  // notice and the line under every swim, approved by the user in English)
  "Before you swim": "Bevor du schwimmst",
  "Never swim alone. Tow a bright swim buoy and wear a bright cap.":
    "Schwimm nie allein. Zieh eine gut sichtbare Schwimmboje hinter dir her und trag eine auffällige Badekappe.",
  "Check the water, the weather, the flags and the local rules: swimming areas, boat lanes, harbours. MuW does not know them.":
    "Prüf das Wasser, das Wetter, die Flaggen und die Regeln vor Ort: Badezonen, Fahrrinnen, Häfen. MuW kennt sie nicht.",
  "The route stays between 20 and 150 m from the shore. That does not make it safe or allowed.":
    "Die Route bleibt zwischen 20 und 150 m vom Ufer entfernt. Das macht sie weder sicher noch erlaubt.",
  "If you feel tired or cold, head for the shore at once.":
    "Wenn du müde wirst oder frierst, schwimm sofort zum Ufer.",
  "Within 150 m of the shore. Never swim alone.":
    "Höchstens 150 m vom Ufer. Schwimm nie allein.",

  // src/swim/SwimTurns.tsx, src/swim/turns.ts (TASK-323 C: the turns of a
  // swim before «Start», the place's name as OpenStreetMap writes it)
  TURNS: "KURVEN",
  "Turn left": "Nach links",
  "Turn right": "Nach rechts",
  "Turn left · {place}": "Nach links · {place}",
  "Turn right · {place}": "Nach rechts · {place}",
  "{distance} from the start": "{distance} nach dem Start",
  "The same turns every lap, {laps} laps, then back to the shore.":
    "Jede Runde dieselben Kurven, {laps} Runden, dann zurück zum Ufer.",

  // src/swim/SwimResult.tsx, src/route/RoutePanel.tsx, src/settings/sport.ts
  // (TASK-323 C2: the laps of a swim, its size, the way out with the track)
  "Swim without a route": "Ohne Route schwimmen",
  "{count} lap of {distance}": "{count} Runde zu {distance}",
  "{count} laps of {distance}": "{count} Runden zu {distance}",
  "Bigger shape": "Größere Form",
  "Smaller shape": "Kleinere Form",
  "{drawn} km of drawing + {between} km swimming between the parts":
    "{drawn} km Zeichnung + {between} km Schwimmen zwischen den Teilen",
  "{drawn} mi of drawing + {between} mi swimming between the parts":
    "{drawn} mi Zeichnung + {between} mi Schwimmen zwischen den Teilen",

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
  Saved: "Gespeichert",

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
  "Only you see your number. Friends who already have it will be able to find you on MuW.":
    "Nur du siehst deine Nummer. Freunde, die sie schon haben, können dich auf MuW finden.",
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

  // src/screens/SignInScreen.tsx, ForgotPassword.tsx, src/settings/EmailConfirmation.tsx,
  // src/account/accountEmail.ts (TASK-300: the emails of the account)
  "Forgot password?": "Passwort vergessen?",
  "Write the email of your account: we send it a link to choose a new password.":
    "Schreib die E-Mail deines Kontos: Wir schicken einen Link dorthin, um ein neues Passwort zu wählen.",
  "Send the link": "Link senden",
  "If an account has this email, a link is on its way. It works for 1 hour; look in spam too.":
    "Wenn ein Konto diese E-Mail hat, ist ein Link unterwegs. Er gilt 1 Stunde; schau auch im Spam nach.",
  "Back to Log in": "Zurück zu Anmelden",
  "Too many emails asked: wait a few minutes and try again.":
    "Zu viele E-Mails angefordert: Warte ein paar Minuten und versuche es noch einmal.",
  "Email not confirmed": "E-Mail nicht bestätigt",
  "Send the link again": "Link erneut senden",
  "Send again": "Erneut senden",
  "Cancel change": "Änderung abbrechen",
  "Link sent to {email}. Look in spam too.":
    "Link an {email} gesendet. Schau auch im Spam nach.",
  "We sent a link to {email}. Your email changes when you open it.":
    "Wir haben einen Link an {email} gesendet. Deine E-Mail ändert sich, wenn du ihn öffnest.",
  "Waiting for {email}: open the link we sent there.":
    "Warten auf {email}: Öffne den Link, den wir dorthin geschickt haben.",

  // src/settings/NotificationsSetting.tsx, notificationFields.ts
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
  "On the water, the drawing goes where it fits near the start.":
    "Auf dem Wasser kommt die Zeichnung dorthin, wo sie nahe am Start Platz hat.",
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
  "This drawing does not fit on the water near this start. Try a shorter distance, or another start.":
    "Diese Zeichnung passt nahe diesem Start nicht aufs Wasser. Versuch eine kürzere Distanz oder einen anderen Start.",
  "This drawing does not fit on the water here at this distance. It fits at about {km} km.":
    "Diese Zeichnung passt hier bei dieser Distanz nicht aufs Wasser. Sie passt bei etwa {km} km.",
  "This drawing does not fit on the water here at this distance. It fits at about {mi} mi.":
    "Diese Zeichnung passt hier bei dieser Distanz nicht aufs Wasser. Sie passt bei etwa {mi} mi.",
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
  "Choose a start first": "Wähle zuerst einen Start",
  "Choose what to draw first": "Wähle zuerst, was du zeichnest",
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
  "The map service is busy, so this area could not be loaded. Try again in a few minutes.":
    "Der Kartendienst ist gerade ausgelastet, daher konnte dieses Gebiet nicht geladen werden. Versuche es in ein paar Minuten noch einmal.",
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
  // src/route/ImageChoice.tsx (TASK-297 C2: a picture with the pen up)
  "The yellow lines are what the route will draw: each part on its own, going from one to the next without drawing. If they do not look like the subject, the route will not either: try another picture.":
    "Die gelben Linien sind das, was die Route zeichnen wird: jeder Teil für sich, von einem zum nächsten geht es weiter, ohne zu zeichnen. Sehen sie nicht aus wie das Motiv, wird es die Route auch nicht: Versuche ein anderes Bild.",
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

  // src/route/RoutePanel.tsx (TASK-435: the first route is shown, the others are coming)
  "Looking for other routes…": "Weitere Routen werden gesucht…",

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
  "Your first 100 metres will show here.": "Deine ersten 100 Meter erscheinen hier.",
  "{metres} metres: {pace}": "{metres} Meter: {pace}",

  // src/screens/RunPanel.tsx
  "Speed now": "Geschw.",
  "Avg speed": "Ø Geschw.",
  "Last km": "Letzter km",
  "Last mi": "Letzte mi",
  "Avg /500 m": "Ø /500 m",
  "Last 500 m": "Letzte 500",
  // A swim's (TASK-323 D).
  "Avg /100 m": "Ø /100 m",
  "Last 100 m": "Letzte 100",

  // src/screens/FreeRunScreen.tsx, SnowFinishCard.tsx (TASK-375 part C)
  "Your day": "Dein Tag",
  "White: where you skied.": "Weiß: wo du gefahren bist.",
  "Skied: {distance}": "Gefahren: {distance}",
  Descents: "Abfahrten",
  Vertical: "Höhenmeter",
  "Top speed": "Höchsttempo",
  Lifts: "Liftfahrten",

  // src/social/SkiNamesList.tsx (TASK-375 part D)
  "Lifts and pistes": "Lifte und Pisten",
  "{name}, {times} times": "{name}, {times}-mal",
  "{name}, once": "{name}, einmal",

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

  // src/settings/BodySetting.tsx, BodyPage.tsx, src/body/bodyFields.ts (TASK-374)
  Body: "Körper",
  "Not set": "Nicht festgelegt",
  "Used only to estimate your calories and heart rate zones. It stays on this phone.":
    "Wird nur verwendet, um deine Kalorien und Herzfrequenzzonen zu schätzen. Bleibt auf diesem Handy.",
  Sex: "Geschlecht",
  Male: "Männlich",
  Female: "Weiblich",
  "Prefer not to say": "Keine Angabe",
  Weight: "Gewicht",
  Height: "Größe",
  "Year of birth": "Geburtsjahr",
  "Calories are an estimate. Weight matters most.":
    "Kalorien sind eine Schätzung. Am meisten zählt das Gewicht.",
  "Enter a weight between {min} and {max} {unit}.":
    "Gib ein Gewicht zwischen {min} und {max} {unit} ein.",
  "Enter a height between {min} and {max}.":
    "Gib eine Größe zwischen {min} und {max} ein.",
  "Enter a year between {min} and {max}.": "Gib ein Jahr zwischen {min} und {max} ein.",

  // src/settings/HeartZonesPage.tsx, BodyPage.tsx (TASK-374 part B)
  "Heart rate zones": "Herzfrequenzzonen",
  "Max heart rate": "Maximale Herzfrequenz",
  "Estimated from your age": "Aus deinem Alter geschätzt",
  "Set by you": "Von dir festgelegt",
  "Resting heart rate": "Ruheherzfrequenz",
  "Zone 1 Recovery": "Zone 1 Erholung",
  "Zone 2 Endurance": "Zone 2 Grundlage",
  "Zone 3 Tempo": "Zone 3 Tempo",
  "Zone 4 Threshold": "Zone 4 Schwelle",
  "Zone 5 Max": "Zone 5 Maximum",
  "Back to calculated zones": "Zurück zu den berechneten Zonen",
  "Add your year of birth or your max heart rate to see your zones.":
    "Gib dein Geburtsjahr oder deine maximale Herzfrequenz ein, um deine Zonen zu sehen.",
  "Enter a heart rate between {min} and {max} bpm.":
    "Gib eine Herzfrequenz zwischen {min} und {max} bpm ein.",

  // src/settings/ToneSetting.tsx
  Tone: "Darstellung",
  Dark: "Dunkel",
  Light: "Hell",
  Brightness: "Helligkeit",
  "Brightness {step} of {count}": "Helligkeit {step} von {count}",
  Darker: "Dunkler",
  Brighter: "Heller",
  "Preview of the tone": "Vorschau der Darstellung",
  Apply: "Übernehmen",
  "MuW opens again in the new tone.": "MuW öffnet sich neu in der neuen Darstellung.",
  "The phone did not keep the tone. Try again.":
    "Das Handy hat die Darstellung nicht gespeichert. Versuche es noch einmal.",
  "Close MuW and open it again to see the new tone.":
    "Schließe MuW und öffne die App erneut, um die neue Darstellung zu sehen.",

  // src/settings/sport.ts
  "Ride without a route": "Ohne Route fahren",
  "Paddle without a route": "Ohne Route paddeln",
  "Walk without a route": "Ohne Route gehen",
  "Hike without a route": "Ohne Route wandern",
  "Skate without a route": "Ohne Route skaten",
  "Record your day": "Tag aufzeichnen",
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
  "Strava did not let MuW change this activity. Change its text on Strava.":
    "Strava hat MuW diese Aktivität nicht ändern lassen. Ändere den Text auf Strava.",
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
  Reply: "Antworten",
  "Replying to {name}": "Antwort an {name}",
  "View {count} more reply": "{count} weitere Antwort ansehen",
  "View {count} more replies": "{count} weitere Antworten ansehen",

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

  // src/profile/ProfileStats.tsx, src/profile/ProfileGallery.tsx (TASK-324)
  Likes: "Likes",
  Photos: "Fotos",
  "No photos yet.": "Noch keine Fotos.",
  "No photos yet. Add some to a public drawing in My activities.":
    "Noch keine Fotos. Füge in Meine Aktivitäten welche zu einer öffentlichen Zeichnung hinzu.",

  // src/profile/PersonalBests.tsx (TASK-368)
  "Personal bests": "Persönliche Bestzeiten",
  "Half marathon": "Halbmarathon",
  Marathon: "Marathon",

  // src/social/SuperLikeSheet.tsx
  "Super like": "Super-Like",
  "Write a comment to send your super like":
    "Schreib einen Kommentar, um dein Super-Like zu senden",
  Send: "Senden",
  "A super like comes with a comment. Everyone who sees the post can read it.":
    "Ein Super-Like kommt mit einem Kommentar. Alle, die den Beitrag sehen, können ihn lesen.",

  // src/social/reactionKinds.ts
  "MuW heart, super like": "MuW-Herz, Super-Like",
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
  yesterday: "gestern",
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
  "Send the runs you save in MuW to your Strava profile.":
    "Sende die Läufe, die du in MuW speicherst, an dein Strava-Profil.",

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
  "Remember to stretch": "Denk ans Dehnen",
  Stretch: "Dehnen",
  Skip: "Überspringen",
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
  "Show the numbers": "Zahlen zeigen",
  "Hide the numbers": "Zahlen ausblenden",
  Compass: "Kompass",
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
  "Allow it for MuW in Settings to follow the route.":
    "Erlaube ihn für MuW in den Einstellungen, um der Route zu folgen.",
  "Allow it for MuW in Settings to record your track.":
    "Erlaube ihn für MuW in den Einstellungen, um deine Strecke aufzuzeichnen.",
  // src/activities/RunEnd.tsx, src/social/PublicParts.tsx, PublicRow.tsx,
  // DrawingCard.tsx (TASK-208)
  "This run could not be kept on the phone. Try again.":
    "Dieser Lauf konnte nicht auf dem Telefon behalten werden. Versuch es noch einmal.",
  "Save to My activities": "In Meine Aktivitäten speichern",
  Tagged: "Markiert",
  "{name}'s profile": "Profil von {name}",
  "Photo {n}": "Foto {n}",
  "Photos of a run only you can see stay on this phone. Delete the app or change phone and they are gone.":
    "Fotos eines Laufs, den nur du siehst, bleiben auf diesem Telefon. Löschst du die App oder wechselst das Telefon, sind sie weg.",
  "Its photos leave MuW and stay only on this phone.":
    "Seine Fotos verlassen MuW und bleiben nur auf diesem Telefon.",
  "Every member sees it in your profile.": "Jedes Mitglied sieht ihn in deinem Profil.",
  "Your followers see it in your profile.":
    "Deine Follower sehen ihn in deinem Profil.",
  "Saved on the phone. It is sent when you are back online.":
    "Auf dem Telefon gespeichert. Wird gesendet, sobald du wieder online bist.",
  "Saved on the phone. Others see it when you are back online.":
    "Auf dem Telefon gespeichert. Andere sehen ihn, sobald du wieder online bist.",
  Bike: "Rad",
  Paddle: "Paddeln",
  Walk: "Gehen",
  // src/sports/hiking.ts (TASK-377 part B), approved on 2026-11-05
  Hike: "Wandern",
  "Trails can be demanding: check the route and the weather before you set off.":
    "Wege können anspruchsvoll sein: Prüf Route und Wetter, bevor du losgehst.",
  // src/sports/gravel_biking.ts, mountain_biking.ts (TASK-378 part B),
  // approved on 2026-11-05
  Gravel: "Gravel",
  MTB: "MTB",
  "Trails can be technical: check the route before you set off.":
    "Trails können technisch sein: Prüf die Route, bevor du losfährst.",
  // src/sports/inline_skating.ts (TASK-380 part B), approved on 2026-11-06
  Roller: "Inline",
  "Watch for traffic and steep descents: check the route before you set off.":
    "Achte auf Verkehr und steile Abfahrten: Prüf die Route, bevor du losfährst.",
  // src/sports/wheelchair.ts, settings/sport.ts (TASK-414 part B), approved on
  // 2026-11-08 (the user's choice 6)
  "Wheelchair & stroller": "Rollstuhl & Kinderwagen",
  "Go without a route": "Ohne Route los",
  "Map data can miss kerbs, steps and steep slopes: check the route before you set off.":
    "Die Kartendaten zeigen nicht immer Bordsteine, Stufen und steile Steigungen: Prüf die Route, bevor du losgehst.",
  // src/settings/sport.ts, social/PublicParts.tsx (TASK-375: a day on the snow)
  Ski: "Ski",
  "Cross-country ski": "Langlauf",
  // src/sports/gym.ts, src/gym/ (TASK-385 B0: a workout at the gym)
  Gym: "Fitnessstudio",
  // The counts of a workout, one or more (TASK-453)
  "{count} exercise": "{count} Übung",
  "{count} exercises": "{count} Übungen",
  "{count} set": "{count} Satz",
  "{count} sets": "{count} Sätze",
  "{count} rest": "{count} Satzpause",
  "{count} rests": "{count} Satzpausen",
  "avg {time} · {total} resting": "Ø {time} · {total} Pause",
  // src/gym/ (TASK-385 part B), approved on 2026-11-04
  "Start workout": "Training starten",
  "No route in the gym: MuW times your workout.":
    "Im Fitnessstudio keine Route: MuW stoppt dein Training.",
  "+ Exercise": "+ Übung",
  "Search exercises": "Übungen suchen",
  "How to do it": "So geht's",
  "Watch out": "Achtung",
  "Add to workout": "Zum Training hinzufügen",
  "Add “{name}”": "„{name}“ hinzufügen",
  "Set {n}": "Satz {n}",
  Reps: "Wdh.",
  "Added weight": "Zusatzgewicht",
  Incline: "Steigung",
  Level: "Stufe",
  Floors: "Stockwerke",
  "Log set": "Satz eintragen",
  "Same again": "Nochmal gleich",
  // TASK-511: the clock waits for the first exercise; − and + by the boxes
  "Starts with the first exercise": "Startet mit der ersten Übung",
  "Less {field}": "{field}: weniger",
  "More {field}": "{field}: mehr",
  Rest: "Satzpause",
  Custom: "Eigene",
  "Next: {exercise} · set {n}": "Als Nächstes: {exercise} · Satz {n}",
  "Rest over — next set": "Pause vorbei – nächster Satz",
  "Show exercises": "Übungen zeigen",
  "Still training?": "Trainierst du noch?",
  "Yes, keep going": "Ja, weiter",
  "Finish workout": "Training beenden",
  // src/gym/figures.ts, NewLevels.tsx (TASK-385 part E), approved on 2026-11-04
  Mouse: "Maus",
  Rabbit: "Hase",
  Fox: "Fuchs",
  Wolf: "Wolf",
  Bear: "Bär",
  Rhino: "Nashorn",
  Gorilla: "Gorilla",
  "New level: {figure} · {exercise} {value}":
    "Neue Stufe: {figure} · {exercise} {value}",
  // src/gym/Leaderboard.tsx (TASK-385 F)
  "Gym leaderboard · {month}": "Fitness-Rangliste · {month}",
  "Pick an exercise from the grid": "Wähle eine Übung aus dem Raster",
  "Log each set: the rest starts by itself":
    "Trag jeden Satz ein: die Satzpause startet von selbst",
  "«Save»: calories, milestones and leaderboard":
    "«Speichern»: Kalorien, Stufen und Rangliste",
  "Last workout: {when} · {time}": "Letztes Training: {when} · {time}",
  "This month: 1 time": "Diesen Monat: 1 Mal",
  "This month: {n} times": "Diesen Monat: {n} Mal",
  "Gym calendar": "Fitness-Kalender",
  Plans: "Pläne",
  "New plan": "Neuer Plan",
  "Plan name": "Name des Plans",
  Sets: "Sätze",
  "{n} exercises": "{n} Übungen",
  "1 exercise": "1 Übung",
  "Start without the plan": "Ohne Plan starten",
  "Plan: {done}/{total} sets": "Plan: {done}/{total} Sätze",
  "Delete plan": "Plan löschen",
  "Delete “{name}”?": "„{name}“ löschen?",
  Planned: "Geplant",
  "Start “{plan}”": "„{plan}“ starten",
  "{n} plans": "{n} Pläne",
  "1 plan": "1 Plan",
  "Set {n} of {total}": "Satz {n} von {total}",
  "Then: {exercise}": "Danach: {exercise}",
  "{n} times · {time}": "{n} Mal · {time}",
  // src/gym/GymPlanWizard.tsx, GymPlans.tsx, SessionEditor.tsx, proposal.ts (the guided plans, 2026-11-10)
  "Week {n} of {total}": "Woche {n} von {total}",
  "More load each week": "Jede Woche mehr Gewicht",
  "+{kg} kg, the last week lighter to recover":
    "+{kg} kg, die letzte Woche leichter zur Erholung",
  "More reps each week": "Jede Woche mehr Wiederholungen",
  "10, 11, 12, then more kg and back to 10":
    "10, 11, 12, dann mehr kg und zurück auf 10",
  "Weeks A / B in turn": "Wochen A / B im Wechsel",
  "Other exercises every other week": "Andere Übungen jede zweite Woche",
  "Always the same": "Immer gleich",
  "As before: one week that repeats": "Wie bisher: eine Woche, die sich wiederholt",
  "rest {n} min": "Pause {n} Min.",
  "rest {n} s": "Pause {n} s",
  "By hand": "Von Hand",
  Lighter: "Leichter",
  "Base@@week": "Basis",
  "+1 rep": "+1 Wdh.",
  "+{n} reps": "+{n} Wdh.",
  "Every week": "Jede Woche",
  "{goal} · 1 day": "{goal} · 1 Tag",
  "{goal} · {n} days": "{goal} · {n} Tage",
  "Looks good": "Passt so",
  "Save plan": "Plan speichern",
  Continue: "Weiter",
  "Step {n} of {total}": "Schritt {n} von {total}",
  "I'll write the plan myself": "Ich schreibe den Plan selbst",
  "What do you want to achieve?": "Was willst du erreichen?",
  "Sets, reps and rest come from here. You can change them later.":
    "Daraus ergeben sich Sätze, Wiederholungen und Pausen. Du kannst sie später ändern.",
  "to start with": "für den Einstieg",
  "How many days a week?": "Wie viele Tage pro Woche?",
  "How the work is split": "So wird die Arbeit aufgeteilt",
  "Your plan": "Dein Plan",
  "Here is your plan": "Hier ist dein Plan",
  "Add the exercises of each day.": "Füge die Übungen jedes Tages hinzu.",
  "Ready to use. Touch an exercise to change it.":
    "Fertig zum Loslegen. Tippe auf eine Übung, um sie zu ändern.",
  "Workout name": "Name des Trainings",
  "About {n} minutes": "Etwa {n} Minuten",
  "Write the kg at the first workout": "Die kg trägst du beim ersten Training ein",
  "The same week, again and again.": "Dieselbe Woche, immer wieder.",
  "Two weeks in turn, again and again.": "Zwei Wochen im Wechsel, immer wieder.",
  "A cycle of {n} weeks, then again with the new weights.":
    "Ein Zyklus von {n} Wochen, dann von vorn mit den neuen Gewichten.",
  "How do the weeks change?": "Wie ändern sich die Wochen?",
  "Week {n}": "Woche {n}",
  "Wk {n}": "Wo. {n}",
  "Touch a week to change it.": "Tippe auf eine Woche, um sie zu ändern.",
  Weeks: "Wochen",
  "Written by hand.": "Von Hand geschrieben.",
  "Back to the automatic week": "Zurück zur automatischen Woche",
  "Monday {day}": "Montag, {day}.",
  "Today, {day}": "Heute, {day}",
  "+{kg} kg a week · the last one lighter": "+{kg} kg pro Woche · die letzte leichter",
  "A rep more each week": "Jede Woche eine Wiederholung mehr",
  "All set": "Alles bereit",
  "It starts": "Beginn",
  "days a week": "Tage pro Woche",
  week: "Woche",
  weeks: "Wochen",
  exercises: "Übungen",
  "My plans": "Meine Pläne",
  "always the same": "immer gleich",
  "New guided plan": "Neuer geführter Plan",
  "From {day}": "Ab {day}",
  Edit: "Bearbeiten",
  "Move up": "Nach oben",
  "Move down": "Nach unten",
  Swap: "Tauschen",
  "Add exercise": "Übung hinzufügen",
  "More muscle": "Mehr Muskeln",
  "More strength": "Mehr Kraft",
  "Tone up and lose weight": "Straffen und abnehmen",
  "Get back in shape": "Wieder fit werden",
  "Full body A": "Ganzkörper A",
  "Full body B": "Ganzkörper B",
  "Chest, shoulders, triceps": "Brust, Schultern, Trizeps",
  "Back, biceps": "Rücken, Bizeps",
  "Legs, core": "Beine, Bauch",
  "Upper body A": "Oberkörper A",
  "Upper body B": "Oberkörper B",
  "Lower body A": "Unterkörper A",
  "Lower body B": "Unterkörper B",
  "Arms, core": "Arme, Bauch",
  "Workout {letter}": "Training {letter}",
  // src/gym/RunnerStep.tsx, runPace.ts, GymPlanWizard.tsx, GymDrawGuide.tsx (TASK-452, approved 2026-11-11)
  "Pace@@run": "Tempo",
  "Intermediate@@runner": "Fortgeschritten",
  "Expert@@runner": "Erfahren",
  Yes: "Ja",
  "Your runs say {pace}/km over 10 km: update the paces?":
    "Deine Läufe sagen {pace}/km auf 10 km: Tempos aktualisieren?",
  "From your {pace}/km over 10 km and your long run of {long}.":
    "Aus deinem {pace}/km auf 10 km und deinem langen Lauf von {long}.",
  "How do you run today?": "Wie läufst du heute?",
  "Make my paces": "Meine Tempos erstellen",
  "Two answers and the plan's paces are yours.":
    "Zwei Antworten, und die Tempos des Plans sind deine.",
  "Your paces": "Deine Tempos",
  "at {pace}/km": "mit {pace}/km",
  "10 km in {time}": "10 km in {time}",
  "At the end of each cycle": "Am Ende jedes Zyklus",
  "Easy: your pace over 10 km + 1:05. Long: + 1:15. Intervals of 400 m: − 0:25. The long run starts from yours and grows 1 km a week; the easy run is about half of it.":
    "Locker: dein 10-km-Tempo + 1:05. Lang: + 1:15. Intervalle über 400 m: − 0:25. Der lange Lauf beginnt bei deinem und wächst 1 km pro Woche; der lockere ist etwa halb so lang.",
  "How I work them out": "So berechne ich sie",
  "I don't know: I'll pick my level": "Weiß ich nicht: ich wähle mein Niveau",
  "I look at your runs: if you got faster, I propose new paces.":
    "Ich sehe mir deine Läufe an: Bist du schneller geworden, schlage ich neue Tempos vor.",
  "The longest run you do without strain":
    "Der längste Lauf, den du ohne Mühe schaffst",
  "Your long run, today": "Dein langer Lauf, heute",
  "Your pace over 10 km": "Dein Tempo auf 10 km",
  "minutes per km": "Minuten pro km",
  "{n} minutes": "{n} Minuten",
  Beginner: "Einsteiger",
  // src/gym/SportsDoor.tsx, bodyweight.ts, GymPlanWizard.tsx (TASK-461 A2, approved 2026-11-11)
  "What do you want to train?": "Was willst du trainieren?",
  "Choose one or more. Then we guide you in 5 steps.":
    "Wähle eine oder mehrere. Dann führen wir dich in 5 Schritten.",
  // src/gym/PlanTable.tsx (TASK-506 part A: the plan as a table; approved by the user on 2026-11-23)
  Table: "Tabelle",
  "No exercises yet.": "Noch keine Übungen.",
  "Change week {n}": "Woche {n} ändern",
  "kg · touch a week to change it": "kg · tippe auf eine Woche, um sie zu ändern",
  // src/gym/NextWorkout.tsx, GymPlans.tsx (TASK-506 part C: the next workout in «My plans»; approved by the user on 2026-11-23)
  Tomorrow: "Morgen",
  "+ 1 more": "+ 1 weitere",
  "+ {n} more": "+ {n} weitere",
  "This week: {done} of {total} done": "Diese Woche: {done} von {total} erledigt",
  "With weights and machines": "Mit Gewichten und Geräten",
  Bodyweight: "Eigengewicht",
  "At home or in the park, no equipment": "Zu Hause oder im Park, ohne Geräte",
  Mountains: "Berge",
  "Hikes and trips, more climb each week":
    "Wanderungen und Touren, jede Woche mehr Höhenmeter",
  "Next · 1 chosen": "Weiter · 1 gewählt",
  "Next · {n} chosen": "Weiter · {n} gewählt",
  "More each week": "Jede Woche mehr",
  "+1 rep, +5 s held; week {n} lighter":
    "+1 Wiederholung, +5 s beim Halten; Woche {n} leichter",
  "Without weights you grow with reps and seconds.":
    "Ohne Gewichte wächst du mit Wiederholungen und Sekunden.",
  "with the hardest exercises": "mit den schwersten Übungen",
  "What do you have?": "Was hast du zur Verfügung?",
  "A pull-up bar": "Eine Klimmzugstange",
  "Bar and dip bars": "Stange und Barren",
  "With the bar we add pull-ups, with the dip bars the dips.":
    "Mit der Stange kommen Klimmzüge dazu, mit dem Barren Dips.",
  "How many days for each sport?": "Wie viele Tage pro Sportart?",
  "Already spread out, with rest in between. Touch a day to change it.":
    "Schon verteilt, mit Ruhetagen dazwischen. Tippe auf einen Tag, um ihn zu ändern.",
  "The whole body, {n} times a week. Touch an exercise to change it.":
    "Der ganze Körper, {n}-mal pro Woche. Tippe auf eine Übung, um sie zu ändern.",
  "No equipment": "Keine Geräte",
  "A cycle of {n} weeks, then it starts again from where you got to.":
    "Ein Zyklus von {n} Wochen, dann geht es dort weiter, wo du angekommen bist.",
  "{a} and {b}, for example.": "{a} und {b}, zum Beispiel.",
  "Bodyweight · A": "Eigengewicht · A",
  "Bodyweight · B": "Eigengewicht · B",
  // src/gym/outingDay.ts, PlanTodayCard.tsx, TargetSteps.tsx, GymPlanWizard.tsx (TASK-461 B and C, approved 2026-11-11)
  "Long walk": "Lange Wanderung",
  "Long hike": "Lange Wanderung am Berg",
  "Long ride": "Lange Ausfahrt",
  "Long swim": "Langes Schwimmen",
  "Long paddle": "Lange Paddeltour",
  "Easy walk": "Lockere Wanderung",
  "Easy hike": "Lockere Bergwanderung",
  "Easy ride": "Lockere Ausfahrt",
  "Easy swim": "Lockeres Schwimmen",
  "Easy paddle": "Lockeres Paddeln",
  "Bike intervals": "Rad-Intervalle",
  "Swim sets": "Schwimmserien",
  "Paddle intervals": "Paddel-Intervalle",
  "Brisk walk uphill": "Zügiges Gehen bergauf",
  "Brisk walk": "Zügiges Gehen",
  "Climb outing": "Tour bergauf",
  "A ride today marks the day done, even a shorter one.":
    "Eine Ausfahrt heute hakt den Tag ab, auch eine kürzere.",
  "A swim today marks the day done, even a shorter one.":
    "Schwimmen heute hakt den Tag ab, auch kürzer.",
  "A paddle today marks the day done, even a shorter one.":
    "Paddeln heute hakt den Tag ab, auch kürzer.",
  "A hike today marks the day done, even with less climb.":
    "Eine Wanderung heute hakt den Tag ab, auch mit weniger Höhenmetern.",
  "A hike today marks the day done, even a shorter one.":
    "Eine Wanderung heute hakt den Tag ab, auch eine kürzere.",
  "A walk today marks the day done, even a shorter one.":
    "Ein Spaziergang heute hakt den Tag ab, auch ein kürzerer.",
  "Toward {target}, week {n} of {total}.": "Richtung {target}, Woche {n} von {total}.",
  "Go to the day · {amount}": "Zum Tag · {amount}",
  "Look for at least {m} m of climb": "Suche mindestens {m} Höhenmeter",
  "Record freely and see how much climb is left.":
    "Zeichne frei auf und sieh, wie viele Höhenmeter fehlen.",
  "Draw draws the hike with its km ({km}); the climb depends on where you start. Or record freely and see how much climb is left.":
    "Draw zeichnet die Wanderung mit ihren km ({km}); die Höhenmeter hängen vom Start ab. Oder zeichne frei auf und sieh, wie viele fehlen.",
  "Draw the hike · {km}": "Wanderung zeichnen · {km}",
  "Record freely · {amount}": "Frei aufzeichnen · {amount}",
  "Draw draws {max} at most": "Draw zeichnet höchstens {max}",
  "Record freely and see how much is left to {amount}, or draw {max} of shape and do the rest freely.":
    "Zeichne frei auf und sieh, wie viel bis {amount} fehlt, oder zeichne {max} Form und den Rest frei.",
  "Draw {max}": "{max} zeichnen",
  "Record freely": "Frei aufzeichnen",
  "Today: {day}": "Heute: {day}",
  "Already written from your runs: {amount} on {day}.":
    "Schon aus deinen Läufen: {amount} am {day}.",
  "Already written from your walks: {amount} on {day}.":
    "Schon aus deinen Spaziergängen: {amount} am {day}.",
  "Already written from your hikes: {amount} on {day}.":
    "Schon aus deinen Wanderungen: {amount} am {day}.",
  "Already written from your rides: {amount} on {day}.":
    "Schon aus deinen Ausfahrten: {amount} am {day}.",
  "Already written from your swims: {amount} on {day}.":
    "Schon aus deinem Schwimmen: {amount} am {day}.",
  "Already written from your paddles: {amount} on {day}.":
    "Schon aus deinen Paddeltouren: {amount} am {day}.",
  Less: "Weniger",
  "What trip do you want to do?": "Welche Tour willst du machen?",
  "How much climb in one day. The plan takes you there.":
    "Wie viele Höhenmeter an einem Tag. Der Plan bringt dich hin.",
  "Where do you want to get to?": "Wohin willst du kommen?",
  "The distance of the plan's last day.": "Die Distanz des letzten Tages im Plan.",
  Swimming: "Schwimmen",
  Paddling: "Paddeln",
  "Other@@target": "Andere",
  "Of climb uphill. 1000 m is, for example, a hut high above the village.":
    "Höhenmeter bergauf. 1000 m sind zum Beispiel eine Hütte hoch über dem Dorf.",
  "Just keep fit": "Nur fit bleiben",
  "A plan that stays the same, with no target day":
    "Ein Plan, der gleich bleibt, ohne Zieltag",
  "Where do you swim?": "Wo schwimmst du?",
  "How much climb do you do today?": "Wie viele Höhenmeter schaffst du heute?",
  "The most of the last month, in one outing.":
    "Das meiste im letzten Monat, an einem Stück.",
  "Where are you today?": "Wo stehst du heute?",
  "The longest you did in the last month without stopping.":
    "Das Längste im letzten Monat ohne Pause.",
  "I'm starting from zero": "Ich fange bei null an",
  "Starting from 200 m, on easy trails": "Start mit 200 m auf leichten Wegen",
  "Starting with walk-run: 1′ running and 2′ walking":
    "Start mit Gehen-Laufen: 1′ laufen und 2′ gehen",
  "Starting from {amount}": "Start mit {amount}",
  "By when?": "Bis wann?",
  "When I'm ready": "Wenn ich bereit bin",
  "The plan counts the weeks by itself": "Der Plan zählt die Wochen selbst",
  "The plan counts the weeks by itself: {n} weeks":
    "Der Plan zählt die Wochen selbst: {n} Wochen",
  "A date": "Ein Datum",
  "A race, an outing: {day}": "Ein Rennen, eine Tour: {day}",
  "In {have} weeks you get to {reach}.": "In {have} Wochen kommst du auf {reach}.",
  "For {target} you need {needed} weeks, you have {have}.":
    "Für {target} brauchst du {needed} Wochen, du hast {have}.",
  "Get to {reach}": "Auf {reach} kommen",
  "Move the date": "Datum verschieben",
  "At most {n} weeks: choose a nearer date.":
    "Höchstens {n} Wochen: wähle ein näheres Datum.",
  "Toward {target}": "Richtung {target}",
  "{n} weeks. The climb grows by a tenth, every 4th lighter, the last day is the trip.":
    "{n} Wochen. Die Höhenmeter wachsen um ein Zehntel, jede 4. leichter, der letzte Tag ist die Tour.",
  "{n} weeks. The long one grows by a tenth, every 4th lighter, the last day is the race.":
    "{n} Wochen. Die lange Einheit wächst um ein Zehntel, jede 4. leichter, der letzte Tag ist das Rennen.",
  "Weeks: {first} · {second} · {third} … {last}":
    "Wochen: {first} · {second} · {third} … {last}",
  "Toward 5, 10, 21 or 42 km": "Richtung 5, 10, 21 oder 42 km",
  "Walking and hiking": "Gehen und Wandern",
  "Toward 10, 15, 20, 30 km": "Richtung 10, 15, 20, 30 km",
  Cycling: "Radfahren",
  "Road, gravel, MTB · toward 30–150 km": "Straße, Gravel, MTB · Richtung 30–150 km",
  "Swimming and paddling": "Schwimmen und Paddeln",
  "Pool or open water": "Becken oder offenes Wasser",
  "Remind me at 8": "Erinnere mich um 8",
  "Only on the plan's days": "Nur an den Tagen des Plans",
  // src/gym/GymIntroSheet.tsx, GymDrawGuide.tsx (TASK-433 B, approved 2026-11-10)
  "Your plan, step by step": "Dein Plan, Schritt für Schritt",
  "A minute to make it, then it guides you every time.":
    "Eine Minute, um ihn zu erstellen, dann führt er dich jedes Mal.",
  "Choose your goal and days": "Wähle Ziel und Tage",
  "More muscle, more strength, tone up or get back in shape, 2 to 5 days.":
    "Mehr Muskeln, mehr Kraft, straffen oder wieder fit werden, 2 bis 5 Tage.",
  "The plan is ready": "Der Plan ist schon fertig",
  "Exercises, sets and reps proposed: touch an exercise to change it.":
    "Übungen, Sätze und Wiederholungen vorgeschlagen: tippe auf eine Übung, um sie zu ändern.",
  "The weeks change by themselves": "Die Wochen ändern sich von selbst",
  "More load, more reps or weeks A / B. Here you find today's workout.":
    "Mehr Gewicht, mehr Wiederholungen oder Wochen A / B. Hier findest du das heutige Training.",
  "Create my plan": "Meinen Plan erstellen",
  "How plans work": "So funktionieren Pläne",
  // src/gym/RunDayEditor.tsx, runDay.ts, GymPlanWizard.tsx, GymDrawGuide.tsx (TASK-433 C, approved 2026-11-10)
  "Go to the run · {amount}": "Zum Lauf · {amount}",
  "Gym today instead": "Heute lieber Fitnessstudio",
  "And running?": "Und Laufen?",
  No: "Nein",
  "Touch a day to change it: gym, run or rest.":
    "Tippe auf einen Tag, um ihn zu ändern: Studio, Lauf oder Pause.",
  "Your week": "Deine Woche",
  "How much": "Wie viel",
  "The same every week.": "Jede Woche gleich.",
  "Which run": "Welcher Lauf",
  "With the weeks": "Mit den Wochen",
  minutes: "Minuten",
  "{values}; week {n}: {last} to recover": "{values}; Woche {n}: {last} zur Erholung",
  "Easy run": "Lockerer Lauf",
  Intervals: "Intervalle",
  "Easy, at a pace you can talk at.":
    "Locker, in einem Tempo, bei dem du noch reden kannst.",
  "Easy@@run": "Locker",
  "Fast stretches with a slow jog between.":
    "Schnelle Abschnitte mit lockerem Traben dazwischen.",
  "Long@@run": "Lang",
  "Longer than the others, slowly.": "Länger als die anderen, langsam.",
  "easy, you can talk": "locker, du kannst reden",
  "fast + recovery": "schnell + Erholung",
  "more km, slowly": "mehr km, langsam",
  Workout: "Training",
  "Only sets logged live count.": "Es zählen nur live eingetragene Sätze.",
  // src/screens/ChooseScreen.tsx (TASK-375)
  "No shapes on the slopes: MuW records your day.":
    "Keine Formen auf der Piste: MuW zeichnet deinen Tag auf.",
  Title: "Titel",
  "Give it a name": "Gib ihm einen Namen",
  "How did it go?": "Wie war's?",
  Activity: "Aktivität",
  Everyone: "Alle",
  "Only me": "Nur ich",
  "Who can see it": "Wer kann es sehen",
  "Tag people": "Personen markieren",
  "Remove photo {n}": "Foto {n} entfernen",
  "Add photo": "Foto hinzufügen",
  "This photo could not be kept on the phone. Try again.":
    "Dieses Foto konnte nicht auf dem Telefon behalten werden. Versuch es noch einmal.",

  // «Explore»: src/explore/* (TASK-210, parte C)
  "ASK FOR A ROUTE": "ROUTE ANFRAGEN",
  "A shape through real places {place}. Tap one to make it.":
    "Eine Form durch echte Orte {place}. Tippe auf eine, um sie zu machen.",
  Food: "Essen",
  "Famous Places": "Berühmte Orte",
  Romantic: "Romantisch",
  "Best Views": "Beste Aussichten",
  Shopping: "Shopping",
  Culture: "Kultur",
  Nightlife: "Nachtleben",
  "Hidden Gems": "Geheimtipps",
  Running: "Laufen",
  Walking: "Spazieren",
  Family: "Familie",
  Photography: "Fotografie",
  "Local Experience": "Lokales Leben",
  "More categories": "Weitere Kategorien",
  "More…": "Mehr…",
  "{count} more": "{count} weitere",
  "OR IN YOUR WORDS": "ODER IN DEINEN WORTEN",
  "From {where}. Name a city in the words to go elsewhere.":
    "Los geht es {where}. Nenne eine Stadt in den Worten, um woanders hinzugehen.",
  "Make my route": "Meine Route erstellen",
  "EXAMPLES IN {city}": "BEISPIELE IN {city}",
  "No recommended routes here yet: shapes of {distance} from the centre, drawn now.":
    "Hier gibt es noch keine empfohlenen Routen: Formen von {distance} ab dem Zentrum, jetzt gezeichnet.",
  "Three first, more while you choose.": "Erst drei, weitere während du wählst.",
  "Starting within {distance} of {place}": "Start innerhalb von {distance} um {place}",
  "your start": "deinen Start",
  "Loading routes…": "Routen werden geladen…",
  "Choose a start first: the routes are the ones near it.":
    "Wähle zuerst einen Start: die Routen sind die in seiner Nähe.",
  "The routes could not load. Check the connection and try again.":
    "Die Routen konnten nicht geladen werden. Prüfe die Verbindung und versuche es noch einmal.",
  // src/explore/IdeasFromEurope.tsx, themedIdeas.ts, ThemedCard.tsx: our ideas
  "IDEAS FROM EUROPE": "IDEEN AUS EUROPA",
  "Make it near me": "In meiner Nähe machen",
  Rome: "Rom",
  Paris: "Paris",
  London: "London",
  Barcelona: "Barcelona",
  Amsterdam: "Amsterdam",
  Lisbon: "Lissabon",
  Prague: "Prag",
  Berlin: "Berlin",
  // src/explore/presets.ts: the cities to tap in «Explore» (TASK-508)
  "New York": "New York",
  Tokyo: "Tokio",
  Milan: "Mailand",
  Torino: "Turin",
  Dubai: "Dubai",
  Sydney: "Sydney",
  "San Francisco": "San Francisco",
  "Getting directions…": "Wegbeschreibung wird geholt…",
  CITY: "STADT",
  "Type a city or a place": "Stadt oder Ort eingeben",
  "No city or place matches “{typed}”.": "Keine Stadt und kein Ort passt zu „{typed}“.",
  "The search did not answer. Try again.":
    "Die Suche hat nicht geantwortet. Versuche es noch einmal.",
  "A city you chose before": "Eine zuvor gewählte Stadt",
  "The routes near your start": "Die Routen nahe deinem Start",
  "{title} · {city} · looks {percent}% like it":
    "{title} · {city} · {percent}% Ähnlichkeit",
  "Loading the route…": "Route wird geladen…",
  "The route could not load. Try again.":
    "Die Route konnte nicht geladen werden. Versuche es noch einmal.",
  "Drawing a {distance} {title}…": "{title} über {distance} wird gezeichnet…",
  "The GPX could not be made. Try again.":
    "Das GPX konnte nicht erstellt werden. Versuche es noch einmal.",
  "It passes by none of the {found} {theme} found: the shape did not fit near them.":
    "Sie führt an keinem der {found} gefundenen {theme} vorbei: die Form passte nicht in ihre Nähe.",
  "Passes by {passed} of the {found} {theme} found:":
    "Führt an {passed} der {found} gefundenen {theme} vorbei:",
  "Back to Explore": "Zurück zu Explore",
  "MEANWHILE, FROM THE FEED": "INZWISCHEN, AUS DEM FEED",
  "The first time in a city the map has to download: it can take a minute. The shapes show up above as they are ready.":
    "Beim ersten Mal in einer Stadt muss die Karte geladen werden: das kann eine Minute dauern. Die Formen erscheinen oben, sobald sie fertig sind.",
  "The shapes of this city are ready above.":
    "Die Formen dieser Stadt sind oben fertig.",
  "Maps: {credit}": "Karten: {credit}",
  "City centre": "Stadtzentrum",
  "The API did not answer. Check the connection and try again.":
    "Der Server hat nicht geantwortet. Prüfe die Verbindung und versuche es noch einmal.",
  "The map of this area could not be loaded for directions. Try again later.":
    "Die Karte dieser Gegend konnte für die Wegbeschreibung nicht geladen werden. Versuche es später noch einmal.",
  "This route is not on the map the API has: it has no directions.":
    "Diese Route ist nicht auf der Karte des Servers: sie hat keine Wegbeschreibung.",
  "The directions could not be found. Try again.":
    "Die Wegbeschreibung wurde nicht gefunden. Versuche es noch einmal.",
  "The API answered without directions. It may be out of date.":
    "Der Server hat ohne Wegbeschreibung geantwortet. Er ist vielleicht veraltet.",
  "near your start": "in deiner Nähe",
  "near {place}": "nahe {place}",
  "in {city}": "in {city}",
  "e.g. a romantic heart, famous places, food 8 km":
    "z. B. ein romantisches Herz, berühmte Orte, Essen 8 km",
  "e.g. a romantic heart in {city}, 8 km":
    "z. B. ein romantisches Herz in {city}, 8 km",
  // «Sport»: src/settings/{SportSetting,SportButton}.tsx, sport.ts, and the voice
  // of «Data»: src/voice/VoiceSetting.tsx (TASK-210, parte E)
  SPORT: "SPORT",
  Soon: "Demnächst",
  "{sport}, coming soon": "{sport}, demnächst verfügbar",
  "Sport, {sport}": "Sport, {sport}",
  "Changes the sport": "Ändert die Sportart",
  // The families of the sport panel: src/settings/sportFamilies.ts
  "On foot": "Zu Fuß",
  "On wheels": "Auf Rädern",
  "Other@@sport": "Weitere",
  Sport: "Sport",
  Default: "Standard",
  "Voice language and voice: {language}, {voice}":
    "Sprache und Stimme: {language}, {voice}",
  "Changes the language and the voice": "Ändert Sprache und Stimme",
  Listen: "Anhören",
  "Says a turn with this voice": "Sagt eine Abbiegung mit dieser Stimme an",
  "Turn on Voice to listen": "Schalte „Stimme“ ein, um zuzuhören",
  "App language": "Sprache der App",
  "This phone did not list its voices: its own voice speaks.":
    "Dieses Handy hat seine Stimmen nicht aufgelistet: Es spricht seine eigene Stimme.",
  "This phone has no {language} voice: the voice speaks English.":
    "Dieses Handy hat keine Stimme für {language}: Die Stimme spricht Englisch.",
  "{language} · Enhanced": "{language} · Erweitert",

  // The titles of the three pages: src/screens/pageTitles.ts (TASK-210, parte G)
  Feed: "Feed",
  Draw: "Zeichnen",
  Explore: "Entdecken",

  // src/feed/FeedPost.tsx (TASK-118: a member's drawing without a place)
  "{user}: {title}. {facts}.": "{user}: {title}. {facts}.",

  // The shapes' names, the map and «Explore»: src/route/shapeWords.ts,
  // src/map/mapPage.ts, src/explore/{ExploreScreen,ThemedCard}.tsx
  // (TASK-210, parte F)
  "{list} or {last}": "{list} oder {last}",
  "Start here": "Hier starten",
  "NEAR {city}": "IN DER NÄHE VON {city}",
  here: "hier",

  // src/explore/RecommendedRow.tsx (TASK-092)
  RECOMMENDED: "EMPFOHLEN",

  // src/social/ReportMenu.tsx, BlockedPeople.tsx (TASK-121: report and block)
  More: "Mehr",
  "Report or block": "Melden oder blockieren",
  Report: "Melden",
  "Block {user}": "{user} blockieren",
  "Why are you reporting this?": "Warum meldest du das?",
  Spam: "Spam",
  "Offensive or hateful": "Beleidigend oder hasserfüllt",
  "Harassment or bullying": "Belästigung oder Mobbing",
  "Nudity or sexual content": "Nacktheit oder sexuelle Inhalte",
  "Something else": "Etwas anderes",
  "Thanks for telling us. We will look at it.":
    "Danke für den Hinweis. Wir sehen es uns an.",
  "Block {user}?": "{user} blockieren?",
  "You will not see each other's drawings, comments, messages or profile, any follow between you ends and your conversation is deleted. They are not told.":
    "Ihr seht gegenseitig keine Zeichnungen, Kommentare, Nachrichten oder Profile mehr, jedes Folgen zwischen euch endet und eure Unterhaltung wird gelöscht. Die Person erfährt es nicht.",
  Block: "Blockieren",
  "Sending…": "Wird gesendet…",
  "This is not available any more.": "Das ist nicht mehr verfügbar.",
  "Blocked people": "Blockierte Personen",
  "You have not blocked anyone.": "Du hast niemanden blockiert.",
  Unblock: "Freigeben",
  "Unblock {name}": "{name} freigeben",
  "You blocked {user}. Unblock them from Blocked people in Settings.":
    "Du hast {user} blockiert. Freigeben kannst du unter Blockierte Personen in den Einstellungen.",

  // src/settings/NotificationsSetting.tsx, notificationFields.ts (TASK-262: push sent)
  "Push notifications tell you at once about follow requests, reactions, comments and tags. Email notifications sends the same news in one email a day at most. Email when I'm away: one email if you don't open MuW for 2 weeks.":
    "Push-Benachrichtigungen melden dir Folgeanfragen, Reaktionen, Kommentare und Markierungen sofort. E-Mail-Benachrichtigungen schicken dieselben Neuigkeiten in höchstens einer E-Mail am Tag. E-Mail, wenn ich weg bin: eine E-Mail, wenn du MuW 2 Wochen lang nicht öffnest.",
  "Push notifications are off. Tap to turn them on.":
    "Push-Benachrichtigungen sind aus. Tippe, um sie einzuschalten.",
  "Notifications are off for MuW on this phone. Allow them in Settings to turn this on.":
    "Mitteilungen für MuW sind auf diesem Telefon aus. Erlaube sie in den Einstellungen, um sie einzuschalten.",

  // src/paddle/PaddleExplore.tsx (TASK-269)
  Lakes: "Seen",
  Sea: "Meer",
  "Suggested near {place}": "Vorschläge in der Nähe von {place}",
  "Suggested near where you usually start":
    "Vorschläge in der Nähe deines üblichen Starts",
  "Suggested near your start": "Vorschläge in der Nähe deines Starts",

  // src/stretch (TASK-285 part B)
  "Quad stretch": "Quadrizeps dehnen",
  "Stand tall. Pull one heel toward your glutes, knees together.":
    "Aufrecht stehen. Eine Ferse zum Gesäß ziehen, Knie zusammen.",
  "Hamstring stretch": "Hintere Oberschenkel dehnen",
  "Put one heel forward, toes up. Lean from the hips, back straight.":
    "Eine Ferse nach vorn, Zehen hoch. Aus der Hüfte beugen, Rücken gerade.",
  "Calf stretch": "Wade dehnen",
  "Step back, heel down. Lean toward the wall until the calf pulls.":
    "Einen Schritt zurück, Ferse am Boden. Zur Wand lehnen, bis die Wade zieht.",
  "Hip flexor stretch": "Hüftbeuger dehnen",
  "Kneel on one knee. Push your hips forward, chest up.":
    "Auf ein Knie gehen. Hüfte nach vorn schieben, Brust hoch.",
  "Glute stretch": "Gesäß dehnen",
  "Cross one ankle over the other knee. Sit back as if into a chair.":
    "Einen Knöchel aufs andere Knie legen. Zurücksetzen wie auf einen Stuhl.",
  // src/stretch, the routines (TASK-466 part B)
  "Neck stretch": "Nacken dehnen",
  "Stand tall. Let your chin drop toward your chest, shoulders low.":
    "Aufrecht stehen. Das Kinn zur Brust sinken lassen, Schultern locker.",
  "Overhead reach": "Nach oben strecken",
  "Reach both arms up high. Grow tall, chest open.":
    "Beide Arme hoch strecken. Lang machen, Brust offen.",
  "Shoulder stretch": "Schulter dehnen",
  "Bring one arm across your chest. Pull it in with the other hand.":
    "Einen Arm vor die Brust führen. Mit der anderen Hand heranziehen.",
  "Chest opener": "Brust öffnen",
  "Clasp your hands behind your back. Lift them a little, chest out.":
    "Hände hinter dem Rücken verschränken. Leicht anheben, Brust raus.",
  "Triceps stretch": "Trizeps dehnen",
  "Raise one elbow, hand down your back. Press the elbow back gently.":
    "Einen Ellbogen heben, die Hand zum Rücken. Den Ellbogen sanft nach hinten drücken.",
  "Upper back stretch": "Oberen Rücken dehnen",
  "Reach your arms forward, hands together. Round your back, head down.":
    "Arme nach vorn strecken, Hände zusammen. Rücken rund machen, Kopf runter.",
  "Forward fold": "Vorbeuge",
  "Fold forward from the hips. Let your arms hang, knees soft.":
    "Aus der Hüfte nach vorn beugen. Arme hängen lassen, Knie locker.",
  "Cat stretch": "Katzenbuckel",
  "On hands and knees. Round your back up, let your head drop.":
    "Auf Händen und Knien. Rücken nach oben rund machen, Kopf hängen lassen.",
  "Child's pose": "Kindhaltung",
  "Sit back on your heels. Reach your arms forward, forehead down.":
    "Auf die Fersen setzen. Arme nach vorn strecken, Stirn nach unten.",
  "Knee hug": "Knie zur Brust",
  "Stand on one leg. Hug the other knee to your chest.":
    "Auf einem Bein stehen. Das andere Knie an die Brust ziehen.",
  // src/stretch, the new exercises (TASK-520 part B)
  "Thread the needle": "Nadelöhr",
  "On all fours, slide one arm under your body. Rest your shoulder down.":
    "Im Vierfüßlerstand einen Arm unter dem Körper durchschieben. Die Schulter ablegen.",
  "Side child's pose": "Kindhaltung zur Seite",
  "From child's pose, walk both hands to one side. Breathe into your ribs.":
    "Aus der Kindhaltung beide Hände zu einer Seite wandern lassen. In die Rippen atmen.",
  "Wrist stretch, palm up": "Handgelenk dehnen, Handfläche oben",
  "Arm straight, palm up. Gently pull your fingers back with the other hand.":
    "Arm gestreckt, Handfläche nach oben. Mit der anderen Hand die Finger sanft zurückziehen.",
  "Wrist stretch, palm down": "Handgelenk dehnen, Handfläche unten",
  "Arm straight, palm down. Gently press the back of your hand toward you.":
    "Arm gestreckt, Handfläche nach unten. Den Handrücken sanft zu sich drücken.",
  "Biceps stretch": "Bizeps dehnen",
  "Palm on a wall behind you, arm straight. Turn your chest away.":
    "Handfläche hinter sich an die Wand, Arm gestreckt. Die Brust wegdrehen.",
  "Doorway chest stretch": "Brust dehnen am Türrahmen",
  "Forearm on a door frame, elbow at shoulder height. Step through gently.":
    "Unterarm an den Türrahmen, Ellbogen auf Schulterhöhe. Sanft einen Schritt hindurch machen.",
  Sphinx: "Sphinx",
  "Lie on your belly, forearms down. Lift your chest gently.":
    "Auf den Bauch legen, Unterarme am Boden. Die Brust sanft anheben.",
  "Seated twist": "Drehsitz",
  "Sit tall, one knee bent over the other leg. Turn toward the bent knee.":
    "Aufrecht sitzen, ein Knie über das andere Bein gestellt. Zum gebeugten Knie drehen.",
  "Lizard lunge": "Eidechse",
  "From a low lunge, both hands inside your front foot. Sink your hips.":
    "Aus dem tiefen Ausfallschritt beide Hände innen neben den vorderen Fuß. Die Hüfte sinken lassen.",
  "Deep squat": "Tiefe Hocke",
  "Feet wide, sink low, heels down. Elbows press your knees open.":
    "Füße weit, tief sinken, Fersen am Boden. Die Ellbogen drücken die Knie nach außen.",
  "Seated figure four": "Vier im Sitzen",
  "Sit on a chair, ankle over the other knee. Lean forward, back long.":
    "Auf einem Stuhl sitzen, einen Knöchel über das andere Knie. Nach vorn lehnen, Rücken lang.",
  "Bent-knee calf stretch": "Wade dehnen mit gebeugtem Knie",
  "Step back, bend both knees. Keep the back heel down.":
    "Einen Schritt zurück, beide Knie beugen. Die hintere Ferse am Boden lassen.",
  "90/90 hips": "90/90-Hüftsitz",
  "Sit with both knees bent at right angles, one in front, one to the side. Sit tall.":
    "Mit beiden Knien im rechten Winkel sitzen, eines vorn, eines seitlich. Aufrecht sitzen.",
  "Figure four": "Liegende Vier",
  "On your back, ankle over the other knee. Pull that thigh toward you.":
    "Auf dem Rücken, einen Knöchel über das andere Knie. Diesen Oberschenkel zu sich ziehen.",
  Pigeon: "Taube",
  "Front shin across your mat, back leg long. Fold forward over it.":
    "Das vordere Schienbein quer auf die Matte, das hintere Bein lang. Darüber nach vorn beugen.",
  "Seated forward fold": "Vorbeuge im Sitzen",
  "Sit with legs straight. Fold forward from your hips, back long.":
    "Mit gestreckten Beinen sitzen. Aus der Hüfte nach vorn beugen, Rücken lang.",
  "Lying hamstring stretch": "Hintere Oberschenkel dehnen im Liegen",
  "On your back, raise one straight leg. Hold behind your thigh.":
    "Auf dem Rücken ein gestrecktes Bein heben. Hinter dem Oberschenkel halten.",
  "Side-lying quad": "Quadrizeps dehnen in Seitenlage",
  "Lie on your side. Pull your top heel toward your glutes.":
    "Auf die Seite legen. Die obere Ferse zum Gesäß ziehen.",
  "Half split": "Halber Spagat",
  "Kneel, front leg straight, toes up. Fold over it with a long back.":
    "Knien, vorderes Bein gestreckt, Zehen hoch. Mit langem Rücken darüber beugen.",
  "Toe stretch": "Zehen dehnen",
  "Kneel with your toes tucked under. Sit back gently on your heels.":
    "Knien, die Zehen aufgestellt. Sanft auf die Fersen zurücksetzen.",
  "Shin stretch": "Schienbein dehnen",
  "Kneel with the tops of your feet flat. Sit back on your heels.":
    "Knien, die Fußrücken flach am Boden. Auf die Fersen zurücksetzen.",
  "Downward dog": "Herabschauender Hund",
  "Hands and feet down, hips high. Press your heels toward the floor.":
    "Hände und Füße am Boden, Hüfte hoch. Die Fersen zum Boden drücken.",
  "Legs up the wall": "Beine an die Wand",
  "Lie down with your legs resting up a wall. Arms relaxed.":
    "Hinlegen, die Beine an einer Wand hochgelegt. Arme entspannt.",
  "Resting breath": "Ruheatmung",
  "Lie on your back, eyes closed. Breathe slowly into your belly.":
    "Auf den Rücken legen, Augen zu. Langsam in den Bauch atmen.",
  // end of TASK-520 part B
  Morning: "Morgens",
  "After run": "Nach dem Laufen",
  "After gym": "Nach dem Fitnessstudio",
  "How long?": "Wie lange?",
  // «Morning stretch» in «Settings» and its reminder (TASK-466 part D).
  "Morning stretch": "Dehnen am Morgen",
  "{minutes} minutes to wake up your body. Tap to start.":
    "{minutes} Minuten, um deinen Körper zu wecken. Tippe zum Starten.",
  "MuW can't read your phone's alarm. Set here the time it rings: {minutes} minutes later a reminder opens your Morning routine.":
    "MuW kann den Wecker deines Handys nicht lesen. Stell hier die Zeit ein, zu der er klingelt: {minutes} Minuten später öffnet eine Erinnerung deine Morgenroutine.",
  "Alarm time": "Weckzeit",
  Length: "Dauer",
  Hour: "Stunde",
  Minutes: "Minuten",
  "{index} of {total}": "{index} von {total}",
  "Right side": "Rechte Seite",
  "Left side": "Linke Seite",
  "Switch sides": "Seite wechseln",
  End: "Beenden",
  "Next: {exercise}": "Als Nächstes: {exercise}",
  "{seconds} seconds left": "Noch {seconds} Sekunden",
  "Stop if it hurts.": "Hör auf, wenn es wehtut.",
  // «Draw»: src/route/samplePictures.ts (TASK-280)
  "Running shoe": "Laufschuh",
  Dinosaur: "Dinosaurier",
  Guitar: "Gitarre",
  "Eiffel Tower": "Eiffelturm",
  Rocket: "Rakete",
  Plane: "Flugzeug",
  Balloon: "Luftballon",
  Leaf: "Blatt",
  Mushroom: "Pilz",
  Car: "Auto",
  "T-shirt": "T-Shirt",
  Boot: "Stiefel",
  House: "Haus",
  Duck: "Ente",
  Trophy: "Pokal",
  Bone: "Knochen",

  // src/route/RoutePanel.tsx (TASK-340: first in «Draw», it opens the map
  // to draw on)
  Freehand: "Freihand",
  // src/mapdraw/DrawOnMap.tsx (TASK-281)
  Move: "Verschieben",
  "Draw with one finger. End where you started to close it. Two fingers move the map.":
    "Zeichne mit einem Finger. Ende, wo du begonnen hast, um sie zu schließen. Zwei Finger bewegen die Karte.",
  "Each new line joins the drawing. Two fingers move the map.":
    "Jede neue Linie wird mit der Zeichnung verbunden. Zwei Finger bewegen die Karte.",
  "Drag the figure or the map. Hold a line still, then drag to bend it. Two fingers resize and turn it.":
    "Ziehe die Figur oder die Karte. Halte eine Linie still und ziehe dann, um sie zu biegen. Zwei Finger ändern die Größe und drehen sie.",
  // src/mapdraw/DrawOnMap.tsx (TASK-402)
  "Turn left 15 degrees": "Um 15 Grad nach links drehen",
  "Turn right 15 degrees": "Um 15 Grad nach rechts drehen",
  "Angle, {deg} degrees. Double tap to type it":
    "Winkel, {deg} Grad. Zum Eingeben doppeltippen",
  // src/mapdraw/DrawOnMap.tsx (TASK-402 part B)
  "Change@@piece": "Ändern",
  "Tap a piece to choose it, then drag, resize or turn it. Tap outside to take them all.":
    "Tippe auf ein Teil, um es auszuwählen, dann zieh, vergrößere oder drehe es. Tippe daneben, um alle zu nehmen.",
  "Delete piece": "Teil löschen",
  "Up to 6 pieces in one drawing.": "Höchstens 6 Teile in einer Zeichnung.",
  Line: "Linie",
  "Tap point after point. Tap the first point to close it, the last one to finish.":
    "Tippe Punkt für Punkt. Tippe auf den ersten Punkt, um sie zu schließen, auf den letzten, um fertig zu sein.",
  "The outline cannot cross itself. Bend it less.":
    "Der Umriss darf sich nicht kreuzen. Biege ihn weniger.",
  Redo: "Wiederholen",
  "Clear all": "Alles löschen",
  "Clear the whole drawing?": "Die ganze Zeichnung löschen?",
  "+ photo": "+ Foto",

  // src/screens/ChooseScreen.tsx, src/location/PickStart.tsx (TASK-292)
  "Choose on the map": "Auf der Karte wählen",
  "Move the map to put the pin where you want to start.":
    "Verschiebe die Karte, bis die Nadel dort ist, wo du starten willst.",

  // src/share/SharePost.tsx, src/share/videoFile.ts (TASK-295)
  "Export video": "Video exportieren",
  "Making the video… {percent}%": "Video wird erstellt… {percent} %",
  "This phone cannot make the video.": "Dieses Telefon kann das Video nicht erstellen.",
  "The video could not be made. Try again.":
    "Das Video konnte nicht erstellt werden. Versuch es noch einmal.",

  // src/screens/pageTitles.ts, src/game/ (TASK-296: the shape game, «Play»)
  Play: "Spielen",
  "{distance} in total": "{distance} insgesamt",
  "{distance} under {pace}": "{distance} unter {pace}",
  "Best {best} · target {target}": "Beste {best} · Ziel {target}",
  "Longest run {distance}": "Längster Lauf {distance}",
  "Unlocked {date}": "Freigeschaltet {date}",
  "Sign in to collect shapes.": "Melde dich an, um Formen zu sammeln.",
  "{distance} counted so far": "{distance} bisher gezählt",
  "The game is not available right now.": "Das Spiel ist gerade nicht verfügbar.",
  "New shape unlocked": "Neue Form freigeschaltet",
  "New shape unlocked: {name}": "Neue Form freigeschaltet: {name}",
  "It is in your collection.": "Sie ist in deiner Sammlung.",
  "See collection": "Sammlung ansehen",
  // src/game/ (TASK-423 part D: the collections, the personal challenges,
  // the streak, the one list of «Challenges»)
  "One run of {distance}": "Ein Lauf über {distance}",
  "{name}, {unlocked} of {total} shapes": "{name}, {unlocked} von {total} Formen",
  "{unlocked} of {total} shapes": "{unlocked} von {total} Formen",
  "In progress": "Laufend",
  Available: "Verfügbar",
  Finished: "Beendet",
  "Nothing in progress.": "Gerade läuft nichts.",
  "Nothing finished yet.": "Noch nichts beendet.",
  "This week": "Diese Woche",
  "This month": "Dieser Monat",
  "Shape completed": "Form vollständig",
  "Past monthly challenges": "Frühere Herausforderungen des Monats",
  "Themes and winners of the past months": "Themen und Gewinner der letzten Monate",
  "Other shapes": "Weitere Formen",
  Streak: "Serie",
  "{count} outing a week": "{count} Aktivität pro Woche",
  "{count} outings a week": "{count} Aktivitäten pro Woche",
  "{count} week": "{count} Woche",
  "{count} weeks": "{count} Wochen",
  "best {best}": "Bestwert {best}",
  "Kilometres this week": "Kilometer der Woche",
  "Active days": "Aktive Tage",
  "Long outings": "Lange Aktivitäten",
  "Early bird": "Frühaufsteher",
  Weekend: "Wochenende",
  "Evening outings": "Am Abend",
  "5 km pace": "5-km-Tempo",
  "Long run": "Langer Lauf",
  "Fast kilometre": "Schneller Kilometer",
  "10 km pace": "10-km-Tempo",
  Double: "Doppelpack",
  "Kilometres this month": "Kilometer des Monats",
  "Long outings of the month": "Lange Aktivitäten im Monat",
  "Active days of the month": "Aktive Tage im Monat",
  "Early riser": "Morgenmensch",
  "Kilometres counted": "Gezählte Kilometer",
  "Days with an outing": "Tage mit einer Aktivität",
  "Outings of {distance} or more": "Aktivitäten ab {distance}",
  "Outings started before 8 am": "Vor 8 Uhr begonnene Aktivitäten",
  "Outings started after 7 pm": "Nach 19 Uhr begonnene Aktivitäten",
  "Kilometres on Saturday and Sunday": "Kilometer am Samstag und Sonntag",
  "{distance} in one run, under the pace": "{distance} am Stück, unter dem Tempo",
  "One outing of the distance": "Eine Aktivität über die Strecke",
  "Runs of {distance} or more": "Läufe ab {distance}",
  Bronze: "Bronze",
  Silver: "Silber",
  Gold: "Gold",
  "No run of {distance} yet": "Noch kein Lauf über {distance}",
  "Week of {date}": "Woche ab {date}",
  "Month of {date}": "Monat ab {date}",
  // src/game/goalText.ts, shapeProgress.ts (TASK-423 after use: the names
  // of the distances, the bar of a pace)
  "1 mile": "1 Meile",
  "One half marathon": "Ein Halbmarathon",
  "One marathon": "Ein Marathon",
  "First run {distance} in one go · longest {longest}":
    "Lauf zuerst {distance} am Stück · bisher {longest}",
  "No time over {distance} yet": "Noch keine Zeit über {distance}",
  "Best {best} · {gap} to go": "Beste {best} · noch {gap}",
  // src/game/ (TASK-423 part E2a: the prizes in Play, the editions, the
  // unlock card of an edition or a collection)
  Prizes: "Preise",
  "Frames, titles and badges": "Rahmen, Titel und Abzeichen",
  "Prizes are not on this server yet.": "Preise gibt es auf diesem Server noch nicht.",
  "Silver editions: {count}": "Silber-Editionen: {count}",
  "Gold editions: {count}": "Gold-Editionen: {count}",
  Frames: "Rahmen",
  "Complete a collection to earn its frame.":
    "Vervollständige eine Sammlung, um ihren Rahmen zu bekommen.",
  Titles: "Titel",
  Badges: "Abzeichen",
  Earned: "Erhalten",
  "Complete the collection to earn it.":
    "Vervollständige die Sammlung, um ihn zu bekommen.",
  "{collection} frame": "Rahmen {collection}",
  "Bronze edition": "Bronze-Edition",
  "Silver edition": "Silber-Edition",
  "Gold edition": "Gold-Edition",
  "{runs} of {need} runs for silver": "{runs} von {need} Läufen für Silber",
  "{runs} of {need} runs for gold": "{runs} von {need} Läufen für Gold",
  Runner: "Läufer",
  Explorer: "Entdecker",
  Traveller: "Reisender",
  Globetrotter: "Weltenbummler",
  Marathoner: "Marathonläufer",
  Ultrarunner: "Ultraläufer",
  Steady: "Beständig",
  Collector: "Sammler",
  "4-week streak": "4 Wochen in Folge",
  "12-week streak": "12 Wochen in Folge",
  "52-week streak": "52 Wochen in Folge",
  "10 medals": "10 Medaillen",
  "50 medals": "50 Medaillen",
  "10 gold editions": "10 Gold-Editionen",
  "Team shape": "Team-Form",
  "10 team shapes": "10 Team-Formen",
  "Run a marathon": "Lauf einen Marathon",
  "Run 50 km in one go": "Lauf 50 km am Stück",
  "Complete every collection": "Vervollständige alle Sammlungen",
  "{count} week in a row with an outing": "{count} Woche in Folge mit einer Aktivität",
  "{count} weeks in a row with an outing":
    "{count} Wochen in Folge mit einer Aktivität",
  "{count} medal in the personal challenges":
    "{count} Medaille in den persönlichen Herausforderungen",
  "{count} medals in the personal challenges":
    "{count} Medaillen in den persönlichen Herausforderungen",
  "{count} shape in its gold edition": "{count} Form in der Gold-Edition",
  "{count} shapes in their gold edition": "{count} Formen in der Gold-Edition",
  "{count} team challenge completed": "{count} Team-Herausforderung geschafft",
  "{count} team challenges completed": "{count} Team-Herausforderungen geschafft",
  "In your {collection} collection.": "In deiner Sammlung {collection}.",
  "You met its goal in {count} runs.": "Du hast das Ziel in {count} Läufen erreicht.",
  "Collection complete": "Sammlung komplett",
  "A new frame for your profile.": "Ein neuer Rahmen für dein Profil.",
  "New in Play": "Neu in Play",
  "See them in your collection.": "Du findest sie in deiner Sammlung.",
  "{count} new shape": "{count} neue Form",
  "{count} new shapes": "{count} neue Formen",
  "{count} new edition": "{count} neue Edition",
  "{count} new editions": "{count} neue Editionen",
  "{collection} complete": "{collection} komplett",
  // src/game/PrizesPage.tsx, GamePrizesRow.tsx (TASK-423 part E2b: what
  // the profile shows)
  "Touch a prize you have to show it on your profile. Nothing is shown until you choose.":
    "Tippe auf einen Preis, den du hast, um ihn auf deinem Profil zu zeigen. Ohne deine Wahl wird nichts gezeigt.",
  "On your profile": "Auf deinem Profil",
  "Your profile shows up to {count} badges.":
    "Dein Profil zeigt bis zu {count} Abzeichen.",
  "Title: {title}": "Titel: {title}",

  // src/navigation/runPosition.ts, the Android notification of a run (TASK-294)
  "MuW is recording your activity": "MuW zeichnet deine Aktivität auf",
  "It keeps going with the screen locked, voice included.":
    "Läuft auch bei gesperrtem Bildschirm weiter, mit Sprachansagen.",

  // src/navigation/lockNotice.ts, the notice with the phone locked (TASK-401)
  "{distance} left": "noch {distance}",

  // src/location/startStatus.ts, src/screens/ChooseScreen.tsx,
  // src/explore/ExploreScreen.tsx, ThemedCard.tsx, src/screens/NavigateScreen.tsx,
  // RunPanel.tsx, src/navigation/runStats.ts, src/intro/SavedLogo.tsx
  // (TASK-210, parte H)
  "Starting from your position.": "Start: deine Position.",
  "Starting from {place}.": "Start: {place}.",
  "Starting from a point on the map.": "Start: ein Punkt auf der Karte.",
  "Search for a city or street to start from.":
    "Suche eine Stadt oder Straße als Start.",
  "Location is off for MuW. Allow it in Settings, or search for a place to start from.":
    "Der Standort ist für MuW aus. Erlaube ihn in den Einstellungen oder suche einen Ort als Start.",
  "Your position is not available right now. Search for a place to start from.":
    "Deine Position ist gerade nicht verfügbar. Suche einen Ort als Start.",
  START: "START",
  "My position": "Meine Position",
  "Another place": "Anderer Ort",
  "No recommended routes near this start yet. Draw one: the best ones will show up here.":
    "In der Nähe dieses Starts gibt es noch keine empfohlenen Routen. Zeichne eine: Die besten erscheinen hier.",
  "{distance} away": "{distance} entfernt",
  "Finding the places and drawing the shape through them… This can take a minute.":
    "Die Orte werden gesucht und die Form durch sie gezeichnet… Das kann eine Minute dauern.",
  "{percent}% drawn": "{percent} % gezeichnet",
  N: "N",
  NE: "NO",
  E: "O",
  SE: "SO",
  S: "S",
  SW: "SW",
  W: "W",
  NW: "NW",
  // src/screens/RunPanel.tsx (TASK-461 B2c, approved 2026-11-11)
  "{m} m of climb to go": "noch {m} Höhenmeter",
  "{distance} to go": "noch {distance}",
  "Saved to My activities": "In Meine Aktivitäten gespeichert",
  // src/social/ContactsFriends.tsx (TASK-262 C)
  "FROM YOUR CONTACTS": "AUS DEINEN KONTAKTEN",
  "Find friends in your contacts": "Freunde in deinen Kontakten finden",
  "Only coded phone numbers leave the phone, never names. The server compares them with the numbers members saved and keeps none.":
    "Nur verschlüsselte Telefonnummern verlassen das Handy, nie Namen. Der Server vergleicht sie mit den Nummern, die Mitglieder gespeichert haben, und behält keine.",
  "Looking in your contacts…": "Suche in deinen Kontakten…",
  "MuW cannot see your contacts.": "MuW kann deine Kontakte nicht sehen.",
  "No phone numbers in your contacts.":
    "In deinen Kontakten gibt es keine Telefonnummern.",
  "None of your contacts is on MuW yet.": "Noch keiner deiner Kontakte ist bei MuW.",
  "This server cannot look in your contacts yet.":
    "Dieser Server kann noch nicht in deinen Kontakten suchen.",
  "The contacts could not be read.": "Die Kontakte konnten nicht gelesen werden.",
  // «Play», the «Challenges» tab: src/game/{PlayScreen,ChallengesTab,TeamView,
  // ChallengeView,NewChallenge}.tsx, teamsApi.ts, timeLeft.ts, shareCode.ts
  // (TASK-296, parte D)
  Collection: "Sammlung",
  Challenges: "Herausforderungen",
  "Sign in to play with a team.": "Melde dich an, um im Team zu spielen.",
  "Teams are not on this server yet.": "Teams gibt es auf diesem Server noch nicht.",
  "No team yet. Create one, or join one with its code.":
    "Noch kein Team. Gründe eins, oder tritt mit einem Code bei.",
  "Team name": "Teamname",
  Create: "Erstellen",
  "Team code": "Teamcode",
  Join: "Beitreten",
  "{count} member": "{count} Mitglied",
  "{count} members": "{count} Mitglieder",
  "No challenge yet": "Noch keine Herausforderung",
  "{done} of {total} pieces done": "{done} von {total} Teilen geschafft",
  "Code {code}": "Code {code}",
  "Share code": "Code teilen",
  "Join my team «{name}» on MuW: open Play, Challenges, and enter the code {code}.":
    "Komm in mein Team «{name}» bei MuW: öffne Play, Herausforderungen, und gib den Code {code} ein.",
  MEMBERS: "MITGLIEDER",
  Owner: "Besitzer",
  "Leave team": "Team verlassen",
  "Leave this team?": "Dieses Team verlassen?",
  "New challenge": "Neue Herausforderung",
  Pieces: "Teile",
  "Fewer pieces": "Weniger Teile",
  "More pieces": "Mehr Teile",
  "Each piece": "Jedes Teil",
  Fast: "Schnell",
  "Slower pace": "Langsameres Tempo",
  "Faster pace": "Schnelleres Tempo",
  Days: "Tage",
  "Fewer days": "Weniger Tage",
  "More days": "Mehr Tage",
  "Start the challenge": "Herausforderung starten",
  "{count} pieces · {goal} each": "{count} Teile · je {goal}",
  "Piece {n}": "Teil {n}",
  Free: "Frei",
  Yours: "Deins",
  "Taken by {name}": "Genommen von {name}",
  "Done by {name}": "Geschafft von {name}",
  "Take this piece": "Dieses Teil nehmen",
  Leave: "Abgeben",
  "WHO GAVE WHAT": "WER WAS BEIGETRAGEN HAT",
  "Nobody has run yet.": "Noch ist niemand gelaufen.",
  PIECES: "TEILE",
  "Complete! Your team drew it together.":
    "Fertig! Euer Team hat sie zusammen gezeichnet.",
  "Time ran out: {count} piece was missing.": "Die Zeit ist um: {count} Teil fehlte.",
  "Time ran out: {count} pieces were missing.":
    "Die Zeit ist um: {count} Teile fehlten.",
  "{count} day {hours} h left": "Noch {count} Tag {hours} h",
  "{count} days {hours} h left": "Noch {count} Tage {hours} h",
  "{hours} h {minutes} min left": "Noch {hours} h {minutes} min",
  "{minutes} min {seconds} s left": "Noch {minutes} min {seconds} s",
  "Time is up": "Die Zeit ist um",
  "No team with this code.": "Kein Team hat diesen Code.",
  "You can't join this team.": "Du kannst diesem Team nicht beitreten.",
  "You are in 10 teams already: leave one first.":
    "Du bist schon in 10 Teams: verlasse zuerst eins.",
  "This team is not available any more.": "Dieses Team gibt es nicht mehr.",
  "This challenge is not available any more.":
    "Diese Herausforderung gibt es nicht mehr.",
  "The team has a challenge going already: wait for it to end.":
    "Das Team hat schon eine Herausforderung am Laufen: warte, bis sie endet.",
  "This challenge is over.": "Diese Herausforderung ist vorbei.",
  "This piece is not there any more.": "Dieses Teil gibt es nicht mehr.",
  "This piece is done already.": "Dieses Teil ist schon geschafft.",
  "Someone holds this piece already.": "Jemand hat dieses Teil schon.",
  "You hold a piece of this challenge already: leave it first.":
    "Du hast schon ein Teil dieser Herausforderung: gib es zuerst ab.",
  "You don't hold this piece.": "Dieses Teil ist nicht deins.",
  "This name is not allowed. Choose another one.":
    "Dieser Name ist nicht erlaubt. Wähle einen anderen.",
  // src/screens/SignInScreen.tsx, src/settings/NotificationsSetting.tsx
  // (TASK-284 B: the email when away; the names as in its email)
  "If you don't open MuW for 2 weeks, we email you once with what's new.":
    "Wenn du MuW 2 Wochen lang nicht öffnest, schicken wir dir einmal eine E-Mail mit den Neuigkeiten.",
  "Don't send me these emails": "Schickt mir diese E-Mails nicht mehr",
  "Email when I'm away": "E-Mail, wenn ich weg bin",
  None: "Keine",
  Energy: "Energie",
  Chill: "Entspannt",
  Epic: "Episch",
  Sprint: "Sprint",
  Rock: "Rock",
  Funk: "Funk",
  Sunny: "Sonnig",
  Trap: "Trap",
  Retro: "Retro",
  Fiesta: "Fiesta",
  "Tap a track to hear it.": "Tipp auf einen Titel, um ihn zu hören.",

  // src/share/CharacterRow.tsx, videoCharacter.ts (TASK-408: the animal of
  // the video; «Horse», «Fox», «Wolf» are above)
  Character: "Figur",
  "No animal": "Kein Tier",
  "White horse": "Schimmel",
  Stag: "Hirsch",
  Deer: "Reh",
  Husky: "Husky",
  "Shiba Inu": "Shiba Inu",
  Cow: "Kuh",
  Bull: "Stier",
  Donkey: "Esel",
  Alpaca: "Alpaka",
  // TASK-408 B2: the elephant
  Elephant: "Elefant",

  // src/share/ (TASK-408 C1: «Edit video», the line's colour, the video's emoji)
  "2D": "2D",
  "Edit video": "Video bearbeiten",
  "Line colour": "Linienfarbe",
  "Along the way": "Unterwegs",
  "At the end": "Am Ende",
  Nothing: "Nichts",
  Yellow: "Gelb",
  "Light blue": "Hellblau",
  Pink: "Rosa",
  Green: "Grün",
  White: "Weiß",
  // src/share/ScenesRows.tsx, EndingRow.tsx, videoScenes.ts (TASK-408 C2, texts of choice 10)
  Scenes: "Szenen",
  Opening: "Anfang",
  "The route": "Die Strecke",
  Ending: "Ende",
  "Drawing in 2D": "Zeichnung in 2D",
  Cut: "Schnitt",
  Fade: "Überblendung",
  Numbers: "Zahlen",
  "Whole drawing": "Ganze Zeichnung",
  "All three": "Alle drei",
  "At least one scene stays on.": "Mindestens eine Szene bleibt an.",
  "Camera behind": "Kamera dahinter",
  "Camera around": "Kamera rundherum",
  "Line in 2D": "Linie in 2D",
  // src/share/VideoPreview.tsx (TASK-408 C2c, choice 13; «Resume» and «Pause» were there)
  "Video preview": "Videovorschau",

  // src/contest/ (TASK-299 B: the contest card, its rules, the Winner badge)
  "MuW contest": "MuW-Wettbewerb",
  "The post with the most reactions wins.":
    "Der Beitrag mit den meisten Reaktionen gewinnt.",
  "{count} day left": "Noch {count} Tag",
  "{count} days left": "Noch {count} Tage",
  "Ends today": "Endet heute",
  "Ended · the winner is coming": "Beendet · der Gewinner kommt bald",
  "Publish a run to take part.": "Veröffentliche einen Lauf, um mitzumachen.",
  "Your best post: #{rank}, {count} reaction":
    "Dein bester Beitrag: Platz {rank}, {count} Reaktion",
  "Your best post: #{rank}, {count} reactions":
    "Dein bester Beitrag: Platz {rank}, {count} Reaktionen",
  "How it works": "So funktioniert's",
  "Official rules": "Teilnahmebedingungen",
  "Organised by MuW (Luca Pallaoro). Runs from {start} to {end}.":
    "Veranstaltet von MuW (Luca Pallaoro). Zeitraum: {start} bis {end}.",
  "Anyone with a MuW account can take part, for free, by publishing a run for everyone in the app during the contest.":
    "Mitmachen kann kostenlos jede Person mit einem MuW-Konto, indem sie während des Wettbewerbs in der App einen Lauf für alle veröffentlicht.",
  "At the end, the post with the most reactions from other members wins. One reaction per member counts; your own does not. If two posts tie, the one with more MuW hearts wins, then the one published first.":
    "Am Ende gewinnt der Beitrag mit den meisten Reaktionen anderer Mitglieder. Es zählt eine Reaktion pro Mitglied, die eigene zählt nicht. Bei Gleichstand gewinnt der Beitrag mit mehr MuW-Herzen, dann der zuerst veröffentlichte.",
  "The prize has no money value: the winner gets the Winner badge on their profile and their post shown at the top of the Feed for a week.":
    "Der Preis hat keinen Geldwert: Wer gewinnt, bekommt das Gewinner-Abzeichen im Profil, und der Beitrag steht eine Woche lang oben im Feed.",
  "MuW may leave out a post that breaks the community rules.":
    "MuW kann einen Beitrag ausschließen, der gegen die Community-Regeln verstößt.",
  "Apple and Google are not sponsors of this contest and are not involved in it in any way.":
    "Apple und Google sind keine Sponsoren dieses Wettbewerbs und in keiner Weise daran beteiligt.",
  Winner: "Gewinner",
  "{name} won the MuW contest": "{name} hat den MuW-Wettbewerb gewonnen",
  // src/contest/ (TASK-343 B: the monthly challenge, not Play's «Challenges»)
  "Monthly challenge": "Herausforderung des Monats",
  "See the challenge": "Zur Herausforderung",
  "Publish a run and enter it to take part.":
    "Veröffentliche einen Lauf und melde ihn an, um mitzumachen.",
  "Enter “{theme}”": "Bei „{theme}“ anmelden",
  "From {start} to {end}": "{start} bis {end}",
  Ended: "Beendet",
  "{count} person taking part": "{count} Person macht mit",
  "{count} people taking part": "{count} Personen machen mit",
  "You entered {count} drawing": "Du hast {count} Zeichnung angemeldet",
  "You entered {count} drawings": "Du hast {count} Zeichnungen angemeldet",
  "Prize: the Winner badge on your profile and your post at the top of the Feed for a week.":
    "Preis: das Gewinner-Abzeichen in deinem Profil und dein Beitrag eine Woche lang oben im Feed.",
  Top: "Top",
  New: "Neu",
  "Past challenges": "Frühere Herausforderungen des Monats",
  "No past challenges yet.": "Noch keine früheren Herausforderungen des Monats.",
  "No drawings entered yet.": "Noch keine Zeichnung angemeldet.",
  "This challenge takes no entries now.":
    "Diese Herausforderung nimmt gerade keine Anmeldungen an.",
  "This run cannot take part: it must be for everyone, recorded with MuW and published during the challenge.":
    "Dieser Lauf kann nicht mitmachen: Er muss für alle sichtbar, mit MuW aufgezeichnet und während der Herausforderung veröffentlicht sein.",
  "The theme is “{theme}”.": "Das Thema ist „{theme}“.",
  "Anyone with a MuW account can take part, for free: publish a run recorded with MuW for everyone during the challenge, and enter it. You can enter as many drawings as you like, and withdraw them until the challenge ends.":
    "Mitmachen kann kostenlos jede Person mit einem MuW-Konto: Veröffentliche während der Herausforderung einen mit MuW aufgezeichneten Lauf für alle und melde ihn an. Du kannst beliebig viele Zeichnungen anmelden und sie zurückziehen, bis die Herausforderung endet.",
  "At the end, the entered post with the most reactions from other members wins. One reaction per member counts; your own does not. If two posts tie, the one with more MuW hearts wins, then the one published first.":
    "Am Ende gewinnt unter den angemeldeten Beiträgen der mit den meisten Reaktionen anderer Mitglieder. Es zählt eine Reaktion pro Mitglied, die eigene zählt nicht. Bei Gleichstand gewinnt der Beitrag mit mehr MuW-Herzen, dann der zuerst veröffentlichte.",
  "MuW may leave out a post that does not fit the theme or breaks the community rules.":
    "MuW kann einen Beitrag ausschließen, der nicht zum Thema passt oder gegen die Community-Regeln verstößt.",
  // src/route/NearYou.tsx (TASK-306: shapes ready near you, or in other cities)
  "NEAR YOU": "IN DEINER NÄHE",
  "SHAPES TO TRY": "FORMEN ZUM AUSPROBIEREN",
  // src/game/PlayRow.tsx (TASK-327: «Play» under the distance of «Draw»)
  PLAY: "SPIELEN",
  "Collect shapes by running": "Sammle Formen beim Laufen",
  // src/screens/NavigateScreen.tsx (TASK-303)
  "The route is {distance} away, to the {direction}.":
    "Die Route ist {distance} entfernt, Richtung {direction}.",
  "Follow the dotted line back to the route.":
    "Folge der gepunkteten Linie zurück zur Route.",
  // src/social/DrawingCard.tsx (TASK-307: «Start» on a drawing follows its track)
  "This route has no turn directions: follow the line on the map.":
    "Diese Route hat keine Abbiegehinweise: Folge der Linie auf der Karte.",
  // src/game/runStripData.ts (TASK-296 E: the game's line on the run screen)
  "Last km {pace} · target {target}": "Letzter km {pace} · Ziel {target}",
  "Last mi {pace} · target {target}": "Letzte mi {pace} · Ziel {target}",

  // src/settings/FeedbackSetting.tsx, feedbackFields.ts, SettingsPage.tsx (TASK-308)
  "Send feedback": "Feedback senden",
  "Thank you! Your message reached us.":
    "Danke! Deine Nachricht ist bei uns angekommen.",
  "Ideas, problems, anything that would make MuW better: we read every message.":
    "Ideen, Probleme, alles, was MuW besser machen würde: Wir lesen jede Nachricht.",
  "Write here…": "Hier schreiben…",
  "Your message": "Deine Nachricht",
  "It reaches us with your username, your email and the app's version, so we can answer you.":
    "Sie erreicht uns mit deinem Benutzernamen, deiner E-Mail-Adresse und der Version der App, damit wir dir antworten können.",
  "Write something first.": "Schreib zuerst etwas.",
  "You sent a lot of feedback today. Try again tomorrow.":
    "Du hast uns heute schon viel geschrieben. Versuch es morgen wieder.",
  FEEDBACK: "FEEDBACK",
  // src/settings/sport.ts (TASK-305 D0: paragliding, «Soon» in «Sport»)
  Paragliding: "Gleitschirmfliegen",
  // src/sports/swimming.ts (TASK-400: «Swim», in open water or in a pool)
  Swim: "Schwimmen",
  // src/pool/ (TASK-400 part B: a swim in a pool), approved on 2026-11-06
  "Open water": "Freiwasser",
  Pool: "Becken",
  "Pool length": "Beckenlänge",
  Other: "Andere",
  "Length in meters": "Länge in Metern",
  "Start swim": "Schwimmen starten",
  "How many lengths?": "Wie viele Bahnen?",
  Lengths: "Bahnen",
  "Pool swim": "Schwimmen im Becken",
  "Pace /100 m": "Tempo /100 m",
  // TASK-409 part B: the heart rate of a swim in a pool.
  "Add heart rate from Apple Health": "Herzfrequenz aus Apple Health hinzufügen",
  "No heart rate from your watch for this swim.":
    "Keine Herzfrequenz von deiner Uhr für dieses Schwimmen.",
  "Show heart rate": "Herzfrequenz zeigen",
  "Avg heart rate": "Durchschn. Herzfrequenz",
  "Time in zones": "Zeit in Zonen",
  "From your watch, via Apple Health": "Von deiner Uhr, über Apple Health",
  // src/explore/ExploredCard.tsx, src/social/DrawingCard.tsx (TASK-313)
  "Draw it near me": "In meiner Nähe zeichnen",
  // src/route/RoutePanel.tsx (TASK-311 B: a word in one line that did not come out)
  "This word may come out better with the pen up: each letter on its own.":
    "Dieses Wort wird mit angehobenem Stift vielleicht besser: jeder Buchstabe für sich.",
  "Lift the pen": "Stift anheben",
  // src/route/RoutePanel.tsx (TASK-317: the wait in «Draw»)
  "Warming up: {name}…": "Aufwärmen: {name}…",
  "Warming up: “{word}”…": "Aufwärmen: „{word}“…",
  "Warming up: the picture…": "Aufwärmen: das Bild…",

  // src/api/messages.ts (TASK-319: private messages)
  "A message needs some words.": "Eine Nachricht braucht ein paar Worte.",
  "A message is at most {max} characters.":
    "Eine Nachricht hat höchstens {max} Zeichen.",
  "Too many messages in a minute. Wait a moment and try again.":
    "Zu viele Nachrichten in einer Minute. Warte kurz und versuche es noch einmal.",
  "You can't send negative messages in this app.":
    "In dieser App kannst du keine negativen Nachrichten schicken.",
  "This conversation is not available.": "Diese Unterhaltung ist nicht verfügbar.",

  // src/messages/ConversationList.tsx, MessagesOverlay.tsx, MessagesRow.tsx, MessageButton.tsx (TASK-319)
  Messages: "Nachrichten",
  "Messages, {count} waiting": "Nachrichten, {count} offen",
  "Message requests": "Nachrichtenanfragen",
  "Message requests, {count} waiting": "Nachrichtenanfragen, {count} offen",
  "No messages yet": "Noch keine Nachrichten",
  "Open someone's profile and tap Message to write to them.":
    "Öffne ein Profil und tippe auf Nachricht, um zu schreiben.",
  "No message requests.": "Keine Nachrichtenanfragen.",
  "You: {text}": "Du: {text}",
  "{name}, new message: {text}": "{name}, neue Nachricht: {text}",
  Message: "Nachricht",
  "Message {name}": "{name} eine Nachricht schreiben",

  // src/messages/ConversationScreen.tsx, MessageSheet.tsx (TASK-319)
  "Show earlier messages": "Frühere Nachrichten zeigen",
  "Touch and hold to delete it": "Gedrückt halten, um sie zu löschen",
  "Touch and hold to report it": "Gedrückt halten, um sie zu melden",
  "Message request sent. You can write again when {name} accepts it.":
    "Nachrichtenanfrage gesendet. Du kannst wieder schreiben, wenn {name} sie annimmt.",
  "{name} wants to send you a message.": "{name} möchte dir eine Nachricht schicken.",
  "{name} gets this as a message request. You can send one message until they accept it.":
    "{name} bekommt das als Nachrichtenanfrage. Bis sie angenommen ist, kannst du eine Nachricht schicken.",
  "Write a message…": "Schreib eine Nachricht…",
  // src/screens/SignInScreen.tsx (TASK-458: the eye of the password; what VoiceOver says)
  "Show password": "Passwort anzeigen",
  "Hide password": "Passwort verbergen",
  // src/messages/ConversationScreen.tsx (TASK-458: a conversation with nothing in it yet, the user's choice of 2026-11-23)
  "Say hi to {name}.": "Sag {name} hallo.",
  "Hi {name}!": "Hallo {name}!",
  "I like your drawings": "Mir gefallen deine Zeichnungen",
  "Shall we run together?": "Wollen wir zusammen laufen?",
  "Writes it in the box. Nothing is sent yet.":
    "Schreibt es ins Feld. Es wird noch nichts gesendet.",
  "Photos, videos and drawings come after that.":
    "Fotos, Videos und Zeichnungen kommen danach.",
  // src/tabs/MessagesPage.tsx, src/messages/NewMessage.tsx (TASK-458: «New message» from the list)
  "New message": "Neue Nachricht",
  "Search someone by name to write to them.":
    "Suche jemanden nach Namen, um zu schreiben.",
  "Delete this message for both of you?": "Diese Nachricht für euch beide löschen?",
  "Report this message": "Diese Nachricht melden",
  // src/explore/ExploredCard.tsx, social/DrawingCard.tsx, mapdraw/DrawOnMap.tsx,
  // RoutePanel.tsx, favorites/favoriteRoute.ts (TASK-320, TASK-331: the figure
  // drawn by hand on the map)
  "Edit the drawing": "Zeichnung bearbeiten",
  Erase: "Radieren",
  Drawing: "Zeichnung",
  "Rub a line to erase that piece. A piece cut off joins the drawing with a dash.":
    "Fahre über eine Linie, um das Stück zu radieren. Ein abgetrenntes Stück wird gestrichelt mit der Zeichnung verbunden.",
  // src/imports/, activities/RunEnd.tsx, feed/FeedPost.tsx (TASK-312 B:
  // «Add past activity» from a GPX, TCX or FIT file, «Imported»)
  "Add past activity": "Frühere Aktivität hinzufügen",
  "From a file": "Aus einer Datei",
  "GPX, TCX or FIT from Strava, Garmin, Komoot…":
    "GPX, TCX oder FIT von Strava, Garmin, Komoot…",
  "Export the activity as a file from the other app or its website, save it in Files, then pick it here.":
    "Exportiere die Aktivität als Datei aus der anderen App oder von ihrer Website, speichere sie in Dateien und wähle sie dann hier aus.",
  Imported: "Importiert",
  "Imported activities don't count for Play or contests.":
    "Importierte Aktivitäten zählen nicht für das Spiel und die Wettbewerbe.",
  "This file is not GPX, TCX or FIT.": "Diese Datei ist weder GPX noch TCX noch FIT.",
  "This file has no times: it is a route, not an activity.":
    "Diese Datei hat keine Zeiten: Sie ist eine Route, keine Aktivität.",
  "This file has no positions.": "Diese Datei hat keine Positionen.",
  "This file is too big (over 25 MB).": "Diese Datei ist zu groß (über 25 MB).",
  "Activities before 2020 cannot be added.":
    "Aktivitäten vor 2020 können nicht hinzugefügt werden.",
  "Already in My activities.": "Schon in Meine Aktivitäten.",
  // The attachments of the private messages (TASK-333).
  "📷 Photo": "📷 Foto",
  "🎬 Video": "🎬 Video",
  "🗺️ Drawing": "🗺️ Zeichnung",
  Photo: "Foto",
  Video: "Video",
  "This video has expired.": "Dieses Video ist abgelaufen.",
  "Video, {duration}": "Video, {duration}",
  "Drawing: {title}, {distance}": "Zeichnung: {title}, {distance}",
  "Add a photo, a video or a drawing":
    "Ein Foto, ein Video oder eine Zeichnung hinzufügen",
  "Add a message…": "Eine Nachricht hinzufügen…",
  "Couldn't send. Tap to try again.":
    "Nicht gesendet. Tippe, um es noch einmal zu versuchen.",
  "This video is longer than {seconds} seconds. Choose a shorter one.":
    "Dieses Video ist länger als {seconds} Sekunden. Wähle ein kürzeres.",
  "This video is too large: at most {mb} MB. Choose a shorter one.":
    "Dieses Video ist zu groß: höchstens {mb} MB. Wähle ein kürzeres.",
  "Too many videos today. Try again tomorrow.":
    "Heute schon zu viele Videos. Versuch es morgen wieder.",
  "Too many photos today. Try again tomorrow.":
    "Heute schon zu viele Fotos. Versuch es morgen wieder.",
  "Videos can't be sent right now. Try again later.":
    "Gerade können keine Videos gesendet werden. Versuch es später wieder.",
  // The Apple Watch (TASK-370 part B3a).
  "Send to watch": "An die Uhr senden",
  "Sent to your watch": "An die Uhr gesendet",
  "Your activity from the watch is ready": "Deine Aktivität von der Uhr ist bereit",
  "Open MuW to save it.": "Öffne MuW, um sie zu speichern.",
  "From your Apple Watch": "Von deiner Apple Watch",
  Open: "Öffnen",
  "Send a route from MuW on your iPhone": "Sende eine Route aus MuW auf dem iPhone",
  "Off route": "Abseits der Route",
  Arrived: "Ziel",
  "Reach the route to start": "Zur Route gehen, um zu starten",
  "To the {letter}": "Zum {letter}",
  "Next part": "Nächster Teil",
  // The drawings of the private messages (TASK-333 part C).
  "Send to a friend": "An Freunde senden",
  "Send to…": "Senden an…",
  "Search people": "Personen suchen",
  "Sent to {name}.": "An {name} gesendet.",
  "Send a drawing": "Eine Zeichnung senden",
  "Photos, videos and drawings can be sent once {name} accepts your message.":
    "Fotos, Videos und Zeichnungen kannst du senden, sobald {name} deine Nachricht annimmt.",

  // src/profile/BadgeRow.tsx (TASK-341: the badges of a profile)
  "First drawing": "Erste Zeichnung",
  "10 drawings": "10 Zeichnungen",
  "{distance} drawing": "{distance}-Zeichnung",
  "Not earned yet: {badge}": "Noch nicht erreicht: {badge}",
  // src/messages/messageTime.ts, ConversationList.tsx (TASK-353: times in the chat)
  Today: "Heute",
  Yesterday: "Gestern",
  "{day} {month}": "{day}. {month}",
  "{name}, {count} new messages: {text}": "{name}, {count} neue Nachrichten: {text}",

  // The tabs of «Feed» (TASK-362).
  All: "Alle",
  "Follow people to see their drawings here.":
    "Folge anderen, um ihre Zeichnungen hier zu sehen.",
  "Find people to follow": "Personen zum Folgen finden",
  "The people you follow have not published anything yet.":
    "Die Personen, denen du folgst, haben noch nichts veröffentlicht.",
  "Couldn't load the Feed.": "Der Feed konnte nicht geladen werden.",
  // src/screens/FeedScreen.tsx: «All» without examples (2026-11-22)
  "Log in from Profile to see the activities.":
    "Melde dich im Profil an, um die Aktivitäten zu sehen.",
  "Nobody has published anything yet.": "Noch niemand hat etwas veröffentlicht.",

  // src/route/runTime.ts (TASK-361: the time under the distance of «Draw»)
  "≈ {time} at {pace}": "≈ {time} bei {pace}",
  "≈ {time} at {pace} (a usual pace)": "≈ {time} bei {pace} (ein übliches Tempo)",

  // src/route/ShapePreview.tsx (TASK-361: the shape to scale)
  "{name}, about {size} on the map": "{name}, etwa {size} auf der Karte",

  // src/route/ShapeGrid.tsx (TASK-361: the shapes in two rows)
  "Show fewer shapes": "Weniger Formen zeigen",
  "See all {count} shapes": "Alle {count} Formen ansehen",
  "Show fewer": "Weniger",
  "See all": "Alle ansehen",

  // src/route/SurprisePill.tsx (TASK-448: «Surprise me»)
  "Surprise me": "Überrasch mich",

  // src/route/DistanceDial.tsx (TASK-361: the distance by half a km)
  "Tap to type the distance": "Tippen, um die Distanz einzugeben",

  // src/screens/RunNoRouteButton.tsx (TASK-361)
  "Records the run without drawing a route first":
    "Zeichnet den Lauf auf, ohne vorher eine Route zu zeichnen",

  // src/route/drawLabel.ts (TASK-361: the words of «Draw route»)
  "Draw a {distance} {name}": "Zeichnen: {name}, {distance}",
  "Draw “{word}”, {distance}": "„{word}“ zeichnen, {distance}",
  "Draw the picture, {distance}": "Das Bild zeichnen, {distance}",

  // src/route/OtherShapeField.tsx (TASK-361: «Type another shape»)
  "Type another shape": "Andere Form eingeben",
  "Write a shape that is not among the tiles":
    "Eine Form schreiben, die nicht unter den Kacheln ist",

  // src/route/RoutePanel.tsx (TASK-361 part B: the steps of «Draw»)
  "WHAT YOU DRAW": "WAS DU ZEICHNEST",
  "Write a word, e.g. CIAO": "Schreib ein Wort, z. B. CIAO",

  // src/explore/RideItYourself.tsx (TASK-364)
  "RIDE IT YOURSELF": "FAHR ES SELBST",
  "Routes drawn by MuW. Nobody has ridden them yet.":
    "Von MuW gezeichnete Routen. Noch niemand ist sie gefahren.",
  "By bike": "Mit dem Rad",
  Bat: "Fledermaus",
  Madrid: "Madrid",
  Turin: "Turin",

  // src/search (TASK-344 part B: the search of «Feed»'s lens)
  "Search drawings, people, places": "Zeichnungen, Leute, Orte suchen",
  Clear: "Löschen",
  People: "Leute",
  Routes: "Routen",
  Filters: "Filter",
  "Recent searches": "Letzte Suchen",
  Categories: "Kategorien",
  "Featured drawings": "Ausgewählte Zeichnungen",
  Animals: "Tiere",
  Hearts: "Herzen",
  Words: "Wörter",
  Symbols: "Symbole",
  Emoji: "Emoji",
  Place: "Ort",
  "Town or region": "Stadt oder Region",
  Complexity: "Komplexität",
  Simple: "Einfach",
  Medium: "Mittel",
  Complex: "Komplex",
  "Sort by": "Sortieren nach",
  "Most recent": "Neueste",
  Longest: "Längste",
  "Most popular": "Beliebteste",
  "Up to {distance}": "Bis {distance}",
  "Over {distance}": "Über {distance}",
  Reset: "Zurücksetzen",
  "No drawings found": "Keine Zeichnungen gefunden",
  "Try other words, or change the filters.":
    "Versuche andere Wörter oder ändere die Filter.",

  // src/feed/PostSheet.tsx, PostSettings.tsx, postSections.ts (TASK-410: approved 2026-11-07)
  Like: "Gefällt mir",
  "Edit & run": "Bearbeiten und laufen",
  "Post settings": "Beitragseinstellungen",
  Summary: "Übersicht",
  // src/feed/postSections.ts (TASK-410 part D: approved 2026-11-07)
  "Fastest km": "Schnellster km",
  "Fastest mile": "Schnellste Meile",
  "Avg cadence": "Ø Kadenz",
  "Elevation gain": "Höhenmeter bergauf",
  Splits: "Zwischenzeiten",
  Mile: "Meile",
  "Fastest: km {n} · {pace}": "Am schnellsten: km {n} · {pace}",
  "Fastest: mile {n} · {pace}": "Am schnellsten: Meile {n} · {pace}",
  Elevation: "Höhenprofil",
  "Elevation along the route, from {min} to {max} m":
    "Höhe entlang der Strecke, von {min} bis {max} m",
  "Heart rate": "Herzfrequenz",
  Average: "Durchschnitt",
  Max: "Max.",

  // src/feed/muwLabel.ts (TASK-365: the routes MuW draws, labels approved)
  "Route created by MuW – ride it yourself": "Route von MuW – fahr sie selbst",
  "Route created by MuW – run it yourself": "Route von MuW – lauf sie selbst",
  "Route created by MuW – paddle it yourself": "Route von MuW – paddel sie selbst",

  // src/social/composer (TASK-348: the post composer, texts approved with «Approvo così»)
  "Your post": "Dein Beitrag",
  "Hold and drag to reorder":
    "Gedrückt halten und ziehen, um die Reihenfolge zu ändern",
  "Move left": "Nach links",
  "Move right": "Nach rechts",
  Layout: "Layout",
  "Drawing in the corner": "Zeichnung in der Ecke",
  "Line on the photo": "Linie auf dem Foto",
  "Half and half": "Halb und halb",
  "Photo in the corner": "Foto in der Ecke",
  "Up to 10 in a post.": "Bis zu 10 in einem Beitrag.",
  "Could not prepare this photo. Try again.":
    "Dieses Foto konnte nicht vorbereitet werden. Versuche es noch einmal.",
  // src/share/StyleRow.tsx, videoStyle.ts (TASK-351 part C: the video's styles)
  Style: "Stil",
  Night: "Nacht",
  Day: "Tag",
  // src/bell/BellButton.tsx, BellOverlay.tsx (TASK-367 part C: the bell)
  Notifications: "Benachrichtigungen",
  "Notifications, {count} new": "Benachrichtigungen, {count} neu",
  "No notifications yet. Reactions, comments, follows and tags will show up here.":
    "Noch keine Benachrichtigungen. Reaktionen, Kommentare, Follows und Markierungen erscheinen hier.",
  // src/profile/Vo2MaxRow.tsx, OwnVo2Max.tsx, settings/Vo2MaxSetting.tsx (TASK-397 part B: the VO₂ max, texts approved)
  "VO₂ max": "VO₂max",
  "Estimate from your {distance}": "Schätzung aus deinem {distance}",
  "Estimate from their {distance}": "Schätzung aus dem {distance}",
  "Show your VO₂ max?": "Deine VO₂max zeigen?",
  "Everyone who can see your profile will see it. You can turn it off in Settings.":
    "Alle, die dein Profil sehen können, sehen sie. Du kannst sie in den Einstellungen ausschalten.",
  "Show it": "Zeigen",
  "Only you see this": "Nur du siehst das",
  "Show VO₂ max on my profile": "VO₂max in meinem Profil zeigen",
  // src/ski/ResortList.tsx, ResortPage.tsx, ResortWeather.tsx (TASK-406 part C:
  // the ski resorts of «Search», texts approved)
  "Ski resorts": "Skigebiete",
  "Near you": "In deiner Nähe",
  "No ski resort with this name.": "Kein Skigebiet mit diesem Namen.",
  "Lifts@@resort": "Lifte",
  Pistes: "Pisten",
  Novice: "Anfänger",
  Easy: "Leicht",
  Intermediate: "Mittel",
  Advanced: "Schwer",
  Expert: "Experten",
  Freeride: "Freeride",
  Website: "Website",
  Base: "Tal",
  "Top@@resort": "Berg",
  "Next 24 hours": "Nächste 24 Stunden",
  "Fresh snow": "Neuschnee",
  "Estimated from the forecast, not a snow report.":
    "Aus der Vorhersage geschätzt, kein Schneebericht.",
  "Weather unavailable right now.": "Wetter gerade nicht verfügbar.",
  "Older forecast: MET Norway is not answering.":
    "Ältere Vorhersage: MET Norway antwortet nicht.",
  "Weather: MET Norway (CC BY 4.0) · Resorts: OpenSkiMap.org, © OpenStreetMap contributors":
    "Wetter: MET Norway (CC BY 4.0) · Skigebiete: OpenSkiMap.org, © OpenStreetMap-Mitwirkende",
  // src/ski/DayResort.tsx, DayChoices.tsx, SkiDayLine.tsx, screens/SnowFinishCard.tsx
  // (TASK-406 part D2: the day of skiing, texts approved on 2026-11-08)
  "Where are you skiing?": "Wo fährst du Ski?",
  "Change@@resort": "Ändern",
  "No ski resort nearby": "Kein Skigebiet in der Nähe",
  "{temperature} now · {snow} fresh snow": "{temperature} jetzt · {snow} Neuschnee",
  Total: "Gesamt",
  "How was the snow?": "Wie war der Schnee?",
  Powder: "Pulver",
  Groomed: "Präpariert",
  Icy: "Vereist",
  Spring: "Firn",
  Heavy: "Schwer",
  "Your gear": "Deine Ausrüstung",
  "Ski or snowboard, brand and model": "Ski oder Snowboard, Marke und Modell",
  Resort: "Skigebiet",
  Snow: "Schnee",
  Gear: "Ausrüstung",
  // src/ski/ResortList.tsx, ResortSnow.tsx, ResortPosts.tsx (TASK-406 part D3b:
  // the resort's page, texts approved on 2026-11-08)
  "Your resorts": "Deine Skigebiete",
  "Snow today": "Schnee heute",
  "{snow} ×{days}": "{snow} ×{days}",
  "Marked by the members in the last 24 hours.":
    "Von den Mitgliedern in den letzten 24 Stunden angegeben.",
  "Members' days here": "Tage der Mitglieder hier",

  // src/liveShare/LiveShareButton.tsx (TASK-424 part B1; «Not now» above)
  "Share live": "Live teilen",
  "Sharing live": "Live-Teilen aktiv",
  "Sign in to share live": "Melde dich an, um live zu teilen",
  "Share this activity live": "Diese Aktivität live teilen",
  "Anyone with the link can follow you on a web page, without the app: your exact position on the map, the route so far, distance, time, pace or speed, elevation gain, calories and your heart rate when a watch sends it.":
    "Wer den Link hat, kann dir auf einer Webseite folgen, ohne die App: deine genaue Position auf der Karte, die bisherige Strecke, Distanz, Zeit, Pace oder Tempo, Höhenmeter, Kalorien und deinen Puls, wenn eine Uhr ihn sendet.",
  "The link stops working one hour after you finish, or as soon as you stop sharing. Then your positions are deleted.":
    "Der Link funktioniert eine Stunde nach dem Ende nicht mehr, oder sobald du das Teilen beendest. Dann werden deine Positionen gelöscht.",
  "Share link": "Link teilen",
  "Follow my activity live on MuW: {url}":
    "Verfolge meine Aktivität live auf MuW: {url}",
  "Stop sharing?": "Teilen beenden?",
  "The link stops working now.": "Der Link funktioniert ab jetzt nicht mehr.",
  "Stop sharing": "Beenden",
  "Keep sharing": "Weiter teilen",
  "Couldn't create the link. Try again.":
    "Der Link konnte nicht erstellt werden. Versuch es noch einmal.",
  // src/explore/ExploreScreen.tsx, FartherAway.tsx, AskLine.tsx (TASK-420: every
  // drawing of the catalog in «Explore», the nearest first)
  "{count} drawings in {cities} cities · the nearest first":
    "{count} Zeichnungen in {cities} Städten · die nächsten zuerst",
  "{count} drawings · the nearest first": "{count} Zeichnungen · die nächsten zuerst",
  "within {distance} · {count}": "innerhalb von {distance} · {count}",
  "FARTHER AWAY": "WEITER WEG",
  "{count} drawing · by city": "{count} Zeichnung · nach Stadt",
  "{count} drawings · by city": "{count} Zeichnungen · nach Stadt",
  "Ask for a route": "Eine Route anfragen",
  "Famous places, best views, food… in any city":
    "Berühmte Orte, Aussichten, Essen… in jeder Stadt",
  "The rest could not load.": "Der Rest konnte nicht geladen werden.",
  "Loading more…": "Weitere werden geladen…",
  // src/share/CharacterRow.tsx, MyImageChoices.tsx (TASK-417: the runner's
  // own image in place of the animal, texts approved, choice 5)
  "My image": "Mein Bild",
  "Choose a photo": "Foto auswählen",
  "Remove image": "Bild entfernen",
  "Your image stays on this phone. It leaves only in the video you share.":
    "Dein Bild bleibt auf dem Handy. Es verlässt es nur im Video, das du teilst.",
  "This image can't be read. The video goes out without it.":
    "Dieses Bild lässt sich nicht lesen. Das Video kommt ohne es.",
  "Anyone with the link can follow you on a web page, without the app: time, lengths or exercise, calories and your heart rate when a watch sends it.":
    "Wer den Link hat, kann dir auf einer Webseite folgen, ohne die App: Zeit, Bahnen oder Übung, Kalorien und deinen Puls, wenn eine Uhr ihn sendet.",

  // src/skimode/, settings/SportButton.tsx (TASK-429 part A: the ski mode)
  "Days@@ski": "Tage",
  Resorts: "Skigebiete",
  "Your days": "Deine Tage",
  "Ski mode": "Ski-Modus",
  "Turns MuW into your ski app": "Macht MuW zu deiner Ski-App",
  "Choose another sport to go back to MuW as always.":
    "Wähle eine andere Sportart, um zu MuW wie immer zurückzukehren.",
  "Log in to see your days.": "Melde dich an, um deine Tage zu sehen.",
  "No days on the snow yet.": "Noch keine Tage im Schnee.",

  // src/trainingmode/, settings/SportButton.tsx (TASK-490 part A: the training mode)
  "Training mode": "Trainingsmodus",
  "Turns MuW into your training app": "Macht MuW zu deiner Trainings-App",
  Workouts: "Trainings",
  "Log in to keep your plans and see your workouts.":
    "Melde dich an, um deine Pläne zu behalten und deine Trainings zu sehen.",
  Exercises: "Übungen",
  "Find an exercise": "Übung suchen",
  "Workout at the gym": "Training im Studio",

  // src/trainingmode/ (TASK-490 part B: the body of the week)
  "of your body trained": "deines Körpers trainiert",
  "{percent}% of your body trained this week.":
    "{percent}% deines Körpers diese Woche trainiert.",
  "10 sets or more: {muscles}.": "10 Sätze oder mehr: {muscles}.",
  "5 to 9 sets: {muscles}.": "5 bis 9 Sätze: {muscles}.",
  "1 to 4 sets: {muscles}.": "1 bis 4 Sätze: {muscles}.",

  // src/skimode/ (TASK-429 part B: the day of skiing, its legend and its parts)
  "Runs@@ski": "Abfahrten",
  Legend: "Legende",
  "Descents · solid, numbered": "Abfahrten · durchgezogen, nummeriert",
  "Lifts · dashed, L1, L2…": "Lifte · gestrichelt, L1, L2…",
  Lift: "Lift",
  "{speed} top": "{speed} max.",
  "Stopped {minutes} min": "Pause {minutes} Min.",

  // src/skimode/ (TASK-429 part C: the season and the saved day)
  "Season {years}": "Saison {years}",
  "Vertical this season": "Höhenmeter der Saison",
  "On snow": "Im Schnee",
  "Piste without a name": "Piste ohne Namen",
  // TASK-415 part B: ski touring, its phases and its VAM (approved 2026-11-11).
  "Ski touring": "Skitour",
  Phase: "Phase",
  Climb: "Aufstieg",
  Descent: "Abfahrt",
  Changeover: "Fellwechsel",
  "VAM 5 min": "VAM 5 Min.",
  Altitude: "Höhe",
  "Elev. loss": "Abstieg",
  "Time up": "Zeit bergauf",
  "Time down": "Zeit bergab",
  "Avg VAM": "Ø VAM",
  "Max altitude": "Max. Höhe",
  Phases: "Phasen",
  "Climb {n}": "Aufstieg {n}",
  "Descent {n}": "Abfahrt {n}",
  "Lift {n}": "Lift {n}",
  "Skins off": "Felle ab",
  "Skins on": "Felle auf",
  "Climbed: {metres} m": "Anstieg: {metres} m",
  "{phase}, from {time}, for {duration}": "{phase}, ab {time}, {duration} lang",
  "No heights from the phone: no phases for this tour.":
    "Das Telefon hat keine Höhen geliefert: keine Phasen für diese Tour.",

  // src/activities/ (TASK-462: the calendar of every sport)
  Calendar: "Kalender",
  "Last 12 months": "Letzte 12 Monate",
  "{count} activity": "{count} Aktivität",
  "{count} activities": "{count} Aktivitäten",

  // src/settings/sport.ts, src/air/ (TASK-305 part R2, approved by the user on 2026-11-12)
  "Record your flight": "Flug aufzeichnen",
  "Before you fly": "Vor dem Flug",
  "MuW is not a certified flight instrument. Its numbers come from the phone's GPS: they can be late or wrong. Fly with your licence and your judgement, and keep a backup instrument.":
    "MuW ist kein zertifiziertes Fluginstrument. Seine Werte kommen vom GPS des Telefons: Sie können verspätet oder falsch sein. Flieg mit deiner Lizenz und deinem Urteilsvermögen und hab ein Ersatzinstrument dabei.",
  "Got it": "Verstanden",
  Vario: "Vario",
  "Flight time": "Flugzeit",
  "Your flight": "Dein Flug",
  "No shapes in the air yet: MuW records your flight.":
    "Noch keine Formen in der Luft: MuW zeichnet deinen Flug auf.",
  "White: where you flew.": "Weiß: wo du geflogen bist.",

  // src/profile/FirstStep.tsx, BadgesSection.tsx (TASK-457: a new profile)
  "Your first drawing": "Deine erste Zeichnung",
  "Start from a route that already draws a shape near you.":
    "Starte mit einer Route, die schon eine Form in deiner Nähe zeichnet.",
  "Find a route near you": "Route in deiner Nähe finden",
  "Record a run with MuW and publish its drawing.":
    "Zeichne einen Lauf mit MuW auf und veröffentliche seine Zeichnung.",
  "Publish 10 drawings of runs recorded with MuW.":
    "Veröffentliche 10 Zeichnungen von Läufen, die du mit MuW aufgezeichnet hast.",
  "Publish the drawing of a run of {distance} or more.":
    "Veröffentliche die Zeichnung eines Laufs von mindestens {distance}.",
  // «Sleep last night» in a post (TASK-467 part B2): src/health/sleepText.ts,
  // SleepRunEnd.tsx, SleepCard.tsx
  "Sleep last night": "Schlaf letzte Nacht",
  "Shown in this post. Turn it off to keep it to yourself.":
    "In diesem Beitrag sichtbar. Schalte es aus, um es für dich zu behalten.",
  "Sleep score": "Schlafwert",
  "Poor@@sleep": "Schwach",
  "Fair@@sleep": "Mäßig",
  "Good@@sleep": "Gut",
  "Very good@@sleep": "Sehr gut",
  "Excellent@@sleep": "Ausgezeichnet",
  "Awake@@sleep": "Wach",
  "REM@@sleep": "REM",
  "Light@@sleep": "Leicht",
  "Deep@@sleep": "Tief",
  "Worked out by MuW from Apple Health data. It can differ from the score in the Health app.":
    "Von MuW aus den Daten von Apple Health berechnet. Er kann vom Wert in der Health-App abweichen.",
  // TASK-305 part R5b: under «Record your flight» (approved 2026-11-12).
  "Your flights": "Deine Flüge",
  "{count} flight · {time}": "{count} Flug · {time}",
  "{count} flights · {time}": "{count} Flüge · {time}",
  "No flights this month": "Keine Flüge in diesem Monat",
  "Your best flights": "Deine Flugrekorde",
  "Longest flight": "Längster Flug",
  "Farthest flight": "Weitester Flug",
  "Ready to fly": "Startbereit",
  "Waiting for GPS…": "Warte auf GPS…",
  "GPS ready · ±{m} m": "GPS bereit · ±{m} m",
  "Weak GPS · ±{m} m: wait in the open": "Schwaches GPS · ±{m} m: warte im Freien",
  "Share live at start": "Beim Start live teilen",
  "When the countdown ends, MuW makes the link and opens the share sheet.":
    "Nach dem Countdown erstellt MuW den Link und öffnet das Teilen-Menü.",
  // src/feed/PostShareSheet.tsx, src/messages/messagePost.ts, attachmentText.ts
  // (TASK-455: a post shared and sent in a message; texts approved 2026-11-12)
  "Poster and video": "Poster und Video",
  "Only people who follow {user} can open it.":
    "Nur wer {user} folgt, kann ihn öffnen.",
  "by {user}": "von {user}",
  "This post is no longer available.": "Dieser Beitrag ist nicht mehr verfügbar.",
  "🗺️ Post": "🗺️ Beitrag",
  // src/settings/PostLinksSetting.tsx (TASK-455 part E)
  "Links to my posts": "Links zu meinen Beiträgen",
  "People who see your «Everyone» posts can share a link to them. Anyone with the link sees the drawing on the map, your username, the title, the sport and the distance, even without MuW. Turn this off and the links stop working.":
    "Wer deine Beiträge für «Alle» sieht, kann einen Link dazu teilen. Wer den Link hat, sieht die Zeichnung auf der Karte, deinen Benutzernamen, den Titel, die Sportart und die Distanz, auch ohne MuW. Schalte das aus, und die Links funktionieren nicht mehr.",
  // src/feed/AddToFeed.tsx and addToFeedEntries.ts (TASK-476, TASK-481:
  // the Feed's «+»; the English approved by the user, 2026-11-21).
  "Add to Feed": "Zum Feed hinzufügen",
  "Record now": "Jetzt aufzeichnen",
  "Start an activity now": "Starte jetzt eine Aktivität",
  // src/feed/addToFeedEntries.ts and PastActivityPost.tsx (TASK-481 part F:
  // «Already recorded», an activity of «My activities» posted from the «+»).
  "Already recorded": "Schon aufgezeichnet",
  "Post an activity from My activities": "Poste eine Aktivität aus Meine Aktivitäten",
  "Your activities not in the Feed yet, the latest first.":
    "Deine Aktivitäten, die noch nicht im Feed sind, die neueste zuerst.",
  "All your activities are in the Feed already.":
    "Alle deine Aktivitäten sind schon im Feed.",
  "Choose «Everyone» or «Followers» and it goes in the Feed.":
    "Wähle «Alle» oder «Follower», und sie kommt in den Feed.",
  // src/imports/PhotoPostForm.tsx, AddPastActivity.tsx and
  // src/feed/PhotoPostSettings.tsx (TASK-312 part C: posts of photos only;
  // the first three approved by the user, 2026-11-21, the deletion's with
  // the screenshots, 2026-11-22).
  "Photos only": "Nur Fotos",
  "Up to 10 photos, also from Instagram": "Bis zu 10 Fotos, auch von Instagram",
  "Add at least one photo.": "Füge mindestens ein Foto hinzu.",
  "Delete this post? It cannot be undone.":
    "Diesen Beitrag löschen? Das kann nicht rückgängig gemacht werden.",
  "Delete post": "Beitrag löschen",
  // Snowshoes (TASK-413 parts B and C, ADR-0342): approved by the user,
  // 2026-11-08 and 2026-11-12.
  Snowshoes: "Schneeschuhe",
  "Off-trail on snow: check the avalanche bulletin first.":
    "Abseits der Wege im Schnee: Schau zuerst in den Lawinenlagebericht.",
  "Before you head out on snowshoes": "Bevor du mit Schneeschuhen losgehst",
  "Check the avalanche bulletin and the weather before you go. MuW does not know them.":
    "Prüf vor dem Start den Lawinenlagebericht und das Wetter. MuW kennt sie nicht.",
  "The route avoids slopes over 25°, woods, pistes and rock. That does not make it safe: an avalanche can come from above.":
    "Die Route meidet Hänge über 25°, Wälder, Pisten und Fels. Sicher ist sie dadurch nicht: Eine Lawine kann von oben kommen.",
  "Stay off the pistes and follow the local rules: parks, reserves, wildlife quiet zones, private land. MuW does not know them all.":
    "Geh nicht auf Pisten und halte dich an die Regeln vor Ort: Parks, Schutzgebiete, Wildruhezonen, Privatgrund. MuW kennt nicht alle.",
  "Never go alone, tell someone where you are going, and turn back if the snow or the weather changes.":
    "Geh nicht allein, sag jemandem, wohin du gehst, und kehr um, wenn sich Schnee oder Wetter ändern.",
  "There is no open snow near this start. Start within 2 km of open snow, away from towns, woods and pistes.":
    "In der Nähe dieses Starts gibt es keinen freien Schnee. Starte höchstens 2 km von freiem Schnee entfernt, abseits von Orten, Wäldern und Pisten.",
  "There is no open snow near this start. Start within 1 mile of open snow, away from towns, woods and pistes.":
    "In der Nähe dieses Starts gibt es keinen freien Schnee. Starte höchstens 1 Meile von freiem Schnee entfernt, abseits von Orten, Wäldern und Pisten.",
  "This shape does not fit on the snow here at this distance. It fits at about {km} km.":
    "Diese Form passt hier bei dieser Distanz nicht auf den Schnee. Sie passt bei etwa {km} km.",
  "This shape does not fit on the snow here at this distance. It fits at about {mi} mi.":
    "Diese Form passt hier bei dieser Distanz nicht auf den Schnee. Sie passt bei etwa {mi} mi.",
  "This shape does not fit on the snow here. Try a shorter distance, another shape, or another start:":
    "Diese Form passt hier nicht auf den Schnee. Versuch eine kürzere Distanz, eine andere Form oder einen anderen Start:",
  "{name} · on the snow · target {km} km": "{name} · auf dem Schnee · Ziel {km} km",
  "{name} · on the snow · target {mi} mi": "{name} · auf dem Schnee · Ziel {mi} mi",
  "White: where you walked.": "Weiß: wo du gegangen bist.",
  // TASK-305 part R6b: on foot and in the air (approved 2026-11-12).
  "In the air": "In der Luft",
  "MuW switches by itself; touch to correct it.":
    "MuW wechselt von selbst; tippe, um es zu korrigieren.",
  "On foot {foot} · In the air {air}": "Zu Fuß {foot} · In der Luft {air}",
  // src/liveShare/ (TASK-468 part B1: «Send in MuW», the heart rate, the
  // live in the app; en and it approved by the user 2026-11-12)
  "Send in MuW": "In MuW senden",
  "Show my heart rate": "Meinen Puls zeigen",
  "Off: nobody sees your heart rate. On: they see it when a watch sends it.":
    "Aus: Niemand sieht deinen Puls. An: Sie sehen ihn, wenn eine Uhr ihn sendet.",
  "Choose who gets your live": "Wähle, wer dein Live bekommt",
  "They can follow you in the app: your exact position on the map, the route so far, distance, time, pace or speed, elevation gain and calories.":
    "Sie folgen dir in der App: deine genaue Position auf der Karte, die bisherige Strecke, Distanz, Zeit, Pace oder Tempo, Höhenmeter und Kalorien.",
  "Send ({count})": "Senden ({count})",
  "Live ended": "Live beendet",
  "Finished · {distance} · {time}": "Beendet · {distance} · {time}",
  "No update since {time}": "Keine Aktualisierung seit {time}",
  "Updated {seconds} s ago": "Vor {seconds} s aktualisiert",
  "LIVE · {sport} · {distance}": "LIVE · {sport} · {distance}",
  "🔴 Live": "🔴 Live",
  // The «Sleep» card of the profile (TASK-467 part B3): src/profile/OwnSleep.tsx
  // («On your profile» is with the prizes, «Only you see this» with the VO₂ max)
  "Show my sleep from Apple Health": "Meinen Schlaf aus Apple Health zeigen",
  "MuW works out a sleep score from your Apple Health sleep data.":
    "MuW berechnet aus deinen Schlafdaten in Apple Health einen Schlafwert.",
  "Share your sleep?": "Deinen Schlaf teilen?",
  "Your score, hours slept and sleep stages show on your profile, to everyone who can see it.":
    "Dein Wert, die geschlafenen Stunden und die Schlafphasen sind auf deinem Profil zu sehen, für alle, die es sehen können.",
  "No sleep data for last night in Apple Health.":
    "Keine Schlafdaten für letzte Nacht in Apple Health.",
  "MuW can't read your sleep. Allow it in the Health app: your profile › Apps › MuW.":
    "MuW kann deinen Schlaf nicht lesen. Erlaube es in der Health-App: dein Profil › Apps › MuW.",
  "Stop sharing@@sleep": "Nicht mehr teilen",

  // src/sports/alpinism.ts, src/mountain/climbNotice.ts (TASK-463 part B, approved by the user on 2026-11-12)
  Mountaineering: "Bergsteigen",
  "No shapes up a mountain: MuW records your day.":
    "Keine Formen am Berg: MuW zeichnet deinen Tag auf.",
  // The sport of TASK-475 (ADR-0386): src/sports/stretching.ts.
  Stretching: "Dehnen",
  // «Draw» with the sport «Stretching» (TASK-475 part B), approved by the
  // user on 2026-11-21.
  "Start stretching": "Dehnen starten",
  "No route for stretching: choose a routine and MuW guides you.":
    "Keine Route beim Dehnen: Wähle eine Routine, MuW führt dich.",
  "Before you climb": "Bevor du aufsteigst",
  "MuW records your climb and shares it: it does not guide you. Go with your own gear, skills and judgement, and check the conditions before you set off.":
    "MuW zeichnet deinen Aufstieg auf und teilt ihn: Es führt dich nicht. Geh mit deiner Ausrüstung, deinem Können und deinem Urteil, und prüfe die Verhältnisse vor dem Start.",
  // TASK-305 part R6c: the map of a race (approved 2026-11-12).
  "White: on foot. Yellow: in the air.": "Weiß: zu Fuß. Gelb: in der Luft.",
  // src/liveShare/ (TASK-468 part B2a: the «Live» row, «Live in the Feed»,
  // the stop of a share without a link; en and it approved 2026-11-12)
  "Live in the Feed": "Live im Feed",
  "Who can follow": "Wer dir folgen kann",
  "Remind me": "Erinnere mich",
  "We'll notify you when it starts.": "Wir benachrichtigen dich, wenn es losgeht.",
  "Nobody can follow you any more.": "Niemand kann dir mehr folgen.",
  "Live · {day} {time} · {title}": "Live · {day} {time} · {title}",
  // src/liveShare/ (TASK-468 part B2b1: «Plan a live», the start of a
  // planned live; en and it approved 2026-11-12, «Plan» and the error on 2026-11-18)
  "Plan a live": "Live planen",
  "Name (e.g. Milano Marathon)": "Name (z. B. Milano Marathon)",
  "Day and time": "Tag und Uhrzeit",
  'Start live "{title}"?': "Live „{title}“ starten?",
  "Your followers can follow you now.": "Deine Follower können dir jetzt folgen.",
  "Everyone can follow you now.": "Alle können dir jetzt folgen.",
  "Start live": "Live starten",
  "Not this time": "Diesmal nicht",
  Plan: "Planen",
  "Couldn't plan the live. Try again.":
    "Das Live konnte nicht geplant werden. Versuch es noch einmal.",
  // src/liveShare/plannedPost.ts (TASK-468 part B2b2: the live becomes the
  // post; en and it approved by the user 2026-11-12)
  "Post it in the Feed?": "Im Feed posten?",
  "Your live becomes the post of this activity.":
    "Dein Live wird zum Post dieser Aktivität.",
  "Don't post": "Nicht posten",
  // Group runs (TASK-309 part B; it from the proposal, de/es/fr for the user's yes).
  "Create group run": "Gruppenlauf erstellen",
  "New group run": "Neuer Gruppenlauf",
  "Where exactly": "Wo genau",
  Notes: "Notizen",
  "e.g. MUSE entrance": "z. B. Eingang des MUSE",
  "Pace, what to bring…": "Tempo, was mitbringen…",
  "Meet in a public place, never at your home. MuW doesn't organise or check group runs. Everyone on MuW is 16 or older.":
    "Trefft euch an einem öffentlichen Ort, nie bei dir zu Hause. MuW organisiert und prüft keine Gruppenläufe. Alle auf MuW sind mindestens 16 Jahre alt.",
  Publish: "Veröffentlichen",
  "Group runs": "Gruppenläufe",
  "1 going": "1 dabei",
  "{count} going": "{count} dabei",
  "I'm going": "Ich bin dabei",
  "You're going": "Du bist dabei",
  "Not going": "Nicht mehr dabei",
  Organiser: "Organisiert",
  "Cancel group run": "Gruppenlauf absagen",
  "Cancel this group run? Everyone going gets a notice.":
    "Diesen Gruppenlauf absagen? Alle, die dabei sind, bekommen eine Nachricht.",
  Cancelled: "Abgesagt",
  Over: "Vorbei",
  Past: "Vergangene",
  // src/air/ (TASK-479 part B1: the flight screen; notices and texts approved by the user on 2026-11-21)
  "Flight screen": "Flugbildschirm",
  "GPS altitude": "GPS-Höhe",
  "Above takeoff": "Über Startplatz",
  "Average vario": "Mittleres Vario",
  "Thermal average": "Thermikschnitt",
  "Thermal gain": "Thermikgewinn",
  "Ground speed": "Geschw. über Grund",
  Track: "Kurs",
  "Glide ratio": "Gleitzahl",
  Wind: "Wind",
  "Thermal assistant": "Thermikassistent",
  Takeoff: "Startplatz",
  Clock: "Uhrzeit",
  "GPS accuracy": "GPS-Genauigkeit",
  Live: "Live",
  "Last 10 min": "Letzte 10 Min.",
  Thermal: "Thermik",
  XC: "XC",
  Minimal: "Minimal",
  Look: "Aussehen",
  Sunlight: "Sonnenlicht",
  "Hold to unlock": "Zum Entsperren halten",
  Lock: "Sperren",
  "Not sharing": "Nicht geteilt",
  "From {bearing} · {minutes} min ago": "Aus {bearing} · vor {minutes} Min.",
  "GPS numbers · not a certified instrument":
    "GPS-Werte · kein zertifiziertes Instrument",
  // «Together» in «Edit video» (TASK-417 part D2b; approved by the user on 2026-11-08).
  Together: "Zusammen",
  "Your run and the runs of the people tagged here, on the same clock.":
    "Dein Lauf und die Läufe der hier markierten Personen, auf derselben Uhr.",
  "No one tagged ran at the same time.":
    "Niemand der Markierten ist zur selben Zeit gelaufen.",
  "Up to 4 people in one video.": "Bis zu 4 Personen in einem Video.",
  "Log in to see this drawing.": "Melde dich an, um diese Zeichnung zu sehen.",
  // src/air/ (TASK-479 part B2: the flight screen's editor; texts approved by the user on 2026-11-21)
  "Edit layout": "Layout bearbeiten",
  "Page {n} of {count}": "Seite {n} von {count}",
  Size: "Größe",
  Unit: "Einheit",
  "Add page": "Seite hinzufügen",
  "Remove page": "Seite entfernen",
  Duplicate: "Duplizieren",
  "Back to preset": "Zurück zur Vorlage",
  "Undo every change to this layout?": "Alle Änderungen an diesem Layout verwerfen?",
  "Delete this layout?": "Dieses Layout löschen?",
  "Send file": "Datei senden",
  "Load file": "Datei laden",
  "No room there.": "Dort ist kein Platz.",
  "No room on this page.": "Auf dieser Seite ist kein Platz.",
  "No room for another size.": "Kein Platz für eine andere Größe.",
  "No room for another page.": "Kein Platz für eine weitere Seite.",
  "No room for another layout.": "Kein Platz für ein weiteres Layout.",
  "This file is not a MuW layout.": "Diese Datei ist kein MuW-Layout.",
  "This layout is from a newer MuW: update the app.":
    "Dieses Layout stammt aus einer neueren MuW-Version: Aktualisiere die App.",
  "MuW could not read this file.": "MuW konnte diese Datei nicht lesen.",
  "MuW could not share the file.": "MuW konnte die Datei nicht teilen.",
  // src/mapdraw/ (TASK-347 part C: a drawing anchored to the roads; texts approved by the user on 2026-11-22)
  "Snapping to roads…": "Wird an Straßen angepasst…",
  "Roads follow your drawing: {percent}%":
    "Die Straßen folgen deiner Zeichnung: {percent} %",
  "No roads here: this line stays as you drew it.":
    "Hier gibt es keine Straßen: Die Linie bleibt, wie du sie gezeichnet hast.",
  // TASK-483 B: the history of an exercise at the gym.
  "Last time · {day}": "Letztes Mal · {day}",
  History: "Verlauf",
  "Try {set}": "Versuch {set}",
  "Try {set} again": "Versuch nochmal {set}",
  "{count} rep": "{count} Wiederholung",
  "{count} reps": "{count} Wiederholungen",
  "Estimated max": "Geschätztes Maximum",
  "Best set (reps)": "Bester Satz (Wdh.)",
  "Longest set": "Längster Satz",
  Farthest: "Weiteste Distanz",
  "All time": "Gesamt",
  Records: "Rekorde",
  Heaviest: "Schwerstes Gewicht",
  "Most reps": "Meiste Wiederholungen",
  "Best volume": "Bestes Volumen",
  "Longest time": "Längste Zeit",
  "{count} workout": "{count} Training",
  "{count} workouts": "{count} Trainings",
  PR: "PR",
  "Estimated from your sets of up to 12 reps.":
    "Geschätzt aus deinen Sätzen mit bis zu 12 Wiederholungen.",
  "No workouts in this period.": "Keine Trainings in diesem Zeitraum.",
  "No workouts with this exercise yet.": "Noch keine Trainings mit dieser Übung.",
  "From {low} to {high}, {count} workouts": "Von {low} bis {high}, {count} Trainings",
  // src/air/ (TASK-479 part C: the vario's sound; texts approved by the user on 2026-11-22)
  "Vario sound": "Vario-Ton",
  "Beeps from": "Piepen ab",
  "Sink tone below": "Sinkton unter",
  Volume: "Lautstärke",
  "From GPS: the sound comes 1–2 s after the climb.":
    "Vom GPS: Der Ton kommt 1–2 s nach dem Steigen.",
  "Mute the vario": "Vario stummschalten",
  "Turn the vario sound on": "Vario-Ton einschalten",

  // src/gear/ (TASK-486 part B, the gear), approved by the user on 2026-11-22
  Shoes: "Schuhe",
  Skis: "Ski",
  "Ski boots": "Skischuhe",
  Snowboard: "Snowboard",
  Poles: "Stöcke",
  Boots: "Bergschuhe",
  "Climbing shoes": "Kletterschuhe",
  Harness: "Klettergurt",
  Helmet: "Helm",
  Rope: "Seil",
  Crampons: "Steigeisen",
  "Ice axe": "Eispickel",
  "Inline skates": "Inlineskates",
  Sail: "Segel",
  Board: "Board",
  Boat: "Boot",
  Wetsuit: "Neoprenanzug",
  Paraglider: "Gleitschirm",
  Wheelchair: "Rollstuhl",
  Clothing: "Kleidung",
  Backpack: "Rucksack",
  Watch: "Uhr",
  "Add gear": "Ausrüstung hinzufügen",
  "Add your shoes, your bike, your skis and everything you use. Each activity you take them on adds to their kilometres and hours.":
    "Füge deine Schuhe, dein Rad, deine Ski und alles hinzu, was du benutzt. Jede Aktivität, bei der du sie dabeihast, zählt zu ihren Kilometern und Stunden.",
  "Past its limit": "Über seinem Limit",
  Retired: "Ausgemustert",
  Kind: "Art",
  Brand: "Marke",
  Model: "Modell",
  "Your name for it": "Dein Name dafür",
  Bought: "Gekauft",
  Month: "Monat",
  Year: "Jahr",
  "Month bought": "Kaufmonat",
  "Year bought": "Kaufjahr",
  Note: "Notiz",
  "Where you bought it, a race you ran in it…":
    "Wo du es gekauft hast, ein Rennen damit…",
  Limit: "Limit",
  "MuW tells you when it passes this.": "MuW sagt dir, wenn es das überschreitet.",
  "Use by default for": "Standardmäßig für",
  "Activities of these sports start with it chosen.":
    "Aktivitäten dieser Sportarten starten damit ausgewählt.",
  "Hide from profile": "Im Profil ausblenden",
  "Others don't see it. Its kilometres still count.":
    "Andere sehen es nicht. Seine Kilometer zählen trotzdem.",
  Retire: "Ausmustern",
  "Out of your choices, with its kilometres kept.":
    "Nicht mehr zur Auswahl, seine Kilometer bleiben.",
  "Delete this gear?": "Diese Ausrüstung löschen?",
  "Its photo goes too. Your activities stay.":
    "Das Foto wird auch gelöscht. Deine Aktivitäten bleiben.",
  "Say the brand.": "Gib die Marke an.",
  "Write the month (1 to 12) and the year it was bought.":
    "Gib den Monat (1 bis 12) und das Jahr des Kaufs an.",
  "Write the limit as a number of {unit}.": "Gib das Limit als Zahl in {unit} an.",
  "These words can't be used. Try other words.":
    "Diese Wörter sind nicht erlaubt. Versuch andere.",
  "Links and special characters can't be used here.":
    "Links und Sonderzeichen sind hier nicht erlaubt.",

  // src/gym/GymByHand.tsx (TASK-484 B: a gym workout written by hand)
  "Gym workout": "Fitnesstraining",
  Started: "Begonnen um",
  Duration: "Dauer",
  "Pick a time before now.": "Wähle eine Zeit vor jetzt.",
  "From a plan": "Aus einem Plan",
  "A workout you already did, written by hand":
    "Ein Training, das du schon gemacht hast, von Hand eingetragen",
  "Workouts written by hand don't count for Play, contests, levels or the leaderboard.":
    "Von Hand eingetragene Trainings zählen nicht für das Spiel, die Wettbewerbe, die Stufen und die Rangliste.",
  // src/gear/GearPicker.tsx, ActivityGear.tsx (TASK-486 part C), approved by the user on 2026-11-23
  "Up to {count} items on an activity.":
    "Bis zu {count} Ausrüstungsteile pro Aktivität.",
  "This activity is still on its way. Try again in a moment.":
    "Diese Aktivität ist noch unterwegs. Versuch es gleich noch einmal.",
  // src/gear/GearTagChoice.tsx (TASK-486 part F), approved by the user on 2026-11-23
  "From my gear": "Aus meiner Ausrüstung",

  // src/feed/addToFeedEntries.ts (TASK-485 B2, English approved 2026-11-21)
  "Share one of your gym plans": "Teile einen deiner Gym-Pläne",
  // src/feed/PlanPostFlow.tsx, PlanPostTile.tsx, PlanPostDetail.tsx (TASK-485 B, English approved 2026-11-21)
  "Choose a plan": "Plan auswählen",
  "No plans yet: make one in Gym › Plans.":
    "Noch keine Pläne: Erstelle einen unter Fitnessstudio › Pläne.",
  "Say something about this plan (optional)": "Schreib etwas zu diesem Plan (optional)",
  "Who sees it: {who}": "Wer ihn sieht: {who}",
  "Workout plan": "Trainingsplan",
  "{count} day a week": "{count} Tag pro Woche",
  "{count} days a week": "{count} Tage pro Woche",
  "Use this plan": "Diesen Plan nutzen",
  "Added to your plans": "Zu deinen Plänen hinzugefügt",
  "You already have 20 plans: delete one to add this.":
    "Du hast schon 20 Pläne: Lösche einen, um diesen hinzuzufügen.",
  "Delete this post?": "Diesen Beitrag löschen?",
  "Copies already made stay with whoever made them.":
    "Schon erstellte Kopien bleiben bei denen, die sie erstellt haben.",

  // The post of a night of sleep (TASK-467 part E).
  Sleep: "Schlaf",
  "Already in the Feed": "Schon im Feed",
  "Remove post": "Beitrag entfernen",
  "Last night's sleep score, from Apple Health":
    "Dein Schlafwert der letzten Nacht, aus Apple Health",
  "Your score, hours slept and sleep stages go in the Feed.":
    "Dein Wert, die geschlafenen Stunden und die Schlafphasen kommen in den Feed.",
  // src/air/ (TASK-479 part A1: the flight map and the height above the ground; texts approved by the user on 2026-11-22)
  "Height above ground": "Höhe über Grund",
  "Heading up": "Kurs oben",
  "North up": "Norden oben",
  // The plan that adapts (TASK-488): gym/AdaptQuestion.tsx, gym/GymPlans.tsx.
  "Easy@@feel": "Leicht",
  "Right@@feel": "Passend",
  "Hard@@feel": "Hart",
  "could do more": "hätte mehr gekonnt",
  "as planned": "wie geplant",
  "at my limit": "am Limit",
  "Next time the plan adjusts to your answer.":
    "Beim nächsten Mal passt sich der Plan deiner Antwort an.",
  "No answer? It goes on as planned.": "Keine Antwort? Es geht wie geplant weiter.",
  "Easy: up we go": "Leicht: eine Stufe mehr",
  "Right: as planned": "Passend: wie geplant",
  "Hard: the same next time": "Hart: nächstes Mal gleich",
  "Hard again: one step back": "Wieder hart: eine Stufe zurück",
  "Change@@answer": "Ändern",
  "Next {day}, {name}:": "Nächstes Mal ({day}), {name}:",
  "Easy: one step more than planned. Right: as planned. Hard: the same next time; after two «Hard» in a row, one step back.":
    "Leicht: eine Stufe mehr als geplant. Passend: wie geplant. Hart: nächstes Mal gleich; nach zweimal „Hart“ hintereinander eine Stufe zurück.",
  "{run} of the plan: how did it go?": "{run} des Plans: Wie war's?",
  "↑ one step more · = the same · ↓ one step back":
    "↑ eine Stufe mehr · = gleich · ↓ eine Stufe zurück",
  "Adapts to how it went": "Passt sich an, wie es lief",
  "Off: no question at the end, the weeks grow as planned.":
    "Aus: am Ende keine Frage, die Wochen steigen wie geplant.",
  "Next week is the lighter one, to recover.":
    "Nächste Woche ist die leichtere, zum Erholen.",
  "How did the plan feel?": "Wie fühlte sich der Plan an?",
  // src/air/ (TASK-479 part E1: the pilot's airspace file; notices 3 and 4 approved by the user on 2026-11-21, the other texts on 2026-11-23)
  "No airspace loaded. MuW does not include airspace data.":
    "Kein Luftraum geladen. MuW enthält keine Luftraumdaten.",
  "Data loaded by you: check the AIP and NOTAMs before you fly. · {file} · loaded {date}":
    "Von dir geladene Daten: Prüfe AIP und NOTAMs vor dem Flug. · {file} · geladen am {date}",
  Airspace: "Luftraum",
  "Airspaces: {count}": "Lufträume: {count}",
  "Lines not read: {n}": "Nicht gelesene Zeilen: {n}",
  "This file has no airspace MuW can read.":
    "Diese Datei enthält keinen Luftraum, den MuW lesen kann.",
  // src/route/warnings.ts (TASK-347 part C3: an anchored drawing longer or shorter on the roads; texts to approve)
  "On the roads your drawing is {share}% longer: {distance}. It stays where you drew it, at the same size.":
    "Auf den Straßen ist deine Zeichnung {share} % länger: {distance}. Sie bleibt, wo du sie gezeichnet hast, in derselben Größe.",
  "On the roads your drawing is {share}% shorter: {distance}. It stays where you drew it, at the same size.":
    "Auf den Straßen ist deine Zeichnung {share} % kürzer: {distance}. Sie bleibt, wo du sie gezeichnet hast, in derselben Größe.",
  // TASK-491 Coach: coach/CoachPage.tsx, coach/TipCard.tsx, coach/tipText.ts, coach/nextTime.ts.
  Coach: "Coach",
  "Based on your last 4 weeks": "Aus deinen letzten 4 Wochen",
  "Apply to plan": "In den Plan übernehmen",
  "Add to {day}": "Zu {day} hinzufügen",
  "Create an account to get tips from your workouts":
    "Erstelle ein Konto, um Tipps aus deinen Trainings zu bekommen",
  "Log a few workouts and your tips will show up here":
    "Trag ein paar Trainings ein, dann erscheinen hier deine Tipps",
  "Go to your workouts": "Zu deinen Trainings",
  "Tips are general, not medical advice. If something hurts, stop and ask a professional.":
    "Die Tipps sind allgemein und keine ärztliche Beratung. Wenn etwas wehtut, hör auf und frag eine Fachperson.",
  "{exercise}: {kg} kg": "{exercise}: {kg} kg",
  "You did all your reps at {old} kg twice in a row. Add weight and start again from {min} reps.":
    "Du hast zweimal in Folge alle Wiederholungen mit {old} kg geschafft. Mehr Gewicht, und wieder ab {min} Wiederholungen.",
  "{exercise}: one more rep": "{exercise}: eine Wiederholung mehr",
  "You did all your reps twice in a row. Add one rep to each set.":
    "Du hast zweimal in Folge alle Wiederholungen geschafft. Eine Wiederholung mehr pro Satz.",
  "You stopped below {min} reps twice in a row. A little less weight helps you finish your sets.":
    "Du bist zweimal in Folge unter {min} Wiederholungen geblieben. Mit etwas weniger Gewicht schaffst du deine Sätze.",
  "{exercise} has stalled": "{exercise} stagniert",
  "Your estimated max hasn't moved in 3 workouts. Try {min2}–{max2} reps for the next weeks.":
    "Dein geschätztes Maximum hat sich in 3 Trainings nicht bewegt. Versuch in den nächsten Wochen {min2}–{max2} Wiederholungen.",
  "Add {n} sets for {muscle}": "{n} Sätze mehr für {muscle}",
  "{muscle} got {sets} sets this week. Around 10 a week builds muscle better.":
    "{muscle}: {sets} Sätze diese Woche. Mit etwa 10 pro Woche wächst der Muskel besser.",
  "A lot for {muscle}": "Viel für {muscle}",
  "{muscle} got {sets} sets this week. Above 20 adds tiredness more than muscle.":
    "{muscle}: {sets} Sätze diese Woche. Über 20 bringen mehr Müdigkeit als Muskel.",
  "Train {muscle} twice a week": "{muscle} zweimal pro Woche trainieren",
  "All your {muscle} sets are on {day}. Split them over two days for more growth.":
    "Alle Sätze für {muscle} liegen am {day}. Verteil sie auf zwei Tage, dann wächst mehr.",
  "{muscle} is still recovering": "{muscle} erholt sich noch",
  "You trained it hard {hours} hours ago. Today pick another muscle, or keep it light.":
    "Du hast ihn vor {hours} Stunden hart trainiert. Nimm heute einen anderen Muskel oder trainier leicht.",
  "Keep {km} km this week": "Diese Woche bei {km} km bleiben",
  "Last week you ran {pct}% more than your usual. Hold the distance before adding more.":
    "Letzte Woche bist du {pct} % mehr gelaufen als sonst. Halte die Distanz, bevor du steigerst.",
  "Next run: slow and long": "Nächster Lauf: langsam und lang",
  "Only {pct}% of your running was easy. Most of it should feel easy, around 80%.":
    "Nur {pct} % deines Laufens war locker. Das meiste sollte locker sein, etwa 80 %.",
  "Maybe a lighter week": "Vielleicht eine leichtere Woche",
  "This week's load is high compared with the last month.":
    "Die Belastung dieser Woche ist hoch im Vergleich zum letzten Monat.",
  "Time for an easy week": "Zeit für eine leichte Woche",
  "{weeks} weeks of steady work. Do about half the sets this week, same weights.":
    "{weeks} Wochen konstante Arbeit. Mach diese Woche etwa die Hälfte der Sätze, gleiche Gewichte.",
  "Short night: go lighter": "Kurze Nacht: leichter trainieren",
  "Your sleep score was {score}. Same workout today, one set less per exercise.":
    "Dein Schlafwert war {score}. Heute dasselbe Training, ein Satz weniger pro Übung.",
  "Welcome back": "Willkommen zurück",
  "You've been away {days} days. Start this week at about 85% of your weights.":
    "Du warst {days} Tage weg. Starte diese Woche mit etwa 85 % deiner Gewichte.",
  "One more strength day": "Ein Krafttag mehr",
  "{count} strength day this week. Two a week keep muscles and bones strong.":
    "{count} Krafttag diese Woche. Zwei pro Woche halten Muskeln und Knochen stark.",
  "{count} strength days this week. Two a week keep muscles and bones strong.":
    "{count} Krafttage diese Woche. Zwei pro Woche halten Muskeln und Knochen stark.",
  "Why: {reason}": "Warum: {reason}",
  "Double progression · ACSM 2009": "Doppelte Progression · ACSM 2009",
  "Load that fits the reps · ACSM 2009":
    "Gewicht passend zu den Wiederholungen · ACSM 2009",
  "Change the stimulus · ACSM 2009": "Den Reiz wechseln · ACSM 2009",
  "Weekly volume · Schoenfeld 2017": "Wochenvolumen · Schoenfeld 2017",
  "Frequency · Schoenfeld 2016": "Häufigkeit · Schoenfeld 2016",
  "48 hours to recover · ACSM 2009": "48 Stunden Erholung · ACSM 2009",
  "Safe increase · Nielsen 2014": "Sichere Steigerung · Nielsen 2014",
  "80/20 · Seiler 2010": "80/20 · Seiler 2010",
  "Workload ratio · Gabbett 2016": "Belastungsverhältnis · Gabbett 2016",
  "Deload · Bosquet 2007": "Entlastung · Bosquet 2007",
  "Sleep and performance · Fullagar 2015": "Schlaf und Leistung · Fullagar 2015",
  "Coming back · Mujika 2000": "Wiedereinstieg · Mujika 2000",
  "WHO guidelines 2020": "WHO-Leitlinien 2020",
  OK: "OK",
  "Nothing to change for now: keep going.": "Im Moment nichts zu ändern: weiter so.",
  "Next time: {exercise} {kg} kg": "Nächstes Mal: {exercise} {kg} kg",
  // src/air/ (TASK-479 part E2: airspaces in flight; notices 5 and 7 approved by the user on 2026-11-21, the other texts on 2026-11-23)
  "Nearest airspace": "Nächster Luftraum",
  inside: "innen",
  "{name} ({class}) · {dist} · floor {floor}":
    "{name} ({class}) · {dist} · Untergrenze {floor}",
  "FL limits from GPS altitude (≈).": "FL-Grenzen aus der GPS-Höhe (≈).",
  "Warn within": "Warnen innerhalb",
  "Warn above or below": "Warnen darüber oder darunter",
  "Warning sound": "Warnton",
  // src/nutrition (TASK-489 part B1)
  "Food@@nutrition": "Essen",
  Nutrition: "Ernährung",
  "Before you start": "Bevor du anfängst",
  "MuW does not provide diets, meal plans or medical advice. The plan here is the one you write: your own, or the one your dietitian gave you.":
    "MuW gibt keine Diäten, Ernährungspläne oder medizinischen Ratschläge. Der Plan hier ist der, den du schreibst: dein eigener oder der von deiner Ernährungsfachkraft.",
  "Every number is an estimate, from food composition tables and from formulas for the energy you use.":
    "Jede Zahl ist eine Schätzung aus Nährwerttabellen und aus Formeln für die Energie, die du verbrauchst.",
  "If you have a medical condition, are pregnant or have a history of eating disorders, talk to a doctor or a dietitian before counting calories.":
    "Wenn du eine Erkrankung hast, schwanger bist oder eine Essstörung hattest, sprich mit einer Ärztin, einem Arzt oder einer Ernährungsfachkraft, bevor du Kalorien zählst.",
  "Estimates only. MuW does not provide diets or medical advice.":
    "Nur Schätzungen. MuW gibt keine Diäten oder medizinischen Ratschläge.",
  "Previous day": "Vorheriger Tag",
  "Next day": "Nächster Tag",
  Eaten: "Gegessen",
  "Used (est.)": "Verbraucht (gesch.)",
  Balance: "Bilanz",
  "Set my daily target": "Mein Tagesziel festlegen",
  "My daily target": "Mein Tagesziel",
  "(set by you)": "(von dir festgelegt)",
  Left: "Übrig",
  "kcal a day": "kcal pro Tag",
  "Your own number, or the one your dietitian gave you. MuW never suggests one.":
    "Deine eigene Zahl oder die von deiner Ernährungsfachkraft. MuW schlägt nie eine vor.",
  "Remove target": "Ziel entfernen",
  Breakfast: "Frühstück",
  Lunch: "Mittagessen",
  Dinner: "Abendessen",
  Snacks: "Snacks",
  "Add food": "Lebensmittel hinzufügen",
  "Add to breakfast": "Zum Frühstück hinzufügen",
  "Add to lunch": "Zum Mittagessen hinzufügen",
  "Add to dinner": "Zum Abendessen hinzufügen",
  "Add to snacks": "Zu den Snacks hinzufügen",
  "Search food": "Lebensmittel suchen",
  "My food": "Mein Lebensmittel",
  "No food found.": "Kein Lebensmittel gefunden.",
  "Add my own food": "Eigenes Lebensmittel hinzufügen",
  Grams: "Gramm",
  Estimate: "Schätzung",
  "My own food": "Eigenes Lebensmittel",
  "Calories in 100 g (kcal)": "Kalorien in 100 g (kcal)",
  "Copy the number from the label, or from your dietitian's sheet.":
    "Übernimm die Zahl vom Etikett oder vom Blatt deiner Ernährungsfachkraft.",
  "Delete food": "Lebensmittel löschen",
  // src/nutrition (TASK-489 part B2)
  Diary: "Tagebuch",
  "My plan": "Mein Plan",
  "Eaten as planned": "Wie geplant gegessen",
  "Copy this day to…": "Diesen Tag kopieren nach…",
  "This is the plan you write. MuW never changes it.":
    "Das ist der Plan, den du schreibst. MuW ändert ihn nie.",
  "How we calculate": "So rechnen wir",
  "Food@@numbers": "Lebensmittel",
  "Energy you use": "Energie, die du verbrauchst",
  Estimates: "Schätzungen",
  "Calories of the foods in the list come from USDA FoodData Central (SR Legacy, April 2018), a public-domain food composition table. Your own foods use the numbers you wrote.":
    "Die Kalorien der Lebensmittel in der Liste stammen aus USDA FoodData Central (SR Legacy, April 2018), einer gemeinfreien Nährwerttabelle. Deine eigenen Lebensmittel nutzen die Zahlen, die du eingetragen hast.",
  "At rest: the Mifflin-St Jeor equation, from the body data in your profile. Activities: ACSM equations and the 2024 Compendium of Physical Activities. On days when Apple Health has your active energy, that number is used instead.":
    "In Ruhe: die Mifflin-St-Jeor-Gleichung, aus den Körperdaten in deinem Profil. Aktivitäten: ACSM-Gleichungen und das Compendium of Physical Activities 2024. An Tagen, an denen Apple Health deine Aktivitätsenergie hat, wird stattdessen diese Zahl verwendet.",
  "Real values change with the product, the recipe and the person. MuW does not provide diets or medical advice.":
    "Die tatsächlichen Werte hängen vom Produkt, vom Rezept und von der Person ab. MuW gibt keine Diäten oder medizinischen Ratschläge.",
  // src/nutrition (TASK-489 part C1)
  "Today the energy at rest is counted up to now.":
    "Heute wird die Energie in Ruhe bis jetzt gezählt.",
  Surplus: "Überschuss",
  Deficit: "Defizit",
  "At rest": "In Ruhe",
  Activities: "Aktivitäten",
  "No activities on this day.": "Keine Aktivitäten an diesem Tag.",
  edited: "bearbeitet",
  "Log in to count your activities.": "Melde dich an, um deine Aktivitäten zu zählen.",
  "Your activities could not be loaded. Only the energy at rest is counted.":
    "Deine Aktivitäten konnten nicht geladen werden. Es wird nur die Energie in Ruhe gezählt.",
  "Energy at rest": "Energie in Ruhe",
  "Your own number, for example the one your dietitian measured. It takes the place of MuW's estimate.":
    "Deine eigene Zahl, zum Beispiel die von deiner Ernährungsfachkraft gemessene. Sie ersetzt die Schätzung von MuW.",
  "MuW's estimate: {kcal} kcal": "Schätzung von MuW: {kcal} kcal",
  "Back to the estimate": "Zurück zur Schätzung",
  "Calories of this activity": "Kalorien dieser Aktivität",
  "Your number stays on this phone. Your post and Apple Health keep theirs.":
    "Deine Zahl bleibt auf diesem Handy. Dein Beitrag und Apple Health behalten ihre.",
  // src/air/ (TASK-479 part E3: the airspace log after the flight; approved by the user on 2026-11-23)
  "Inside your airspaces: {count}": "In deinen Lufträumen: {count}",
  "No fix inside the volumes of your file.":
    "Kein Punkt in den Lufträumen deiner Datei.",
  "{from}–{to} · {name} ({class}) · {min} min":
    "{from}–{to} · {name} ({class}) · {min} min",
  "Deepest: {dist} from the edge, {height} from floor or ceiling":
    "Am tiefsten: {dist} vom Rand, {height} von Unter- oder Obergrenze",
  "Only on your phone: not in the Feed.": "Nur auf deinem Telefon: nicht im Feed.",
  // src/air/ (TASK-479 part D1: the pilot's waypoints and task; approved by the user on 2026-11-23)
  Waypoints: "Wegpunkte",
  Task: "Aufgabe",
  "Waypoints: {count} · Landings: {landings}":
    "Wegpunkte: {count} · Landeplätze: {landings}",
  "Turnpoints: {count}": "Wendepunkte: {count}",
  "First start: {time}": "Erster Start: {time}",
  "{file} · loaded {date}": "{file} · geladen am {date}",
  "This file has no waypoint MuW can read.":
    "Diese Datei enthält keinen Wegpunkt, den MuW lesen kann.",
  "This file is not a task MuW can read.":
    "Diese Datei ist keine Aufgabe, die MuW lesen kann.",
  // src/air/ (TASK-479 part D2: the task in flight; approved by the user on 2026-11-23)
  "Next turnpoint": "Nächster Wendepunkt",
  "Glide to goal": "Gleitflug zum Ziel",
  "Start gate": "Startfenster",
  "Task distance": "Aufgabendistanz",
  Competition: "Wettkampf",
  "Gate open": "Startfenster offen",
  "Started {time}": "Gestartet {time}",
  "Whole task: {distance}": "Ganze Aufgabe: {distance}",
  "No task loaded": "Keine Aufgabe geladen",
  "Goal taken": "Ziel erreicht",
  "Turnpoint {name} taken. Next: {next}.":
    "Wendepunkt {name} erreicht. Nächster: {next}.",
  "Goal {name} taken.": "Ziel {name} erreicht.",
  // src/air/ (TASK-479 part D3: the glide; approved by the user on 2026-11-23)
  "Glide to turnpoint": "Gleitflug zum Wendepunkt",
  "Nearest landing": "Nächster Landeplatz",
  "Glide ratio used": "Verwendete Gleitzahl",
  "Wind used": "Verwendeter Wind",
  Estimated: "Geschätzt",
  "No wind": "Kein Wind",
  "needs {height}": "braucht {height}",
  "No landings in your file": "Keine Landeplätze in deiner Datei",
  // src/nutrition (TASK-489 part D)
  "Calorie balance": "Kalorienbilanz",
  Used: "Verbraucht",
  "Previous week": "Vorherige Woche",
  "Next week": "Nächste Woche",
  "so far": "bisher",
  "Week total": "Wochensumme",
  "Today is not in the total until the day is over.":
    "Heute zählt erst zur Summe, wenn der Tag vorbei ist.",
  // src/nutrition (TASK-489 part D2: Nutrition from the profile; approved by the user on 2026-11-24)
  "Write what you eat and see your calorie balance.":
    "Schreib auf, was du isst, und sieh deine Kalorienbilanz.",
  "Open Nutrition": "Ernährung öffnen",
  // src/nutrition (TASK-489 part G1)
  "Type the code": "Code eingeben",
  Barcode: "Barcode",
  "Look up": "Suchen",
  "Looking it up…": "Suche läuft…",
  "Only the barcode goes to Open Food Facts, to find the product.":
    "Nur der Barcode geht an Open Food Facts, um das Produkt zu finden.",
  "from Open Food Facts": "von Open Food Facts",
  "Check the numbers against the label: you can correct them.":
    "Vergleiche die Zahlen mit dem Etikett: Du kannst sie korrigieren.",
  "Use this food": "Dieses Lebensmittel verwenden",
  "This product is not on Open Food Facts.":
    "Dieses Produkt ist nicht bei Open Food Facts.",
  "Open Food Facts has no calories for this product.":
    "Open Food Facts hat keine Kalorien für dieses Produkt.",
  "The product could not be looked up. Check your connection and try again.":
    "Das Produkt konnte nicht gesucht werden. Prüfe deine Verbindung und versuche es erneut.",
  "Products found by barcode contain data from Open Food Facts, available under the Open Database License. They are kept apart from the USDA list.":
    "Per Barcode gefundene Produkte enthalten Daten von Open Food Facts, verfügbar unter der Open Database License. Sie bleiben von der USDA-Liste getrennt.",
  "Only you see this page. What you write here stays on your phone; a barcode you look up goes to Open Food Facts.":
    "Diese Seite siehst nur du. Was du hier einträgst, bleibt auf deinem Handy; ein Barcode, den du suchst, geht an Open Food Facts.",

  // src/takeoffs (TASK-493 part C)
  Takeoffs: "Startplätze",
  "Zoom in to see the takeoffs.": "Zoome hinein, um die Startplätze zu sehen.",
  "Zoom in to see all the takeoffs.": "Zoome hinein, um alle Startplätze zu sehen.",
  Landing: "Landeplatz",
  "Unnamed takeoff": "Startplatz ohne Namen",
  "Unnamed landing": "Landeplatz ohne Namen",
  "Official site": "Offizieller Platz",
  Faces: "Ausrichtung",
  "Landings nearby": "Landeplätze in der Nähe",
  "{distance} away · {drop} lower": "{distance} entfernt · {drop} tiefer",
  "No landing within 15 km on OpenStreetMap.":
    "Kein Landeplatz im Umkreis von 15 km auf OpenStreetMap.",
  "Takeoffs above": "Startplätze darüber",
  "Flights from here": "Flüge von hier",
  "{flights} flights by {pilots} pilots": "{flights} Flüge von {pilots} Piloten",
  "Today: {count}": "Heute: {count}",
  "Few flights from here yet.": "Noch wenige Flüge von hier.",
  "In the air now: {count}": "Jetzt in der Luft: {count}",
  "Watch live": "Live ansehen",
  Highest: "Am höchsten",
  "Missing a takeoff? Add it on OpenStreetMap.":
    "Fehlt ein Startplatz? Füge ihn auf OpenStreetMap hinzu.",
  "The takeoffs could not be loaded.": "Die Startplätze konnten nicht geladen werden.",
  // src/air/ (TASK-479 part D4: the task passed on; approved by the user on 2026-11-23)
  "Share file": "Datei teilen",
  "Show QR": "QR zeigen",
  "Task for XCTrack": "Aufgabe für XCTrack",
  "This task is too long for a QR code.":
    "Diese Aufgabe ist zu lang für einen QR-Code.",
  // src/air/ (TASK-479 part B3: widgets dragged in the editor; approved by the user on 2026-11-26)
  "Drag a widget to move it, or its corner to size it. Touch it for more.":
    "Zieh ein Widget, um es zu verschieben, oder seine Ecke, um die Größe zu ändern. Tippe es an für mehr.",
  // src/groups (TASK-495 part B)
  "Find your city": "Deine Stadt suchen",
  "New group": "Neue Gruppe",
  "Choose photo": "Foto wählen",
  "Remove photo": "Foto entfernen",
  Description: "Beschreibung",
  "Sports (up to {count})": "Sportarten (bis zu {count})",
  City: "Stadt",
  "Who can join": "Wer beitreten kann",
  Invite: "Einladen",
  "Search by name": "Nach Namen suchen",
  "Nobody found.": "Niemand gefunden.",
  Invited: "Eingeladen",
  "Make admin": "Zum Admin machen",
  "Make {name} the admin? You become a member.":
    "{name} zum Admin machen? Du wirst Mitglied.",
  "Remove from group": "Aus der Gruppe entfernen",
  "Remove {name} from the group?": "{name} aus der Gruppe entfernen?",
  "Make co-admin": "Zum Co-Admin machen",
  "Remove co-admin": "Co-Admin entziehen",
  Members: "Mitglieder",
  "Leave group": "Gruppe verlassen",
  "Delete group": "Gruppe löschen",
  "Delete {name}? Its members, requests and invites go with it. This can't be undone.":
    "{name} löschen? Mitglieder, Anfragen und Einladungen werden mit gelöscht. Das lässt sich nicht rückgängig machen.",
  "Leave {name}?": "{name} verlassen?",
  Groups: "Gruppen",
  "Withdraw the request": "Anfrage zurückziehen",
  "Accept invite": "Einladung annehmen",
  Unmute: "Wieder laut",
  Mute: "Stummschalten",
  "Mute only stops the news of new outings.":
    "Stummschalten stoppt nur die Hinweise auf neue Ausflüge.",
  "Requests ({count})": "Anfragen ({count})",
  "Next outings": "Nächste Ausflüge",
  "No outings yet.": "Noch keine Ausflüge.",
  "All members ({count})": "Alle Mitglieder ({count})",
  "Recent activity": "Letzte Aktivitäten",
  "No activity in the last 14 days.": "Keine Aktivität in den letzten 14 Tagen.",
  "Past outings": "Vergangene Ausflüge",
  "No requests to join.": "Keine Beitrittsanfragen.",
  "Go out together: make a group, or join one.":
    "Gemeinsam raus: Gründe eine Gruppe oder tritt einer bei.",
  Invites: "Einladungen",
  "Meet in a public place, never at your home. MuW doesn't organise or check groups or their outings. Everyone on MuW is 16 or older.":
    "Trefft euch an einem öffentlichen Ort, nie bei dir zu Hause. MuW organisiert und prüft keine Gruppen und ihre Ausflüge. Alle auf MuW sind mindestens 16 Jahre alt.",
  "Mountaineering is dangerous. MuW doesn't organise, guide or check groups, outings, routes or difficulty, and isn't a mountain guide. Everyone is responsible for their own experience, gear and safety.":
    "Bergsteigen ist gefährlich. MuW organisiert, führt und prüft keine Gruppen, Ausflüge, Routen oder Schwierigkeiten und ist kein Bergführer. Alle sind selbst für ihre Erfahrung, Ausrüstung und Sicherheit verantwortlich.",
  "Public@@group": "Öffentlich",
  "Request to join": "Auf Anfrage",
  "Invite only": "Nur mit Einladung",
  Admin: "Admin",
  "Co-admin": "Co-Admin",
  "This group isn't available.": "Diese Gruppe ist nicht verfügbar.",
  // src/nutrition (TASK-489 part C2)
  "Use Apple Health": "Apple Health verwenden",
  "MuW reads your active energy and the workouts other apps recorded, to count the energy you use. They are read on your phone and stay there.":
    "MuW liest deine Aktivitätsenergie und die Trainings, die andere Apps aufgezeichnet haben, um die Energie zu zählen, die du verbrauchst. Sie werden auf deinem Handy gelesen und bleiben dort.",
  "Active energy": "Aktivitätsenergie",
  "from Apple Health": "von Apple Health",
  "Your activities are already inside Apple Health's active energy: they are not added again.":
    "Deine Aktivitäten stecken schon in der Aktivitätsenergie von Apple Health: Sie werden nicht noch einmal addiert.",
  "Apple Health has nothing for this day: your activities are counted.":
    "Apple Health hat nichts für diesen Tag: Deine Aktivitäten werden gezählt.",
  "Stop using Apple Health": "Apple Health nicht mehr verwenden",
  // src/air/ (TASK-479 part D5: the pilot's own waypoints; approved by the user on 2026-11-26)
  "Mark this place": "Diesen Ort markieren",
  "Waypoint here": "Wegpunkt hier",
  "Landing here": "Landeplatz hier",
  "My waypoints": "Meine Wegpunkte",
  "Remove all": "Alle entfernen",
  "Press the flight map long to add one.":
    "Halte die Flugkarte gedrückt, um einen hinzuzufügen.",
  // src/nutrition (TASK-489 part H: the animated day; approved by the user on 2026-11-24)
  "Protein, carbs and fat (est.)": "Eiweiß, Kohlenhydrate und Fett (gesch.)",
  Protein: "Eiweiß",
  Carbs: "Kohlenhydrate",
  Fat: "Fett",
  "{percent}% of the energy": "{percent}% der Energie",
  "Counted only for the foods that have these numbers.":
    "Nur für Lebensmittel gezählt, die diese Zahlen haben.",
  "No protein, carbs or fat to count for this day.":
    "Für diesen Tag gibt es kein Eiweiß, keine Kohlenhydrate und kein Fett zu zählen.",
  // src/air/ (TASK-479 part D6: landings from OpenStreetMap; approved by the user on 2026-11-26)
  "Landings from OpenStreetMap: {count}": "Landeplätze aus OpenStreetMap: {count}",
};
