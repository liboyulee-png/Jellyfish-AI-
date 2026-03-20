/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiResponse_PrepDraftShotRead_ } from '../models/ApiResponse_PrepDraftShotRead_';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class StudioPrepDraftsService {
    /**
     * 获取某镜头相关的 import 草稿（含出现位置）
     * @returns ApiResponse_PrepDraftShotRead_ Successful Response
     * @throws ApiError
     */
    public static getPrepDraftsForShotApiV1StudioPrepDraftsProjectIdChapterIdShotIdGet({
        projectId,
        chapterId,
        shotId,
    }: {
        projectId: string,
        chapterId: string,
        shotId: string,
    }): CancelablePromise<ApiResponse_PrepDraftShotRead_> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/studio/prep-drafts/{project_id}/{chapter_id}/{shot_id}',
            path: {
                'project_id': projectId,
                'chapter_id': chapterId,
                'shot_id': shotId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
