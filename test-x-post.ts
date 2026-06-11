import * as fs from "fs";
import { getXPublishCapability, postTweet } from "./lib/x-official-api";

const envContent = fs.readFileSync(".env.local", "utf8");
envContent.split("\n").forEach((line) => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith("#")) {
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx > 0) {
      process.env[trimmed.substring(0, eqIdx)] = trimmed.substring(eqIdx + 1);
    }
  }
});

const cap = getXPublishCapability();
console.log("canPublish:", cap.canPublish);
console.log("missing:", cap.missingKeys);

if (cap.canPublish) {
  postTweet("Test from Affiliate Agent OS - please ignore").then((r) => {
    console.log("Result:", JSON.stringify(r, null, 2));
  });
}
