import {
  askPushPermission,
  devicePushToken,
  onNotificationTapped,
  pushPermission,
} from "./pushDevice";

jest.mock("expo-notifications");

type Phone = typeof import("../../__mocks__/expo-notifications");
const phone = jest.requireMock<Phone>("expo-notifications");
const PROJECT = "47bc672d-5824-4e77-84c4-b44132c6e87f";

beforeEach(() => phone.resetPhone());

test("reading the permission never asks", async () => {
  expect(await pushPermission()).toBe("undetermined");
  expect(phone.requestPermissionsAsync).not.toHaveBeenCalled();
});

test("asking shows the question once; the answer stays", async () => {
  phone.phone.answer = "denied";
  expect(await askPushPermission()).toBe("denied");
  expect(phone.requestPermissionsAsync).toHaveBeenCalledTimes(1);
  // The phone no longer asks: iOS shows its question once.
  phone.phone.canAskAgain = false;
  expect(await askPushPermission()).toBe("denied");
  expect(phone.requestPermissionsAsync).toHaveBeenCalledTimes(1);
});

test("already allowed, nothing is asked", async () => {
  phone.phone.permission = "granted";
  expect(await askPushPermission()).toBe("granted");
  expect(phone.requestPermissionsAsync).not.toHaveBeenCalled();
});

test("the token is the EAS project's; none without one or from Expo Go", async () => {
  expect(await devicePushToken(PROJECT)).toBe("ExponentPushToken[this-phone]");
  expect(phone.getExpoPushTokenAsync).toHaveBeenCalledWith({ projectId: PROJECT });
  expect(await devicePushToken(null)).toBeNull();
  phone.phone.token = null;
  expect(await devicePushToken(PROJECT)).toBeNull();
});

test("each notification touched is told once", async () => {
  const told = jest.fn();
  const opening = phone.response({ drawing_id: "a" });
  phone.phone.last = opening;
  const stop = onNotificationTapped(told);
  expect(told).toHaveBeenCalledWith({ drawing_id: "a" });
  // The same one handed again by the listener: not again.
  phone.addNotificationResponseReceivedListener.mock.calls[0][0](opening);
  expect(told).toHaveBeenCalledTimes(1);
  phone.tap({ drawing_id: "b" });
  expect(told).toHaveBeenLastCalledWith({ drawing_id: "b" });
  stop();
  phone.tap({ drawing_id: "c" });
  expect(told).toHaveBeenCalledTimes(2);
});
