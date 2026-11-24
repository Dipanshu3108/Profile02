import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const content = JSON.parse(await readFile(new URL('../src/data/content.json', import.meta.url), 'utf8'));
const escapeXml = (value) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function wrap(text, max) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    if (`${line} ${word}`.trim().length > max && line) {
      lines.push(line);
      line = word;
    } else {
      line = `${line} ${word}`.trim();
    }
  }
  if (line) lines.push(line);
  return lines;
}

const headline = wrap(content.profile.headline, 42).slice(0, 3);
const svg = `
<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <rect width="1200" height="630" fill="#1B2742"/>
  <path d="M1020 86C1120 72 1192 150 1174 254C1157 355 1080 416 978 398C884 382 836 303 854 207C870 132 932 98 1020 86Z" fill="#E9DFC9" stroke="#7FA58B" stroke-width="8"/>
  <polygon points="1030,180 1100,220 1100,300 1030,340 960,300 960,220" fill="#CBE2D0"/>
  <circle cx="1070" cy="388" r="20" fill="#A9A69E"/>
  <path d="M90 498H1110" stroke="#A9A69E" stroke-opacity="0.35"/>
  <text x="88" y="210" fill="#E9DFC9" font-family="Bricolage Grotesque, Arial, sans-serif" font-size="82" font-weight="600" letter-spacing="-4">${escapeXml(content.profile.name)}</text>
  ${headline.map((line, index) => `<text x="92" y="${282 + index * 48}" fill="#DEDCD5" font-family="Newsreader, Georgia, serif" font-size="34">${escapeXml(line)}</text>`).join('')}
  <text x="92" y="548" fill="#CBE2D0" font-family="Bricolage Grotesque, Arial, sans-serif" font-size="28" font-weight="600">AI Engineer · Evalueserve</text>
</svg>`;

await sharp(Buffer.from(svg)).png().toFile(fileURLToPath(new URL('../public/og.png', import.meta.url)));
console.log('Generated public/og.png');
