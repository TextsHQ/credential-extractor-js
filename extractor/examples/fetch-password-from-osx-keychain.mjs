import { getOsxKeychainPassword } from "../src/helpers.mjs";

const browsers = [
  { osxKeyService: 'Chrome Safe Storage', osxKeyUser: 'Chrome' },
  { osxKeyService: 'Arc Safe Storage', osxKeyUser: 'Arc' },
]

async function main() {
  for (let i = 0; i < browsers.length; i++) {
    const { osxKeyService, osxKeyUser } = browsers[i]
    const password = getOsxKeychainPassword(osxKeyService, osxKeyUser)
    console.log(`fetched password for "${osxKeyUser}" from "${osxKeyService}" service`, password)
  }
}

main().then(() => console.log('done'))
