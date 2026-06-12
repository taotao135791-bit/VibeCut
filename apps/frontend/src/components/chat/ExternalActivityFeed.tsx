import { useEffect, useRef, useState } from 'react';
import { useAppStore } from '../../stores/appStore';
import type { ExternalToolActivity } from '../../stores/appStore';

/** 工具名 → 用户可读的中文描述 */
const TOOL_LABELS: Record<string, string> = {
  get_timeline: '读取时间线',
  create_timeline: '创建时间线',
  manage_timeline: '管理轨道与素材',
  add_clips: '添加片段',
  update_clips: '更新片段',
  delete_clips: '删除片段',
  move_clips: '移动片段',
  split_timeline: '分割片段',
  remove_gap: '移除空隙',
  delete_time_ranges: '删除时间段',
  insert_gap: '插入空隙',
  undo_timeline: '撤销修改',
  redo_timeline: '重做修改',
  transcribe_audio: '语音转写',
  detect_silence: '检测静音',
  detect_filler_words: '检测口头禅',
  generate_subtitles: '生成字幕',
  apply_subtitle_style: '应用字幕样式',
  manage_subtitle_styles: '管理字幕样式',
  map_time: '时间映射',
  analyze_video: '分析视频',
  analyze_image: '分析图片',
  export_timeline: '导出成片',
  generate_speech: '生成配音',
  list_voices: '查询音色',
  run_shell: '执行命令',
  list_files: '浏览文件',
  read_file: '读取文件',
  write_file: '写入文件',
  register_creative_pack: '注册创意包',
  list_creative_packs: '查询创意包',
  smart_compose: '智能合成',
  draft_promo_remix: '生成促销混剪',
  create_creative_plan: '制定创意方案',
  create_visual_qa_report: '视觉质检',
  present_plan: '提交剪辑方案',
  ask_user: '询问用户',
};

function toolLabel(name: string): string {
  return TOOL_LABELS[name] ?? name;
}

const PhaseIcon = ({ phase }: { phase: ExternalToolActivity['phase'] }) => {
  if (phase === 'started') {
    return (
      <svg className="animate-spin w-3.5 h-3.5 text-blue-400 shrink-0" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    );
  }
  if (phase === 'succeeded') {
    return (
      <svg className="w-3.5 h-3.5 text-green-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    );
  }
  return (
    <svg className="w-3.5 h-3.5 text-red-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
};

function ActivityRow({ activity }: { activity: ExternalToolActivity }) {
  const [expanded, setExpanded] = useState(false);
  const hasDetails = Boolean(activity.summary || (activity.args && Object.keys(activity.args).length > 0));
  const time = new Date(activity.timestamp).toLocaleTimeString('zh-CN', { hour12: false });

  return (
    <div
      className={`rounded-md px-2 py-1.5 bg-zinc-800/50 border border-zinc-700/40 ${hasDetails ? 'cursor-pointer hover:bg-zinc-800' : ''}`}
      onClick={() => hasDetails && setExpanded(!expanded)}
    >
      <div className="flex items-center gap-2 text-xs">
        <PhaseIcon phase={activity.phase} />
        <span className="text-zinc-200">{toolLabel(activity.toolName)}</span>
        <span className="font-mono text-[10px] text-zinc-500">{activity.toolName}</span>
        <span className="ml-auto text-[10px] text-zinc-600">{time}</span>
      </div>
      {expanded && activity.args && Object.keys(activity.args).length > 0 && (
        <div className="mt-1.5 pl-5 text-[11px] text-zinc-400 font-mono whitespace-pre-wrap break-all">
          {Object.entries(activity.args).map(([k, v]) => (
            <div key={k}>
              <span className="text-zinc-500">{k}: </span>
              {v}
            </div>
          ))}
        </div>
      )}
      {expanded && activity.summary && (
        <div className="mt-1 pl-5 text-[11px] text-zinc-500 font-mono whitespace-pre-wrap break-all">
          → {activity.summary}
        </div>
      )}
    </div>
  );
}

/**
 * 外部 Agent（工具网关）操作动态流。
 * 当 Claude Code / Cursor 等外部 Agent 通过 /api/tools 剪辑时，
 * 用户在这里实时看到每一步操作。
 */
export default function ExternalActivityFeed() {
  const activities = useAppStore((s) => s.externalActivities);
  const clear = useAppStore((s) => s.clearExternalActivities);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [activities.length]);

  if (activities.length === 0) return null;

  const running = activities.some((a) => a.phase === 'started');

  return (
    <div className="border border-zinc-700/60 rounded-lg overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800/80 text-xs text-zinc-400">
        <span className={`w-1.5 h-1.5 rounded-full ${running ? 'bg-blue-400 animate-pulse' : 'bg-green-500'}`} />
        外部 Agent 操作动态
        <button
          onClick={clear}
          className="ml-auto text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          清空
        </button>
      </div>
      <div className="p-2 space-y-1 max-h-64 overflow-y-auto">
        {activities.map((a) => (
          <ActivityRow key={a.id} activity={a} />
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
