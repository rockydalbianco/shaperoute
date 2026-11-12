import type { Table } from "./translate";

/**
 * The app's texts in French, by their English text (ADR-0172), in the
 * order of the files that show them. To confirm with someone who speaks it
 * (docs/UI.md).
 */
export const FR: Table = {
  // src/about/AboutPage.tsx
  "Draft — not final yet.": "Brouillon — pas encore définitif.",
  "Last updated: {date}": "Dernière mise à jour : {date}",

  // src/account/fields.ts
  "You must be at least 16 to sign up.":
    "Tu dois avoir au moins 16 ans pour t'inscrire.",
  "Enter the email of your account.": "Saisis l'e-mail de ton compte.",
  "Enter your password.": "Saisis ton mot de passe.",
  "A username is 3 to 20 letters, digits, _ or . (no spaces).":
    "Un nom d'utilisateur compte de 3 à 20 lettres, chiffres, _ ou . (sans espaces).",
  "Enter an email address, like name@example.com.":
    "Saisis une adresse e-mail, comme nom@example.com.",
  "A password is at least {min} characters.":
    "Un mot de passe compte au moins {min} caractères.",
  "A password is at most {max} characters.":
    "Un mot de passe compte au plus {max} caractères.",

  // src/account/messages.ts (TASK-256: words for whoever uses the phone)
  "The app cannot reach the service. Update the app.":
    "L'app ne parvient pas à joindre le service. Mets l'app à jour.",
  "Your session has ended. Log in again.": "Ta session a expiré. Reconnecte-toi.",
  "Something went wrong on our side. Try again in a moment.":
    "Quelque chose n'a pas marché de notre côté. Réessaie dans un instant.",
  "No connection. Check the network and try again.":
    "Pas de connexion. Vérifie le réseau et réessaie.",
  "This email already has an account. Log in instead.":
    "Cet e-mail a déjà un compte. Connecte-toi plutôt.",
  "This username is taken. Try another one.":
    "Ce nom d'utilisateur est déjà pris. Essaie-en un autre.",
  "Wrong email or password.": "E-mail ou mot de passe incorrect.",
  "Accounts are not available right now. Try again later.":
    "Les comptes ne sont pas disponibles pour le moment. Réessaie plus tard.",
  "This version of the app is no longer allowed in. Update the app.":
    "Cette version de l'app n'est plus acceptée. Mets l'app à jour.",
  "Too many tries. Wait a minute and try again.":
    "Trop de tentatives. Attends une minute et réessaie.",
  "Too many tries. Wait {minutes} minutes and try again.":
    "Trop de tentatives. Attends {minutes} minutes et réessaie.",

  // src/activities/ActivitiesList.tsx
  "{count} run is on this phone, waiting for a connection.":
    "{count} course est sur ce téléphone, en attente de connexion.",
  "{count} runs are on this phone, waiting for a connection.":
    "{count} courses sont sur ce téléphone, en attente de connexion.",
  "Loading…": "Chargement…",
  "Show more": "Afficher plus",
  "Loading your activities…": "Chargement de tes activités…",
  "Your activities could not load.": "Impossible de charger tes activités.",
  "Try again": "Réessayer",
  "No activities yet. Save a run when you finish it, and it is kept here.":
    "Pas encore d'activités. Enregistre une course quand tu la termines, et tu la retrouveras ici.",
  "{when}, {where}, {facts}, public, open on the map":
    "{when}, {where}, {facts}, publique, ouvrir sur la carte",
  "{when}, {where}, {facts}, open on the map":
    "{when}, {where}, {facts}, ouvrir sur la carte",
  "Opening…": "Ouverture…",
  Public: "Publique",
  "Delete this run? It cannot be undone.":
    "Supprimer cette course ? C'est irréversible.",
  // «Keep it» answers two questions (a run, Strava): a word that fits both.
  "Keep it": "Annuler",
  "Delete run": "Supprimer la course",
  Delete: "Supprimer",
  // A run the API will not take (TASK-257).
  "The server could not take this run: {message}":
    "Le serveur n'a pas pu accepter cette course : {message}",
  "Discard this run? It will not be saved.":
    "Ignorer cette course ? Elle ne sera pas enregistrée.",
  "Discard run": "Ignorer la course",
  "Send the run of {when} again": "Renvoyer la course du {when}",
  "Discard the run of {when}": "Ignorer la course du {when}",
  Discard: "Ignorer",

  // src/activities/ActivityCard.tsx
  "Yellow: the route. White: what you ran.":
    "Jaune : le parcours. Blanc : ce que tu as couru.",
  "White: what you ran.": "Blanc : ce que tu as couru.",
  "Back to the list": "Retour à la liste",
  "Edit post": "Modifier la publication",

  // src/activities/activitiesDoor.ts
  "Sign up or log in to keep your runs and share them as drawings.":
    "Inscris-toi ou connecte-toi pour garder tes courses et les partager comme dessins.",
  "This run is no longer in your activities.":
    "Cette course n'est plus dans tes activités.",

  // src/activities/activityText.ts
  Sun: "Dim",
  Mon: "Lun",
  Tue: "Mar",
  Wed: "Mer",
  Thu: "Jeu",
  Fri: "Ven",
  Sat: "Sam",
  Jan: "janv.",
  Feb: "févr.",
  Mar: "mars",
  Apr: "avr.",
  May: "mai",
  Jun: "juin",
  Jul: "juil.",
  Aug: "août",
  Sep: "sept.",
  Oct: "oct.",
  Nov: "nov.",
  Dec: "déc.",
  "{weekday} {day} {month} {year}": "{weekday} {day} {month} {year}",
  Run: "Course",

  // src/activities/RunEnd.tsx
  "The phone holds {count} runs not sent yet. Discard one in My activities first.":
    "Le téléphone contient déjà {count} courses non envoyées. Ignorez-en d'abord une dans Mes activités.",
  "The phone holds {count} runs not sent yet. They go when there is a connection; then save this one.":
    "Le téléphone contient déjà {count} courses non envoyées. Elles partent dès qu'il y a une connexion ; enregistrez ensuite celle-ci.",

  // src/api/comments.ts
  "A comment needs some words.": "Un commentaire a besoin de quelques mots.",
  "A comment is at most {max} characters.":
    "Un commentaire fait au plus {max} caractères.",
  "Too many comments in a minute. Wait a moment and try again.":
    "Trop de commentaires en une minute. Attends un instant et réessaie.",
  "The comments of this drawing are not available.":
    "Les commentaires de ce dessin ne sont pas disponibles.",

  // src/api/reactions.ts
  "At least 2 characters": "Au moins 2 caractères",
  "Your reaction wasn't saved. Check the connection.":
    "Ta réaction n'a pas été enregistrée. Vérifie la connexion.",

  // src/api/strava.ts
  "No connection. Try again when you are online.":
    "Pas de connexion. Réessaie quand tu es en ligne.",
  "Strava is taking no more runs for now. Try again later.":
    "Strava n'accepte plus de courses pour le moment. Réessaie plus tard.",
  "Strava could not read this run.": "Strava n'a pas pu lire cette course.",
  "Strava is not connected. Connect it and try again.":
    "Strava n'est pas connecté. Connecte-le et réessaie.",
  "Strava is not available on this API.": "Strava n'est pas disponible sur cette API.",
  "Strava did not answer. Try again in a while.":
    "Strava n'a pas répondu. Réessaie dans un moment.",

  // src/engine/OfflineMapsSetting.tsx
  "Offline maps: {size}": "Cartes hors ligne : {size}",
  "Maps download on Wi-Fi and mobile data.":
    "Les cartes se téléchargent en Wi-Fi et avec les données mobiles.",
  "Add a place": "Ajouter un lieu",
  "Preparing the map…": "Préparation de la carte…",
  "Trying again later": "Nouvel essai plus tard",
  "Up to {count} places.": "Jusqu'à {count} lieux.",
  "Places you add stay on the phone, so shapes there are drawn faster, even without signal.":
    "Les lieux ajoutés restent sur le téléphone : les formes y sont dessinées plus vite, même sans réseau.",

  // src/engine/ZoneNotice.tsx
  "Downloading the maps of your area ({size}) so routes work without signal.":
    "Téléchargement des cartes de ta zone ({size}) pour que les parcours marchent sans réseau.",

  // src/engine/sizeText.ts
  "{size} MB": "{size} Mo",
  "{size} GB": "{size} Go",

  // src/favorites/FavoriteHeart.tsx
  "Remove from favorites": "Retirer des favoris",
  "Add to favorites": "Ajouter aux favoris",

  // src/favorites/FavoritesList.tsx
  "Kept {day} {month} {year}": "Enregistré le {day} {month} {year}",
  "{title}, open on the map": "{title}, ouvrir sur la carte",
  "Remove {title} from favorites": "Retirer {title} des favoris",
  "Loading your favorites…": "Chargement de tes favoris…",
  "Your favorites could not load.": "Impossible de charger tes favoris.",
  "No favorites yet. Tap {heart} on a route on the map to keep it here.":
    "Pas encore de favoris. Touche {heart} sur un parcours de la carte pour le garder ici.",

  // src/favorites/favoriteRoute.ts
  Route: "Parcours",

  // src/favorites/favoritesDoor.ts
  "Sign up or log in to keep your favorite routes.":
    "Inscris-toi ou connecte-toi pour garder tes parcours favoris.",

  // src/feed/FeedAd.tsx
  Sponsored: "Sponsorisé",

  // src/feed/FeedPost.tsx
  "OpenFreeMap © OpenMapTiles\nData from OpenStreetMap":
    "OpenFreeMap © OpenMapTiles\nDonnées d'OpenStreetMap",
  "{user} in {city}: {title}. {facts}.": "{user} à {city} : {title}. {facts}.",
  "Opens the route on the map": "Ouvre le parcours sur la carte",

  // src/health/HealthRunEnd.tsx (TASK-321: Apple Health and Health Connect)
  "Save to Apple Health": "Enregistrer dans Apple Santé",
  "Save to Health Connect": "Enregistrer dans Health Connect",
  "Your activities also go to the Fitness app, with the route.":
    "Tes activités vont aussi dans l'app Forme, avec le parcours.",
  "Your activities also go to Health Connect, with the route.":
    "Tes activités vont aussi dans Health Connect, avec le parcours.",
  "Also to Apple Health, with Save.":
    "Avec Enregistrer, l'activité va aussi dans Apple Santé.",
  "Also to Health Connect, with Save.":
    "Avec Enregistrer, l'activité va aussi dans Health Connect.",
  "MuW can't write to Apple Health. Allow it in the Health app: your profile › Apps › MuW.":
    "MuW ne peut pas écrire dans Apple Santé. Autorise-le dans l'app Santé : ton profil › Apps › MuW.",
  "MuW can't write to Health Connect. Allow it in Health Connect › App permissions › MuW.":
    "MuW ne peut pas écrire dans Health Connect. Autorise-le dans Health Connect › Autorisations des applis › MuW.",

  // src/i18n/shapeNames.ts
  Circle: "Cercle",
  Heart: "Cœur",
  Star: "Étoile",
  Horse: "Cheval",
  Moon: "Lune",
  Cat: "Chat",
  Fish: "Poisson",
  Butterfly: "Papillon",
  Snail: "Escargot",
  "Dog head": "Tête de chien",
  "Rabbit head": "Tête de lapin",
  Pumpkin: "Citrouille",
  "Christmas tree": "Sapin de Noël",
  Smiley: "Smiley",
  Ghost: "Fantôme",
  Donut: "Donut",
  "The sun": "Soleil",
  Airplane: "Avion",
  Anchor: "Ancre",
  "Bear head": "Tête d'ours",
  Bicycle: "Vélo",
  Cherries: "Cerises",
  "Espresso cup": "Tasse d'espresso",
  "Four-leaf clover": "Trèfle à quatre feuilles",
  "Leaning Tower": "Tour penchée",
  "Music note": "Note de musique",
  Pear: "Poire",
  Sailboat: "Voilier",
  Swan: "Cygne",
  Windmill: "Moulin à vent",
  "Wine glass": "Verre à vin",

  // src/explore/NearbyTowns.tsx
  "NEARBY TOWNS": "VILLES PROCHES",
  "{town}, {km} km away": "{town}, à {km} km",
  "{mi} mi away": "à {mi} mi",
  "{town}, {mi} mi away": "{town}, à {mi} mi",

  // src/explore/CityWords.tsx
  WORDS: "MOTS",

  // src/intro/AppBoundary.tsx
  "Something went wrong.": "Quelque chose n'a pas marché.",

  // src/map/MapView.tsx
  "The map could not be loaded. Check the network.":
    "La carte n'a pas pu être chargée. Vérifie le réseau.",
  Retry: "Réessayer",

  // src/map/NorthArrow.tsx
  "North arrow": "Flèche du nord",
  "Turns the map north up": "Met le nord en haut",
  "Turns the map like the drawing": "Tourne la carte comme le dessin",
  "Turns the map where you face": "Tourne la carte vers où tu regardes",

  // src/map/MapKindButton.tsx
  "Map type": "Type de carte",
  Standard: "Standard",
  Satellite: "Satellite",
  "3D": "3D",

  // src/paddle/PaddleExplore.tsx
  Next: "À suivre",
  "Drawing…": "Dessin en cours…",
  "Your start": "Ton départ",
  "On the water": "Sur l'eau",
  "Shapes to paddle, within 1 km of the shore":
    "Des formes à pagayer, à moins de 1 km du rivage",
  // The swim's (TASK-323 C4).
  "Shapes to swim, within 150 m of the shore":
    "Des formes à nager, à moins de 150 m du rivage",
  "LAKES AND SEA": "LACS ET MER",
  "Near me": "Près de moi",
  "Choose a lake or a beach: eight shapes on its water, from the shore.":
    "Choisis un lac ou une plage : huit formes sur son eau, depuis le rivage.",
  "Choose a start in Draw first: the shapes start from the shore nearest to it.":
    "Choisis d'abord un départ dans Draw : les formes partent du rivage le plus proche.",
  "Near your start": "Près de ton départ",
  "{km} km away": "à {km} km",
  "Type a lake or a beach": "Écris un lac ou une plage",
  "No lake or beach matches “{typed}”.":
    "Aucun lac ou plage ne correspond à « {typed} ».",
  "{shape}, {km} km, on the water": "{shape}, {km} km, sur l'eau",
  "{shape}, {mi} mi, on the water": "{shape}, {mi} mi, sur l'eau",
  "Not drawn": "Non dessiné",

  // src/paddle/placeSpots.ts
  "Lake, beach, city or street": "Lac, plage, ville ou rue",

  // src/paddle/PaddleNotice.tsx
  "Before you paddle": "Avant de pagayer",
  "Wear a life jacket.": "Porte un gilet de sauvetage.",
  "Check the weather and the wind before you go out.":
    "Vérifie la météo et le vent avant de partir.",
  "Follow the local rules: swimming areas, boat lanes, harbours. MuW does not know them.":
    "Respecte les règles locales : zones de baignade, chenaux, ports. MuW ne les connaît pas.",
  "The route stays within 1 km of the shore. That does not make it safe or allowed.":
    "Le parcours reste à moins de 1 km du rivage. Cela ne le rend ni sûr ni autorisé.",
  "I understand": "J'ai compris",
  "Not now": "Pas maintenant",

  // src/swim/SwimNotice.tsx, src/swim/SwimRouteNote.tsx (TASK-323 C: the swim's
  // notice and the line under every swim, approved by the user in English)
  "Before you swim": "Avant de nager",
  "Never swim alone. Tow a bright swim buoy and wear a bright cap.":
    "Ne nage jamais seul. Tire une bouée de natation bien visible et porte un bonnet de couleur vive.",
  "Check the water, the weather, the flags and the local rules: swimming areas, boat lanes, harbours. MuW does not know them.":
    "Vérifie l'eau, la météo, les drapeaux et les règles locales : zones de baignade, chenaux, ports. MuW ne les connaît pas.",
  "The route stays between 20 and 150 m from the shore. That does not make it safe or allowed.":
    "Le parcours reste entre 20 et 150 m du rivage. Cela ne le rend ni sûr ni autorisé.",
  "If you feel tired or cold, head for the shore at once.":
    "Si tu te sens fatigué ou si tu as froid, regagne tout de suite le rivage.",
  "Within 150 m of the shore. Never swim alone.":
    "À moins de 150 m du rivage. Ne nage jamais seul.",

  // src/swim/SwimTurns.tsx, src/swim/turns.ts (TASK-323 C: the turns of a
  // swim before «Start», the place's name as OpenStreetMap writes it)
  TURNS: "VIRAGES",
  "Turn left": "Tourne à gauche",
  "Turn right": "Tourne à droite",
  "Turn left · {place}": "Tourne à gauche · {place}",
  "Turn right · {place}": "Tourne à droite · {place}",
  "{distance} from the start": "À {distance} du départ",
  "The same turns every lap, {laps} laps, then back to the shore.":
    "Les mêmes virages à chaque tour, {laps} tours, puis retour au rivage.",

  // src/swim/SwimResult.tsx, src/route/RoutePanel.tsx, src/settings/sport.ts
  // (TASK-323 C2: the laps of a swim, its size, the way out with the track)
  "Swim without a route": "Nager sans parcours",
  "{count} lap of {distance}": "{count} tour de {distance}",
  "{count} laps of {distance}": "{count} tours de {distance}",
  "Bigger shape": "Forme plus grande",
  "Smaller shape": "Forme plus petite",
  "{drawn} km of drawing + {between} km swimming between the parts":
    "{drawn} km de dessin + {between} km à la nage entre les parties",
  "{drawn} mi of drawing + {between} mi swimming between the parts":
    "{drawn} mi de dessin + {between} mi à la nage entre les parties",

  // src/paddle/MoveShape.tsx, src/route/RoutePanel.tsx
  "Move the shape": "Déplacer la forme",
  "Drag the shape where you want it, then let go.":
    "Fais glisser la forme où tu veux, puis relâche.",
  "It stays on the water, off the shore, where it fits.":
    "Elle reste sur l'eau, à distance de la rive, là où elle tient.",
  "The shape does not fit there: this is the nearest place.":
    "La forme ne tient pas là : voici l'endroit le plus proche.",

  // src/paddle/waterPlaces.ts
  "from Riva del Garda": "depuis Riva del Garda",
  "from Como": "depuis Côme",
  "from the beach": "depuis la plage",

  // src/places/PlaceSearch.tsx
  "City or street": "Ville ou rue",
  Search: "Rechercher",
  "Searching…": "Recherche…",
  "No place found. Try adding the city.":
    "Aucun lieu trouvé. Essaie d'ajouter la ville.",
  "The search failed. Check the connection and try again.":
    "La recherche a échoué. Vérifie la connexion et réessaie.",
  "© OpenStreetMap contributors": "© contributeurs d'OpenStreetMap",

  // src/profile/EditProfile.tsx
  USERNAME: "NOM D'UTILISATEUR",
  "3 to 20 letters, digits, _ or .": "De 3 à 20 lettres, chiffres, _ ou .",
  BIO: "BIO",
  "A few words about you": "Quelques mots sur toi",
  "{length} of {max} characters": "{length} sur {max} caractères",
  "Saving…": "Enregistrement…",
  Save: "Enregistrer",
  Saved: "Enregistré",

  // src/profile/PhotoChoices.tsx
  "Removing…": "Suppression…",
  "Choose a picture": "Choisir une photo",
  "Take a photo": "Prendre une photo",
  "Remove picture": "Retirer la photo",

  // src/profile/PhotoRow.tsx
  "Profile picture": "Photo de profil",

  // src/profile/ProfileHome.tsx
  "Edit profile": "Modifier le profil",
  Favorites: "Favoris",
  "My activities": "Mes activités",
  Settings: "Réglages",

  // src/settings/EmailSetting.tsx, PhoneSetting.tsx, contactFields.ts (TASK-183)
  "NEW EMAIL": "NOUVEL E-MAIL",
  "PHONE NUMBER": "NUMÉRO DE TÉLÉPHONE",
  Add: "Ajouter",
  "Remove number": "Retirer le numéro",
  "Only you see your number. Friends who already have it will be able to find you on MuW.":
    "Toi seul vois ton numéro. Les amis qui l'ont déjà pourront te trouver sur MuW.",
  "Changing the email is not available on this API yet.":
    "Sur cette API, on ne peut pas encore changer l'e-mail.",
  "The phone number is not available on this API yet.":
    "Sur cette API, il n'y a pas encore de numéro de téléphone.",
  "This is already the email of your account.": "C'est déjà l'e-mail de ton compte.",
  "Write the number with its country code, like +39 333 123 4567.":
    "Écris le numéro avec l'indicatif du pays, comme +39 333 123 4567.",
  "Wrong password.": "Mot de passe incorrect.",
  "Another account has this email.": "Un autre compte a cet e-mail.",

  // src/screens/SignInScreen.tsx, ForgotPassword.tsx, src/settings/EmailConfirmation.tsx,
  // src/account/accountEmail.ts (TASK-300: the emails of the account)
  "Forgot password?": "Mot de passe oublié ?",
  "Write the email of your account: we send it a link to choose a new password.":
    "Écris l'e-mail de ton compte : nous y envoyons un lien pour choisir un nouveau mot de passe.",
  "Send the link": "Envoyer le lien",
  "If an account has this email, a link is on its way. It works for 1 hour; look in spam too.":
    "Si un compte a cet e-mail, un lien est en route. Il est valable 1 heure ; regarde aussi dans les spams.",
  "Back to Log in": "Retour à Se connecter",
  "Too many emails asked: wait a few minutes and try again.":
    "Trop d'e-mails demandés : attends quelques minutes et réessaie.",
  "Email not confirmed": "E-mail non confirmé",
  "Send the link again": "Renvoyer le lien",
  "Send again": "Renvoyer",
  "Cancel change": "Annuler le changement",
  "Link sent to {email}. Look in spam too.":
    "Lien envoyé à {email}. Regarde aussi dans les spams.",
  "We sent a link to {email}. Your email changes when you open it.":
    "Nous avons envoyé un lien à {email}. Ton e-mail change quand tu l'ouvres.",
  "Waiting for {email}: open the link we sent there.":
    "En attente de {email} : ouvre le lien que nous y avons envoyé.",

  // src/settings/NotificationsSetting.tsx, notificationFields.ts
  "Notifications are not available on this API yet.":
    "Sur cette API, il n'y a pas encore de notifications.",

  // src/profile/SettingsPage.tsx
  "Change email": "Changer d'e-mail",
  "Phone number": "Numéro de téléphone",
  Units: "Unités",
  NOTIFICATIONS: "NOTIFICATIONS",
  "Email notifications": "Notifications par e-mail",
  "Push notifications": "Notifications push",
  ABOUT: "À PROPOS",
  Help: "Aide",
  Terms: "Conditions",
  Privacy: "Confidentialité",
  ACCOUNT: "COMPTE",
  PREFERENCES: "PRÉFÉRENCES",
  "Log out": "Se déconnecter",
  "Delete your account? Everything that is yours goes with it, at once. It cannot be undone.":
    "Supprimer ton compte ? Tout ce qui est à toi part avec lui, immédiatement. C'est irréversible.",
  "Deleting…": "Suppression…",
  "Delete my account": "Supprimer mon compte",
  "Keep my account": "Garder mon compte",
  "Delete account": "Supprimer le compte",

  // src/profile/UserProfilePage.tsx
  "Log in to see the profiles of the others.":
    "Connecte-toi pour voir les profils des autres.",
  "This profile is not available.": "Ce profil n'est pas disponible.",
  "{count} drawing": "{count} dessin",
  "{count} drawings": "{count} dessins",
  "Loading the profile…": "Chargement du profil…",
  "{count} follower": "{count} abonné",
  "{count} followers": "{count} abonnés",
  "{count} following": "suit {count}",

  // src/profile/profileFields.ts
  "Editing the profile is not available on this API yet.":
    "La modification du profil n'est pas encore disponible sur cette API.",
  "A bio is at most {max} characters.": "Une bio compte au plus {max} caractères.",

  // src/profile/useProfilePhoto.ts
  "The camera is off for this app. Allow it in Settings, or choose a picture instead.":
    "Cette app n'a pas accès à l'appareil photo. Autorise-le dans Réglages, ou choisis plutôt une photo.",
  "This picture is too large. Choose a smaller one.":
    "Cette photo est trop grande. Choisis-en une plus petite.",
  "Could not open the picture. Try again.": "Impossible d'ouvrir la photo. Réessaie.",
  "This picture cannot be used. Choose another one.":
    "Cette photo ne peut pas être utilisée. Choisis-en une autre.",
  "Profile pictures are not available on this API yet.":
    "Les photos de profil ne sont pas encore disponibles sur cette API.",

  // src/route/RoutePanel.tsx
  "{letters} km of letters + {between} km riding between them":
    "{letters} km de lettres + {between} km à vélo entre elles",
  "{drawn} km of drawing + {between} km walking between the parts":
    "{drawn} km de dessin + {between} km à pied entre les parties",
  "{drawn} km of drawing + {between} km riding between the parts":
    "{drawn} km de dessin + {between} km à vélo entre les parties",
  "{drawn} km of drawing + {between} km paddling between the parts":
    "{drawn} km de dessin + {between} km à la pagaie entre les parties",
  "On the water, the drawing goes where it fits near the start.":
    "Sur l'eau, le dessin se place là où il tient près du départ.",
  "On the water, a shape of the catalogue.": "Sur l'eau, une forme du catalogue.",
  "{name} · on the water · target {km} km": "{name} · sur l'eau · objectif {km} km",
  "{name} · on roads · target {km} km": "{name} · sur route · objectif {km} km",
  // «Draw» with «Miles» (TASK-182 part B): src/route/RoutePanel.tsx,
  // DistanceStepper.tsx, wordInput.ts
  "Distance in miles": "Distance en miles",
  "Enter a distance between {lowest} and {highest} mi.":
    "Saisis une distance entre {lowest} et {highest} mi.",
  "{count} letter: at least {mi} mi. A word takes a few minutes to draw.":
    "{count} lettre : au moins {mi} mi. Dessiner un mot prend quelques minutes.",
  "{count} letters: at least {mi} mi. A word takes a few minutes to draw.":
    "{count} lettres : au moins {mi} mi. Dessiner un mot prend quelques minutes.",
  "Use {mi} mi": "Utiliser {mi} mi",
  "{letters} mi of letters + {between} mi riding between them":
    "{letters} mi de lettres + {between} mi à vélo entre elles",
  "{letters} mi of letters + {between} mi walking between them":
    "{letters} mi de lettres + {between} mi à pied entre elles",
  "{drawn} mi of drawing + {between} mi walking between the parts":
    "{drawn} mi de dessin + {between} mi à pied entre les parties",
  "{drawn} mi of drawing + {between} mi riding between the parts":
    "{drawn} mi de dessin + {between} mi à vélo entre les parties",
  "{drawn} mi of drawing + {between} mi paddling between the parts":
    "{drawn} mi de dessin + {between} mi à la pagaie entre les parties",
  "{name} · on the water · target {mi} mi": "{name} · sur l'eau · objectif {mi} mi",
  "{name} · on roads · target {mi} mi": "{name} · sur route · objectif {mi} mi",
  "Drawing the picture's outline, {mi} mi…": "Dessin du contour de la photo, {mi} mi…",
  "Drawing “{word}”, {mi} mi…": "Dessin de « {word} », {mi} mi…",
  "Drawing a {mi} mi {name}…": "Dessin en cours : {name}, {mi} mi…",
  "At most {most} letters: each needs {each} mi, and the app goes up to {highest} mi.":
    "Au plus {most} lettres : chacune demande {each} mi, et l'app va jusqu'à {highest} mi.",
  "“{word}” needs at least {mi} mi: {each} mi for each letter.":
    "« {word} » demande au moins {mi} mi : {each} mi par lettre.",

  // src/route/betterDistance.ts
  "This shape comes out better at about {km} km.":
    "Cette forme rend mieux à environ {km} km.",
  "This word comes out better at about {km} km.":
    "Ce mot rend mieux à environ {km} km.",
  "This outline comes out better at about {km} km.":
    "Ce contour rend mieux à environ {km} km.",
  "Try {km} km": "Essayer {km} km",
  "This shape comes out better at about {mi} mi.":
    "Cette forme rend mieux à environ {mi} mi.",
  "This word comes out better at about {mi} mi.":
    "Ce mot rend mieux à environ {mi} mi.",
  "This outline comes out better at about {mi} mi.":
    "Ce contour rend mieux à environ {mi} mi.",
  "Try {mi} mi": "Essayer {mi} mi",

  // src/route/problems.ts
  "The route could not be drawn. Try again, or try another start.":
    "Le parcours n'a pas pu être tracé. Réessaie, ou essaie un autre départ.",
  "This word cannot be read right now. Try one of these: {list}.":
    "Ce mot ne peut pas être lu pour le moment. Essaie l'un de ceux-ci : {list}.",
  "Drawing this route is taking too long. Try again later, or a shorter distance.":
    "Le tracé de ce parcours prend trop de temps. Réessaie plus tard, ou avec une distance plus courte.",
  "This request was lost. Try again.": "Cette demande a été perdue. Réessaie.",
  "There is no lake or sea near this start. Start from the shore, within 2 km of the water.":
    "Il n'y a ni lac ni mer près de ce départ. Pars du rivage, à moins de 2 km de l'eau.",
  "This drawing does not fit on the water near this start. Try a shorter distance, or another start.":
    "Ce dessin ne tient pas sur l'eau près de ce départ. Essaie une distance plus courte ou un autre départ.",
  "This drawing does not fit on the water here at this distance. It fits at about {km} km.":
    "Ce dessin ne tient pas sur l'eau ici à cette distance. Il tient à environ {km} km.",
  "This drawing does not fit on the water here at this distance. It fits at about {mi} mi.":
    "Ce dessin ne tient pas sur l'eau ici à cette distance. Il tient à environ {mi} mi.",
  "This shape does not fit on the water here at this distance. It fits at about {km} km.":
    "Cette forme ne tient pas sur l'eau ici à cette distance. Elle tient à environ {km} km.",
  "This shape does not fit on the water here. Try a shorter distance, another shape, or another start:":
    "Cette forme ne tient pas sur l'eau ici. Essaie une distance plus courte, une autre forme ou un autre départ :",
  "This shape does not fit the roads here at this distance. It fits at about {mi} mi.":
    "Cette forme ne tient pas sur les routes ici à cette distance. Elle tient à environ {mi} mi.",
  "This word does not fit the roads here at this distance. It fits at about {mi} mi.":
    "Ce mot ne tient pas sur les routes ici à cette distance. Il tient à environ {mi} mi.",
  "This image does not fit the roads here at this distance. It fits at about {mi} mi.":
    "Cette image ne tient pas sur les routes ici à cette distance. Elle tient à environ {mi} mi.",
  "There is no lake or sea near this start. Start from the shore, within 1 mile of the water.":
    "Il n'y a ni lac ni mer près de ce départ. Pars du rivage, à moins de 1 mile de l'eau.",
  "This shape does not fit on the water here at this distance. It fits at about {mi} mi.":
    "Cette forme ne tient pas sur l'eau ici à cette distance. Elle tient à environ {mi} mi.",

  // src/route/warnings.ts
  "Includes {distance} walking the bike.": "Dont {distance} à pied, vélo à la main.",

  // src/route/RoutePanel.tsx (TASK-210, «Draw»)
  Shape: "Forme",
  Word: "Mot",
  Image: "Image",
  Round: "Rondes",
  Square: "Carrées",
  LETTERS: "LETTRES",
  DISTANCE: "DISTANCE",
  "heart, star, horse…": "cœur, étoile, cheval…",
  "Lift the pen between parts": "Lever le crayon entre les parties",
  "Lift the pen between letters": "Lever le crayon entre les lettres",
  "Square letters follow the street grid: best for short words.":
    "Les lettres carrées suivent la grille des rues : mieux pour les mots courts.",
  "Enter a distance between {lowest} and {highest} km.":
    "Saisis une distance entre {lowest} et {highest} km.",
  "Long routes take longer: up to a few minutes.":
    "Les longs parcours prennent plus de temps : jusqu'à quelques minutes.",
  "Draw route": "Dessiner le parcours",
  Start: "Démarrer",
  "Preparing GPX…": "Préparation du GPX…",
  "Export GPX": "Exporter le GPX",
  "{letters} km of letters + {between} km walking between them":
    "{letters} km de lettres + {between} km à pied entre elles",
  "Press Done and the AI will read it.": "Appuie sur OK et l'IA le lira.",
  "The AI is reading it…": "L'IA le lit…",
  "No shape in the catalogue for “{text}”. Describe what it looks like (“prancing horse”, not “Ferrari badge”), or pick one:":
    "Aucune forme du catalogue pour « {text} ». Décris à quoi elle ressemble (« cheval cabré », pas « écusson Ferrari »), ou choisis-en une :",
  "Unknown shape. Try: {list}.": "Forme inconnue. Essaie : {list}.",
  "{count} letter: at least {km} km. A word takes a few minutes to draw.":
    "{count} lettre : au moins {km} km. Dessiner un mot prend quelques minutes.",
  "{count} letters: at least {km} km. A word takes a few minutes to draw.":
    "{count} lettres : au moins {km} km. Dessiner un mot prend quelques minutes.",
  "Use {km} km": "Utiliser {km} km",
  Picture: "Photo",
  "Downloading map data for this area…": "Téléchargement de la carte de cette zone…",
  "Drawing the picture's outline, {km} km…": "Dessin du contour de la photo, {km} km…",
  "Drawing “{word}”, {km} km…": "Dessin de « {word} », {km} km…",
  "Drawing a {km} km {name}…": "Dessin en cours : {name}, {km} km…",

  // src/route/problems.ts (TASK-210, «Draw»)
  "This shape does not fit the roads here at this distance. It fits at about {km} km.":
    "Cette forme ne tient pas sur les routes ici à cette distance. Elle tient à environ {km} km.",
  "This word does not fit the roads here at this distance. It fits at about {km} km.":
    "Ce mot ne tient pas sur les routes ici à cette distance. Il tient à environ {km} km.",
  "This image does not fit the roads here at this distance. It fits at about {km} km.":
    "Cette image ne tient pas sur les routes ici à cette distance. Elle tient à environ {km} km.",
  "This word does not fit the roads here. Try a shorter word, or another start.":
    "Ce mot ne tient pas sur les routes ici. Essaie un mot plus court ou un autre départ.",
  "This outline does not fit the roads here. Try another distance, another start, or a simpler picture.":
    "Ce contour ne tient pas sur les routes ici. Essaie une autre distance, un autre départ ou une photo plus simple.",
  "This shape does not fit the roads here. Try another shape, or another start:":
    "Cette forme ne tient pas sur les routes ici. Essaie une autre forme ou un autre départ :",
  "The map service is busy, so this area could not be loaded. Try again in a few minutes.":
    "Le service de cartes est occupé et cette zone n'a pas pu être chargée. Réessaie dans quelques minutes.",
  "The route engine cannot find one clear outline in this picture.":
    "Aucun contour net n'a été trouvé dans cette photo.",
  "Only PNG and JPEG pictures work. Choose another one.":
    "Seules les photos PNG et JPEG fonctionnent. Choisis-en une autre.",
  "This picture could not be read. Choose another one.":
    "Cette photo n'a pas pu être lue. Choisis-en une autre.",
  "The background is too busy. Use one subject on a plain background, like a drawing on white paper or an object on a bare table.":
    "L'arrière-plan est trop chargé. Utilise un seul sujet sur un fond uni, comme un dessin sur papier blanc ou un objet sur une table vide.",
  "Nothing stands out from the background. Use a subject much darker or brighter than what is around it.":
    "Rien ne ressort de l'arrière-plan. Utilise un sujet bien plus sombre ou plus clair que ce qui l'entoure.",
  "The picture shows more than 4 separate things. Use a picture with 4 subjects at most.":
    "La photo montre plus de 4 éléments séparés. Utilise une photo avec 4 sujets au plus.",
  "The subject touches the edge of the picture. Leave some background all around it.":
    "Le sujet touche le bord de la photo. Laisse un peu de fond tout autour.",
  "The subject is too small. Get closer, or use a bigger picture.":
    "Le sujet est trop petit. Rapproche-toi ou utilise une photo plus grande.",
  "The outline is too jagged to run on roads. Try a simpler subject.":
    "Le contour est trop irrégulier pour être couru sur les routes. Essaie un sujet plus simple.",
  "This line cannot be added to the outline. Draw it again.":
    "Cette ligne ne peut pas être ajoutée au contour. Dessine-la à nouveau.",
  "This line is too short to add. Draw a longer one.":
    "Cette ligne est trop courte pour être ajoutée. Dessines-en une plus longue.",
  "This part covers where a detail starts. Undo the detail first, or draw the part elsewhere.":
    "Cette partie recouvre le départ d'un détail. Annule d'abord le détail, ou dessine la partie ailleurs.",
  "That is too much for one route. Undo something, or draw simpler lines.":
    "C'est trop pour un seul parcours. Annule quelque chose, ou dessine des lignes plus simples.",
  "Too many requests to the API in the last minute. Wait a minute, then try again.":
    "Trop de demandes dans la dernière minute. Attends une minute, puis réessaie.",
  "This phone cannot open the share sheet.":
    "Ce téléphone ne peut pas ouvrir la feuille de partage.",
  "The GPX could not be saved on the phone. Try again.":
    "Le GPX n'a pas pu être enregistré sur le téléphone. Réessaie.",
  "This picture is too large: {mb} MB, at most {most} MB. Choose a smaller one.":
    "Cette photo est trop grande : {mb} Mo, au plus {most} Mo. Choisis-en une plus petite.",
  "The picture could not be opened. Try again, or choose another one.":
    "La photo n'a pas pu être ouverte. Réessaie, ou choisis-en une autre.",

  // src/route/warnings.ts (TASK-210, «Draw»; the direction is the compass word)
  "The route starts {distance} {direction} of your start, where the shape fits the roads. Go to “Start here”.":
    "Le parcours commence à {distance} de ton départ, direction {direction}, là où la forme tient sur les routes. Va à « Départ ici ».",
  "There are {distance} of steps along the way.":
    "Il y a {distance} d'escaliers sur le chemin.",
  "{distance} runs along main roads, with traffic.":
    "{distance} longent des routes principales, avec de la circulation.",
  "{distance} runs through tunnels.": "{distance} passent dans des tunnels.",
  "About {share}% of the route goes over the same roads twice.":
    "Environ {share}% du parcours passe deux fois par les mêmes routes.",
  "About {share}% of the route runs alongside itself.":
    "Environ {share}% du parcours se longe lui-même.",
  "The route is {share}% longer than asked.":
    "Le parcours est {share}% plus long que demandé.",
  "The route is {share}% shorter than asked.":
    "Le parcours est {share}% plus court que demandé.",
  "The roads here follow the shape only roughly.":
    "Les routes ici ne suivent la forme qu'à peu près.",
  "Few roads here: the route follows the shape loosely.":
    "Peu de routes ici : le parcours suit la forme de loin.",
  "The nearest road is {distance} away: the route begins there.":
    "La route la plus proche est à {distance} : le parcours commence là.",
  "A bit of the shape has no road to follow, so the route skips it.":
    "Un bout de la forme n'a pas de route à suivre, et le parcours le saute.",

  // src/route/wordInput.ts (TASK-210, «Draw»)
  "Write a word to draw, with the letters A to Z.":
    "Écris un mot à dessiner, avec les lettres de A à Z.",
  "One word only, without spaces.": "Un seul mot, sans espaces.",
  "No letter “{letter}”: a word can use only the letters A to Z, without accents.":
    "Pas de « {letter} » : un mot ne peut utiliser que les lettres de A à Z, sans accents.",
  "At most {most} letters.": "Au plus {most} lettres.",
  "At most {most} letters: each needs {each} km, and the app goes up to {highest} km.":
    "Au plus {most} lettres : chacune demande {each} km, et l'app va jusqu'à {highest} km.",
  "“{word}” needs at least {km} km: {each} km for each letter.":
    "« {word} » demande au moins {km} km : {each} km par lettre.",

  // src/route/ImageChoice.tsx (TASK-210, «Draw»)
  "Choose another": "En choisir une autre",
  "Choose picture": "Choisir une photo",
  "Take photo": "Prendre une photo",
  "Hide the picture": "Masquer la photo",
  "Show the picture": "Afficher la photo",
  "Edit the outline": "Modifier le contour",
  "One subject on a plain background works best: a drawing, a logo, an object on a bare table. The route follows its outside line. Up to 4 separate subjects are joined in one line.":
    "Un seul sujet sur un fond uni marche le mieux : un dessin, un logo, un objet sur une table vide. Le parcours suit sa ligne extérieure. Jusqu'à 4 sujets séparés sont reliés en une seule ligne.",
  "Tracing the outline…": "Tracé du contour…",
  "The yellow line is what the route will draw. If it does not look like the subject, the route will not either: try another picture, or edit the outline. Separate subjects are joined by a short line, which the route runs there and back.":
    "La ligne jaune est ce que le parcours dessinera. Si elle ne ressemble pas au sujet, le parcours non plus : essaie une autre photo, ou modifie le contour. Les sujets séparés sont reliés par une courte ligne, que le parcours fait aller et retour.",

  // src/route/OutlineBoard.tsx (TASK-210, «Draw»)
  "Add a part": "Ajouter une partie",
  "Add a detail": "Ajouter un détail",
  "Choose what to add. Two fingers zoom and move the picture.":
    "Choisis quoi ajouter. Deux doigts zooment et déplacent la photo.",
  "Draw a closed shape. Across the yellow line it becomes part of the outline; anywhere else it is joined to the nearest yellow line.":
    "Dessine une forme fermée. Sur la ligne jaune, elle devient partie du contour ; ailleurs, elle est reliée à la ligne jaune la plus proche.",
  "Draw a line anywhere: it is joined to the nearest yellow line, and the route runs along it and back. Close a loop to make an eye.":
    "Dessine une ligne n'importe où : elle est reliée à la ligne jaune la plus proche, et le parcours la fait aller et retour. Ferme une boucle pour faire un œil.",
  Fit: "Ajuster",
  "Adding the part…": "Ajout de la partie…",
  "Adding the detail…": "Ajout du détail…",
  Undo: "Annuler",

  // src/route/LoadingBar.tsx (TASK-210, «Draw»: what a screen reader hears)
  "Still waiting": "Toujours en attente",
  "Drawing the route": "Dessin du parcours",
  "Reading the shape": "Lecture de la forme",
  "Loading the map": "Chargement de la carte",

  // src/route/DistanceStepper.tsx (TASK-210, «Draw»)
  "Distance in km": "Distance en km",
  Shorter: "Plus court",
  Longer: "Plus long",

  // src/route/RouteTiles.tsx, ImagePreview.tsx (TASK-210, «Draw»: what a screen reader hears)
  "Route {label}, {distance}, {likeness} like the shape":
    "Parcours {label}, {distance}, ressemble à la forme à {likeness}",
  "The outline traced from the picture": "Le contour tracé d'après la photo",

  // src/route/RoutePanel.tsx (TASK-435: the first route is shown, the others are coming)
  "Looking for other routes…": "Recherche d'autres parcours…",

  // src/screens/PeopleScreen.tsx
  "Find friends": "Trouver des amis",

  // src/screens/ProfileLayer.tsx
  "Profile, log in again": "Profil, reconnecte-toi",
  "Profile, {count} follow request": "Profil, {count} demande d'abonnement",
  "Profile, {count} follow requests": "Profil, {count} demandes d'abonnement",
  Profile: "Profil",

  // src/screens/ProfileScreen.tsx
  "Your account and everything that was yours have been deleted.":
    "Ton compte et tout ce qui était à toi ont été supprimés.",
  "You are logged out on this phone.": "Ce téléphone n'est plus connecté à ton compte.",
  Back: "Retour",

  // src/screens/RunDashboard.tsx
  Speed: "Vitesse",
  "Kilometre {km}: {speed} km/h": "Kilomètre {km} : {speed} km/h",
  Mi: "Mi",
  miles: "miles",
  "Your first mile will show here.": "Ton premier mile s'affichera ici.",
  "Mile {mile}: {pace}": "Mile {mile} : {pace}",
  "Mile {mile}: {speed} mph": "Mile {mile} : {speed} mph",
  "Your first 500 metres will show here.": "Tes 500 premiers mètres s'afficheront ici.",
  "Your first 100 metres will show here.": "Tes 100 premiers mètres s'afficheront ici.",
  "{metres} metres: {pace}": "{metres} mètres : {pace}",

  // src/screens/RunPanel.tsx
  "Speed now": "Vitesse",
  "Avg speed": "Vit. moy.",
  "Last km": "Dernier km",
  "Last mi": "Dernier mi",
  "Avg /500 m": "Moy. /500 m",
  "Last 500 m": "Dern. 500 m",
  // A swim's (TASK-323 D).
  "Avg /100 m": "Moy. /100 m",
  "Last 100 m": "Dern. 100 m",

  // src/screens/FreeRunScreen.tsx, SnowFinishCard.tsx (TASK-375 part C)
  "Your day": "Ta journée",
  "White: where you skied.": "Blanc : là où tu as skié.",
  "Skied: {distance}": "Skié : {distance}",
  Descents: "Descentes",
  Vertical: "Dénivelé",
  "Top speed": "Vitesse max",
  Lifts: "Remontées",

  // src/social/SkiNamesList.tsx (TASK-375 part D)
  "Lifts and pistes": "Remontées et pistes",
  "{name}, {times} times": "{name}, {times} fois",
  "{name}, once": "{name}, une fois",

  // src/screens/SignInScreen.tsx
  "Sign up": "S'inscrire",
  "Log in": "Se connecter",
  EMAIL: "E-MAIL",
  "name@example.com": "nom@example.com",
  PASSWORD: "MOT DE PASSE",
  "At least 8 characters": "Au moins 8 caractères",
  "I am at least 16": "J'ai au moins 16 ans",
  "Signing up…": "Inscription…",
  "Logging in…": "Connexion…",

  // src/settings/LanguageSetting.tsx
  Language: "Langue",
  "Phone language": "Langue du téléphone",

  // src/settings/UnitsSetting.tsx
  Kilometres: "Kilomètres",
  Miles: "Miles",
  "Phone units": "Unités du téléphone",

  // src/settings/BodySetting.tsx, BodyPage.tsx, src/body/bodyFields.ts (TASK-374)
  Body: "Corps",
  "Not set": "Non défini",
  "Used only to estimate your calories and heart rate zones. It stays on this phone.":
    "Sert uniquement à estimer tes calories et tes zones de fréquence cardiaque. Reste sur ce téléphone.",
  Sex: "Sexe",
  Male: "Homme",
  Female: "Femme",
  "Prefer not to say": "Je préfère ne pas le dire",
  Weight: "Poids",
  Height: "Taille",
  "Year of birth": "Année de naissance",
  "Calories are an estimate. Weight matters most.":
    "Les calories sont une estimation. C'est surtout le poids qui compte.",
  "Enter a weight between {min} and {max} {unit}.":
    "Saisis un poids entre {min} et {max} {unit}.",
  "Enter a height between {min} and {max}.": "Saisis une taille entre {min} et {max}.",
  "Enter a year between {min} and {max}.": "Saisis une année entre {min} et {max}.",

  // src/settings/HeartZonesPage.tsx, BodyPage.tsx (TASK-374 part B)
  "Heart rate zones": "Zones de fréquence cardiaque",
  "Max heart rate": "Fréquence cardiaque maximale",
  "Estimated from your age": "Estimée d'après ton âge",
  "Set by you": "Définie par toi",
  "Resting heart rate": "Fréquence cardiaque au repos",
  "Zone 1 Recovery": "Zone 1 Récupération",
  "Zone 2 Endurance": "Zone 2 Endurance",
  "Zone 3 Tempo": "Zone 3 Tempo",
  "Zone 4 Threshold": "Zone 4 Seuil",
  "Zone 5 Max": "Zone 5 Maximum",
  "Back to calculated zones": "Revenir aux zones calculées",
  "Add your year of birth or your max heart rate to see your zones.":
    "Ajoute ton année de naissance ou ta fréquence maximale pour voir tes zones.",
  "Enter a heart rate between {min} and {max} bpm.":
    "Saisis une fréquence cardiaque entre {min} et {max} bpm.",

  // src/settings/ToneSetting.tsx
  Tone: "Apparence",
  Dark: "Sombre",
  Light: "Clair",
  Brightness: "Luminosité",
  "Brightness {step} of {count}": "Luminosité {step} sur {count}",
  Darker: "Plus sombre",
  Brighter: "Plus clair",
  "Preview of the tone": "Aperçu de l'apparence",
  Apply: "Appliquer",
  "MuW opens again in the new tone.": "MuW se rouvre avec la nouvelle apparence.",
  "The phone did not keep the tone. Try again.":
    "Le téléphone n'a pas enregistré l'apparence. Réessaie.",
  "Close MuW and open it again to see the new tone.":
    "Ferme MuW et rouvre-la pour voir la nouvelle apparence.",

  // src/settings/sport.ts
  "Ride without a route": "Rouler sans parcours",
  "Paddle without a route": "Pagayer sans parcours",
  "Walk without a route": "Marcher sans parcours",
  "Hike without a route": "Randonner sans parcours",
  "Skate without a route": "Rouler sans parcours",
  "Record your day": "Enregistrer la journée",
  "Run without a route": "Courir sans parcours",

  // src/share/PostImage.tsx
  "Drag it to move it. Tap it to take it off.":
    "Fais-le glisser pour le déplacer. Touche-le pour le retirer.",

  // src/share/SharePost.tsx
  "Share your run": "Partage ta course",
  "Drag the emoji to move them. Tap one to take it off.":
    "Fais glisser les emojis pour les déplacer. Touches-en un pour le retirer.",
  Results: "Résultats",
  "Add emoji": "Ajouter des emojis",
  "Add {emoji}": "Ajouter {emoji}",
  "Up to {count} emoji: tap one on the post to take it off.":
    "{count} emojis au plus : touches-en un sur la publication pour le retirer.",
  "Making the picture…": "Création de l'image…",
  "Pick Instagram in the list: Story, Feed or Messages.":
    "Choisis Instagram dans la liste : Story, Feed ou Messages.",
  Share: "Partager",

  // src/share/StravaPostRow.tsx
  "To send this post to Strava, save the run, then share it from «My activities».":
    "Pour envoyer cette publication sur Strava, enregistre la course, puis partage-la depuis « Mes activités ».",
  "Update on Strava": "Mettre à jour sur Strava",
  "The activity on Strava has this post's text now.":
    "L'activité sur Strava a maintenant le texte de cette publication.",
  "Strava did not let MuW change this activity. Change its text on Strava.":
    "Strava n'a pas laissé MuW modifier cette activité. Modifie son texte sur Strava.",
  "Strava takes no pictures from other apps: keep this one in Photos with «Save Image» and add it there.":
    "Strava n'accepte pas les images d'autres apps : garde celle-ci dans Photos avec « Enregistrer l'image » et ajoute-la là-bas.",

  // src/share/postRun.ts
  Distance: "Distance",
  Time: "Temps",
  Pace: "Allure",

  // src/share/sharePicture.ts
  "The picture could not be made. Try again.":
    "L'image n'a pas pu être créée. Réessaie.",

  // src/social/DrawingCard.tsx
  "Back to the profile": "Retour au profil",

  // src/social/DrawingComments.tsx
  "Opens the comments of this drawing.": "Ouvre les commentaires de ce dessin.",
  Comments: "Commentaires",
  "Delete this comment?": "Supprimer ce commentaire ?",
  Cancel: "Annuler",
  "Close the comments": "Fermer les commentaires",
  Close: "Fermer",
  "Add a comment…": "Ajouter un commentaire…",
  Comment: "Commentaire",
  Post: "Publier",
  "{count} of {max} characters": "{count} sur {max} caractères",
  "Loading the comments…": "Chargement des commentaires…",
  "No comments yet. Be the first.": "Pas encore de commentaires. Écris le premier.",
  "Show more comments": "Afficher plus de commentaires",
  "{name}, {ago}: {text}": "{name}, {ago} : {text}",
  "Touch and hold to delete.": "Maintiens appuyé pour supprimer.",
  Reply: "Répondre",
  "Replying to {name}": "Réponse à {name}",
  "View {count} more reply": "Voir {count} autre réponse",
  "View {count} more replies": "Voir {count} autres réponses",

  // src/social/DrawingReactions.tsx
  React: "Réagir",
  "Your reaction: {name}": "Ta réaction : {name}",
  "{count} reaction": "{count} réaction",
  "{count} reactions": "{count} réactions",

  // src/social/DrawingsGrid.tsx
  Drawings: "Dessins",
  "No public drawings yet. Make a run public in My activities.":
    "Pas encore de dessins publics. Rends une course publique dans Mes activités.",
  "No drawings yet.": "Pas encore de dessins.",

  // src/profile/ProfileStats.tsx, src/profile/ProfileGallery.tsx (TASK-324)
  Likes: "J'aime",
  Photos: "Photos",
  "No photos yet.": "Pas encore de photos.",
  "No photos yet. Add some to a public drawing in My activities.":
    "Pas encore de photos. Ajoutes-en à un dessin public dans Mes activités.",

  // src/profile/PersonalBests.tsx (TASK-368)
  "Personal bests": "Records personnels",
  "Half marathon": "Semi-marathon",
  Marathon: "Marathon",

  // src/social/SuperLikeSheet.tsx
  "Super like": "Super like",
  "Write a comment to send your super like":
    "Écris un commentaire pour envoyer ton super like",
  Send: "Envoyer",
  "A super like comes with a comment. Everyone who sees the post can read it.":
    "Un super like s'accompagne d'un commentaire. Tous ceux qui voient la publication peuvent le lire.",

  // src/social/reactionKinds.ts
  "MuW heart, super like": "Cœur MuW, super like",
  Fire: "Feu",
  Clap: "Applaudissement",
  Strong: "Force",
  Laugh: "Rire",
  Wow: "Wow",

  // src/social/commentText.ts
  "You can't write negative comments in this app. Try another app.":
    "Dans cette app, tu ne peux pas écrire de commentaires négatifs. Change d'app.",
  "just now": "à l'instant",
  "{count} min ago": "il y a {count} min",
  "{count} h ago": "il y a {count} h",
  "{count} d ago": "il y a {count} j",
  yesterday: "hier",
  "Write a comment": "Écrire un commentaire",
  "{count} comment": "{count} commentaire",
  "{count} comments": "{count} commentaires",

  // src/social/drawingsDoor.ts
  "This drawing is no longer public.": "Ce dessin n'est plus public.",

  // src/social/FollowButton.tsx
  "Stop following {name}?": "Ne plus suivre {name} ?",
  Unfollow: "Ne plus suivre",
  "Takes your request back.": "Retire ta demande.",
  Follow: "Suivre",
  Requested: "Demandé",
  Following: "Suivis",

  // src/social/FollowLists.tsx
  Requests: "Demandes",
  Followers: "Abonnés",
  "Nobody is asking to follow you.": "Personne ne demande à te suivre.",
  "Nobody follows you yet.": "Personne ne te suit encore.",
  "You are not following anyone yet. Find friends from Feed.":
    "Tu ne suis encore personne. Trouve des amis depuis Feed.",
  Accept: "Accepter",
  "Accept {name}": "Accepter {name}",
  Decline: "Refuser",
  "Decline {name}": "Refuser {name}",
  "Follow back": "Suivre en retour",
  "Follow {name} back": "Suivre {name} en retour",
  Remove: "Retirer",
  "Remove {name}": "Retirer {name}",
  "Remove {name} from your followers?": "Retirer {name} de tes abonnés ?",

  // src/social/PeopleSearch.tsx
  "Log in to find your friends.": "Connecte-toi pour trouver tes amis.",
  "This server cannot look for members yet.":
    "Ce serveur ne peut pas encore chercher des membres.",
  Name: "Nom",
  "Type at least 2 letters of a name.": "Tape au moins 2 lettres d'un nom.",
  "Nobody has a name like that.": "Personne n'a un nom comme ça.",

  // src/strava/StravaActivityRow.tsx
  "Sending to Strava…": "Envoi vers Strava…",
  "View on Strava": "Voir sur Strava",
  "This run is on Strava.": "Cette course est sur Strava.",
  "Strava is still reading this run.": "Strava lit encore cette course.",
  "Check again": "Vérifier à nouveau",
  "Send to Strava": "Envoyer vers Strava",

  // src/strava/StravaParts.tsx
  "Opening Strava…": "Ouverture de Strava…",
  "Connect with Strava": "Se connecter avec Strava",
  On: "Oui",
  Off: "Non",
  "Name on Strava": "Nom sur Strava",
  "Leave empty for an automatic name": "Laisse vide pour un nom automatique",

  // src/strava/StravaRunEnd.tsx
  "Connect Strava, and Save sends your runs there too.":
    "Connecte Strava, et Enregistrer y enverra aussi tes courses.",
  "To {athlete}'s Strava, with Save.":
    "Avec Enregistrer, elle part aussi sur le Strava de {athlete}.",

  // src/strava/StravaSetting.tsx
  "Strava, connected": "Strava, connecté",
  "Strava, connected as {athlete}": "Strava, connecté en tant que {athlete}",
  Connected: "Connecté",
  "Connected as {athlete}": "Connecté en tant que {athlete}",
  "Disconnect Strava? Runs already sent stay on Strava.":
    "Déconnecter Strava ? Les courses déjà envoyées restent sur Strava.",
  Disconnect: "Déconnecter",
  "Disconnecting…": "Déconnexion…",
  "Disconnect Strava": "Déconnecter Strava",
  "Send the runs you save in MuW to your Strava profile.":
    "Envoie vers ton profil Strava les courses que tu enregistres dans MuW.",

  // src/strava/useStrava.ts
  "Could not open Strava. Try again.": "Impossible d'ouvrir Strava. Réessaie.",

  // The run: src/screens/{NavigateScreen,FreeRunScreen,RunDashboard,RunPanel,
  // FinishScreen,Countdown,HoldButton,PocketScreen,MapScreen}.tsx and
  // src/navigation/runStats.ts (TASK-210, la corsa)
  "Finding your position…": "Recherche de votre position…",
  "You have arrived.": "Vous êtes à l'arrivée.",
  "Off the route": "Hors du parcours",
  "Head back to the yellow line.": "Revenez sur la ligne jaune.",
  "Follow the route to the end.": "Suivez le parcours jusqu'au bout.",
  "Then {directions}": "Puis {directions}",
  "Heading {direction}": "Cap {direction}",
  north: "nord",
  "north-east": "nord-est",
  east: "est",
  "south-east": "sud-est",
  south: "sud",
  "south-west": "sud-ouest",
  west: "ouest",
  "north-west": "nord-ouest",
  "You are at your start": "Vous êtes au départ",
  "Your start: {distance} in a straight line, to the {direction}":
    "Votre départ : {distance} à vol d'oiseau, vers le {direction}",
  "Your start, in a straight line": "Votre départ, à vol d'oiseau",
  "Your run": "Votre course",
  "Distance: {distance}": "Distance : {distance}",
  "Distance: {distance} {units}": "Distance : {distance} {units}",
  "Keep running": "Continuer à courir",
  "Remember to stretch": "Pensez à vous étirer",
  Stretch: "S'étirer",
  Skip: "Passer",
  Done: "Terminé",
  "Pocket mode": "Mode poche",
  Pocket: "Poche",
  Finish: "Terminer",
  Stop: "Stop",
  "Paused: you stopped moving": "En pause : vous vous êtes arrêté",
  Paused: "En pause",
  Resume: "Reprendre",
  Pause: "Pause",
  Music: "Musique",
  "Opens Spotify": "Ouvre Spotify",
  "Show the numbers": "Afficher les chiffres",
  "Hide the numbers": "Masquer les chiffres",
  Compass: "Boussole",
  Map: "Carte",
  Data: "Données",
  "Auto-pause": "Pause auto",
  Voice: "Voix",
  "Kilometre {km}: {pace}": "Kilomètre {km} : {pace}",
  Km: "Km",
  Change: "Écart",
  "Your first kilometre will show here.": "Votre premier kilomètre s'affichera ici.",
  "Pace now": "Allure actuelle",
  "Avg pace": "Allure moy.",
  "Elev. gain": "Dénivelé",
  Calories: "Calories",
  "{minutes} min": "{minutes} min",
  "{hours} h {minutes} min": "{hours} h {minutes} min",
  "about {minutes} min": "environ {minutes} min",
  "about {hours} h {minutes} min": "environ {hours} h {minutes} min",
  "Starting in {number}": "Départ dans {number}",
  "Get ready": "Préparez-vous",
  "Hold to end the run": "Maintenez pour terminer la course",
  "Hold to stop": "Maintenez pour arrêter",
  "The screen goes dark but stays on, so directions go on. Do not lock the phone: if you press the side button, directions stop. To come back, hold the screen for 2 seconds.":
    "L'écran s'assombrit mais reste allumé, les indications continuent. Ne verrouillez pas le téléphone : si vous appuyez sur le bouton latéral, les indications s'arrêtent. Pour revenir, maintenez l'écran enfoncé 2 secondes.",
  "Go dark": "Assombrir",
  "Pocket mode. Hold for 2 seconds to leave.":
    "Mode poche. Maintenez 2 secondes pour quitter.",
  "Keep holding…": "Continuez à maintenir…",
  "Hold for 2 seconds to leave pocket mode":
    "Maintenez 2 secondes pour quitter le mode poche",
  // src/permissions/OpenSettings.tsx, src/location/LocationOff.tsx (TASK-259)
  "Open Settings": "Ouvrir Réglages",
  "Location is off": "La localisation est désactivée",
  "Allow it for MuW in Settings to follow the route.":
    "Autorise-la pour MuW dans Réglages pour suivre le parcours.",
  "Allow it for MuW in Settings to record your track.":
    "Autorise-la pour MuW dans Réglages pour enregistrer ta trace.",
  // src/activities/RunEnd.tsx, src/social/PublicParts.tsx, PublicRow.tsx,
  // DrawingCard.tsx (TASK-208)
  "This run could not be kept on the phone. Try again.":
    "Cette course n'a pas pu être gardée sur le téléphone. Réessaie.",
  "Save to My activities": "Enregistrer dans Mes activités",
  Tagged: "Identifiés",
  "{name}'s profile": "Profil de {name}",
  "Photo {n}": "Photo {n}",
  "Photos of a run only you can see stay on this phone. Delete the app or change phone and they are gone.":
    "Les photos d'une course que toi seul vois restent sur ce téléphone. Si tu supprimes l'app ou changes de téléphone, elles sont perdues.",
  "Its photos leave MuW and stay only on this phone.":
    "Ses photos quittent MuW et restent seulement sur ce téléphone.",
  "Every member sees it in your profile.": "Chaque membre la voit dans ton profil.",
  "Your followers see it in your profile.": "Tes abonnés la voient dans ton profil.",
  "Saved on the phone. It is sent when you are back online.":
    "Enregistrée sur le téléphone. Elle est envoyée quand tu seras de nouveau en ligne.",
  "Saved on the phone. Others see it when you are back online.":
    "Enregistrée sur le téléphone. Les autres la voient quand tu seras de nouveau en ligne.",
  Bike: "Vélo",
  Paddle: "Pagaie",
  Walk: "Marche",
  // src/sports/hiking.ts (TASK-377 part B), approved on 2026-11-05
  Hike: "Randonnée",
  "Trails can be demanding: check the route and the weather before you set off.":
    "Les sentiers peuvent être exigeants : vérifie le parcours et la météo avant de partir.",
  // src/sports/gravel_biking.ts, mountain_biking.ts (TASK-378 part B),
  // approved on 2026-11-05
  Gravel: "Gravel",
  MTB: "VTT",
  "Trails can be technical: check the route before you set off.":
    "Les sentiers peuvent être techniques : vérifie le parcours avant de partir.",
  // src/sports/inline_skating.ts (TASK-380 part B), approved on 2026-11-06
  Roller: "Roller",
  "Watch for traffic and steep descents: check the route before you set off.":
    "Attention à la circulation et aux descentes raides : vérifie le parcours avant de partir.",
  // src/sports/wheelchair.ts, settings/sport.ts (TASK-414 part B), approved on
  // 2026-11-08 (the user's choice 6)
  "Wheelchair & stroller": "Fauteuil et poussette",
  "Go without a route": "Partir sans parcours",
  "Map data can miss kerbs, steps and steep slopes: check the route before you set off.":
    "Les données de la carte peuvent oublier des bordures, des marches et des pentes raides : vérifie le parcours avant de partir.",
  // src/settings/sport.ts, social/PublicParts.tsx (TASK-375: a day on the snow)
  Ski: "Ski",
  "Cross-country ski": "Ski de fond",
  // src/sports/gym.ts, src/gym/ (TASK-385 B0: a workout at the gym)
  Gym: "Salle de sport",
  // The counts of a workout, one or more (TASK-453)
  "{count} exercise": "{count} exercice",
  "{count} exercises": "{count} exercices",
  "{count} set": "{count} série",
  "{count} sets": "{count} séries",
  "{count} rest": "{count} récup",
  "{count} rests": "{count} récups",
  "avg {time} · {total} resting": "moy. {time} · {total} de récup",
  // src/gym/ (TASK-385 part B), approved on 2026-11-04
  "Start workout": "Commencer la séance",
  "No route in the gym: MuW times your workout.":
    "Pas de parcours en salle : MuW chronomètre ta séance.",
  "+ Exercise": "+ Exercice",
  "Search exercises": "Rechercher un exercice",
  "How to do it": "Comment faire",
  "Watch out": "Attention",
  "Add to workout": "Ajouter à la séance",
  "Add “{name}”": "Ajouter « {name} »",
  "Set {n}": "Série {n}",
  Reps: "Répétitions",
  "Added weight": "Lest",
  Incline: "Inclinaison",
  Level: "Niveau",
  Floors: "Étages",
  "Log set": "Noter la série",
  "Same again": "Même chose",
  Rest: "Récup",
  Custom: "Personnalisé",
  "Next: {exercise} · set {n}": "Ensuite : {exercise} · série {n}",
  "Rest over — next set": "Récup terminée : série suivante",
  "Show exercises": "Afficher les exercices",
  "Still training?": "Tu t'entraînes encore ?",
  "Yes, keep going": "Oui, je continue",
  "Finish workout": "Terminer la séance",
  // src/gym/figures.ts, NewLevels.tsx (TASK-385 part E), approved on 2026-11-04
  Mouse: "Souris",
  Rabbit: "Lapin",
  Fox: "Renard",
  Wolf: "Loup",
  Bear: "Ours",
  Rhino: "Rhinocéros",
  Gorilla: "Gorille",
  "New level: {figure} · {exercise} {value}":
    "Nouveau niveau : {figure} · {exercise} {value}",
  // src/gym/Leaderboard.tsx (TASK-385 F)
  "Gym leaderboard · {month}": "Classement salle · {month}",
  "Pick an exercise from the grid": "Choisis un exercice dans la grille",
  "Log each set: the rest starts by itself":
    "Note chaque série : la récup démarre toute seule",
  "«Save»: calories, milestones and leaderboard":
    "« Enregistrer » : calories, niveaux et classement",
  "Last workout: {when} · {time}": "Dernière séance : {when} · {time}",
  "This month: 1 time": "Ce mois-ci : 1 fois",
  "This month: {n} times": "Ce mois-ci : {n} fois",
  "Gym calendar": "Calendrier salle",
  Plans: "Programmes",
  "New plan": "Nouveau programme",
  "Plan name": "Nom du programme",
  Sets: "Séries",
  "{n} exercises": "{n} exercices",
  "1 exercise": "1 exercice",
  "Start without the plan": "Commencer sans programme",
  "Plan: {done}/{total} sets": "Programme : {done}/{total} séries",
  "Delete plan": "Supprimer le programme",
  "Delete “{name}”?": "Supprimer « {name} » ?",
  Planned: "Prévue",
  "Start “{plan}”": "Commencer « {plan} »",
  "{n} plans": "{n} programmes",
  "1 plan": "1 programme",
  "Set {n} of {total}": "Série {n} sur {total}",
  "Then: {exercise}": "Ensuite : {exercise}",
  "{n} times · {time}": "{n} fois · {time}",
  // src/gym/GymPlanWizard.tsx, GymPlans.tsx, SessionEditor.tsx, proposal.ts (the guided plans, 2026-11-10)
  "Week {n} of {total}": "Semaine {n} sur {total}",
  "More load each week": "Plus de charge chaque semaine",
  "+{kg} kg, the last week lighter to recover":
    "+{kg} kg, la dernière semaine plus légère pour récupérer",
  "More reps each week": "Plus de répétitions chaque semaine",
  "10, 11, 12, then more kg and back to 10":
    "10, 11, 12, puis plus de kg et retour à 10",
  "Weeks A / B in turn": "Semaines A / B en alternance",
  "Other exercises every other week": "D'autres exercices une semaine sur deux",
  "Always the same": "Toujours pareil",
  "As before: one week that repeats": "Comme avant : une semaine qui se répète",
  "rest {n} min": "récup {n} min",
  "rest {n} s": "récup {n} s",
  "By hand": "À la main",
  Lighter: "Plus légère",
  "Base@@week": "Base",
  "+1 rep": "+1 rép.",
  "+{n} reps": "+{n} rép.",
  "Every week": "Chaque semaine",
  "{goal} · 1 day": "{goal} · 1 jour",
  "{goal} · {n} days": "{goal} · {n} jours",
  "Looks good": "C'est parfait",
  "Save plan": "Enregistrer le programme",
  Continue: "Continuer",
  "Step {n} of {total}": "Étape {n} sur {total}",
  "I'll write the plan myself": "J'écris le programme moi-même",
  "What do you want to achieve?": "Que veux-tu obtenir ?",
  "Sets, reps and rest come from here. You can change them later.":
    "Séries, répétitions et récup en découlent. Tu pourras les changer ensuite.",
  "to start with": "pour commencer",
  "How many days a week?": "Combien de jours par semaine ?",
  "How the work is split": "Comment le travail est réparti",
  "Your plan": "Ton programme",
  "Here is your plan": "Voici ton programme",
  "Add the exercises of each day.": "Ajoute les exercices de chaque jour.",
  "Ready to use. Touch an exercise to change it.":
    "Prêt à l'emploi. Touche un exercice pour le changer.",
  "Workout name": "Nom de la séance",
  "About {n} minutes": "Environ {n} minutes",
  "Write the kg at the first workout": "Tu notes les kg à la première séance",
  "The same week, again and again.": "La même semaine, encore et encore.",
  "Two weeks in turn, again and again.":
    "Deux semaines en alternance, encore et encore.",
  "A cycle of {n} weeks, then again with the new weights.":
    "Un cycle de {n} semaines, puis on recommence avec les nouvelles charges.",
  "How do the weeks change?": "Comment évoluent les semaines ?",
  "Week {n}": "Semaine {n}",
  "Wk {n}": "Sem. {n}",
  "Touch a week to change it.": "Touche une semaine pour la changer.",
  Weeks: "Semaines",
  "Written by hand.": "Écrite à la main.",
  "Back to the automatic week": "Revenir à la semaine automatique",
  "Monday {day}": "Lundi {day}",
  "Today, {day}": "Aujourd'hui, {day}",
  "+{kg} kg a week · the last one lighter":
    "+{kg} kg par semaine · la dernière plus légère",
  "A rep more each week": "Une répétition de plus chaque semaine",
  "All set": "Tout est prêt",
  "It starts": "Début",
  "days a week": "jours par sem.",
  week: "semaine",
  weeks: "semaines",
  exercises: "exercices",
  "My plans": "Mes programmes",
  "always the same": "toujours pareil",
  "New guided plan": "Nouveau programme guidé",
  "From {day}": "À partir du {day}",
  Edit: "Modifier",
  "Move up": "Monter",
  "Move down": "Descendre",
  Swap: "Changer",
  "Add exercise": "Ajouter un exercice",
  "More muscle": "Plus de muscle",
  "More strength": "Plus de force",
  "Tone up and lose weight": "Tonifier et maigrir",
  "Get back in shape": "Retrouver la forme",
  "Full body A": "Corps entier A",
  "Full body B": "Corps entier B",
  "Chest, shoulders, triceps": "Pectoraux, épaules, triceps",
  "Back, biceps": "Dos, biceps",
  "Legs, core": "Jambes, abdos",
  "Upper body A": "Haut du corps A",
  "Upper body B": "Haut du corps B",
  "Lower body A": "Bas du corps A",
  "Lower body B": "Bas du corps B",
  "Arms, core": "Bras, abdos",
  "Workout {letter}": "Séance {letter}",
  // src/gym/RunnerStep.tsx, runPace.ts, GymPlanWizard.tsx, GymDrawGuide.tsx (TASK-452, approved 2026-11-11)
  "Pace@@run": "Allure",
  "Intermediate@@runner": "Intermédiaire",
  "Expert@@runner": "Confirmé",
  Yes: "Oui",
  "Your runs say {pace}/km over 10 km: update the paces?":
    "Tes courses disent {pace}/km sur 10 km : je mets à jour les allures ?",
  "From your {pace}/km over 10 km and your long run of {long}.":
    "D'après ton {pace}/km sur 10 km et ta sortie longue de {long}.",
  "How do you run today?": "Comment cours-tu aujourd'hui ?",
  "Make my paces": "Calculer mes allures",
  "Two answers and the plan's paces are yours.":
    "Deux réponses et les allures du programme sont les tiennes.",
  "Your paces": "Tes allures",
  "at {pace}/km": "à {pace}/km",
  "10 km in {time}": "10 km en {time}",
  "At the end of each cycle": "À la fin de chaque cycle",
  "Easy: your pace over 10 km + 1:05. Long: + 1:15. Intervals of 400 m: − 0:25. The long run starts from yours and grows 1 km a week; the easy run is about half of it.":
    "Lente : ton allure sur 10 km + 1:05. Longue : + 1:15. Fractionné de 400 m : − 0:25. La sortie longue part de la tienne et grandit de 1 km par semaine ; la lente en fait environ la moitié.",
  "How I work them out": "Comment je les calcule",
  "I don't know: I'll pick my level": "Je ne sais pas : je choisis mon niveau",
  "I look at your runs: if you got faster, I propose new paces.":
    "Je regarde tes courses : si tu es plus rapide, je te propose de nouvelles allures.",
  "The longest run you do without strain":
    "La plus longue course que tu fais sans peine",
  "Your long run, today": "Ta sortie longue, aujourd'hui",
  "Your pace over 10 km": "Ton allure sur 10 km",
  "minutes per km": "minutes au km",
  "{n} minutes": "{n} minutes",
  Beginner: "Débutant",
  // src/gym/SportsDoor.tsx, bodyweight.ts, GymPlanWizard.tsx (TASK-461 A2, approved 2026-11-11)
  "What do you want to train?": "Que veux-tu entraîner ?",
  "Choose at least two: a plan always mixes two sports. Then we guide you in 5 steps.":
    "Choisis-en au moins deux : un plan mélange toujours deux sports. Ensuite, on te guide en 5 étapes.",
  "With weights and machines": "Avec poids et machines",
  Bodyweight: "Poids du corps",
  "At home or in the park, no equipment": "À la maison ou au parc, sans matériel",
  "Easy, intervals, long": "Footing, fractionné, sortie longue",
  "Toward a distance": "Vers une distance",
  "Running, walking, cycling, swimming": "Course, marche, vélo, natation",
  Mountains: "Montagne",
  "Hikes and trips, more climb each week":
    "Randonnées et sorties, plus de dénivelé chaque semaine",
  "Soon@@door": "Bientôt",
  "Next · 1 chosen": "Suivant · 1 choisi",
  "Next · {n} chosen": "Suivant · {n} choisis",
  "More each week": "Plus chaque semaine",
  "+1 rep, +5 s held; week {n} lighter":
    "+1 répétition, +5 s en gainage ; la semaine {n} plus légère",
  "Without weights you grow with reps and seconds.":
    "Sans poids, on progresse avec les répétitions et les secondes.",
  "with the hardest exercises": "avec les exercices les plus durs",
  "What do you have?": "Qu'as-tu à disposition ?",
  "A pull-up bar": "Une barre de traction",
  "Bar and dip bars": "Barre et barres parallèles",
  "With the bar we add pull-ups, with the dip bars the dips.":
    "Avec la barre, on ajoute des tractions, avec les barres parallèles, des dips.",
  "How many days for each sport?": "Combien de jours pour chaque sport ?",
  "Already spread out, with rest in between. Touch a day to change it.":
    "Déjà répartis, avec du repos entre les deux. Touche un jour pour le changer.",
  "The whole body, {n} times a week. Touch an exercise to change it.":
    "Tout le corps, {n} fois par semaine. Touche un exercice pour le changer.",
  "No equipment": "Sans matériel",
  "A cycle of {n} weeks, then it starts again from where you got to.":
    "Un cycle de {n} semaines, puis on repart de là où tu es arrivé.",
  "{a} and {b}, for example.": "{a} et {b}, par exemple.",
  "Bodyweight · A": "Poids du corps · A",
  "Bodyweight · B": "Poids du corps · B",
  // src/gym/GymIntroSheet.tsx, GymDrawGuide.tsx (TASK-433 B, approved 2026-11-10)
  "Your plan, step by step": "Ton programme, étape par étape",
  "A minute to make it, then it guides you every time.":
    "Une minute pour le créer, puis il te guide à chaque fois.",
  "Choose your goal and days": "Choisis ton objectif et tes jours",
  "More muscle, more strength, tone up or get back in shape, 2 to 5 days.":
    "Plus de muscle, plus de force, tonifier ou retrouver la forme, de 2 à 5 jours.",
  "The plan is ready": "Le programme est déjà prêt",
  "Exercises, sets and reps proposed: touch an exercise to change it.":
    "Exercices, séries et répétitions proposés : touche un exercice pour le changer.",
  "The weeks change by themselves": "Les semaines changent d'elles-mêmes",
  "More load, more reps or weeks A / B. Here you find today's workout.":
    "Plus de charge, plus de répétitions ou semaines A / B. Ici, tu trouves la séance du jour.",
  "Create my plan": "Créer mon programme",
  "How plans work": "Comment marchent les programmes",
  // src/gym/RunDayEditor.tsx, runDay.ts, GymPlanWizard.tsx, GymDrawGuide.tsx (TASK-433 C, approved 2026-11-10)
  "Go to the run · {amount}": "Aller à la course · {amount}",
  "Gym today instead": "Plutôt la salle aujourd'hui",
  "And running?": "Et la course ?",
  No: "Non",
  "Touch a day to change it: gym, run or rest.":
    "Touche un jour pour le changer : salle, course ou repos.",
  "Your week": "Ta semaine",
  "How much": "Combien",
  "The same every week.": "Pareil chaque semaine.",
  "Which run": "Quelle course",
  "With the weeks": "Au fil des semaines",
  minutes: "minutes",
  "{values}; week {n}: {last} to recover":
    "{values} ; semaine {n} : {last} pour récupérer",
  "Easy run": "Course lente",
  Intervals: "Fractionné",
  "Easy, at a pace you can talk at.": "Facile, à une allure où tu peux parler.",
  "Easy@@run": "Lente",
  "Fast stretches with a slow jog between.":
    "Des portions rapides avec un footing lent entre deux.",
  "Long@@run": "Longue",
  "Longer than the others, slowly.": "Plus longue que les autres, doucement.",
  "easy, you can talk": "facile, tu parles",
  "fast + recovery": "rapide + récup",
  "more km, slowly": "plus de km, doucement",
  Workout: "Séance",
  "Only sets logged live count.": "Seules les séries notées en direct comptent.",
  // src/screens/ChooseScreen.tsx (TASK-375)
  "No shapes on the slopes: MuW records your day.":
    "Pas de formes sur les pistes : MuW enregistre ta journée.",
  Title: "Titre",
  "Give it a name": "Donne-lui un nom",
  "How did it go?": "Comment ça s'est passé ?",
  Activity: "Activité",
  Everyone: "Tout le monde",
  "Only me": "Moi seulement",
  "Who can see it": "Qui peut la voir",
  "Tag people": "Identifier des personnes",
  "Remove photo {n}": "Retirer la photo {n}",
  "Add photo": "Ajouter une photo",
  "This photo could not be kept on the phone. Try again.":
    "Cette photo n'a pas pu être gardée sur le téléphone. Réessaie.",

  // «Explore»: src/explore/* (TASK-210, parte C)
  "ASK FOR A ROUTE": "DEMANDER UN PARCOURS",
  "A shape through real places {place}. Tap one to make it.":
    "Une forme à travers de vrais lieux {place}. Touchez-en une pour la créer.",
  Food: "Gastronomie",
  "Famous Places": "Lieux célèbres",
  Romantic: "Romantique",
  "Best Views": "Belles vues",
  Shopping: "Shopping",
  Culture: "Culture",
  Nightlife: "Vie nocturne",
  "Hidden Gems": "Coins cachés",
  Running: "Course",
  Walking: "Promenade",
  Family: "Famille",
  Photography: "Photographie",
  "Local Experience": "Vie locale",
  "More categories": "Plus de catégories",
  "More…": "Plus…",
  "{count} more": "{count} de plus",
  "OR IN YOUR WORDS": "OU AVEC VOS MOTS",
  "From {where}. Name a city in the words to go elsewhere.":
    "Départ {where}. Nommez une ville dans les mots pour aller ailleurs.",
  "Make my route": "Créer mon parcours",
  "EXAMPLES IN {city}": "EXEMPLES À {city}",
  "No recommended routes here yet: shapes of {distance} from the centre, drawn now.":
    "Pas encore de parcours recommandés ici : des formes de {distance} depuis le centre, dessinées maintenant.",
  "Three first, more while you choose.":
    "Trois d'abord, d'autres pendant que vous choisissez.",
  "Starting within {distance} of {place}": "Départ à moins de {distance} de {place}",
  "your start": "votre départ",
  "Loading routes…": "Chargement des parcours…",
  "Choose a start first: the routes are the ones near it.":
    "Choisissez d'abord un départ : les parcours sont ceux à proximité.",
  "The routes could not load. Check the connection and try again.":
    "Les parcours n'ont pas pu se charger. Vérifiez la connexion et réessayez.",
  // src/explore/IdeasFromEurope.tsx, themedIdeas.ts, ThemedCard.tsx: our ideas
  "IDEAS FROM EUROPE": "IDÉES D'EUROPE",
  "Make it near me": "Le faire près de moi",
  Rome: "Rome",
  Paris: "Paris",
  London: "Londres",
  Barcelona: "Barcelone",
  Amsterdam: "Amsterdam",
  Lisbon: "Lisbonne",
  Prague: "Prague",
  Berlin: "Berlin",
  "Getting directions…": "Récupération de l'itinéraire…",
  CITY: "VILLE",
  "Type a city or a place": "Saisissez une ville ou un lieu",
  "No city or place matches “{typed}”.":
    "Aucune ville ni aucun lieu ne correspond à « {typed} ».",
  "The search did not answer. Try again.": "La recherche n'a pas répondu. Réessayez.",
  "A city you chose before": "Une ville choisie auparavant",
  "The routes near your start": "Les parcours près de votre départ",
  "{title} · {city} · looks {percent}% like it":
    "{title} · {city} · ressemble à {percent} %",
  "Loading the route…": "Chargement du parcours…",
  "The route could not load. Try again.":
    "Le parcours n'a pas pu se charger. Réessayez.",
  "Drawing a {distance} {title}…": "Dessin de {title} sur {distance}…",
  "The GPX could not be made. Try again.": "Le GPX n'a pas pu être créé. Réessayez.",
  "It passes by none of the {found} {theme} found: the shape did not fit near them.":
    "Il ne passe par aucun des {found} {theme} trouvés : la forme ne tenait pas à proximité.",
  "Passes by {passed} of the {found} {theme} found:":
    "Passe par {passed} des {found} {theme} trouvés :",
  "Back to Explore": "Retour à Explore",
  "MEANWHILE, FROM THE FEED": "EN ATTENDANT, DEPUIS LE FEED",
  "The first time in a city the map has to download: it can take a minute. The shapes show up above as they are ready.":
    "La première fois dans une ville, la carte doit se télécharger : cela peut prendre une minute. Les formes apparaissent ci-dessus dès qu'elles sont prêtes.",
  "The shapes of this city are ready above.":
    "Les formes de cette ville sont prêtes ci-dessus.",
  "Maps: {credit}": "Cartes : {credit}",
  "City centre": "Centre-ville",
  "The API did not answer. Check the connection and try again.":
    "Le serveur n'a pas répondu. Vérifiez la connexion et réessayez.",
  "The map of this area could not be loaded for directions. Try again later.":
    "La carte de cette zone n'a pas pu se charger pour l'itinéraire. Réessayez plus tard.",
  "This route is not on the map the API has: it has no directions.":
    "Ce parcours n'est pas sur la carte du serveur : il n'a pas d'itinéraire.",
  "The directions could not be found. Try again.":
    "L'itinéraire n'a pas été trouvé. Réessayez.",
  "The API answered without directions. It may be out of date.":
    "Le serveur a répondu sans itinéraire. Il n'est peut-être pas à jour.",
  "near your start": "près de vous",
  "near {place}": "près de {place}",
  "in {city}": "à {city}",
  "e.g. a romantic heart, famous places, food 8 km":
    "ex. un cœur romantique, lieux célèbres, gastronomie 8 km",
  "e.g. a romantic heart in {city}, 8 km": "ex. un cœur romantique à {city}, 8 km",
  // «Sport»: src/settings/{SportSetting,SportButton}.tsx, sport.ts, and the voice
  // of «Data»: src/voice/VoiceSetting.tsx (TASK-210, parte E)
  SPORT: "SPORT",
  Soon: "Bientôt",
  "{sport}, coming soon": "{sport}, bientôt disponible",
  "Sport, {sport}": "Sport, {sport}",
  "Changes the sport": "Change le sport",
  // The families of the sport panel: src/settings/sportFamilies.ts
  "On foot": "À pied",
  "On wheels": "Sur roues",
  "Other@@sport": "Autres",
  Sport: "Sport",
  Default: "Par défaut",
  "Voice language and voice: {language}, {voice}":
    "Langue et voix : {language}, {voice}",
  "Changes the language and the voice": "Change la langue et la voix",
  Listen: "Écouter",
  "Says a turn with this voice": "Annonce un virage avec cette voix",
  "Turn on Voice to listen": "Active « Voix » pour écouter",
  "App language": "Langue de l'app",
  "This phone did not list its voices: its own voice speaks.":
    "Ce téléphone n'a pas listé ses voix : c'est sa propre voix qui parle.",
  "This phone has no {language} voice: the voice speaks English.":
    "Ce téléphone n'a pas de voix pour {language} : la voix parle anglais.",
  "{language} · Enhanced": "{language} · Améliorée",

  // The titles of the three pages: src/screens/pageTitles.ts (TASK-210, parte G)
  Feed: "Fil",
  Draw: "Dessiner",
  Explore: "Explorer",

  // src/feed/FeedPost.tsx (TASK-118: a member's drawing without a place)
  "{user}: {title}. {facts}.": "{user} : {title}. {facts}.",

  // The shapes' names, the map and «Explore»: src/route/shapeWords.ts,
  // src/map/mapPage.ts, src/explore/{ExploreScreen,ThemedCard}.tsx
  // (TASK-210, parte F)
  "{list} or {last}": "{list} ou {last}",
  "Start here": "Départ ici",
  "NEAR {city}": "PRÈS DE {city}",
  here: "ici",

  // src/explore/RecommendedRow.tsx (TASK-092)
  RECOMMENDED: "RECOMMANDÉS",

  // src/social/ReportMenu.tsx, BlockedPeople.tsx (TASK-121: report and block)
  More: "Plus",
  "Report or block": "Signaler ou bloquer",
  Report: "Signaler",
  "Block {user}": "Bloquer {user}",
  "Why are you reporting this?": "Pourquoi signales-tu ceci ?",
  Spam: "Spam",
  "Offensive or hateful": "Offensant ou haineux",
  "Harassment or bullying": "Harcèlement ou intimidation",
  "Nudity or sexual content": "Nudité ou contenu sexuel",
  "Something else": "Autre chose",
  "Thanks for telling us. We will look at it.":
    "Merci de nous l'avoir signalé. Nous allons vérifier.",
  "Block {user}?": "Bloquer {user} ?",
  "You will not see each other's drawings, comments, messages or profile, any follow between you ends and your conversation is deleted. They are not told.":
    "Vous ne verrez plus les dessins, commentaires, messages ni le profil l'un de l'autre, tout abonnement entre vous prend fin et votre conversation est supprimée. La personne n'est pas prévenue.",
  Block: "Bloquer",
  "Sending…": "Envoi…",
  "This is not available any more.": "Ce n'est plus disponible.",
  "Blocked people": "Personnes bloquées",
  "You have not blocked anyone.": "Tu n'as bloqué personne.",
  Unblock: "Débloquer",
  "Unblock {name}": "Débloquer {name}",
  "You blocked {user}. Unblock them from Blocked people in Settings.":
    "Tu as bloqué {user}. Tu peux le débloquer dans Personnes bloquées, dans Réglages.",

  // src/settings/NotificationsSetting.tsx, notificationFields.ts (TASK-262: push sent)
  "Push notifications tell you at once about follow requests, reactions, comments and tags. Email notifications sends the same news in one email a day at most. Email when I'm away: one email if you don't open MuW for 2 weeks.":
    "Les notifications push te préviennent tout de suite des demandes de suivi, des réactions, des commentaires et des identifications. Les Notifications par e-mail envoient les mêmes nouvelles dans un e-mail par jour au plus. E-mail en cas d'absence : un e-mail si tu n'ouvres pas MuW pendant 2 semaines.",
  "Notifications are off for MuW on this phone. Allow them in Settings to turn this on.":
    "Les notifications de MuW sont désactivées sur ce téléphone. Autorise-les dans Réglages pour les activer.",

  // src/paddle/PaddleExplore.tsx (TASK-269)
  Lakes: "Lacs",
  Sea: "Mer",
  "Suggested near {place}": "Suggérés près de {place}",
  "Suggested near where you usually start": "Suggérés près de ton départ habituel",
  "Suggested near your start": "Suggérés près de ton départ",

  // src/stretch (TASK-285 part B)
  "Quad stretch": "Étirement du quadriceps",
  "Stand tall. Pull one heel toward your glutes, knees together.":
    "Debout, bien droit. Ramenez un talon vers la fesse, genoux serrés.",
  "Hamstring stretch": "Étirement des ischio-jambiers",
  "Put one heel forward, toes up. Lean from the hips, back straight.":
    "Un talon devant, pointe vers le haut. Penchez-vous depuis les hanches, dos droit.",
  "Calf stretch": "Étirement du mollet",
  "Step back, heel down. Lean toward the wall until the calf pulls.":
    "Un pas en arrière, talon au sol. Penchez-vous vers le mur jusqu'à sentir le mollet.",
  "Hip flexor stretch": "Étirement des fléchisseurs de hanche",
  "Kneel on one knee. Push your hips forward, chest up.":
    "Un genou au sol. Poussez le bassin vers l'avant, poitrine haute.",
  "Glute stretch": "Étirement du fessier",
  "Cross one ankle over the other knee. Sit back as if into a chair.":
    "Croisez une cheville sur l'autre genou. Asseyez-vous en arrière comme sur une chaise.",
  "{index} of {total}": "{index} sur {total}",
  "Right side": "Côté droit",
  "Left side": "Côté gauche",
  "Switch sides": "Changez de côté",
  End: "Terminer",
  "Next: {exercise}": "Ensuite : {exercise}",
  "{seconds} seconds left": "{seconds} secondes restantes",
  "Stop if it hurts.": "Arrêtez si ça fait mal.",
  // «Draw»: src/route/samplePictures.ts (TASK-280)
  "Running shoe": "Basket",
  Dinosaur: "Dinosaure",
  Guitar: "Guitare",
  "Eiffel Tower": "Tour Eiffel",
  Rocket: "Fusée",
  Plane: "Avion",
  Balloon: "Ballon",
  Leaf: "Feuille",
  Mushroom: "Champignon",
  Car: "Voiture",
  "T-shirt": "T-shirt",
  Boot: "Botte",
  House: "Maison",
  Duck: "Canard",
  Trophy: "Trophée",
  Bone: "Os",

  // src/route/RoutePanel.tsx (TASK-340: first in «Draw», it opens the map
  // to draw on)
  Freehand: "À main levée",
  // src/mapdraw/DrawOnMap.tsx (TASK-281)
  Move: "Déplacer",
  "Draw with one finger. End where you started to close it. Two fingers move the map.":
    "Dessine avec un doigt. Termine là où tu as commencé pour la fermer. Deux doigts déplacent la carte.",
  "Each new line joins the drawing. Two fingers move the map.":
    "Chaque nouvelle ligne rejoint le dessin. Deux doigts déplacent la carte.",
  "Drag the figure or the map. Hold a line still, then drag to bend it. Two fingers resize and turn it.":
    "Fais glisser la figure ou la carte. Garde le doigt immobile sur une ligne, puis fais glisser pour la plier. Deux doigts changent la taille et la font tourner.",
  // src/mapdraw/DrawOnMap.tsx (TASK-402)
  "Turn left 15 degrees": "Tourner de 15 degrés vers la gauche",
  "Turn right 15 degrees": "Tourner de 15 degrés vers la droite",
  "Angle, {deg} degrees. Double tap to type it":
    "Angle, {deg} degrés. Touchez deux fois pour le saisir",
  // src/mapdraw/DrawOnMap.tsx (TASK-402 part B)
  "Change@@piece": "Changer",
  "Tap a piece to choose it, then drag, resize or turn it. Tap outside to take them all.":
    "Touche une pièce pour la choisir, puis fais-la glisser, redimensionne-la ou tourne-la. Touche à côté pour les prendre toutes.",
  "Delete piece": "Supprimer la pièce",
  "Up to 6 pieces in one drawing.": "Au plus 6 pièces dans un dessin.",
  Line: "Ligne",
  "Tap point after point. Tap the first point to close it, the last one to finish.":
    "Touche point après point. Touche le premier point pour la fermer, le dernier pour terminer.",
  "The outline cannot cross itself. Bend it less.":
    "Le contour ne peut pas se croiser. Plie-le moins.",
  Redo: "Rétablir",
  "Clear all": "Tout effacer",
  "Clear the whole drawing?": "Effacer tout le dessin ?",
  "+ photo": "+ photo",

  // src/screens/ChooseScreen.tsx, src/location/PickStart.tsx (TASK-292)
  "Choose on the map": "Choisir sur la carte",
  "Move the map to put the pin where you want to start.":
    "Déplace la carte pour mettre l'épingle là où tu veux partir.",

  // src/share/SharePost.tsx, src/share/videoFile.ts (TASK-295)
  "Export video": "Exporter la vidéo",
  "Making the video… {percent}%": "Création de la vidéo… {percent} %",
  "This phone cannot make the video.": "Ce téléphone ne peut pas créer la vidéo.",
  "The video could not be made. Try again.":
    "La vidéo n'a pas pu être créée. Réessaie.",

  // src/screens/pageTitles.ts, src/game/ (TASK-296: the shape game, «Play»)
  Play: "Jouer",
  "{distance} in total": "{distance} au total",
  "{distance} under {pace}": "{distance} sous {pace}",
  "Best {best} · target {target}": "Meilleur {best} · objectif {target}",
  "Longest run {distance}": "Plus longue course {distance}",
  "Unlocked {date}": "Débloquée {date}",
  "Sign in to collect shapes.": "Connecte-toi pour collectionner des formes.",
  "{distance} counted so far": "{distance} comptés jusqu'ici",
  "The game is not available right now.": "Le jeu n'est pas disponible pour le moment.",
  "New shape unlocked": "Nouvelle forme débloquée",
  "New shape unlocked: {name}": "Nouvelle forme débloquée : {name}",
  "It is in your collection.": "Elle est dans ta collection.",
  "See collection": "Voir la collection",
  // src/game/ (TASK-423 part D: the collections, the personal challenges,
  // the streak, the one list of «Challenges»)
  "One run of {distance}": "Une course de {distance}",
  "{name}, {unlocked} of {total} shapes": "{name}, {unlocked} formes sur {total}",
  "{unlocked} of {total} shapes": "{unlocked} formes sur {total}",
  "In progress": "En cours",
  Available: "Disponibles",
  Finished: "Terminés",
  "Nothing in progress.": "Rien en cours.",
  "Nothing finished yet.": "Rien de terminé pour l'instant.",
  "This week": "Cette semaine",
  "This month": "Ce mois-ci",
  "Shape completed": "Forme terminée",
  "Past monthly challenges": "Défis du mois passés",
  "Themes and winners of the past months": "Thèmes et gagnants des mois passés",
  "Other shapes": "Autres formes",
  Streak: "Série",
  "{count} outing a week": "{count} sortie par semaine",
  "{count} outings a week": "{count} sorties par semaine",
  "{count} week": "{count} semaine",
  "{count} weeks": "{count} semaines",
  "best {best}": "record {best}",
  "Kilometres this week": "Kilomètres de la semaine",
  "Active days": "Jours actifs",
  "Long outings": "Sorties longues",
  "Early bird": "Lève-tôt",
  Weekend: "Week-end",
  "Evening outings": "En soirée",
  "5 km pace": "Allure sur 5 km",
  "Long run": "Longue sortie",
  "Fast kilometre": "Kilomètre rapide",
  "10 km pace": "Allure sur 10 km",
  Double: "Doublé",
  "Kilometres this month": "Kilomètres du mois",
  "Long outings of the month": "Les longues du mois",
  "Active days of the month": "Jours actifs du mois",
  "Early riser": "Matinal",
  "Kilometres counted": "Kilomètres comptés",
  "Days with an outing": "Jours avec une sortie",
  "Outings of {distance} or more": "Sorties de {distance} ou plus",
  "Outings started before 8 am": "Sorties commencées avant 8 h",
  "Outings started after 7 pm": "Sorties commencées après 19 h",
  "Kilometres on Saturday and Sunday": "Kilomètres le samedi et le dimanche",
  "{distance} in one run, under the pace": "{distance} d'affilée, sous l'allure",
  "One outing of the distance": "Une sortie de cette distance",
  "Runs of {distance} or more": "Courses de {distance} ou plus",
  Bronze: "Bronze",
  Silver: "Argent",
  Gold: "Or",
  "No run of {distance} yet": "Pas encore de course de {distance}",
  "Week of {date}": "Semaine du {date}",
  "Month of {date}": "Mois du {date}",
  // src/game/goalText.ts, shapeProgress.ts (TASK-423 after use: the names
  // of the distances, the bar of a pace)
  "1 mile": "1 mile",
  "One half marathon": "Un semi-marathon",
  "One marathon": "Un marathon",
  "First run {distance} in one go · longest {longest}":
    "Cours d'abord {distance} d'affilée · jusqu'ici {longest}",
  "No time over {distance} yet": "Pas encore de temps sur {distance}",
  "Best {best} · {gap} to go": "Meilleur {best} · encore {gap}",
  // src/game/ (TASK-423 part E2a: the prizes in Play, the editions, the
  // unlock card of an edition or a collection)
  Prizes: "Récompenses",
  "Frames, titles and badges": "Cadres, titres et badges",
  "Prizes are not on this server yet.":
    "Les récompenses ne sont pas encore sur ce serveur.",
  "Silver editions: {count}": "Éditions argent : {count}",
  "Gold editions: {count}": "Éditions or : {count}",
  Frames: "Cadres",
  "Complete a collection to earn its frame.":
    "Complète une collection pour obtenir son cadre.",
  Titles: "Titres",
  Badges: "Badges",
  Earned: "Obtenu",
  "Complete the collection to earn it.": "Complète la collection pour l'obtenir.",
  "{collection} frame": "Cadre {collection}",
  "Bronze edition": "Édition bronze",
  "Silver edition": "Édition argent",
  "Gold edition": "Édition or",
  "{runs} of {need} runs for silver": "{runs} courses sur {need} pour l'argent",
  "{runs} of {need} runs for gold": "{runs} courses sur {need} pour l'or",
  Runner: "Coureur",
  Explorer: "Explorateur",
  Traveller: "Voyageur",
  Globetrotter: "Globe-trotteur",
  Marathoner: "Marathonien",
  Ultrarunner: "Ultra-traileur",
  Steady: "Régulier",
  Collector: "Collectionneur",
  "4-week streak": "Série de 4 semaines",
  "12-week streak": "Série de 12 semaines",
  "52-week streak": "Série de 52 semaines",
  "10 medals": "10 médailles",
  "50 medals": "50 médailles",
  "10 gold editions": "10 éditions or",
  "Team shape": "Forme d'équipe",
  "10 team shapes": "10 formes d'équipe",
  "Run a marathon": "Cours un marathon",
  "Run 50 km in one go": "Cours 50 km d'affilée",
  "Complete every collection": "Complète toutes les collections",
  "{count} week in a row with an outing": "{count} semaine d'affilée avec une sortie",
  "{count} weeks in a row with an outing": "{count} semaines d'affilée avec une sortie",
  "{count} medal in the personal challenges":
    "{count} médaille dans les défis personnels",
  "{count} medals in the personal challenges":
    "{count} médailles dans les défis personnels",
  "{count} shape in its gold edition": "{count} forme dans son édition or",
  "{count} shapes in their gold edition": "{count} formes dans leur édition or",
  "{count} team challenge completed": "{count} défi d'équipe réussi",
  "{count} team challenges completed": "{count} défis d'équipe réussis",
  "In your {collection} collection.": "Dans ta collection {collection}.",
  "You met its goal in {count} runs.": "Tu as atteint l'objectif en {count} courses.",
  "Collection complete": "Collection terminée",
  "A new frame for your profile.": "Un nouveau cadre pour ton profil.",
  "New in Play": "Nouveau dans Play",
  "See them in your collection.": "Tu les trouveras dans ta collection.",
  "{count} new shape": "{count} nouvelle forme",
  "{count} new shapes": "{count} nouvelles formes",
  "{count} new edition": "{count} nouvelle édition",
  "{count} new editions": "{count} nouvelles éditions",
  "{collection} complete": "{collection} terminée",
  // src/game/PrizesPage.tsx, GamePrizesRow.tsx (TASK-423 part E2b: what
  // the profile shows)
  "Touch a prize you have to show it on your profile. Nothing is shown until you choose.":
    "Touche une récompense que tu as pour la montrer sur ton profil. Tant que tu ne choisis pas, rien n'est montré.",
  "On your profile": "Sur ton profil",
  "Your profile shows up to {count} badges.":
    "Ton profil montre jusqu'à {count} badges.",
  "Title: {title}": "Titre : {title}",

  // src/navigation/runPosition.ts, the Android notification of a run (TASK-294)
  "MuW is recording your activity": "MuW enregistre ton activité",
  "It keeps going with the screen locked, voice included.":
    "Ça continue écran verrouillé, voix comprise.",

  // src/navigation/lockNotice.ts, the notice with the phone locked (TASK-401)
  "{distance} left": "encore {distance}",

  // src/location/startStatus.ts, src/screens/ChooseScreen.tsx,
  // src/explore/ExploreScreen.tsx, ThemedCard.tsx, src/screens/NavigateScreen.tsx,
  // RunPanel.tsx, src/navigation/runStats.ts, src/intro/SavedLogo.tsx
  // (TASK-210, parte H)
  "Starting from your position.": "Départ : ta position.",
  "Starting from {place}.": "Départ : {place}.",
  "Starting from a point on the map.": "Départ : un point sur la carte.",
  "Search for a city or street to start from.":
    "Cherche une ville ou une rue d'où partir.",
  "Location is off for MuW. Allow it in Settings, or search for a place to start from.":
    "La localisation est désactivée pour MuW. Autorise-la dans Réglages, ou cherche un lieu d'où partir.",
  "Your position is not available right now. Search for a place to start from.":
    "Ta position n'est pas disponible pour l'instant. Cherche un lieu d'où partir.",
  START: "DÉPART",
  "My position": "Ma position",
  "Another place": "Autre lieu",
  "No recommended routes near this start yet. Draw one: the best ones will show up here.":
    "Pas encore de parcours recommandés près de ce départ. Dessines-en un : les meilleurs apparaîtront ici.",
  "{distance} away": "à {distance}",
  "Finding the places and drawing the shape through them… This can take a minute.":
    "Recherche des lieux et dessin de la forme qui les traverse… Cela peut prendre une minute.",
  "{percent}% drawn": "{percent} % dessiné",
  N: "N",
  NE: "NE",
  E: "E",
  SE: "SE",
  S: "S",
  SW: "SO",
  W: "O",
  NW: "NO",
  "{distance} to go": "encore {distance}",
  "Saved to My activities": "Enregistrée dans Mes activités",
  // src/social/ContactsFriends.tsx (TASK-262 C)
  "FROM YOUR CONTACTS": "DE TES CONTACTS",
  "Find friends in your contacts": "Trouver des amis dans tes contacts",
  "Only coded phone numbers leave the phone, never names. The server compares them with the numbers members saved and keeps none.":
    "Seuls des numéros codés quittent le téléphone, jamais les noms. Le serveur les compare aux numéros enregistrés par les membres et n'en garde aucun.",
  "Looking in your contacts…": "Recherche dans tes contacts…",
  "MuW cannot see your contacts.": "MuW ne peut pas voir tes contacts.",
  "No phone numbers in your contacts.": "Aucun numéro de téléphone dans tes contacts.",
  "None of your contacts is on MuW yet.": "Aucun de tes contacts n'est encore sur MuW.",
  "This server cannot look in your contacts yet.":
    "Ce serveur ne peut pas encore chercher dans tes contacts.",
  "The contacts could not be read.": "Impossible de lire les contacts.",
  // «Play», the «Challenges» tab: src/game/{PlayScreen,ChallengesTab,TeamView,
  // ChallengeView,NewChallenge}.tsx, teamsApi.ts, timeLeft.ts, shareCode.ts
  // (TASK-296, parte D)
  Collection: "Collection",
  Challenges: "Défis",
  "Sign in to play with a team.": "Connecte-toi pour jouer en équipe.",
  "Teams are not on this server yet.": "Les équipes ne sont pas encore sur ce serveur.",
  "No team yet. Create one, or join one with its code.":
    "Pas encore d'équipe. Crées-en une, ou rejoins-en une avec son code.",
  "Team name": "Nom de l'équipe",
  Create: "Créer",
  "Team code": "Code de l'équipe",
  Join: "Rejoindre",
  "{count} member": "{count} membre",
  "{count} members": "{count} membres",
  "No challenge yet": "Pas encore de défi",
  "{done} of {total} pieces done": "{done} pièces sur {total} terminées",
  "Code {code}": "Code {code}",
  "Share code": "Partager le code",
  "Join my team «{name}» on MuW: open Play, Challenges, and enter the code {code}.":
    "Rejoins mon équipe «{name}» sur MuW : ouvre Play, Défis, et saisis le code {code}.",
  MEMBERS: "MEMBRES",
  Owner: "Propriétaire",
  "Leave team": "Quitter l'équipe",
  "Leave this team?": "Quitter cette équipe ?",
  "New challenge": "Nouveau défi",
  Pieces: "Pièces",
  "Fewer pieces": "Moins de pièces",
  "More pieces": "Plus de pièces",
  "Each piece": "Chaque pièce",
  Fast: "Rapide",
  "Slower pace": "Allure plus lente",
  "Faster pace": "Allure plus rapide",
  Days: "Jours",
  "Fewer days": "Moins de jours",
  "More days": "Plus de jours",
  "Start the challenge": "Lancer le défi",
  "{count} pieces · {goal} each": "{count} pièces · {goal} chacune",
  "Piece {n}": "Pièce {n}",
  Free: "Libre",
  Yours: "À toi",
  "Taken by {name}": "Prise par {name}",
  "Done by {name}": "Terminée par {name}",
  "Take this piece": "Prendre cette pièce",
  Leave: "Laisser",
  "WHO GAVE WHAT": "QUI A DONNÉ QUOI",
  "Nobody has run yet.": "Personne n'a encore couru.",
  PIECES: "PIÈCES",
  "Complete! Your team drew it together.":
    "Complète ! Ton équipe l'a dessinée ensemble.",
  "Time ran out: {count} piece was missing.":
    "Temps écoulé : il manquait {count} pièce.",
  "Time ran out: {count} pieces were missing.":
    "Temps écoulé : il manquait {count} pièces.",
  "{count} day {hours} h left": "Plus que {count} jour et {hours} h",
  "{count} days {hours} h left": "Plus que {count} jours et {hours} h",
  "{hours} h {minutes} min left": "Plus que {hours} h {minutes} min",
  "{minutes} min {seconds} s left": "Plus que {minutes} min {seconds} s",
  "Time is up": "Temps écoulé",
  "No team with this code.": "Aucune équipe n'a ce code.",
  "You can't join this team.": "Tu ne peux pas rejoindre cette équipe.",
  "You are in 10 teams already: leave one first.":
    "Tu es déjà dans 10 équipes : quittes-en une d'abord.",
  "This team is not available any more.": "Cette équipe n'est plus disponible.",
  "This challenge is not available any more.": "Ce défi n'est plus disponible.",
  "The team has a challenge going already: wait for it to end.":
    "L'équipe a déjà un défi en cours : attends qu'il se termine.",
  "This challenge is over.": "Ce défi est terminé.",
  "This piece is not there any more.": "Cette pièce n'existe plus.",
  "This piece is done already.": "Cette pièce est déjà terminée.",
  "Someone holds this piece already.": "Quelqu'un a déjà cette pièce.",
  "You hold a piece of this challenge already: leave it first.":
    "Tu as déjà une pièce de ce défi : laisse-la d'abord.",
  "You don't hold this piece.": "Cette pièce n'est pas à toi.",
  "This name is not allowed. Choose another one.":
    "Ce nom n'est pas autorisé. Choisis-en un autre.",
  // src/screens/SignInScreen.tsx, src/settings/NotificationsSetting.tsx
  // (TASK-284 B: the email when away; the names as in its email)
  "If you don't open MuW for 2 weeks, we email you once with what's new.":
    "Si tu n'ouvres pas MuW pendant 2 semaines, on t'envoie un seul e-mail avec les nouveautés.",
  "Don't send me these emails": "Ne plus m'envoyer ces e-mails",
  "Email when I'm away": "E-mail en cas d'absence",
  None: "Aucune",
  Energy: "Énergie",
  Chill: "Détente",
  Epic: "Épique",
  Sprint: "Sprint",
  Rock: "Rock",
  Funk: "Funk",
  Sunny: "Ensoleillé",
  Trap: "Trap",
  Retro: "Rétro",
  Fiesta: "Fiesta",
  "Tap a track to hear it.": "Touche un morceau pour l'écouter.",

  // src/share/CharacterRow.tsx, videoCharacter.ts (TASK-408: the animal of
  // the video; «Horse», «Fox», «Wolf» are above)
  Character: "Personnage",
  "No animal": "Aucun animal",
  "White horse": "Cheval blanc",
  Stag: "Cerf",
  Deer: "Chevreuil",
  Husky: "Husky",
  "Shiba Inu": "Shiba Inu",
  Cow: "Vache",
  Bull: "Taureau",
  Donkey: "Âne",
  Alpaca: "Alpaga",
  // TASK-408 B2: the elephant
  Elephant: "Éléphant",

  // src/share/ (TASK-408 C1: «Edit video», the line's colour, the video's emoji)
  "2D": "2D",
  "Edit video": "Modifier la vidéo",
  "Line colour": "Couleur de la ligne",
  "Along the way": "En chemin",
  "At the end": "À la fin",
  Nothing: "Rien",
  Yellow: "Jaune",
  "Light blue": "Bleu clair",
  Pink: "Rose",
  Green: "Vert",
  White: "Blanc",
  // src/share/ScenesRows.tsx, EndingRow.tsx, videoScenes.ts (TASK-408 C2, texts of choice 10)
  Scenes: "Scènes",
  Opening: "Ouverture",
  "The route": "Le parcours",
  Ending: "Fin",
  "Drawing in 2D": "Dessin en 2D",
  Cut: "Coupe",
  Fade: "Fondu",
  Numbers: "Chiffres",
  "Whole drawing": "Dessin entier",
  "All three": "Les trois",
  "At least one scene stays on.": "Au moins une scène reste active.",
  "Camera behind": "Caméra derrière",
  "Camera around": "Caméra autour",
  "Line in 2D": "Ligne en 2D",
  // src/share/VideoPreview.tsx (TASK-408 C2c, choice 13; «Resume» and «Pause» were there)
  "Video preview": "Aperçu de la vidéo",

  // src/contest/ (TASK-299 B: the contest card, its rules, the Winner badge)
  "MuW contest": "Concours MuW",
  "The post with the most reactions wins.":
    "La publication avec le plus de réactions gagne.",
  "{count} day left": "Encore {count} jour",
  "{count} days left": "Encore {count} jours",
  "Ends today": "Se termine aujourd'hui",
  "Ended · the winner is coming": "Terminé · le gagnant arrive bientôt",
  "Publish a run to take part.": "Publie une course pour participer.",
  "Your best post: #{rank}, {count} reaction":
    "Ta meilleure publication : n° {rank}, {count} réaction",
  "Your best post: #{rank}, {count} reactions":
    "Ta meilleure publication : n° {rank}, {count} réactions",
  "How it works": "Comment ça marche",
  "Official rules": "Règlement officiel",
  "Organised by MuW (Luca Pallaoro). Runs from {start} to {end}.":
    "Organisé par MuW (Luca Pallaoro). Du {start} au {end}.",
  "Anyone with a MuW account can take part, for free, by publishing a run for everyone in the app during the contest.":
    "Toute personne ayant un compte MuW peut participer gratuitement, en publiant une course visible par tous dans l'app pendant le concours.",
  "At the end, the post with the most reactions from other members wins. One reaction per member counts; your own does not. If two posts tie, the one with more MuW hearts wins, then the one published first.":
    "À la fin, la publication avec le plus de réactions des autres membres gagne. Une réaction par membre compte ; la tienne ne compte pas. En cas d'égalité, la publication avec le plus de cœurs MuW gagne, puis celle publiée en premier.",
  "The prize has no money value: the winner gets the Winner badge on their profile and their post shown at the top of the Feed for a week.":
    "Le prix n'a aucune valeur en argent : la personne gagnante reçoit le badge Gagnant sur son profil et sa publication est affichée en haut du Feed pendant une semaine.",
  "MuW may leave out a post that breaks the community rules.":
    "MuW peut écarter une publication qui enfreint les règles de la communauté.",
  "Apple and Google are not sponsors of this contest and are not involved in it in any way.":
    "Apple et Google ne sont pas sponsors de ce concours et n'y sont impliqués d'aucune manière.",
  Winner: "Gagnant",
  "{name} won the MuW contest": "{name} a gagné le concours MuW",
  // src/contest/ (TASK-343 B: the monthly challenge, not Play's «Challenges»)
  "Monthly challenge": "Défi du mois",
  "See the challenge": "Voir le défi",
  "Publish a run and enter it to take part.":
    "Publie une course et inscris-la pour participer.",
  "Enter “{theme}”": "Inscrire à « {theme} »",
  "From {start} to {end}": "Du {start} au {end}",
  Ended: "Terminé",
  "{count} person taking part": "{count} personne participe",
  "{count} people taking part": "{count} personnes participent",
  "You entered {count} drawing": "Tu as inscrit {count} dessin",
  "You entered {count} drawings": "Tu as inscrit {count} dessins",
  "Prize: the Winner badge on your profile and your post at the top of the Feed for a week.":
    "Prix : le badge Gagnant sur ton profil et ta publication en haut du Feed pendant une semaine.",
  Top: "Top",
  New: "Récents",
  "Past challenges": "Défis du mois passés",
  "No past challenges yet.": "Pas encore de défi du mois passé.",
  "No drawings entered yet.": "Pas encore de dessin inscrit.",
  "This challenge takes no entries now.":
    "Ce défi n'accepte pas d'inscriptions pour l'instant.",
  "This run cannot take part: it must be for everyone, recorded with MuW and published during the challenge.":
    "Cette course ne peut pas participer : elle doit être visible par tous, enregistrée avec MuW et publiée pendant le défi.",
  "The theme is “{theme}”.": "Le thème est « {theme} ».",
  "Anyone with a MuW account can take part, for free: publish a run recorded with MuW for everyone during the challenge, and enter it. You can enter as many drawings as you like, and withdraw them until the challenge ends.":
    "Toute personne ayant un compte MuW peut participer gratuitement : publie pendant le défi une course enregistrée avec MuW et visible par tous, puis inscris-la. Tu peux inscrire autant de dessins que tu veux, et les retirer jusqu'à la fin du défi.",
  "At the end, the entered post with the most reactions from other members wins. One reaction per member counts; your own does not. If two posts tie, the one with more MuW hearts wins, then the one published first.":
    "À la fin, parmi les publications inscrites, celle qui a le plus de réactions des autres membres gagne. Une réaction par membre compte ; la tienne ne compte pas. En cas d'égalité, la publication avec le plus de cœurs MuW gagne, puis celle publiée en premier.",
  "MuW may leave out a post that does not fit the theme or breaks the community rules.":
    "MuW peut écarter une publication hors sujet ou qui enfreint les règles de la communauté.",
  // src/route/NearYou.tsx (TASK-306: shapes ready near you, or in other cities)
  "NEAR YOU": "PRÈS DE VOUS",
  "SHAPES TO TRY": "FORMES À ESSAYER",
  // src/game/PlayRow.tsx (TASK-327: «Play» under the distance of «Draw»)
  PLAY: "JOUER",
  "Collect shapes by running": "Collectionne des formes en courant",
  // src/screens/NavigateScreen.tsx (TASK-303)
  "The route is {distance} away, to the {direction}.":
    "Le parcours reprend à {distance}, direction {direction}.",
  "Follow the dotted line back to the route.":
    "Suivez la ligne pointillée pour revenir sur le parcours.",
  // src/social/DrawingCard.tsx (TASK-307: «Start» on a drawing follows its track)
  "This route has no turn directions: follow the line on the map.":
    "Ce parcours n'a pas d'indications de virage : suis la ligne sur la carte.",
  // src/game/runStripData.ts (TASK-296 E: the game's line on the run screen)
  "Last km {pace} · target {target}": "Dernier km {pace} · objectif {target}",
  "Last mi {pace} · target {target}": "Dernier mi {pace} · objectif {target}",

  // src/settings/FeedbackSetting.tsx, feedbackFields.ts, SettingsPage.tsx (TASK-308)
  "Send feedback": "Envoie-nous ton avis",
  "Thank you! Your message reached us.": "Merci ! Ton message nous est bien parvenu.",
  "Ideas, problems, anything that would make MuW better: we read every message.":
    "Idées, problèmes, tout ce qui rendrait MuW meilleur : nous lisons chaque message.",
  "Write here…": "Écris ici…",
  "Your message": "Ton message",
  "It reaches us with your username, your email and the app's version, so we can answer you.":
    "Il nous parvient avec ton nom d'utilisateur, ton e-mail et la version de l'app, pour que nous puissions te répondre.",
  "Write something first.": "Écris d'abord quelque chose.",
  "You sent a lot of feedback today. Try again tomorrow.":
    "Tu nous as déjà beaucoup écrit aujourd'hui. Réessaie demain.",
  FEEDBACK: "AVIS",
  // src/settings/sport.ts (TASK-305 D0: paragliding, «Soon» in «Sport»)
  Paragliding: "Parapente",
  // src/sports/swimming.ts (TASK-400: «Swim», in open water or in a pool)
  Swim: "Natation",
  // src/pool/ (TASK-400 part B: a swim in a pool), approved on 2026-11-06
  "Open water": "Eau libre",
  Pool: "Piscine",
  "Pool length": "Longueur du bassin",
  Other: "Autre",
  "Length in meters": "Longueur en mètres",
  "Start swim": "Commencer la nage",
  "How many lengths?": "Combien de longueurs ?",
  Lengths: "Longueurs",
  "Pool swim": "Nage en piscine",
  "Pace /100 m": "Allure /100 m",
  // TASK-409 part B: the heart rate of a swim in a pool.
  "Add heart rate from Apple Health": "Ajouter la fréquence cardiaque depuis Santé",
  "No heart rate from your watch for this swim.":
    "Aucune fréquence cardiaque de ta montre pour cette nage.",
  "Show heart rate": "Afficher la fréquence cardiaque",
  "Avg heart rate": "FC moyenne",
  "Time in zones": "Temps par zone",
  "From your watch, via Apple Health": "De ta montre, via Santé",
  // src/explore/ExploredCard.tsx, src/social/DrawingCard.tsx (TASK-313)
  "Draw it near me": "La dessiner près de moi",
  // src/route/RoutePanel.tsx (TASK-311 B: a word in one line that did not come out)
  "This word may come out better with the pen up: each letter on its own.":
    "Ce mot peut être mieux dessiné avec le crayon levé : chaque lettre à part.",
  "Lift the pen": "Lever le crayon",
  // src/route/RoutePanel.tsx (TASK-317: the wait in «Draw»)
  "Warming up: {name}…": "Échauffement : {name}…",
  "Warming up: “{word}”…": "Échauffement : « {word} »…",
  "Warming up: the picture…": "Échauffement : la photo…",

  // src/api/messages.ts (TASK-319: private messages)
  "A message needs some words.": "Un message a besoin de quelques mots.",
  "A message is at most {max} characters.": "Un message fait au plus {max} caractères.",
  "Too many messages in a minute. Wait a moment and try again.":
    "Trop de messages en une minute. Attends un instant et réessaie.",
  "You can't send negative messages in this app.":
    "Dans cette app, tu ne peux pas envoyer de messages négatifs.",
  "This conversation is not available.": "Cette conversation n'est pas disponible.",

  // src/messages/ConversationList.tsx, MessagesOverlay.tsx, MessagesRow.tsx, MessageButton.tsx (TASK-319)
  Messages: "Messages",
  "Messages, {count} waiting": "Messages, {count} en attente",
  "Message requests": "Demandes de message",
  "Message requests, {count} waiting": "Demandes de message, {count} en attente",
  "No messages yet. Open someone's profile and tap Message to write to them.":
    "Pas encore de messages. Ouvre le profil de quelqu'un et touche Message pour lui écrire.",
  "No message requests.": "Aucune demande de message.",
  "You: {text}": "Toi : {text}",
  "{name}, new message: {text}": "{name}, nouveau message : {text}",
  Message: "Message",
  "Message {name}": "Écrire à {name}",

  // src/messages/ConversationScreen.tsx, MessageSheet.tsx (TASK-319)
  "No messages yet.": "Pas encore de messages.",
  "Show earlier messages": "Afficher les messages précédents",
  "Touch and hold to delete it": "Maintiens appuyé pour le supprimer",
  "Touch and hold to report it": "Maintiens appuyé pour le signaler",
  "Message request sent. You can write again when {name} accepts it.":
    "Demande de message envoyée. Tu pourras écrire à nouveau quand {name} l'acceptera.",
  "{name} wants to send you a message.": "{name} veut t'envoyer un message.",
  "{name} gets this as a message request. You can send one message until they accept it.":
    "{name} le reçoit comme demande de message. Tant qu'elle n'est pas acceptée, tu peux envoyer un seul message.",
  "Write a message…": "Écris un message…",
  "Delete this message for both of you?": "Supprimer ce message pour vous deux ?",
  "Report this message": "Signaler ce message",
  // src/explore/ExploredCard.tsx, social/DrawingCard.tsx, mapdraw/DrawOnMap.tsx,
  // RoutePanel.tsx, favorites/favoriteRoute.ts (TASK-320, TASK-331: the figure
  // drawn by hand on the map)
  "Edit the drawing": "Modifier le dessin",
  Erase: "Effacer",
  Drawing: "Dessin",
  "Rub a line to erase that piece. A piece cut off joins the drawing with a dash.":
    "Frotte une ligne pour en effacer le morceau. Un morceau coupé rejoint le dessin par un pointillé.",
  // src/imports/, activities/RunEnd.tsx, feed/FeedPost.tsx (TASK-312 B:
  // «Add past activity» from a GPX, TCX or FIT file, «Imported»)
  "Add past activity": "Ajouter une activité passée",
  "From a file": "Depuis un fichier",
  "GPX, TCX or FIT from Strava, Garmin, Komoot…":
    "GPX, TCX ou FIT depuis Strava, Garmin, Komoot…",
  "Export the activity as a file from the other app or its website, save it in Files, then pick it here.":
    "Exporte l'activité en fichier depuis l'autre app ou son site, enregistre-la dans Fichiers, puis choisis-la ici.",
  Imported: "Importée",
  "Imported activities don't count for Play or contests.":
    "Les activités importées ne comptent ni pour le jeu ni pour les concours.",
  "This file is not GPX, TCX or FIT.": "Ce fichier n'est ni GPX, ni TCX, ni FIT.",
  "This file has no times: it is a route, not an activity.":
    "Ce fichier n'a pas d'horaires : c'est un parcours, pas une activité.",
  "This file has no positions.": "Ce fichier n'a pas de positions.",
  "This file is too big (over 25 MB).":
    "Ce fichier est trop volumineux (plus de 25 Mo).",
  "Activities before 2020 cannot be added.":
    "Impossible d'ajouter des activités antérieures à 2020.",
  "Already in My activities.": "Déjà dans Mes activités.",
  // The attachments of the private messages (TASK-333).
  "📷 Photo": "📷 Photo",
  "🎬 Video": "🎬 Vidéo",
  "🗺️ Drawing": "🗺️ Dessin",
  Photo: "Photo",
  Video: "Vidéo",
  "This video has expired.": "Cette vidéo a expiré.",
  "Video, {duration}": "Vidéo, {duration}",
  "Drawing: {title}, {distance}": "Dessin : {title}, {distance}",
  "Add a photo, a video or a drawing": "Ajouter une photo, une vidéo ou un dessin",
  "Add a message…": "Ajouter un message…",
  "Couldn't send. Tap to try again.": "Pas envoyé. Touche pour réessayer.",
  "This video is longer than {seconds} seconds. Choose a shorter one.":
    "Cette vidéo dure plus de {seconds} secondes. Choisis-en une plus courte.",
  "This video is too large: at most {mb} MB. Choose a shorter one.":
    "Cette vidéo est trop lourde : {mb} Mo au maximum. Choisis-en une plus courte.",
  "Too many videos today. Try again tomorrow.":
    "Trop de vidéos aujourd'hui. Réessaie demain.",
  "Too many photos today. Try again tomorrow.":
    "Trop de photos aujourd'hui. Réessaie demain.",
  "Videos can't be sent right now. Try again later.":
    "Impossible d'envoyer des vidéos pour l'instant. Réessaie plus tard.",
  // The Apple Watch (TASK-370 part B3a).
  "Send to watch": "Envoyer à la montre",
  "Sent to your watch": "Envoyé à la montre",
  "Your activity from the watch is ready": "Votre activité de la montre est prête",
  "Open MuW to save it.": "Ouvrez MuW pour l'enregistrer.",
  "From your Apple Watch": "De votre Apple Watch",
  Open: "Ouvrir",
  "Send a route from MuW on your iPhone": "Envoyez un parcours depuis MuW sur l'iPhone",
  "Off route": "Hors parcours",
  Arrived: "Arrivée",
  "Reach the route to start": "Rejoignez le parcours pour démarrer",
  "To the {letter}": "Vers le {letter}",
  "Next part": "Partie suivante",
  // The drawings of the private messages (TASK-333 part C).
  "Send to a friend": "Envoyer à des amis",
  "Send to…": "Envoyer à…",
  "Search people": "Chercher des personnes",
  "Sent to {name}.": "Envoyé à {name}.",
  "Send a drawing": "Envoyer un dessin",
  "Photos, videos and drawings can be sent once {name} accepts your message.":
    "Tu pourras envoyer des photos, des vidéos et des dessins quand {name} acceptera ton message.",

  // src/profile/BadgeRow.tsx (TASK-341: the badges of a profile)
  "First drawing": "Premier dessin",
  "10 drawings": "10 dessins",
  "{distance} drawing": "Dessin de {distance}",
  "Not earned yet: {badge}": "Pas encore obtenu : {badge}",
  // src/messages/messageTime.ts, ConversationList.tsx (TASK-353: times in the chat)
  Today: "Aujourd’hui",
  Yesterday: "Hier",
  "{day} {month}": "{day} {month}",
  "{name}, {count} new messages: {text}": "{name}, {count} nouveaux messages : {text}",

  // The tabs of «Feed» (TASK-362).
  All: "Tous",
  "Follow people to see their drawings here.":
    "Suis des personnes pour voir leurs dessins ici.",
  "Find people to follow": "Trouver des personnes à suivre",
  "The people you follow have not published anything yet.":
    "Les personnes que tu suis n'ont encore rien publié.",
  "Couldn't load the Feed.": "Impossible de charger le Feed.",

  // src/route/runTime.ts (TASK-361: the time under the distance of «Draw»)
  "≈ {time} at {pace}": "≈ {time} à {pace}",
  "≈ {time} at {pace} (a usual pace)": "≈ {time} à {pace} (une allure habituelle)",

  // src/route/ShapePreview.tsx (TASK-361: the shape to scale)
  "{name}, about {size} on the map": "{name}, environ {size} sur la carte",

  // src/route/ShapeGrid.tsx (TASK-361: the shapes in two rows)
  "Show fewer shapes": "Afficher moins de formes",
  "See all {count} shapes": "Voir les {count} formes",
  "Show fewer": "Moins",
  "See all": "Tout voir",

  // src/route/DistanceDial.tsx (TASK-361: the distance by half a km)
  "Tap to type the distance": "Touchez pour saisir la distance",

  // src/screens/RunNoRouteButton.tsx (TASK-361)
  "Records the run without drawing a route first":
    "Enregistre la course sans dessiner d'abord un parcours",

  // src/route/drawLabel.ts (TASK-361: the words of «Draw route»)
  "Draw a {distance} {name}": "Dessiner : {name} de {distance}",
  "Draw “{word}”, {distance}": "Dessiner « {word} », {distance}",
  "Draw the picture, {distance}": "Dessiner l'image, {distance}",

  // src/route/OtherShapeField.tsx (TASK-361: «Type another shape»)
  "Type another shape": "Saisir une autre forme",
  "Write a shape that is not among the tiles":
    "Écrire une forme qui n'est pas parmi les vignettes",

  // src/route/RoutePanel.tsx (TASK-361 part B: the steps of «Draw»)
  "WHAT YOU DRAW": "CE QUE TU DESSINES",
  "Write a word, e.g. CIAO": "Écris un mot, par ex. CIAO",

  // src/explore/RideItYourself.tsx (TASK-364)
  "RIDE IT YOURSELF": "À TOI DE PÉDALER",
  "Routes drawn by MuW. Nobody has ridden them yet.":
    "Parcours dessinés par MuW. Personne ne les a encore faits.",
  "By bike": "À vélo",
  Bat: "Chauve-souris",
  Madrid: "Madrid",
  Turin: "Turin",

  // src/search (TASK-344 part B: the search of «Feed»'s lens)
  "Search drawings, people, places": "Rechercher dessins, personnes, lieux",
  Clear: "Effacer",
  People: "Personnes",
  Routes: "Parcours",
  Filters: "Filtres",
  "Recent searches": "Recherches récentes",
  Categories: "Catégories",
  "Featured drawings": "Dessins à la une",
  Animals: "Animaux",
  Hearts: "Cœurs",
  Words: "Mots",
  Symbols: "Symboles",
  Emoji: "Emoji",
  Place: "Lieu",
  "Town or region": "Ville ou région",
  Complexity: "Complexité",
  Simple: "Simple",
  Medium: "Moyenne",
  Complex: "Complexe",
  "Sort by": "Trier par",
  "Most recent": "Les plus récents",
  Longest: "Les plus longs",
  "Most popular": "Les plus populaires",
  "Up to {distance}": "Jusqu'à {distance}",
  "Over {distance}": "Plus de {distance}",
  Reset: "Réinitialiser",
  "No drawings found": "Aucun dessin trouvé",
  "Try other words, or change the filters.":
    "Essaie d'autres mots ou change les filtres.",

  // src/feed/PostSheet.tsx, PostSettings.tsx, postSections.ts (TASK-410: approved 2026-11-07)
  Like: "J'aime",
  "Edit & run": "Modifier et courir",
  "Post settings": "Réglages de la publication",
  Summary: "Résumé",
  // src/feed/postSections.ts (TASK-410 part D: approved 2026-11-07)
  "Fastest km": "Km le plus rapide",
  "Fastest mile": "Mile la plus rapide",
  "Avg cadence": "Cadence moy.",
  "Elevation gain": "Dénivelé positif",
  Splits: "Temps intermédiaires",
  Mile: "Mile",
  "Fastest: km {n} · {pace}": "Le plus rapide : km {n} · {pace}",
  "Fastest: mile {n} · {pace}": "Le plus rapide : mile {n} · {pace}",
  Elevation: "Profil altimétrique",
  "Elevation along the route, from {min} to {max} m":
    "Altitude le long du parcours, de {min} à {max} m",
  "Heart rate": "Fréquence cardiaque",
  Average: "Moyenne",
  Max: "Max",

  // src/feed/muwLabel.ts (TASK-365: the routes MuW draws, labels approved)
  "Route created by MuW – ride it yourself": "Parcours créé par MuW – à toi de pédaler",
  "Route created by MuW – run it yourself": "Parcours créé par MuW – à toi de courir",
  "Route created by MuW – paddle it yourself":
    "Parcours créé par MuW – à toi de pagayer",

  // src/social/composer (TASK-348: the post composer, texts approved with «Approvo così»)
  "Your post": "Ta publication",
  "Hold and drag to reorder": "Maintiens et fais glisser pour changer l'ordre",
  "Move left": "Déplacer à gauche",
  "Move right": "Déplacer à droite",
  Layout: "Mise en page",
  "Drawing in the corner": "Dessin dans le coin",
  "Line on the photo": "Ligne sur la photo",
  "Half and half": "Moitié-moitié",
  "Photo in the corner": "Photo dans le coin",
  "Up to 10 in a post.": "Jusqu'à 10 par publication.",
  "Could not prepare this photo. Try again.":
    "Impossible de préparer cette photo. Réessaie.",
  // src/share/StyleRow.tsx, videoStyle.ts (TASK-351 part C: the video's styles)
  Style: "Style",
  Night: "Nuit",
  Day: "Jour",
  // src/bell/BellButton.tsx, BellOverlay.tsx (TASK-367 part C: the bell)
  Notifications: "Notifications",
  "Notifications, {count} new": "Notifications, {count} nouvelles",
  "No notifications yet. Reactions, comments, follows and tags will show up here.":
    "Pas encore de notifications. Les réactions, commentaires, abonnements et identifications apparaîtront ici.",
  // src/profile/Vo2MaxRow.tsx, OwnVo2Max.tsx, settings/Vo2MaxSetting.tsx (TASK-397 part B: the VO₂ max, texts approved)
  "VO₂ max": "VO₂ max",
  "Estimate from your {distance}": "Estimation d'après ton {distance}",
  "Estimate from their {distance}": "Estimation d'après son {distance}",
  "Show your VO₂ max?": "Afficher ta VO₂ max ?",
  "Everyone who can see your profile will see it. You can turn it off in Settings.":
    "Toutes les personnes qui peuvent voir ton profil la verront. Tu peux la désactiver dans Réglages.",
  "Show it": "L'afficher",
  "Only you see this": "Visible par toi seulement",
  "Show VO₂ max on my profile": "Afficher la VO₂ max sur mon profil",
  // src/ski/ResortList.tsx, ResortPage.tsx, ResortWeather.tsx (TASK-406 part C:
  // the ski resorts of «Search», texts approved)
  "Ski resorts": "Stations de ski",
  "Near you": "Près de toi",
  "No ski resort with this name.": "Aucune station avec ce nom.",
  "Lifts@@resort": "Remontées",
  Pistes: "Pistes",
  Novice: "Débutants",
  Easy: "Faciles",
  Intermediate: "Moyennes",
  Advanced: "Difficiles",
  Expert: "Experts",
  Freeride: "Freeride",
  Website: "Site web",
  Base: "Bas",
  "Top@@resort": "Sommet",
  "Next 24 hours": "Prochaines 24 heures",
  "Fresh snow": "Neige fraîche",
  "Estimated from the forecast, not a snow report.":
    "Estimée d'après les prévisions, pas un bulletin neige.",
  "Weather unavailable right now.": "Météo indisponible pour le moment.",
  "Older forecast: MET Norway is not answering.":
    "Prévision plus ancienne : MET Norway ne répond pas.",
  "Weather: MET Norway (CC BY 4.0) · Resorts: OpenSkiMap.org, © OpenStreetMap contributors":
    "Météo : MET Norway (CC BY 4.0) · Stations : OpenSkiMap.org, © les contributeurs d'OpenStreetMap",
  // src/ski/DayResort.tsx, DayChoices.tsx, SkiDayLine.tsx, screens/SnowFinishCard.tsx
  // (TASK-406 part D2: the day of skiing, texts approved on 2026-11-08)
  "Where are you skiing?": "Où skies-tu ?",
  "Change@@resort": "Changer",
  "No ski resort nearby": "Aucune station de ski à proximité",
  "{temperature} now · {snow} fresh snow":
    "{temperature} maintenant · {snow} de neige fraîche",
  Total: "Total",
  "How was the snow?": "Comment était la neige ?",
  Powder: "Poudreuse",
  Groomed: "Damée",
  Icy: "Glacée",
  Spring: "De printemps",
  Heavy: "Lourde",
  "Your gear": "Ton équipement",
  "Ski or snowboard, brand and model": "Ski ou snowboard, marque et modèle",
  Resort: "Station",
  Snow: "Neige",
  Gear: "Équipement",
  // src/ski/ResortList.tsx, ResortSnow.tsx, ResortPosts.tsx (TASK-406 part D3b:
  // the resort's page, texts approved on 2026-11-08)
  "Your resorts": "Tes stations",
  "Snow today": "Neige du jour",
  "{snow} ×{days}": "{snow} ×{days}",
  "Marked by the members in the last 24 hours.":
    "Indiquée par les membres ces dernières 24 heures.",
  "Members' days here": "Les journées des membres ici",

  // src/liveShare/LiveShareButton.tsx (TASK-424 part B1; «Not now» above)
  "Share live": "Partager en direct",
  "Sharing live": "Partage en direct activé",
  "Sign in to share live": "Connecte-toi pour partager en direct",
  "Share this activity live": "Partager cette activité en direct",
  "Anyone with the link can follow you on a web page, without the app: your exact position on the map, the route so far, distance, time, pace or speed, elevation gain, calories and your heart rate when a watch sends it.":
    "Toute personne qui a le lien peut te suivre sur une page web, sans l'app : ta position exacte sur la carte, le parcours déjà fait, la distance, le temps, l'allure ou la vitesse, le dénivelé, les calories et ta fréquence cardiaque quand une montre l'envoie.",
  "The link stops working one hour after you finish, or as soon as you stop sharing. Then your positions are deleted.":
    "Le lien cesse de fonctionner une heure après la fin, ou dès que tu arrêtes le partage. Tes positions sont alors supprimées.",
  "Share link": "Partager le lien",
  "Follow my activity live on MuW: {url}":
    "Suis mon activité en direct sur MuW : {url}",
  "Stop sharing?": "Arrêter le partage ?",
  "The link stops working now.": "Le lien cesse de fonctionner maintenant.",
  "Stop sharing": "Arrêter",
  "Keep sharing": "Continuer",
  "Couldn't create the link. Try again.": "Impossible de créer le lien. Réessaie.",
  // src/explore/ExploreScreen.tsx, FartherAway.tsx, AskLine.tsx (TASK-420: every
  // drawing of the catalog in «Explore», the nearest first)
  "{count} drawings in {cities} cities · the nearest first":
    "{count} dessins dans {cities} villes · les plus proches d'abord",
  "{count} drawings · the nearest first": "{count} dessins · les plus proches d'abord",
  "within {distance} · {count}": "à moins de {distance} · {count}",
  "FARTHER AWAY": "PLUS LOIN",
  "{count} drawing · by city": "{count} dessin · par ville",
  "{count} drawings · by city": "{count} dessins · par ville",
  "Ask for a route": "Demander un itinéraire",
  "Famous places, best views, food… in any city":
    "Lieux célèbres, panoramas, cuisine… dans n'importe quelle ville",
  "The rest could not load.": "La suite n'a pas pu être chargée.",
  "Loading more…": "Chargement de la suite…",
  // src/share/CharacterRow.tsx, MyImageChoices.tsx (TASK-417: the runner's
  // own image in place of the animal, texts approved, choice 5)
  "My image": "Mon image",
  "Choose a photo": "Choisir une photo",
  "Remove image": "Retirer l'image",
  "Your image stays on this phone. It leaves only in the video you share.":
    "Ton image reste sur ton téléphone. Elle n'en sort que dans la vidéo que tu partages.",
  "This image can't be read. The video goes out without it.":
    "Cette image est illisible. La vidéo sort sans elle.",
  "Anyone with the link can follow you on a web page, without the app: time, lengths or exercise, calories and your heart rate when a watch sends it.":
    "Toute personne qui a le lien peut te suivre sur une page web, sans l'app : le temps, les longueurs ou l'exercice, les calories et ta fréquence cardiaque quand une montre l'envoie.",

  // src/skimode/, settings/SportButton.tsx (TASK-429 part A: the ski mode)
  "Days@@ski": "Journées",
  Resorts: "Stations",
  "Your days": "Tes journées",
  "Ski mode": "Mode ski",
  "Turns MuW into your ski app": "Fait de MuW ton appli de ski",
  "Choose another sport to go back to MuW as always.":
    "Choisis un autre sport pour retrouver MuW comme toujours.",
  "Log in to see your days.": "Connecte-toi pour voir tes journées.",
  "No days on the snow yet.": "Pas encore de journée sur la neige.",

  // src/skimode/ (TASK-429 part B: the day of skiing, its legend and its parts)
  "Runs@@ski": "Descentes",
  Legend: "Légende",
  "Descents · solid, numbered": "Descentes · trait plein, numérotées",
  "Lifts · dashed, L1, L2…": "Remontées · pointillés, L1, L2…",
  Lift: "Remontée",
  "{speed} top": "{speed} max",
  "Stopped {minutes} min": "Arrêt {minutes} min",

  // src/skimode/ (TASK-429 part C: the season and the saved day)
  "Season {years}": "Saison {years}",
  "Vertical this season": "Dénivelé de la saison",
  "On snow": "Sur la neige",
  "Piste without a name": "Piste sans nom",
  // TASK-415 part B: ski touring, its phases and its VAM (approved 2026-11-11).
  "Ski touring": "Ski de randonnée",
  Phase: "Phase",
  Climb: "Montée",
  Descent: "Descente",
  Changeover: "Transition",
  "VAM 5 min": "VAM 5 min",
  Altitude: "Altitude",
  "Elev. loss": "Dénivelé nég.",
  "Time up": "Temps de montée",
  "Time down": "Temps de descente",
  "Avg VAM": "VAM moy.",
  "Max altitude": "Alt. max",
  Phases: "Phases",
  "Climb {n}": "Montée {n}",
  "Descent {n}": "Descente {n}",
  "Lift {n}": "Remontée {n}",
  "Skins off": "Peaux enlevées",
  "Skins on": "Peaux mises",
  "Climbed: {metres} m": "Dénivelé : {metres} m",
  "{phase}, from {time}, for {duration}":
    "{phase}, à partir de {time}, pendant {duration}",
  "No heights from the phone: no phases for this tour.":
    "Le téléphone n'a pas donné d'altitudes : pas de phases pour cette sortie.",

  // src/activities/ (TASK-462: the calendar of every sport)
  Calendar: "Calendrier",
  "Last 12 months": "12 derniers mois",
  "{count} activity": "{count} activité",
  "{count} activities": "{count} activités",

  // src/settings/sport.ts, src/air/ (TASK-305 part R2, approved by the user on 2026-11-12)
  "Record your flight": "Enregistrer le vol",
  "Before you fly": "Avant de voler",
  "MuW is not a flight instrument: it records your flight and shares it. Fly with your own instrument, licence and judgement.":
    "MuW n'est pas un instrument de vol : il enregistre votre vol et le partage. Volez avec votre propre instrument, votre licence et votre jugement.",
  "Got it": "Compris",
  Vario: "Vario",
  "Flight time": "Temps de vol",
  "Your flight": "Votre vol",
  "No shapes in the air yet: MuW records your flight.":
    "Pas encore de formes en vol : MuW enregistre votre vol.",
  "White: where you flew.": "Blanc : là où vous avez volé.",

  // src/profile/FirstStep.tsx, BadgesSection.tsx (TASK-457: a new profile)
  "Your first drawing": "Ton premier dessin",
  "Start from a route that already draws a shape near you.":
    "Pars d'un parcours qui dessine déjà une forme près de toi.",
  "Find a route near you": "Trouver un parcours près de toi",
  "Record a run with MuW and publish its drawing.":
    "Enregistre une course avec MuW et publie son dessin.",
  "Publish 10 drawings of runs recorded with MuW.":
    "Publie 10 dessins de courses enregistrées avec MuW.",
  "Publish the drawing of a run of {distance} or more.":
    "Publie le dessin d'une course d'au moins {distance}.",
  // «Sleep last night» in a post (TASK-467 part B2): src/health/sleepText.ts,
  // SleepRunEnd.tsx, SleepCard.tsx
  "Sleep last night": "Sommeil de la nuit dernière",
  "Shown in this post. Turn it off to keep it to yourself.":
    "Visible dans cette publication. Désactive-le pour le garder pour toi.",
  "Sleep score": "Score de sommeil",
  "Poor@@sleep": "Faible",
  "Fair@@sleep": "Passable",
  "Good@@sleep": "Bon",
  "Very good@@sleep": "Très bon",
  "Excellent@@sleep": "Excellent",
  "Awake@@sleep": "Éveillé",
  "REM@@sleep": "Paradoxal",
  "Light@@sleep": "Léger",
  "Deep@@sleep": "Profond",
  "Worked out by MuW from Apple Health data. It can differ from the score in the Health app.":
    "Calculé par MuW à partir des données d'Apple Santé. Il peut différer du score de l'app Santé.",
  // TASK-305 part R5b: under «Record your flight» (approved 2026-11-12).
  "Your flights": "Vos vols",
  "{count} flight · {time}": "{count} vol · {time}",
  "{count} flights · {time}": "{count} vols · {time}",
  "No flights this month": "Aucun vol ce mois-ci",
  "Your best flights": "Vos records de vol",
  "Longest flight": "Vol le plus long",
  "Farthest flight": "Vol le plus lointain",
  "Ready to fly": "Prêt à décoller",
  "Waiting for GPS…": "En attente du GPS…",
  "GPS ready · ±{m} m": "GPS prêt · ±{m} m",
  "Weak GPS · ±{m} m: wait in the open": "GPS faible · ±{m} m : attendez à découvert",
  "Share live at start": "Partager en direct au départ",
  "When the countdown ends, MuW makes the link and opens the share sheet.":
    "À la fin du compte à rebours, MuW crée le lien et ouvre le partage.",
  // src/feed/PostShareSheet.tsx, src/messages/messagePost.ts, attachmentText.ts
  // (TASK-455: a post shared and sent in a message; texts approved 2026-11-12)
  "Poster and video": "Affiche et vidéo",
  "Only people who follow {user} can open it.":
    "Seules les personnes qui suivent {user} peuvent l'ouvrir.",
  "by {user}": "de {user}",
  "This post is no longer available.": "Cette publication n'est plus disponible.",
  "🗺️ Post": "🗺️ Publication",
  // Snowshoes (TASK-413 parts B and C, ADR-0342): approved by the user,
  // 2026-11-08 and 2026-11-12.
  Snowshoes: "Raquettes",
  "Off-trail on snow: check the avalanche bulletin first.":
    "Hors sentier sur la neige : consulte d'abord le bulletin d'avalanches.",
  "Before you head out on snowshoes": "Avant de partir en raquettes",
  "Check the avalanche bulletin and the weather before you go. MuW does not know them.":
    "Consulte le bulletin d'avalanches et la météo avant de partir. MuW ne les connaît pas.",
  "The route avoids slopes over 25°, woods, pistes and rock. That does not make it safe: an avalanche can come from above.":
    "Le parcours évite les pentes de plus de 25°, les bois, les pistes et les rochers. Cela ne le rend pas sûr : une avalanche peut venir d'en haut.",
  "Stay off the pistes and follow the local rules: parks, reserves, wildlife quiet zones, private land. MuW does not know them all.":
    "Ne marche pas sur les pistes et respecte les règles locales : parcs, réserves, zones de quiétude de la faune, terrains privés. MuW ne les connaît pas toutes.",
  "Never go alone, tell someone where you are going, and turn back if the snow or the weather changes.":
    "Ne pars pas seul, dis à quelqu'un où tu vas et fais demi-tour si la neige ou le temps changent.",
  "There is no open snow near this start. Start within 2 km of open snow, away from towns, woods and pistes.":
    "Il n'y a pas de neige dégagée près de ce départ. Pars à moins de 2 km d'une neige dégagée, loin des villes, des bois et des pistes.",
  "There is no open snow near this start. Start within 1 mile of open snow, away from towns, woods and pistes.":
    "Il n'y a pas de neige dégagée près de ce départ. Pars à moins de 1 mile d'une neige dégagée, loin des villes, des bois et des pistes.",
  "This shape does not fit on the snow here at this distance. It fits at about {km} km.":
    "Cette forme ne tient pas sur la neige ici à cette distance. Elle tient à environ {km} km.",
  "This shape does not fit on the snow here at this distance. It fits at about {mi} mi.":
    "Cette forme ne tient pas sur la neige ici à cette distance. Elle tient à environ {mi} mi.",
  "This shape does not fit on the snow here. Try a shorter distance, another shape, or another start:":
    "Cette forme ne tient pas sur la neige ici. Essaie une distance plus courte, une autre forme ou un autre départ :",
  "{name} · on the snow · target {km} km": "{name} · sur la neige · objectif {km} km",
  "{name} · on the snow · target {mi} mi": "{name} · sur la neige · objectif {mi} mi",
  "White: where you walked.": "Blanc : là où tu as marché.",
  // TASK-305 part R6b: on foot and in the air (approved 2026-11-12).
  "In the air": "En vol",
  "MuW switches by itself; touch to correct it.":
    "MuW change tout seul ; touchez pour corriger.",
  "On foot {foot} · In the air {air}": "À pied {foot} · En vol {air}",
};
