// Guests.js - Handles guest data fetching and management

document.addEventListener('DOMContentLoaded', function() {
    // Fetch all guests on page load
    fetchGuests();
    
    // Set up event listeners
    document.getElementById('add-guest-btn').addEventListener('click', showAddGuestModal);
    document.getElementById('close-guest-modal').addEventListener('click', closeGuestModal);
    document.getElementById('cancel-guest').addEventListener('click', closeGuestModal);
    document.getElementById('save-guest').addEventListener('click', saveGuest);
    document.getElementById('close-guest-details-modal').addEventListener('click', closeGuestDetailsModal);
    document.getElementById('close-details-btn').addEventListener('click', closeGuestDetailsModal);
    document.getElementById('close-delete-modal').addEventListener('click', closeDeleteModal);
    document.getElementById('cancel-delete').addEventListener('click', closeDeleteModal);
    document.getElementById('confirm-delete').addEventListener('click', deleteGuest);
    document.getElementById('guest-search').addEventListener('input', filterGuests);
});

// Global variables
let allGuests = [];
let isEditing = false;

// Fetch all guests from guest service
async function fetchGuests() {
    try {
        const query = `
            query {
                guests {
                    id
                    fullName
                    email
                    phone
                    address
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
        
        allGuests = data.data.guests;
        renderGuestsTable(allGuests);
    } catch (error) {
        console.error('Error fetching guests:', error);
        document.getElementById('guests-table-body').innerHTML = `
            <tr>
                <td colspan="3" class="error-message">
                    Failed to load guests. Please try again later.
                </td>
            </tr>
        `;
    }
}

// Render guests table with data
function renderGuestsTable(guests) {
    const tableBody = document.getElementById('guests-table-body');
    
    if (guests.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="3" class="empty-message">
                    No guests found. Add a new guest to get started.
                </td>
            </tr>
        `;
        return;
    }
    
    tableBody.innerHTML = '';
    
    guests.forEach(guest => {
        const tr = document.createElement('tr');
        
        tr.innerHTML = `
            <td>${guest.fullName}</td>
            <td>
                <div>${guest.email}</div>
                <div class="small-text">${guest.phone}</div>
            </td>
            <td class="actions">
                <button class="btn-icon view-guest" data-id="${guest.id}">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn-icon edit-guest" data-id="${guest.id}">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-icon delete-guest" data-id="${guest.id}">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        
        tableBody.appendChild(tr);
    });
    
    // Add event listeners to buttons
    document.querySelectorAll('.view-guest').forEach(button => {
        button.addEventListener('click', () => viewGuestDetails(button.dataset.id));
    });
    
    document.querySelectorAll('.edit-guest').forEach(button => {
        button.addEventListener('click', () => editGuest(button.dataset.id));
    });
    
    document.querySelectorAll('.delete-guest').forEach(button => {
        button.addEventListener('click', () => showDeleteModal(button.dataset.id));
    });
}

// Filter guests based on search input
function filterGuests() {
    const searchTerm = document.getElementById('guest-search').value.toLowerCase();
    
    const filteredGuests = allGuests.filter(guest => {
        return (
            guest.fullName.toLowerCase().includes(searchTerm) ||
            guest.email.toLowerCase().includes(searchTerm) ||
            guest.phone.toLowerCase().includes(searchTerm) ||
            guest.id.toString().includes(searchTerm)
        );
    });
    
    renderGuestsTable(filteredGuests);
}

// Show guest details modal with loyalty info and reviews
async function viewGuestDetails(guestId) {
    try {
        // Fetch detailed guest info including loyalty info and reviews
        const query = `
            query {
                guest(id: ${guestId}) {
                    id
                    fullName
                    email
                    phone
                    address
                    loyaltyInfo {
                        points
                        tier
                        memberSince
                        rewards {
                            id
                            name
                            description
                            pointsRequired
                        }
                    }
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
        
        const guest = data.data.guest;
        
        // Populate guest details in modal
        document.getElementById('detail-name').textContent = guest.fullName;
        document.getElementById('detail-email').textContent = guest.email;
        document.getElementById('detail-phone').textContent = guest.phone;
        document.getElementById('detail-address').textContent = guest.address;
        
        // Handle loyalty info - may be null if loyalty service is down
        const loyaltyContainer = document.getElementById('loyalty-info-container');
        if (guest.loyaltyInfo) {
            document.getElementById('detail-loyalty-points').textContent = guest.loyaltyInfo.points;
            document.getElementById('detail-tier').textContent = guest.loyaltyInfo.tier;
            
            // Render rewards if available
            const rewardsContainer = document.getElementById('rewards-container');
            if (guest.loyaltyInfo.rewards && guest.loyaltyInfo.rewards.length > 0) {
                let rewardsHtml = '';
                guest.loyaltyInfo.rewards.forEach(reward => {
                    rewardsHtml += `
                        <div class="reward-item">
                            <div class="reward-name">${reward.name}</div>
                            <div class="reward-description">${reward.description}</div>
                            <div class="reward-points">${reward.pointsRequired} points</div>
                        </div>
                    `;
                });
                rewardsContainer.innerHTML = rewardsHtml;
            } else {
                rewardsContainer.innerHTML = '<p>No rewards available</p>';
            }
        } else {
            // If loyalty info is not available
            loyaltyContainer.innerHTML = '<p>Loyalty information not available</p>';
        }
        
        // Fetch reviews for this guest
        try {
            const reviewsQuery = `
                query {
                    reviewsByGuest(guestId: ${guestId}) {
                        reviewId
                        overallRating
                        content
                        reviewDate
                        room {
                            roomNumber
                        }
                    }
                }
            `;
            
            const reviewsResponse = await fetch('http://localhost:8003/graphql', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ query: reviewsQuery })
            });
            
            if (!reviewsResponse.ok) {
                throw new Error('Network response was not ok');
            }
            
            const reviewsData = await reviewsResponse.json();
            
            // Render reviews
            const reviewsContainer = document.getElementById('reviews-container');
            
            if (reviewsData.data && reviewsData.data.reviewsByGuest && reviewsData.data.reviewsByGuest.length > 0) {
                const reviews = reviewsData.data.reviewsByGuest;
                let reviewsHtml = '';
                
                reviews.forEach(review => {
                    const date = new Date(review.reviewDate).toLocaleDateString();
                    const stars = '★'.repeat(review.overallRating) + '☆'.repeat(5 - review.overallRating);
                    
                    reviewsHtml += `
                        <div class="review-item">
                            <div class="review-header">
                                <div class="review-rating">${stars} (${review.overallRating}/5)</div>
                                <div class="review-date">${date}</div>
                            </div>
                            <div class="review-room">Room: ${review.room ? review.room.roomNumber : 'Unknown'}</div>
                            <div class="review-content">${review.content}</div>
                        </div>
                    `;
                });
                
                reviewsContainer.innerHTML = reviewsHtml;
            } else {
                reviewsContainer.innerHTML = '<p>No reviews available</p>';
            }
        } catch (error) {
            console.error('Error fetching reviews:', error);
            document.getElementById('reviews-container').innerHTML = '<p>Failed to load reviews</p>';
        }
        
        // Show the modal
        document.getElementById('guest-details-modal').classList.add('active');
        
    } catch (error) {
        console.error('Error fetching guest details:', error);
        alert('Failed to load guest details. Please try again.');
    }
}

// Close guest details modal
function closeGuestDetailsModal() {
    document.getElementById('guest-details-modal').classList.remove('active');
}

// Show modal to add a new guest
function showAddGuestModal() {
    isEditing = false;
    document.getElementById('guest-modal-title').textContent = 'Add New Guest';
    document.getElementById('guest-form').reset();
    document.getElementById('guest-id').value = '';
    document.getElementById('guest-modal').classList.add('active');
}

// Show modal to edit an existing guest
function editGuest(guestId) {
    isEditing = true;
    const guest = allGuests.find(g => g.id === parseInt(guestId) || g.id === guestId);
    
    if (!guest) {
        console.error('Guest not found:', guestId);
        return;
    }
    
    document.getElementById('guest-modal-title').textContent = 'Edit Guest';
    document.getElementById('guest-id').value = guest.id;
    document.getElementById('full-name').value = guest.fullName;
    document.getElementById('email').value = guest.email;
    document.getElementById('phone').value = guest.phone;
    document.getElementById('address').value = guest.address;
    
    document.getElementById('guest-modal').classList.add('active');
}

// Close the guest modal
function closeGuestModal() {
    document.getElementById('guest-modal').classList.remove('active');
}

// Save a new guest or update an existing one
async function saveGuest() {
    const guestId = document.getElementById('guest-id').value;
    const name = document.getElementById('full-name').value;
    const email = document.getElementById('email').value;
    const phone = document.getElementById('phone').value;
    const address = document.getElementById('address').value;
    
    if (!name || !email || !phone) {
        alert('Please fill in all required fields');
        return;
    }
    
    try {
        let query;
        
        if (isEditing) {
            // Update existing guest
            query = `
                mutation {
                    updateGuest(
                        id: ${guestId},
                        guestData: {
                            fullName: "${name}",
                            email: "${email}",
                            phone: "${phone}",
                            address: "${address}"
                        }
                    ) {
                        id
                        fullName
                        email
                        phone
                        address
                    }
                }
            `;
        } else {
            // Create new guest
            query = `
                mutation {
                    createGuest(
                        guestData: {
                            fullName: "${name}",
                            email: "${email}",
                            phone: "${phone}",
                            address: "${address}"
                        }
                    ) {
                        id
                        fullName
                        email
                        phone
                        address
                    }
                }
            `;
        }
        
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
        
        closeGuestModal();
        fetchGuests(); // Refresh the table
        
    } catch (error) {
        console.error('Error saving guest:', error);
        alert('Failed to save guest. Please try again.');
    }
}

// Show delete confirmation modal
function showDeleteModal(guestId) {
    document.getElementById('delete-guest-id').value = guestId;
    document.getElementById('delete-modal').classList.add('active');
}

// Close delete confirmation modal
function closeDeleteModal() {
    document.getElementById('delete-modal').classList.remove('active');
}

// Delete a guest
async function deleteGuest() {
    const guestId = document.getElementById('delete-guest-id').value;
    
    try {
        const query = `
            mutation {
                deleteGuest(id: ${guestId})
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
        
        closeDeleteModal();
        fetchGuests(); // Refresh the table
        
    } catch (error) {
        console.error('Error deleting guest:', error);
        alert('Failed to delete guest. Please try again.');
    }
}
