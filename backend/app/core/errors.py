class SevaVaaniError(Exception):
    pass

class SessionNotFoundError(SevaVaaniError):
    def __init__(self, session_id: str):
        super().__init__(f"Session '{session_id}' not found.")

class FieldValidationError(SevaVaaniError):
    def __init__(self, field_name: str, message: str):
        super().__init__(f"Validation failed for field '{field_name}': {message}")
        self.field_name = field_name
        self.message = message

class UnconfirmedCommitError(SevaVaaniError):
    def __init__(self, field_name: str):
        super().__init__(f"Cannot commit unconfirmed field '{field_name}'. Explicit confirmation required.")

class ConsentRequiredError(SevaVaaniError):
    def __init__(self):
        super().__init__("Application submission blocked: Citizen explicit consent is required.")
