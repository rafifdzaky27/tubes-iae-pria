import requests
import json

def test_room_reviews():
    """Test the room service GraphQL API for a specific room's reviews"""
    print("Testing room service reviews for room 1...")
    
    # Query room 1 with reviews from the room service
    query = """
    query {
        room(id: 1) {
            id
            roomNumber
            roomType
            reviews {
                reviewId
                stayId
                overallRating
                content
                reviewDate
                aspects {
                    rating
                    comment
                }
            }
        }
    }
    """
    
    try:
        response = requests.post(
            "http://localhost:8001/graphql",
            json={"query": query},
            headers={"Content-Type": "application/json"}
        )
        
        data = response.json()
        print("Room service response:")
        print(json.dumps(data, indent=2))
        
        # Check if we have a room with reviews
        if data.get("data") and data["data"].get("room"):
            room = data["data"]["room"]
            print(f"Room ID: {room.get('id')}, Room Number: {room.get('roomNumber')}, Type: {room.get('roomType')}")
            
            reviews = room.get("reviews", [])
            print(f"  - Has {len(reviews)} reviews")
            
            for review in reviews:
                print(f"    - Review ID: {review.get('reviewId')}, Stay ID: {review.get('stayId')}, Rating: {review.get('overallRating')}")
                print(f"      Content: {review.get('content')}")
                print(f"      Date: {review.get('reviewDate')}")
                
                aspects = review.get("aspects", [])
                print(f"      Has {len(aspects)} aspects")
                
                for aspect in aspects:
                    print(f"        - Rating: {aspect.get('rating')}, Comment: {aspect.get('comment')}")
        else:
            print("No room found or error in response")
    
    except Exception as e:
        print(f"Error testing room service: {str(e)}")

if __name__ == "__main__":
    test_room_reviews()
