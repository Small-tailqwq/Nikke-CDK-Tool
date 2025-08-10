import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import zhCn from 'element-plus/dist/locale/zh-cn.mjs'
import 'element-plus/es/components/message-box/style/css'
import App from './App.vue'
import router from './router'

// 设置触摸事件的passive默认值为true
// 这会消除Chrome的警告: [Violation] Added non-passive event listener to a scroll-blocking 'touchstart' event
if (window.addEventListener) {
  const supportsPassive = (() => {
    let passiveSupported = false;
    try {
      const options = Object.defineProperty({}, 'passive', {
        get: function () {
          passiveSupported = true;
          return true;
        }
      });
      window.addEventListener('test', null, options);
      window.removeEventListener('test', null, options);
    } catch (err) { }
    return passiveSupported;
  })();

  if (supportsPassive) {
    const originalAddEventListener = EventTarget.prototype.addEventListener;
    EventTarget.prototype.addEventListener = function (type, listener, options) {
      if (type === 'touchstart' || type === 'touchmove') {
        if (typeof options === 'boolean') {
          options = { passive: true, capture: options };
        } else if (options == null) {
          options = { passive: true };
        } else if (typeof options === 'object' && options.passive === undefined) {
          options.passive = true;
        }
      }
      originalAddEventListener.call(this, type, listener, options);
    };
  }
}

const app = createApp(App)

// 使用插件
app.use(createPinia())
app.use(router)
app.use(ElementPlus, {
  locale: zhCn,
})

app.mount('#app') 