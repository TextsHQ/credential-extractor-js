import fs from 'fs'
import os from 'os'
import path from 'path'
import crypto from 'crypto'

/**
 * Creates a local copy of the SQLite cookie database and returns the new filename.
 * This is necessary in case this database is still being written to while the user browses
 * to avoid SQLite locking errors.
 * @param cookieFile - The path to the SQLite cookie database.
 * @returns The path to the temporary copy of the SQLite cookie database.
 * @throws {Error} - If the cookie file doesn't exist.
 */
export function createLocalCopy(cookieFile: string) {
  // Check if cookie file exists
  if (fs.existsSync(cookieFile)) {
    // Copy to random name in tmp folder
    const tmpCookieFile = path.join(
      os.tmpdir(),
      `${crypto.randomBytes(8).toString('hex')}.sqlite`,
    )
    fs.copyFileSync(cookieFile, tmpCookieFile)
    return tmpCookieFile
  }
  throw new Error(`Cannot find cookie file at: ${cookieFile} `)
}

/**
 * Create a deep link to be used for login.
 * @param platform - The platform identifier.
 * @param result - The result object containing user data.
 * @returns The deep link string in the format `texts://login/{platform}/{base64String}`.
 */
export function createDeepLink(platform: string, result: object) {
  const jsonString = JSON.stringify(result)
  const base64String = Buffer.from(jsonString).toString('base64')
  return `texts://login/${platform}/${base64String}`
}
