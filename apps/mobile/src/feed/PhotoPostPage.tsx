import { useRef, useState } from "react";
import {
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import {
  initialWindowMetrics,
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { dayLabel } from "../activities/activityText";
import { drawingPhotoSource } from "../api/drawings";
import { t } from "../i18n";
import { ImportedMark } from "../imports/ImportedMark";
import { Avatar } from "../profile/Avatar";
import { OverAppSlot, useModalPage, useOverAppShown } from "../screens/overAppContext";
import { useFollowsDoor } from "../social/followsDoor";
import { ReportMenu } from "../social/ReportMenu";
import { color, font, fontWeight, MIN_TAP_SIZE, space } from "../theme/tokens";
import { closeTopLayer } from "../ui/backLayers";
import { Tap } from "../ui/Tap";
import type { ShownPost } from "./feedPosts";
import { photoPages } from "./PhotoFeedPost";
import { type PhotoPostEdit, PhotoPostSettings } from "./PhotoPostSettings";
import { PhotoViewer } from "./PhotoViewer";
import type { PostReactionsHandle } from "./PostReactions";
import { PostSheet } from "./PostSheet";
import { AUTHOR_SIDE } from "./PostPage";
import { useDoubleTap } from "./useDoubleTap";

/** Room under the photos for the bar at the foot. */
const SHEET_ROOM = 120;

type Props = {
  post: ShownPost;
  onClose: () => void;
};

/**
 * The page of a post of photos only (TASK-312 part C2), over the whole
 * screen, as the page of a run's post (PostPage) without its map and its
 * cards: who posted it and when, its photos one under the other, a tap
 * opens one whole, two are the super like; its title, its description and
 * «Imported»; at the foot `PostSheet`, with the owner's settings
 * (PhotoPostSettings), where it is changed or deleted.
 */
export function PhotoPostPage({ post, onClose }: Props) {
  useModalPage();
  const overShown = useOverAppShown();
  return (
    <Modal
      visible
      animationType="slide"
      onRequestClose={() => (overShown ? closeTopLayer() : onClose())}
      testID="photo-post-page"
    >
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <Page post={post} onClose={onClose} />
        <OverAppSlot />
      </SafeAreaProvider>
    </Modal>
  );
}

function Page({ post, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { apiUrl, account } = useFollowsDoor();
  const [edit, setEdit] = useState<PhotoPostEdit | null>(null);
  const [viewing, setViewing] = useState<number | null>(null);
  const reactions = useRef<PostReactionsHandle>(null);
  const tap = useDoubleTap(() => reactions.current?.superLike());
  const { drawing } = post;
  const { state } = account;
  const signedIn = state.status === "signedIn" ? state.session : null;
  const mine =
    signedIn !== null && signedIn.user.public_id === drawing.author.public_id;
  const title = edit === null ? drawing.title : edit.title;
  const description = edit === null ? drawing.description : edit.description;
  const photos =
    apiUrl !== null && signedIn !== null
      ? (drawing.photos ?? []).map((photo) => ({
          n: photo.n,
          source: drawingPhotoSource(apiUrl, signedIn.token, photo),
          ratio: photo.width / photo.height,
        }))
      : [];
  const shown = photoPages(post).flatMap((n) => {
    const photo = photos.find((one) => one.n === n);
    return photo === undefined ? [] : [photo];
  });
  const whole = photos.find((photo) => photo.n === viewing);
  return (
    <View style={[styles.page, { paddingTop: insets.top }]}>
      <View style={styles.top}>
        <Tap
          style={styles.back}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t("Back")}
          testID="post-back"
        >
          <Text style={styles.backMark} accessible={false}>
            ‹
          </Text>
        </Tap>
        {!mine && apiUrl !== null && signedIn !== null && (
          <ReportMenu
            apiUrl={apiUrl}
            token={signedIn.token}
            target={{ kind: "drawing", id: drawing.id }}
            person={drawing.author}
            onSessionEnded={account.sessionEnded}
          />
        )}
      </View>
      <ScrollView
        contentContainerStyle={{ paddingBottom: SHEET_ROOM + insets.bottom }}
        showsVerticalScrollIndicator={false}
        testID="post-scroll"
      >
        <View style={styles.who}>
          <Avatar name={drawing.author.username} size={AUTHOR_SIDE} />
          <View style={styles.names}>
            <Text style={styles.user}>{drawing.author.username}</Text>
            <Text style={styles.where} numberOfLines={1}>
              {dayLabel(drawing.started_at)}
            </Text>
          </View>
        </View>
        {shown.map((photo, i) => (
          <Tap
            key={photo.n}
            onPress={() => tap(() => setViewing(photo.n))}
            accessibilityRole="imagebutton"
            accessibilityLabel={t("Photo {n}", { n: String(i + 1) })}
            testID="post-photo"
          >
            <Image
              source={photo.source}
              style={[
                styles.photo,
                { width, height: width / Math.max(photo.ratio, 0.5) },
              ]}
              resizeMode="cover"
              accessible={false}
            />
          </Tap>
        ))}
        <View style={styles.words}>
          {title !== null && (
            <Text style={styles.title} accessibilityRole="header">
              {title}
            </Text>
          )}
          {description !== null && description !== "" && (
            <Text style={styles.description}>{description}</Text>
          )}
          <ImportedMark />
        </View>
      </ScrollView>
      <PostSheet
        post={post}
        mine={mine}
        insetBottom={insets.bottom}
        settings={
          mine ? (
            <PhotoPostSettings post={post} onSaved={setEdit} onDeleted={onClose} />
          ) : undefined
        }
        reactionsHandle={reactions}
      />
      {whole !== undefined && (
        <PhotoViewer
          source={whole.source}
          drawingId={drawing.id}
          n={whole.n}
          onClose={() => setViewing(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: color.background,
  },
  top: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: space.sm,
  },
  back: {
    width: MIN_TAP_SIZE,
    height: MIN_TAP_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  backMark: {
    ...font.title,
    color: color.text,
  },
  who: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingBottom: space.md,
  },
  names: {
    flex: 1,
    gap: 2,
  },
  user: {
    ...font.body,
    color: color.text,
    fontWeight: fontWeight.medium,
  },
  where: {
    ...font.detail,
    color: color.textMuted,
  },
  photo: {
    marginBottom: space.xs,
    backgroundColor: color.surfaceRaised,
  },
  words: {
    gap: space.xs,
    paddingHorizontal: space.lg,
    paddingTop: space.lg,
  },
  title: {
    ...font.heading,
    color: color.text,
  },
  description: {
    ...font.body,
    color: color.textMuted,
  },
});
