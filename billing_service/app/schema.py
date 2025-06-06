import strawberry
from typing import List, Optional
from sqlalchemy.orm import Session
from datetime import datetime, date
from .models import Bill
from .db import get_db
from fastapi import Depends
from strawberry.fastapi import GraphQLRouter
from .client import ReservationServiceClient, calculate_days

# Dependency to get database session for strawberry
def get_context():
    db = next(get_db())
    try:
        yield {"db": db}
    finally:
        db.close()

# Input types for mutations
@strawberry.input
class BillInput:
    reservation_id: int
    total_amount: float
    payment_status: str = "pending"

@strawberry.input
class BillUpdateInput:
    total_amount: Optional[float] = None
    payment_status: Optional[str] = None

# Output types for queries and mutations
@strawberry.type
class GuestType:
    id: int
    full_name: str
    email: str

@strawberry.type
class RoomType:
    id: int
    room_number: str
    room_type: str
    price_per_night: float

@strawberry.type
class ReservationType:
    id: int
    guest_id: int
    room_id: int
    check_in_date: date
    check_out_date: date
    status: str
    guest: Optional[GuestType] = None
    room: Optional[RoomType] = None

@strawberry.type
class BillType:
    id: int
    reservation_id: int
    total_amount: float
    payment_status: str
    generated_at: datetime
    reservation: Optional[ReservationType] = None

# Convert database model to GraphQL type
def bill_to_graphql(bill: Bill) -> BillType:
    return BillType(
        id=bill.id,
        reservation_id=bill.reservation_id,
        total_amount=bill.total_amount,
        payment_status=bill.payment_status,
        generated_at=bill.generated_at
    )

# Queries
@strawberry.type
class Query:
    @strawberry.field
    async def bill(self, info, id: int) -> Optional[BillType]:
        db = info.context["db"]
        bill = db.query(Bill).filter(Bill.id == id).first()
        if not bill:
            return None
        
        result = bill_to_graphql(bill)
        
        # Fetch related reservation data
        reservation_client = ReservationServiceClient()
        try:
            reservation_data = await reservation_client.get_reservation(bill.reservation_id)
            if reservation_data:
                guest = None
                room = None
                
                if "guest" in reservation_data and reservation_data["guest"]:
                    guest = GuestType(
                        id=reservation_data["guest"]["id"],
                        full_name=reservation_data["guest"]["fullName"],
                        email=reservation_data["guest"]["email"]
                    )
                
                if "room" in reservation_data and reservation_data["room"]:
                    room = RoomType(
                        id=reservation_data["room"]["id"],
                        room_number=reservation_data["room"]["roomNumber"],
                        room_type=reservation_data["room"]["roomType"],
                        price_per_night=reservation_data["room"]["pricePerNight"]
                    )
                
                result.reservation = ReservationType(
                    id=reservation_data["id"],
                    guest_id=reservation_data["guestId"],
                    room_id=reservation_data["roomId"],
                    check_in_date=datetime.fromisoformat(reservation_data["checkInDate"]).date(),
                    check_out_date=datetime.fromisoformat(reservation_data["checkOutDate"]).date(),
                    status=reservation_data["status"],
                    guest=guest,
                    room=room
                )
        finally:
            await reservation_client.close()
            
        return result

    @strawberry.field
    def bills(self, info) -> List[BillType]:
        db = info.context["db"]
        bills = db.query(Bill).all()
        return [bill_to_graphql(bill) for bill in bills]
    
    @strawberry.field
    def bills_by_reservation(self, info, reservation_id: int) -> List[BillType]:
        db = info.context["db"]
        bills = db.query(Bill).filter(Bill.reservation_id == reservation_id).all()
        return [bill_to_graphql(bill) for bill in bills]
    
    @strawberry.field
    def bills_by_status(self, info, status: str) -> List[BillType]:
        db = info.context["db"]
        bills = db.query(Bill).filter(Bill.payment_status == status).all()
        return [bill_to_graphql(bill) for bill in bills]

# Mutations
@strawberry.type
class Mutation:
    @strawberry.mutation
    async def create_bill(self, info, bill_data: BillInput = None, reservation_id: int = None) -> BillType:
        db = info.context["db"]
        # If bill_data is provided, use it directly
        if bill_data:
            bill = Bill(
                reservation_id=bill_data.reservation_id,
                total_amount=bill_data.total_amount,
                payment_status=bill_data.payment_status
            )
        # Otherwise, calculate bill based on reservation details
        elif reservation_id:
            reservation_client = ReservationServiceClient()
            try:
                reservation_data = await reservation_client.get_reservation(reservation_id)
                if not reservation_data:
                    raise Exception(f"Reservation {reservation_id} not found")
                
                # Calculate total amount based on room price and length of stay
                check_in_date = datetime.fromisoformat(reservation_data["checkInDate"]).date()
                check_out_date = datetime.fromisoformat(reservation_data["checkOutDate"]).date()
                days = calculate_days(check_in_date, check_out_date)
                price_per_night = reservation_data["room"]["pricePerNight"]
                total_amount = days * price_per_night
                
                bill = Bill(
                    reservation_id=reservation_id,
                    total_amount=total_amount,
                    payment_status="pending"
                )
            finally:
                await reservation_client.close()
        else:
            raise Exception("Either bill_data or reservation_id must be provided")
        
        db.add(bill)
        db.commit()
        db.refresh(bill)
        return bill_to_graphql(bill)

    @strawberry.mutation
    def update_bill(self, info, id: int, bill_data: BillUpdateInput) -> Optional[BillType]:
        db = info.context["db"]
        bill = db.query(Bill).filter(Bill.id == id).first()
        if not bill:
            return None
        
        if bill_data.total_amount is not None:
            bill.total_amount = bill_data.total_amount
        if bill_data.payment_status is not None:
            bill.payment_status = bill_data.payment_status
            
        db.commit()
        db.refresh(bill)
        return bill_to_graphql(bill)

    @strawberry.mutation
    def delete_bill(self, info, id: int) -> bool:
        db = info.context["db"]
        bill = db.query(Bill).filter(Bill.id == id).first()
        if not bill:
            return False
        
        db.delete(bill)
        db.commit()
        return True

# Create GraphQL schema
schema = strawberry.Schema(query=Query, mutation=Mutation)

# Create GraphQL router for FastAPI
graphql_router = GraphQLRouter(
    schema,
    context_getter=get_context
)
