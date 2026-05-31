const BLA_NOTIFICATION_ENABLED_KEY = 'nikke_bla_completion_notification_enabled'

const canUseNotification = () => {
  return typeof window !== 'undefined' && 'Notification' in window
}

export const isBrowserNotificationSupported = () => canUseNotification()

export const getBrowserNotificationPermission = () => {
  if (!canUseNotification()) return 'unsupported'
  return Notification.permission
}

export const getBlaNotificationEnabled = () => {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(BLA_NOTIFICATION_ENABLED_KEY) === 'true'
}

export const setBlaNotificationEnabled = (enabled) => {
  if (typeof window === 'undefined') return
  localStorage.setItem(BLA_NOTIFICATION_ENABLED_KEY, enabled ? 'true' : 'false')
}

export const requestBlaNotificationPermission = async () => {
  if (!canUseNotification()) {
    return {
      supported: false,
      granted: false,
      permission: 'unsupported',
      message: '当前浏览器不支持系统通知',
    }
  }

  const permission = await Notification.requestPermission()
  const granted = permission === 'granted'
  setBlaNotificationEnabled(granted)

  let message = '通知权限状态未变更'
  if (permission === 'granted') {
    message = '浏览器通知已开启，之后自动执行完成会发出提醒'
  } else if (permission === 'denied') {
    message = '浏览器通知权限已被拒绝，请在站点设置中手动允许'
  } else if (permission === 'default') {
    message = '你暂未允许浏览器通知'
  }

  return {
    supported: true,
    granted,
    permission,
    message,
  }
}

const buildNotificationBody = ({ successCount, failCount, totalCount, lines = [] }) => {
  const summary = `共 ${totalCount} 个账号，成功 ${successCount}，失败 ${failCount}`
  const preview = lines
    .map((line) => String(line || '').trim())
    .filter(Boolean)
    .slice(0, 3)
    .join('；')

  return preview ? `${summary}\n${preview}` : summary
}

export const notifyBlaRunCompletion = ({
  successCount = 0,
  failCount = 0,
  totalCount = 0,
  lines = [],
} = {}) => {
  if (!canUseNotification()) return false
  if (Notification.permission !== 'granted' || !getBlaNotificationEnabled()) return false

  const title =
    failCount > 0 ? 'BlaBla 每日任务已完成，存在异常' : 'BlaBla 每日任务已完成'
  const notification = new Notification(title, {
    body: buildNotificationBody({ successCount, failCount, totalCount, lines }),
    tag: 'nikke-bla-daily-run',
    renotify: true,
  })

  notification.onclick = () => {
    try {
      window.focus?.()
      window.location.hash = '/user'
    } catch (error) {
      console.warn('处理通知点击失败:', error)
    } finally {
      notification.close()
    }
  }

  return true
}
