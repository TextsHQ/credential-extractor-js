import os
import sys
import base64
import hashlib
import tempfile
import json
import { promisify } from 'util';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { readFile } from 'fs';

const readFileAsync = promisify(readFile);

class BrowserCookieError extends Error {}

function createLocalCopy(cookieFile) {
  if (fs.existsSync(cookieFile)) {
    const data = fs.readFileSync(cookieFile);
    const tmpCookieFile = tempfile.mkstempSync('.sqlite');
    fs.writeFileSync(tmpCookieFile, data);
    return tmpCookieFile;
  } else {
    throw new BrowserCookieError('Can not find cookie file at: ' + cookieFile);
  }
}

function textFactory(data) {
  try {
    return data.toString('utf-8');
  } catch (err) {
    return data;
  }
}

class ChromiumBased {
  constructor(browser, cookieFile = null, domainName = "", keyFile = null, options = {}) {
    this.salt = 'saltysalt';
    this.iv = ' '.repeat(16);
    this.length = 16;
    this.browser = browser;
    this.cookieFile = cookieFile;
    this.domainName = domainName;
    this.keyFile = keyFile;

    if (sys.platform === 'darwin') {
      this.__addKeyAndCookieFileMacOS(options.osxCookies, options.osxKeys, options.osCryptName, options.osxKeyService, options.osxKeyUser);
    } else if (sys.platform.startsWith('linux') || 'bsd' in sys.platform) {
      this.__addKeyAndCookieFileLinux(options.linuxCookies, options.linuxKeys, options.osCryptName);
    } else if (sys.platform === 'win32') {
      this.__addKeyAndCookieFileWindows(options.windowsCookies, options.windowsKeys);
    } else {
      throw new BrowserCookieError("OS not recognized. Works on macOS, Windows, and Linux.");
    }
  }

  __addKeyAndCookieFileMacOS(osxCookies, osxKeys, osCryptName, osxKeyService, osxKeyUser) {
    const password = getOSXKeychainPassword(osxKeyService, osxKeyUser);
    const iterations = 1003;
    this.v10Key = crypto.pbkdf2Sync(password, this.salt, iterations, this.length, 'sha1');

    if (!this.cookieFile) {
      this.cookieFile = expandPaths(osxCookies, 'osx');
    }
  }

  __addKeyAndCookieFileLinux(linuxCookies, linuxKeys, osCryptName) {
    const password = getLinuxPassword(osCryptName);
    const iterations = 1;
    this.v10Key = crypto.pbkdf2Sync(CHROMIUM_DEFAULT_PASSWORD, this.salt, iterations, this.length, 'sha1');
    this.v11Key = crypto.pbkdf2Sync(password, this.salt, iterations, this.length, 'sha1');

    if (!this.cookieFile) {
      this.cookieFile = expandPaths(linuxCookies, 'linux');
    }
  }

  __addKeyAndCookieFileWindows(windowsCookies, windowsKeys) {
    const keyFile = this.keyFile || expandPaths(windowsKeys, 'windows');

    if (keyFile) {
      const rawData = fs.readFileSync(keyFile);
      const keyFileJson = JSON.parse(rawData);
      const key64 = keyFileJson['os_crypt']['encrypted_key'].toString('utf-8');

      const keyDPAPI = Buffer.from(key64, 'base64').slice(5);
      this.v10Key = unprotectData(keyDPAPI);
    }

    if (!this.cookieFile) {
      this.cookieFile = expandPaths(windowsCookies, 'windows');
    }
  }
}

async function getOSXKeychainPassword(osxKeyService, osxKeyUser) {
  // TODO: Implement function to interact with macOS keychain and retrieve password.
  throw new BrowserCookieError('getOSXKeychainPassword is not implemented.');
}

function getLinuxPassword(osCryptName) {
  // TODO: Implement function to interact with Linux keyring services and retrieve password.
  throw new BrowserCookieError('getLinuxPassword is not implemented.');
}

function unprotectData(data) {
  // TODO: Implement function to unprotect data using Windows DPAPI.
  throw new BrowserCookieError('unprotectData is not implemented.');
}

function expandPaths(paths, platform) {
  // TODO: Implement function to expand user paths on Linux, macOS, and Windows.
  throw new BrowserCookieError('expandPaths is not implemented.');
}load() {
    const tmp_cookie_file = this.tmp_cookie_file;
    const domain_name = this.domain_name;
    const UNIX_TO_NT_EPOCH_OFFSET = this.UNIX_TO_NT_EPOCH_OFFSET;
    const iv = this.iv;
    const _decrypt = this._decrypt.bind(this);

    function create_cookie(host, path, secure, expires, name, value, http_only) {
        const expires_datetime = expires ? new Date(expires) : expires;
        return new Cookie(name, value, { domain: host, path: path, secure: secure, expires: expires_datetime, httpOnly: http_only });
    }

    return new Promise(async (resolve, reject) => {
        let con = await sqlite3.open(tmp_cookie_file);
        con.run = util.promisify(con.run.bind(con));
        con.all = util.promisify(con.all.bind(con));

        let cur;
        try {
            cur = await con.all('SELECT host_key, path, secure, expires_utc, name, value, encrypted_value, is_httponly FROM cookies WHERE host_key like ?;', ('%' + domain_name + '%',));
        } catch (e) {
            if (e instanceof sqlite3.OperationalError) {
                cur = await con.all('SELECT host_key, path, is_secure, expires_utc, name, value, encrypted_value, is_httponly FROM cookies WHERE host_key like ?;', ('%' + domain_name + '%',));
            } else {
                reject(e);
            }
        }

        let cj = new CookieJar();

        for (let item of cur) {
            let [host, path, secure, expires_nt_time_epoch, name, value, enc_value, http_only] = item;
            let expires;
            if (expires_nt_time_epoch === 0) {
                expires = null;
            } else {
                expires = (expires_nt_time_epoch / 1000000) - UNIX_TO_NT_EPOCH_OFFSET;
            }

            value = _decrypt(value, enc_value);
            let c = create_cookie(host, path, secure, expires, name, value, http_only);
            cj.set(c);
        }
        await con.close();
        resolve(cj);
    });
}

_decrypt(value, encrypted_value) {
    if (sys.platform === 'win32') {
        if (value.length) {
            return value;
        }
        if (encrypted_value === "") {
            return "";
        }

        const [_, data] = _crypt_unprotect_data(encrypted_value);

        if (data instanceof Buffer) {
            return data.toString();
        }

        encrypted_value = encrypted_value.slice(3);
        const [nonce, tag] = [encrypted_value.slice(0, 12), encrypted_value.slice(-16)];
        const aes = new AESGCM(this.v10_key, { iv: nonce, tag: Buffer.from(tag) });

        try {
            const decryptedData = aes.decrypt(Buffer.from(encrypted_value.slice(12, -16)));
            return decryptedData.toString();
        } catch (err) {
            if (err.code === 'ERR_INVALID_ARG_VALUE' && !this.v10_key) {
                throw new Error('Failed to decrypt the cipher text with DPAPI and no AES key');
            }

            throw new BrowserCookieError('Unable to get key for cookie decryption');
        }
    }
}const fs = require('fs');
const path = require('path');
const os = require('os');
const http = require('http');

const sqlite3 = require('sqlite3');
const lz4 = require('lz4');
const Keytar = require('keytar');
const crypto = require('crypto-js');
const { promisify } = require('util');
const glob = promisify(require('glob'));
const readFile = promisify(fs.readFile);

class BrowserCookieError extends Error {
    constructor(message) {
        super(message);
        this.name = "BrowserCookieError";
    }
}

class Chrome {
    constructor(cookieFile = null, domainName = "", keyFile = null, ...args) {
        this.config = {
            'windows': [
                '%LocalAppData%\\Google\\Chrome\\User Data\\Default\\Login Data',
                '%LocalAppData%\\Google\\Chrome\\User Data\\Default\\Local State',
            ],
            'darwin': [
                '~/Library/Application Support/Google/Chrome/Default/Login Data',
                '~/Library/Application Support/Google/Chrome/Default/Local State'
            ],
            'linux': [
                '~/.config/google-chrome/Default/Login Data',
                '~/.config/google-chrome/Default/Local State'
            ]
        };
        this.browserStr;
    }

    get windowsOrLinuxDefaultPaths() {
        if (this.browser == 'chrome') {
            return this.config[darwin];
        } else {
            return this.config[windows];
        }
    }

    get macDefaultPaths() {
        if (this.browser == 'chrome') {
            return this.config[windows];
        } else {
            return this.config[darwin];
        }
    }
}

class Opera extends Chrome {
    constructor(cookieFile = null, domainName = "", keyFile = null, ...args) {
        this.config = {
            'windows': [
                '%LocalAppData%\\Google\\Chrome\\User Data\\Local State',
                '%LocalAppData%\\Google\\Chrome\\User Data\\Default\\Cookies',
            ],
            'darwin': [
                '~/Library/Application Support/Google/Chrome/Default/Local State',
                '~/Library/Application Support/Google/Chrome/Default/Cookies'
            ],
            'linux': [
                '~/.config/google-chrome/Default/Local State',
                '~/.config/google-chrome/Default/Cookies'
            ]
        };
        super(cookieFile, domainName, keyFile, ...args);
    }
}

class Chromium extends Chrome {
    constructor(cookieFile = null, domainName = "", keyFile = null, ...args) {
        this.config = {
            'windows': [
                '%LocalAppData%\\Chromium\\User Data\\Default\\Login Data',
                '%LocalAppData%\\Chromium\\User Data\\Default\\Local State'
            ],
            'darwin': [
                '~/Library/Application Support/Chromium/Default/Login Data',
                '~/Library/Application Support/Chromium/Default/Local State'
            ],
        };
        super(cookieFile, domainName, keyFile, ...args);
    }
}

class OperaGX extends Chrome {
    constructor(cookieFile = null, domainName = "", keyFile = null, ...args) {
        this.config = {
            'windows': [
                '%LocalAppData%\\Opera Software\\Opera GX Stable\\Login Data',
                '%LocalAppData%\\Opera Software\\Opera GX Stable\\Local State'
            ],
        };
        super(cookieFile, domainName, keyFile, ...args);
    }
}

class Brave extends Chrome {
    constructor(cookieFile = null, domainName = "", keyFile = null, ...args) {
