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
    availableRewards: List[RewardType]

# Output types for queries and mutations
@strawberry.type
class GuestType:
    id: int
    full_name: str
    email: str
    phone: str
    address: str
    
    @strawberry.field
    async def loyalty_info(self) -> Optional[LoyaltyInfoType]:
        """Fetch loyalty information for this guest from the hotelmate loyalty service"""
        logging.info(f"Fetching loyalty info for guest {self.id} from loyalty service.")
        loyalty_service_url = os.getenv("LOYALTY_SERVICE_URL")
        if not loyalty_service_url:
            logging.error("LOYALTY_SERVICE_URL not configured.")
            return None

        transport = AIOHTTPTransport(url=loyalty_service_url)
        client = Client(transport=transport, fetch_schema_from_transport=False)

        query_string = gql("""
            query GetLoyaltyInfoByGuestId($guestId: Int!) {
                loyaltyInfoByGuestId(guestId: $guestId) {
                    loyaltyPoints
                    tier
                    availableRewards {
                        rewardId
                        name
                        pointsRequired
                        description
                        available
                        tierRestriction
                        createdAt
                        updatedAt
                    }
                }
            }
        """)

        try:
            async with client as session:
                result = await session.execute(query_string, variable_values={"guestId": self.id})
            
            logging.info(f"Received loyalty info response: {result}")
            
            if result and result.get("loyaltyInfoByGuestId"):
                data = result["loyaltyInfoByGuestId"]
                available_rewards = []
                if data.get("availableRewards"):
                    for reward_data in data["availableRewards"]:
                        available_rewards.append(
                            RewardType(
                                rewardId=reward_data.get("rewardId"),
                                name=reward_data.get("name"),
                                pointsRequired=reward_data.get("pointsRequired"),
                                description=reward_data.get("description"),
                                available=reward_data.get("available"),
                                tierRestriction=reward_data.get("tierRestriction"),
                                createdAt=reward_data.get("createdAt"),
                                updatedAt=reward_data.get("updatedAt")
                            )
                        )
                
                return LoyaltyInfoType(
                    loyaltyPoints=data.get("loyaltyPoints"),
                    tier=data.get("tier"),
                    availableRewards=available_rewards
                )
            else:
                logging.warning(f"No loyalty info found for guest {self.id} or unexpected response format.")
                return None
        except httpx.RequestError as e:
            logging.error(f"HTTP request to loyalty service failed for guest {self.id}: {e}")
            return None
        except Exception as e:
            logging.error(f"Error fetching loyalty info for guest {self.id}: {e}")
            return None

# Convert database model to GraphQL type
def guest_to_graphql(guest: Guest) -> GuestType:
    return GuestType(
        id=guest.id,
        full_name=guest.full_name,
        email=guest.email,
        phone=guest.phone,
        address=guest.address
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
schema = strawberry.Schema(query=Query, mutation=Mutation, types=[GuestType, LoyaltyInfoType, RewardType])

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
