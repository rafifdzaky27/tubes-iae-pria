from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from datetime import date, timedelta
from contextlib import asynccontextmanager

from .db import engine, Base, get_db, wait_for_db
from .models import Reservation
from .schema import schema # Import the schema object directly
from strawberry.fastapi import GraphQLRouter
from .client import RoomServiceClient, GuestServiceClient

# Lifespan context manager
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize clients and database
    print("Application startup: Initializing clients and database...")
    
    app.state.room_service_client = RoomServiceClient()
    app.state.guest_service_client = GuestServiceClient()
    print("Service clients initialized.")

    # Wait for database to be ready
    print("Waiting for database to be ready...")
    if wait_for_db():
        print("Creating database tables...")
        Base.metadata.create_all(bind=engine)
        
        print("Adding sample data...")
        db_session = next(get_db())
        try:
            if db_session.query(Reservation).count() == 0:
                today = date.today()
                sample_reservations = [
                    Reservation(
                        guest_id=1, 
                        room_id=1, 
                        check_in_date=today, 
                        check_out_date=today + timedelta(days=3), 
                        status="confirmed"
                    ),
                    Reservation(
                        guest_id=2, 
                        room_id=2, 
                        check_in_date=today + timedelta(days=1), 
                        check_out_date=today + timedelta(days=5), 
                        status="confirmed"
                    ),
                ]
                db_session.add_all(sample_reservations)
                db_session.commit()
                print("Sample data added successfully")
        except Exception as e:
            print(f"Error adding sample data: {e}")
        finally:
            db_session.close()
    else:
        print("Failed to connect to database. Service may not function correctly.")
    
    print("Application startup complete.")
    yield  # Application is running

    # Shutdown: Close clients
    print("Application shutdown: Closing service clients...")
    if hasattr(app.state, 'room_service_client') and app.state.room_service_client:
        await app.state.room_service_client.close()
        print("Room service client closed.")
    if hasattr(app.state, 'guest_service_client') and app.state.guest_service_client:
        await app.state.guest_service_client.close()
        print("Guest service client closed.")
    print("Application shutdown complete.")

# Create FastAPI app with lifespan manager
app = FastAPI(title="Reservation Service", lifespan=lifespan)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Define context getter for Strawberry
async def get_context(request: Request):
    db_session = next(get_db())
    try:
        yield {
            "room_service_client": request.app.state.room_service_client,
            "guest_service_client": request.app.state.guest_service_client,
            "db": db_session
        }
    finally:
        db_session.close()

# Include GraphQL router
graphql_app = GraphQLRouter(schema, context_getter=get_context)
app.include_router(graphql_app, prefix="/graphql")

# Health check endpoint
@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "reservation_service"}

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
