/* 巷口小吃合集 · 公共引擎 settle.js */
/* 巷口蛋烘糕 · settle.js · 收摊结算、连败保护、倒闭危机、体面结业 */

function renderSettle(){
  const d=G.day;
  const rent=rentOf();
  const net=d.rev-d.cost-d.gas-rent-d.prep-d.fines;
  const avgQ=d.qN?d.qSum/d.qN:0;
  let h='';
  h+=`<div class="card taped">
    <div class="center h1">🧾 第 ${S.day} 天账单</div>
    <div class="center tiny mut">${esc(S.shopName)} · ${GAME.weathers.find(w=>w.id===S.weather).ic}${GAME.weathers.find(w=>w.id===S.weather).n} · 🌪️${GAME.winds.find(w=>w.id===S.wind).n}</div>
    <div class="billBig ${net>=0?'repUp':'repDown'}">${net>=0?'+':''}${money(net)}</div>
    <div class="tiny center mut">${net>=0?(net>60?'赚麻了，今晚给自己加个蛋':'小赚一笔，稳当'):'亏了…看看亏在哪个决策'}</div>
  </div>`;
  h+=`<div class="card" style="margin-top:10px">
    <div class="billRow"><span>${GAME.emoji} 卖出${V('good')}</span><b>${d.sold} ${V('unit')} · <span class="repUp">+${money(d.rev)}</span></b></div>
    <div class="billRow"><span>🥬 食材消耗</span><b class="repDown">−${money(d.cost)}</b></div>
    <div class="billRow"><span>🔥 燃气</span><b class="repDown">−${money(d.gas)}</b></div>
    <div class="billRow"><span>🧾 备货压款</span><b class="repDown">−${money(d.prep)}</b></div>
    <div class="billRow"><span>🏠 场地日租</span><b class="repDown">−${money(rent)}${S.rentMul>1?'（通胀 '+Math.round((S.rentMul-1)*100)+'%）':''}</b></div>
    ${d.fines?`<div class="billRow"><span>🚨 罚款 / 翻车</span><b class="repDown">−${money(d.fines)}</b></div>`:''}
    ${d.wages?`<div class="billRow"><span>🧑‍🍳 员工工资</span><b class="repDown">−${money(d.wages)}</b></div>`:''}
    ${d.tips?`<div class="billRow"><span>💝 小费</span><b class="repUp">+${money(d.tips)}</b></div>`:''}
    <div class="divider"></div>
    <div class="billRow"><span>😤 等不及走了</span><b>${d.left} 人</b></div>
    <div class="billRow"><span>🗑️ 烤糊 / 浪费</span><b>${d.waste} 个</b></div>
    <div class="billRow"><span>⭐ 平均质量分</span><b>${Math.round(avgQ*100)}</b></div>
    <div class="billRow"><span>📣 当前口碑</span><b>${Math.round(S.rep)}</b></div>
    <div class="billRow"><span>🔥 口碑热度</span><b>${Math.round(S.buzz==null?60:S.buzz)}</b></div>
  </div>`;
  const quips=[];
  if(d.left>=4)quips.push('走了 '+d.left+' 位客人，他们曾在寒风中排过队');
  if(d.waste>=3)quips.push('糊了 '+d.waste+' 个，消防安全意识拉满');
  if(avgQ>.85)quips.push('质量分 '+Math.round(avgQ*100)+'，老师傅水平');
  if(avgQ<.55&&d.qN>3)quips.push('质量分 '+Math.round(avgQ*100)+'…客人嘴上没说，心里记了小本本');
  if(d.fines>0)quips.push('罚款 '+money(d.fines)+'，为城市管理做贡献了');
  if(net<0)quips.push('亏点在哪：'+(d.prep>d.rev*.6?'备货压款太多，明天少进点':'定价或客流出了问题，调一调'));
  const nx=GAME.premises[S.premises+1];
  if(nx&&S.money>=nx.up*.9&&S.money<nx.up)quips.push('差一点：再赚 '+money(nx.up-S.money)+' 就能升级「'+nx.n+'」');
  if(d.sold===0)quips.push('零成交。'+V('good')+'不会自己卖出去，就像工资不会自己涨');
  if(!quips.length)quips.push(pick(['平平无奇的一天，像白开水，但解渴','没有故事的一天，就是好日子']));
  h+=`<div class="deskNote" style="margin-top:10px">${quips.map(q=>'· '+q).join('<br>')}</div>`;
  const TW=GAME.weathers.find(w=>w.id===S.tomorrow);
  h+=`<div class="card" style="margin-top:10px">
    <div class="h2">🔮 明日预告</div>
    <div class="row wrap" style="gap:6px;margin-top:6px">
      <span class="pill sky">${TW.ic} ${TW.n} · ${TW.desc}</span>
      ${S.buffs.map(b=>`<span class="pill leaf">${b.ic} ${b.name}（${b.days}天）</span>`).join('')}
    </div>
    <div class="tiny mut" style="margin-top:8px">${S.signatures.length?'🏆 招牌：'+S.signatures.map(k=>S.known[k].name||comboNames(k)).join('、'):'还没有招牌菜——多试试新组合，第 5 个售出才验证'}</div>
    ${S.darks.length?`<div class="tiny" style="margin-top:4px;color:var(--rouge-d)">💀 黑历史：${S.darks.map(comboNames).join('、')}</div>`:''}
  </div>`;
  const low=unlockedFillings().filter(f=>(S.inv[f.id]||0)<=0);
  if(low.length)h+=`<div class="tiny mut" style="margin:8px 2px">⚠ 缺货预警：${low.map(f=>f.n).join('、')}</div>`;
  if(S.batter<=0)h+=`<div class="tiny mut" style="margin:0 2px 8px">⚠ 没${V('batter')}了，明天先${V('fermDone')}</div>`;
  $('#settleBody').innerHTML=h;
  const cb=document.createElement('button'); cb.id='sCodex'; cb.className='btn ghost tiny'; cb.textContent='📖 图鉴 / 成就';
  cb.style.marginBottom='8px'; cb.onclick=()=>{SFX.click();openCodex()};
  $('#settleBody').prepend(cb);
  const sb=document.createElement('button'); sb.id='sShare'; sb.className='btn ghost tiny'; sb.textContent='📤 分享卡片';
  sb.style.marginBottom='8px'; sb.onclick=()=>{SFX.click();shareCard()};
  $('#settleBody').prepend(sb);
  const big=$('#settleBody .billBig'); if(big&&typeof countUp==='function')countUp(big,net,900);
  $('#btnNextDay').textContent='迎接第 '+(S.day+1)+' 天 →';
  offerPrebook();
  checkEndings();
  checkCrisis();
  save();
}
function comboNames(key){ return key.split('+').map(id=>F(id).n).join('+'); }
function checkCrisis(){
  if(G.crisisDays<BAL.crisisDays)return;
  modal(`<div class="h1 center">📉 倒闭危机</div>
    <div class="tiny mut center" style="margin:8px 0">账上不到 ${money(BAL.crisisMoney)}，房东在敲门，猫在看你。选一个：</div>
    <div class="row" style="flex-direction:column;gap:8px">
      <button class="btn leaf" id="crFund" style="width:100%">🙏 老顾客众筹 +${money(80)}（口碑 −3）</button>
      <button class="btn rouge" id="crEnd" style="width:100%">🎬 体面结业（拿称号，开传承）</button>
    </div>`,
    {onMount:(box,close)=>{
      box.querySelector('#crFund').onclick=()=>{
        S.money+=80; S.rep=clamp(S.rep-3,0,100); G.crisisDays=0;
        SFX.ding(); toast('熟客凑了 80 块：“老板，挺住！”','gold'); close(); save(); hudUpdate();
      };
      box.querySelector('#crEnd').onclick=()=>{ close(); gracefulExit(); };
    }});
}
function endingTitle(){
  const st=S.stats;
  if(st.fine>150)return'城管之友';
  if(st.dark>=2)return'生化武器专家';
  if(st.perfect>=25)return'火候之神（已倒闭）';
  if(st.sold>150)return'劳模摊主（已倒闭）';
  return'餐饮冥灯';
}
function gracefulExit(){
  const st=S.stats;
  const hint=S.signatures.length?S.signatures[0]:null;
  const legacy={money:true,deaths:(S.deaths||0)+1,hint};
  saveMeta({runs:(metaGet().runs||0)+1, hardDone:!!(metaGet().hardDone||S.diff==='hard')});
  S.deaths=(S.deaths||0)+1; save();
  modal(`<div class="h1 center">🎬 剧终</div>
    <div class="center h2" style="margin:6px 0;color:var(--caramel)">获得称号：${endingTitle()}</div>
    <div class="card" style="margin:10px 0">
      <div class="billRow"><span>经营天数</span><b>${st.days} 天</b></div>
      <div class="billRow"><span>卖出${V('good')}</span><b>${st.sold} ${V('unit')}</b></div>
      <div class="billRow"><span>累计营收</span><b>${money(st.earn)}</b></div>
      <div class="billRow"><span>完美出锅</span><b>${st.perfect} 次</b></div>
      <div class="billRow"><span>黑暗料理</span><b>${st.dark} 道</b></div>
      <div class="billRow"><span>上缴城管</span><b>${money(st.fine)}</b></div>
      <div class="billRow"><span>招牌菜</span><b>${S.signatures.length} 道</b></div>
    </div>
    <div class="deskNote">破产也是经营的一部分，而且你贡献了无数笑料。传承奖励：下局启动金 +${money(BAL.legacyMoney)}${hint?'，并保留一条招牌线索「'+comboNames(hint)+'」':''}</div>
    <button class="btn big leaf" id="lgOk" style="width:100%;margin-top:10px">带着经验重新开摊</button>`,
    {onMount:(box,close)=>{
      box.querySelector('#lgOk').onclick=()=>{
        close(); SFX.fanfare();
        newGame(S.playerName,S.shopName,legacy,S.diff); startDay(true); show('prep');
        toast('传承生效：启动金 +'+money(BAL.legacyMoney),'gold');
      };
    }});
}
