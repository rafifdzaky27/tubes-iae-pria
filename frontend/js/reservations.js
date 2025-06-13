// Reservations.js - Handles reservation data fetching and management

document.addEventListener('DOMContentLoaded', function() {
    // Fetch all reservations on page load
    fetchReservations();
    
    // Set up event listeners
    document.getElementById('add-reservation-btn').addEventListener('click', showAddReservationModal);
    document.getElementById('close-reservation-modal').addEventListener('click', closeReservationModal);
    document.getElementById('cancel-reservation').addEventListener('click', closeReservationModal);
    document.getElementById('save-reservation').addEventListener('click', saveReservation);
    document.getElementById('close-delete-modal').addEventListener('click', closeDeleteModal);
    document.getElementById('cancel-delete').addEventListener('click', closeDeleteModal);
    document.getElementById('confirm-delete').addEventListener('click', deleteReservation);
    document.getElementById('reservation-search').addEventListener('input', filterReservations);
    document.getElementById('status-filter').addEventListener('change', filterReservations);
});

// Global variables
let allReservations = [];
let isEditing = false;

// Fetch all reservations from reservation service
async function fetchReservations() {
    try {
        const query = `
            query {
                reservations {
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
        `;
        
        const response = await fetch('http://localhost:8002/graphql', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query })
        });
        
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        
        const data = await response.json();
        
        if (data.errors) {
            throw new Error(data.errors[0].message);
        }
        
        allReservations = data.data.reservations;
        renderReservationsTable(allReservations);
    } catch (error) {
        console.error('Error fetching reservations:', error);
        document.getElementById('reservations-table-body').innerHTML = `
            <tr>
                <td colspan="6" class="error-message">
                    Failed to load reservations. Please try again later.
                </td>
            </tr>
        `;
    }
}

// Render reservations table with data
function renderReservationsTable(reservations) {
    const tableBody = document.getElementById('reservations-table-body');
    
    if (reservations.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-message">
                    No reservations found. Add a new reservation to get started.
                </td>
            </tr>
        `;
        return;
    }
    
    tableBody.innerHTML = '';
    
    reservations.forEach(reservation => {
        const tr = document.createElement('tr');
        
        // Format dates
        const checkInDate = new Date(reservation.checkInDate).toLocaleDateString();
        const checkOutDate = new Date(reservation.checkOutDate).toLocaleDateString();
        
        // Calculate total price
        const checkIn = new Date(reservation.checkInDate);
        const checkOut = new Date(reservation.checkOutDate);
        const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
        const totalPrice = nights * reservation.room.pricePerNight;
        
        // Create status badge with appropriate class
        const statusClass = getStatusClass(reservation.status);
        
        tr.innerHTML = `
            <td>
                <div>${reservation.guest ? reservation.guest.fullName : 'Unknown Guest'}</div>
                <div class="small-text">${reservation.guest ? reservation.guest.email : ''}</div>
            </td>
            <td>
                <div>${reservation.room ? reservation.room.roomNumber : 'Unknown Room'}</div>
                <div class="small-text">${reservation.room ? reservation.room.roomType : ''}</div>
            </td>
            <td>
                <div>Check-in: ${checkInDate}</div>
                <div>Check-out: ${checkOutDate}</div>
                <div class="small-text">${nights} night${nights !== 1 ? 's' : ''}</div>
            </td>
            <td>$${totalPrice.toFixed(2)}</td>
            <td><span class="badge ${statusClass}">${capitalizeFirstLetter(reservation.status)}</span></td>
            <td class="actions">
                <button class="btn-icon edit-reservation" data-id="${reservation.id}">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-icon delete-reservation" data-id="${reservation.id}">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        
        tableBody.appendChild(tr);
    });
    
    // Add event listeners to edit and delete buttons
    document.querySelectorAll('.edit-reservation').forEach(button => {
        button.addEventListener('click', () => editReservation(button.dataset.id));
    });
    
    document.querySelectorAll('.delete-reservation').forEach(button => {
        button.addEventListener('click', () => showDeleteModal(button.dataset.id));
    });
}

// Filter reservations based on search input and status filter
function filterReservations() {
    const searchTerm = document.getElementById('reservation-search').value.toLowerCase();
    const statusFilter = document.getElementById('status-filter').value;
    
    const filteredReservations = allReservations.filter(reservation => {
        const guestName = reservation.guest ? reservation.guest.fullName.toLowerCase() : '';
        const roomNumber = reservation.room ? reservation.room.roomNumber.toLowerCase() : '';
        const checkInDate = new Date(reservation.checkInDate).toLocaleDateString().toLowerCase();
        const checkOutDate = new Date(reservation.checkOutDate).toLocaleDateString().toLowerCase();
        
        const matchesSearch = 
            guestName.includes(searchTerm) ||
            roomNumber.includes(searchTerm) ||
            checkInDate.includes(searchTerm) ||
            checkOutDate.includes(searchTerm) ||
            reservation.status.toLowerCase().includes(searchTerm);
            
        const matchesStatus = statusFilter === 'all' || reservation.status === statusFilter;
        
        return matchesSearch && matchesStatus;
    });
    
    renderReservationsTable(filteredReservations);
}

// Show modal to add a new reservation
async function showAddReservationModal() {
    isEditing = false;
    document.getElementById('reservation-modal-title').textContent = 'Add New Reservation';
    document.getElementById('reservation-form').reset();
    document.getElementById('reservation-id').value = '';
    
    // Set default dates
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    
    document.getElementById('check-in-date').value = today;
    document.getElementById('check-out-date').value = tomorrowStr;
    
    // Fetch guests and rooms for dropdowns
    await populateGuestsDropdown();
    await populateRoomsDropdown();
    
    document.getElementById('reservation-modal').classList.add('active');
}

// Show modal to edit an existing reservation
async function editReservation(reservationId) {
    isEditing = true;
    const reservation = allReservations.find(r => r.id === parseInt(reservationId) || r.id === reservationId);
    
    if (!reservation) {
        console.error('Reservation not found:', reservationId);
        return;
    }
    
    // Fetch guests and rooms for dropdowns
    await populateGuestsDropdown();
    await populateRoomsDropdown();
    
    document.getElementById('reservation-modal-title').textContent = 'Edit Reservation';
    document.getElementById('reservation-id').value = reservation.id;
    document.getElementById('guest-id').value = reservation.guestId;
    document.getElementById('room-id').value = reservation.roomId;
    document.getElementById('check-in-date').value = new Date(reservation.checkInDate).toISOString().split('T')[0];
    document.getElementById('check-out-date').value = new Date(reservation.checkOutDate).toISOString().split('T')[0];
    document.getElementById('reservation-status').value = reservation.status;
    
    document.getElementById('reservation-modal').classList.add('active');
}

// Populate guests dropdown
async function populateGuestsDropdown() {
    try {
        const query = `
            query {
                guests {
                    id
                    fullName
                    email
                }
            }
        `;
        
        const response = await fetch('http://localhost:8003/graphql', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query })
        });
        
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        
        const data = await response.json();
        
        if (data.errors) {
            throw new Error(data.errors[0].message);
        }
        
        const guestSelect = document.getElementById('guest-id');
        guestSelect.innerHTML = '<option value="">Select a guest</option>';
        
        data.data.guests.forEach(guest => {
            const option = document.createElement('option');
            option.value = guest.id;
            option.textContent = `${guest.fullName} (${guest.email})`;
            guestSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error fetching guests:', error);
        alert('Failed to load guests. Please try again.');
    }
}

// Populate rooms dropdown with available rooms
async function populateRoomsDropdown() {
    try {
        const query = `
            query {
                availableRooms {
                    id
                    roomNumber
                    roomType
                    pricePerNight
                }
            }
        `;
        
        const response = await fetch('http://localhost:8001/graphql', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query })
        });
        
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        
        const data = await response.json();
        
        const roomSelect = document.getElementById('room-id');
        roomSelect.innerHTML = '<option value="">Select a room</option>';
        
        // If editing, we need all rooms, not just available ones
        if (isEditing) {
            const allRoomsQuery = `
                query {
                    rooms {
                        id
                        roomNumber
                        roomType
                        pricePerNight
                        status
                    }
                }
            `;
            
            const allRoomsResponse = await fetch('http://localhost:8001/graphql', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ query: allRoomsQuery })
            });
            
            if (!allRoomsResponse.ok) {
                throw new Error('Network response was not ok');
            }
            
            const allRoomsData = await allRoomsResponse.json();
            
            if (allRoomsData.errors) {
                throw new Error(allRoomsData.errors[0].message);
            }
            
            allRoomsData.data.rooms.forEach(room => {
                const option = document.createElement('option');
                option.value = room.id;
                option.textContent = `${room.roomNumber} - ${room.roomType} ($${room.pricePerNight}/night) - ${capitalizeFirstLetter(room.status)}`;
                roomSelect.appendChild(option);
            });
        } else {
            // For new reservations, only show available rooms
            if (data.errors) {
                throw new Error(data.errors[0].message);
            }
            
            if (data.data.availableRooms && data.data.availableRooms.length > 0) {
                data.data.availableRooms.forEach(room => {
                    const option = document.createElement('option');
                    option.value = room.id;
                    option.textContent = `${room.roomNumber} - ${room.roomType} ($${room.pricePerNight}/night)`;
                    roomSelect.appendChild(option);
                });
            } else {
                // If no available rooms endpoint, fall back to all rooms
                const allRoomsQuery = `
                    query {
                        rooms {
                            id
                            roomNumber
                            roomType
                            pricePerNight
                            status
                        }
                    }
                `;
                
                const allRoomsResponse = await fetch('http://localhost:8001/graphql', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ query: allRoomsQuery })
                });
                
                const allRoomsData = await allRoomsResponse.json();
                
                // Filter for available rooms only
                const availableRooms = allRoomsData.data.rooms.filter(room => room.status === 'available');
                
                availableRooms.forEach(room => {
                    const option = document.createElement('option');
                    option.value = room.id;
                    option.textContent = `${room.roomNumber} - ${room.roomType} ($${room.pricePerNight}/night)`;
                    roomSelect.appendChild(option);
                });
            }
        }
    } catch (error) {
        console.error('Error fetching rooms:', error);
        alert('Failed to load rooms. Please try again.');
    }
}

// Close the reservation modal
function closeReservationModal() {
    document.getElementById('reservation-modal').classList.remove('active');
}

// Save a new reservation or update an existing one
async function saveReservation() {
    const reservationId = document.getElementById('reservation-id').value;
    const guestId = document.getElementById('guest-id').value;
    const roomId = document.getElementById('room-id').value;
    const checkInDate = document.getElementById('check-in-date').value;
    const checkOutDate = document.getElementById('check-out-date').value;
    const status = document.getElementById('reservation-status').value;
    
    if (!guestId || !roomId || !checkInDate || !checkOutDate) {
        alert('Please fill in all required fields');
        return;
    }
    
    try {
        let query;
        
        if (isEditing) {
            // Update existing reservation
            query = `
                mutation {
                    updateReservation(
                        id: ${reservationId},
                        reservationData: {
                            guestId: ${guestId},
                            roomId: ${roomId},
                            checkInDate: "${checkInDate}",
                            checkOutDate: "${checkOutDate}",
                            status: "${status}"
                        }
                    ) {
                        id
                        guestId
                        roomId
                        checkInDate
                        checkOutDate
                        status
                    }
                }
            `;
        } else {
            // Create new reservation
            query = `
                mutation {
                    createReservation(
                        reservationData: {
                            guestId: ${guestId},
                            roomId: ${roomId},
                            checkInDate: "${checkInDate}",
                            checkOutDate: "${checkOutDate}",
                            status: "${status}"
                        }
                    ) {
                        id
                        guestId
                        roomId
                        checkInDate
                        checkOutDate
                        status
                    }
                }
            `;
        }
        
        const response = await fetch('http://localhost:8002/graphql', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query })
        });
        
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        
        const data = await response.json();
        
        if (data.errors) {
            throw new Error(data.errors[0].message);
        }
        
        closeReservationModal();
        fetchReservations(); // Refresh the table
        
    } catch (error) {
        console.error('Error saving reservation:', error);
        alert('Failed to save reservation. Please try again. ' + error.message);
    }
}

// Show delete confirmation modal
function showDeleteModal(reservationId) {
    document.getElementById('delete-reservation-id').value = reservationId;
    document.getElementById('delete-modal').classList.add('active');
}

// Close delete confirmation modal
function closeDeleteModal() {
    document.getElementById('delete-modal').classList.remove('active');
}

// Delete a reservation
async function deleteReservation() {
    const reservationId = document.getElementById('delete-reservation-id').value;
    
    try {
        const query = `
            mutation {
                deleteReservation(id: ${reservationId})
            }
        `;
        
        const response = await fetch('http://localhost:8002/graphql', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query })
        });
        
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        
        const data = await response.json();
        
        if (data.errors) {
            throw new Error(data.errors[0].message);
        }
        
        closeDeleteModal();
        fetchReservations(); // Refresh the table
        
    } catch (error) {
        console.error('Error deleting reservation:', error);
        alert('Failed to delete reservation. Please try again.');
    }
}

// Helper function to get status badge class
function getStatusClass(status) {
    switch (status.toLowerCase()) {
        case 'confirmed':
            return 'badge-success';
        case 'checked-in':
            return 'badge-info';
        case 'checked-out':
            return 'badge-secondary';
        case 'cancelled':
            return 'badge-danger';
        default:
            return 'badge-secondary';
    }
}

// Helper function to capitalize first letter
function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}
