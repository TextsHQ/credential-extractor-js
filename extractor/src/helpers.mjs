import fs from "fs";
import os from "os";
import path from "path";
import crypto from "crypto";

/**
 * Creates a local copy of the SQLite cookie database and returns the new filename.
 * This is necessary in case this database is still being written to while the user browses
 * to avoid SQLite locking errors.
 * @param {string} cookieFile - The path to the SQLite cookie database.
 * @returns {string} - The path to the temporary copy of the SQLite cookie database.
 * @throws {Error} - If the cookie file doesn't exist.
 */
export function createLocalCopy(cookieFile) {
  // Check if cookie file exists
  if (fs.existsSync(cookieFile)) {
    // Copy to random name in tmp folder
    const tmpCookieFile = path.join(
      os.tmpdir(),
      `${crypto.randomBytes(8).toString("hex")}.sqlite`
    );
    fs.copyFileSync(cookieFile, tmpCookieFile);
    return tmpCookieFile;
  } else {
    throw new Error(`Cannot find cookie file at: ${cookieFile} `);
  }
}
