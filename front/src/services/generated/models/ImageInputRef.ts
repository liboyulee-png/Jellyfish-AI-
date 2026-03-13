/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * 参考图片：与 ImageGenerationInput.InputImageRef 对齐。
 */
export type ImageInputRef = {
    /**
     * 文件 ID（用于 OpenAI File API；火山可忽略）
     */
    file_id?: (string | null);
    /**
     * 完整 URL 或 base64 data URL；火山 image[] 建议使用该字段
     */
    image_url?: (string | null);
};

