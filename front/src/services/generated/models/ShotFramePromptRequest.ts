/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * 镜头分镜帧提示词生成任务：通过 frame_type 控制首/尾/关键帧。
 */
export type ShotFramePromptRequest = {
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
     * 剧本摘录，对应 Shot.script_excerpt
     */
    script_excerpt: string;
    /**
     * 镜头标题，对应 Shot.title
     */
    title?: string;
    /**
     * 景别，如 ECU/CU/MS
     */
    camera_shot?: (string | null);
    /**
     * 机位角度
     */
    angle?: (string | null);
    /**
     * 运镜方式
     */
    movement?: (string | null);
    /**
     * 氛围描述
     */
    atmosphere?: (string | null);
    /**
     * 情绪标签
     */
    mood_tags?: (Array<string> | null);
    /**
     * 视效类型
     */
    vfx_type?: (string | null);
    /**
     * 视效说明
     */
    vfx_note?: (string | null);
    /**
     * 时长（秒）
     */
    duration?: (number | null);
    /**
     * 关联场景 ID
     */
    scene_id?: (string | null);
    /**
     * 对白摘要
     */
    dialog_summary?: (string | null);
    /**
     * first | last | key
     */
    frame_type: string;
};

