export function getProjectChaptersPath(projectId: string) {
  return `/projects/${projectId}/chapters`
}

export function getChapterPrepPath(projectId: string, chapterId: string) {
  return `/projects/${projectId}/chapters/${chapterId}/prep`
}

export function getChapterPrepStepPath(projectId: string, chapterId: string, step: string) {
  return `/projects/${projectId}/chapters/${chapterId}/prep/${step}`
}

export function getChapterPrepDraftsPath(projectId: string, chapterId: string) {
  return `/projects/${projectId}/chapters/${chapterId}/prep-drafts`
}

export function getChapterStudioPath(projectId: string, chapterId: string) {
  return `/projects/${projectId}/chapters/${chapterId}/studio`
}

export function getChapterShotsPath(projectId: string, chapterId: string) {
  return `/projects/${projectId}/chapters/${chapterId}/shots`
}

export function getProjectEditorPath(projectId: string) {
  return `/projects/${projectId}/editor`
}

