import fs from "fs";
import os from "os";
import path from "path";
import crypto from "crypto";
import { execSync } from 'child_process';

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

// password is peanuts
const CHROMIUM_DEFAULT_PASSWORD = new Uint8Array([112, 101, 97, 110, 117, 116, 115]);
const CHROMIUM_DEFAULT_PASSWORD_PLAIN_TEXT = String.fromCharCode.apply(null, CHROMIUM_DEFAULT_PASSWORD);

/**
 * Retrieve password used to encrypt cookies from OSX Keychain
 * @param {string} osxKeyService - The service name for the key in OSX Keychain
 * @param {string} osxKeyUser - The username for the key in OSX Keychain
 * @returns {string} - The password from the OSX Keychain or the default Chromium password
 */
export function getOsxKeychainPassword(osxKeyService, osxKeyUser) {
  const cmd = ['/usr/bin/security', '-q', 'find-generic-password', '-w', '-a', osxKeyUser, '-s', osxKeyService].join(' ');

  try {
    const result = execSync(cmd, { encoding: 'utf-8' });
    return result.trim();
  } catch (error) {
    return CHROMIUM_DEFAULT_PASSWORD_PLAIN_TEXT;
  }
}

