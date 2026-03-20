/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ImportDraftType } from './ImportDraftType';
export type ImportDraftOccurrenceRead = {
    /**
     * 出现位置记录 ID（occurrence）
     */
    id: string;
    /**
     * 项目 ID
     */
    project_id: string;
    /**
     * 章节 ID
     */
    chapter_id: string;
    /**
     * 镜头（shot）ID
     */
    shot_id: string;
    /**
     * 草稿类型
     */
    draft_type: ImportDraftType;
    /**
     * 草稿主表 ID
     */
    draft_id: string;
};

