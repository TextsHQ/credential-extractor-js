import { getOsxKeychainPassword } from "./extractor/src/helpers.mjs";

async function main() {
  console.log(getOsxKeychainPassword('Chrome Safe Storage', 'Chrome'))
  console.log(getOsxKeychainPassword('Arc Safe Storage', 'Arc'))
}

main().then(() => console.log('done'))
