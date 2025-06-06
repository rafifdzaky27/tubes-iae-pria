from sqlalchemy import Column, Integer, String, Text
from typing import Optional
from sqlmodel import Field, SQLModel

# Import Base from db.py instead of creating a new one
from .db import Base

class Guest(Base):
    """Guest model based on the ERD"""
    __tablename__ = "guests"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    full_name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    phone = Column(String, nullable=False)
    address = Column(Text, nullable=False)
