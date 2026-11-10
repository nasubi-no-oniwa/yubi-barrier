// 点数ごとの人数（全期間・今日）を数えて yubi/hist に書く（GitHub の上で1時間ごとに動く）。遊ぶ人は全員分を読まずにこれだけ読む
import { token, api } from './fb.mjs';
const tk = await token();
const today = Math.floor((Date.now() + 32400000) / 86400000);
const hidden = JSON.parse(await api('GET', '/yubi/hidden.json', undefined, tk)) || {};
const count = o => { const c = {}; let tot = 0; for (const [id, v] of Object.entries(o || {})) { if (hidden[id] || !v || typeof v.s !== 'number') continue; const s = Math.floor(v.s); c[s] = (c[s] || 0) + 1; tot++; } return { c, tot }; };
const A = count(JSON.parse(await api('GET', '/yubi/all/scores.json', undefined, tk)));
const D = count(JSON.parse(await api('GET', `/yubi/d/scores.json?orderBy=%22dk%22&equalTo=${today}`, undefined, tk)));
await api('PUT', '/yubi/hist.json', JSON.stringify({ tot: A.tot, c: A.c, dk: today, dtot: D.tot, dc: D.c, t: Date.now() }), tk);
console.log('全期間', A.tot, '人 / 今日', D.tot, '人');
