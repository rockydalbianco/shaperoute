import {
  createContext,
  type ReactNode,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  SafeAreaInsetsContext,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { useAccount } from "../account/useAccount";
import {
  color,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";
import { ProfileScreen } from "./ProfileScreen";

type Tab = "draw" | "profile";

/** How the «Draw» screens say whether the bar shows under them. */
const TabBarContext = createContext<(shown: boolean) => void>(() => {});

/**
 * Called by the «Draw» screens: the bar shows under the screens that
 * choose ("What to draw", «Explore») and steps aside for the map and the
 * run, which take the whole screen (TASK-115).
 */
export function useTabBar(shown: boolean) {
  const setShown = useContext(TabBarContext);
  // Before the screen is painted: the map never shows a frame with the bar.
  useLayoutEffect(() => setShown(shown), [setShown, shown]);
}

type Props = {
  /** The API the account talks to (ADR-0031); null if unknown. */
  apiUrl: string | null;
  /** The «Draw» tab: the screens of the app as they were. */
  children: ReactNode;
};

/**
 * Two tabs at the foot of the screen, without a navigation library (as in
 * TASK-051): «Draw» and «Profile». «Draw» stays mounted under «Profile»,
 * with its map loaded and its choices as they were left.
 */
export function Tabs({ apiUrl, children }: Props) {
  const [tab, setTab] = useState<Tab>("draw");
  const [drawWantsBar, setDrawWantsBar] = useState(true);
  const account = useAccount(apiUrl);
  const insets = useSafeAreaInsets();
  const barShown = tab === "profile" || drawWantsBar;
  // Above the bar the screens end at it: the home indicator is its margin.
  const above = useMemo(
    () => (barShown ? { ...insets, bottom: 0 } : insets),
    [barShown, insets],
  );
  const ended =
    account.state.status === "signedOut" && account.state.notice === "ended";
  return (
    <TabBarContext.Provider value={setDrawWantsBar}>
      <View style={styles.tabs}>
        <View style={styles.content}>
          <SafeAreaInsetsContext.Provider value={above}>
            {children}
            {tab === "profile" && <ProfileScreen account={account} />}
          </SafeAreaInsetsContext.Provider>
        </View>
        {barShown && (
          <View
            style={[styles.bar, { paddingBottom: insets.bottom }]}
            accessibilityRole="tablist"
          >
            <TabButton
              label="Draw"
              selected={tab === "draw"}
              onPress={() => setTab("draw")}
            />
            <TabButton
              label="Profile"
              selected={tab === "profile"}
              onPress={() => setTab("profile")}
              // The session ended: «Profile» asks to log in again.
              attention={ended}
            />
          </View>
        )}
      </View>
    </TabBarContext.Provider>
  );
}

function TabButton({
  label,
  selected,
  onPress,
  attention = false,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  attention?: boolean;
}) {
  return (
    <Pressable
      style={styles.tab}
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      accessibilityLabel={attention ? `${label}, log in again` : label}
    >
      <View style={[styles.mark, selected && styles.markSelected]} />
      <View style={styles.labelRow}>
        <Text style={[styles.label, selected && styles.labelSelected]}>{label}</Text>
        {attention && <View style={styles.dot} testID="tab-attention" />}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tabs: {
    flex: 1,
    backgroundColor: color.background,
  },
  content: {
    flex: 1,
  },
  bar: {
    flexDirection: "row",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: color.border,
    backgroundColor: color.surface,
  },
  tab: {
    flex: 1,
    minHeight: MIN_TAP_SIZE + space.sm,
    alignItems: "center",
    justifyContent: "center",
    gap: space.xs,
  },
  // The chosen tab is told by light, not by yellow: that is the route's.
  mark: {
    width: space.xl,
    height: 3,
    borderRadius: radius.pill,
  },
  markSelected: {
    backgroundColor: color.text,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs,
  },
  label: {
    color: color.textMuted,
    fontSize: fontSize.small,
    fontWeight: fontWeight.semibold,
  },
  labelSelected: {
    color: color.text,
  },
  dot: {
    width: space.sm,
    height: space.sm,
    borderRadius: radius.pill,
    backgroundColor: color.warning,
  },
});
