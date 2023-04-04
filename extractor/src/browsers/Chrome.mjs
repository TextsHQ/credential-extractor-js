import ChromiumBased from "./ChromiumBased.mjs";

class Chrome extends ChromiumBased {
    constructor(cookieFile = null, domainName = "", keyFile = null, ...args) {
      super(this, cookieFile);


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


export default Chrome
