import { useEffect, useState } from 'react'
import { Button, message, Space, Spin, Tag } from 'antd'
import { StudioEntitiesApi } from '../../../../services/studioEntities'
import { StudioShotLinksService } from '../../../../services/generated'

type Props = {
  projectId?: string
  chapterId?: string
  name: string
  description?: string
}

type AssetEntitySummary = { id: string; name: string }

function makeId(prefix: string) {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

export function PrepDraftScenesPanel({ projectId, chapterId, name, description }: Props) {
  const [assetMatch, setAssetMatch] = useState<AssetEntitySummary | null>(null)
  const [linkMatch, setLinkMatch] = useState<{ id: number } | null>(null)
  const [linkBusy, setLinkBusy] = useState(false)

  const refreshAssetAndLink = async () => {
    if (!projectId || !chapterId) return
    if (!name) return

    setLinkBusy(true)
    try {
      setAssetMatch(null)
      setLinkMatch(null)

      // 1) 资产是否存在（按 exact name）
      const res = await StudioEntitiesApi.list('scene', {
        q: name,
        page: 1,
        pageSize: 100,
        order: null,
        isDesc: true,
      })
      const items = (res.data?.items ?? []) as Array<AssetEntitySummary>
      const found = items.find((x) => x.name === name) ?? null
      setAssetMatch(found)

      // 2) shot_id=null（章节级）是否已关联
      if (found?.id) {
        const links = await StudioShotLinksService.listProjectEntityLinksApiV1StudioShotLinksEntityTypeGet({
          entityType: 'scene',
          projectId,
          chapterId,
          shotId: null,
          assetId: found.id,
          order: null,
          isDesc: false,
          page: 1,
          pageSize: 10,
        })
        const linkItems = links.data?.items ?? []
        setLinkMatch(linkItems[0] ?? null)
      }
    } catch {
      // keep null
    } finally {
      setLinkBusy(false)
    }
  }

  useEffect(() => {
    void refreshAssetAndLink()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, chapterId, name])

  const createLinkForAssetId = async (assetId: string) => {
    if (!projectId || !chapterId) return
    await StudioShotLinksService.createProjectSceneLinkApiV1StudioShotLinksScenePost({
      requestBody: { project_id: projectId, chapter_id: chapterId, shot_id: null, asset_id: assetId },
    })
  }

  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>关联到项目资产</div>

      {linkBusy ? (
        <div style={{ padding: '8px 0' }}>
          <Spin size="small" />
        </div>
      ) : assetMatch ? (
        linkMatch ? (
          <Tag color="green">已关联</Tag>
        ) : (
          <Space wrap>
            <Button
              type="primary"
              onClick={async () => {
                setLinkBusy(true)
                try {
                  await createLinkForAssetId(assetMatch.id)
                  message.success('关联成功')
                  await refreshAssetAndLink()
                } catch {
                  message.error('关联失败')
                } finally {
                  setLinkBusy(false)
                }
              }}
            >
              关联
            </Button>
          </Space>
        )
      ) : (
        <Space wrap>
          <Button
            type="primary"
            onClick={async () => {
              if (!projectId) return
              setLinkBusy(true)
              try {
                const newIdVal = makeId('scene')
                const payload: Record<string, unknown> = {
                  id: newIdVal,
                  name,
                  description: description || '',
                  tags: [],
                  prompt_template_id: null,
                  view_count: 1,
                }
                const created = await StudioEntitiesApi.create('scene', payload)
                const createdId = created.data?.id ?? newIdVal

                setAssetMatch({ id: createdId, name })
                await createLinkForAssetId(createdId)

                message.success('创建并关联成功')
                await refreshAssetAndLink()
              } catch {
                message.error('创建并关联失败')
              } finally {
                setLinkBusy(false)
              }
            }}
          >
            创建并关联
          </Button>
        </Space>
      )}
    </div>
  )
}

