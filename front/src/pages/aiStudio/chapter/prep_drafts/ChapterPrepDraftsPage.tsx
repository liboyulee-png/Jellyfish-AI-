import { useEffect, useMemo, useState } from 'react'
import { Badge, Card, Empty, List, Spin, Tabs } from 'antd'
import type { TabsProps } from 'antd'
import { useParams } from 'react-router-dom'

import type {
  ImportCharacterDraftRead,
  ImportCostumeDraftRead,
  ImportDraftOccurrenceRead,
  ImportDraftType,
  ImportPropDraftRead,
  ImportSceneDraftRead,
  ShotRead,
} from '../../../../services/generated'
import { StudioPrepDraftsService, StudioShotsService } from '../../../../services/generated'

import { PrepDraftCostumesPanel } from './PrepDraftCostumesPanel'
import { PrepDraftCharactersPanel } from './PrepDraftCharactersPanel'
import { PrepDraftPropsPanel } from './PrepDraftPropsPanel'
import { PrepDraftScenesPanel } from './PrepDraftScenesPanel'

type TabKey = 'characters' | 'scenes' | 'props' | 'costumes'

type DraftTypeRecord = {
  characters: 'character'
  scenes: 'scene'
  props: 'prop'
  costumes: 'costume'
}

type DraftItem = {
  draftType: ImportDraftType
  name: string
  description: string
  occurrences: Array<{
    occurrence: ImportDraftOccurrenceRead
  }>
}

const tabKeyToDraftType: DraftTypeRecord = {
  characters: 'character',
  scenes: 'scene',
  props: 'prop',
  costumes: 'costume',
}

export default function ChapterPrepDraftsPage() {
  const { projectId, chapterId } = useParams<{ projectId?: string; chapterId?: string }>()

  const [activeTab, setActiveTab] = useState<TabKey>('characters')
  const [loading, setLoading] = useState(false)
  const [shots, setShots] = useState<ShotRead[]>([])
  const [draftItemsByKey, setDraftItemsByKey] = useState<Record<string, DraftItem>>({})
  const [selectedKey, setSelectedKey] = useState<string | null>(null)

  const tabs = useMemo<TabsProps['items']>(
    () => [
      { key: 'characters', label: '角色' },
      { key: 'scenes', label: '场景' },
      { key: 'props', label: '道具' },
      { key: 'costumes', label: '服装' },
    ],
    [],
  )

  const shotById = useMemo(() => {
    const next: Record<string, ShotRead> = {}
    shots.forEach((s) => {
      next[s.id] = s
    })
    return next
  }, [shots])

  const itemsForActiveTab = useMemo(() => {
    const t = tabKeyToDraftType[activeTab]
    return Object.entries(draftItemsByKey)
      .filter(([, it]) => it.draftType === t)
      .map(([, it]) => it)
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [activeTab, draftItemsByKey])

  useEffect(() => {
    if (!itemsForActiveTab.length) return
    const cur = selectedKey ? draftItemsByKey[selectedKey] : null
    if (cur && cur.draftType === tabKeyToDraftType[activeTab]) return
    const next = itemsForActiveTab[0]
    if (next) setSelectedKey(`${next.draftType}:${next.name}`)
  }, [activeTab, draftItemsByKey, itemsForActiveTab, selectedKey])

  const characterNamesByShot = useMemo(() => {
    const map: Record<string, string[]> = {}
    const allChars = Object.values(draftItemsByKey).filter((it) => it.draftType === 'character')
    allChars.forEach((it) => {
      it.occurrences.forEach((o) => {
        const sid = o.occurrence.shot_id
        map[sid] = map[sid] ?? []
        map[sid].push(it.name)
      })
    })
    Object.keys(map).forEach((sid) => {
      map[sid] = Array.from(new Set(map[sid])).sort((a, b) => a.localeCompare(b))
    })
    return map
  }, [draftItemsByKey])

  useEffect(() => {
    const load = async () => {
      if (!projectId || !chapterId) {
        setLoading(false)
        return
      }
      setLoading(true)
      setDraftItemsByKey({})
      setSelectedKey(null)
      try {
        const res = await StudioShotsService.listShotsApiV1StudioShotsGet({
          chapterId,
          page: 1,
          pageSize: 100,
          order: 'index',
          isDesc: false,
        })
        const nextShots = res.data?.items ?? []
        setShots(nextShots)

        const results = await Promise.all(
          nextShots.map((s) =>
            StudioPrepDraftsService.getPrepDraftsForShotApiV1StudioPrepDraftsProjectIdChapterIdShotIdGet({
              projectId,
              chapterId,
              shotId: s.id,
            }),
          ),
        )

        const draftById: Record<string, { draftType: ImportDraftType; name: string; description: string }> = {}
        const allItems: Record<string, DraftItem> = {}

        for (const r of results) {
          const data = r.data
          if (!data) continue

          ;(data.characters ?? []).forEach((d: ImportCharacterDraftRead) => {
            draftById[d.id] = { draftType: 'character', name: d.name, description: d.description ?? '' }
          })
          ;(data.scenes ?? []).forEach((d: ImportSceneDraftRead) => {
            draftById[d.id] = { draftType: 'scene', name: d.name, description: d.description ?? '' }
          })
          ;(data.props ?? []).forEach((d: ImportPropDraftRead) => {
            draftById[d.id] = { draftType: 'prop', name: d.name, description: d.description ?? '' }
          })
          ;(data.costumes ?? []).forEach((d: ImportCostumeDraftRead) => {
            draftById[d.id] = { draftType: 'costume', name: d.name, description: d.description ?? '' }
          })

          ;(data.occurrences ?? []).forEach((occ: ImportDraftOccurrenceRead) => {
            const info = draftById[occ.draft_id]
            const draftType = occ.draft_type
            const name = info?.name ?? occ.draft_id
            const description = info?.description ?? ''
            const key = `${draftType}:${name}`

            if (!allItems[key]) {
              allItems[key] = {
                draftType,
                name,
                description,
                occurrences: [],
              }
            }
            allItems[key].occurrences.push({ occurrence: occ })
          })
        }

        setDraftItemsByKey(allItems)
        const first = Object.values(allItems).find((it) => it.draftType === tabKeyToDraftType[activeTab])
        if (first) setSelectedKey(`${first.draftType}:${first.name}`)
      } catch {
        // keep empty state
      } finally {
        setLoading(false)
      }
    }

    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, chapterId])

  if (!projectId || !chapterId) {
    return <Empty description="缺少 projectId / chapterId" />
  }

  return (
    <Card title="拍摄准备（草稿）" style={{ padding: 0 }} bodyStyle={{ padding: 12 }}>
      <Tabs items={tabs} activeKey={activeTab} onChange={(k) => setActiveTab(k as TabKey)} />

      <div style={{ marginTop: 12, display: 'flex', gap: 12, minHeight: 0, overflow: 'hidden' }}>
        <div style={{ width: 320, borderRight: '1px solid rgba(0,0,0,0.06)', paddingRight: 12, overflow: 'auto' }}>
          {loading ? (
            <div style={{ padding: 24 }}>
              <Spin />
            </div>
          ) : itemsForActiveTab.length === 0 ? (
            <Empty description="暂无草稿" />
          ) : (
            <List
              size="small"
              dataSource={itemsForActiveTab}
              renderItem={(it) => {
                const key = `${it.draftType}:${it.name}`
                const active = key === selectedKey
                return (
                  <List.Item
                    onClick={() => setSelectedKey(key)}
                    style={{
                      cursor: 'pointer',
                      borderRadius: 8,
                      border: active ? '1px solid rgba(22,119,255,0.35)' : '1px solid transparent',
                      background: active ? 'rgba(22, 119, 255, 0.08)' : 'transparent',
                    }}
                  >
                    <div className="min-w-0 w-full">
                      <div className="truncate font-medium">{it.name}</div>
                      <div style={{ marginTop: 4, display: 'flex', gap: 8, alignItems: 'center' }}>
                        <Badge count={it.occurrences.length} />
                        <span style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>出现次数</span>
                      </div>
                    </div>
                  </List.Item>
                )
              }}
            />
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0, overflow: 'auto' }}>
          {selectedKey ? (
            (() => {
              const it = draftItemsByKey[selectedKey]
              if (!it) return null

              return (
                <div className="space-y-3">
                  <div className="font-medium text-base">{it.name}</div>
                  <div style={{ fontSize: 13, color: 'rgba(0,0,0,0.65)' }}>{it.description || '（无描述）'}</div>

                  <div style={{ marginTop: 10 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>出现于镜头</div>
                    {it.occurrences.length === 0 ? (
                      <Empty description="暂无出现记录" />
                    ) : (
                      <List
                        size="small"
                        dataSource={it.occurrences}
                        renderItem={(o) => {
                          const sh = shotById[o.occurrence.shot_id]
                          return (
                            <List.Item style={{ padding: '6px 0' }}>
                              <div className="min-w-0">
                                <div className="truncate">{sh ? `#${sh.index} ${sh.title ?? ''}` : o.occurrence.shot_id}</div>
                              </div>
                            </List.Item>
                          )
                        }}
                      />
                    )}
                  </div>

                  {activeTab === 'characters' ? (
                    <PrepDraftCharactersPanel
                      projectId={projectId}
                      chapterId={chapterId}
                      name={it.name}
                      description={it.description}
                      occurrences={it.occurrences}
                      characterNamesByShot={characterNamesByShot}
                    />
                  ) : activeTab === 'scenes' ? (
                    <PrepDraftScenesPanel projectId={projectId} chapterId={chapterId} name={it.name} description={it.description} />
                  ) : activeTab === 'props' ? (
                    <PrepDraftPropsPanel projectId={projectId} chapterId={chapterId} name={it.name} description={it.description} />
                  ) : activeTab === 'costumes' ? (
                    <PrepDraftCostumesPanel projectId={projectId} chapterId={chapterId} name={it.name} description={it.description} />
                  ) : null}
                </div>
              )
            })()
          ) : (
            <Empty description="请选择左侧草稿" />
          )}
        </div>
      </div>
    </Card>
  )
}

