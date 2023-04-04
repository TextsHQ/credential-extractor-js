const base64 = require('base64-js');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const lz4 = require('lz4');

const AES = require('crypto-js/aes');
const CryptoJS = require('crypto-js');
const betterSqlite3 = require('better-sqlite3');
const tough = require('tough-cookie');

const CHROMIUM_DEFAULT_PASSWORD = 'peanuts';

class BrowserCookieError extends Error {
  constructor(message) {
    super(message);
    this.name = 'BrowserCookieError';
  }
}

function createLocalCopy(cookie_file) {
  if (fs.existsSync(cookie_file)) {
    const tmp_cookie_file = fs.mkdtempSync(path.join(os.tmpdir(), 'chromium-cookie.sqlite.'));
    fs.copyFileSync(cookie_file, tmp_cookie_file);
    return tmp_cookie_file;
  } else {
    throw new BrowserCookieError('Can not find cookie file at: ' + cookie_file);
  }
}

class ChromiumBased {
  constructor(browser, cookie_file = null, domain_name = "", key_file = null) {
    this.salt = Buffer.from('saltysalt');
    this.iv = Buffer.alloc(16, ' ');
    this.length = 16;
    this.browser = browser;
    this.cookie_file = cookie_file;
    this.domain_name = domain_name;
    this.key_file = key_file;

    if (os.platform() === 'darwin') {
      const password = this.getOSXKeychainPassword();
      const iterations = 1003;
      this.v10_key = CryptoJS.PBKDF2(password, this.salt.toString('base64'), { keySize: this.length / 4, iterations }).toString(CryptoJS.enc.RawBinary);
      this.cookie_file = this.cookie_file || this.expandPaths(osx_cookies, 'osx');

    } else if (os.platform() === 'linux' || os.platform().indexOf('bsd') !== -1) {
      this.cookie_file = this.cookie_file || this.expandPaths(linux_cookies, 'linux');

    } else if (os.platform() === 'win32') {
      if (this.key_file) {
        const keyFileJson = JSON.parse(fs.readFileSync(this.key_file, 'utf-8'));
        const key64 = keyFileJson['os_crypt']['encrypted_key'];
        const keydpapi = base64.toByteArray(key64).slice(5);
        this.v10_key = _cryptUnprotectData(Buffer.from(keydpapi)).toString('utf-8');
      }
      this.cookie_file = this.cookie_file || this.expandPaths(windows_cookies, 'windows');

    } else {
      throw new BrowserCookieError("OS not recognized. Works on OSX, Windows, and Linux.");
    }

    if (!this.cookie_file) {
      throw new BrowserCookieError('Failed to find ' + this.browser + ' cookie');
    }

    this.tmp_cookie_file = createLocalCopy(this.cookie_file);
  }

  getOSXKeychainPassword() {
      const cmd = ['/usr/bin/security', '-q', 'find-generic-password', '-w', '-a', 'chrome', '-s', 'Chrome'];
      const proc = spawnSync(cmd[0], cmd.slice(1));
      if (proc.status !== 0) {
        return CHROMIUM_DEFAULT_PASSWORD;
      }
      return proc.stdout.toString().trim();
  }

  expandPaths(paths, os_name) {
    return path.join(os.homedir(), paths);
  }

  load() {
    const regex_domain_name = this.domain_name.length > 0 ? new RegExp(this.domain_name.replace('.', '\\.')) : null;

    const con = betterSqlite3(this.tmp_cookie_file);
    con.defaultSafeIntegers();
    con.pragma('key = "' + this.v10_key.toString('hex') + '"');
    const prepare = con.prepare('SELECT host_key, name, value, encrypted_value, path, expires_utc, is_secure, is_httponly, same_site FROM cookies' +
      (regex_domain_name ? ' WHERE host_key GLOB ? ESCAPE ""' : ''));
    const rows = regex_domain_name ? prepare.all(regex_domain_name.source) : prepare.all();

    const jar = new tough.CookieJar();
    for (let row of rows) {
      const decrypted_value = lz4.decode(row['encrypted_value']);
      const cookie = new tough.Cookie({
        domain: row['host_key'],
        path: row['path'],
        secure: row['is_secure'],
        httpOnly: row['is_httponly'],
        sameSite: row['same_site'] === 1 ? 'Strict' : row['same_site'] === 2 ? 'Lax' : 'None',
        expires: new Date(row['expires_utc'] / 1000 - 11644473600),
        key: row['name'],
        value: decrypted_value.toString()
      });
      jar.setCookieSync(cookie, 'http://' + row['host_key'] + row['path']);
    }
    return jar;
  }
}nullconst fs = require('fs');
const path = require('path');
const url = require('url');
const toughCookie = require('tough-cookie');
const BetterSqlite3 = require('better-sqlite3');
const glob = require('glob');
const os = require('os');

class Chrome {
    constructor(cookie_file = null, domain_name = "", key_file = null) {
        this.browser = "chrome";
        this.cookie_file = cookie_file || this.find_cookie_file();
        this.domain_name = domain_name;
        this.key_file = key_file;
        this._os_crypt = new OSCrypt();
    }

    load() {
        let db = new BetterSqlite3(this.cookie_file);
        let sql = `SELECT host_key, path, is_secure, expires_utc, name, encrypted_value, is_httponly FROM cookies WHERE host_key LIKE "%${this.domain_name}%"`;
        let rows = db.prepare(sql).all();

        let cookie_jar = new toughCookie.CookieJar();

        for (const row of rows) {
            let cookie_name = row.name;
            let cookie_value = this._os_crypt.decrypt(row.encrypted_value);
            let is_http_only = row.is_httponly;
            let cookie_domain = row.host_key;
            let cookie_path = row.path;
            let is_secure = row.is_secure;
            let expires_utc = row.expires_utc / 1000000 - 11644473600; // Convert WebKit format to UNIX

            let cookie = new toughCookie.Cookie({
                key: cookie_name,
                value: cookie_value,
                domain: cookie_domain,
                path: cookie_path,
                httpOnly: is_http_only,
                secure: is_secure,
                expires: new Date(expires_utc * 1000),
            });

            cookie_jar.setCookieSync(cookie, "http://" + url.parse(cookie.domain).hostname, { ignoreError: true });
        }

        return cookie_jar;
    }

    find_cookie_file() {
        // ... implementation for finding the Chrome cookie file
    }
}

class Firefox {
    constructor(cookie_file = null, domain_name = "") {
        this.tmp_cookie_file = null;
        this.cookie_file = cookie_file || this.find_cookie_file();
        this.tmp_cookie_file = this.create_local_copy(this.cookie_file);
        this.session_file = path.join(path.dirname(this.cookie_file), 'sessionstore.js');
        this.session_file_lz4 = path.join(path.dirname(this.cookie_file), 'sessionstore-backups', 'recovery.jsonlz4');
        this.domain_name = domain_name;
    }

    load() {
        let db = new BetterSqlite3(this.tmp_cookie_file);
        let sql = `SELECT host, path, isSecure, expiry, name, value, isHttpOnly FROM moz_cookies WHERE host LIKE "%${this.domain_name}%"`;
        let rows = db.prepare(sql).all();

        let cookie_jar = new toughCookie.CookieJar();

        for (const row of rows) {
            let cookie_name = row.name;
            let cookie_value = row.value;
            let is_http_only = row.isHttpOnly;
            let cookie_domain = row.host;
            let cookie_path = row.path;
            let is_secure = row.isSecure;
            let expires_utc = row.expiry;

            let cookie = new toughCookie.Cookie({
                key: cookie_name,
                value: cookie_value,
                domain: cookie_domain,
                path: cookie_path,
                httpOnly: is_http_only,
                secure: is_secure,
                expires: new Date(expires_utc * 1000),
            });

            cookie_jar.setCookieSync(cookie, "http://" + url.parse(cookie.domain).hostname, { ignoreError: true });
        }

        return cookie_jar;
    }

    create_local_copy(cookie_file) {
        // ... implementation for creating a local copy of the Firefox cookie file
    }

    find_cookie_file() {
        // ... implementation for finding the Firefox cookie file
    }
}

function load(domain_name = "") {
    let combined_cookie_jar = new tough.CookieJar();

    // Load cookies from Chrome
    try {
        let chrome_cookie_jar = new Chrome(null, domain_name).load();
        combined_cookie_jar = combined_cookie_jar.store.merge(chrome_cookie_jar.store);
    } catch (error) { }

    // Load cookies from Firefox
    try {
        let firefox_cookie_jar = new Firefox(null, domain_name).load();
        combined_cookie_jar = combined_cookie_jar.store.merge(firefox_cookie_jar.store);
    } catch (error) { }

    return combined_cookie_jar;
}