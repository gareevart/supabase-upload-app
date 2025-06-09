import type { Editor } from "@tiptap/core"

export const NODE_HANDLES_SELECTED_STYLE_CLASSNAME = "node-handles-selected-style"

export function isValidUrl(url: string) {
  return /^https?:\/\/\S+$/.test(url)
}

export const duplicateContent = (editor: Editor) => {
  const { view } = editor
  const { state } = view
  const { selection } = state

  // Get the selected content
  const selectedContent = selection.content()
  
  // Check if there's content to duplicate
  if (selectedContent.content.childCount > 0) {
    const firstNode = selectedContent.content.firstChild
    
    if (firstNode) {
      // Convert the node to a format that can be inserted
      const nodeJson = firstNode.toJSON()
      
      editor
        .chain()
        .insertContentAt(
          selection.to,
          nodeJson,
          {
            updateSelection: true,
          },
        )
        .focus(selection.to)
        .run()
    }
  }
}

export function getUrlFromString(str: string) {
  if (isValidUrl(str)) {
    return str
  }
  try {
    if (str.includes(".") && !str.includes(" ")) {
      return new URL(`https://${str}`).toString()
    }
  } catch {
    return null
  }
}

export function absoluteUrl(path: string) {
  return `${process.env.NEXT_PUBLIC_APP_URL}${path}`
}