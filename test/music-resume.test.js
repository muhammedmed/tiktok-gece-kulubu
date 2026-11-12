import test from 'node:test';
import assert from 'node:assert/strict';
import {resumePosition} from '../public/music-resume.js';
test('reload resumes the same song at its saved position without advancing through downtime',()=>{
 const saved={version:10,position:398.5,savedAt:1000};
 assert.equal(resumePosition(saved,10,900,5000),398.5);
 assert.equal(resumePosition(saved,11,900,5000),0);
 assert.equal(resumePosition(saved,10,900,2000000),0);
 assert.equal(resumePosition({...saved,position:NaN},10,900,5000),0);
 assert.equal(resumePosition(saved,10,NaN,5000),0);
 assert.equal(resumePosition({...saved,position:901},10,900,5000),1);
});
