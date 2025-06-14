# HotelEase - Microservices Backend System

A comprehensive microservices-based backend system for hotel operations built with Python, GraphQL, Docker, and PostgreSQL. This system provides a complete solution for hotel management, including room management, reservation handling, guest information management, and billing.

## Project Overview

HotelEase consists of four core microservices, each handling a specific domain of hotel operations:

1. **Room Management Service**: Manages hotel room data (number, type, price, status)
2. **Reservation Service**: Handles room reservations, check-in/out dates, and status
3. **Guest Service**: Manages guest data, profiles, contact information, and stay history
4. **Billing Service**: Calculates bills based on reservations and length of stay

## System Architecture

HotelEase follows a microservices architecture pattern where each service:
- Has its own database
- Exposes a GraphQL API
- Runs in its own Docker container
- Communicates with other services via GraphQL

Additionally, the system integrates with external services from the Hotelmate group:
- **Review Service**: Provides guest reviews for rooms

### Database Schema

The system uses a distributed database architecture with each service having its own PostgreSQL database. Below is the database schema diagram showing the relationships between the main entities:

![Database Schema](https://dbdiagram.io/d/HotelEase-Database-Schema)

#### Key Relationships:
- Rooms have a one-to-many relationship with Reservations
- Guests have a one-to-many relationship with Reservations
- Reservations have a one-to-one relationship with Bills

## Tech Stack

- **Backend Framework**: Python with FastAPI
- **API Layer**: Strawberry GraphQL
- **Database**: PostgreSQL (one database per service)
- **Containerization**: Docker and Docker Compose
- **ORM**: SQLAlchemy
- **Database Drivers**: psycopg2
- **GraphQL Client**: GQL with AIOHTTPTransport for service-to-service communication

## Project Structure

```
hotelease/
├── room_service/
│   ├── app/
│   │   ├── main.py            # FastAPI application setup
│   │   ├── schema_simple.py   # GraphQL schema definition
│   │   ├── schema_new.py      # Enhanced schema with integrations
│   │   ├── models.py          # SQLAlchemy models
│   │   ├── db.py              # Database connection
│   │   └── client.py          # GraphQL client for external services
│   ├── Dockerfile             # Container definition
│   └── requirements.txt       # Dependencies
├── reservation_service/       # Similar structure as room_service
├── guest_service/             # Similar structure as room_service
├── billing_service/           # Similar structure as room_service
├── docker-compose.yml         # Service orchestration
├── HOTEL_API_DOCUMENTATION.md # Detailed API documentation
└── README.md                  # This file
```

## Integration with External Services

HotelEase integrates with the following external services from the Hotelmate group:

### As a Consumer:
- **Room Service** consumes data from **Review Service** (Hotelmate) to display room reviews

### As a Provider:
- **Room Service** provides room data to **Review Service** (Hotelmate) for displaying room details in reviews
- **Guest Service** provides guest data to **Review Service** (Hotelmate) for showing which guest created a review
- **Reservation Service** provides stay data to **Review Service** (Hotelmate) for showing check-in/check-out dates in reviews
- **Reservation Service** provides completed reservation data to **Loyalty Service** (Hotelmate) for calculating loyalty points and determining tier levels (Bronze, Silver, Gold, Platinum)

## Containerization

Each service is containerized using Docker with the following setup:
- Base image: `python:3.9-slim`
- Each service has its own Dockerfile
- PostgreSQL databases run in separate containers
- All services are connected via a Docker network (`hotelease_network`)
- Health checks ensure proper startup sequence
- Persistent volumes for database data

## Getting Started

### Prerequisites

- Docker and Docker Compose
- Python 3.9+ (for local development)

### Running the Services

1. Clone the repository
2. Navigate to the project directory
3. Run the following command to start all services:

```bash
docker-compose up -d
```

4. To check the status of all services:

```bash
docker-compose ps
```

5. To view logs from a specific service:

```bash
docker-compose logs -f <service_name>
```

### GraphQL Endpoints

- Room Service: http://localhost:8001/graphql
- Reservation Service: http://localhost:8002/graphql
- Guest Service: http://localhost:8003/graphql
- Billing Service: http://localhost:8004/graphql
- Review Service (Hotelmate): http://localhost:3000/graphql

Each endpoint provides a GraphQL Playground interface for testing queries and mutations. Detailed API documentation can be found in the `HOTEL_API_DOCUMENTATION.md` file.

## Development Steps

1. Create four separate FastAPI projects
2. Install Strawberry GraphQL and set up PostgreSQL connections
3. Implement GraphQL schemas for each service
4. Write Dockerfiles for each service
5. Create a docker-compose.yml file
6. Test GraphQL endpoints
7. Integrate with Hotelmate services (Review)
8. Implement frontend integration

## Contributors

- PRIA

## License

This project is licensed under the MIT License - see the LICENSE file for details.
