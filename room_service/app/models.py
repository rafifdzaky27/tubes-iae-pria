from sqlalchemy import Column, Integer, String, Numeric, DateTime, func
from sqlalchemy.sql import expression
from typing import Optional
from sqlmodel import Field, SQLModel

# Import Base from db.py instead of creating a new one
from .db import Base

class Room(Base):
    """Room model based on the ERD"""
    __tablename__ = "rooms"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    room_number = Column(String, unique=True, index=True)
    room_type = Column(String, nullable=False)
    price_per_night = Column(Numeric(10, 2), nullable=False)
    status = Column(String, nullable=False)  # available, occupied, maintenance, etc.
