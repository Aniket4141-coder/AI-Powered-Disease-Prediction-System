export const formatTitleCase = (value) => {
  if (!value) return ''
  return value
    .toString()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

export const getRiskLevel = (confidence) => {
  if (confidence >= 70) return { label: 'High', tone: 'danger' }
  if (confidence >= 40) return { label: 'Medium', tone: 'warning' }
  return { label: 'Low', tone: 'success' }
}

export const groupHistoryByDate = (items) => {
  const map = new Map()
  items.forEach((item) => {
    const date = item.time ? new Date(item.time) : null
    const label = date && !Number.isNaN(date.getTime())
      ? date.toLocaleDateString()
      : 'Unknown'

    map.set(label, (map.get(label) || 0) + 1)
  })

  return Array.from(map.entries()).map(([label, count]) => ({ label, count }))
}
