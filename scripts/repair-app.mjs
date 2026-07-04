import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const root = path.resolve(".");

function gitShow(ref, file) {
  return execSync(`git show ${ref}:${file}`, { encoding: "utf8", cwd: root }).replace(/\r\n/g, "\n");
}

function sliceBetween(src, startMarker, endMarker) {
  const start = src.indexOf(startMarker);
  if (start === -1) throw new Error(`Start not found: ${startMarker}`);
  const end = endMarker ? src.indexOf(endMarker, start + startMarker.length) : src.length;
  if (endMarker && end === -1) throw new Error(`End not found: ${endMarker}`);
  return src.slice(start, end);
}

const chaeyun = gitShow("origin/chaeyun", "src/app/App.tsx");
const refactor = gitShow("origin/refactor-avatar-photo-sticker-flows", "src/app/App.tsx");
let app = fs.readFileSync(path.join(root, "src/app/App.tsx"), "utf8").replace(/\r\n/g, "\n");

const layoutBlock = sliceBetween(
  chaeyun,
  "const DIARY = {",
  "/* ═══════════════════════════════════════════\n   COVER PAGE",
);

const photoProfileEmoticon = sliceBetween(
  refactor,
  "/* ═══════════════════════════════════════════\n   RIGHT PAGE — PHOTO ALBUM",
  "function GuestbookPage",
);

if (!app.includes("const DIARY = {")) {
  app = app.replace(
    "/* ═══════════════════════════════════════════\n   SHARED ATOMS",
    `${layoutBlock}\n/* ═══════════════════════════════════════════\n   SHARED ATOMS`,
  );
}

if (!app.includes("function PhotoPage(")) {
  app = app.replace(
    "/* ═══════════════════════════════════════════\n   RIGHT PAGE — GUESTBOOK",
    `${photoProfileEmoticon}\n/* ═══════════════════════════════════════════\n   RIGHT PAGE — GUESTBOOK`,
  );
}

fs.writeFileSync(path.join(root, "src/app/App.tsx"), app, "utf8");
console.log("Repaired App.tsx — added layout block and photo/profile/emoticon sections.");
