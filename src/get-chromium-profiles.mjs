import fs from "fs/promises";
import { accessSync } from "fs";
import os from "os";
import path from "path";

/**
 * Check if the given file exists.
 * @param {string} file - The file path to check.
 * @returns {boolean} True if the file exists, false otherwise.
 */
const fsExistsSync = function (file) {
  try {
    accessSync(file);
    return true;
  } catch (ignore) {
    return false;
  }
};

/**
 * Enum for browser variations.
 * @readonly
 * @enum {number}
 */
const variations = {
  CHROME: 0,
  CHROME_CANARY: 1,
  CHROMIUM: 2,
};

/**
 * Object containing the default locations for Chrome, Chrome Canary, and Chromium profiles on different platforms.
 * Source: https://chromium.googlesource.com/chromium/src/+/HEAD/docs/user_data_dir.md
 * @type {Object.<string, string[]>}
 */
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

/**
 * Get Chromium profiles for the given browser variant.
 * @param {number} [variant=variations.CHROME] - The browser variant. Defaults to Chrome.
 * @returns {Promise<Object[]>} A promise that resolves to an array of profile objects.
 */
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
