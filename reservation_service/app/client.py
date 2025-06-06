import httpx
import os
import json
from typing import Dict, Any, Optional

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

# Client for Room Service
class RoomServiceClient:
    def __init__(self):
        room_service_url = os.getenv("ROOM_SERVICE_URL", "http://localhost:8000/graphql") # Corrected port to 8000
        self.client = GraphQLClient(room_service_url)
    
    async def get_room(self, room_id: int):
        query = """
        query GetRoom($id: Int!) {
            room(id: $id) {
                id
                roomNumber
                roomType
                pricePerNight
                status
            }
        }
        """
        variables = {"id": room_id}
        result = await self.client.execute_query(query, variables)
        return result["room"]
    
    async def get_available_rooms(self):
        query = """
        query {
            available_rooms {
                id
                roomNumber
                roomType
                pricePerNight
                status
            }
        }
        """
        result = await self.client.execute_query(query)
        return result["available_rooms"]
    
    async def update_room_status(self, room_id: int, status: str):
        mutation = """
        mutation UpdateRoom($id: Int!, $roomData: RoomUpdateInput!) {
            updateRoom(id: $id, roomData: $roomData) {
                id
                roomNumber
                status
            }
        }
        """
        variables = {
            "id": room_id,
            "roomData": {"status": status}
        }
        result = await self.client.execute_query(mutation, variables)
        return result["updateRoom"]
    
    async def close(self):
        await self.client.close()

# Client for Guest Service
class GuestServiceClient:
    def __init__(self):
        guest_service_url = os.getenv("GUEST_SERVICE_URL", "http://localhost:8001/graphql") # Corrected port to 8001
        self.client = GraphQLClient(guest_service_url)
    
    async def get_guest(self, guest_id: int):
        query = """
        query GetGuest($id: Int!) {
            guest(id: $id) {
                id
                fullName
                email
                phone
                address
            }
        }
        """
        variables = {"id": guest_id}
        result = await self.client.execute_query(query, variables)
        return result["guest"]
    
    async def close(self):
        await self.client.close()
