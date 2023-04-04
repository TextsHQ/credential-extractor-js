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

const CHROMIUM_DEFAULT_PASSWORD = 'peanuts'

/**
 * Retrieve password used to encrypt cookies from OSX Keychain
 * @param {string} osxKeyService - The service name for the key in OSX Keychain
 * @param {string} osxKeyUser - The username for the key in OSX Keychain
 * @returns {string} - The password from the OSX Keychain or the default Chromium password
 */
export function getOsxKeychainPassword(osxKeyService, osxKeyUser) {
  // @TODO: Original code uses `osxKeyService` but that fails with
  // security: SecKeychainSearchCopyNext: The specified item could not be found in the keychain.
  // while only providing user seems to work correctly (manually checked in keychain to make sure it's returning the
  // password for the correct service.
  const cmd = ['/usr/bin/security', '-q', 'find-generic-password', '-w', '-a', osxKeyUser].join(' ');

  console.log('running command:', cmd)
  try {
    const result = execSync(cmd, { encoding: 'utf-8' });
    return result.trim();
  } catch (error) {
    return CHROMIUM_DEFAULT_PASSWORD_PLAIN_TEXT;
  }
}

