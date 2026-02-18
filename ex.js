var f=require('fs')
var l=f.readFileSync('C:/Users/hyder/Desktop/compassion-course-website/compassion_map.kml','utf-8').split('\n')
var r=[]
var n=''
var p=false
for(var i=0;i<l.length;i++){
  var t=l[i].trim()
  if(t.indexOf('<Placemark>')>-1){p=true;n=''}
  if(p&&t.indexOf('<name>')>-1){var m=t.match(/<name>([^<]*)<\/name>/);if(m)n=m[1]}
  if(p&&t.indexOf('<')===-1){var c=t.match(/(-?[\d.]+),(-?[\d.]+),[\d.]+/);if(c){r.push(c[2]+'\t'+c[1]+'\t'+n)}}
  if(t.indexOf('</Placemark>')>-1)p=false
}
f.writeFileSync('C:/Users/hyder/Desktop/compassion-course-website/out.tsv',r.join('\n'))
console.log(r.length)
