const fs = require('fs');

const data = JSON.parse(fs.readFileSync('skw-birdex2/src/data/birds.json', 'utf8'));

// 將原本的 aviandex 資料夾，改成專屬於 BIRD-DEX 2 的 birdcards 資料夾
const R2_DOMAIN = "https://pub-a9333a974e814ccba1994639b6e79266.r2.dev";
const FOLDER = "birdcards";

const updatedData = data.map(bird => {
  const paddedId = String(bird.id).padStart(4, '0');
  return {
    ...bird,
    photoUrl: `${R2_DOMAIN}/${FOLDER}/${paddedId}.avif`
  };
});

fs.writeFileSync('skw-birdex2/src/data/birds.json', JSON.stringify(updatedData, null, 2));
console.log('Successfully updated 569 birds to use birdcards R2 folder!');
