# HotelEase - Microservices Backend System

A microservices-based backend system for hotel operations built with Python, GraphQL, Docker, and PostgreSQL.

## Project Overview

HotelEase consists of four microservices:

1. **Room Management Service**: Manages hotel room data (number, type, price, status)
2. **Reservation Service**: Handles room reservations, check-in/out dates, and status
3. **Guest Service**: Manages guest data, profiles, contact information, and stay history
4. **Billing Service**: Calculates bills based on reservations and length of stay

## Tech Stack

- **Backend**: Python with FastAPI and Strawberry GraphQL
- **Database**: PostgreSQL (one database per service)
- **Containerization**: Docker and Docker Compose
- **ORM**: SQLAlchemy / SQLModel
- **Database Drivers**: psycopg2 / asyncpg

## Project Structure

```
hotelease/
├── room_service/
│   ├── app/
│   │   ├── main.py
│   │   ├── schema.py
│   │   ├── models.py
│   │   └── db.py
│   ├── Dockerfile
│   └── requirements.txt
├── reservation_service/
├── guest_service/
├── billing_service/
├── docker-compose.yml
└── .env (optional)
```

## Getting Started

### Prerequisites

- Docker and Docker Compose
- Python 3.9+

### Running the Services

1. Clone the repository
2. Navigate to the project directory
3. Run the following command to start all services:

```bash
docker-compose up -d
```

### GraphQL Endpoints

- Room Service: http://localhost:8001/graphql
- Reservation Service: http://localhost:8002/graphql
- Guest Service: http://localhost:8003/graphql
- Billing Service: http://localhost:8004/graphql

## Service Communication

Services communicate with each other via GraphQL. For example, the Reservation Service consumes data from the Room Service and Guest Service.

## Development Steps

1. Create four separate FastAPI projects
2. Install Strawberry GraphQL and set up PostgreSQL connections
3. Implement GraphQL schemas for each service
4. Write Dockerfiles for each service
5. Create a docker-compose.yml file
6. Test GraphQL endpoints
7. Integrate with other groups' services
