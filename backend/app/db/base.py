"""
SQLAlchemy Base Model for SEVA VAANI.
Provides declarative base class and registers all models with metadata.
"""

from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy declarative models."""
    pass
