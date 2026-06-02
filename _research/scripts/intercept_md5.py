import asyncio
from playwright.async_api import async_playwright

INJECTION_SCRIPT = """
(function() {
    // 【关键修复1】：只在主窗口注入，绝对不要去碰腾讯验证码的 iframe，防止页面交互死锁！
    if (window !== window.top) return; 

    console.log("[ANTIGRAVITY] Hooks injected successfully into Main Frame!");

    const loggedStrings = new Set();

    const origStringify = JSON.stringify;
    JSON.stringify = function(value, replacer, space) {
        const result = origStringify.call(this, value, replacer, space);
        if (typeof result === 'string' && result.includes('tencent_response')) {
            console.log("\\n[ANTIGRAVITY_INTERCEPT] 1. JSON Body Serialized:");
            console.log(result);
        }
        return result;
    };

    const hookStringMethod = (methodName) => {
        const orig = String.prototype[methodName];
        if (!orig) return;
        String.prototype[methodName] = function(...args) {
            const str = this.toString();
            if (str.length > 50 && str.includes('/account/login') && str.includes('tencent_response')) {
                if (!loggedStrings.has(str)) {
                    console.log(`\\n[ANTIGRAVITY_INTERCEPT] 2. Exact string fed to MD5 (via ${methodName}):`);
                    console.log(str);
                    loggedStrings.add(str);
                }
            }
            return orig.apply(this, args);
        };
    };

    hookStringMethod('charCodeAt');
    hookStringMethod('charAt');
    hookStringMethod('codePointAt');
    hookStringMethod('slice');

    if (window.TextEncoder) {
        const origEncode = TextEncoder.prototype.encode;
        TextEncoder.prototype.encode = function(input) {
            if (typeof input === 'string' && input.includes('/account/login') && input.includes('tencent_response')) {
                if (!loggedStrings.has(input)) {
                    console.log("\\n[ANTIGRAVITY_INTERCEPT] 2. Exact string fed to MD5 (via TextEncoder):");
                    console.log(input);
                    loggedStrings.add(input);
                }
            }
            return origEncode.call(this, input);
        };
    }
})();
"""

async def main():
    async with async_playwright() as p:
        print("Launching interactive browser with Stealth mode...")
        
        # 【关键修复2】：添加反自动化检测特征启动参数
        browser = await p.chromium.launch(
            headless=False,
            args=[
                '--disable-blink-features=AutomationControlled', # 移除由自动化控制的提示和底层标记
                '--disable-features=IsolateOrigins,site-per-process' 
            ]
        )
        context = await browser.new_context(viewport={'width': 1280, 'height': 720})

        # 【关键修复3】：抹除 Webdriver 指纹，伪装成正常人类浏览器
        await context.add_init_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined});")

        # 使用更稳妥的 add_init_script 替代裸写 CDP
        await context.add_init_script(INJECTION_SCRIPT)

        page = await context.new_page()

        # 监听控制台输出
        page.on("console", lambda msg: print(f"[Browser] {msg.text}") if "ANTIGRAVITY" in msg.text else None)

        print("Navigating to target...")
        await page.goto("https://www.blablalink.com/login", timeout=0)

        print("Page loaded. Please interact with the page to trigger the login request.")
        
        await page.wait_for_event("close", timeout=0)
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())