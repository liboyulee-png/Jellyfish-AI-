/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type ImportPropDraftRead = {
    /**
     * 道具草稿 ID
     */
    id: string;
    /**
     * 项目 ID
     */
    project_id: string;
    /**
     * 道具名称
     */
    name: string;
    /**
     * 提取到的道具描述
     */
    description?: string;
    /**
     * 提取标签（JSON）
     */
    tags?: Array<string>;
    /**
     * 提取扩展信息（JSON）
     */
    raw_extra?: Record<string, any>;
};

