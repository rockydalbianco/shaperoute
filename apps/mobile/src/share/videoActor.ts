import { t } from "../i18n";
import { MY_IMAGE, myImageForPage } from "./myImage";
import {
  base64OfBytes,
  type Character,
  characterModel,
  characterName,
} from "./videoCharacter";
import { prepareCharacterCall, prepareImageCall } from "./videoPage";

/**
 * What runs the line of the video (TASK-408, TASK-417): one of the animals,
 * or the runner's own image (ADR-0345 point 1).
 */
export type Actor = Character | typeof MY_IMAGE;

/** The actor's name, for «Share your run»'s line of the video's choices. */
export function actorName(actor: Actor | null): string {
  if (actor === null) {
    return t("No animal");
  }
  return actor === MY_IMAGE ? t("My image") : characterName(actor);
}

/**
 * What the app asks the video's page first, to make `actor` ready: the
 * animal's model, or the runner's image read from the app's folder. Null
 * when it cannot be read: the video then goes out without it, never with
 * an error (ADR-0339 note B, ADR-0345 point 4).
 */
export async function prepareActorCall(actor: Actor): Promise<string | null> {
  try {
    if (actor === MY_IMAGE) {
      const image = await myImageForPage();
      return image === null ? null : prepareImageCall(image);
    }
    return prepareCharacterCall(base64OfBytes(await characterModel(actor)));
  } catch {
    return null;
  }
}
