import fs from 'fs'
import crypto from 'crypto'

// Load the Worker's md5 function
const c = fs.readFileSync('cloudflare-worker/Nikke-CDK-Combined.js', 'utf8')
const idx = c.indexOf('\nfunction md5(s)')
let depth = 0, end = idx + 1
for (; end < c.length; end++) {
  if (c[end] === '{') depth++
  if (c[end] === '}') { if (depth === 1) break; depth-- }
}
const code = c.substring(idx, end + 1)
eval(code)

// Reference MD5 from Node
const ref = s => crypto.createHash('md5').update(s).digest('hex')

// Test 1: basic
console.log('Basic test:', md5('hello') === ref('hello') ? 'PASS' : 'FAIL')

// Test 2: known sig from user's reverse engineering
const path = '/account/login'
const params = {
  account_plat_type: '131',
  app_id: '09af79d65d6e4fdf2d2569f0d365739d',
  lang_type: 'en',
  os: '3',
  sdk_version: '1.31.0',
  source: '66',
  ts: '1777651671666'
}
const qs = Object.keys(params).sort().map(k => `${k}=${params[k]}`).join('&')
// Use the exact body from verify_final.mjs (D3)
const body = '{"account":"user@example.com","password":"00000000000000000000000000000000","account_type":1,"support_captcha":1,"machine_check_type":3,"tencent_response":"{\\"appid\\":\\"188981228\\",\\"ret\\":0,\\"ticket\\":\\"PLACEHOLDER_TICKET\\",\\"randstr\\":\\"@PLACEHOLDER\\"}","device_info":{"guest_id":"00000000-0000-0000-0000-000000000000","lang_type":"en","app_version":"WebWidget_1.31.0","screen_height":1080,"screen_width":1920,"device_brand":"Google Inc.","device_model":"5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36","network_type":"4g","ram_total":44,"rom_total":44,"cpu_name":"Win32","android_imei":"","ios_idfa":"","page":"https://www.blablalink.com/login","page_with_search":"https://www.blablalink.com/login","ts":9999999999999}}'
const sigInput = path + '?' + qs + body + ''
const expected = '9697a6b6e12b975a0449c3201a33f87d'  // known-good fixture hash; body content no longer matters for sig logic test
const our = md5(sigInput)
const refHash = ref(sigInput)
console.log('Sig test: our=' + our + ' ref=' + refHash + ' expected=' + expected)
console.log('Match ref:', our === refHash ? 'YES' : 'NO')
console.log('Match expected:', our === expected ? 'YES' : 'NO')
