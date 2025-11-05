import uuid
from fastapi import APIRouter, Depends
from app.api.deps import verify_internal_token
from app.models.schemas import ChatStartIn, ChatStartOut, ChatMessageIn, ChatMessageOut
from app.services import chat_memory as mem

router = APIRouter(prefix="/chatbot", tags=["chatbot"])

@router.post("/start", response_model=ChatStartOut, dependencies=[Depends(verify_internal_token)])
def start_chat(inb: ChatStartIn):
    session_id = inb.session_id or str(uuid.uuid4())
    mem.new_session(session_id)
    if inb.initial_data:
        for k, v in inb.initial_data.items():
            mem.set_draft(session_id, k, v)
    mem.append_message(session_id, "system", "Chatbot session started.")
    return ChatStartOut(session_id=session_id)

@router.post("/message", response_model=ChatMessageOut, dependencies=[Depends(verify_internal_token)])
def send_message(inb: ChatMessageIn):
    ctx = mem.get_context(inb.session_id)
    if not ctx:
        mem.new_session(inb.session_id)
        ctx = mem.get_context(inb.session_id)

    mem.append_message(inb.session_id, "user", inb.message)

    # Very simple demo reply (replace with LLM later)
    reply = "Noted. Tell me the job title and stack; I’ll suggest skills and assessment structure."

    # Store some hints in draft
    if "python" in inb.message.lower():
        mem.set_draft(inb.session_id, "suggested_stack", "python, fastapi, postgres")

    return ChatMessageOut(
        reply=reply,
        session_id=inb.session_id,
        context_preview={"draft": ctx.get("draft", {}), "messages_count": len(ctx.get("messages", []))}
    )
