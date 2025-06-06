from sqlalchemy import Column, Integer, String, Numeric, ForeignKey, TIMESTAMP
from sqlalchemy.sql import func
from typing import Optional
from sqlmodel import Field, SQLModel
from datetime import datetime

# Import Base from db.py instead of creating a new one
from .db import Base

class Bill(Base):
    """Bill model based on the ERD"""
    __tablename__ = "bills"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    reservation_id = Column(Integer, nullable=False)  # Reference to Reservation in reservation_service
    total_amount = Column(Numeric(10, 2), nullable=False)
    payment_status = Column(String, nullable=False)  # pending, paid, cancelled
    generated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)
