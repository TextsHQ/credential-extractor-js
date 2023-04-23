import { generateNixPathsChromium, generateWinPathsChromium } from './utils'

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
    windowsKeys: [],
    // windowsKeys: generateWinPathsChromium(
    //   'Google\\Chrome{channel}\\User Data\\Local State',
    //   winChannels,
    // ),
  }
}
