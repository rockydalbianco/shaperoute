import { registerRootComponent } from "expo";

// What must run when the app opens, for its effect (TASK-500).
import "./src/startupModules";

import { Root } from "./src/intro/Root";

// registerRootComponent calls AppRegistry.registerComponent('main', () => Root);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately.
// Root is the app with the launch animation over it (TASK-179).
registerRootComponent(Root);
