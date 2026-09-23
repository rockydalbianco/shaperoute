/**
 * Stand-in for the WebView in tests: a plain View that keeps every prop, so
 * tests can fire its events, and a ref whose calls can be checked.
 */
import { forwardRef, useImperativeHandle } from "react";
import { View } from "react-native";
import type { WebViewProps } from "react-native-webview";

export const injectJavaScript = jest.fn<void, [string]>();
export const reload = jest.fn<void, []>();

export const WebView = forwardRef<unknown, WebViewProps>(function WebView(props, ref) {
  useImperativeHandle(ref, () => ({ injectJavaScript, reload }));
  return <View {...props} />;
});

export default WebView;
