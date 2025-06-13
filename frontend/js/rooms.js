// Rooms.js - Handles room data fetching and management

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM fully loaded');
    
    // Fetch all rooms on page load
    fetchRooms();
    
    // Set up event listeners for static elements
    const addRoomBtn = document.getElementById('add-room-btn');
    if (addRoomBtn) {
        console.log('Add Room button found');
        addRoomBtn.addEventListener('click', function() {
            console.log('Add Room button clicked');
            showAddRoomModal();
        });
    } else {
        console.error('Add Room button not found');
    }
    
    document.getElementById('close-room-modal')?.addEventListener('click', closeRoomModal);
    document.getElementById('cancel-room')?.addEventListener('click', closeRoomModal);
    document.getElementById('save-room')?.addEventListener('click', saveRoom);
    document.getElementById('close-delete-modal')?.addEventListener('click', closeDeleteModal);
    document.getElementById('cancel-delete')?.addEventListener('click', closeDeleteModal);
    document.getElementById('confirm-delete')?.addEventListener('click', deleteRoom);
    document.getElementById('room-search')?.addEventListener('input', filterRooms);
    document.getElementById('status-filter')?.addEventListener('change', filterRooms);
    
    // Debug info
    console.log('All event listeners set up');
});

// Global variables
let allRooms = [];
let isEditing = false;

// Fetch all rooms from room service
async function fetchRooms() {
    try {
        const query = `
            query {
                rooms {
                    id
                    roomNumber
                    roomType
                    pricePerNight
                    status
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
        
        if (data.errors) {
            throw new Error(data.errors[0].message);
        }
        
        allRooms = data.data.rooms;
        renderRoomsTable(allRooms);
    } catch (error) {
        console.error('Error fetching rooms:', error);
        document.getElementById('rooms-table-body').innerHTML = `
            <tr>
                <td colspan="6" class="error-message">
                    Failed to load rooms. Please try again later.
                </td>
            </tr>
        `;
    }
}

// Render rooms table with data
function renderRoomsTable(rooms) {
    const tableBody = document.getElementById('rooms-table-body');
    
    if (rooms.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="empty-message">
                    No rooms found. Add a new room to get started.
                </td>
            </tr>
        `;
        return;
    }
    
    tableBody.innerHTML = '';
    
    rooms.forEach(room => {
        const tr = document.createElement('tr');
        
        // Calculate average rating if reviews exist
        let avgRating = 'No reviews';
        let reviewCount = 0;
        if (room.reviews && room.reviews.length > 0) {
            reviewCount = room.reviews.length;
            const totalRating = room.reviews.reduce((sum, review) => sum + (review.overallRating || 0), 0);
            avgRating = (totalRating / room.reviews.length).toFixed(1) + ' ⭐';
        }
        
        // Create status badge with appropriate class
        const statusClass = getStatusClass(room.status);
        
        // Create the row content
        tr.innerHTML = `
            <td>${room.roomNumber}</td>
            <td>${room.roomType}</td>
            <td>$${room.pricePerNight.toFixed(2)}</td>
            <td><span class="badge ${statusClass}">${capitalizeFirstLetter(room.status)}</span></td>
            <td>
                <button class="btn-sm view-reviews" data-id="${room.id}">
                    ${reviewCount > 0 ? `${reviewCount} Reviews ${avgRating}` : 'No reviews'}
                </button>
            </td>
            <td class="actions">
                <button class="btn-icon edit-room" data-id="${room.id}">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-icon delete-room" data-id="${room.id}">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        
        // Add the row to the table
        tableBody.appendChild(tr);
    });
    
    // Add event listeners to all buttons after rendering the table
    addTableEventListeners();
}

// Add event listeners to all buttons in the table
function addTableEventListeners() {
    console.log('Adding event listeners to table buttons');
    
    // First, remove any existing event listeners by cloning and replacing elements
    document.querySelectorAll('.edit-room, .delete-room, .view-reviews').forEach(button => {
        const newButton = button.cloneNode(true);
        button.parentNode.replaceChild(newButton, button);
    });
    
    // Now add fresh event listeners
    // Add event listeners to edit buttons
    const editButtons = document.querySelectorAll('.edit-room');
    console.log(`Found ${editButtons.length} edit buttons`);
    editButtons.forEach(button => {
        button.onclick = function() {
            const roomId = this.getAttribute('data-id');
            console.log(`Edit button clicked for room ID: ${roomId}`);
            editRoom(roomId);
        };
    });

    // Add event listeners to delete buttons
    const deleteButtons = document.querySelectorAll('.delete-room');
    console.log(`Found ${deleteButtons.length} delete buttons`);
    deleteButtons.forEach(button => {
        button.onclick = function() {
            const roomId = this.getAttribute('data-id');
            console.log(`Delete button clicked for room ID: ${roomId}`);
            showDeleteModal(roomId);
        };
    });
    
    // Add event listeners to view reviews buttons
    const reviewButtons = document.querySelectorAll('.view-reviews');
    console.log(`Found ${reviewButtons.length} review buttons`);
    reviewButtons.forEach(button => {
        button.onclick = function() {
            const roomId = this.getAttribute('data-id');
            console.log(`Review button clicked for room ID: ${roomId}`);
            viewRoomReviews(roomId);
        };
    });
}

// Filter rooms based on search input and status filter
function filterRooms() {
    const searchTerm = document.getElementById('room-search').value.toLowerCase();
    const statusFilter = document.getElementById('status-filter').value;
    
    const filteredRooms = allRooms.filter(room => {
        const matchesSearch = 
            room.roomNumber.toLowerCase().includes(searchTerm) ||
            room.roomType.toLowerCase().includes(searchTerm) ||
            room.status.toLowerCase().includes(searchTerm);
            
        const matchesStatus = statusFilter === 'all' || room.status === statusFilter;
        
        return matchesSearch && matchesStatus;
    });
    
    renderRoomsTable(filteredRooms);
}

// Show modal to add a new room
function showAddRoomModal() {
    console.log('Opening Add Room modal');
    isEditing = false;
    document.getElementById('room-modal-title').textContent = 'Add New Room';
    document.getElementById('room-form').reset();
    document.getElementById('room-id').value = '';
    document.getElementById('room-modal').classList.add('active');
}

// Show modal to edit an existing room
function editRoom(roomId) {
    isEditing = true;
    const room = allRooms.find(r => r.id === parseInt(roomId) || r.id === roomId);
    
    if (!room) {
        console.error('Room not found:', roomId);
        return;
    }
    
    document.getElementById('room-modal-title').textContent = 'Edit Room';
    document.getElementById('room-id').value = room.id;
    document.getElementById('room-number').value = room.roomNumber;
    document.getElementById('room-type').value = room.roomType;
    document.getElementById('price-per-night').value = room.pricePerNight;
    document.getElementById('room-status').value = room.status;
    
    document.getElementById('room-modal').classList.add('active');
}

// Close the room modal
function closeRoomModal() {
    document.getElementById('room-modal').classList.remove('active');
}

// Save a new room or update an existing one
async function saveRoom() {
    const roomId = document.getElementById('room-id').value;
    const roomNumber = document.getElementById('room-number').value;
    const roomType = document.getElementById('room-type').value;
    const pricePerNight = parseFloat(document.getElementById('price-per-night').value);
    const status = document.getElementById('room-status').value;
    
    if (!roomNumber || !roomType || isNaN(pricePerNight)) {
        alert('Please fill in all required fields');
        return;
    }
    
    try {
        let query;
        
        if (isEditing) {
            // Update existing room
            query = `
                mutation {
                    updateRoom(
                        id: ${roomId},
                        roomData: {
                            roomNumber: "${roomNumber}",
                            roomType: "${roomType}",
                            pricePerNight: ${pricePerNight},
                            status: "${status}"
                        }
                    ) {
                        id
                        roomNumber
                        roomType
                        pricePerNight
                        status
                    }
                }
            `;
        } else {
            // Create new room
            query = `
                mutation {
                    createRoom(
                        roomData: {
                            roomNumber: "${roomNumber}",
                            roomType: "${roomType}",
                            pricePerNight: ${pricePerNight},
                            status: "${status}"
                        }
                    ) {
                        id
                        roomNumber
                        roomType
                        pricePerNight
                        status
                    }
                }
            `;
        }
        
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
        
        if (data.errors) {
            throw new Error(data.errors[0].message);
        }
        
        closeRoomModal();
        fetchRooms(); // Refresh the table
        
    } catch (error) {
        console.error('Error saving room:', error);
        alert('Failed to save room. Please try again.');
    }
}

// Show delete confirmation modal
function showDeleteModal(roomId) {
    document.getElementById('delete-room-id').value = roomId;
    document.getElementById('delete-modal').classList.add('active');
}

// Close delete confirmation modal
function closeDeleteModal() {
    document.getElementById('delete-modal').classList.remove('active');
}

// Delete a room
async function deleteRoom() {
    const roomId = document.getElementById('delete-room-id').value;
    
    try {
        const query = `
            mutation {
                deleteRoom(id: ${roomId})
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
        
        if (data.errors) {
            throw new Error(data.errors[0].message);
        }
        
        closeDeleteModal();
        fetchRooms(); // Refresh the table
        
    } catch (error) {
        console.error('Error deleting room:', error);
        alert('Failed to delete room. Please try again.');
    }
}

// Helper function to get status badge class
function getStatusClass(status) {
    switch (status.toLowerCase()) {
        case 'available':
            return 'badge-success';
        case 'reserved':
            return 'badge-warning';
        case 'occupied':
            return 'badge-info';
        case 'maintenance':
            return 'badge-danger';
        default:
            return 'badge-secondary';
    }
}

// Helper function to capitalize first letter
function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

// View all reviews for a room
function viewRoomReviews(roomId) {
    console.log('Opening reviews modal for room ID:', roomId);
    const room = allRooms.find(r => r.id === parseInt(roomId) || r.id === roomId);
    if (!room) {
        console.error('Room not found:', roomId);
        return;
    }
    
    // Set the modal title
    document.getElementById('reviews-modal-title').textContent = `Reviews for Room ${room.roomNumber}`;
    
    // Create modal content
    let reviewsHtml = '';
    
    if (!room.reviews || room.reviews.length === 0) {
        reviewsHtml = '<div class="empty-reviews"><p>No reviews available for this room.</p></div>';
    } else {
        reviewsHtml = `<h3>Reviews for Room ${room.roomNumber}</h3>`;
        
        room.reviews.forEach(review => {
            const date = new Date(review.reviewDate).toLocaleDateString();
            reviewsHtml += `
                <div class="review-item">
                    <div class="review-header">
                        <span class="review-rating">${review.overallRating}/5 ⭐</span>
                        <span class="review-date">${date}</span>
                    </div>
                    <div class="review-content">
                        ${review.content || 'No comment provided.'}
                    </div>
            `;

            // Add aspects if they exist
            if (review.aspects && review.aspects.length > 0) {
                review.aspects.forEach((aspect, index) => {
                    reviewsHtml += `
                        <div class="review-aspect">
                            <strong>Aspect ${index + 1}:</strong> ${aspect.rating}/5
                            ${aspect.comment ? `<p>${aspect.comment}</p>` : ''}
                        </div>
                    `;
                });
            }
            
            reviewsHtml += `</div>`;
        });
    }
    
    // Set the reviews content
    document.getElementById('reviews-container').innerHTML = reviewsHtml;
    
    // Show the modal
    document.getElementById('reviews-modal').classList.add('active');
    
    // Add event listeners to close the modal
    document.getElementById('close-reviews-modal').onclick = closeReviewsModal;
    document.getElementById('close-reviews').onclick = closeReviewsModal;
}

// Close the reviews modal
function closeReviewsModal() {
    document.getElementById('reviews-modal').classList.remove('active');
}
