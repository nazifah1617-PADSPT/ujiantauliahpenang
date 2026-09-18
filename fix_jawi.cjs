const fs = require('fs');

let text = fs.readFileSync('src/data/questions.ts', 'utf8');

const replacements = {
  // Correcting the Peh (پ) -> Nya (ڽ) mistakes
  "مپوچيكن": "مڽوچيكن",
  "مپيروه": "مڽوروه",
  "مپاماكن": "مڽاماكن",
  "ڤپاكيت": "ڤڽاكيت",
  
  // Other known typos from the previous OCR
  "تررڠسڠ": "ترڠسڠ",
  "اييو": "ايبو",
  "مينيا": "مينيموم",
  "ممجوي": "مموجي",
  "برقرڤان": "برقربان",
  "تراوتامڽ": "تراوتاماڽ",
  "كرهان ماتاهاري": "ݢرهانا ماتاهاري",
  "صلاة كرهان": "صلاة ݢرهانا",
  "مممڤو": "ممڤو",
  "كقوبور": "كقبور", // depending on OCR, ke kubur can be كقبور
  "مرديک": "مرديكا", // merdeka
  "ڤراق": "ڤيرق", // Perak
  "سچارا": "سچارا", // already ok?
  "ممڤربهاوؤي": "ممڤربهاروءي",
  "دبوليهن": "دبوليهكن",
  "سإيبو": "سايبو" // seibu is generally spelt سايبو
};

for (const [wrong, right] of Object.entries(replacements)) {
  const regex = new RegExp(wrong, 'g');
  text = text.replace(regex, right);
}

// Write the file back
fs.writeFileSync('src/data/questions.ts', text);
console.log("Jawi fixes applied!");
