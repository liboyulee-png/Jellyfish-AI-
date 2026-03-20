"""拍摄准备页：import-from-extraction 草稿数据提供者。"""

from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db
from app.models.studio import (
    ImportCharacterDraft,
    ImportCostumeDraft,
    ImportDraftShotOccurrence,
    ImportDraftType,
    ImportPropDraft,
    ImportSceneDraft,
)
from app.schemas.common import ApiResponse, success_response
from app.schemas.studio.import_extraction_drafts import (
    ImportCharacterDraftRead,
    ImportCostumeDraftRead,
    ImportDraftOccurrenceRead,
    ImportPropDraftRead,
    ImportSceneDraftRead,
)

router = APIRouter()


class PrepDraftShotRead(BaseModel):
    project_id: str
    chapter_id: str
    shot_id: str
    occurrences: list[ImportDraftOccurrenceRead] = Field(default_factory=list)

    characters: list[ImportCharacterDraftRead] = Field(default_factory=list)
    scenes: list[ImportSceneDraftRead] = Field(default_factory=list)
    props: list[ImportPropDraftRead] = Field(default_factory=list)
    costumes: list[ImportCostumeDraftRead] = Field(default_factory=list)


@router.get(
    "/prep-drafts/{project_id}/{chapter_id}/{shot_id}",
    response_model=ApiResponse[PrepDraftShotRead],
    summary="获取某镜头相关的 import 草稿（含出现位置）",
)
async def get_prep_drafts_for_shot(
    project_id: str,
    chapter_id: str,
    shot_id: str,
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[PrepDraftShotRead]:
    occ_stmt = (
        select(ImportDraftShotOccurrence)
        .where(
            ImportDraftShotOccurrence.project_id == project_id,
            ImportDraftShotOccurrence.chapter_id == chapter_id,
            ImportDraftShotOccurrence.shot_id == shot_id,
        )
    )
    occ_items = (await db.execute(occ_stmt)).scalars().all()

    draft_ids_by_type: dict[ImportDraftType, list[str]] = {
        ImportDraftType.character: [],
        ImportDraftType.scene: [],
        ImportDraftType.prop: [],
        ImportDraftType.costume: [],
    }
    for o in occ_items:
        draft_type = ImportDraftType(o.draft_type)
        draft_ids_by_type[draft_type].append(o.draft_id)

    # occurrence 已经决定了类型与范围；这里按类型批量拉取主表
    characters: list[ImportCharacterDraft] = []
    if draft_ids_by_type[ImportDraftType.character]:
        stmt = select(ImportCharacterDraft).where(ImportCharacterDraft.id.in_(draft_ids_by_type[ImportDraftType.character]))
        characters = list((await db.execute(stmt)).scalars().all())

    scenes: list[ImportSceneDraft] = []
    if draft_ids_by_type[ImportDraftType.scene]:
        stmt = select(ImportSceneDraft).where(ImportSceneDraft.id.in_(draft_ids_by_type[ImportDraftType.scene]))
        scenes = list((await db.execute(stmt)).scalars().all())

    props: list[ImportPropDraft] = []
    if draft_ids_by_type[ImportDraftType.prop]:
        stmt = select(ImportPropDraft).where(ImportPropDraft.id.in_(draft_ids_by_type[ImportDraftType.prop]))
        props = list((await db.execute(stmt)).scalars().all())

    costumes: list[ImportCostumeDraft] = []
    if draft_ids_by_type[ImportDraftType.costume]:
        stmt = select(ImportCostumeDraft).where(ImportCostumeDraft.id.in_(draft_ids_by_type[ImportDraftType.costume]))
        costumes = list((await db.execute(stmt)).scalars().all())

    payload = PrepDraftShotRead(
        project_id=project_id,
        chapter_id=chapter_id,
        shot_id=shot_id,
        occurrences=[ImportDraftOccurrenceRead.model_validate(x) for x in occ_items],
        characters=[ImportCharacterDraftRead.model_validate(x) for x in characters],
        scenes=[ImportSceneDraftRead.model_validate(x) for x in scenes],
        props=[ImportPropDraftRead.model_validate(x) for x in props],
        costumes=[ImportCostumeDraftRead.model_validate(x) for x in costumes],
    )
    return success_response(payload)

