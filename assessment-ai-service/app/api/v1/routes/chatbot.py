from fastapi import APIRouter, HTTPException
from starlette.status import HTTP_400_BAD_REQUEST, HTTP_404_NOT_FOUND, HTTP_500_INTERNAL_SERVER_ERROR

from app.domain.schemas import (
    ChatbotStartRequest,
    ChatbotMessageRequest,
    ChatbotResponse,
)
from app.services.chatbot.engine import chatbot_engine

router = APIRouter()


@router.post(
    "/start",
    response_model=ChatbotResponse,
    summary="Start a new chatbot-guided assessment session",
)
async def start_chatbot(request: ChatbotStartRequest) -> ChatbotResponse:
    if not request.company_id:
        raise HTTPException(
            status_code=HTTP_400_BAD_REQUEST,
            detail="company_id is required.",
        )

    try:
        session = chatbot_engine.start_session(request)

        if not session.messages:
            # Engine should always push a first assistant message
            raise HTTPException(
                status_code=HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Chatbot session initialized without messages.",
            )

        return ChatbotResponse(
            session=session,
            reply=session.messages[-1].content,  # last assistant message
            is_completed=False,
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error starting chatbot session: {str(e)}",
        ) from e


@router.post(
    "/message",
    response_model=ChatbotResponse,
    summary="Send a message to an existing chatbot session",
)
async def send_chatbot_message(request: ChatbotMessageRequest) -> ChatbotResponse:
    if not request.session_id:
        raise HTTPException(
            status_code=HTTP_400_BAD_REQUEST,
            detail="session_id is required.",
        )

    if not request.message or not request.message.strip():
        raise HTTPException(
            status_code=HTTP_400_BAD_REQUEST,
            detail="message cannot be empty.",
        )

    try:
        response = chatbot_engine.process_message(
            request.session_id,
            request.message,
        )

        if response is None:
            raise HTTPException(
                status_code=HTTP_404_NOT_FOUND,
                detail="Chatbot session not found.",
            )

        return response

    except ValueError as e:
        # Engine uses ValueError when session not found or invalid
        raise HTTPException(
            status_code=HTTP_404_NOT_FOUND,
            detail=str(e),
        ) from e
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing message: {str(e)}",
        ) from e
