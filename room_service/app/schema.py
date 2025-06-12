import strawberry
from typing import List, Optional
from sqlalchemy.orm import Session
from .models import Room
from .db import get_db
from fastapi import Depends
from strawberry.fastapi import GraphQLRouter

# Input types for mutations
@strawberry.input
class RoomInput:
    room_number: str
    room_type: str
    price_per_night: float
    status: str

@strawberry.input
class RoomUpdateInput:
    room_number: Optional[str] = None
    room_type: Optional[str] = None
    price_per_night: Optional[float] = None
    status: Optional[str] = None

# Output types for queries and mutations
@strawberry.type
class RoomType:
    id: int
    room_number: str
    room_type: str
    price_per_night: float
    status: str

# Convert database model to GraphQL type
def room_to_graphql(room: Room) -> RoomType:
    return RoomType(
        id=room.id,
        room_number=room.room_number,
        room_type=room.room_type,
        price_per_night=float(room.price_per_night),
        status=room.status
    )

# Dependency to get database session for strawberry
def get_context():
    db = next(get_db())
    try:
        yield {"db": db}
    finally:
        db.close()

# Queries
@strawberry.type
class Query:
    @strawberry.field
    def room(self, info, id: int) -> Optional[RoomType]:
        db = info.context["db"]
        room = db.query(Room).filter(Room.id == id).first()
        if room:
            return room_to_graphql(room)
        return None

    @strawberry.field
    def rooms(self, info) -> List[RoomType]:
        db = info.context["db"]
        rooms = db.query(Room).all()
        return [room_to_graphql(room) for room in rooms]
    
    @strawberry.field
    def available_rooms(self, info) -> List[RoomType]:
        db = info.context["db"]
        rooms = db.query(Room).filter(Room.status == "available").all()
        return [room_to_graphql(room) for room in rooms]

# Mutations
@strawberry.type
class Mutation:
    @strawberry.mutation
    def create_room(self, info, room_data: RoomInput) -> RoomType:
        db = info.context["db"]
        room = Room(
            room_number=room_data.room_number,
            room_type=room_data.room_type,
            price_per_night=room_data.price_per_night,
            status=room_data.status
        )
        db.add(room)
        db.commit()
        db.refresh(room)
        return room_to_graphql(room)

    @strawberry.mutation
    def update_room(self, info, id: int, room_data: RoomUpdateInput) -> Optional[RoomType]:
        db = info.context["db"]
        room = db.query(Room).filter(Room.id == id).first()
        if not room:
            return None
        
        if room_data.room_number is not None:
            room.room_number = room_data.room_number
        if room_data.room_type is not None:
            room.room_type = room_data.room_type
        if room_data.price_per_night is not None:
            room.price_per_night = room_data.price_per_night
        if room_data.status is not None:
            room.status = room_data.status
            
        db.commit()
        db.refresh(room)
        return room_to_graphql(room)

    @strawberry.mutation
    def delete_room(self, info, id: int) -> bool:
        db = info.context["db"]
        room = db.query(Room).filter(Room.id == id).first()
        if not room:
            return False
        
        db.delete(room)
        db.commit()
        return True

# Create GraphQL schema
schema = strawberry.Schema(query=Query, mutation=Mutation)

# Create GraphQL router for FastAPI
graphql_router = GraphQLRouter(
    schema,
    context_getter=get_context
)
