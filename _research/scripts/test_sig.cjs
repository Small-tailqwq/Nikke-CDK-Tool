var crypto = require('crypto')
function MD5(s) { return crypto.createHash('md5').update(s, 'utf8').digest('hex') }

var realSig = '22880d54bc87f26a56034c19f71918fe'
var urlTs = '1777710996675'
var bodyTs = 1777710993599
var body = '{"account":"test@example.com","password":"ea64a63bc230e6620cc67a93c354c363","account_type":1,"support_captcha":1,"machine_check_type":3,"tencent_response":"{\\"appid\\":\\"188981228\\",\\"ret\\":0,\\"ticket\\":\\"t03tserverJRQSRf268RXufnRwUOruzjUFhEJV6u4-5Til-_uYhxjjRhcdELiOqD4gqrC8II9FHCdlkuKKFJ-KbhYJWeZ3CzF6NxsKWMEy935dXZpoumtWH-NOcbpljgm2KLFmM_b9M6mmm-J9OGXLn4M1ExjO7A**\\",\\"randstr\\":\\"@rFD\\"}","device_info":{"guest_id":"ceea15b9-15a4-4c73-b5d8-1245a1bc1b5b","lang_type":"en","app_version":"WebWidget_1.31.0","screen_height":1440,"screen_width":2560,"device_brand":"Google Inc.","device_model":"5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36","network_type":"4g","ram_total":74,"rom_total":74,"cpu_name":"Win32","android_imei":"","ios_idfa":"","page":"https%3A%2F%2Fwww.blablalink.com%2Flogin","page_with_search":"https%3A%2F%2Fwww.blablalink.com%2Flogin","ts":1777710993599}}'

// Test with body ts (1777710993599) as URL param
var params = {
  account_plat_type: '131',
  app_id: '09af79d65d6e4fdf2d2569f0d365739d',
  lang_type: 'en',
  os: '3',
  sdk_version: '1.31.0',
  source: '66',
  ts: String(bodyTs)  // Use body ts instead of url ts
}
var qs = Object.keys(params).sort().map(function(k) { return k + '=' + params[k] }).join('&')
var sig = MD5('/account/login?' + qs + body + '')
console.log('body-ts sig:', sig, sig === realSig ? 'MATCH!' : '')

// Try: path with leading dot? ./account/login
var sig2 = MD5('./account/login?' + qs + body + '')
console.log('dot-path sig:', sig2, sig2 === realSig ? 'MATCH!' : '')

// Try: URL-encoded body (encodeURIComponent on the whole body before signing)
var encodedBody = encodeURIComponent(body)
var sig3 = MD5('/account/login?' + qs + encodedBody + '')
console.log('encoded sig:', sig3, sig3 === realSig ? 'MATCH!' : '')

// Try: the body URLSearchParams formatted (like application/x-www-form-urlencoded)
var SP = require('url').URLSearchParams
var sp = new SP()
var bodyObj = JSON.parse(body)
for (var k in bodyObj) sp.append(k, typeof bodyObj[k] === 'object' ? JSON.stringify(bodyObj[k]) : bodyObj[k])
var formBody = sp.toString()
var sig4 = MD5('/account/login?' + qs + formBody + '')
console.log('form sig:', sig4, sig4 === realSig ? 'MATCH!' : '')

// Try: postBody as form-encoded specifically for account/password
var formBody2 = 'account=' + encodeURIComponent('test@example.com') + '&password=' + 'ea64a63bc230e6620cc67a93c354c363' + '&account_type=1'
var sig5 = MD5('/account/login?' + qs + formBody2 + '')
console.log('form2 sig:', sig5, sig5 === realSig ? 'MATCH!' : '')

// Try: different path (maybe /v2/account/login)
var sig6 = MD5('/v2/account/login?' + qs + body + '')
console.log('v2-path sig:', sig6, sig6 === realSig ? 'MATCH!' : '')

// Try: full URL
var sig7 = MD5('https://li-sg.intlgame.com/account/login?' + qs + body + '')
console.log('full-url sig:', sig7, sig7 === realSig ? 'MATCH!' : '')

// Try: include HTTP method
var sig8 = MD5('POST/account/login?' + qs + body + '')
console.log('method sig:', sig8, sig8 === realSig ? 'MATCH!' : '')

// Try: source as number 66 (not string '66')
var paramsN = {
  account_plat_type: '131',
  app_id: '09af79d65d6e4fdf2d2569f0d365739d',
  lang_type: 'en',
  os: '3',
  sdk_version: '1.31.0',
  source: 66,
  ts: urlTs
}
var qsN = Object.keys(paramsN).sort().map(function(k) { return k + '=' + paramsN[k] }).join('&')
var sig9 = MD5('/account/login?' + qsN + body + '')
console.log('num-source sig:', sig9, sig9 === realSig ? 'MATCH!' : '')

// Try: source=66 as number in query string but string in sig computation
// The SDK might format numbers differently
// Let me also try intlgame path prefix
var sig10 = MD5('account/login?' + qs + body + '')
console.log('no-slash sig:', sig10, sig10 === realSig ? 'MATCH!' : '')
