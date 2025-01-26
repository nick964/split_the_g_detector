# errors.py

class CustomError(Exception):
    """A custom exception class to handle specific errors."""
    def __init__(self, message, code=None):
        super().__init__(message)
        self.message = message
        self.code = code
