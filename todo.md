yarn run run --src ./source_pure --dest ./dist-4 --from python --to javascript --openaiApiKey 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
1. Implement utility functions:
   - _create_local_copy
   - _windows_group_policy_path
   - _crypt_unprotect_data
   - _expand_win_path
   - _expand_paths_impl
   - _expand_paths
   - _normalize_genarate_paths_chromium
   - _genarate_nix_paths_chromium
   - _text_factory
   - _JeepneyConnection
   - _LinuxPasswordManager
   - _get_osx_keychain_password
   - _genarate_win_paths_chromium

2. Implement ChromiumBased class with methods:
   - __init__
   - __add_key_and_cookie_file
   - __del__
   - __str__
   - load
   - _decrypt

3. Implement Chrome and Chromium classes inheriting from ChromiumBased class.

4. Implement create_cookie function.

5. Implement chrome and chromium functions to load cookies from Chrome and Chromium browsers respectively.

6. Implement load function to load cookies from all supported browsers and return a combined cookie jar.

7. Port the main function to test the code.

yarn run run -- --src ./source --dest ./dist-2 --from python --to javascript --openaiApiKey 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


command /usr/bin/security -q find-generic-password -w -a 'chrome' -s Chrome Safe Storage

//
def _get_osx_keychain_password(osx_key_service, osx_key_user):
    """Retrieve password used to encrypt cookies from OSX Keychain"""

    cmd = ['/usr/bin/security', '-q', 'find-generic-password', '-w', '-a', osx_key_user, '-s', osx_key_service]
