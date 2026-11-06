import type { OutfitTag } from "@shaperoute/shared-types";
import { useEffect, useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { sessionEnded } from "../../account/messages";
import { countOutfitOpen, fetchOutfitShop } from "../../api/outfitTags";
import { color, font, MIN_TAP_SIZE, radius, space } from "../../theme/tokens";
import { SheetModal } from "../../ui/SheetModal";
import { Tap } from "../../ui/Tap";
import { ReportMenu } from "../ReportMenu";
import { isOwnersTag } from "./outfitTags";
import { countsLine, linkByLine, outfitShopLabel, outfitWords } from "./outfitWords";

type Props = {
  tag: OutfitTag;
  /** Who tagged it: «Link added by {name}», and who «Report» is about. */
  author: { public_id: string; username: string } | null;
  /** The API and the session the counts and «Shop» are asked with. */
  apiUrl: string;
  token: string;
  onSessionEnded: (token: string) => void;
  onClose: () => void;
  /** The fake fetch and opening of the tests. */
  fetchFn?: typeof fetch;
  openUrl?: (url: string) => Promise<unknown>;
};

/**
 * The sheet of an item a member tagged on a photo (TASK-394 part B,
 * ADR-0333), as Style's (`feed/StyleProductSheet`) with fewer lines: what
 * it is, its brand and model, «Shop on {store}» that opens the shop in the
 * phone's browser, never inside the app, and the line the user approved
 * under it; no price, no «AI-generated», no «Ad»: MuW earns nothing here.
 * Opening it and «Shop» count one for the day, but not for its author, who
 * sees the totals instead (the user's choice 5) and opens its own link.
 * The others can report it.
 */
export function OutfitTagSheet({
  tag,
  author,
  apiUrl,
  token,
  onSessionEnded,
  onClose,
  fetchFn,
  openUrl = (url) => Linking.openURL(url),
}: Props) {
  const insets = useSafeAreaInsets();
  const words = outfitWords();
  const mine = isOwnersTag(tag);
  const [busy, setBusy] = useState(false);
  const [gone, setGone] = useState(false);
  // Down first, then gone (TASK-388 C3), as the app's other sheets.
  const [open, setOpen] = useState(true);
  const close = () => setOpen(false);
  useEffect(() => {
    // The author's own touches are not counted: the app does not send them.
    if (!mine) {
      void countOutfitOpen(apiUrl, token, tag.id, { fetchFn });
    }
  }, [apiUrl, fetchFn, mine, tag.id, token]);
  const shop = async () => {
    if (busy) {
      return;
    }
    if (mine) {
      if (tag.url !== null && tag.url.startsWith("https://")) {
        await openUrl(tag.url).catch(() => {});
      }
      return;
    }
    setBusy(true);
    const outcome = await fetchOutfitShop(apiUrl, token, tag.id, { fetchFn });
    setBusy(false);
    if (outcome.kind === "ok") {
      if (outcome.value === null) {
        setGone(true);
        return;
      }
      await openUrl(outcome.value).catch(() => {});
      return;
    }
    if (sessionEnded(outcome)) {
      onSessionEnded(token);
    }
  };
  const model = tag.product_name ?? "";
  return (
    <SheetModal visible={open} onRequestClose={close} onHidden={onClose}>
      <Pressable
        style={styles.backdrop}
        onPress={close}
        accessible={false}
        importantForAccessibility="no"
        testID="outfit-sheet-backdrop"
      />
      <View
        style={[styles.sheet, { paddingBottom: insets.bottom + space.sm }]}
        testID="outfit-sheet"
      >
        <View style={styles.top}>
          <Text style={styles.item}>{words.items[tag.item]}</Text>
          {!mine && author !== null && (
            <ReportMenu
              apiUrl={apiUrl}
              token={token}
              target={{ kind: "outfit_tag", id: tag.id }}
              person={author}
              onSessionEnded={onSessionEnded}
              fetchFn={fetchFn}
            />
          )}
        </View>
        <Text style={styles.brand} accessibilityRole="header">
          {tag.brand}
        </Text>
        {model !== "" && <Text style={styles.model}>{model}</Text>}
        {tag.store !== null &&
          (gone ? (
            <Text style={styles.line} testID="outfit-unavailable">
              {words.unavailable}
            </Text>
          ) : (
            <Tap
              style={[styles.shop, busy && styles.busy]}
              onPress={() => void shop()}
              disabled={busy}
              accessibilityRole="link"
              accessibilityState={{ busy, disabled: busy }}
              testID="outfit-shop"
            >
              <Text style={styles.shopText}>{outfitShopLabel(tag.store)}</Text>
            </Tap>
          ))}
        {tag.store !== null && author !== null && (
          <Text style={styles.line}>{linkByLine(author.username)}</Text>
        )}
        {mine && tag.opens !== null && tag.shops !== null && (
          <View testID="outfit-counts">
            <Text style={styles.counts}>{countsLine(tag.opens, tag.shops)}</Text>
            <Text style={styles.line}>{words.onlyYou}</Text>
          </View>
        )}
      </View>
    </SheetModal>
  );
}

// As Style's sheet (`feed/StyleProductSheet`).
const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
  },
  sheet: {
    gap: space.sm,
    padding: space.lg,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: color.hairline,
    backgroundColor: color.surface,
  },
  top: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  item: {
    ...font.small,
    color: color.textMuted,
  },
  brand: {
    ...font.cardTitle,
    color: color.text,
  },
  model: {
    ...font.body,
    color: color.text,
  },
  line: {
    ...font.small,
    color: color.textMuted,
  },
  counts: {
    ...font.body,
    color: color.text,
  },
  // Neutral, as every control but the one that draws the route.
  shop: {
    minHeight: MIN_TAP_SIZE,
    alignItems: "center",
    justifyContent: "center",
    marginTop: space.xs,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.borderStrong,
    backgroundColor: color.surfaceRaised,
  },
  busy: {
    opacity: 0.6,
  },
  shopText: {
    ...font.label,
    color: color.text,
  },
});
