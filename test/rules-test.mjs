// ランキングのルールの試験（GitHub の上で Firebase の試し用データベースを立てて試す。本番のデータには触らない）
const NS='ft-green-default-rtdb',PROJ='ft-green',BASE='http://127.0.0.1:9000';
const b64=o=>Buffer.from(JSON.stringify(o)).toString('base64url');
const tok=uid=>b64({alg:'none',typ:'JWT'})+'.'+b64({uid,sub:uid,user_id:uid,iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+3600,aud:PROJ,iss:'https://securetoken.google.com/'+PROJ,provider_id:'anonymous',firebase:{sign_in_provider:'anonymous'}})+'.';
async function req(method,path,uid,body){const r=await fetch(BASE+'/'+path+'.json?ns='+NS+(uid?'&auth='+tok(uid):''),{method,headers:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});return {ok:r.ok,status:r.status,j:await r.json().catch(()=>null)};}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let fail=0;const ex=(name,res,want)=>{const ok=res.ok===want;console.log((ok?'OK  ':'NG  ')+name+' → '+res.status);if(!ok){fail++;console.log(JSON.stringify(res.j));}};
const TS={'.sv':'timestamp'};
const U='user1aaaaaaaaaaaaaaaaaaa',U2='user2bbbbbbbbbbbbbbbbbbb';
async function ticket(uid){const r=await req('PUT','yubi/runs/'+uid,uid,{t:TS});const g=await req('GET','yubi/runs/'+uid,uid);return {r,st:g.j&&g.j.t};}
const rec=(st,s)=>({s,st,v:1,t:TS});
const dk=()=>Math.floor((Date.now()+32400000)/86400000);

ex('ログインなしで始める',await req('PUT','yubi/runs/'+U,null,{t:TS}),false);
let tk=await ticket(U);ex('始めた時刻を書く',tk.r,true);
ex('ほかの人の場所に書く',await req('PUT','yubi/runs/'+U,U2,{t:TS}),false);
ex('すぐにもう一度書く',await req('PUT','yubi/runs/'+U,U,{t:TS}),false);
ex('始めてすぐに10回の記録を送る',await req('PUT','yubi/all/scores/'+U,U,rec(tk.st,10)),false);
await sleep(3200);
ex('始めた時刻がちがう記録',await req('PUT','yubi/all/scores/'+U,U,rec(tk.st-5000,3)),false);
ex('実際の時間より多い回数（20回）',await req('PUT','yubi/all/scores/'+U,U,rec(tk.st,20)),false);
ex('0回の記録',await req('PUT','yubi/all/scores/'+U,U,rec(tk.st,0)),false);
ex('名前など余計なものをつける',await req('PUT','yubi/all/scores/'+U,U,{...rec(tk.st,3),n:'x'}),false);
ex('ほかの人の場所に書く',await req('PUT','yubi/all/scores/'+U2,U,rec(tk.st,3)),false);
ex('ふつうの記録（3回）',await req('PUT','yubi/all/scores/'+U,U,rec(tk.st,3)),true);
ex('今日の記録に書く',await req('PUT','yubi/d/scores/'+U,U,{...rec(tk.st,3),dk:dk()}),true);
ex('今日の記録に、ちがう日で書く',await req('PUT','yubi/d/scores/'+U2,U2,{...rec(tk.st,3),dk:dk()-1}),false);
ex('同じ回でもう一度送る（回数を増やす）',await req('PUT','yubi/all/scores/'+U,U,rec(tk.st,4)),false);
await sleep(2100);
tk=await ticket(U);await sleep(3300);
ex('前より少ない回数は載らない',await req('PUT','yubi/all/scores/'+U,U,rec(tk.st,2)),false);
ex('今日のほうも前より少ない回数は載らない',await req('PUT','yubi/d/scores/'+U,U,{...rec(tk.st,2),dk:dk()}),false);
ex('前より多い回数は載る（4回）',await req('PUT','yubi/all/scores/'+U,U,rec(tk.st,4)),true);
ex('損切りした',await req('PUT','yubi/cut/'+U,U,{t:TS}),true);
ex('すぐにもう一度損切りした',await req('PUT','yubi/cut/'+U,U,{t:TS}),false);
ex('ほかの人を損切りさせる',await req('PUT','yubi/cut/'+U2,U,{t:TS}),false);
ex('利確した',await req('PUT','yubi/take/'+U,U,{t:TS}),true);
ex('すぐにもう一度利確した',await req('PUT','yubi/take/'+U,U,{t:TS}),false);
ex('ほかの人を利確させる',await req('PUT','yubi/take/'+U2,U,{t:TS}),false);
ex('利確した人の数を読める',await req('GET','yubi/take',null),true);
ex('利確に余計なものをつける',await req('PUT','yubi/take/'+U2,U2,{t:TS,x:1}),false);
ex('だれでも全期間の記録を読める',await req('GET','yubi/all/scores',null),true);
ex('だれでも今日の記録を読める',await req('GET','yubi/d/scores',null),true);
ex('損切りした人の数を読める',await req('GET','yubi/cut',null),true);
ex('ほかの人の始めた時刻は読めない',await req('GET','yubi/runs/'+U,U2),false);
ex('hidden に書く',await req('PUT','yubi/hidden/'+U,U,true),false);
ex('ほかの場所に書く',await req('PUT','sumo/quit/'+U,U,{t:TS}),false);
// 人数カウンターの試験
{const INC={'.sv':{increment:1}};
ex('cut: はじめてで数を増やす',await req('PATCH','yubi','cnt0axxxxxxxxxxxxxxxx',{['cut/'+'cnt0axxxxxxxxxxxxxxxx']:{t:TS},'cutc':INC,'cutt':{dk:dk(),n:1}}),true);
ex('cut: 記録なしで数だけ増やす',await req('PUT','yubi/cutc','cnt0byyyyyyyyyyyyyyyy',5),false);
await sleep(2100);
ex('cut: 2回目で全期間を増やす',await req('PATCH','yubi','cnt0axxxxxxxxxxxxxxxx',{['cut/'+'cnt0axxxxxxxxxxxxxxxx']:{t:TS},'cutc':INC}),false);
ex('cut: ほかの人のはじめて',await req('PATCH','yubi','cnt0byyyyyyyyyyyyyyyy',{['cut/'+'cnt0byyyyyyyyyyyyyyyy']:{t:TS},'cutc':INC,'cutt/n':INC}),true);
ex('cut: 今日の数を1にもどす',await req('PATCH','yubi','cnt0czzzzzzzzzzzzzzzz',{['cut/'+'cnt0czzzzzzzzzzzzzzzz']:{t:TS},'cutc':INC,'cutt':{dk:dk(),n:1}}),false);
ex('cut: ちがう日で書く',await req('PATCH','yubi','cnt0czzzzzzzzzzzzzzzz',{['cut/'+'cnt0czzzzzzzzzzzzzzzz']:{t:TS},'cutc':INC,'cutt':{dk:dk()-1,n:1}}),false);
{const c=await req('GET','yubi/cutc',null),z=await req('GET','yubi/cutt',null);if(c.j!==2||!z.j||z.j.n!==2){fail++;console.log('NG  cut: 数が合いません',c.j,JSON.stringify(z.j));}else console.log('OK  cut: 全期間2・今日2');}
ex('take: はじめてで数を増やす',await req('PATCH','yubi','cnt1axxxxxxxxxxxxxxxx',{['take/'+'cnt1axxxxxxxxxxxxxxxx']:{t:TS},'takec':INC,'taket':{dk:dk(),n:1}}),true);
ex('take: 記録なしで数だけ増やす',await req('PUT','yubi/takec','cnt1byyyyyyyyyyyyyyyy',5),false);
await sleep(2100);
ex('take: 2回目で全期間を増やす',await req('PATCH','yubi','cnt1axxxxxxxxxxxxxxxx',{['take/'+'cnt1axxxxxxxxxxxxxxxx']:{t:TS},'takec':INC}),false);
ex('take: ほかの人のはじめて',await req('PATCH','yubi','cnt1byyyyyyyyyyyyyyyy',{['take/'+'cnt1byyyyyyyyyyyyyyyy']:{t:TS},'takec':INC,'taket/n':INC}),true);
ex('take: 今日の数を1にもどす',await req('PATCH','yubi','cnt1czzzzzzzzzzzzzzzz',{['take/'+'cnt1czzzzzzzzzzzzzzzz']:{t:TS},'takec':INC,'taket':{dk:dk(),n:1}}),false);
ex('take: ちがう日で書く',await req('PATCH','yubi','cnt1czzzzzzzzzzzzzzzz',{['take/'+'cnt1czzzzzzzzzzzzzzzz']:{t:TS},'takec':INC,'taket':{dk:dk()-1,n:1}}),false);
{const c=await req('GET','yubi/takec',null),z=await req('GET','yubi/taket',null);if(c.j!==2||!z.j||z.j.n!==2){fail++;console.log('NG  take: 数が合いません',c.j,JSON.stringify(z.j));}else console.log('OK  take: 全期間2・今日2');}
}
console.log(fail?('失敗 '+fail+' 件'):'すべて合格');
if(fail)process.exit(1);
