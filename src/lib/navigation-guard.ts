// Browser-only registrations; never store form values, passwords or tokens here.
const dirtyEditors = new Set<symbol>()
export function registerUnsavedEditor() {
  const id = Symbol('unsaved-editor')
  dirtyEditors.add(id)
  return () => { dirtyEditors.delete(id) }
}
export function hasUnsavedEditor() { return dirtyEditors.size > 0 }
