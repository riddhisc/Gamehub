import { PALETTE } from "./pictures";

const INK = "#0f1b21";
const BLANK = "#ffffff";

// Builds a standalone SVG of the picture as it is now (filled parts coloured, empty parts
// white with their number) and saves it as a PNG.
export function pictureToSvg(picture, done) {
  const hex = (n) => PALETTE.find((c) => c.n === n).hex;
  const regions = picture.regions
    .map(
      (r) =>
        `<path d="${r.d}" fill="${done[r.id] ? hex(r.n) : BLANK}" stroke="${INK}" stroke-width="1.1" stroke-linejoin="round"/>`
    )
    .join("");
  const deco = picture.deco
    .map((d) =>
      d.solid
        ? `<path d="${d.d}" fill="${INK}" stroke="${INK}" stroke-width="1.6" stroke-linecap="round"/>`
        : `<path d="${d.d}" fill="none" stroke="${INK}" stroke-width="1.6" stroke-linecap="round"/>`
    )
    .join("");
  const numbers = picture.regions
    .filter((r) => !done[r.id])
    .flatMap((r) =>
      r.labels.map(
        ([x, y]) =>
          `<text x="${x}" y="${y}" font-size="${r.fs}" font-weight="600" font-family="Inter, Arial, sans-serif" text-anchor="middle" dominant-baseline="central" fill="${INK}">${r.n}</text>`
      )
    )
    .join("");
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="1640" height="1640" viewBox="-10 -10 420 420">` +
    `<rect x="-10" y="-10" width="420" height="420" fill="#ffffff"/>` +
    regions +
    deco +
    numbers +
    `</svg>`
  );
}

export function downloadPicture(picture, done, finished) {
  const svg = pictureToSvg(picture, done);
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
  const img = new Image();
  return new Promise((resolve, reject) => {
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 1640;
      canvas.height = 1640;
      canvas.getContext("2d").drawImage(img, 0, 0, 1640, 1640);
      URL.revokeObjectURL(url);
      canvas.toBlob((blob) => {
        if (!blob) return reject(new Error("Couldn't create the image"));
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `${picture.id}-colouring${finished ? "" : "-in-progress"}.png`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 2000);
        resolve();
      }, "image/png");
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Couldn't create the image"));
    };
    img.src = url;
  });
}
