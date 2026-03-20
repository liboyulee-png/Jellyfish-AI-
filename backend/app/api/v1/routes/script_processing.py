"""脚本处理 API 接口：分镜、信息提取、实体合并、变体分析、一致性检查、输出编译。"""

from __future__ import annotations

import json
import logging
from typing import Any

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from app.chains.agents import (
    ScriptDividerAgent,
    ElementExtractorAgent,
    EntityMergerAgent,
    VariantAnalyzerAgent,
    ConsistencyCheckerAgent,
    OutputCompilerAgent,
)
from app.chains.agents.script_processing_agents import (
    ScriptDivisionResult,
    ShotElementExtractionResult,
    EntityMergeResult,
    VariantAnalysisResult,
    ConsistencyCheckResult,
    OutputCompileResult,
)
from app.schemas.common import ApiResponse, success_response
from langchain_openai import ChatOpenAI

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/script-processing", tags=["script-processing"])

# 初始化 LLM（可从配置获取）
_llm = None


def get_llm() -> ChatOpenAI:
    """获取或创建 LLM 实例。"""
    global _llm
    if _llm is None:
        _llm = ChatOpenAI(model="gpt-4", temperature=0)
    return _llm


# ============================================================================
# 1. ScriptDividerAgent - 剧本分镜
# ============================================================================

class ScriptDividerRequest(BaseModel):
    """剧本分镜请求。"""
    script_text: str = Field(..., description="完整剧本文本", min_length=1)


@router.post(
    "/divide",
    response_model=ApiResponse[ScriptDivisionResult],
    summary="将剧本分割为多个镜头",
    description="输入完整剧本文本，输出分镜列表（镜头序号、行号、预览、地点、时间、主要角色）"
)
async def divide_script(request: ScriptDividerRequest) -> ApiResponse[ScriptDivisionResult]:
    """
    将完整剧本文本自动分割为多个镜头。
    
    请求体：
    - script_text: 完整剧本文本
    
    返回：ScriptDivisionResult
    - shots: 分镜列表，包含每个镜头的起止行号、预览文本、推断的地点和时间
    - total_shots: 总镜头数
    - notes: 拆分说明（可选）
    """
    try:
        llm = get_llm()
        agent = ScriptDividerAgent(llm)
        agent.load_skill("script_divider")
        
        result = agent.extract({"script_text": request.script_text})
        return success_response(data=result)
    except Exception as e:
        logger.error(f"Script dividing failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to divide script: {str(e)}"
        )


# ============================================================================
# 2. ElementExtractorAgent - 逐镜信息提取
# ============================================================================

class ShotElementExtractionRequest(BaseModel):
    """镜头元素提取请求。"""
    shot_index: int = Field(..., description="镜头序号", ge=1)
    shot_text: str = Field(..., description="镜头的文本内容", min_length=1)
    context_summary: str | None = Field(None, description="前文摘要（可选）")


@router.post(
    "/extract-elements",
    response_model=ApiResponse[ShotElementExtractionResult],
    summary="从单个镜头提取信息",
    description="输入镜头文本，输出该镜头的角色、场景、服装、道具、对白、动作"
)
async def extract_shot_elements(
    request: ShotElementExtractionRequest,
) -> ApiResponse[ShotElementExtractionResult]:
    """
    从单个镜头的文本中提取关键信息。
    
    请求体：
    - shot_index: 镜头序号
    - shot_text: 镜头文本内容
    - context_summary: 前文摘要（可选）
    
    返回：ShotElementExtractionResult
    - shot_index: 镜头序号
    - elements: 提取的元素（角色、地点、服装、道具、对白、动作）
    - confidence: 提取置信度 (0-1)
    - notes: 提取说明（可选）
    """
    try:
        llm = get_llm()
        agent = ElementExtractorAgent(llm)
        agent.load_skill("shot_element_extractor")
        
        result = agent.extract({
            "shot_index": request.shot_index,
            "shot_text": request.shot_text,
            "context_summary": request.context_summary or ""
        })
        return success_response(data=result)
    except Exception as e:
        logger.error(f"Element extraction failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to extract elements: {str(e)}"
        )


# ============================================================================
# 3. EntityMergerAgent - 实体合并
# ============================================================================

class EntityMergerRequest(BaseModel):
    """实体合并请求。"""
    all_shot_extractions: list[dict[str, Any]] = Field(
        ..., 
        description="所有镜头提取结果（ShotElementExtractionResult 的序列化形式）"
    )
    historical_library: dict[str, Any] | None = Field(
        None,
        description="历史实体库（可选，用于增量合并）"
    )


@router.post(
    "/merge-entities",
    response_model=ApiResponse[EntityMergeResult],
    summary="合并多镜头的实体信息",
    description="输入全部分镜提取结果，输出合并后的角色库/场景库/道具库"
)
async def merge_entities(request: EntityMergerRequest) -> ApiResponse[EntityMergeResult]:
    """
    将多个镜头的提取结果合并，统一实体定义。
    
    请求体：
    - all_shot_extractions: 所有镜头的提取结果
    - historical_library: 历史实体库（可选，用于增量更新）
    
    返回：EntityMergeResult
    - merged_library: 合并后的实体库（角色、场景、道具）
    - merge_stats: 合并统计信息
    - conflicts: 发现的冲突/待处理项
    - notes: 合并说明（可选）
    """
    try:
        llm = get_llm()
        agent = EntityMergerAgent(llm)
        agent.load_skill("entity_merger")
        
        result = agent.extract({
            "all_extractions_json": json.dumps(request.all_shot_extractions, ensure_ascii=False),
            "historical_library_json": json.dumps(request.historical_library or {}, ensure_ascii=False)
        })
        return success_response(data=result)
    except Exception as e:
        logger.error(f"Entity merging failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to merge entities: {str(e)}"
        )


# ============================================================================
# 4. VariantAnalyzerAgent - 变体分析
# ============================================================================

class VariantAnalysisRequest(BaseModel):
    """变体分析请求。"""
    merged_library: dict[str, Any] = Field(
        ...,
        description="合并后的实体库（EntityLibrary 的序列化形式）"
    )
    all_shot_extractions: list[dict[str, Any]] = Field(
        ...,
        description="所有镜头提取结果"
    )


@router.post(
    "/analyze-variants",
    response_model=ApiResponse[VariantAnalysisResult],
    summary="分析服装/外形变体",
    description="检测角色服装变化，构建演变时间线，生成变体建议"
)
async def analyze_variants(request: VariantAnalysisRequest) -> ApiResponse[VariantAnalysisResult]:
    """
    分析实体的变体（特别是角色服装变化）。
    
    请求体：
    - merged_library: 合并后的实体库
    - all_shot_extractions: 所有镜头提取结果
    
    返回：VariantAnalysisResult
    - costume_timelines: 各角色的服装演变时间线
    - variant_suggestions: 变体建议列表
    - chapter_variants: 按章节整理的变体信息
    - notes: 分析说明（可选）
    """
    try:
        llm = get_llm()
        agent = VariantAnalyzerAgent(llm)
        agent.load_skill("variant_analyzer")
        
        result = agent.extract({
            "merged_library_json": json.dumps(request.merged_library, ensure_ascii=False),
            "all_extractions_json": json.dumps(request.all_shot_extractions, ensure_ascii=False)
        })
        return success_response(data=result)
    except Exception as e:
        logger.error(f"Variant analysis failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to analyze variants: {str(e)}"
        )


# ============================================================================
# 5. ConsistencyCheckerAgent - 一致性检查
# ============================================================================

class ConsistencyCheckRequest(BaseModel):
    """一致性检查请求。"""
    merged_library: dict[str, Any] = Field(
        ...,
        description="合并后的实体库"
    )
    all_shot_extractions: list[dict[str, Any]] = Field(
        ...,
        description="所有镜头提取结果"
    )


@router.post(
    "/check-consistency",
    response_model=ApiResponse[ConsistencyCheckResult],
    summary="检查文本一致性",
    description="发现并报告矛盾点、名字冲突、逻辑问题"
)
async def check_consistency(request: ConsistencyCheckRequest) -> ApiResponse[ConsistencyCheckResult]:
    """
    检查实体定义与分镜内容的一致性。
    
    请求体：
    - merged_library: 合并后的实体库
    - all_shot_extractions: 所有镜头提取结果
    
    返回：ConsistencyCheckResult
    - warnings: 一致性问题列表（包含类型、严重程度、描述、建议）
    - total_issues: 问题总数
    - critical_issues: 严重问题数
    - consistency_score: 一致性评分（0-100）
    - notes: 检查说明（可选）
    """
    try:
        llm = get_llm()
        agent = ConsistencyCheckerAgent(llm)
        agent.load_skill("consistency_checker")
        
        result = agent.extract({
            "merged_library_json": json.dumps(request.merged_library, ensure_ascii=False),
            "all_extractions_json": json.dumps(request.all_shot_extractions, ensure_ascii=False)
        })
        return success_response(data=result)
    except Exception as e:
        logger.error(f"Consistency checking failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to check consistency: {str(e)}"
        )


# ============================================================================
# 6. OutputCompilerAgent - 最终编译
# ============================================================================

class OutputCompileRequest(BaseModel):
    """输出编译请求。"""
    script_division: dict[str, Any] = Field(..., description="脚本分镜结果")
    element_extractions: list[dict[str, Any]] = Field(..., description="元素提取结果列表")
    entity_merge: dict[str, Any] = Field(..., description="实体合并结果")
    variant_analysis: dict[str, Any] = Field(..., description="变体分析结果")
    consistency_check: dict[str, Any] = Field(..., description="一致性检查结果")


@router.post(
    "/compile-output",
    response_model=ApiResponse[OutputCompileResult],
    summary="编译最终输出",
    description="汇总所有处理结果，生成项目JSON和表格数据"
)
async def compile_output(request: OutputCompileRequest) -> ApiResponse[OutputCompileResult]:
    """
    汇总所有Agent的输出，生成最终的项目文件。
    
    请求体：
    - script_division: 脚本分镜结果
    - element_extractions: 所有镜头的元素提取结果
    - entity_merge: 实体合并结果
    - variant_analysis: 变体分析结果
    - consistency_check: 一致性检查结果
    
    返回：OutputCompileResult
    - project_json: 完整项目JSON（包含元数据、实体、镜头等）
    - tables: 可导出的表格列表（角色表、场景表、镜头表等）
    - export_stats: 导出统计信息
    - summary: 项目总结
    """
    try:
        llm = get_llm()
        agent = OutputCompilerAgent(llm)
        agent.load_skill("output_compiler")
        
        result = agent.extract({
            "script_division_json": json.dumps(request.script_division, ensure_ascii=False),
            "element_extractions_json": json.dumps(request.element_extractions, ensure_ascii=False),
            "entity_merge_json": json.dumps(request.entity_merge, ensure_ascii=False),
            "variant_analysis_json": json.dumps(request.variant_analysis, ensure_ascii=False),
            "consistency_check_json": json.dumps(request.consistency_check, ensure_ascii=False)
        })
        return success_response(data=result)
    except Exception as e:
        logger.error(f"Output compilation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to compile output: {str(e)}"
        )


# ============================================================================
# 完整工作流 - 一站式处理
# ============================================================================

class FullProcessRequest(BaseModel):
    """完整工作流请求。"""
    script_text: str = Field(..., description="完整剧本文本", min_length=1)


@router.post(
    "/full-process",
    response_model=ApiResponse[OutputCompileResult],
    summary="完整工作流处理",
    description="从剧本文本开始，经过6个Agent的处理，输出完整项目结果"
)
async def full_process(request: FullProcessRequest) -> ApiResponse[OutputCompileResult]:
    """
    完整的脚本处理工作流：
    1. 分镜分割
    2. 逐镜信息提取
    3. 实体合并
    4. 变体分析
    5. 一致性检查
    6. 最终编译
    
    请求体：
    - script_text: 完整剧本文本
    
    返回：OutputCompileResult（最终编译结果）
    """
    try:
        llm = get_llm()
        
        # 1. 分镜
        logger.info("Step 1: Dividing script...")
        divider = ScriptDividerAgent(llm)
        divider.load_skill("script_divider")
        division = divider.extract({"script_text": request.script_text})
        
        # 2. 逐镜提取
        logger.info(f"Step 2: Extracting {len(division.shots)} shots...")
        extractor = ElementExtractorAgent(llm)
        extractor.load_skill("shot_element_extractor")
        extractions = []
        
        for shot in division.shots:
            # 假设能够从原文中提取对应的镜头文本
            # 这里使用preview_text作为shot_text的简化版本
            result = extractor.extract({
                "shot_index": shot.shot_index,
                "shot_text": shot.preview_text,
                "context_summary": shot.preview_text
            })
            extractions.append(result.model_dump())
        
        # 3. 实体合并
        logger.info("Step 3: Merging entities...")
        merger = EntityMergerAgent(llm)
        merger.load_skill("entity_merger")
        merged = merger.extract({
            "all_extractions_json": json.dumps(extractions, ensure_ascii=False),
            "historical_library_json": json.dumps({}, ensure_ascii=False)
        })
        
        # 4. 变体分析
        logger.info("Step 4: Analyzing variants...")
        analyzer = VariantAnalyzerAgent(llm)
        analyzer.load_skill("variant_analyzer")
        variants = analyzer.extract({
            "merged_library_json": json.dumps(merged.merged_library.model_dump(), ensure_ascii=False),
            "all_extractions_json": json.dumps(extractions, ensure_ascii=False)
        })
        
        # 5. 一致性检查
        logger.info("Step 5: Checking consistency...")
        checker = ConsistencyCheckerAgent(llm)
        checker.load_skill("consistency_checker")
        consistency = checker.extract({
            "merged_library_json": json.dumps(merged.merged_library.model_dump(), ensure_ascii=False),
            "all_extractions_json": json.dumps(extractions, ensure_ascii=False)
        })
        
        # 6. 最终编译
        logger.info("Step 6: Compiling output...")
        compiler = OutputCompilerAgent(llm)
        compiler.load_skill("output_compiler")
        final_output = compiler.extract({
            "script_division_json": json.dumps(division.model_dump(), ensure_ascii=False),
            "element_extractions_json": json.dumps(extractions, ensure_ascii=False),
            "entity_merge_json": json.dumps(merged.model_dump(), ensure_ascii=False),
            "variant_analysis_json": json.dumps(variants.model_dump(), ensure_ascii=False),
            "consistency_check_json": json.dumps(consistency.model_dump(), ensure_ascii=False)
        })
        
        logger.info("Full process completed successfully")
        return success_response(data=final_output)
    
    except Exception as e:
        logger.error(f"Full process failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process script: {str(e)}"
        )

