import xml.etree.ElementTree as ET

tree = ET.parse('C:/Users/hyder/Desktop/compassion-course-website/compassion_map.kml')
root = tree.getroot()

ns = {'kml': 'http://www.opengis.net/kml/2.2'}

placemarks = root.findall('.//kml:Placemark', ns)
print(f'Total placemarks: {len(placemarks)}')

coords = []
for pm in placemarks:
    name_el = pm.find('kml:name', ns)
    name = name_el.text.strip() if name_el is not None and name_el.text else 'Unknown'

    coord_el = pm.find('.//kml:coordinates', ns)
    if coord_el is not None and coord_el.text:
        parts = coord_el.text.strip().split(',')
        if len(parts) >= 2:
            try:
                lon = float(parts[0])
                lat = float(parts[1])
                coords.append((lat, lon, name))
            except ValueError:
                pass

print(f'Total coordinates extracted: {len(coords)}')

# Write all coordinates to output file
with open('C:/Users/hyder/Desktop/compassion-course-website/all_coordinates.txt', 'w', encoding='utf-8') as f:
    for lat, lon, name in coords:
        f.write(f'[{lat}, {lon}], // {name}\n')

print('Written to all_coordinates.txt')
