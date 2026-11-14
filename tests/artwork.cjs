const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const babel = require('@babel/core');
const metadata = require('music-metadata');
const moduleFile = path.resolve(__dirname, '../web/artwork.js');
const { code } = babel.transformSync(fs.readFileSync(moduleFile,'utf8'), {filename:moduleFile,configFile:false,babelrc:false,plugins:['@babel/plugin-transform-modules-commonjs']});
const target = {exports:{}};
vm.runInNewContext(code,{module:target,exports:target.exports,require,Blob,btoa,setTimeout,clearTimeout,console});
const {pictureDataUrl,collectionArtwork,extractArtwork,ARTWORK_VERSION} = target.exports;
function silentWav() {
 const wav=Buffer.alloc(44+16000*2);
 wav.write('RIFF',0);wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(16000,24);wav.writeUInt32LE(32000,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(wav.length-44,40);
 return wav;
}
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aZ1sAAAAASUVORK5CYII=','base64');
test('reads real embedded cover bytes from a tagged music file', async()=>{
 const tagged=await metadata.updateBuffer(silentWav(),{picture:[{format:'image/png',type:'Cover (front)',data:png}]});
 const parsed=await metadata.parseBlob(new Blob([tagged],{type:'audio/wav'}));
 const cover=metadata.selectCover(parsed.common.picture);
 assert.ok(cover);
 assert.equal(pictureDataUrl(cover),'data:image/png;base64,'+png.toString('base64'));
});
test('playlist artwork follows playlist order and skips files without artwork',()=>{
 const tracks=[{id:'a'},{id:'b',artwork:'data:image/png;base64,b'},{id:'c',artwork:'data:image/png;base64,c'}];
 assert.equal(collectionArtwork(tracks,['a','c','b']).id,'c');
 assert.equal(collectionArtwork(tracks,['missing','b']).id,'b');
 assert.equal(collectionArtwork(tracks,[]),null);
});
test('files with no embedded cover keep an explicit, cached fallback',async()=>{
 const result=await extractArtwork({kind:'audio',blob:new Blob([silentWav()],{type:'audio/wav'})});
 assert.equal(result.artworkStatus,'none');
 assert.equal(result.artworkVersion,ARTWORK_VERSION);
 assert.equal(result.artwork,undefined);
});
test('manual artwork is retained and unsupported picture payloads are rejected',async()=>{
 const result=await extractArtwork({kind:'audio',artwork:'custom-cover'});
 assert.equal(result.artwork,'custom-cover');
 assert.equal(pictureDataUrl({format:'image/svg+xml',data:new Uint8Array([1,2,3])}),null);
});
