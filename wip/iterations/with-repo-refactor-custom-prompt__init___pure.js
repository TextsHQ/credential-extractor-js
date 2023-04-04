const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const sqlite3 = require('better-sqlite3');
const tough = require('tough-cookie');

const CHROMIUM_DEFAULT_PASSWORD = 'peanuts';

class BrowserCookieError extends Error {}

function createLocalCopy(cookieFilePath) {
  if (fs.existsSync(cookieFilePath)) {
    const tmpCookieFile = path.join(require('os').tmpdir(), `${Math.random().toString(36).substring(2)}.sqlite`);
    fs.copyFileSync(cookieFilePath, tmpCookieFile);
    return tmpCookieFile;
  } else {
    throw new BrowserCookieError(`Can not find cookie file at: ${cookieFilePath}`);
  }
}

function createCookie(host, path, secure, expires, name, value, httpOnly) {
  return new tough.Cookie({
    key: name,
    value: value,
    domain: host,
    path: path,
    secure: secure,
    httpOnly: httpOnly,
    expires: expires ? new Date(expires * 1000) : undefined
  });
}

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

class Chrome extends ChromiumBased {
  constructor(options = {}) {
    super('Chrome', options);
  }
}

module.exports = { Chrome };import http from 'http';
import tough from 'tough-cookie';
import { Chrome, Chromium } from './browsers';
import { BrowserCookieError } from './exceptions';

const Cookie = (name, value, host, path, secure, expires, httpOnly) =>
  new tough.Cookie({
    key: name,
    value: value,
    domain: host,
    path: path,
    secure: secure,
    expires: expires,
    httpOnly: httpOnly,
  });

const chrome = (cookieFile = null, domainName = '', keyFile = null) => {
  return new Chrome(cookieFile, domainName, keyFile).load();
};

const chromium = (cookieFile = null, domainName = '', keyFile = null) => {
  return new Chromium(cookieFile, domainName, keyFile).load();
};

const load = (domainName = '') => {
  const cj = new tough.CookieJar();
  const cookieFns = [chrome, chromium];
  cookieFns.forEach((cookieFn) => {
    try {
      const cookies = cookieFn({ domainName: domainName });
      cookies.forEach((cookie) => cj.setCookieSync(cookie, null));
    } catch (error) {
      if (error instanceof BrowserCookieError) {
        console.log(error.message);
      }
    }
  });
  return cj;
};

if (require.main === module) {
  console.log(load());
}

export { chrome, chromium, load };
