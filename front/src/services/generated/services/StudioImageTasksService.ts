/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResponse_TaskCreated_ } from '../models/ApiResponse_TaskCreated_';
import type { StudioImageTaskRequest } from '../models/StudioImageTaskRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class StudioImageTasksService {
    /**
     * 演员形象/立绘图片生成（任务版）
     * 为指定演员形象创建图片生成任务，并通过 `GenerationTaskLink` 关联。
     * @returns ApiResponse_TaskCreated_ Successful Response
     * @throws ApiError
     */
    public static createActorImageGenerationTaskApiV1StudioImageTasksActorImagesActorImageIdImageTasksPost({
        actorImageId,
        requestBody,
    }: {
        actorImageId: string,
        requestBody: StudioImageTaskRequest,
    }): CancelablePromise<ApiResponse_TaskCreated_> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/studio/image-tasks/actor-images/{actor_image_id}/image-tasks',
            path: {
                'actor_image_id': actorImageId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * 道具/场景/服装图片生成（任务版）
     * 为道具/场景/服装创建图片生成任务。
     *
     * - asset_type: prop / scene / costume
     * @returns ApiResponse_TaskCreated_ Successful Response
     * @throws ApiError
     */
    public static createAssetImageGenerationTaskApiV1StudioImageTasksAssetsAssetTypeAssetIdImageTasksPost({
        assetType,
        assetId,
        requestBody,
    }: {
        assetType: string,
        assetId: string,
        requestBody: StudioImageTaskRequest,
    }): CancelablePromise<ApiResponse_TaskCreated_> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/studio/image-tasks/assets/{asset_type}/{asset_id}/image-tasks',
            path: {
                'asset_type': assetType,
                'asset_id': assetId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * 角色图片生成（任务版）
     * 为角色创建图片生成任务（对应 CharacterImage 业务）。
     * @returns ApiResponse_TaskCreated_ Successful Response
     * @throws ApiError
     */
    public static createCharacterImageGenerationTaskApiV1StudioImageTasksCharactersCharacterIdImageTasksPost({
        characterId,
        requestBody,
    }: {
        characterId: string,
        requestBody: StudioImageTaskRequest,
    }): CancelablePromise<ApiResponse_TaskCreated_> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/studio/image-tasks/characters/{character_id}/image-tasks',
            path: {
                'character_id': characterId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * 镜头分镜帧图片生成（任务版）
     * 为镜头分镜帧（ShotDetail）创建图片生成任务。
     *
     * - relation_type 固定为 shot_frame_image
     * - relation_entity_id 为 ShotDetail.id
     * @returns ApiResponse_TaskCreated_ Successful Response
     * @throws ApiError
     */
    public static createShotFrameImageGenerationTaskApiV1StudioImageTasksShotDetailsShotDetailIdFrameImageTasksPost({
        shotDetailId,
        requestBody,
    }: {
        shotDetailId: string,
        requestBody: StudioImageTaskRequest,
    }): CancelablePromise<ApiResponse_TaskCreated_> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/studio/image-tasks/shot-details/{shot_detail_id}/frame-image-tasks',
            path: {
                'shot_detail_id': shotDetailId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
