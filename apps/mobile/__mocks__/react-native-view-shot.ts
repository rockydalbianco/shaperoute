/**
 * react-native-view-shot under jest (TASK-231): no native view to draw. The
 * picture of a View is a file name; a test makes `captureRef` fail.
 */
export const captureRef = jest.fn(async () => "file:///cache/post.png");
