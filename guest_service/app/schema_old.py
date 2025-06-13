import strawberry
from typing import List, Optional
from sqlalchemy.orm import Session
from .models import Guest
from .db import get_db
from fastapi import Depends
from strawberry.fastapi import GraphQLRouter
import os
import logging
import httpx
from gql import Client, gql
from gql.transport.aiohttp import AIOHTTPTransport

# Input types for mutations
@strawberry.input
class GuestInput:
    full_name: str
    email: str
    phone: str
    address: str

@strawberry.input
class GuestUpdateInput:
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None

# Loyalty types for integration with hotelmate loyalty service
@strawberry.type
class RewardType:
    rewardId: int
    name: str
    pointsRequired: int
    description: Optional[str] = None
    available: bool
    tierRestriction: Optional[str] = None
    createdAt: str
    updatedAt: str

@strawberry.type
class LoyaltyInfoType:
    loyaltyPoints: int
    tier: str
    availableRewards: List[RewardType] = strawberry.field(default_factory=list)

# Output types for queries and mutations
@strawberry.type
class GuestType:
    id: int
    full_name: str
    email: str
    phone: str
    address: str
    loyalty_info: Optional[LoyaltyInfoType] = None

# Convert database model to GraphQL type with sample loyalty info
def guest_to_graphql(guest: Guest) -> GuestType:
    # Create sample rewards for testing
    sample_rewards = [
        RewardType(
            rewardId=1,
            name="Free Breakfast",
            pointsRequired=50,
            description="Enjoy a complimentary breakfast during your stay",
            available=True,
            tierRestriction="STANDARD",
            createdAt="2025-01-01T00:00:00Z",
            updatedAt="2025-01-01T00:00:00Z"
        ),
        RewardType(
            rewardId=2,
            name="Room Upgrade",
            pointsRequired=100,
            description="Upgrade to a better room category",
            available=True,
            tierRestriction="STANDARD",
            createdAt="2025-01-01T00:00:00Z",
            updatedAt="2025-01-01T00:00:00Z"
        )
    ]
    
    # Create loyalty info
    loyalty_info = LoyaltyInfoType(
        loyaltyPoints=100,
        tier="STANDARD",
        availableRewards=sample_rewards
    )
    
    return GuestType(
        id=guest.id,
        full_name=guest.full_name,
        email=guest.email,
        phone=guest.phone,
        address=guest.address,
        loyalty_info=loyalty_info
    )

# The guest_to_graphql function is defined above

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
    def guest(self, info, id: int) -> Optional[GuestType]:
        db = info.context["db"]
        guest = db.query(Guest).filter(Guest.id == id).first()
        if guest:
            return guest_to_graphql(guest)
        return None

    @strawberry.field
    def guests(self, info) -> List[GuestType]:
        db = info.context["db"]
        guests = db.query(Guest).all()
        return [guest_to_graphql(guest) for guest in guests]
    
    @strawberry.field
    def guest_by_email(self, info, email: str) -> Optional[GuestType]:
        db = info.context["db"]
        guest = db.query(Guest).filter(Guest.email == email).first()
        if guest:
            return guest_to_graphql(guest)
        return None

# Mutations
@strawberry.type
class Mutation:
    @strawberry.mutation
    def create_guest(self, info, guest_data: GuestInput) -> GuestType:
        db = info.context["db"]
        guest = Guest(
            full_name=guest_data.full_name,
            email=guest_data.email,
            phone=guest_data.phone,
            address=guest_data.address
        )
        db.add(guest)
        db.commit()
        db.refresh(guest)
        return guest_to_graphql(guest)

    @strawberry.mutation
    def update_guest(self, info, id: int, guest_data: GuestUpdateInput) -> Optional[GuestType]:
        db = info.context["db"]
        guest = db.query(Guest).filter(Guest.id == id).first()
        if not guest:
            return None
        
        if guest_data.full_name is not None:
            guest.full_name = guest_data.full_name
        if guest_data.email is not None:
            guest.email = guest_data.email
        if guest_data.phone is not None:
            guest.phone = guest_data.phone
        if guest_data.address is not None:
            guest.address = guest_data.address
            
        db.commit()
        db.refresh(guest)
        return guest_to_graphql(guest)

    @strawberry.mutation
    def delete_guest(self, info, id: int) -> bool:
        db = info.context["db"]
        guest = db.query(Guest).filter(Guest.id == id).first()
        if not guest:
            return False
        
        db.delete(guest)
        db.commit()
        return True

# Create GraphQL schema
schema = strawberry.Schema(query=Query, mutation=Mutation)

# Create GraphQL router for FastAPI
graphql_router = GraphQLRouter(
    schema,
    context_getter=get_context
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
