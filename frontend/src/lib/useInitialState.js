export const useInitialState = () => {
  const page = window.__PAGE__ || 'predict'
  const initial = window.__INITIAL_STATE__ || {}

  return {
    page,
    data: initial.data || {},
    meta: initial.meta || {},
    flash: initial.flash || []
  }
}
