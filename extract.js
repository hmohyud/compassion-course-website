const fs = require('fs');
const kml = fs.readFileSync('C:/Users/hyder/Desktop/compassion-course-website/compassion_map.kml', 'utf-8');
const lines = kml.split('\n');
const results = [];
let currentName = '';
let inPlacemark = false;
let inCoords = false;
const seen = new Set();

for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();
  if (line.includes('<Placemark>')) { inPlacemark = true; currentName = ''; }
  if (inPlacemark && line.includes('<name>')) {
    const m = line.match(/<name>([^<]*)<\/name>/);
    if (m) currentName = m[1];
  }
  if (line.includes('<coordinates>')) inCoords = true;
  if (inCoords) {
    const m = line.match(/(-?[\d.]+),(-?[\d.]+),[\d.]+/);
    if (m) {
      const lon = parseFloat(m[1]);
      const lat = parseFloat(m[2]);
      const key = lat.toFixed(5) + ',' + lon.toFixed(5);
      if (!seen.has(key)) {
        seen.add(key);
        results.push([lat, lon, currentName]);
      }
      inCoords = false;
    }
  }
  if (line.includes('</coordinates>')) inCoords = false;
  if (line.includes('</Placemark>')) { inPlacemark = false; }
}

console.log('Total unique:', results.length);
const out = results.map(r => '[' + r[0] + ', ' + r[1] + '], // ' + r[2]);
fs.writeFileSync('C:/Users/hyder/Desktop/compassion-course-website/all_coords.txt', out.join('\n'));
console.log('Done');
