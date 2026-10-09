"""
Base Repository Interface for SEVA VAANI.
Provides abstract data access patterns for database entities.
"""

from typing import Generic, TypeVar, Optional, List
from sqlalchemy.orm import Session

T = TypeVar("T")


class BaseRepository(Generic[T]):
    def __init__(self, db: Session):
        self.db = db
