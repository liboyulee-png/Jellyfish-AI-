/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { TextChunkInput } from './TextChunkInput';
/**
 * 分镜抽取任务请求：在抽取参数基础上增加绑定目标。
 */
export type ShotlistExtractTaskRequest = {
    /**
     * 绑定项目 ID（可选）
     */
    project_id?: (string | null);
    /**
     * 绑定章节 ID（可选）
     */
    chapter_id?: (string | null);
    /**
     * 绑定镜头 ID（可选）
     */
    shot_id?: (string | null);
    /**
     * 小说/章节标识
     */
    source_id: string;
    /**
     * 书名/章节名
     */
    source_title?: (string | null);
    /**
     * 语言，如 zh / en
     */
    language?: (string | null);
    /**
     * 文本块列表
     */
    chunks: Array<TextChunkInput>;
};

