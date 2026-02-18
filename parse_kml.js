const fs = require('fs');

const kml = fs.readFileSync('C:/Users/hyder/Desktop/compassion-course-website/compassion_map.kml', 'utf-8');

// Extract placemarks with name and coordinates
const placemarkRegex = /<Placemark>\s*<name>([^<]*)<\/name>[\s\S]*?<coordinates>\s*([\d\-.,\s]+)\s*<\/coordinates>[\s\S]*?<\/Placemark>/g;

const coords = [];
const seen = new Set();
let match;

while ((match = placemarkRegex.exec(kml)) !== null) {
  const name = match[1].trim();
  const coordStr = match[2].trim();
  const parts = coordStr.split(',');
  if (parts.length >= 2) {
    const lon = parseFloat(parts[0]);
    const lat = parseFloat(parts[1]);
    if (!isNaN(lat) && !isNaN(lon)) {
      const key = `${lat.toFixed(6)},${lon.toFixed(6)}`;
      if (!seen.has(key)) {
        seen.add(key);
        coords.push({ lat, lon, name });
      }
    }
  }
}

console.log(`Total unique coordinates: ${coords.length}`);

// Write to file
const lines = coords.map(c => `[${c.lat}, ${c.lon}], // ${c.name}`);
fs.writeFileSync('C:/Users/hyder/Desktop/compassion-course-website/all_coordinates.txt', lines.join('\n'), 'utf-8');
console.log('Written to all_coordinates.txt');
