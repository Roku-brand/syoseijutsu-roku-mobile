import test from 'node:test';
import assert from 'node:assert/strict';
import {cmsErrorMessage} from '../../src/data/cms-errors.ts';
test('CMS reports API objects as well as Error instances without losing actionable messages',()=>{
 assert.equal(cmsErrorMessage({code:'40001',message:'下書きが変更されています。再読み込みしてください。'}),'下書きが変更されています。再読み込みしてください。');
 assert.equal(cmsErrorMessage(new Error('写真を選択してください。')),'写真を選択してください。');
 assert.match(cmsErrorMessage({code:'23505',message:'duplicate key'}),/別のURL名/);
 assert.match(cmsErrorMessage(null),/編集内容は保持/);
});
