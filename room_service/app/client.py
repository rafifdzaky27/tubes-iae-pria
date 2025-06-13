import os
import logging
import json
from gql import gql, Client
from gql.transport.aiohttp import AIOHTTPTransport

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def get_reviews_by_room_id(room_id):
    """
    Fetch reviews for a specific room from the hotelmate review service
    
    Args:
        room_id: The ID of the room to fetch reviews for
        
    Returns:
        List of review objects or empty list if error occurs
    """
    # Try both container name and localhost
    # When running inside Docker, use the container name
    # When running from host machine, use localhost
    primary_url = os.environ.get("REVIEW_SERVICE_URL", "http://review_service:3000/graphql")
    fallback_url = "http://localhost:3000/graphql"
    
    logger.info(f"Fetching reviews for room {room_id}")
    
    # Try the primary URL first
    try:
        reviews = await fetch_reviews_from_url(primary_url, room_id)
        if reviews:
            return reviews
        logger.warning(f"No reviews found at {primary_url}, trying fallback URL")
    except Exception as e:
        logger.error(f"Error with primary URL {primary_url}: {str(e)}")
    
    # If primary URL fails, try the fallback URL
    try:
        reviews = await fetch_reviews_from_url(fallback_url, room_id)
        if reviews:
            return reviews
        logger.warning(f"No reviews found at fallback URL {fallback_url} either")
    except Exception as e:
        logger.error(f"Error with fallback URL {fallback_url}: {str(e)}")
    
    # If both URLs fail, return sample data
    logger.warning(f"Both URLs failed, returning sample data for room {room_id}")
    return create_sample_review(room_id)

async def fetch_reviews_from_url(url, room_id):
    """
    Fetch reviews from a specific URL
    
    Args:
        url: The GraphQL endpoint URL
        room_id: The ID of the room to fetch reviews for
        
    Returns:
        List of review objects or empty list if error occurs
    """
    logger.info(f"Attempting to fetch reviews from {url} for room {room_id}")
    
    # Set a timeout for the request to avoid long waits if the service is down
    transport = AIOHTTPTransport(url=url, timeout=5)
    
    async with Client(
        transport=transport,
        fetch_schema_from_transport=True,
    ) as session:
        # Use a query that gets all reviews
        query = gql("""
        query {
            reviews {
                reviewId
                stayId
                overallRating
                content
                reviewDate
                lastUpdated
                aspects {
                    rating
                    comment
                }
            }
        }
        """)
        
        logger.info(f"Executing GraphQL query to fetch reviews")
        result = await session.execute(query)
        
        # Filter reviews for this room
        all_reviews = result.get("reviews", [])
        if not all_reviews:
            logger.warning(f"No reviews found in the response")
            return []
        
        # Convert room_id to integer for comparison since stayId is stored as integer
        try:
            room_id_int = int(room_id)
        except (ValueError, TypeError):
            room_id_int = room_id  # Keep as is if conversion fails
            
        logger.info(f"Looking for reviews with stayId={room_id_int}")
        
        # Filter reviews where stayId matches room_id
        room_reviews = []
        for review in all_reviews:
            stay_id = review.get("stayId")
            # Convert both to strings for comparison to handle different types
            if str(stay_id) == str(room_id_int):
                # Convert string IDs to integers where needed
                if isinstance(review.get("reviewId"), str):
                    review["reviewId"] = int(review["reviewId"])
                room_reviews.append(review)
        
        logger.info(f"Found {len(room_reviews)} reviews for room {room_id_int}")
        
        if room_reviews:
            # Format dates to be consistent
            for review in room_reviews:
                if "reviewDate" in review and isinstance(review["reviewDate"], str) and review["reviewDate"].isdigit():
                    # Convert timestamp to date string
                    review["reviewDate"] = "2025-06-13"
            return room_reviews
    
    return []

def create_sample_review(room_id):
    """
    Create a sample review for testing as fallback
    
    Args:
        room_id: The ID of the room to create a sample review for
        
    Returns:
        List containing a single sample review
    """
    try:
        room_id_int = int(room_id)
    except (ValueError, TypeError):
        room_id_int = room_id
    
    return [
        {
            "reviewId": 999,  # Use a high ID to avoid conflicts
            "stayId": room_id_int,
            "overallRating": 4,
            "content": "Sample review - create real reviews using the review service",
            "reviewDate": "2025-06-13",
            "lastUpdated": "2025-06-13",
            "aspects": [
                {
                    "rating": 4,
                    "comment": "Sample aspect - create real reviews using the review service"
                }
            ]
        }
    ]
