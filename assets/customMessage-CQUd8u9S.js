import{n as e}from"./rolldown-runtime-aKtaBQYM.js";var t=`pwa-install-dismissed`,n=null,r=!1,i=()=>{try{return localStorage.getItem(t)===`1`}catch{return!1}},a=()=>{try{localStorage.setItem(t,`1`)}catch{}};function o(){r||typeof window>`u`||(r=!0,window.addEventListener(`beforeinstallprompt`,e=>{e.preventDefault(),n=e,window.dispatchEvent(new CustomEvent(`pwa-installable`))}),window.addEventListener(`appinstalled`,()=>{n=null,a()}))}var s=()=>!!n&&!i();async function c(){if(!n)return!1;let e=n;n=null;try{return await e.prompt(),(await e.userChoice).outcome===`accepted`}catch{return!1}}function l(){a()}var u=e({ProgressMessage:()=>y,showCustomMessage:()=>g,showInstallPrompt:()=>v}),d=`custom-notification-container`;function f(){let e=document.getElementById(d);if(!e){e=document.createElement(`div`),e.id=d;let t=window.innerWidth<=768;Object.assign(e.style,{position:`fixed`,top:t?`16px`:`20px`,right:t?`16px`:`20px`,left:t?`16px`:`auto`,zIndex:`2147483647`,display:`flex`,flexDirection:`column`,gap:`8px`,pointerEvents:`none`}),document.body.appendChild(e)}return e}function p(){if(document.querySelector(`#custom-notification-styles`))return;let e=document.createElement(`style`);e.id=`custom-notification-styles`,e.textContent=`
    @keyframes notif-slide-in {
      from {
        opacity: 0;
        transform: translateX(100%);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }
    @keyframes notif-slide-out {
      from {
        opacity: 1;
        transform: translateX(0);
      }
      to {
        opacity: 0;
        transform: translateX(100%);
      }
    }
    @media (max-width: 768px) {
      @keyframes notif-slide-in {
        from {
          opacity: 0;
          transform: translateY(-100%);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      @keyframes notif-slide-out {
        from {
          opacity: 1;
          transform: translateY(0);
        }
        to {
          opacity: 0;
          transform: translateY(-100%);
        }
      }
    }
    .custom-notification-item {
      pointer-events: auto;
      animation: notif-slide-in 0.3s ease forwards;
    }
    .custom-notification-item.custom-notification-auto-dismiss {
      pointer-events: none;
    }
    .custom-notification-item.notif-removing {
      animation: notif-slide-out 0.3s ease forwards;
    }
  `,document.head.appendChild(e)}function m(e){p(),f().appendChild(e)}function h(e){e.classList.add(`notif-removing`),setTimeout(()=>{e.parentNode&&e.parentNode.removeChild(e)},300)}var g=(e=`CDK已复制到剪贴板`,t=`success`,n=3e3)=>{let{bgColor:r,icon:i}=(e=>{switch(e){case`success`:return{bgColor:`#67c23a`,icon:`✓`};case`error`:return{bgColor:`#f56c6c`,icon:`✕`};case`warning`:return{bgColor:`#e6a23c`,icon:`⚠`};case`info`:return{bgColor:`#409eff`,icon:`i`};default:return{bgColor:`#67c23a`,icon:`✓`}}})(t),a=n<=0,o=document.createElement(`div`);o.className=`custom-notification-item custom-copy-message${a?``:` custom-notification-auto-dismiss`}`,o.innerHTML=`
    <div style="
      background: ${r};
      color: white;
      padding: ${a?`12px 12px 12px 20px`:`12px 20px`};
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      font-weight: 500;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    ">
      <span style="
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 16px;
        height: 16px;
        background: rgba(255, 255, 255, 0.2);
        border-radius: 50%;
        flex-shrink: 0;
        font-weight: bold;
      ">${i}</span>
      <span class="custom-message-text" style="flex:1"></span>
      ${a?`<span class="custom-message-close" style="cursor:pointer;flex-shrink:0;width:20px;height:20px;display:flex;align-items:center;justify-content:center;border-radius:4px;opacity:0.8;font-size:16px;line-height:1;user-select:none;">✕</span>`:``}
    </div>
  `;let s=o.querySelector(`.custom-message-text`);s&&(s.textContent=e),m(o);let c=()=>{h(o)};if(a){let e=o.querySelector(`.custom-message-close`);e&&e.addEventListener(`click`,c)}a||setTimeout(c,n)},_=!1,v=()=>{if(_||!s())return;_=!0;let e=document.createElement(`div`);e.className=`custom-notification-item custom-install-prompt`,e.innerHTML=`
    <div style="
      background: #2b2b2b;
      color: #fff;
      padding: 14px 16px;
      border-radius: 10px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      font-size: 14px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 360px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    ">
      <div style="display:flex; align-items:flex-start; gap:8px;">
        <span style="
          flex-shrink:0;
          width:22px; height:22px;
          display:inline-flex; align-items:center; justify-content:center;
          background: rgba(255,255,255,0.15);
          border-radius:6px; font-size:13px; font-weight:bold;
        ">APP</span>
        <div style="flex:1; line-height:1.4;">
          <div style="font-weight:600; margin-bottom:4px;">安装为应用</div>
          <div style="font-size:13px; opacity:0.9;">安装后可作独立窗口使用，登录系统即可自动执行每日 BlaBla 任务。</div>
        </div>
        <span class="install-prompt-close" style="
          cursor:pointer; flex-shrink:0;
          width:20px; height:20px;
          display:flex; align-items:center; justify-content:center;
          border-radius:4px; opacity:0.7; font-size:16px; line-height:1; user-select:none;
        ">✕</span>
      </div>
      <div style="display:flex; gap:8px; justify-content:flex-end;">
        <button class="install-prompt-dismiss" style="
          cursor:pointer; border:1px solid rgba(255,255,255,0.35);
          background:transparent; color:#fff;
          padding:6px 12px; border-radius:6px; font-size:13px; font-family:inherit;
        ">不再提示</button>
        <button class="install-prompt-install" style="
          cursor:pointer; border:none;
          background:#fff; color:#2b2b2b;
          padding:6px 14px; border-radius:6px; font-size:13px; font-weight:600; font-family:inherit;
        ">安装应用</button>
      </div>
    </div>
  `,m(e);let t=()=>h(e),n=e.querySelector(`.install-prompt-close`);n&&n.addEventListener(`click`,()=>{l(),t()});let r=e.querySelector(`.install-prompt-dismiss`);r&&r.addEventListener(`click`,()=>{l(),t()});let i=e.querySelector(`.install-prompt-install`);i&&i.addEventListener(`click`,async()=>{let e=await c();t(),e&&(_=!1)})},y=class{constructor(e=`正在处理...`){this.messageEl=null,this.progressBarEl=null,this.progressTextEl=null,this.isDestroyed=!1,this.create(e)}create(e){p();let t=window.innerWidth<=768;if(this.messageEl=document.createElement(`div`),this.messageEl.className=`custom-notification-item custom-progress-message custom-notification-auto-dismiss`,this.messageEl.innerHTML=`
      <div style="
        background: #409eff;
        color: white;
        padding: 16px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        font-size: 14px;
        font-weight: 500;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        min-width: ${t?`auto`:`280px`};
        max-width: ${t?`none`:`400px`};
      ">
        <div style="
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
        ">
          <div class="progress-spinner" style="
            width: 16px;
            height: 16px;
            border: 2px solid rgba(255, 255, 255, 0.3);
            border-top: 2px solid white;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          "></div>
          <span class="progress-text">${e}</span>
        </div>
        <div style="
          background: rgba(255, 255, 255, 0.2);
          height: 4px;
          border-radius: 2px;
          overflow: hidden;
        ">
          <div class="progress-bar" style="
            height: 100%;
            background: white;
            width: 0%;
            border-radius: 2px;
            transition: width 0.3s ease;
          "></div>
        </div>
      </div>
    `,!document.querySelector(`#progress-spinner-style`)){let e=document.createElement(`style`);e.id=`progress-spinner-style`,e.textContent=`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `,document.head.appendChild(e)}this.progressBarEl=this.messageEl.querySelector(`.progress-bar`),this.progressTextEl=this.messageEl.querySelector(`.progress-text`),m(this.messageEl)}updateProgress(e,t){if(this.isDestroyed||!this.progressBarEl)return;let n=Math.max(0,Math.min(100,e));this.progressBarEl.style.width=`${n}%`,t&&this.progressTextEl&&(this.progressTextEl.textContent=t)}complete(e=`操作完成`,t=!0){if(this.isDestroyed||!this.messageEl)return;this.progressBarEl&&(this.progressBarEl.style.width=`100%`),this.progressTextEl&&(this.progressTextEl.textContent=e);let n=this.messageEl.querySelector(`.progress-spinner`);n&&(n.style.animation=`none`,n.style.border=`none`,n.style.background=`rgba(255, 255, 255, 0.2)`,n.style.borderRadius=`50%`,n.style.display=`flex`,n.style.alignItems=`center`,n.style.justifyContent=`center`,n.style.fontSize=`12px`,n.style.fontWeight=`bold`,n.textContent=`✓`);let r=this.messageEl.querySelector(`div`);r&&(r.style.background=`#67c23a`),t&&setTimeout(()=>{this.hide()},2e3)}error(e=`操作失败`,t=!0){if(this.isDestroyed||!this.messageEl)return;this.progressTextEl&&(this.progressTextEl.textContent=e);let n=this.messageEl.querySelector(`.progress-spinner`);n&&(n.style.animation=`none`,n.style.border=`none`,n.style.background=`rgba(255, 255, 255, 0.2)`,n.style.borderRadius=`50%`,n.style.display=`flex`,n.style.alignItems=`center`,n.style.justifyContent=`center`,n.style.fontSize=`12px`,n.style.fontWeight=`bold`,n.textContent=`✕`);let r=this.messageEl.querySelector(`div`);if(r&&(r.style.background=`#f56c6c`),this.progressBarEl){let e=this.progressBarEl.parentElement;e&&(e.style.display=`none`)}t&&setTimeout(()=>{this.hide()},3e3)}hide(){this.isDestroyed||!this.messageEl||(h(this.messageEl),setTimeout(()=>{this.destroy()},300))}destroy(){this.isDestroyed||(this.isDestroyed=!0,this.messageEl&&this.messageEl.parentNode&&this.messageEl.parentNode.removeChild(this.messageEl),this.messageEl=null,this.progressBarEl=null,this.progressTextEl=null)}};export{o as a,v as i,u as n,g as r,y as t};