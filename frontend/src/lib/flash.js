const flashTypeMap = {
  success: 'success',
  danger: 'error',
  warning: 'error',
  info: 'success'
}

export const mapFlashToToast = (flashItem) => {
  if (!flashItem) {
    return { type: 'success', message: '' }
  }

  const [category, message] = flashItem
  const type = flashTypeMap[category] || 'success'

  return { type, message }
}
