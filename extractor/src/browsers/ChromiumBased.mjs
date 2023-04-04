import sqlite3 from "better-sqlite3";
import tough from "tough-cookie";
import fs from "fs";
import crypto from "crypto";

import { createLocalCopy, getOsxKeychainPassword } from "../helpers.mjs";

class ChromiumBased {
  constructor(browser, options = {}) {
    this.browser = browser;
    this.salt = 'saltysalt';
    this.iv = ' '.repeat(16);
    this.length = 16;
    this.options = options;

    this.load();
  }

  load() {
    const cookieFile = createLocalCopy(this.options.cookieFilePath);
    const db = sqlite3(cookieFile);

    db.function('_text_factory', (data) => {
      return data.toString('utf-8');
    });

    const rows = db.prepare(`
      SELECT host_key, path, is_secure, expires_utc, name, value, encrypted_value, is_httponly
      FROM cookies WHERE host_key like ?
    `).all(`%${this.options.domainName}%`);

    const cookieJar = new tough.CookieJar();

    rows.forEach(({
      host_key, path, is_secure, expires_utc, name, value, encrypted_value, is_httponly
    }) => {
      if (expires_utc === 0) {
        expires_utc = null;
      } else {
        expires_utc = Math.floor((expires_utc / 1000000) - 11644473600);
      }

      value = this._decrypt(value, encrypted_value);
      const cookie = createCookie(
        host_key, path, is_secure, expires_utc, name, value, is_httponly
      );
      cookieJar.setCookieSync(cookie, `http${is_secure ? 's' : ''}://${host_key}`);
    });

    db.close();
    fs.rmSync(cookieFile);

    return cookieJar;
  }

  _decrypt(value, encryptedValue) {
    if (value || encryptedValue.slice(0, 3).toString() !== 'v10') {
      return value;
    }

    const key = CHROMIUM_DEFAULT_PASSWORD;
    const encrypted = encryptedValue.slice(3);

    const decipher = crypto.createDecipheriv('aes-128-cbc', key, this.iv);
    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    const decipherWithoutPaddingError = crypto.createDecipheriv('aes-128-cbc', key, this.iv);
    let decryptedWithoutPaddingError = decipherWithoutPaddingError.update(encrypted);
    decryptedWithoutPaddingError = Buffer.concat([decryptedWithoutPaddingError, decipherWithoutPaddingError.final()]);

    if (!decrypted.equals(decryptedWithoutPaddingError)) {
      throw new BrowserCookieError('Unable to get key for cookie decryption');
    }

    return decrypted.toString('utf-8');
  }
}

export default ChromiumBased
