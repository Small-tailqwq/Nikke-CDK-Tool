import{At as e,B as t,Dt as n,Et as r,F as i,I as a,Kt as o,Mt as s,Nt as c,en as l,ln as u}from"./element-plus-B2992snI.js";import{_ as d}from"./index-kdYw0ccB.js";var f={class:`page`},p=[`href`],m={class:`actions`},h=d({__name:`Bookmarklet`,setup(d){let h=u(`(() => {
  try {
    const safeLS = (() => { try { return { ...localStorage }; } catch { return {}; } })();
    let lip = {};
    try { lip = JSON.parse(safeLS['lip-user-info'] || '{}'); } catch {}
    const ci = lip.channel_info || {};
    let extra = lip.extra_json || {};
    if (typeof extra === 'string') { try { extra = JSON.parse(extra); } catch { extra = {}; } }
    const nn = (extra && extra.need_notify_rsp) || {};
    // 解析 document.cookie 为 map
    const cookiePairs = (document.cookie || '').split(';').map(s => s.trim()).filter(Boolean);
    const cookieMap = {};
    for (const p of cookiePairs) {
      const idx = p.indexOf('=');
      if (idx > -1) cookieMap[p.slice(0, idx)] = p.slice(idx + 1);
    }

    // 从 cookie 优先获取；缺失时从 LS 回退
    const gameIdFromCookie = cookieMap['game_gameid'] || (document.cookie.match(/__ss_storage_cookie_cache_game_id__=(\\d+)/)?.[1]) || '';
    const game_id = gameIdFromCookie || '29080';

  // 选择正确的 game_token：优先 cookie；LS 中顶层 lip.token 才是游戏侧 token，channel_info.token 仍是 LI Pass token
  const tokenCandidates = [cookieMap['game_token'], lip.token, ci.token].filter(v => !!v);
  const isLikelyHex = (s) => typeof s === 'string' && /^[a-fA-F0-9]{32,64}$/.test(s);
  let token = tokenCandidates.find(isLikelyHex) || '';

    // openid/uid：优先 cookie，其次从 LS 识别
    // SDK 中 top-level openid 是 game_openid；channel_info.openid 更接近 game_uid
    const cookie_openid = cookieMap['game_openid'] || '';
    const cookie_uid = cookieMap['game_uid'] || '';

  const derived_uid = cookie_uid || nn.game_sacc_uid || nn.li_uid || ci.openid || lip.uid || '';
  const derived_openid = cookie_openid || lip.openid || ci.openid || '';

    const channelid = cookieMap['game_channelid'] || ci.channelId || ci.channel_id || '';
    const user_name = cookieMap['game_user_name'] || lip.user_name || (ci.account ? String(ci.account).split('@')[0] : '');
    const adult = cookieMap['game_adult_status'] || '1';
    const login_game = cookieMap['game_login_game'] || '0';

    // 组装标准 Cookie（按较常见顺序输出）
    const kv = [
      ['game_adult_status', adult],
      ['game_channelid', channelid],
      ['game_gameid', game_id],
      ['game_login_game', login_game],
      ['game_openid', derived_openid],
      ['game_token', token],
      ['game_uid', derived_uid],
      ['game_user_name', user_name]
    ].filter(([k,v]) => v !== undefined && v !== null && String(v) !== '');
    const standardCookie = kv.map(([k,v]) => k + '=' + String(v)).join('; ');
    const data = {
      href: location.href,
      cookie: document.cookie,
      // 仅回传必要的 LS 键，避免冗余与隐私暴露
      ls: { 'lip-user-info': safeLS['lip-user-info'] },
      standardCookie,
      derived: { game_id, openid: derived_openid, channelid, uid: derived_uid, user_name }
    };
    const payload = btoa(unescape(encodeURIComponent(JSON.stringify(data))));
    const cb = '${location.origin+location.pathname+`#/auth/callback`}';
    location.href = cb + '?data=' + encodeURIComponent(payload);
  } catch (e) {
    alert('回传失败: ' + (e && e.message));
  }
})();`),g=r(()=>`javascript:`+encodeURIComponent(h.value));function _(){let e=`https://www.blablalink.com/login?to=/cdk`,t=null;try{t=window.open(e,`nikkeLoginWin`)}catch{t=null}if(!t){location.assign(e);return}let n=setInterval(()=>{t&&t.closed&&(clearInterval(n),location.assign(`https://www.blablalink.com/cdk`))},500);setTimeout(()=>clearInterval(n),18e4)}async function v(){await navigator.clipboard.writeText(`javascript:`+h.value)}return(r,u)=>{let d=i,y=t,b=a;return o(),e(`div`,f,[u[7]||=n(`h2`,null,`官方登录助手`,-1),n(`ol`,null,[n(`li`,null,[u[1]||=s(` 将下方按钮拖到浏览器书签栏，或右键复制链接添加为书签： `),n(`a`,{href:g.value,class:`bookmarklet`},`NIKKE 登录回传`,8,p)]),u[2]||=n(`li`,null,` 点击“前往官方登录页”，在新开的登录页完成登录（可能被拦截则会在本标签打开）。 登录完成后可直接关闭登录页。 `,-1),u[3]||=n(`li`,null,[s(` 登录页关闭后，你当前这个标签会自动前往官方 `),n(`code`,null,`/cdk`),s(` 页面。 在该页面点击书签 “NIKKE 登录回传”。 `)],-1),u[4]||=n(`li`,null,` 页面将回到本工具的“登录回调”页，查看信息卡片并选择“更新此用户的Cookie”或“创建并保存”。 `,-1)]),n(`div`,m,[c(d,{type:`primary`,onClick:_},{default:l(()=>u[5]||=[s(`前往官方登录页`)]),_:1,__:[5]}),c(d,{onClick:v},{default:l(()=>u[6]||=[s(`复制书签脚本`)]),_:1,__:[6]})]),c(y,{type:`info`,closable:!1,title:`安全与使用说明`,description:`脚本仅在官方站点读取与兑换相关的少量 cookie/localStorage 字段，并通过 URL hash 回传至本工具，不会外发到第三方服务器；本页面不会关闭你的当前标签。若弹窗被拦截，将在本标签直接打开登录页；若未自动跳转到 /cdk，可手动访问官方 /cdk 再点击书签。`}),u[8]||=n(`h3`,null,`调试信息`,-1),c(b,{modelValue:h.value,"onUpdate:modelValue":u[0]||=e=>h.value=e,type:`textarea`,autosize:{minRows:6}},null,8,[`modelValue`])])}}},[[`__scopeId`,`data-v-1182fdb1`]]);export{h as default};