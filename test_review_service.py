import requests
import json

def test_review_service():
    """Test the review service GraphQL API"""
    print("Testing review service...")
    
    # Query all reviews from the review service
    query = """
    query {
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
    """
    
    try:
        response = requests.post(
            "http://localhost:3000/graphql",
            json={"query": query},
            headers={"Content-Type": "application/json"}
        )
        
        data = response.json()
        print("Review service response:")
        print(json.dumps(data, indent=2))
        
        # Check if we have reviews
        if data.get("data") and data["data"].get("reviews"):
            reviews = data["data"]["reviews"]
            print(f"Found {len(reviews)} reviews")
            
            # Print details of each review
            for review in reviews:
                print(f"Review ID: {review.get('reviewId')}, Stay ID: {review.get('stayId')}, Rating: {review.get('overallRating')}")
                print(f"Content: {review.get('content')}")
                print(f"Date: {review.get('reviewDate')}")
                print("Aspects:", review.get('aspects'))
                print("-" * 50)
        else:
            print("No reviews found or error in response")
    
    except Exception as e:
        print(f"Error testing review service: {str(e)}")

def test_room_service():
    """Test the room service GraphQL API"""
    print("\nTesting room service...")
    
    # Query rooms with reviews from the room service
    query = """
    query {
        rooms {
            id
            roomNumber
            roomType
            reviews {
                reviewId
                stayId
                overallRating
                content
                reviewDate
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
        
        # Check if we have rooms with reviews
        if data.get("data") and data["data"].get("rooms"):
            rooms = data["data"]["rooms"]
            print(f"Found {len(rooms)} rooms")
            
            # Print details of each room and its reviews
            for room in rooms:
                print(f"Room ID: {room.get('id')}, Room Number: {room.get('roomNumber')}, Type: {room.get('roomType')}")
                
                reviews = room.get("reviews", [])
                print(f"  - Has {len(reviews)} reviews")
                
                for review in reviews:
                    print(f"    - Review ID: {review.get('reviewId')}, Stay ID: {review.get('stayId')}, Rating: {review.get('overallRating')}")
                    print(f"      Content: {review.get('content')}")
                    print(f"      Date: {review.get('reviewDate')}")
                
                print("-" * 50)
        else:
            print("No rooms found or error in response")
    
    except Exception as e:
        print(f"Error testing room service: {str(e)}")

if __name__ == "__main__":
    test_review_service()
    test_room_service()
