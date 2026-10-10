const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
const GOOGLE_DOC_MIME = 'application/vnd.google-apps.document'
const FOLDER_MIME = 'application/vnd.google-apps.folder'
const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000

const HANDLERS = {
  upload: handleUpload,
  listFolders: handleListFolders
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents)
    const apiKey = PropertiesService.getScriptProperties().getProperty('API_KEY')
    if (!apiKey || body.apiKey !== apiKey) {
      return respond({ success: false, error: 'Unauthorized' })
    }
    if (Math.abs(Date.now() - Number(body.timestamp)) > MAX_CLOCK_SKEW_MS) {
      return respond({ success: false, error: 'Request expired' })
    }
    const handler = HANDLERS[body.action]
    if (!handler) {
      return respond({ success: false, error: 'Unknown action: ' + body.action })
    }
    return respond({ success: true, data: handler(body.params || {}) })
  } catch (err) {
    return respond({ success: false, error: String(err && err.message ? err.message : err) })
  }
}

function respond(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON)
}

function handleUpload(params) {
  const blob = Utilities.newBlob(Utilities.base64Decode(params.docxBase64), DOCX_MIME, params.name)

  if (params.fileId && isLiveDoc(params.fileId)) {
    const file = Drive.Files.update({ name: params.name }, params.fileId, blob, { fields: 'id,webViewLink' })
    return { id: file.id, url: file.webViewLink, updated: true }
  }

  const resource = { name: params.name, mimeType: GOOGLE_DOC_MIME }
  if (params.folderId) resource.parents = [params.folderId]
  const file = Drive.Files.create(resource, blob, { fields: 'id,webViewLink' })
  return { id: file.id, url: file.webViewLink, updated: false }
}

// A remembered id can point at a Doc that was deleted or trashed since; those
// get a fresh Doc rather than an error.
function isLiveDoc(fileId) {
  try {
    return !Drive.Files.get(fileId, { fields: 'trashed' }).trashed
  } catch (err) {
    return false
  }
}

function handleListFolders(params) {
  const parent = params.parentId || 'root'
  if (!/^[\w-]+$/.test(parent)) throw new Error('Invalid folder id')
  const folders = []
  let pageToken
  do {
    const page = Drive.Files.list({
      q: "'" + parent + "' in parents and mimeType = '" + FOLDER_MIME + "' and trashed = false",
      orderBy: 'name',
      fields: 'nextPageToken, files(id, name)',
      pageSize: 1000,
      pageToken: pageToken
    })
    page.files.forEach(function (f) { folders.push({ id: f.id, name: f.name }) })
    pageToken = page.nextPageToken
  } while (pageToken)
  return folders
}
