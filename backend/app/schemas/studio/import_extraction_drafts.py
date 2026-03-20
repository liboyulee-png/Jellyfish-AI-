"""import-from-extraction 草稿相关 schemas：用于“拍摄准备”页的数据提供与关联更新。"""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field

from app.models.studio import ImportDraftType


class ImportDraftOccurrenceRead(BaseModel):
    id: str = Field(..., description="出现位置记录 ID（occurrence）")
    project_id: str = Field(..., description="项目 ID")
    chapter_id: str = Field(..., description="章节 ID")
    shot_id: str = Field(..., description="镜头（shot）ID")
    draft_type: ImportDraftType = Field(..., description="草稿类型")
    draft_id: str = Field(..., description="草稿主表 ID")

    class Config:
        from_attributes = True


class ImportCharacterDraftRead(BaseModel):
    id: str = Field(..., description="角色草稿 ID")
    project_id: str = Field(..., description="项目 ID")
    name: str = Field(..., description="角色名称")
    description: str = Field("", description="提取到的角色描述")

    tags: list[str] = Field(default_factory=list, description="提取标签（JSON）")
    raw_extra: dict[str, Any] = Field(default_factory=dict, description="提取扩展信息（JSON）")

    class Config:
        from_attributes = True


class ImportSceneDraftRead(BaseModel):
    id: str = Field(..., description="场景草稿 ID")
    project_id: str = Field(..., description="项目 ID")
    name: str = Field(..., description="场景名称")
    description: str = Field("", description="提取到的场景描述")

    tags: list[str] = Field(default_factory=list, description="提取标签（JSON）")
    raw_extra: dict[str, Any] = Field(default_factory=dict, description="提取扩展信息（JSON）")

    class Config:
        from_attributes = True


class ImportPropDraftRead(BaseModel):
    id: str = Field(..., description="道具草稿 ID")
    project_id: str = Field(..., description="项目 ID")
    name: str = Field(..., description="道具名称")
    description: str = Field("", description="提取到的道具描述")

    tags: list[str] = Field(default_factory=list, description="提取标签（JSON）")
    raw_extra: dict[str, Any] = Field(default_factory=dict, description="提取扩展信息（JSON）")

    class Config:
        from_attributes = True


class ImportCostumeDraftRead(BaseModel):
    id: str = Field(..., description="服装草稿 ID")
    project_id: str = Field(..., description="项目 ID")
    name: str = Field(..., description="服装名称")
    description: str = Field("", description="提取到的服装描述")

    tags: list[str] = Field(default_factory=list, description="提取标签（JSON）")
    raw_extra: dict[str, Any] = Field(default_factory=dict, description="提取扩展信息（JSON）")

    class Config:
        from_attributes = True


