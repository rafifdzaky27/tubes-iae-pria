from sqlalchemy import Column, Integer, String, Date, ForeignKey
from typing import Optional
from sqlmodel import Field, SQLModel
from datetime import date

# Import Base from db.py instead of creating a new one
from .db import Base

class Reservation(Base):
    """Reservation model based on the ERD"""
    __tablename__ = "reservations"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    guest_id = Column(Integer, nullable=False)  # Reference to Guest in guest_service
    room_id = Column(Integer, nullable=False)  # Reference to Room in room_service
    check_in_date = Column(Date, nullable=False)
    check_out_date = Column(Date, nullable=False)
    status = Column(String, nullable=False)  # confirmed, checked-in, checked-out, cancelled
