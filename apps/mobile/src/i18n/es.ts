import type { Table } from "./translate";

/**
 * The app's texts in Spanish, by their English text (ADR-0172), in the
 * order of the files that show them. To confirm with someone who speaks it
 * (docs/UI.md).
 */
export const ES: Table = {
  // src/about/AboutPage.tsx
  "Draft — not final yet.": "Borrador: todavía no es definitivo.",
  "Last updated: {date}": "Última actualización: {date}",

  // src/account/fields.ts
  "You must be at least 16 to sign up.":
    "Debes tener al menos 16 años para registrarte.",
  "Enter the email of your account.": "Escribe el correo de tu cuenta.",
  "Enter your password.": "Escribe tu contraseña.",
  "A username is 3 to 20 letters, digits, _ or . (no spaces).":
    "Un nombre de usuario tiene de 3 a 20 letras, cifras, _ o . (sin espacios).",
  "Enter an email address, like name@example.com.":
    "Escribe una dirección de correo, como nombre@example.com.",
  "A password is at least {min} characters.":
    "Una contraseña tiene al menos {min} caracteres.",
  "A password is at most {max} characters.":
    "Una contraseña tiene como máximo {max} caracteres.",

  // src/account/messages.ts (TASK-256: words for whoever uses the phone)
  "The app cannot reach the service. Update the app.":
    "La app no puede conectar con el servicio. Actualiza la app.",
  "Your session has ended. Log in again.":
    "Tu sesión ha terminado. Inicia sesión de nuevo.",
  "Something went wrong on our side. Try again in a moment.":
    "Algo ha fallado por nuestra parte. Inténtalo de nuevo en un momento.",
  "No connection. Check the network and try again.":
    "Sin conexión. Comprueba la red e inténtalo de nuevo.",
  "This email already has an account. Log in instead.":
    "Este correo ya tiene una cuenta. Inicia sesión.",
  "This username is taken. Try another one.":
    "Este nombre de usuario ya está en uso. Prueba con otro.",
  "Wrong email or password.": "Correo o contraseña incorrectos.",
  "Accounts are not available right now. Try again later.":
    "Las cuentas no están disponibles ahora. Inténtalo más tarde.",
  "This version of the app is no longer allowed in. Update the app.":
    "Esta versión de la app ya no puede entrar. Actualiza la app.",
  "Too many tries. Wait a minute and try again.":
    "Demasiados intentos. Espera un minuto e inténtalo de nuevo.",
  "Too many tries. Wait {minutes} minutes and try again.":
    "Demasiados intentos. Espera {minutes} minutos e inténtalo de nuevo.",

  // src/activities/ActivitiesList.tsx
  "{count} run is on this phone, waiting for a connection.":
    "{count} carrera está en este teléfono, esperando conexión.",
  "{count} runs are on this phone, waiting for a connection.":
    "{count} carreras están en este teléfono, esperando conexión.",
  "Loading…": "Cargando…",
  "Show more": "Mostrar más",
  "Loading your activities…": "Cargando tus actividades…",
  "Your activities could not load.": "No se han podido cargar tus actividades.",
  "Try again": "Reintentar",
  "No activities yet. Save a run when you finish it, and it is kept here.":
    "Aún no hay actividades. Guarda una carrera cuando la termines y la encontrarás aquí.",
  "{when}, {where}, {facts}, public, open on the map":
    "{when}, {where}, {facts}, pública, abrir en el mapa",
  "{when}, {where}, {facts}, open on the map":
    "{when}, {where}, {facts}, abrir en el mapa",
  "Opening…": "Abriendo…",
  Public: "Pública",
  "Delete this run? It cannot be undone.":
    "¿Eliminar esta carrera? No se puede deshacer.",
  // «Keep it» answers two questions (a run, Strava): a word that fits both.
  "Keep it": "Cancelar",
  "Delete run": "Eliminar carrera",
  "Delete the run of {when}": "Eliminar la carrera del {when}",
  Delete: "Eliminar",
  // A run the API will not take (TASK-257).
  "The server could not take this run: {message}":
    "El servidor no pudo aceptar esta carrera: {message}",
  "Discard this run? It will not be saved.": "¿Descartar esta carrera? No se guardará.",
  "Discard run": "Descartar carrera",
  "Send the run of {when} again": "Volver a enviar la carrera del {when}",
  "Discard the run of {when}": "Descartar la carrera del {when}",
  Discard: "Descartar",

  // src/activities/ActivityCard.tsx
  "Yellow: the route. White: what you ran.":
    "Amarillo: la ruta. Blanco: lo que has corrido.",
  "White: what you ran.": "Blanco: lo que has corrido.",
  "Back to the list": "Volver a la lista",

  // src/activities/activitiesDoor.ts
  "Sign up or log in to keep your runs and share them as drawings.":
    "Regístrate o inicia sesión para guardar tus carreras y compartirlas como dibujos.",
  "This run is no longer in your activities.":
    "Esta carrera ya no está en tus actividades.",

  // src/activities/activityText.ts
  Sun: "Dom",
  Mon: "Lun",
  Tue: "Mar",
  Wed: "Mié",
  Thu: "Jue",
  Fri: "Vie",
  Sat: "Sáb",
  Jan: "ene",
  Feb: "feb",
  Mar: "mar",
  Apr: "abr",
  May: "may",
  Jun: "jun",
  Jul: "jul",
  Aug: "ago",
  Sep: "sept",
  Oct: "oct",
  Nov: "nov",
  Dec: "dic",
  "{weekday} {day} {month} {year}": "{weekday} {day} {month} {year}",
  Run: "Carrera",

  // src/activities/RunEnd.tsx
  "The phone holds {count} runs not sent yet. Discard one in My activities first.":
    "El teléfono ya tiene {count} carreras sin enviar. Descarta primero una en Mis actividades.",
  "The phone holds {count} runs not sent yet. They go when there is a connection; then save this one.":
    "El teléfono ya tiene {count} carreras sin enviar. Se envían cuando haya conexión; después guarda esta.",

  // src/api/comments.ts
  "A comment needs some words.": "Un comentario necesita algunas palabras.",
  "A comment is at most {max} characters.":
    "Un comentario tiene como máximo {max} caracteres.",
  "Too many comments in a minute. Wait a moment and try again.":
    "Demasiados comentarios en un minuto. Espera un momento e inténtalo de nuevo.",
  "The comments of this drawing are not available.":
    "Los comentarios de este dibujo no están disponibles.",

  // src/api/reactions.ts
  "At least 2 characters": "Al menos 2 caracteres",
  "Your reaction wasn't saved. Check the connection.":
    "Tu reacción no se ha guardado. Comprueba la conexión.",

  // src/api/strava.ts
  "No connection. Try again when you are online.":
    "Sin conexión. Inténtalo de nuevo cuando estés en línea.",
  "Strava is taking no more runs for now. Try again later.":
    "Strava no acepta más carreras por ahora. Inténtalo más tarde.",
  "Strava could not read this run.": "Strava no ha podido leer esta carrera.",
  "Strava is not connected. Connect it and try again.":
    "Strava no está conectado. Conéctalo e inténtalo de nuevo.",
  "Strava is not available on this API.": "Strava no está disponible en esta API.",
  "Strava did not answer. Try again in a while.":
    "Strava no ha respondido. Inténtalo dentro de un rato.",

  // src/engine/OfflineMapsSetting.tsx
  "Offline maps: {size}": "Mapas sin conexión: {size}",
  "Maps download on Wi-Fi and mobile data.":
    "Los mapas se descargan con wifi y con datos móviles.",

  // src/engine/ZoneNotice.tsx
  "Downloading the maps of your area ({size}) so routes work without signal.":
    "Descargando los mapas de tu zona ({size}) para que las rutas funcionen sin señal.",

  // src/engine/sizeText.ts
  "{size} MB": "{size} MB",
  "{size} GB": "{size} GB",

  // src/favorites/FavoriteHeart.tsx
  "Remove from favorites": "Quitar de favoritos",
  "Add to favorites": "Añadir a favoritos",

  // src/favorites/FavoritesList.tsx
  "Kept {day} {month} {year}": "Guardado el {day} {month} {year}",
  "{title}, open on the map": "{title}, abrir en el mapa",
  "Remove {title} from favorites": "Quitar {title} de favoritos",
  "Loading your favorites…": "Cargando tus favoritos…",
  "Your favorites could not load.": "No se han podido cargar tus favoritos.",
  "No favorites yet. Tap {heart} on a route on the map to keep it here.":
    "Aún no hay favoritos. Toca {heart} en una ruta del mapa para guardarla aquí.",

  // src/favorites/favoriteRoute.ts
  Route: "Ruta",

  // src/favorites/favoritesDoor.ts
  "Sign up or log in to keep your favorite routes.":
    "Regístrate o inicia sesión para guardar tus rutas favoritas.",

  // src/feed/FeedAd.tsx
  Sponsored: "Patrocinado",

  // src/feed/FeedPost.tsx
  "OpenFreeMap © OpenMapTiles\nData from OpenStreetMap":
    "OpenFreeMap © OpenMapTiles\nDatos de OpenStreetMap",
  "{user} in {city}: {title}. {facts}.": "{user} en {city}: {title}. {facts}.",
  "Opens the route on the map": "Abre la ruta en el mapa",

  // src/i18n/shapeNames.ts
  Circle: "Círculo",
  Heart: "Corazón",
  Star: "Estrella",
  Horse: "Caballo",
  Moon: "Luna",
  Cat: "Gato",
  Fish: "Pez",
  Butterfly: "Mariposa",
  Snail: "Caracol",
  "Dog head": "Cabeza de perro",
  "Rabbit head": "Cabeza de conejo",
  Pumpkin: "Calabaza",
  "Christmas tree": "Árbol de Navidad",
  Smiley: "Carita sonriente",
  Ghost: "Fantasma",
  Donut: "Dónut",
  "The sun": "Sol",

  // src/explore/NearbyTowns.tsx
  "NEARBY TOWNS": "LOCALIDADES CERCANAS",
  "{town}, {km} km away": "{town}, a {km} km",
  "{mi} mi away": "a {mi} mi",
  "{town}, {mi} mi away": "{town}, a {mi} mi",

  // src/intro/AppBoundary.tsx
  "Something went wrong.": "Algo ha fallado.",

  // src/map/MapView.tsx
  "The map could not be loaded. Check the network.":
    "No se ha podido cargar el mapa. Comprueba la red.",
  Retry: "Reintentar",

  // src/map/NorthArrow.tsx
  "North arrow": "Flecha del norte",
  "Turns the map north up": "Pone el norte arriba",
  "Turns the map like the drawing": "Gira el mapa como el dibujo",

  // src/paddle/PaddleExplore.tsx
  Next: "A continuación",
  "Drawing…": "Dibujando…",
  "Your start": "Tu salida",
  "On the water": "En el agua",
  "Shapes to paddle, within 1 km of the shore":
    "Formas para remar, a menos de 1 km de la orilla",
  "LAKES AND SEA": "LAGOS Y MAR",
  "Near me": "Cerca de mí",
  "Choose a lake or a beach: eight shapes on its water, from the shore.":
    "Elige un lago o una playa: ocho formas en su agua, desde la orilla.",
  "Choose a start in Draw first: the shapes start from the shore nearest to it.":
    "Elige primero una salida en Draw: las formas empiezan en la orilla más cercana.",
  "Near your start": "Cerca de tu salida",
  "{km} km away": "a {km} km",
  "Type a lake or a beach": "Escribe un lago o una playa",
  "No lake or beach matches “{typed}”.": "Ningún lago o playa coincide con «{typed}».",
  "{shape}, {km} km, on the water": "{shape}, {km} km, en el agua",
  "{shape}, {mi} mi, on the water": "{shape}, {mi} mi, en el agua",
  "Not drawn": "No dibujado",

  // src/paddle/placeSpots.ts
  "Lake, beach, city or street": "Lago, playa, ciudad o calle",

  // src/paddle/PaddleNotice.tsx
  "Before you paddle": "Antes de remar",
  "Wear a life jacket.": "Ponte un chaleco salvavidas.",
  "Check the weather and the wind before you go out.":
    "Mira el tiempo y el viento antes de salir.",
  "Follow the local rules: swimming areas, boat lanes, harbours. Sgrava does not know them.":
    "Respeta las normas del lugar: zonas de baño, canales de navegación, puertos. Sgrava no las conoce.",
  "The route stays within 1 km of the shore. That does not make it safe or allowed.":
    "La ruta se queda a menos de 1 km de la orilla. Eso no la hace segura ni permitida.",
  "I understand": "Entendido",
  "Not now": "Ahora no",

  // src/paddle/MoveShape.tsx, src/route/RoutePanel.tsx
  "Move the shape": "Mover la forma",
  "Drag the shape where you want it, then let go.":
    "Arrastra la forma adonde la quieras y suéltala.",
  "It stays on the water, off the shore, where it fits.":
    "Se queda en el agua, lejos de la orilla, donde cabe.",
  "The shape does not fit there: this is the nearest place.":
    "La forma no cabe ahí: este es el lugar más cercano.",

  // src/paddle/waterPlaces.ts
  "from Riva del Garda": "desde Riva del Garda",
  "from Como": "desde Como",
  "from the beach": "desde la playa",

  // src/places/PlaceSearch.tsx
  "City or street": "Ciudad o calle",
  Search: "Buscar",
  "Searching…": "Buscando…",
  "No place found. Try adding the city.":
    "No se ha encontrado ningún lugar. Prueba a añadir la ciudad.",
  "The search failed. Check the connection and try again.":
    "La búsqueda ha fallado. Comprueba la conexión e inténtalo de nuevo.",
  "© OpenStreetMap contributors": "© colaboradores de OpenStreetMap",

  // src/profile/EditProfile.tsx
  USERNAME: "NOMBRE DE USUARIO",
  "3 to 20 letters, digits, _ or .": "De 3 a 20 letras, cifras, _ o .",
  BIO: "BIO",
  "A few words about you": "Unas palabras sobre ti",
  "{length} of {max} characters": "{length} de {max} caracteres",
  "Saving…": "Guardando…",
  Save: "Guardar",

  // src/profile/PhotoChoices.tsx
  "Removing…": "Quitando…",
  "Choose a picture": "Elegir una foto",
  "Take a photo": "Hacer una foto",
  "Remove picture": "Quitar la foto",

  // src/profile/PhotoRow.tsx
  "Profile picture": "Foto de perfil",

  // src/profile/ProfileHome.tsx
  "Edit profile": "Editar perfil",
  Favorites: "Favoritos",
  "My activities": "Mis actividades",
  Settings: "Ajustes",

  // src/settings/EmailSetting.tsx, PhoneSetting.tsx, contactFields.ts (TASK-183)
  "NEW EMAIL": "NUEVO CORREO",
  "PHONE NUMBER": "NÚMERO DE TELÉFONO",
  Add: "Añadir",
  "Remove number": "Quitar el número",
  "Only you see your number. Friends who already have it will be able to find you on Sgrava.":
    "Solo tú ves tu número. Los amigos que ya lo tienen podrán encontrarte en Sgrava.",
  "Changing the email is not available on this API yet.":
    "En esta API todavía no se puede cambiar el correo.",
  "The phone number is not available on this API yet.":
    "En esta API todavía no hay número de teléfono.",
  "This is already the email of your account.": "Ya es el correo de tu cuenta.",
  "Write the number with its country code, like +39 333 123 4567.":
    "Escribe el número con el prefijo del país, como +39 333 123 4567.",
  "Wrong password.": "Contraseña incorrecta.",
  "Another account has this email.": "Otra cuenta tiene este correo.",

  // src/settings/NotificationsSetting.tsx, notificationFields.ts
  "Sgrava does not send notifications yet. Your choice is kept for when it does.":
    "Sgrava todavía no envía notificaciones. Tu elección queda guardada para cuando lo haga.",
  "Notifications are not available on this API yet.":
    "En esta API todavía no hay notificaciones.",

  // src/profile/SettingsPage.tsx
  "Change email": "Cambiar correo",
  "Phone number": "Número de teléfono",
  Units: "Unidades",
  NOTIFICATIONS: "NOTIFICACIONES",
  "Email notifications": "Notificaciones por correo",
  "Push notifications": "Notificaciones push",
  ABOUT: "INFORMACIÓN",
  Help: "Ayuda",
  Terms: "Términos",
  Privacy: "Privacidad",
  ACCOUNT: "CUENTA",
  PREFERENCES: "PREFERENCIAS",
  "Log out": "Cerrar sesión",
  "Delete your account? Everything that is yours goes with it, at once. It cannot be undone.":
    "¿Eliminar tu cuenta? Todo lo que es tuyo se va con ella, al momento. No se puede deshacer.",
  "Deleting…": "Eliminando…",
  "Delete my account": "Eliminar mi cuenta",
  "Keep my account": "Conservar mi cuenta",
  "Delete account": "Eliminar cuenta",

  // src/profile/UserProfilePage.tsx
  "Log in to see the profiles of the others.":
    "Inicia sesión para ver los perfiles de los demás.",
  "This profile is not available.": "Este perfil no está disponible.",
  "{count} drawing": "{count} dibujo",
  "{count} drawings": "{count} dibujos",
  "Loading the profile…": "Cargando el perfil…",
  "{count} follower": "{count} seguidor",
  "{count} followers": "{count} seguidores",
  "{count} following": "sigue a {count}",

  // src/profile/profileFields.ts
  "Editing the profile is not available on this API yet.":
    "Editar el perfil aún no está disponible en esta API.",
  "A bio is at most {max} characters.": "Una bio tiene como máximo {max} caracteres.",

  // src/profile/useProfilePhoto.ts
  "The camera is off for this app. Allow it in Settings, or choose a picture instead.":
    "Esta app no tiene acceso a la cámara. Permítelo en Ajustes o elige una foto.",
  "This picture is too large. Choose a smaller one.":
    "Esta foto es demasiado grande. Elige una más pequeña.",
  "Could not open the picture. Try again.":
    "No se ha podido abrir la foto. Inténtalo de nuevo.",
  "This picture cannot be used. Choose another one.":
    "Esta foto no se puede usar. Elige otra.",
  "Profile pictures are not available on this API yet.":
    "Las fotos de perfil aún no están disponibles en esta API.",

  // src/route/RoutePanel.tsx
  "{letters} km of letters + {between} km riding between them":
    "{letters} km de letras + {between} km en bici entre una y otra",
  "{drawn} km of drawing + {between} km walking between the parts":
    "{drawn} km de dibujo + {between} km a pie entre las partes",
  "{drawn} km of drawing + {between} km riding between the parts":
    "{drawn} km de dibujo + {between} km en bici entre las partes",
  "{drawn} km of drawing + {between} km paddling between the parts":
    "{drawn} km de dibujo + {between} km remando entre las partes",
  "On the water, a shape of the catalogue.": "En el agua, una forma del catálogo.",
  "{name} · on the water · target {km} km": "{name} · en el agua · objetivo {km} km",
  "{name} · on roads · target {km} km": "{name} · por carretera · objetivo {km} km",
  // «Draw» with «Miles» (TASK-182 part B): src/route/RoutePanel.tsx,
  // DistanceStepper.tsx, wordInput.ts
  "Distance in miles": "Distancia en millas",
  "Enter a distance between {lowest} and {highest} mi.":
    "Introduce una distancia entre {lowest} y {highest} mi.",
  "{count} letter: at least {mi} mi. A word takes a few minutes to draw.":
    "{count} letra: al menos {mi} mi. Dibujar una palabra lleva unos minutos.",
  "{count} letters: at least {mi} mi. A word takes a few minutes to draw.":
    "{count} letras: al menos {mi} mi. Dibujar una palabra lleva unos minutos.",
  "Use {mi} mi": "Usar {mi} mi",
  "{letters} mi of letters + {between} mi riding between them":
    "{letters} mi de letras + {between} mi en bici entre una y otra",
  "{letters} mi of letters + {between} mi walking between them":
    "{letters} mi de letras + {between} mi a pie entre una y otra",
  "{drawn} mi of drawing + {between} mi walking between the parts":
    "{drawn} mi de dibujo + {between} mi a pie entre las partes",
  "{drawn} mi of drawing + {between} mi riding between the parts":
    "{drawn} mi de dibujo + {between} mi en bici entre las partes",
  "{drawn} mi of drawing + {between} mi paddling between the parts":
    "{drawn} mi de dibujo + {between} mi remando entre las partes",
  "{name} · on the water · target {mi} mi": "{name} · en el agua · objetivo {mi} mi",
  "{name} · on roads · target {mi} mi": "{name} · por carretera · objetivo {mi} mi",
  "Drawing the picture's outline, {mi} mi…":
    "Dibujando el contorno de la foto, {mi} mi…",
  "Drawing “{word}”, {mi} mi…": "Dibujando «{word}», {mi} mi…",
  "Drawing a {mi} mi {name}…": "Dibujando: {name}, {mi} mi…",
  "At most {most} letters: each needs {each} mi, and the app goes up to {highest} mi.":
    "Como máximo {most} letras: cada una necesita {each} mi, y la app llega hasta {highest} mi.",
  "“{word}” needs at least {mi} mi: {each} mi for each letter.":
    "«{word}» necesita al menos {mi} mi: {each} mi por cada letra.",

  // src/route/betterDistance.ts
  "This shape comes out better at about {km} km.":
    "Esta forma sale mejor a unos {km} km.",
  "This word comes out better at about {km} km.":
    "Esta palabra sale mejor a unos {km} km.",
  "This outline comes out better at about {km} km.":
    "Este contorno sale mejor a unos {km} km.",
  "Try {km} km": "Probar {km} km",
  "This shape comes out better at about {mi} mi.":
    "Esta forma sale mejor a unas {mi} mi.",
  "This word comes out better at about {mi} mi.":
    "Esta palabra sale mejor a unas {mi} mi.",
  "This outline comes out better at about {mi} mi.":
    "Este contorno sale mejor a unas {mi} mi.",
  "Try {mi} mi": "Probar {mi} mi",

  // src/route/problems.ts
  "The route could not be drawn. Try again, or try another start.":
    "No se ha podido dibujar la ruta. Inténtalo de nuevo o prueba otra salida.",
  "This word cannot be read right now. Try one of these: {list}.":
    "Esta palabra no se puede leer ahora. Prueba una de estas: {list}.",
  "Drawing this route is taking too long. Try again later, or a shorter distance.":
    "Dibujar esta ruta está tardando demasiado. Inténtalo más tarde o con una distancia más corta.",
  "This request was lost. Try again.":
    "Esta solicitud se ha perdido. Inténtalo de nuevo.",
  "There is no lake or sea near this start. Start from the shore, within 2 km of the water.":
    "No hay ningún lago ni mar cerca de esta salida. Sal desde la orilla, a menos de 2 km del agua.",
  "This shape does not fit on the water here at this distance. It fits at about {km} km.":
    "Esta forma no cabe en el agua aquí a esta distancia. Cabe a unos {km} km.",
  "This shape does not fit on the water here. Try a shorter distance, another shape, or another start:":
    "Esta forma no cabe en el agua aquí. Prueba una distancia más corta, otra forma u otra salida:",
  "This shape does not fit the roads here at this distance. It fits at about {mi} mi.":
    "Esta forma no cabe en las calles aquí a esta distancia. Cabe a unas {mi} mi.",
  "This word does not fit the roads here at this distance. It fits at about {mi} mi.":
    "Esta palabra no cabe en las calles aquí a esta distancia. Cabe a unas {mi} mi.",
  "This image does not fit the roads here at this distance. It fits at about {mi} mi.":
    "Esta imagen no cabe en las calles aquí a esta distancia. Cabe a unas {mi} mi.",
  "There is no lake or sea near this start. Start from the shore, within 1 mile of the water.":
    "No hay ningún lago ni mar cerca de esta salida. Sal desde la orilla, a menos de 1 milla del agua.",
  "This shape does not fit on the water here at this distance. It fits at about {mi} mi.":
    "Esta forma no cabe en el agua aquí a esta distancia. Cabe a unas {mi} mi.",

  // src/route/warnings.ts
  "Includes {distance} walking the bike.": "Incluye {distance} caminando con la bici.",

  // src/screens/PeopleScreen.tsx
  "Find friends": "Buscar amigos",

  // src/screens/ProfileLayer.tsx
  "Profile, log in again": "Perfil, inicia sesión de nuevo",
  "Profile, {count} follow request": "Perfil, {count} solicitud de seguimiento",
  "Profile, {count} follow requests": "Perfil, {count} solicitudes de seguimiento",
  Profile: "Perfil",

  // src/screens/ProfileScreen.tsx
  "Your account and everything that was yours have been deleted.":
    "Tu cuenta y todo lo que era tuyo se han eliminado.",
  "You are logged out on this phone.": "Has cerrado sesión en este teléfono.",
  Back: "Atrás",

  // src/screens/RunDashboard.tsx
  Speed: "Velocidad",
  "Kilometre {km}: {speed} km/h": "Kilómetro {km}: {speed} km/h",
  Mi: "Mi",
  miles: "millas",
  "Your first mile will show here.": "Tu primera milla aparecerá aquí.",
  "Mile {mile}: {pace}": "Milla {mile}: {pace}",
  "Mile {mile}: {speed} mph": "Milla {mile}: {speed} mph",
  "Your first 500 metres will show here.": "Tus primeros 500 metros aparecerán aquí.",
  "{metres} metres: {pace}": "{metres} metros: {pace}",

  // src/screens/RunPanel.tsx
  "Speed now": "Vel. ahora",
  "Avg speed": "Vel. media",
  "Last km": "Último km",
  "Last mi": "Última mi",
  "Avg /500 m": "Med. /500 m",
  "Last 500 m": "Últ. 500 m",

  // src/screens/SignInScreen.tsx
  "Sign up": "Registrarse",
  "Log in": "Iniciar sesión",
  EMAIL: "CORREO",
  "name@example.com": "nombre@example.com",
  PASSWORD: "CONTRASEÑA",
  "At least 8 characters": "Al menos 8 caracteres",
  "I am at least 16": "Tengo al menos 16 años",
  "Signing up…": "Registrando…",
  "Logging in…": "Iniciando sesión…",

  // src/settings/LanguageSetting.tsx
  Language: "Idioma",
  "Phone language": "Idioma del teléfono",

  // src/settings/UnitsSetting.tsx
  Kilometres: "Kilómetros",
  Miles: "Millas",
  "Phone units": "Unidades del teléfono",

  // src/settings/sport.ts
  "Ride without a route": "Rodar sin ruta",
  "Paddle without a route": "Remar sin ruta",
  "Run without a route": "Correr sin ruta",

  // src/share/PostImage.tsx
  "Drag it to move it. Tap it to take it off.":
    "Arrástralo para moverlo. Tócalo para quitarlo.",

  // src/share/SharePost.tsx
  "Share your run": "Comparte tu carrera",
  "Drag the emoji to move them. Tap one to take it off.":
    "Arrastra los emojis para moverlos. Toca uno para quitarlo.",
  Results: "Resultados",
  "Add emoji": "Añadir emoji",
  "Add {emoji}": "Añadir {emoji}",
  "Up to {count} emoji: tap one on the post to take it off.":
    "Hasta {count} emojis: toca uno en la publicación para quitarlo.",
  "Making the picture…": "Creando la imagen…",
  "Pick Instagram in the list: Story, Feed or Messages.":
    "Elige Instagram en la lista: Historia, Feed o Mensajes.",
  Share: "Compartir",

  // src/share/StravaPostRow.tsx
  "To send this post to Strava, save the run, then share it from «My activities».":
    "Para enviar esta publicación a Strava, guarda la carrera y luego compártela desde «Mis actividades».",
  "Update on Strava": "Actualizar en Strava",
  "The activity on Strava has this post's text now.":
    "La actividad en Strava ya tiene el texto de esta publicación.",
  "Strava did not let Sgrava change this activity. Change its text on Strava.":
    "Strava no dejó que Sgrava cambiara esta actividad. Cambia el texto en Strava.",
  "Strava takes no pictures from other apps: keep this one in Photos with «Save Image» and add it there.":
    "Strava no acepta imágenes de otras apps: guarda esta en Fotos con «Guardar imagen» y añádela allí.",

  // src/share/postRun.ts
  Distance: "Distancia",
  Time: "Tiempo",
  Pace: "Ritmo",

  // src/share/sharePicture.ts
  "This phone cannot open the share sheet.":
    "Este teléfono no puede abrir el menú de compartir.",
  "The picture could not be made. Try again.":
    "No se pudo crear la imagen. Inténtalo de nuevo.",

  // src/social/DrawingCard.tsx
  "Back to the profile": "Volver al perfil",

  // src/social/DrawingComments.tsx
  "Opens the comments of this drawing.": "Abre los comentarios de este dibujo.",
  Comments: "Comentarios",
  "Delete this comment?": "¿Eliminar este comentario?",
  Cancel: "Cancelar",
  "Close the comments": "Cerrar los comentarios",
  Close: "Cerrar",
  "Add a comment…": "Añade un comentario…",
  Comment: "Comentario",
  Post: "Publicar",
  "{count} of {max} characters": "{count} de {max} caracteres",
  "Loading the comments…": "Cargando los comentarios…",
  "No comments yet. Be the first.": "Aún no hay comentarios. Escribe el primero.",
  "Show more comments": "Mostrar más comentarios",
  "{name}, {ago}: {text}": "{name}, {ago}: {text}",
  "Touch and hold to delete.": "Mantén pulsado para eliminar.",

  // src/social/DrawingReactions.tsx
  React: "Reaccionar",
  "Your reaction: {name}": "Tu reacción: {name}",
  "{count} reaction": "{count} reacción",
  "{count} reactions": "{count} reacciones",

  // src/social/DrawingsGrid.tsx
  Drawings: "Dibujos",
  "No public drawings yet. Make a run public in My activities.":
    "Aún no hay dibujos públicos. Haz pública una carrera en Mis actividades.",
  "No drawings yet.": "Aún no hay dibujos.",

  // src/social/SuperLikeSheet.tsx
  "Super like": "Super like",
  "Write a comment to send your super like":
    "Escribe un comentario para enviar tu super like",
  Send: "Enviar",

  // src/social/reactionKinds.ts
  "Sgrava heart, super like": "Corazón de Sgrava, super like",
  Fire: "Fuego",
  Clap: "Aplauso",
  Strong: "Fuerza",
  Laugh: "Risa",
  Wow: "Wow",

  // src/social/commentText.ts
  "You can't write negative comments in this app. Try another app.":
    "En esta app no puedes escribir comentarios negativos. Usa otra app.",
  "just now": "ahora mismo",
  "{count} min ago": "hace {count} min",
  "{count} h ago": "hace {count} h",
  "{count} d ago": "hace {count} d",
  "Write a comment": "Escribe un comentario",
  "{count} comment": "{count} comentario",
  "{count} comments": "{count} comentarios",

  // src/social/drawingsDoor.ts
  "This drawing is no longer public.": "Este dibujo ya no es público.",

  // src/social/FollowButton.tsx
  "Stop following {name}?": "¿Dejar de seguir a {name}?",
  Unfollow: "Dejar de seguir",
  "Takes your request back.": "Retira tu solicitud.",
  Follow: "Seguir",
  Requested: "Solicitado",
  Following: "Siguiendo",

  // src/social/FollowLists.tsx
  Requests: "Solicitudes",
  Followers: "Seguidores",
  "Nobody is asking to follow you.": "Nadie pide seguirte.",
  "Nobody follows you yet.": "Todavía no te sigue nadie.",
  "You are not following anyone yet. Find friends from Feed.":
    "Todavía no sigues a nadie. Busca amigos desde Feed.",
  Accept: "Aceptar",
  "Accept {name}": "Aceptar a {name}",
  Decline: "Rechazar",
  "Decline {name}": "Rechazar a {name}",
  "Follow back": "Seguir también",
  "Follow {name} back": "Seguir también a {name}",
  Remove: "Quitar",
  "Remove {name}": "Quitar a {name}",
  "Remove {name} from your followers?": "¿Quitar a {name} de tus seguidores?",

  // src/social/PeopleSearch.tsx
  "Log in to find your friends.": "Inicia sesión para encontrar a tus amigos.",
  "This server cannot look for members yet.":
    "Este servidor todavía no puede buscar miembros.",
  Name: "Nombre",
  "Type at least 2 letters of a name.": "Escribe al menos 2 letras de un nombre.",
  "Nobody has a name like that.": "Nadie tiene un nombre así.",

  // src/strava/StravaActivityRow.tsx
  "Sending to Strava…": "Enviando a Strava…",
  "View on Strava": "Ver en Strava",
  "This run is on Strava.": "Esta carrera está en Strava.",
  "Strava is still reading this run.": "Strava aún está leyendo esta carrera.",
  "Check again": "Comprobar de nuevo",
  "Send to Strava": "Enviar a Strava",

  // src/strava/StravaParts.tsx
  "Opening Strava…": "Abriendo Strava…",
  "Connect with Strava": "Conectar con Strava",
  On: "Sí",
  Off: "No",
  "Name on Strava": "Nombre en Strava",
  "Leave empty for an automatic name": "Déjalo vacío para un nombre automático",

  // src/strava/StravaRunEnd.tsx
  "Connect Strava, and Save sends your runs there too.":
    "Conecta Strava y Guardar enviará también allí tus carreras.",
  "To {athlete}'s Strava, with Save.": "Con Guardar va también al Strava de {athlete}.",

  // src/strava/StravaSetting.tsx
  "Strava, connected": "Strava, conectado",
  "Strava, connected as {athlete}": "Strava, conectado como {athlete}",
  Connected: "Conectado",
  "Connected as {athlete}": "Conectado como {athlete}",
  "Disconnect Strava? Runs already sent stay on Strava.":
    "¿Desconectar Strava? Las carreras ya enviadas se quedan en Strava.",
  Disconnect: "Desconectar",
  "Disconnecting…": "Desconectando…",
  "Disconnect Strava": "Desconectar Strava",
  "Send the runs you save in Sgrava to your Strava profile.":
    "Envía a tu perfil de Strava las carreras que guardas en Sgrava.",

  // src/strava/useStrava.ts
  "Could not open Strava. Try again.":
    "No se ha podido abrir Strava. Inténtalo de nuevo.",

  // The run: src/screens/{NavigateScreen,FreeRunScreen,RunDashboard,RunPanel,
  // FinishScreen,Countdown,HoldButton,PocketScreen,MapScreen}.tsx and
  // src/navigation/runStats.ts (TASK-210, la corsa)
  "Finding your position…": "Buscando tu posición…",
  "You have arrived.": "Has llegado.",
  "Off the route": "Fuera de la ruta",
  "Head back to the yellow line.": "Vuelve a la línea amarilla.",
  "Follow the route to the end.": "Sigue la ruta hasta el final.",
  "Then {directions}": "Luego {directions}",
  "Heading {direction}": "Rumbo {direction}",
  north: "norte",
  "north-east": "noreste",
  east: "este",
  "south-east": "sureste",
  south: "sur",
  "south-west": "suroeste",
  west: "oeste",
  "north-west": "noroeste",
  "You are at your start": "Estás en tu salida",
  "Your start: {distance} in a straight line, to the {direction}":
    "Tu salida: {distance} en línea recta, hacia el {direction}",
  "Your start, in a straight line": "Tu salida, en línea recta",
  "Your run": "Tu carrera",
  "Distance: {distance}": "Distancia: {distance}",
  "Distance: {distance} {units}": "Distancia: {distance} {units}",
  "Keep running": "Seguir corriendo",
  Done: "Listo",
  "Pocket mode": "Modo bolsillo",
  Pocket: "Bolsillo",
  Finish: "Terminar",
  Stop: "Parar",
  "Paused: you stopped moving": "En pausa: te has detenido",
  Paused: "En pausa",
  Resume: "Reanudar",
  Pause: "Pausa",
  Music: "Música",
  "Opens Spotify": "Abre Spotify",
  Map: "Mapa",
  Data: "Datos",
  "Auto-pause": "Pausa automática",
  Voice: "Voz",
  "Kilometre {km}: {pace}": "Kilómetro {km}: {pace}",
  Km: "Km",
  Change: "Cambio",
  "Your first kilometre will show here.": "Tu primer kilómetro aparecerá aquí.",
  "Pace now": "Ritmo ahora",
  "Avg pace": "Ritmo medio",
  "Elev. gain": "Desnivel",
  Calories: "Calorías",
  "{minutes} min": "{minutes} min",
  "{hours} h {minutes} min": "{hours} h {minutes} min",
  "about {minutes} min": "unos {minutes} min",
  "about {hours} h {minutes} min": "unas {hours} h {minutes} min",
  "Starting in {number}": "Empieza en {number}",
  "Get ready": "Prepárate",
  "Hold to end the run": "Mantén pulsado para terminar la carrera",
  "Hold to stop": "Mantén pulsado para parar",
  "The screen goes dark but stays on, so directions go on. Do not lock the phone: if you press the side button, directions stop. To come back, hold the screen for 2 seconds.":
    "La pantalla se oscurece pero sigue encendida, así las indicaciones continúan. No bloquees el teléfono: si pulsas el botón lateral, las indicaciones se detienen. Para volver, mantén pulsada la pantalla 2 segundos.",
  "Go dark": "Oscurecer",
  "Pocket mode. Hold for 2 seconds to leave.":
    "Modo bolsillo. Mantén pulsado 2 segundos para salir.",
  "Keep holding…": "Sigue pulsando…",
  "Hold for 2 seconds to leave pocket mode":
    "Mantén pulsado 2 segundos para salir del modo bolsillo",
  // src/permissions/OpenSettings.tsx, src/location/LocationOff.tsx (TASK-259)
  "Open Settings": "Abrir Ajustes",
  "Location is off": "La ubicación está desactivada",
  "Allow it for Sgrava in Settings to follow the route.":
    "Permítela a Sgrava en Ajustes para seguir la ruta.",
  "Allow it for Sgrava in Settings to record your track.":
    "Permítela a Sgrava en Ajustes para grabar tu recorrido.",
  // src/activities/RunEnd.tsx, src/social/PublicParts.tsx, PublicRow.tsx,
  // DrawingCard.tsx (TASK-208)
  "This run could not be kept on the phone. Try again.":
    "Esta carrera no se ha podido guardar en el teléfono. Inténtalo de nuevo.",
  "Save to My activities": "Guardar en Mis actividades",
  Tagged: "Etiquetados",
  "{name}'s profile": "Perfil de {name}",
  "Photo {n}": "Foto {n}",
  "Photos of a run only you can see stay on this phone. Delete the app or change phone and they are gone.":
    "Las fotos de una carrera que solo ves tú se quedan en este teléfono. Si borras la app o cambias de teléfono, se pierden.",
  "Its photos leave Sgrava and stay only on this phone.":
    "Sus fotos salen de Sgrava y se quedan solo en este teléfono.",
  "Every member sees it in your profile, without the first and last 200 m.":
    "Todos los miembros la ven en tu perfil, sin los primeros y últimos 200 m.",
  "Your followers see it in your profile, without the first and last 200 m.":
    "Tus seguidores la ven en tu perfil, sin los primeros y últimos 200 m.",
  "Saved on the phone. It is sent when you are back online.":
    "Guardada en el teléfono. Se envía cuando vuelvas a estar en línea.",
  "Saved on the phone. Others see it when you are back online.":
    "Guardada en el teléfono. Los demás la ven cuando vuelvas a estar en línea.",
  Bike: "Bici",
  Paddle: "Remo",
  Title: "Título",
  "Give it a name": "Ponle un nombre",
  "How did it go?": "¿Cómo ha ido?",
  Activity: "Actividad",
  Everyone: "Todos",
  "Only me": "Solo yo",
  "Who can see it": "Quién puede verla",
  "Tag people": "Etiquetar personas",
  "Remove photo {n}": "Quitar la foto {n}",
  "Add photo": "Añadir foto",
  "This photo could not be kept on the phone. Try again.":
    "Esta foto no se ha podido guardar en el teléfono. Inténtalo de nuevo.",
};
