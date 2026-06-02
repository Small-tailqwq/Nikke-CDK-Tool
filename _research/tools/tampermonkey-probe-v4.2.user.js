// ==UserScript==
// @name         [终极探针] Level Infinite URL+Sig+Body 全量捕获 V4.2
// @namespace    http://tampermonkey.net/
// @version      4.2
// @description  自动记录完整请求 URL (含 sig) + 签名前 Body + 差异分析
// @match        https://www.blablalink.com/*
// @run-at       document-start
// @grant        none
// ==/UserScript==
//
// ⚠️  SECURITY WARNING  ⚠️
// 此脚本会在浏览器控制台输出包含密码 MD5、captcha 票据等敏感信息的
// 登录请求明文。不要在共享屏幕、录屏、或公开场合打开浏览器控制台。
// 使用后请清除控制台历史 (console.clear() 或 Ctrl+L)。

(function() {
    'use strict';

    let lastSigBody = null;
    let xhrUrlStore = new WeakMap(); // 存储每个 xhr 对象对应的完整 URL
    const loggedMd5Inputs = new Set();

    console.log("🚀 [V4.2 URL 探针] 启动，补全 URL 记录...");

    // 0. 拦截 open，记录请求 URL
    const origOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url) {
        xhrUrlStore.set(this, url);
        return origOpen.apply(this, arguments);
    };

    // 1. 签名前数据捕获
    const origStringify = JSON.stringify;
    JSON.stringify = function(value) {
        const result = origStringify.apply(this, arguments);
        if (value && value.account && !value.sig) {
            const masked = { ...value, password: value.password ? value.password.slice(0, 8) + '****' : undefined };
            console.log("🏆 签名前原始 Data 对象:", masked);
            console.log("📦 Base64:", btoa(origStringify(value)));
            lastSigBody = result;
            console.log("%c[Step 1] 签名源 Body 已锁定", "color: green");
        }
        return result;
    };

    // 1.5 捕获真正喂给 MD5 的完整明文。SDK 的 CryptoJS.MD5 会逐字符读取输入字符串。
    const rememberMd5Input = (label, input) => {
        if (typeof input !== 'string') return;
        if (!input.includes('/account/login') || !input.includes('tencent_response')) return;
        if (loggedMd5Inputs.has(input)) return;
        loggedMd5Inputs.add(input);
        const masked = input.replace(/"password":"[^"]+"/, '"password":"<MASKED>"').replace(/"account":"[^"]+"/, '"account":"<MASKED>"');
        console.log(`%c[Step 1.5] MD5 明文捕获 (${label})`, "color: purple");
        console.log(masked);
        console.log("🔐 MD5 明文末尾:", masked.slice(-64));
    };

    ['charCodeAt', 'charAt', 'codePointAt', 'slice', 'substring', 'substr'].forEach((methodName) => {
        const orig = String.prototype[methodName];
        if (!orig) return;
        String.prototype[methodName] = function(...args) {
            const str = String(this);
            rememberMd5Input(methodName, str);
            return orig.apply(this, args);
        };
    });

    if (window.TextEncoder) {
        const origEncode = TextEncoder.prototype.encode;
        TextEncoder.prototype.encode = function(input) {
            rememberMd5Input('TextEncoder.encode', input);
            return origEncode.call(this, input);
        };
    }

    // 2. 发包拦截 + URL 输出 + 差异分析
    const origSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.send = function(xhrBody) {
        if (typeof xhrBody === 'string' && xhrBody.includes('tencent_response')) {
            const fullUrl = xhrUrlStore.get(this);
            console.log("%c[Step 2] 发包拦截", "color: red");
            console.log("🔗 完整请求 URL:", fullUrl);

            if (lastSigBody) {
                // 差异分析
                console.group("🕵️ 差异分析");
                if (lastSigBody === xhrBody) {
                    console.log("✅ 未发现二次变换");
                } else {
                    console.log("⚠️ 数据被修改");
                    // 逐字符比对
                    for (let i = 0; i < Math.min(lastSigBody.length, xhrBody.length); i++) {
                        if (lastSigBody[i] !== xhrBody[i]) {
                            console.log(`第 ${i} 字符差异: sigBody="${lastSigBody[i]}" vs xhrBody="${xhrBody[i]}"`);
                            console.log(`  签名前: ...${lastSigBody.substring(Math.max(0,i-20), i+20)}...`);
                            console.log(`  发送时: ...${xhrBody.substring(Math.max(0,i-20), i+20)}...`);
                            break;
                        }
                    }
                    if (lastSigBody.length !== xhrBody.length) {
                        console.log(`长度差异: sigBody=${lastSigBody.length} xhrBody=${xhrBody.length}`);
                    }
                }
                console.groupEnd();
            }
        }
        return origSend.apply(this, arguments);
    };
})();
