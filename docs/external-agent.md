# External Agent Tool Gateway

VibeCut can run as a local video-editing runtime without using the built-in
Gemini/OpenAI chat agent. External coding agents can call the backend directly.

## Install Modes

Core runtime only:

```bash
cd apps/backend
pip install -e .
```

Optional built-in AI features:

```bash
pip install -e ".[agent,asr,tts,svg,interchange]"
```

## Tool Discovery

```http
GET /api/tools
```

Returns registered tool definitions and the list of tools that modify the
timeline.

## Tool Execution

```http
POST /api/tools/{tool_name}/execute
```

Request body:

```json
{
  "project_id": "proj_example",
  "media_dir": "/absolute/path/to/media",
  "persist": true,
  "args": {}
}
```

For timeline-modifying tools, the backend validates timeline invariants before
persisting and broadcasting the update. Invalid tool output is rolled back.

## Minimal External-Agent Flow

1. Create a project with `POST /api/projects`.
2. Discover tools with `GET /api/tools`.
3. Use `manage_timeline` to register media.
4. Use `add_clips`, `split_timeline`, `move_clips`, `generate_subtitles`, etc.
5. Preview in the browser UI or export with `POST /api/export`.

The external agent can do multimodal reasoning itself. VibeCut only needs
the resulting timeline/tool calls.

## Creative Remix Workflow (Promo/Ad MG Overlays)

For promotional video remixes, the external agent can write custom Remotion
animation components and overlay them on existing video:

1. Create project + register video media
2. Add video to timeline (`add_clips`)
3. Write TSX animation components with frame-level animation
4. Register them: `POST /api/tools/register_creative_pack/execute`
5. Place on timeline: `POST /api/tools/smart_compose/execute`
6. Export: `POST /api/tools/export_timeline/execute`

See `AGENT_GUIDE.md` in the project root for motion design methodology.

### Key Creative Tools

| Tool | Description |
|------|-------------|
| `register_creative_pack` | Write TSX components to frontend packs directory |
| `list_creative_packs` | List available packs and components |
| `smart_compose` | Place registered components at anchor timestamps |
| `transcribe_audio` | Get word-level timestamps for precise anchoring |
