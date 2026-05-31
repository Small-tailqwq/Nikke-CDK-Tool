export const getBlaTodayKey = () => new Date().toDateString()

export const getUserBlaRunDateKey = (user) => {
  if (!user) return ''

  if (typeof user.blaLastRunDateKey === 'string' && user.blaLastRunDateKey.trim()) {
    return user.blaLastRunDateKey.trim()
  }

  if (!user.blaLastRun) return ''

  const parsed = new Date(user.blaLastRun)
  if (Number.isNaN(parsed.getTime())) return ''
  return parsed.toDateString()
}

export const hasUserBlaRunToday = (user, todayKey = getBlaTodayKey()) => {
  return getUserBlaRunDateKey(user) === todayKey
}
