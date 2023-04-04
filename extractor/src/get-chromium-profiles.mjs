import fs from "fs/promises";
import { accessSync } from "fs";
import os from "os";
import path from "path";

const fsExistsSync = function (file) {
  try {
    accessSync(file);
    return true;
  } catch (ignore) {
    return false;
  }
};

const variations = {
  CHROME: 0,
  CHROME_CANARY: 1,
  CHROMIUM: 2,
};

// Source: https://chromium.googlesource.com/chromium/src/+/HEAD/docs/user_data_dir.md
const locations = {
  darwin: [
    `${os.homedir()}/Library/Application Support/Google/Chrome`,
    `${os.homedir()}/Library/Application Support/Google/Chrome Canary`,
    `${os.homedir()}/Library/Application Support/Chromium`,
  ],
  win32: [
    `${process.env.LOCALAPPDATA}\\Google\\Chrome\\User Data`,
    `${process.env.LOCALAPPDATA}\\Google\\Chrome SxS\\User Data`,
    `${process.env.LOCALAPPDATA}\\Chromium\\User Data`,
  ],
  // TODO: consider the `~/.config` part can be overriden by $CHROME_VERSION_EXTRA or $XDG_CONFIG_HOME
  linux: [
    `${os.homedir()}/.config/google-chrome`,
    `${os.homedir()}/.config/google-chrome-beta`,
    `${os.homedir()}/.config/chromium`,
  ],
};

export async function getChromiumProfilesFor(variant = variations.CHROME) {
  const variantPath = locations[process.platform][variant];
  const files = await fs.readdir(variantPath);
  return Promise.all(
    files
      .filter(
        (f) =>
          f !== "System Profile" &&
          fsExistsSync(path.join(variantPath, f, "Preferences"))
      )
      .map(async (p) => {
        const prefFile = await fs.readFile(
          path.join(variantPath, p, "Preferences"),
          {
            encoding: "utf-8",
          }
        );
        const profileInfo = JSON.parse(prefFile);
        return {
          browser: variant,
          displayName: profileInfo.profile.name,
          profileDirName: p,
          profileDirPath: path.join(variantPath, p),
          profilePictureUrl: profileInfo.profile.gaia_info_picture_url || null,
          chromeVersion: profileInfo.extensions.last_chrome_version || null,
        };
      })
  );
}
