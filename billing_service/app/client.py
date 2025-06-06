import httpx
import os
import json
from typing import Dict, Any, Optional
from datetime import date

class GraphQLClient:
    def __init__(self, url: str):
        self.url = url
        self.client = httpx.AsyncClient(timeout=30.0)
        
    async def execute_query(self, query: str, variables: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Execute a GraphQL query against the specified endpoint"""
        payload = {
            "query": query,
            "variables": variables or {}
        }
        
        headers = {
            "Content-Type": "application/json"
        }
        
        response = await self.client.post(
            self.url,
            headers=headers,
            content=json.dumps(payload)
        )
        
        if response.status_code != 200:
            raise Exception(f"GraphQL request failed with status code {response.status_code}: {response.text}")
        
        result = response.json()
        
        if "errors" in result:
            raise Exception(f"GraphQL query execution error: {result['errors']}")
        
        return result["data"]
    
    async def close(self):
        await self.client.aclose()

# Client for Reservation Service
class ReservationServiceClient:
    def __init__(self):
        reservation_service_url = os.getenv("RESERVATION_SERVICE_URL", "http://localhost:8002/graphql")
        self.client = GraphQLClient(reservation_service_url)
    
    async def get_reservation(self, reservation_id: int):
        query = """
        query GetReservation($id: Int!) {
            reservation(id: $id) {
                id
                guestId
                roomId
                checkInDate
                checkOutDate
                status
                guest {
                    id
                    fullName
                    email
                }
                room {
                    id
                    roomNumber
                    roomType
                    pricePerNight
                }
            }
        }
        """
        variables = {"id": reservation_id}
        result = await self.client.execute_query(query, variables)
        return result["reservation"]
    
    async def close(self):
        await self.client.close()

# Helper function to calculate the number of days between two dates
def calculate_days(check_in: date, check_out: date) -> int:
    delta = check_out - check_in
    return max(1, delta.days)  # Minimum 1 day
