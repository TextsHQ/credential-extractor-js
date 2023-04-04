import { execSync } from 'child_process';

const CHROMIUM_DEFAULT_PASSWORD = new Uint8Array([112, 101, 97, 110, 117, 116, 115]);

/**
 * get password from osx keychain
 * @param {string} osxKeyService
 * @param {string} osxKeyUser
 * @returns string
 */
function getOsxKeychainPassword(osxKeyService, osxKeyUser) {
  const cmd = ['/usr/bin/security', '-q', 'find-generic-password', '-w', '-a', osxKeyUser, '-s', osxKeyService].join(' ');

  try {
    const result = execSync(cmd, { encoding: 'utf-8' });
    return result.trim();
  } catch (error) {
    return CHROMIUM_DEFAULT_PASSWORD;
  }
}
