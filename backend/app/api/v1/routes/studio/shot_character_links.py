"""镜头-角色阵容：ShotCharacterLink 创建/更新接口。"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db
from app.models.studio import Chapter, Character, Shot, ShotCharacterLink
from app.schemas.common import ApiResponse, success_response
from app.schemas.studio.cast import ShotCharacterLinkCreate, ShotCharacterLinkRead

router = APIRouter()


@router.post(
    "",
    response_model=ApiResponse[ShotCharacterLinkRead],
    summary="创建/更新镜头角色关联（ShotCharacterLink）",
)
async def upsert_shot_character_link(
    body: ShotCharacterLinkCreate,
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[ShotCharacterLinkRead]:
    shot = await db.get(Shot, body.shot_id)
    if shot is None:
        raise HTTPException(status_code=404, detail="Shot not found")

    chapter = await db.get(Chapter, shot.chapter_id)
    if chapter is None:
        raise HTTPException(status_code=400, detail="Chapter not found for shot")

    character = await db.get(Character, body.character_id)
    if character is None:
        raise HTTPException(status_code=404, detail="Character not found")

    if character.project_id != chapter.project_id:
        raise HTTPException(status_code=400, detail="Character does not belong to the same project")

    existing_same_character_stmt = select(ShotCharacterLink).where(
        ShotCharacterLink.shot_id == body.shot_id,
        ShotCharacterLink.character_id == body.character_id,
    )
    existing = (await db.execute(existing_same_character_stmt)).scalars().one_or_none()

    if existing is not None:
        existing.index = body.index
        existing.note = body.note
        await db.flush()
        await db.refresh(existing)
        return success_response(ShotCharacterLinkRead.model_validate(existing))

    # 避免 shot_id + index 唯一冲突：如果 index 已被其他角色占用，则删除旧的记录
    existing_same_index_stmt = select(ShotCharacterLink).where(
        ShotCharacterLink.shot_id == body.shot_id,
        ShotCharacterLink.index == body.index,
    )
    existing_same_index = (await db.execute(existing_same_index_stmt)).scalars().one_or_none()
    if existing_same_index is not None:
        await db.execute(delete(ShotCharacterLink).where(ShotCharacterLink.id == existing_same_index.id))

    obj = ShotCharacterLink(
        shot_id=body.shot_id,
        character_id=body.character_id,
        index=body.index,
        note=body.note,
    )
    db.add(obj)
    await db.flush()
    await db.refresh(obj)
    return success_response(ShotCharacterLinkRead.model_validate(obj))

