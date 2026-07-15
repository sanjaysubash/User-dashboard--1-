// tsc only emits compiled .js — static renderer assets (HTML) need a
// manual copy into dist/ alongside the compiled preload/login scripts.
const fs = require("fs");
const path = require("path");

const src = path.join(__dirname, "..", "src", "renderer", "login", "index.html");
const destDir = path.join(__dirname, "..", "dist", "renderer", "login");

fs.mkdirSync(destDir, { recursive: true });
fs.copyFileSync(src, path.join(destDir, "index.html"));

console.log("Copied renderer assets to dist/");
