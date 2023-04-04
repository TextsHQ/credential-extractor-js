import { getChromiumProfilesFor } from "../src/get-chromium-profiles.mjs";
const browser = import("../src/browsers/chromium-based.cjs")

const normalizeChromeVersion = (version) => {
  const [major,] = version.split(".");
  return `${major}.0.0.0`;
}

const generateUserAgent = (os, chromeVersion) =>
  `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${normalizeChromeVersion(chromeVersion)} Safari/537.36`;

const createDeepLink = (platform, result) => {
  const jsonString = JSON.stringify(result);
  const base64String = Buffer.from(jsonString).toString("base64");
  return `texts://login/${platform}/${base64String}`;
};

async function main() {
  const { getCookiesPromised } = await browser;
  const chromeProfiles = await getChromiumProfilesFor();
  console.log("found profiles", chromeProfiles);
  const pickedProfile = chromeProfiles[0];
  const cookies = await getCookiesPromised("https://chat.openai.com/", "jar");
  console.log("found cookies", cookies);
  const data = {
    cookies,
    jsCodeResult: JSON.stringify({
      ua: generateUserAgent(process.platform, pickedProfile.chromeVersion), // @TODO: get this from the browser
      authMethod: "credentials-extractor",
    }),
    lastURL: "", // @TODO check if this is needed
  }
  console.log("generated data for deeplink", data);
  const deepLink = createDeepLink("chatgpt", data);
  console.log("deepLink", deepLink);
}

main().then(() => console.log("done"));
