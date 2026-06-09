# Memex Architecture Reference

## Overview
Memex is a Claude Code plugin that automatically learns from conversations.

## Directory Structure
```
memex/
├── .claude-plugin/plugin.json       Plugin manifest
├── SKILL.md                         AI orchestration instructions
├── requirements.txt                 Python dependencies
├── hooks/                           Hook scripts (6 lifecycle events)
│   ├── hooks.json                   Event registration
│   ├── lib.py                       Shared utilities
│   ├── session_start.py             Context injection
│   ├── user_prompt_submit.py        Signal detection
│   ├── post_tool_use.py             Tool logging
│   ├── stop.py                      Post-turn processing
│   ├── session_end.py               Session archival
│   └── pre_compact.py               Compact survival
├── scripts/                         Core Python modules
│   ├── db_schema.py                 SQLite schema (8 tables)
│   ├── db_ops.py                    CRUD + FTS5 search
│   ├── rating_engine.py             TrueSkill Bayesian scoring
│   ├── sentiment_detector.py        SnowNLP + pysentimiento
│   ├── vec_store.py                 sqlite-vec + hybrid search
│   ├── transcript_indexer.py        JSONL parsing
│   ├── knowledge_graph.py           networkx graph
│   ├── hierarchy.py                 Layer 0-3 pipeline
│   └── context_injector.py          Context formatting
├── agents/                          LLM sub-agent instructions
│   ├── extractor.md                 Knowledge extraction
│   ├── attributor.md                Attribution analysis
│   ├── synthesizer.md               Pattern synthesis
│   └── grapher.md                   Graph construction
├── references/                      Documentation
└── evals/                           Test suite
```

## Data Flow
1. Hook events → stdin JSON → hook scripts
2. hook scripts → sentiment_detector → signals
3. signals → rating_engine → TrueSkill update
4. transcript → hierarchy.py → Layer 0-3 extraction
5. extraction → agents/extractor.md → structured knowledge
6. knowledge → db_ops.py → DB storage + FTS5
7. knowledge → vec_store.py → vector embedding
8. knowledge → knowledge_graph.py → graph edges
9. SessionStart → context_injector.py → Claude context

## Storage
- Global: `~/.claude/memex/global.db`
- Project: `<project>/.claude/memex/project.db`
- Team: `<project>/.claude/memex/team/patches/*.json`
