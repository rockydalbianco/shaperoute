/**
 * A live share in a message (TASK-468 part B1): its line while it goes on,
 * once finished, once gone; the list's line; what VoiceOver reads.
 */
import example from "@shaperoute/shared-types/fixtures/message-live.json";
import type {
  Message,
  MessageAttachment,
  MessageLiveCard,
} from "@shaperoute/shared-types";
import { render, screen } from "@testing-library/react-native";

import { distanceLabel } from "../units/format";
import { attachmentLabel, messageLine } from "./attachmentText";
import { LiveMessageCard, liveCardLine, liveCardOpens } from "./LiveMessageCard";

const [shown, gone] = example.messages as unknown as Message[];
const card = (shown.attachment as unknown as { live: MessageLiveCard }).live;

test("going on: LIVE, the sport, the distance; a tap opens it", () => {
  expect(liveCardLine(card)).toBe(`LIVE · Run · ${distanceLabel(3200)}`);
  expect(liveCardOpens(card)).toBe(true);
});

test("finished: its distance and time; ended or gone: «Live ended», no tap", () => {
  const finished = { ...card, status: "finished" as const, duration_s: 12490 };
  expect(liveCardLine(finished)).toBe(`Finished · ${distanceLabel(3200)} · 3:28:10`);
  expect(liveCardOpens(finished)).toBe(true);
  for (const over of [null, { ...card, status: "expired" as const }]) {
    expect(liveCardLine(over)).toBe("Live ended");
    expect(liveCardOpens(over)).toBe(false);
  }
});

test("the list says 🔴 Live, VoiceOver reads the card", () => {
  expect(messageLine(shown)).toBe("🔴 Live");
  expect(messageLine({ ...shown, text: "Go!" })).toBe("🔴 Go!");
  expect(attachmentLabel(shown.attachment as MessageAttachment)).toBe(
    liveCardLine(card),
  );
  expect(attachmentLabel(gone.attachment as MessageAttachment)).toBe("Live ended");
});

test("the card shows its line", async () => {
  await render(<LiveMessageCard card={card} />);
  expect(screen.getByText(liveCardLine(card))).toBeTruthy();
});
