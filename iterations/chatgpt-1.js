import { BetterSqlite3 } from 'better-sqlite3';
import { CookieJar, Cookie } from 'tough-cookie';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';

/**
 * ChromiumBased class represents a Chromium based browser.
 */
class ChromiumBased {
  /**
   * Creates a new ChromiumBased instance.
   * @param {string} browser - The browser's name.
   * @param {string} [cookieFile] - The path to the cookie file.
   * @param {string} [domainName] - The domain name to filter cookies.
   * @param {string} [keyFile] - The path to the key file.
   * @param {Object} [options] - Additional options for the ChromiumBased instance.
   */
  constructor(browser, cookieFile = null, domainName = '', keyFile = null, options = {}) {
    this.salt = Buffer.from('saltysalt');
    this.iv = Buffer.alloc(16, ' ');
    this.length = 16;
    this.browser = browser;
    this.cookieFile = cookieFile;
    this.domainName = domainName;
    this.keyFile = keyFile;
    this._addKeyAndCookieFile(options);
    this.UNIX_TO_NT_EPOCH_OFFSET = 11644473600; // seconds from 1601-01-01T00:00:00Z to 1970-01-01T00:00:00Z
  }

  _addKeyAndCookieFile({
    linuxCookies = null,
    windowsCookies = null,
    osxCookies = null,
    windowsKeys = null,
    osCryptName = null,
    osxKeyService = null,
    osxKeyUser = null
  }) {
    if (os.platform() === 'darwin') {
      const password = _getOsxKeychainPassword(osxKeyService, osxKeyUser);
      const iterations = 1003; // number of pbkdf2 iterations on mac
      this.v10_key = crypto.pbkdf2Sync(password, this.salt, iterations, this.length, 'sha1');
      this.cookieFile = this.cookieFile || _expandPaths(osxCookies, 'osx');
    } else {
      throw new Error('OS not recognized. Works on OSX, Windows, and Linux.');
    }

    if (!this.cookieFile) {
      throw new Error(`Failed to find ${this.browser} cookie`);
    }

    this.tmpCookieFile = _createLocalCopy(this.cookieFile);
  }

  /**
   * Removes the temporary backup of the SQLite cookie database.
   */
  _removeTmpCookieFile() {
    if (this.tmpCookieFile) {
      fs.unlinkSync(this.tmpCookieFile);
    }
  }

  /**
   * Returns the browser's name.
   * @returns {string} - The browser's name.
   */
  toString() {
    return this.browser;
  }

  /**
   * Loads SQLite cookies into a cookie jar.
   * @returns {CookieJar} - The cookie jar containing the loaded cookies.
   */
  load() {
    const db = new BetterSqlite3(this.tmpCookieFile);
    const stmt = db.prepare(
      'SELECT host_key, path, is_secure, expires_utc, name, value, encrypted_value, is_httponly ' +
        'FROM cookies WHERE host_key LIKE ?'
    );
    const rows = stmt.all(`%${this.domainName}%`);

    const cookieJar = new CookieJar();

    for (const row of rows) {
      const [
        host,
        path,
        secure,
        expires_nt_time_epoch,
        name,
        value,
        enc_value,
        http_only
      ] = row;

      const expires =
        expires_nt_time_epoch === 0
          ? null
          : expires_nt_time_epoch / 1000000 - this.UNIX_TO_NT_EPOCH_OFFSET;

      const decryptedValue = this._decrypt(value, enc_value);
      const cookie = new Cookie({
        domain: host,
        path,
        secure,
        expires,
        key: name,
        value: decryptedValue,
        httpOnly: http_only
      });

      cookieJar.setCookieSync(cookie, `http${secure ? 's' : ''}://${host}${path}`);
    }

    db.close();
    this._removeTmpCookieFile();
    return cookieJar;
  }

  /**
   * Decrypts encoded cookies.
   * @param {string} value - The cookie value.
   * @param {Buffer} encryptedValue - The encrypted cookie value.
   * @returns {string} - The decrypted cookie value.
   */
  _decrypt(value, encryptedValue) {
    if (value || ![Buffer.from('v11'), Buffer.from('v10')].includes(encryptedValue.slice(0, 3))) {
      return value;
    }

    const key = encryptedValue.slice(0, 3).equals(Buffer.from('v11')) ? this.v11_key : this.v10_key;
    encryptedValue = encryptedValue.slice(3);
    const decipher = crypto.createDecipheriv('aes-128-cbc', key, this.iv);

    try {
      const decrypted = Buffer.concat([
        decipher.update(encryptedValue),
        decipher.final()
      ]);
      return decrypted.toString('utf-8');
    } catch (error) {
      throw new Error('Unable to get key for cookie decryption');
    }
  }
}

// Helper functions go here

export default ChromiumBased
