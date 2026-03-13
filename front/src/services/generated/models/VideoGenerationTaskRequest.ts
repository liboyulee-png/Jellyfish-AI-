/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * 视频生成任务请求：可选绑定到 project/chapter/shot。
 */
export type VideoGenerationTaskRequest = {
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
     * 供应商 API Key（Bearer）
     */
    api_key: string;
    /**
     * 供应商 base_url（可选）
     */
    base_url?: (string | null);
    /**
     * 文本提示词（可选）
     */
    prompt?: (string | null);
    /**
     * 首帧图片 file_id（可选）
     */
    first_frame_file_id?: (string | null);
    /**
     * 首帧图片 URL（可选）
     */
    first_frame_url?: (string | null);
    /**
     * 尾帧图片 file_id（可选）
     */
    last_frame_file_id?: (string | null);
    /**
     * 尾帧图片 URL（可选）
     */
    last_frame_url?: (string | null);
    /**
     * 关键帧图片 file_id（可选）
     */
    key_frame_file_id?: (string | null);
    /**
     * 关键帧图片 URL（可选）
     */
    key_frame_url?: (string | null);
    /**
     * 视频模型名称（可选）
     */
    model?: (string | null);
    /**
     * 分辨率（可选），如 720x1280
     */
    size?: (string | null);
    /**
     * 时长（秒）（可选）
     */
    seconds?: (number | null);
};

