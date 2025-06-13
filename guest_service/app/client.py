import os
import logging
from gql import Client, gql
from gql.transport.aiohttp import AIOHTTPTransport

logger = logging.getLogger(__name__)

async def get_loyalty_info_by_email(email):
    """
    Fetch loyalty information for a guest by email from the hotelmate loyalty service
    
    Args:
        email: The email of the guest to fetch loyalty info for
        
    Returns:
        Loyalty info object or None if error occurs
    """
    loyalty_service_url = os.environ.get("LOYALTY_SERVICE_URL", "http://loyalty_service:3001/graphql")
    
    try:
        transport = AIOHTTPTransport(url=loyalty_service_url)
        async with Client(
            transport=transport,
            fetch_schema_from_transport=True,
        ) as session:
            # First try to get the guest by email
            query = gql("""
            query GetGuestByEmail($email: String!) {
                guestByEmail(email: $email) {
                    loyaltyPoints
                    tier
                }
            }
            """)
            
            variables = {"email": email}
            result = await session.execute(query, variable_values=variables)
            
            guest_data = result.get("guestByEmail")
            if not guest_data:
                logger.info(f"No loyalty info found for guest with email {email}")
                return None
            
            # Then get available rewards for the guest's tier
            rewards_query = gql("""
            query GetRewards($tier: String) {
                rewards(tier: $tier, available: true) {
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
            """)
            
            rewards_variables = {"tier": guest_data.get("tier")}
            rewards_result = await session.execute(rewards_query, variable_values=rewards_variables)
            
            loyalty_info = {
                "loyaltyPoints": guest_data.get("loyaltyPoints", 0),
                "tier": guest_data.get("tier", "STANDARD"),
                "availableRewards": rewards_result.get("rewards", [])
            }
            
            logger.info(f"Found loyalty info for guest with email {email}: {loyalty_info['tier']} tier with {loyalty_info['loyaltyPoints']} points")
            return loyalty_info
    except Exception as e:
        logger.error(f"Error fetching loyalty info for guest with email {email}: {str(e)}")
        return None
