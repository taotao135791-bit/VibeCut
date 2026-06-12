import { create } from 'zustand';
import type { TimelineProject, MediaAsset, SubtitleStyle } from '@mrdv2/shared';
import { fetchSubtitlePresets } from '../lib/api';

export interface MediaFileInfo {
  name: string;
  path: string;
  size?: number;
  mime_type?: string;
  duration?: number;
  width?: number;
  height?: number;
  type: 'video' | 'audio' | 'image' | 'directory';
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
  toolCalls?: ToolCallProgress[];
  reasonings?: string[];
}

export interface ToolCallProgress {
  toolName: string;
  toolArgs?: Record<string, string>;
  status: 'running' | 'completed' | 'error';
  resultSummary?: string;
  iteration: number;
}

export interface AgentProgress {
  isActive: boolean;
  toolCalls: ToolCallProgress[];
  reasonings: string[];
}

/** 外部 Agent（工具网关）的一次工具调用记录 */
export interface ExternalToolActivity {
  id: number;
  toolName: string;
  phase: 'started' | 'succeeded' | 'failed';
  args?: Record<string, string>;
  summary?: string;
  timestamp: string;
}

const MAX_EXTERNAL_ACTIVITIES = 100;

const MAX_UNDO = 50;

interface AppStore {
  // Timeline state
  timeline: TimelineProject | null;
  timelineVersion: number;
  setTimeline: (t: TimelineProject | null, version?: number) => void;
  setTimelineFromServer: (t: TimelineProject, version: number) => void;

  // Timeline editing (with undo support)
  setTimelineSilent: (t: TimelineProject) => void;
  updateTimeline: (newTimeline: TimelineProject) => void;
  undoStack: TimelineProject[];
  redoStack: TimelineProject[];
  undo: () => void;
  redo: () => void;
  timelineDirty: boolean;
  setTimelineDirty: (d: boolean) => void;

  // Playback state
  currentFrame: number;
  isPlaying: boolean;
  setCurrentFrame: (f: number) => void;
  setPlaying: (p: boolean) => void;

  // Chat state
  messages: ChatMessage[];
  addMessage: (msg: ChatMessage) => void;
  clearMessages: () => void;

  // Media browser state
  mediaDir: string;
  mediaFiles: MediaFileInfo[];
  setMediaDir: (dir: string) => void;
  setMediaFiles: (files: MediaFileInfo[]) => void;
  selectedMedia: string | null;
  setSelectedMedia: (path: string | null) => void;

  // WebSocket connection
  wsConnected: boolean;
  setWsConnected: (c: boolean) => void;
  wsSend: ((data: string) => void) | null;
  setWsSend: (fn: ((data: string) => void) | null) => void;

  // Agent progress
  agentProgress: AgentProgress;
  onToolStart: (toolName: string, toolArgs: Record<string, string>, iteration: number) => void;
  onToolEnd: (toolName: string, resultSummary: string, isError: boolean) => void;
  onAgentReasoning: (reasoning: string) => void;
  onAgentDone: () => void;
  onAgentAborted: () => void;
  archiveAgentProgress: () => { toolCalls?: ToolCallProgress[]; reasonings?: string[] };

  // External agent (tool gateway) activity feed
  externalActivities: ExternalToolActivity[];
  onToolActivity: (
    phase: 'started' | 'succeeded' | 'failed',
    toolName: string,
    args?: Record<string, string>,
    summary?: string,
  ) => void;
  clearExternalActivities: () => void;

  // Subtitle style presets
  subtitlePresets: Record<string, SubtitleStyle>;
  loadSubtitlePresets: () => Promise<void>;
  setSubtitlePresets: (presets: Record<string, SubtitleStyle>) => void;

  // Project
  projectId: string | null;
  setProjectId: (id: string | null) => void;
}

const API_BASE = '/api';

export const useAppStore = create<AppStore>((set, get) => ({
  // Timeline
  timeline: null,
  timelineVersion: 0,
  setTimeline: (t, version) => set({
    timeline: t,
    timelineVersion: version ?? 0,
    undoStack: [],
    redoStack: [],
    timelineDirty: false,
  }),

  setTimelineFromServer: (t, version) => {
    const { timeline, timelineVersion, undoStack } = get();
    // Ignore stale updates (echo-backs with version <= current)
    if (version <= timelineVersion) return;

    // Echo-back of our own save (same content): only bump version
    if (timeline && JSON.stringify(timeline) === JSON.stringify(t)) {
      set({ timelineVersion: version, timelineDirty: false });
      return;
    }

    // Someone else changed the timeline (agent / gateway tool / undo API).
    // Push the current state onto the undo stack so the user can Cmd+Z it.
    set({
      timeline: t,
      timelineVersion: version,
      undoStack: timeline ? [...undoStack, timeline].slice(-MAX_UNDO) : undoStack,
      redoStack: [],
      timelineDirty: false,
    });
  },

  // Timeline editing with undo
  undoStack: [],
  redoStack: [],
  timelineDirty: false,
  setTimelineDirty: (d) => set({ timelineDirty: d }),

  setTimelineSilent: (t) => set({ timeline: t, timelineDirty: true }),

  updateTimeline: (newTimeline) => {
    const { timeline, undoStack } = get();
    if (!timeline) {
      set({ timeline: newTimeline, timelineDirty: true });
      return;
    }
    const newUndo = [...undoStack, timeline].slice(-MAX_UNDO);
    set({
      timeline: newTimeline,
      undoStack: newUndo,
      redoStack: [],
      timelineDirty: true,
    });
  },

  undo: () => {
    const { timeline, undoStack, redoStack } = get();
    if (undoStack.length === 0 || !timeline) return;
    const prev = undoStack[undoStack.length - 1];
    set({
      timeline: prev,
      undoStack: undoStack.slice(0, -1),
      redoStack: [...redoStack, timeline],
      timelineDirty: true,
    });
  },

  redo: () => {
    const { timeline, undoStack, redoStack } = get();
    if (redoStack.length === 0 || !timeline) return;
    const next = redoStack[redoStack.length - 1];
    set({
      timeline: next,
      undoStack: [...undoStack, timeline!],
      redoStack: redoStack.slice(0, -1),
      timelineDirty: true,
    });
  },

  // Playback
  currentFrame: 0,
  isPlaying: false,
  setCurrentFrame: (f) => set({ currentFrame: f }),
  setPlaying: (p) => set({ isPlaying: p }),

  // Chat
  messages: [],
  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
  clearMessages: () => set({ messages: [] }),

  // Media
  mediaDir: '',
  mediaFiles: [],
  setMediaDir: (dir) => set({ mediaDir: dir }),
  setMediaFiles: (files) => set({ mediaFiles: files }),
  selectedMedia: null,
  setSelectedMedia: (path) => set({ selectedMedia: path }),

  // WebSocket
  wsConnected: false,
  setWsConnected: (c) => set({ wsConnected: c }),
  wsSend: null,
  setWsSend: (fn) => set({ wsSend: fn }),

  // Agent progress
  agentProgress: { isActive: false, toolCalls: [], reasonings: [] },

  onToolStart: (toolName, toolArgs, iteration) =>
    set((s) => ({
      agentProgress: {
        ...s.agentProgress,
        isActive: true,
        toolCalls: [
          ...s.agentProgress.toolCalls,
          { toolName, toolArgs, status: 'running', iteration },
        ],
      },
    })),

  onToolEnd: (toolName, resultSummary, isError) =>
    set((s) => ({
      agentProgress: {
        ...s.agentProgress,
        toolCalls: s.agentProgress.toolCalls.map((tc) =>
          tc.toolName === toolName && tc.status === 'running'
            ? { ...tc, status: isError ? 'error' : 'completed', resultSummary }
            : tc
        ),
      },
    })),

  onAgentReasoning: (reasoning) =>
    set((s) => ({
      agentProgress: {
        ...s.agentProgress,
        reasonings: [...s.agentProgress.reasonings, reasoning],
      },
    })),

  onAgentDone: () =>
    set((s) => ({
      agentProgress: { ...s.agentProgress, isActive: false },
    })),

  onAgentAborted: () =>
    set((s) => ({
      agentProgress: { ...s.agentProgress, isActive: false },
    })),

  archiveAgentProgress: () => {
    const { agentProgress } = get();
    const snapshot = {
      toolCalls: agentProgress.toolCalls.length > 0 ? [...agentProgress.toolCalls] : undefined,
      reasonings: agentProgress.reasonings.length > 0 ? [...agentProgress.reasonings] : undefined,
    };
    set({ agentProgress: { isActive: false, toolCalls: [], reasonings: [] } });
    return snapshot;
  },

  // External agent (tool gateway) activity feed
  externalActivities: [],

  onToolActivity: (phase, toolName, args, summary) =>
    set((s) => {
      if (phase !== 'started') {
        // Update the matching in-flight entry instead of appending a new one
        const idx = [...s.externalActivities]
          .reverse()
          .findIndex((a) => a.toolName === toolName && a.phase === 'started');
        if (idx !== -1) {
          const realIdx = s.externalActivities.length - 1 - idx;
          const updated = [...s.externalActivities];
          updated[realIdx] = { ...updated[realIdx], phase, summary };
          return { externalActivities: updated };
        }
      }
      const next: ExternalToolActivity = {
        id: Date.now() + Math.random(),
        toolName,
        phase,
        args,
        summary,
        timestamp: new Date().toISOString(),
      };
      return {
        externalActivities: [...s.externalActivities, next].slice(-MAX_EXTERNAL_ACTIVITIES),
      };
    }),

  clearExternalActivities: () => set({ externalActivities: [] }),

  // Subtitle style presets
  subtitlePresets: {},
  loadSubtitlePresets: async () => {
    try {
      const data = await fetchSubtitlePresets();
      set({ subtitlePresets: data.presets });
    } catch (e) {
      console.error('Failed to load subtitle presets:', e);
    }
  },
  setSubtitlePresets: (presets) => set({ subtitlePresets: presets }),

  // Project
  projectId: localStorage.getItem('mrdv2_projectId'),
  setProjectId: (id) => {
    if (id) {
      localStorage.setItem('mrdv2_projectId', id);
    } else {
      localStorage.removeItem('mrdv2_projectId');
    }
    set({ projectId: id });
  },
}));

export function getMediaUrl(filePath: string): string {
  return `${API_BASE}/media/file?path=${encodeURIComponent(filePath)}`;
}
