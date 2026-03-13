/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Studio 专用图片任务请求体：可选模型 ID，不传则用默认图片模型；供应商由模型反查。
 */
export type StudioImageTaskRequest = {
    /**
     * 可选模型 ID（models.id）；不传则使用 ModelSettings.default_image_model_id；Provider 由模型关联反查
     */
    model_id?: (string | null);
};

