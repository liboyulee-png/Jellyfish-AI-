"""脚本处理 Agent：分镜分割、信息提取、实体合并、变体分析、一致性检查、输出编译。"""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field

from app.core.skills_runtime import SKILL_REGISTRY
from app.chains.agents.base import SkillAgentBase


# ============================================================================
# 1. ScriptDividerAgent - 剧本自动分镜
# ============================================================================

class ShotDivision(BaseModel):
    """单个镜头分割信息：起止行号 + 预览文本。"""
    shot_index: int = Field(..., description="镜头序号（从1开始）")
    start_line: int = Field(..., description="起始行号（1-based）")
    end_line: int = Field(..., description="结束行号（1-based）")
    preview_text: str = Field(..., description="该镜头的文本预览（前100字）")
    location: str | None = Field(None, description="推断的地点（可选）")
    time_of_day: str | None = Field(None, description="推断的时间（日/夜/不明，可选）")
    key_characters: list[str] = Field(default_factory=list, description="主要角色名单")


class ScriptDivisionResult(BaseModel):
    """剧本分镜结果：镜头列表（每镜起止行号+预览文本）。"""
    shots: list[ShotDivision] = Field(..., description="分镜列表")
    total_shots: int = Field(..., description="总镜头数")
    notes: str | None = Field(None, description="拆分说明或建议（可选）")


class ScriptDividerAgent(SkillAgentBase[ScriptDivisionResult]):
    """剧本自动分镜：输入完整剧本文本，输出分镜列表。"""

    SCRIPT_DIVIDER_SKILL_IDS = ("script_divider",)

    def load_skill(self, skill_id: str) -> None:
        if skill_id not in self.SCRIPT_DIVIDER_SKILL_IDS or skill_id not in SKILL_REGISTRY:
            raise ValueError(
                f"Unknown or invalid script_divider skill_id: {skill_id}. "
                f"Allowed: {self.SCRIPT_DIVIDER_SKILL_IDS}"
            )
        self._prompt, self._output_model = SKILL_REGISTRY[skill_id]
        self._skill_id = skill_id
        self._structured_chain = None

    def _normalize(self, data: dict[str, Any]) -> dict[str, Any]:
        """规范化脚本分割结果。"""
        data = dict(data)
        if "shots" in data and isinstance(data["shots"], list):
            shots = []
            for idx, shot in enumerate(data["shots"]):
                shot = dict(shot) if isinstance(shot, dict) else {"preview_text": str(shot)}
                if "shot_index" not in shot:
                    shot["shot_index"] = idx + 1
                shots.append(shot)
            data["shots"] = shots
        if "total_shots" not in data and "shots" in data:
            data["total_shots"] = len(data["shots"])
        return data


# ============================================================================
# 2. ElementExtractorAgent - 逐镜信息提取
# ============================================================================

class ShotElements(BaseModel):
    """单镜提取的元素信息。"""
    characters: list[str] = Field(default_factory=list, description="出现的角色名单")
    locations: list[str] = Field(default_factory=list, description="涉及的地点名单")
    costumes: list[str] = Field(default_factory=list, description="提及的服装/造型描述")
    props: list[str] = Field(default_factory=list, description="涉及的道具名单")
    dialogues: list[str] = Field(default_factory=list, description="对白列表")
    actions: list[str] = Field(default_factory=list, description="动作/场景描述")


class ShotElementExtractionResult(BaseModel):
    """单镜信息提取结果。"""
    shot_index: int = Field(..., description="镜头序号")
    elements: ShotElements = Field(..., description="提取的元素")
    confidence: float | None = Field(None, ge=0, le=1, description="提取置信度（0-1）")
    notes: str | None = Field(None, description="提取说明或不确定项")


class ElementExtractorAgent(SkillAgentBase[ShotElementExtractionResult]):
    """逐镜信息提取：输入单镜文本+上文摘要，输出该镜的角色/场景/服装/道具/对话/动作。"""

    ELEMENT_EXTRACTOR_SKILL_IDS = ("shot_element_extractor",)

    def load_skill(self, skill_id: str) -> None:
        if skill_id not in self.ELEMENT_EXTRACTOR_SKILL_IDS or skill_id not in SKILL_REGISTRY:
            raise ValueError(
                f"Unknown or invalid element_extractor skill_id: {skill_id}. "
                f"Allowed: {self.ELEMENT_EXTRACTOR_SKILL_IDS}"
            )
        self._prompt, self._output_model = SKILL_REGISTRY[skill_id]
        self._skill_id = skill_id
        self._structured_chain = None

    def _normalize(self, data: dict[str, Any]) -> dict[str, Any]:
        """规范化元素提取结果。"""
        data = dict(data)
        if "elements" not in data or not isinstance(data["elements"], dict):
            data["elements"] = {}
        elements = data["elements"]
        for key in ("characters", "locations", "costumes", "props", "dialogues", "actions"):
            if key not in elements or not isinstance(elements[key], list):
                elements[key] = []
        data["elements"] = elements
        if "confidence" not in data:
            data["confidence"] = None
        return data


# ============================================================================
# 3. EntityMergerAgent - 跨镜静态合并 + 基础画像生成
# ============================================================================

class EntityEntry(BaseModel):
    """单个实体条目（角色/场景/道具）。"""
    id: str = Field(..., description="实体ID")
    name: str = Field(..., description="实体名称")
    type: str = Field(..., description="实体类型（character/location/prop）")
    definition: str = Field(..., description="定义/描述")
    first_shot: int | None = Field(None, description="首次出现的镜头序号")
    appearances: list[int] = Field(default_factory=list, description="出现镜头列表")
    variants: list[dict[str, Any]] = Field(default_factory=list, description="变体列表（如服装变化）")


class EntityLibrary(BaseModel):
    """合并后的实体库。"""
    characters: list[EntityEntry] = Field(default_factory=list, description="角色库")
    locations: list[EntityEntry] = Field(default_factory=list, description="场景库")
    props: list[EntityEntry] = Field(default_factory=list, description="道具库")
    total_entries: int = Field(..., description="总实体数")


class EntityMergeResult(BaseModel):
    """实体合并结果。"""
    merged_library: EntityLibrary = Field(..., description="合并后的实体库")
    merge_stats: dict[str, Any] = Field(default_factory=dict, description="合并统计信息")
    conflicts: list[str] = Field(default_factory=list, description="发现的冲突/待处理项")
    notes: str | None = Field(None, description="合并说明")


class EntityMergerAgent(SkillAgentBase[EntityMergeResult]):
    """跨镜静态合并 + 基础画像生成：输入全部分镜提取结果+历史实体库，输出合并后的库。"""

    ENTITY_MERGER_SKILL_IDS = ("entity_merger",)

    def load_skill(self, skill_id: str) -> None:
        if skill_id not in self.ENTITY_MERGER_SKILL_IDS or skill_id not in SKILL_REGISTRY:
            raise ValueError(
                f"Unknown or invalid entity_merger skill_id: {skill_id}. "
                f"Allowed: {self.ENTITY_MERGER_SKILL_IDS}"
            )
        self._prompt, self._output_model = SKILL_REGISTRY[skill_id]
        self._skill_id = skill_id
        self._structured_chain = None

    def _normalize(self, data: dict[str, Any]) -> dict[str, Any]:
        """规范化实体合并结果。"""
        data = dict(data)
        if "merged_library" not in data:
            data["merged_library"] = {
                "characters": [],
                "locations": [],
                "props": [],
                "total_entries": 0,
            }
        lib = data["merged_library"]
        if "total_entries" not in lib:
            lib["total_entries"] = (
                len(lib.get("characters", [])) +
                len(lib.get("locations", [])) +
                len(lib.get("props", []))
            )
        if "merge_stats" not in data:
            data["merge_stats"] = {}
        if "conflicts" not in data or not isinstance(data["conflicts"], list):
            data["conflicts"] = []
        return data


# ============================================================================
# 4. VariantAnalyzerAgent - 服装/外形变体检测与建议
# ============================================================================

class CostumeTimeline(BaseModel):
    """单角色的服装演变时间线。"""
    character_id: str = Field(..., description="角色ID")
    character_name: str = Field(..., description="角色名称")
    timeline_entries: list[dict[str, Any]] = Field(
        default_factory=list,
        description="时间线条目：shot_index, costume_description, changes"
    )


class VariantSuggestion(BaseModel):
    """变体建议。"""
    entity_id: str = Field(..., description="实体ID")
    entity_name: str = Field(..., description="实体名称")
    entity_type: str = Field(..., description="实体类型（character/prop/location）")
    suggestion: str = Field(..., description="变体建议说明")
    affected_shots: list[int] = Field(default_factory=list, description="涉及的镜头")


class VariantAnalysisResult(BaseModel):
    """变体分析结果。"""
    costume_timelines: list[CostumeTimeline] = Field(
        default_factory=list,
        description="各角色服装演变时间线"
    )
    variant_suggestions: list[VariantSuggestion] = Field(
        default_factory=list,
        description="变体建议列表"
    )
    chapter_variants: dict[str, list[str]] = Field(
        default_factory=dict,
        description="章节变体建议"
    )
    notes: str | None = Field(None, description="分析说明")


class VariantAnalyzerAgent(SkillAgentBase[VariantAnalysisResult]):
    """服装/外形变体检测与建议：输入合并后的实体库+全部分镜提取，输出服装时间线+变体建议。"""

    VARIANT_ANALYZER_SKILL_IDS = ("variant_analyzer",)

    def load_skill(self, skill_id: str) -> None:
        if skill_id not in self.VARIANT_ANALYZER_SKILL_IDS or skill_id not in SKILL_REGISTRY:
            raise ValueError(
                f"Unknown or invalid variant_analyzer skill_id: {skill_id}. "
                f"Allowed: {self.VARIANT_ANALYZER_SKILL_IDS}"
            )
        self._prompt, self._output_model = SKILL_REGISTRY[skill_id]
        self._skill_id = skill_id
        self._structured_chain = None

    def _normalize(self, data: dict[str, Any]) -> dict[str, Any]:
        """规范化变体分析结果。"""
        data = dict(data)
        if "costume_timelines" not in data or not isinstance(data["costume_timelines"], list):
            data["costume_timelines"] = []
        if "variant_suggestions" not in data or not isinstance(data["variant_suggestions"], list):
            data["variant_suggestions"] = []
        if "chapter_variants" not in data or not isinstance(data["chapter_variants"], dict):
            data["chapter_variants"] = {}
        return data


# ============================================================================
# 5. ConsistencyCheckerAgent - 文本一致性检查
# ============================================================================

class ConsistencyWarning(BaseModel):
    """单条一致性检查警告。"""
    warning_type: str = Field(..., description="警告类型（character_name_conflict/location_inconsistency/等）")
    severity: str = Field(..., description="严重程度（low/medium/high）")
    description: str = Field(..., description="问题描述")
    entity_ids: list[str] = Field(default_factory=list, description="涉及的实体ID")
    affected_shots: list[int] = Field(default_factory=list, description="涉及的镜头序号")
    suggestion: str | None = Field(None, description="修正建议")


class ConsistencyCheckResult(BaseModel):
    """一致性检查结果。"""
    warnings: list[ConsistencyWarning] = Field(default_factory=list, description="警告列表")
    total_issues: int = Field(..., description="问题总数")
    critical_issues: int = Field(..., description="严重问题数（high severity）")
    consistency_score: float = Field(..., ge=0, le=100, description="一致性评分（0-100）")
    notes: str | None = Field(None, description="检查说明")


class ConsistencyCheckerAgent(SkillAgentBase[ConsistencyCheckResult]):
    """文本一致性检查：输入合并后的实体库+全部分镜提取，输出警告列表。"""

    CONSISTENCY_CHECKER_SKILL_IDS = ("consistency_checker",)

    def load_skill(self, skill_id: str) -> None:
        if skill_id not in self.CONSISTENCY_CHECKER_SKILL_IDS or skill_id not in SKILL_REGISTRY:
            raise ValueError(
                f"Unknown or invalid consistency_checker skill_id: {skill_id}. "
                f"Allowed: {self.CONSISTENCY_CHECKER_SKILL_IDS}"
            )
        self._prompt, self._output_model = SKILL_REGISTRY[skill_id]
        self._skill_id = skill_id
        self._structured_chain = None

    def _normalize(self, data: dict[str, Any]) -> dict[str, Any]:
        """规范化一致性检查结果。"""
        data = dict(data)
        if "warnings" not in data or not isinstance(data["warnings"], list):
            data["warnings"] = []
        if "total_issues" not in data:
            data["total_issues"] = len(data["warnings"])
        if "critical_issues" not in data:
            data["critical_issues"] = sum(
                1 for w in data["warnings"]
                if isinstance(w, dict) and w.get("severity") == "high"
            )
        if "consistency_score" not in data:
            # 简单评分：100 - (总问题数 * 权重 + 严重问题额外惩罚)
            total = data["total_issues"]
            critical = data["critical_issues"]
            data["consistency_score"] = max(0, 100 - (total * 2 + critical * 5))
        return data


# ============================================================================
# 6. OutputCompilerAgent - 最终输出打包
# ============================================================================

class TableData(BaseModel):
    """可直接导出的表格数据。"""
    table_type: str = Field(..., description="表格类型（character_table/location_table/prop_table/shot_table）")
    headers: list[str] = Field(..., description="表头")
    rows: list[list[Any]] = Field(..., description="行数据")
    row_count: int = Field(..., description="行数")


class OutputCompileResult(BaseModel):
    """最终输出编译结果。"""
    project_json: dict[str, Any] = Field(..., description="完整项目JSON")
    tables: list[TableData] = Field(default_factory=list, description="可导出的表格数据")
    export_stats: dict[str, Any] = Field(default_factory=dict, description="导出统计信息")
    summary: str | None = Field(None, description="项目总结")


class OutputCompilerAgent(SkillAgentBase[OutputCompileResult]):
    """最终输出打包：输入所有Agent最终状态，输出完整项目JSON + 表格数据。"""

    OUTPUT_COMPILER_SKILL_IDS = ("output_compiler",)

    def load_skill(self, skill_id: str) -> None:
        if skill_id not in self.OUTPUT_COMPILER_SKILL_IDS or skill_id not in SKILL_REGISTRY:
            raise ValueError(
                f"Unknown or invalid output_compiler skill_id: {skill_id}. "
                f"Allowed: {self.OUTPUT_COMPILER_SKILL_IDS}"
            )
        self._prompt, self._output_model = SKILL_REGISTRY[skill_id]
        self._skill_id = skill_id
        self._structured_chain = None

    def _normalize(self, data: dict[str, Any]) -> dict[str, Any]:
        """规范化输出编译结果。"""
        data = dict(data)
        if "project_json" not in data or not isinstance(data["project_json"], dict):
            data["project_json"] = {}
        if "tables" not in data or not isinstance(data["tables"], list):
            data["tables"] = []
        if "export_stats" not in data or not isinstance(data["export_stats"], dict):
            data["export_stats"] = {
                "total_tables": len(data["tables"]),
                "total_rows": sum(t.get("row_count", 0) for t in data["tables"]),
            }
        return data

