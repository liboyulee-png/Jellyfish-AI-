import { useEffect, useMemo, useState } from 'react'
import { Button, Empty, Input, Modal, Pagination, Select, Space, Spin, Tag, message } from 'antd'
import type { ImportDraftOccurrenceRead, ShotDialogLineRead, ShotDialogLineUpdate } from '../../../../services/generated'
import { StudioEntitiesApi } from '../../../../services/studioEntities'
import {
  StudioShotCharacterLinksService,
  StudioShotDetailsService,
  StudioShotDialogLinesService,
  StudioShotLinksService,
} from '../../../../services/generated'
import { DisplayImageCard } from '../../assets/components/DisplayImageCard'
import { resolveAssetUrl } from '../../assets/utils'

type CharacterEntitySummary = { id: string; name: string; project_id?: string }

type ActorLike = { id: string; name: string; description?: string | null; thumbnail?: string }

type Props = {
  projectId?: string
  chapterId?: string
  name: string
  description?: string
  occurrences: Array<{ occurrence: ImportDraftOccurrenceRead }>
  characterNamesByShot: Record<string, string[]>
}

function makeId(prefix: string) {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

export function PrepDraftCharactersPanel({ projectId, chapterId, name, description, occurrences, characterNamesByShot }: Props) {
  const [characterExists, setCharacterExists] = useState<CharacterEntitySummary | null>(null)
  const [actorSearch, setActorSearch] = useState('')
  const [linkedActors, setLinkedActors] = useState<ActorLike[]>([])
  const [linkedActorsLoading, setLinkedActorsLoading] = useState(false)
  const [selectedActorId, setSelectedActorId] = useState<string | null>(null)
  const [characterBusy, setCharacterBusy] = useState(false)

  const [actorPage, setActorPage] = useState(1)
  const ACTOR_PAGE_SIZE = 3

  const [roleModalOpen, setRoleModalOpen] = useState(false)
  const [roleCreating, setRoleCreating] = useState(false)
  const [roleNameDraft, setRoleNameDraft] = useState('')
  const [roleDescDraft, setRoleDescDraft] = useState('')
  const [roleActorIdDraft, setRoleActorIdDraft] = useState<string | undefined>(undefined)

  const shotIds = useMemo(() => Array.from(new Set(occurrences.map((o) => o.occurrence.shot_id))), [occurrences])

  const filteredLinkedActors = useMemo(() => {
    const q = actorSearch.trim().toLowerCase()
    if (!q) return linkedActors
    return linkedActors.filter((a) => (a.name ?? '').toLowerCase().includes(q))
  }, [actorSearch, linkedActors])

  const pagedLinkedActors = useMemo(() => {
    const start = (actorPage - 1) * ACTOR_PAGE_SIZE
    return filteredLinkedActors.slice(start, start + ACTOR_PAGE_SIZE)
  }, [actorPage, filteredLinkedActors])

  useEffect(() => {
    if (!projectId || !chapterId) return

    setActorSearch('')
    setActorPage(1)
    setSelectedActorId(null)
    setCharacterExists(null)

    void (async () => {
      await Promise.all([refreshCharacterExists(), loadLinkedActors()])
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, chapterId, name])

  const loadLinkedActors = async () => {
    if (!projectId || !chapterId) return
    setLinkedActorsLoading(true)
    try {
      const pageSize = 100
      let page = 1
      let total = 0
      const allLinks: any[] = []

      while (true) {
        const res = await StudioShotLinksService.listProjectEntityLinksApiV1StudioShotLinksEntityTypeGet({
          entityType: 'actor',
          projectId,
          chapterId: null, // 不按 chapter_id 过滤，直接获取项目级关联演员
          shotId: null,
          assetId: null,
          order: null,
          isDesc: false,
          page,
          pageSize,
        })

        const items = res.data?.items ?? []
        allLinks.push(...items)
        total = res.data?.pagination?.total ?? items.length

        if (page * pageSize >= total) break
        page += 1
      }

      const actorIds = Array.from(new Set(allLinks.map((l) => (l as any).actor_id).filter(Boolean))) as string[]
      const fetched = await Promise.all(
        actorIds.map((id) =>
          StudioEntitiesApi.get('actor', id)
            .then((r) => (r.data ?? null) as ActorLike | null)
            .catch(() => null),
        ),
      )

      const next = fetched.filter(Boolean) as ActorLike[]
      next.sort((a, b) => a.name.localeCompare(b.name))
      setLinkedActors(next)
    } catch {
      message.error('加载项目关联演员失败')
      setLinkedActors([])
    } finally {
      setLinkedActorsLoading(false)
    }
  }

  const refreshCharacterExists = async () => {
    if (!projectId || !chapterId) return
    try {
      setCharacterExists(null)
      const res = await StudioEntitiesApi.list('character', {
        q: name,
        page: 1,
        pageSize: 100,
        order: null,
        isDesc: true,
      })
      const items = (res.data?.items ?? []) as Array<CharacterEntitySummary>
      const found =
        items.find((x) => (x.project_id ?? null) === projectId && x.name === name) ?? null
      setCharacterExists(found)
    } catch {
      setCharacterExists(null)
    }
  }

  const patchDialogLinesForCharacter = async (params: { shotIds: string[]; characterName: string; characterId: string }) => {
    const { shotIds, characterName, characterId } = params
    await Promise.all(
      shotIds.map(async (sid) => {
        const shotDetailsRes = await StudioShotDetailsService.listShotDetailsApiV1StudioShotDetailsGet({
          shotId: sid,
          page: 1,
          pageSize: 50,
        })
        const details = shotDetailsRes.data?.items ?? []

        await Promise.all(
          details.map(async (detail) => {
            const resLines = await StudioShotDialogLinesService.listShotDialogLinesApiV1StudioShotDialogLinesGet({
              shotDetailId: detail.id,
              page: 1,
              pageSize: 200,
            })
            const lines = resLines.data?.items ?? []

            await Promise.all(
              lines.map(async (ln) => {
                const speakerName = (ln as ShotDialogLineRead).speaker_name
                const targetName = (ln as ShotDialogLineRead).target_name
                const speakerEmpty = (ln as ShotDialogLineRead).speaker_character_id === null || (ln as ShotDialogLineRead).speaker_character_id === undefined
                const targetEmpty = (ln as ShotDialogLineRead).target_character_id === null || (ln as ShotDialogLineRead).target_character_id === undefined

                const payload: ShotDialogLineUpdate = {}
                let shouldPatch = false
                if (speakerName === characterName && speakerEmpty) {
                  payload.speaker_character_id = characterId
                  shouldPatch = true
                }
                if (targetName === characterName && targetEmpty) {
                  payload.target_character_id = characterId
                  shouldPatch = true
                }

                if (!shouldPatch) return
                return StudioShotDialogLinesService.updateShotDialogLineApiV1StudioShotDialogLinesLineIdPatch({
                  lineId: (ln as ShotDialogLineRead).id,
                  requestBody: payload,
                })
              }),
            )
          }),
        )
      }),
    )
  }

  useEffect(() => {
    setActorPage(1)
  }, [actorSearch])

  return (
    <>
      <div style={{ marginTop: 6 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>关联角色与回填对白</div>
        {characterBusy ? (
          <div style={{ padding: '8px 0' }}>
            <Spin size="small" />
          </div>
        ) : characterExists ? (
          <Space wrap>
            <Tag color="green">角色已存在</Tag>
            <Button
              type="primary"
              onClick={async () => {
                if (!projectId || !chapterId) return
                setCharacterBusy(true)
                try {
                  const charId = characterExists.id as string
                  await Promise.all(
                    shotIds.map(async (sid) => {
                      const idx = characterNamesByShot[sid]?.indexOf(name) ?? 0
                      return StudioShotCharacterLinksService.upsertShotCharacterLinkApiV1StudioShotCharacterLinksPost({
                        requestBody: {
                          shot_id: sid,
                          character_id: charId,
                          index: idx,
                          note: '',
                        },
                      })
                    }),
                  )

                  await patchDialogLinesForCharacter({
                    shotIds,
                    characterName: name,
                    characterId: charId,
                  })

                  message.success('已配置角色到镜头并回填对白')
                  await refreshCharacterExists()
                } catch {
                  message.error('角色配置失败')
                } finally {
                  setCharacterBusy(false)
                }
              }}
            >
              配置到镜头并回填
            </Button>
          </Space>
        ) : (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <Input placeholder="按名称过滤关联演员" value={actorSearch} onChange={(e) => setActorSearch(e.target.value)} allowClear style={{ width: 280 }} />
            </div>

            <div style={{ marginTop: 12 }}>
              {linkedActorsLoading ? (
                <div style={{ padding: '8px 0' }}>
                  <Spin size="small" />
                </div>
              ) : filteredLinkedActors.length === 0 ? (
                <Empty description="暂无可关联的演员" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {pagedLinkedActors.map((a) => {
                      const selected = selectedActorId === a.id
                      return (
                        <div key={a.id} className={`cursor-pointer ${selected ? 'ring-2 ring-blue-500 rounded-md' : ''}`} onClick={() => setSelectedActorId(a.id)}>
                          <DisplayImageCard
                            title={<div className="truncate">{a.name}</div>}
                            imageUrl={resolveAssetUrl(a.thumbnail)}
                            imageAlt={a.name}
                            placeholder="未生成"
                            enablePreview={false}
                            meta={<div className="text-xs text-gray-500 line-clamp-2">{a.description || '—'}</div>}
                            extra={selected ? <Tag color="blue">已选</Tag> : undefined}
                          />
                        </div>
                      )
                    })}
                  </div>

                  <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
                    <Pagination current={actorPage} pageSize={ACTOR_PAGE_SIZE} total={filteredLinkedActors.length} showSizeChanger={false} onChange={(p) => setActorPage(p)} />
                  </div>
                </>
              )}
            </div>

            <div style={{ marginTop: 12 }}>
              <Button
                type="primary"
                disabled={!selectedActorId}
                onClick={() => {
                  if (!selectedActorId) return
                  setRoleNameDraft(name)
                  setRoleDescDraft(description || '')
                  setRoleActorIdDraft(selectedActorId ?? undefined)
                  setRoleModalOpen(true)
                }}
              >
                创建并配置
              </Button>
            </div>
          </div>
        )}
      </div>

      <Modal
        title="新建角色"
        open={roleModalOpen}
        onCancel={() => setRoleModalOpen(false)}
        onOk={async () => {
          if (!projectId) return
          if (!roleActorIdDraft) {
            message.warning('请选择关联演员')
            return
          }
          setRoleCreating(true)
          try {
            const tmpId = makeId('char')
            const payload: Record<string, unknown> = {
              id: tmpId,
              project_id: projectId,
              name: roleNameDraft,
              description: roleDescDraft || '',
              actor_id: roleActorIdDraft,
              costume_id: null,
            }
            const created = await StudioEntitiesApi.create('character', payload)
            const charId: string = created.data?.id ?? tmpId

            await Promise.all(
              shotIds.map(async (sid) => {
                const idx = characterNamesByShot[sid]?.indexOf(name) ?? 0
                return StudioShotCharacterLinksService.upsertShotCharacterLinkApiV1StudioShotCharacterLinksPost({
                  requestBody: {
                    shot_id: sid,
                    character_id: charId,
                    index: idx,
                    note: '',
                  },
                })
              }),
            )

            await patchDialogLinesForCharacter({
              shotIds,
              characterName: name,
              characterId: charId,
            })

            message.success('已创建角色并配置到镜头并回填对白')
            await refreshCharacterExists()
            setRoleModalOpen(false)
          } catch {
            message.error('创建/配置角色失败')
          } finally {
            setRoleCreating(false)
          }
        }}
        okText="创建"
        cancelText="取消"
        confirmLoading={roleCreating}
        width={560}
      >
        <div className="space-y-3">
          <div>
            <div className="text-sm text-gray-600 mb-1">角色名称</div>
            <Input value={roleNameDraft} onChange={(e) => setRoleNameDraft(e.target.value)} />
          </div>
          <div>
            <div className="text-sm text-gray-600 mb-1">描述（可选）</div>
            <Input.TextArea rows={3} value={roleDescDraft} onChange={(e) => setRoleDescDraft(e.target.value)} />
          </div>
          <div>
            <div className="text-sm text-gray-600 mb-1">关联演员（必填）</div>
            <Select
              className="w-full"
              placeholder="选择当前项目已关联的演员"
              showSearch
              value={roleActorIdDraft}
              onChange={(v) => {
                const id = typeof v === 'string' ? v : String(v)
                setRoleActorIdDraft(id)
                setSelectedActorId(id)
              }}
              options={linkedActors.map((a) => ({
                value: a.id,
                searchLabel: a.name,
                label: (
                  <div className="flex items-center gap-2 min-w-0">
                    {resolveAssetUrl(a.thumbnail) ? (
                      <img src={resolveAssetUrl(a.thumbnail)} alt="" className="w-6 h-6 rounded object-cover shrink-0" />
                    ) : (
                      <div className="w-6 h-6 rounded bg-gray-100 flex items-center justify-center text-gray-400 shrink-0">—</div>
                    )}
                    <div className="min-w-0 truncate">{a.name}</div>
                  </div>
                ),
              }))}
              optionFilterProp="searchLabel"
              filterOption={(input, option) => String((option as any)?.searchLabel ?? '').toLowerCase().includes(input.toLowerCase())}
            />
          </div>
        </div>
      </Modal>
    </>
  )
}

