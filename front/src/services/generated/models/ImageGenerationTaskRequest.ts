/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ImageInputRef } from './ImageInputRef';
/**
 * 图片生成任务请求：可选绑定到 project/chapter/shot。
 */
export type ImageGenerationTaskRequest = {
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
     * 供应商：openai | volcengine
     */
    provider: string;
    /**
     * 供应商 API Key（可选）；不传则使用配置 IMAGE_API_KEY
     */
    api_key?: (string | null);
    /**
     * 供应商 base_url（可选）；不传则使用配置 IMAGE_API_BASE_URL
     */
    base_url?: (string | null);
    /**
     * 文本提示词
     */
    prompt: string;
    /**
     * 参考图片列表；存在时 OpenAI 走 /images/edits，火山 ImageGenerations 使用 image[]
     */
    images?: Array<ImageInputRef>;
    /**
     * 图片模型名称（必填）
     */
    model: string;
    /**
     * 分辨率（可选），如 1024x1024
     */
    size?: (string | null);
    /**
     * 生成图片数量；部分模型仅支持 n=1
     */
    'n'?: number;
    /**
     * 随机种子（火山 ImageGenerations 支持）
     */
    seed?: (number | null);
    /**
     * OpenAI 返回格式：url 或 b64_json；火山一般仅支持 url
     */
    response_format?: string;
};

