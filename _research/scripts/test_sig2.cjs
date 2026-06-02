var crypto = require('crypto')
function MD5(s) { return crypto.createHash('md5').update(s, 'utf8').digest('hex') }

var realSig = '22880d54bc87f26a56034c19f71918fe'
var realUrlTs = '1777710996675'
var realBody = '{"account":"test@example.com","password":"ea64a63bc230e6620cc67a93c354c363","account_type":1,"support_captcha":1,"machine_check_type":3,"tencent_response":"{\\"appid\\":\\"188981228\\",\\"ret\\":0,\\"ticket\\":\\"t03tserverJRQSRf268RXufnRwUOruzjUFhEJV6u4-5Til-_uYhxjjRhcdELiOqD4gqrC8II9FHCdlkuKKFJ-KbhYJWeZ3CzF6NxsKWMEy935dXZpoumtWH-NOcbpljgm2KLFmM_b9M6mmm-J9OGXLn4M1ExjO7A**\\",\\"randstr\\":\\"@rFD\\"}","device_info":{"guest_id":"ceea15b9-15a4-4c73-b5d8-1245a1bc1b5b","lang_type":"en","app_version":"WebWidget_1.31.0","screen_height":1440,"screen_width":2560,"device_brand":"Google Inc.","device_model":"5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36","network_type":"4g","ram_total":74,"rom_total":74,"cpu_name":"Win32","android_imei":"","ios_idfa":"","page":"https%3A%2F%2Fwww.blablalink.com%2Flogin","page_with_search":"https%3A%2F%2Fwww.blablalink.com%2Flogin","ts":1777710993599}}'

var qs = 'account_plat_type=131&app_id=09af79d65d6e4fdf2d2569f0d365739d&lang_type=en&os=3&sdk_version=1.31.0&source=66&ts=' + realUrlTs

// Test various apikeys
var apikeys = ['', '09af79d65d6e4fdf2d2569f0d365739d', '29080', '188981228', 'LI', '131', '66', 'levelinfinite']
console.log('=== 不同 apikey ===')
apikeys.forEach(function(ak) {
  var sig = MD5('/account/login?' + qs + realBody + ak)
  console.log('apikey="' + ak + '":', sig, sig === realSig ? '✓' : '')
})

// Test with full host URL
console.log('\n=== 完整 URL ===')
var hosts = ['https://li-sg.intlgame.com', 'https://li-sg.intlgame.com', '']
hosts.forEach(function(h) {
  var sig = MD5(h + '/account/login?' + qs + realBody + '')
  console.log('host="' + h + '":', sig, sig === realSig ? '✓' : '')
})

// Test with encodeURIComponent on body
console.log('\n=== URL编码 body ===')
var encoded = encodeURIComponent(realBody)
console.log('encoded:', MD5('/account/login?' + qs + encoded + ''), MD5('/account/login?' + qs + encoded + '') === realSig ? '✓' : '')

// Test without trailing apikey (none at all)
console.log('\n=== 无 apikey ===')
console.log('nokey:', MD5('/account/login?' + qs + realBody), MD5('/account/login?' + qs + realBody) === realSig ? '✓' : '')

// Test different paths
console.log('\n=== 不同 path ===')
var paths = ['/account/login', '/api/account/login', '/v2/account/login', '/v1/account/login', 'account/login']
paths.forEach(function(p) {
  var sig = MD5(p + '?' + qs + realBody + '')
  console.log('path="' + p + '":', sig, sig === realSig ? '✓' : '')
})

// Try: maybe the body needs to NOT have the double-escaped tencent_response
// Actually maybe the signature uses the inner string, not the JSON-stringified one
console.log('\n=== 不标准的尝试 ===')
// body without the double-json-stringify on tencent_response
var bodyAlt = JSON.parse(realBody)
bodyAlt.tencent_response = JSON.parse(bodyAlt.tencent_response)
var bodyFlat = JSON.stringify(bodyAlt)
console.log('flat:', MD5('/account/login?' + qs + bodyFlat + ''), MD5('/account/login?' + qs + bodyFlat + '') === realSig ? '✓' : '')

// Maybe only specific fields of the body are used?
var bodyMin = '{"account":"test@example.com","password":"ea64a63bc230e6620cc67a93c354c363","account_type":1,"support_captcha":1,"machine_check_type":3}'
console.log('min:', MD5('/account/login?' + qs + bodyMin + ''), MD5('/account/login?' + qs + bodyMin + '') === realSig ? '✓' : '')
