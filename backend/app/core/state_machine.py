from enum import Enum
from typing import Optional, Dict, Any, List

class FormState(str, Enum):
    START = "START"
    ASK_FIELD = "ASK_FIELD"
    LISTEN = "LISTEN"
    TRANSCRIBE = "TRANSCRIBE"
    EXTRACT = "EXTRACT"
    VALIDATE = "VALIDATE"
    CONFIRM = "CONFIRM"
    RETRY = "RETRY"
    TEXT_FALLBACK = "TEXT_FALLBACK"
    HUMAN_HELP = "HUMAN_HELP"
    NEXT_FIELD = "NEXT_FIELD"
    FINAL_REVIEW = "FINAL_REVIEW"
    SUBMIT = "SUBMIT"
    COMPLETE = "COMPLETE"

class StateMachine:
    """
    Implements TRD Section 8: State Machine Technical Specification.
    Enforces deterministic state transitions.
    """
    @staticmethod
    def get_next_action(
        current_state: FormState,
        event: str,
        is_valid: bool = True,
        has_more_fields: bool = True
    ) -> FormState:
        if current_state == FormState.START and event == "start":
            return FormState.ASK_FIELD

        if current_state == FormState.ASK_FIELD:
            return FormState.LISTEN

        if current_state == FormState.LISTEN and event == "audio":
            return FormState.TRANSCRIBE

        if current_state == FormState.TRANSCRIBE and event == "transcript":
            return FormState.EXTRACT

        if current_state == FormState.EXTRACT:
            return FormState.VALIDATE

        if current_state == FormState.VALIDATE:
            return FormState.CONFIRM if is_valid else FormState.ASK_FIELD

        if current_state == FormState.CONFIRM:
            if event == "yes":
                return FormState.NEXT_FIELD
            elif event == "no":
                return FormState.ASK_FIELD
            elif event == "unclear":
                return FormState.CONFIRM

        if current_state == FormState.NEXT_FIELD:
            return FormState.ASK_FIELD if has_more_fields else FormState.FINAL_REVIEW

        if current_state == FormState.FINAL_REVIEW:
            if event == "consent":
                return FormState.SUBMIT
            elif event == "edit":
                return FormState.ASK_FIELD

        if current_state == FormState.SUBMIT and event == "valid_consent":
            return FormState.COMPLETE

        return current_state
