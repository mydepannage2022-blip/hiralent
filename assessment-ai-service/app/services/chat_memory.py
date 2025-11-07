from typing import Dict, Any
import time

# Simple in-memory store; replace with Redis in prod
_sessions: Dict[str, Dict[str, Any]] = {}

def new_session(session_id: str) -> None:
    _sessions[session_id] = {"created_at": time.time(), "messages": [], "draft": {}}

def append_message(session_id: str, role: str, content: str):
    if session_id not in _sessions:
        new_session(session_id)
    _sessions[session_id]["messages"].append({"role": role, "content": content})

def set_draft(session_id: str, key: str, value):
    if session_id not in _sessions:
        new_session(session_id)
    _sessions[session_id]["draft"][key] = value

def get_context(session_id: str):
    return _sessions.get(session_id)
