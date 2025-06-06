import strawberry
from typing import List, Optional
from sqlalchemy.orm import Session
from datetime import date
from .models import Reservation
from .db import get_db
from fastapi import Depends
from strawberry.fastapi import GraphQLRouter
from .client import RoomServiceClient, GuestServiceClient
import logging

# Configure basic logging
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO) # You can set this to logging.DEBUG for more verbose output

# Context (including db session and service clients) is now provided by main.py's get_context

# Input types for mutations
@strawberry.input
class ReservationInput:
    guest_id: int
    room_id: int
    check_in_date: date
    check_out_date: date
    status: str = "confirmed"

@strawberry.input
class ReservationUpdateInput:
    guest_id: Optional[int] = None
    room_id: Optional[int] = None
    check_in_date: Optional[date] = None
    check_out_date: Optional[date] = None
    status: Optional[str] = None

# Output types for queries and mutations
@strawberry.type
class RoomType:
    id: int
    room_number: str
    room_type: str
    price_per_night: float
    status: str

@strawberry.type
class GuestType:
    id: int
    full_name: str
    email: str
    phone: str
    address: str

@strawberry.type
class ReservationType:
    id: int
    guest_id: int
    room_id: int
    check_in_date: date
    check_out_date: date
    status: str

    # Field resolvers for guest and room
    @strawberry.field
    async def guest(self, info) -> Optional[GuestType]:
        if self.guest_id is None:
            logger.info(f"Guest ID is None for reservation, skipping guest fetch.")
            return None
        
        try:
            logger.info(f"Attempting to fetch guest {self.guest_id} for reservation {self.id}")
            guest_client = info.context["guest_service_client"]
            guest_data = await guest_client.get_guest(self.guest_id)
            if guest_data:
                logger.info(f"Successfully fetched guest {self.guest_id}: {guest_data}")
                return GuestType(
                    id=guest_data["id"],
                    full_name=guest_data.get("fullName"),
                    email=guest_data.get("email"),
                    phone=guest_data.get("phone"),
                    address=guest_data.get("address")
                )
            logger.warning(f"No data returned for guest {self.guest_id} from GuestService.")
            return None
        except Exception as e:
            logger.error(f"Error fetching guest {self.guest_id} for reservation {self.id}: {e}", exc_info=True)
            return None
        finally:
            # Client lifecycle is managed by FastAPI lifespan, no need to close here
            logger.info(f"Finished attempt to fetch guest {self.guest_id}")

    @strawberry.field
    async def room(self, info) -> Optional[RoomType]:
        if self.room_id is None:
            logger.info(f"Room ID is None for reservation, skipping room fetch.")
            return None

        try:
            logger.info(f"Attempting to fetch room {self.room_id} for reservation {self.id}")
            room_client = info.context["room_service_client"]
            room_data = await room_client.get_room(self.room_id)
            if room_data:
                logger.info(f"Successfully fetched room {self.room_id}: {room_data}")
                return RoomType(
                    id=room_data["id"],
                    room_number=room_data["roomNumber"],
                    room_type=room_data["roomType"],
                    price_per_night=room_data["pricePerNight"],
                    status=room_data["status"]
                )
            logger.warning(f"No data returned for room {self.room_id} from RoomService.")
            return None
        except Exception as e:
            logger.error(f"Error fetching room {self.room_id} for reservation {self.id}: {e}", exc_info=True)
            return None
        finally:
            # Client lifecycle is managed by FastAPI lifespan, no need to close here
            logger.info(f"Finished attempt to fetch room {self.room_id}")

# Convert database model to GraphQL type
def reservation_to_graphql(reservation: Reservation) -> ReservationType:
    return ReservationType(
        id=reservation.id,
        guest_id=reservation.guest_id,
        room_id=reservation.room_id,
        check_in_date=reservation.check_in_date,
        check_out_date=reservation.check_out_date,
        status=reservation.status
    )

# Queries
@strawberry.type
class Query:
    @strawberry.field
    async def reservation(self, info, id: int) -> Optional[ReservationType]:
        db = info.context["db"]
        reservation = db.query(Reservation).filter(Reservation.id == id).first()
        if not reservation:
            return None
        
        result = reservation_to_graphql(reservation)
        
        # Fetch related guest and room data
        room_client = RoomServiceClient()
        guest_client = GuestServiceClient()
        
        try:
            room_data = await room_client.get_room(reservation.room_id)
            if room_data:
                result.room = RoomType(
                    id=room_data["id"],
                    room_number=room_data["roomNumber"],  # Changed to camelCase
                    room_type=room_data["roomType"],        # Changed to camelCase
                    price_per_night=room_data["pricePerNight"],# Changed to camelCase
                    status=room_data["status"]
                )
                
            guest_data = await guest_client.get_guest(reservation.guest_id)
            if guest_data:
                result.guest = GuestType(
                    id=guest_data["id"],
                    full_name=guest_data.get("fullName"),  # Changed to get("fullName")
                    email=guest_data.get("email"),        # Using .get for safety
                    phone=guest_data.get("phone"),        # Using .get for safety
                    address=guest_data.get("address")     # Using .get for safety
                )
        finally:
            await room_client.close()
            await guest_client.close()
            
        return result

    @strawberry.field
    def reservations(self, info) -> List[ReservationType]:
        db = info.context["db"]
        reservations = db.query(Reservation).all()
        return [reservation_to_graphql(reservation) for reservation in reservations]
    
    @strawberry.field
    def reservations_by_guest(self, info, guest_id: int) -> List[ReservationType]:
        db = info.context["db"]
        reservations = db.query(Reservation).filter(Reservation.guest_id == guest_id).all()
        return [reservation_to_graphql(reservation) for reservation in reservations]
    
    @strawberry.field
    def reservations_by_room(self, info, room_id: int) -> List[ReservationType]:
        db = info.context["db"]
        reservations = db.query(Reservation).filter(Reservation.room_id == room_id).all()
        return [reservation_to_graphql(reservation) for reservation in reservations]

# Mutations
@strawberry.type
class Mutation:
    @strawberry.mutation
    async def create_reservation(self, info, reservation_data: ReservationInput) -> ReservationType:
        db = info.context["db"]
        room_service_client = info.context["room_service_client"]
        guest_service_client = info.context["guest_service_client"]
        try:
            # Check room availability
            room_data = await room_service_client.get_room(reservation_data.room_id)
            if not room_data or room_data["status"] != "available":
                raise Exception(f"Room {reservation_data.room_id} is not available")

            # Create reservation
            reservation = Reservation(
                guest_id=reservation_data.guest_id,
                room_id=reservation_data.room_id,
                check_in_date=reservation_data.check_in_date,
                check_out_date=reservation_data.check_out_date,
                status=reservation_data.status
            )
            db.add(reservation)
            db.commit()
            db.refresh(reservation)

            # Update room status to reserved
            await room_service_client.update_room_status(reservation_data.room_id, "reserved")
            
            # Convert to GraphQL type and fetch related data for response
            graphql_reservation = reservation_to_graphql(reservation)
            
            # Fetch guest details for the response
            guest_data = await guest_service_client.get_guest(reservation.guest_id)
            if guest_data:
                graphql_reservation.guest = GuestType(
                    id=guest_data["id"],
                    full_name=guest_data.get("fullName"),
                    email=guest_data.get("email"),
                    phone=guest_data.get("phone"),
                    address=guest_data.get("address")
                )
            
            # Room data for the response is already fetched and known
            # Re-fetch to get the absolute latest, or use the one from check if acceptable
            # For consistency, let's re-fetch, though room_data from above could be used if status is manually set to 'reserved'
            updated_room_data = await room_service_client.get_room(reservation.room_id) 
            if updated_room_data:
                graphql_reservation.room = RoomType(
                    id=updated_room_data["id"],
                    room_number=updated_room_data["roomNumber"],
                    room_type=updated_room_data["roomType"],
                    price_per_night=updated_room_data["pricePerNight"],
                    status=updated_room_data["status"] # This should now be 'reserved'
                )

            return graphql_reservation
        except Exception as e:
            logger.error(f"Error creating reservation: {e}", exc_info=True)
            if db.in_transaction():
                db.rollback()
            raise e # Re-raise the exception to be caught by Strawberry's error handling
        finally:
            # Clients are managed by lifespan
            pass
                
    @strawberry.mutation
    async def update_reservation(self, info, id: int, reservation_data: ReservationUpdateInput) -> Optional[ReservationType]:
        db = info.context["db"]
        room_service_client = info.context["room_service_client"]
        guest_service_client = info.context["guest_service_client"]
        
        reservation = db.query(Reservation).filter(Reservation.id == id).first()
        if not reservation:
            raise Exception(f"Reservation with id {id} not found")

        try:
            # Handle room status changes if room_id is updated
            if reservation_data.room_id is not None and reservation_data.room_id != reservation.room_id:
                # Check new room availability
                new_room_data = await room_service_client.get_room(reservation_data.room_id)
                if not new_room_data or new_room_data["status"] != "available":
                    raise Exception(f"Room {reservation_data.room_id} is not available")
                
                # Update old room status to available
                await room_service_client.update_room_status(reservation.room_id, "available")
                
                # Update new room status to reserved
                await room_service_client.update_room_status(reservation_data.room_id, "reserved")
                
                reservation.room_id = reservation_data.room_id
            
            # Update other fields
            if reservation_data.guest_id is not None:
                reservation.guest_id = reservation_data.guest_id
            if reservation_data.check_in_date is not None:
                reservation.check_in_date = reservation_data.check_in_date
            if reservation_data.check_out_date is not None:
                reservation.check_out_date = reservation_data.check_out_date
            if reservation_data.status is not None:
                reservation.status = reservation_data.status
                
                # If status is changed to checked-out, update room status to available
                if reservation_data.status == "checked-out":
                    await room_service_client.update_room_status(reservation.room_id, "available")
                
            db.commit()
            db.refresh(reservation)
            
            graphql_reservation = reservation_to_graphql(reservation)

            # Fetch full details for the response using context clients
            current_room_data = await room_service_client.get_room(reservation.room_id)
            if current_room_data:
                graphql_reservation.room = RoomType(
                    id=current_room_data["id"],
                    room_number=current_room_data["roomNumber"],
                    room_type=current_room_data["roomType"],
                    price_per_night=current_room_data["pricePerNight"],
                    status=current_room_data["status"]
                )

            current_guest_data = await guest_service_client.get_guest(reservation.guest_id)
            if current_guest_data:
                graphql_reservation.guest = GuestType(
                    id=current_guest_data["id"],
                    full_name=current_guest_data.get("fullName"),
                    email=current_guest_data.get("email" ),
                    phone=current_guest_data.get("phone"),
                    address=current_guest_data.get("address")
                )
            
            return graphql_reservation
        finally:
            # Clients are managed by lifespan
            pass
            
    @strawberry.mutation
    async def delete_reservation(self, info, id: int) -> bool:
        db = info.context["db"]
        room_service_client = info.context["room_service_client"]
        reservation = db.query(Reservation).filter(Reservation.id == id).first()
        if not reservation:
            return False
        
        # Update room status to available
        try:
            await room_service_client.update_room_status(reservation.room_id, "available")
            db.delete(reservation)
            db.commit()
            return True
        finally:
            # Client is managed by lifespan
            pass

# Create GraphQL schema
schema = strawberry.Schema(query=Query, mutation=Mutation)

# GraphQLRouter is now created in main.py with a new context_getter.
# This file (schema.py) only needs to export the 'schema' object.
