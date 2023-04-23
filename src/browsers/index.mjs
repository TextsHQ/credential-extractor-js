gimport { generateNixPathsChromium, generateWinPathsChromium } from './utils'

export type BrowserConfig = {
  osCryptedName: string
  osxKeyService: string
  osxKeyUser: string
  linuxCookies: string[]
  windowsCookies: string[]
  osxCookies: string[]
  windowsKeys: string[]
}

/**
 * @param {string} os - Operating system
 * @returns {{osCryptedName: string, osxKeyService: string, osxKeyUser: string, linuxCookies: string[], windowsCookies: string[], osxCookies: string[], windowsKeys: string[]}}
 */
export function Chrome(): BrowserConfig {
  const channels = ['', '-beta', '-unstable']
  const winChannels = ['', ' Beta', ' Dev']

  return {
    osCryptedName: 'chrome',
    osxKeyService: 'Chrome Safe Storage',
    osxKeyUser: 'Chrome',
    linuxCookies: generateNixPathsChromium(
      [
        '~/.config/google-chrome{channel}/Default/Cookies',
        '~/.config/google-chrome{channel}/Profile */Cookies',
      ],
      channels,
    ),
    windowsCookies: generateWinPathsChromium(
      [
        'Google\\Chrome{channel}\\User Data\\Default\\Cookies',
        'Google\\Chrome{channel}\\User Data\\Default\\Network\\Cookies',
        'Google\\Chrome{channel}\\User Data\\Profile *\\Cookies',
        'Google\\Chrome{channel}\\User Data\\Profile *\\Network\\Cookies',
      ],
      winChannels,
    ),
    osxCookies: generateNixPathsChromium(
      [
        '~/Library/Application Support/Google/Chrome{channel}/Default/Cookies',
        '~/Library/Application Support/Google/Chrome{channel}/Profile */Cookies',
      ],
      winChannels,
    ),
    windowsKeys: generateWinPathsChromium(
      'Google\\Chrome{channel}\\User Data\\Local State',
      winChannels,
    ),
  }
}

/**
 * @param {string} os - Operating system
 * @returns {{osCryptedName: string, osxKeyService: string, osxKeyUser: string, linuxCookies: string[], windowsCookies: string[], osxCookies: string[], windowsKeys: string[]}}
 */
function Chromium(os) {
  return {
    osCryptedName: 'chromium',
    osxKeyService: 'Chromium Safe Storage',
    osxKeyUser: 'Chromium',
    linuxCookies: [
      '~/.config/chromium/Default/Cookies',
      '~/.config/chromium/Profile */Cookies',
    ],
    windowsCookies: generateWinPathsChromium([
      'Chromium\\User Data\\Default\\Cookies',
      'Chromium\\User Data\\Default\\Network\\Cookies',
      'Chromium\\User Data\\Profile *\\Cookies',
      'Chromium\\User Data\\Profile *\\Network\\Cookies',
    ]),
    osxCookies: [
      '~/Library/Application Support/Chromium/Default/Cookies',
      '~/Library/Application Support/Chromium/Profile */Cookies',
    ],
    windowsKeys: generateWinPathsChromium('Chromium\\User Data\\Local State'),
  }
}

/**
 * @param {string} os - Operating system
 * @returns {{osCryptedName: string, osxKeyService: string, osxKeyUser: string, linuxCookies: string[], windowsCookies: string[], osxCookies: string[], windowsKeys: string[]}}
 */
function Opera(os) {
  const channels = ['Stable', 'Next', 'Developer']

  return {
    osCryptedName: 'chromium',
    osxKeyService: 'Opera Safe Storage',
    osxKeyUser: 'Opera',
    linuxCookies: [
      '~/.config/opera/Cookies',
      '~/.config/opera-beta/Cookies',
      '~/.config/opera-developer/Cookies',
    ],
    windowsCookies: generateWinPathsChromium(
      [
        'Opera Software\\Opera {channel}\\Cookies',
        'Opera Software\\Opera {channel}\\Network\\Cookies',
      ],
      channels,
    ),
    osxCookies: [
      '~/Library/Application Support/com.operasoftware.Opera/Cookies',
      '~/Library/Application Support/com.operasoftware.OperaNext/Cookies',
      '~/Library/Application Support/com.operasoftware.OperaDeveloper/Cookies',
    ],
    windowsKeys: generateWinPathsChromium(
      'Opera Software\\Opera {channel}\\Local State',
      channels,
    ),
  }
}

/**
 * @param {string} os - Operating system
 * @returns {{osCryptedName: string, osxKeyService: string, osxKeyUser: string, linuxCookies: string[], windowsCookies: string[], osxCookies: string[], windowsKeys: string[]}}
 */
function OperaGX(os) {
  return {
    osCryptedName: 'chromium',
    osxKeyService: 'Opera Safe Storage',
    osxKeyUser: 'Opera',
    linuxCookies: [],
    windowsCookies: generateWinPathsChromium(
      [
        'Opera Software\\Opera GX {channel}\\Cookies',
        'Opera Software\\Opera GX {channel}\\Network\\Cookies',
      ],
      ['Stable'],
    ),
    osxCookies: [
      '~/Library/Application Support/com.operasoftware.OperaGX/Cookies',
    ],
    windowsKeys: generateWinPathsChromium(
      'Opera Software\\Opera GX {channel}\\Local State',
      ['Stable'],
    ),
  }
}

/**
 * @param {string} os - Operating system
 * @returns {{osCryptedName: string, osxKeyService: string, osxKeyUser: string, linuxCookies: string[], windowsCookies: string[], osxCookies: string[], windowsKeys: string[]}}
 */
function Brave(os) {
  const channels = ['', '-Beta', '-Dev', '-Nightly']

  return {
    osCryptedName: 'brave',
    osxKeyService: 'Brave Safe Storage',
    osxKeyUser: 'Brave',
    linuxCookies: generateNixPathsChromium(
      [
        '~/.config/BraveSoftware/Brave-Browser{channel}/Default/Cookies',
        '~/.config/BraveSoftware/Brave-Browser{channel}/Profile */Cookies',
      ],
      channels,
    ),
    windowsCookies: generateWinPathsChromium(
      [
        'BraveSoftware\\Brave-Browser{channel}\\User Data\\Default\\Cookies',
        'BraveSoftware\\Brave-Browser{channel}\\User Data\\Default\\Network\\Cookies',
        'BraveSoftware\\Brave-Browser{channel}\\User Data\\Profile *\\Cookies',
        'BraveSoftware\\Brave-Browser{channel}\\User Data\\Profile *\\Network\\Cookies',
      ],
      channels,
    ),
    osxCookies: generateNixPathsChromium(
      [
        '~/Library/Application Support/BraveSoftware/Brave-Browser{channel}/Default/Cookies',
        '~/Library/Application Support/BraveSoftware/Brave-Browser{channel}/Profile */Cookies',
      ],
      channels,
    ),
    windowsKeys: generateWinPathsChromium(
      'BraveSoftware\\Brave-Browser{channel}\\User Data\\Local State',
      channels,
    ),
  }
}

/**
 * @param {string} os - Operating system
 * @returns {{osCryptedName: string, osxKeyService: string, osxKeyUser: string, linuxCookies: string[], windowsCookies: string[], osxCookies: string[], windowsKeys: string[]}}
 */
function Edge(os) {
  const linuxChannels = ['', '-beta', '-dev', '-canary']
  const winChannels = ['Stable', 'Beta', 'Dev', 'Canary']

  return {
    osCryptedName: 'edge',
    osxKeyService: 'Microsoft Edge Safe Storage',
    osxKeyUser: 'Microsoft Edge',
    linuxCookies: generateNixPathsChromium(
      [
        '~/.config/microsoft-edge{channel}/Default/Cookies',
        '~/.config/microsoft-edge{channel}/Profile */Cookies',
      ],
      linuxChannels,
    ),
    windowsCookies: generateWinPathsChromium(
      [
        'Microsoft\\Edge {channel}\\User Data\\Default\\Cookies',
        'Microsoft\\Edge {channel}\\User Data\\Default\\Network\\Cookies',
        'Microsoft\\Edge {channel}\\User Data\\Profile *\\Cookies',
        'Microsoft\\Edge {channel}\\User Data\\Profile *\\Network\\Cookies',
      ],
      winChannels,
    ),
    osxCookies: [
      '~/Library/Application Support/Microsoft Edge/Default/Cookies',
      '~/Library/Application Support/Microsoft Edge/Profile */Cookies',
    ],
    windowsKeys: generateWinPathsChromium(
      'Microsoft\\Edge {channel}\\User Data\\Local State',
      winChannels,
    ),
  }
}
