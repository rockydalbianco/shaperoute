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
  "Delete the run of {when}": "Supprimer la course du {when}",
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

  // src/explore/NearbyTowns.tsx
  "NEARBY TOWNS": "VILLES PROCHES",
  "{town}, {km} km away": "{town}, à {km} km",
  "{mi} mi away": "à {mi} mi",
  "{town}, {mi} mi away": "{town}, à {mi} mi",

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

  // src/paddle/PaddleExplore.tsx
  Next: "À suivre",
  "Drawing…": "Dessin en cours…",
  "Your start": "Ton départ",
  "On the water": "Sur l'eau",
  "Shapes to paddle, within 1 km of the shore":
    "Des formes à pagayer, à moins de 1 km du rivage",
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
  "Follow the local rules: swimming areas, boat lanes, harbours. Sgrava does not know them.":
    "Respecte les règles locales : zones de baignade, chenaux, ports. Sgrava ne les connaît pas.",
  "The route stays within 1 km of the shore. That does not make it safe or allowed.":
    "Le parcours reste à moins de 1 km du rivage. Cela ne le rend ni sûr ni autorisé.",
  "I understand": "J'ai compris",
  "Not now": "Pas maintenant",

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
  "Only you see your number. Friends who already have it will be able to find you on Sgrava.":
    "Toi seul vois ton numéro. Les amis qui l'ont déjà pourront te trouver sur Sgrava.",
  "Changing the email is not available on this API yet.":
    "Sur cette API, on ne peut pas encore changer l'e-mail.",
  "The phone number is not available on this API yet.":
    "Sur cette API, il n'y a pas encore de numéro de téléphone.",
  "This is already the email of your account.": "C'est déjà l'e-mail de ton compte.",
  "Write the number with its country code, like +39 333 123 4567.":
    "Écris le numéro avec l'indicatif du pays, comme +39 333 123 4567.",
  "Wrong password.": "Mot de passe incorrect.",
  "Another account has this email.": "Un autre compte a cet e-mail.",

  // src/settings/NotificationsSetting.tsx, notificationFields.ts
  "Sgrava does not send notifications yet. Your choice is kept for when it does.":
    "Sgrava n'envoie pas encore de notifications. Ton choix est gardé pour quand ce sera le cas.",
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
  "{metres} metres: {pace}": "{metres} mètres : {pace}",

  // src/screens/RunPanel.tsx
  "Speed now": "Vitesse",
  "Avg speed": "Vit. moy.",
  "Last km": "Dernier km",
  "Last mi": "Dernier mi",
  "Avg /500 m": "Moy. /500 m",
  "Last 500 m": "Dern. 500 m",

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

  // src/settings/sport.ts
  "Ride without a route": "Rouler sans parcours",
  "Paddle without a route": "Pagayer sans parcours",
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
  "Strava did not let Sgrava change this activity. Change its text on Strava.":
    "Strava n'a pas laissé Sgrava modifier cette activité. Modifie son texte sur Strava.",
  "Strava takes no pictures from other apps: keep this one in Photos with «Save Image» and add it there.":
    "Strava n'accepte pas les images d'autres apps : garde celle-ci dans Photos avec « Enregistrer l'image » et ajoute-la là-bas.",

  // src/share/postRun.ts
  Distance: "Distance",
  Time: "Temps",
  Pace: "Allure",

  // src/share/sharePicture.ts
  "This phone cannot open the share sheet.":
    "Ce téléphone ne peut pas ouvrir le menu de partage.",
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

  // src/social/SuperLikeSheet.tsx
  "Super like": "Super like",
  "Write a comment to send your super like":
    "Écris un commentaire pour envoyer ton super like",
  Send: "Envoyer",

  // src/social/reactionKinds.ts
  "Sgrava heart, super like": "Cœur Sgrava, super like",
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
  "Send the runs you save in Sgrava to your Strava profile.":
    "Envoie vers ton profil Strava les courses que tu enregistres dans Sgrava.",

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
  "Allow it for Sgrava in Settings to follow the route.":
    "Autorise-la pour Sgrava dans Réglages pour suivre le parcours.",
  "Allow it for Sgrava in Settings to record your track.":
    "Autorise-la pour Sgrava dans Réglages pour enregistrer ta trace.",

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
    "Depuis {where}. Nommez une ville dans les mots pour aller ailleurs.",
  "Make my route": "Créer mon parcours",
  "EXAMPLES IN {city}": "EXEMPLES À {city}",
  "No recommended routes here yet: shapes of {distance} from the centre, drawn now.":
    "Pas encore de parcours recommandés ici : des formes de {distance} depuis le centre, dessinées maintenant.",
  "Three first, more while you choose.":
    "Trois d'abord, d'autres pendant que vous choisissez.",
  "Best near you": "Les meilleurs près de vous",
  "Starting within {distance} of {place}": "Départ à moins de {distance} de {place}",
  "your start": "votre départ",
  "Loading routes…": "Chargement des parcours…",
  "Choose a start first: the routes are the ones near it.":
    "Choisissez d'abord un départ : les parcours sont ceux à proximité.",
  "The routes could not load. Check the connection and try again.":
    "Les parcours n'ont pas pu se charger. Vérifiez la connexion et réessayez.",
  "Ask for a route": "Demander un parcours",
  "Getting directions…": "Récupération de l'itinéraire…",
  Start: "Démarrer",
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
  "Preparing GPX…": "Préparation du GPX…",
  "Export GPX": "Exporter le GPX",
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
  "near your start": "près de votre départ",
  "near {place}": "près de {place}",
  "in {city}": "à {city}",
  "e.g. a romantic heart, famous places, food 8 km":
    "ex. un cœur romantique, lieux célèbres, gastronomie 8 km",
  "e.g. a romantic heart in {city}, 8 km": "ex. un cœur romantique à {city}, 8 km",
};
