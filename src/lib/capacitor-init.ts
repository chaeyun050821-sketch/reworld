import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { Keyboard } from "@capacitor/keyboard";
import { SplashScreen } from "@capacitor/splash-screen";
import { StatusBar, Style } from "@capacitor/status-bar";

export async function initCapacitor(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  document.documentElement.classList.add("capacitor-native");

  try {
    await StatusBar.setStyle({ style: Style.Light });
    await StatusBar.setBackgroundColor({ color: "#C2CBED" });
  } catch {
    /* status bar unavailable */
  }

  try {
    await SplashScreen.hide();
  } catch {
    /* splash unavailable */
  }

  try {
    await Keyboard.setAccessoryBarVisible({ isVisible: true });
  } catch {
    /* keyboard plugin unavailable */
  }

  App.addListener("backButton", ({ canGoBack }) => {
    if (canGoBack) {
      window.history.back();
      return;
    }
    void App.exitApp();
  });
}

export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}
