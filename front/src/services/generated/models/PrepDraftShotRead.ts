/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ImportCharacterDraftRead } from './ImportCharacterDraftRead';
import type { ImportCostumeDraftRead } from './ImportCostumeDraftRead';
import type { ImportDraftOccurrenceRead } from './ImportDraftOccurrenceRead';
import type { ImportPropDraftRead } from './ImportPropDraftRead';
import type { ImportSceneDraftRead } from './ImportSceneDraftRead';
export type PrepDraftShotRead = {
    project_id: string;
    chapter_id: string;
    shot_id: string;
    occurrences?: Array<ImportDraftOccurrenceRead>;
    characters?: Array<ImportCharacterDraftRead>;
    scenes?: Array<ImportSceneDraftRead>;
    props?: Array<ImportPropDraftRead>;
    costumes?: Array<ImportCostumeDraftRead>;
};

