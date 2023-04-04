import base64
import glob
import http.cookiejar
import json
import os
import sys
import tempfile
from typing import Union

try:
    # should use pysqlite2 to read the cookies.sqlite on Windows
    # otherwise will raise the "sqlite3.DatabaseError: file is encrypted or is not a database" exception
    from pysqlite2 import dbapi2 as sqlite3
except ImportError:
    import sqlite3

if sys.platform.startswith('linux') or 'bsd' in sys.platform.lower():
    try:
        import dbus
        USE_DBUS_LINUX = True
    except ImportError:
        import jeepney
        from jeepney.io.blocking import open_dbus_connection
        USE_DBUS_LINUX = False

# external dependencies
import lz4.block

from Cryptodome.Cipher import AES
from Cryptodome.Protocol.KDF import PBKDF2
from Cryptodome.Util.Padding import unpad

__doc__ = 'Load browser cookies into a cookiejar'

CHROMIUM_DEFAULT_PASSWORD = b'peanuts'

class BrowserCookieError(Exception):
    pass


def _create_local_copy(cookie_file):
    """Make a local copy of the sqlite cookie database and return the new filename.
    This is necessary in case this database is still being written to while the user browses
    to avoid sqlite locking errors.
    """
    # check if cookie file exists
    if os.path.exists(cookie_file):
        # copy to random name in tmp folder
        tmp_cookie_file = tempfile.NamedTemporaryFile(suffix='.sqlite').name
        with open(tmp_cookie_file, "wb") as f1, open(cookie_file, "rb") as f2:
            f1.write(f2.read())
        return tmp_cookie_file
    else:
        raise BrowserCookieError('Can not find cookie file at: ' + cookie_file)


def _windows_group_policy_path():
    # we know that we're running under windows at this point so it's safe to do these imports
    from winreg import (HKEY_LOCAL_MACHINE, REG_EXPAND_SZ, REG_SZ,
                        ConnectRegistry, OpenKeyEx, QueryValueEx)
    try:
        root = ConnectRegistry(None, HKEY_LOCAL_MACHINE)
        policy_key = OpenKeyEx(root, r"SOFTWARE\Policies\Google\Chrome")
        user_data_dir, type_ = QueryValueEx(policy_key, "UserDataDir")
        if type_ == REG_EXPAND_SZ:
            user_data_dir = os.path.expandvars(user_data_dir)
        elif type_ != REG_SZ:
            return None
    except OSError:
        return None
    return os.path.join(user_data_dir, "Default", "Cookies")


# Code adapted slightly from https://github.com/Arnie97/chrome-cookies
def _crypt_unprotect_data(
        cipher_text=b'', entropy=b'', reserved=None, prompt_struct=None, is_key=False
):
    # we know that we're running under windows at this point so it's safe to try these imports
    import ctypes
    import ctypes.wintypes

    class DataBlob(ctypes.Structure):
        _fields_ = [
            ('cbData', ctypes.wintypes.DWORD),
            ('pbData', ctypes.POINTER(ctypes.c_char))
        ]

    blob_in, blob_entropy, blob_out = map(
        lambda x: DataBlob(len(x), ctypes.create_string_buffer(x)),
        [cipher_text, entropy, b'']
    )
    desc = ctypes.c_wchar_p()

    CRYPTPROTECT_UI_FORBIDDEN = 0x01

    if not ctypes.windll.crypt32.CryptUnprotectData(
            ctypes.byref(blob_in), ctypes.byref(
                desc), ctypes.byref(blob_entropy),
            reserved, prompt_struct, CRYPTPROTECT_UI_FORBIDDEN, ctypes.byref(
                blob_out)
    ):
        raise RuntimeError('Failed to decrypt the cipher text with DPAPI')

    description = desc.value
    buffer_out = ctypes.create_string_buffer(int(blob_out.cbData))
    ctypes.memmove(buffer_out, blob_out.pbData, blob_out.cbData)
    map(ctypes.windll.kernel32.LocalFree, [desc, blob_out.pbData])
    if is_key:
        return description, buffer_out.raw
    else:
        return description, buffer_out.value



def _expand_win_path(path:Union[dict,str]):
    if not isinstance(path,dict):
        path = {'path': path}
    return os.path.join(os.getenv(path['env'], ''), path['path'])


def _expand_paths_impl(paths:list, os_name:str):
    """Expands user paths on Linux, OSX, and windows"""

    os_name = os_name.lower()
    assert os_name in ['windows', 'osx', 'linux']

    if not isinstance(paths, list):
        paths = [paths]

    if os_name == 'windows':
        paths = map(_expand_win_path, paths)
    else:
        paths = map(os.path.expanduser, paths)

    for path in paths:
        for i in sorted(glob.glob(path)):   # glob will return results in arbitrary order. sorted() is use to make output predictable.
            yield i                         # can use return here without using `_expand_paths()` below.
                                            # but using generator can be useful if we plan to parse all `Cookies` files later.


def _expand_paths(paths:list, os_name:str):
    return next(_expand_paths_impl(paths, os_name), None)


def _normalize_genarate_paths_chromium(paths:Union[str,list], channel:Union[str,list]=None):
    channel = channel or ['']
    if not isinstance(channel, list):
        channel = [channel]
    if not isinstance(paths, list):
        paths = [paths]
    return paths, channel


def _genarate_nix_paths_chromium(paths:Union[str,list], channel:Union[str,list]=None):
    """Generate paths for chromium based browsers on *nix systems."""

    paths, channel = _normalize_genarate_paths_chromium(paths, channel)
    genararated_paths = []
    for chan in channel:
        for path in paths:
            genararated_paths.append(path.format(channel = chan))
    return genararated_paths

def _text_factory(data):
    try:
        return data.decode('utf-8')
    except UnicodeDecodeError:
        return data


class _JeepneyConnection:
    def __init__(self, object_path, bus_name, interface):
        self.__dbus_address = jeepney.DBusAddress(object_path, bus_name, interface)

    def __enter__(self):
        self.__connection = open_dbus_connection()
        return self

    def __exit__(self, exc_type, exc_value, traceback):
        self.__connection.close()

    def close(self):
        self.__connection.close()

    def call_method(self, method_name, signature=None, *args):
        method = jeepney.new_method_call(self.__dbus_address, method_name, signature, args)
        response = self.__connection.send_and_get_reply(method)
        if response.header.message_type == jeepney.MessageType.error:
            raise RuntimeError(response.body[0])
        return response.body[0] if len(response.body) == 1 else response.body

class ChromiumBased:
    """Super class for all Chromium based browsers"""

    UNIX_TO_NT_EPOCH_OFFSET = 11644473600  # seconds from 1601-01-01T00:00:00Z to 1970-01-01T00:00:00Z

    def __init__(self, browser:str, cookie_file=None, domain_name="", key_file=None, **kwargs):
        self.salt = b'saltysalt'
        self.iv = b' ' * 16
        self.length = 16
        self.browser = browser
        self.cookie_file = cookie_file
        self.domain_name = domain_name
        self.key_file = key_file
        self.__add_key_and_cookie_file(**kwargs)

    def __add_key_and_cookie_file(self,
            linux_cookies=None, windows_cookies=None, osx_cookies=None,
            windows_keys=None, os_crypt_name=None, osx_key_service=None, osx_key_user=None):

        if sys.platform == 'darwin':
            password = _get_osx_keychain_password(osx_key_service, osx_key_user)
            iterations = 1003  # number of pbkdf2 iterations on mac
            self.v10_key = PBKDF2(password, self.salt, self.length, iterations)
            cookie_file = self.cookie_file or _expand_paths(osx_cookies,'osx')

        elif sys.platform.startswith('linux') or 'bsd' in sys.platform.lower():
            password = _LinuxPasswordManager(USE_DBUS_LINUX).get_password(os_crypt_name)
            iterations = 1
            self.v10_key = PBKDF2(CHROMIUM_DEFAULT_PASSWORD, self.salt, self.length, iterations)
            self.v11_key = PBKDF2(password, self.salt, self.length, iterations)

            cookie_file = self.cookie_file or _expand_paths(linux_cookies, 'linux')

        elif sys.platform == "win32":
            key_file = self.key_file or _expand_paths(windows_keys,'windows')

            if key_file:
                with open(key_file,'rb') as f:
                    key_file_json = json.load(f)
                    key64 = key_file_json['os_crypt']['encrypted_key'].encode('utf-8')

                    # Decode Key, get rid of DPAPI prefix, unprotect data
                    keydpapi = base64.standard_b64decode(key64)[5:]
                    _, self.v10_key = _crypt_unprotect_data(keydpapi, is_key=True)

            # get cookie file from APPDATA

            cookie_file = self.cookie_file

            if not cookie_file:
                if self.browser.lower() == 'chrome' and _windows_group_policy_path():
                    cookie_file = _windows_group_policy_path()
                else:
                    cookie_file = _expand_paths(windows_cookies,'windows')

        else:
            raise BrowserCookieError(
                "OS not recognized. Works on OSX, Windows, and Linux.")

        if not cookie_file:
            raise BrowserCookieError('Failed to find {} cookie'.format(self.browser))

        self.tmp_cookie_file = _create_local_copy(cookie_file)

    def __del__(self):
        # remove temporary backup of sqlite cookie database
        if hasattr(self, 'tmp_cookie_file'):  # if there was an error till here
            os.remove(self.tmp_cookie_file)

    def __str__(self):
        return self.browser

    def load(self):
        """Load sqlite cookies into a cookiejar"""
        con = sqlite3.connect(self.tmp_cookie_file)
        con.text_factory = _text_factory
        cur = con.cursor()
        try:
            # chrome <=55
            cur.execute('SELECT host_key, path, secure, expires_utc, name, value, encrypted_value, is_httponly '
                        'FROM cookies WHERE host_key like ?;', ('%{}%'.format(self.domain_name),))
        except sqlite3.OperationalError:
            # chrome >=56
            cur.execute('SELECT host_key, path, is_secure, expires_utc, name, value, encrypted_value, is_httponly '
                        'FROM cookies WHERE host_key like ?;', ('%{}%'.format(self.domain_name),))

        cj = http.cookiejar.CookieJar()

        for item in cur.fetchall():
            # Per https://github.com/chromium/chromium/blob/main/base/time/time.h#L5-L7,
            # Chromium-based browsers store cookies' expiration timestamps as MICROSECONDS elapsed
            # since the Windows NT epoch (1601-01-01 0:00:00 GMT), or 0 for session cookies.
            #
            # http.cookiejar stores cookies' expiration timestamps as SECONDS since the Unix epoch
            # (1970-01-01 0:00:00 GMT, or None for session cookies.
            host, path, secure, expires_nt_time_epoch, name, value, enc_value, http_only = item
            if (expires_nt_time_epoch == 0):
                expires = None
            else:
                expires = (expires_nt_time_epoch / 1000000) - self.UNIX_TO_NT_EPOCH_OFFSET

            value = self._decrypt(value, enc_value)
            c = create_cookie(host, path, secure, expires, name, value, http_only)
            cj.set_cookie(c)
        con.close()
        return cj

    def _decrypt(self, value, encrypted_value):
        """Decrypt encoded cookies"""

        if value or (encrypted_value[:3] not in [b'v11', b'v10']):
            return value

        # Encrypted cookies should be prefixed with 'v10' on mac,
        # 'v10' or 'v11' on Linux. Choose key based on this prefix.
        # Reference in chromium code: `OSCryptImpl::DecryptString` in
        # components/os_crypt/os_crypt_linux.cc
        if not hasattr(self, 'v11_key'):
            assert encrypted_value[:3] != b'v11', "v11 keys should only appear on Linux."
        key = self.v11_key if encrypted_value[:3] == b'v11' else self.v10_key
        encrypted_value = encrypted_value[3:]
        cipher = AES.new(key, AES.MODE_CBC, self.iv)

        # will rise Value Error: invalid padding byte if the key is wrong,
        # probably we did not got the key and used peanuts
        try:
            decrypted = unpad(cipher.decrypt(encrypted_value), AES.block_size)
        except ValueError:
            raise BrowserCookieError('Unable to get key for cookie decryption')
        return decrypted.decode('utf-8')


class Chrome(ChromiumBased):
    """Class for Google Chrome"""
    def __init__(self, cookie_file=None, domain_name="", key_file=None):
        args = {
            'linux_cookies': _genarate_nix_paths_chromium(
                [
                    '~/.config/google-chrome{channel}/Default/Cookies',
                    '~/.config/google-chrome{channel}/Profile */Cookies'
                ],
                channel=['', '-beta', '-unstable']
            ),
            'windows_cookies': _genarate_win_paths_chromium(
                [
                    'Google\\Chrome{channel}\\User Data\\Default\\Cookies',
                    'Google\\Chrome{channel}\\User Data\\Default\\Network\\Cookies',
                    'Google\\Chrome{channel}\\User Data\\Profile *\\Cookies',
                    'Google\\Chrome{channel}\\User Data\\Profile *\\Network\\Cookies'
                ],
                channel=['', ' Beta', ' Dev']
            ),
            'osx_cookies': _genarate_nix_paths_chromium(
                [
                    '~/Library/Application Support/Google/Chrome{channel}/Default/Cookies',
                    '~/Library/Application Support/Google/Chrome{channel}/Profile */Cookies'
                ],
                channel=['', ' Beta', ' Dev']
            ),
            'windows_keys': _genarate_win_paths_chromium(
                'Google\\Chrome{channel}\\User Data\\Local State',
                channel=['', ' Beta', ' Dev']
            ),
            'os_crypt_name': 'chrome',
            'osx_key_service' : 'Chrome Safe Storage',
            'osx_key_user' : 'Chrome'
        }
        super().__init__(browser='Chrome', cookie_file=cookie_file, domain_name=domain_name, key_file=key_file, **args)


class Chromium(ChromiumBased):
    """Class for Chromium"""
    def __init__(self, cookie_file=None, domain_name="", key_file=None):
        args = {
            'linux_cookies':[
                '~/.config/chromium/Default/Cookies',
                '~/.config/chromium/Profile */Cookies'
            ],
            'windows_cookies': _genarate_win_paths_chromium(
                [
                    'Chromium\\User Data\\Default\\Cookies',
                    'Chromium\\User Data\\Default\\Network\\Cookies',
                    'Chromium\\User Data\\Profile *\\Cookies',
                    'Chromium\\User Data\\Profile *\\Network\\Cookies'
                ]
            ),
            'osx_cookies': [
                '~/Library/Application Support/Chromium/Default/Cookies',
                '~/Library/Application Support/Chromium/Profile */Cookies'
            ],
            'windows_keys': _genarate_win_paths_chromium(
                'Chromium\\User Data\\Local State'
            ),
            'os_crypt_name': 'chromium',
            'osx_key_service' : 'Chromium Safe Storage',
            'osx_key_user' : 'Chromium'
        }
        super().__init__(browser='Chromium', cookie_file=cookie_file, domain_name=domain_name, key_file=key_file, **args)


def create_cookie(host, path, secure, expires, name, value, http_only):
    """Shortcut function to create a cookie"""
    # HTTPOnly flag goes in _rest, if present (see https://github.com/python/cpython/pull/17471/files#r511187060)
    return http.cookiejar.Cookie(0, name, value, None, False, host, host.startswith('.'), host.startswith('.'), path,
                                 True, secure, expires, False, None, None,
                                 {'HTTPOnly': ''} if http_only else {})


def chrome(cookie_file=None, domain_name="", key_file=None):
    """Returns a cookiejar of the cookies used by Chrome. Optionally pass in a
    domain name to only load cookies from the specified domain
    """
    return Chrome(cookie_file, domain_name, key_file).load()


def chromium(cookie_file=None, domain_name="", key_file=None):
    """Returns a cookiejar of the cookies used by Chromium. Optionally pass in a
    domain name to only load cookies from the specified domain
    """
    return Chromium(cookie_file, domain_name, key_file).load()


def load(domain_name=""):
    """Try to load cookies from all supported browsers and return combined cookiejar
    Optionally pass in a domain name to only load cookies from the specified domain
    """
    cj = http.cookiejar.CookieJar()
    for cookie_fn in [chrome, chromium]:
        try:
            for cookie in cookie_fn(domain_name=domain_name):
                cj.set_cookie(cookie)
        except BrowserCookieError:
            pass
    return cj


if __name__ == '__main__':
    print(load())
