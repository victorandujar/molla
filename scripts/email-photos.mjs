// Email clients read JPEG everywhere (Outlook ignores WebP and AVIF): the
// funnel emails use these 1200 px crops of the site photos, served from
// public/email/. Run once if the photos change: node scripts/email-photos.mjs
import sharp from 'sharp';
const jobs = [
  ['public/images/combo-compartir-1600.webp', 'public/email/hornada.jpg'],
  ['public/images/slice-1600.webp', 'public/email/miga.jpg'],
];
for (const [from, to] of jobs) {
  await sharp(from)
    .resize(1200, 750, { fit: 'cover', position: 'attention' })
    .jpeg({ quality: 76, mozjpeg: true, progressive: true })
    .toFile(to);
  console.log(to);
}
