// Billing.js - Handles billing data fetching and management

document.addEventListener('DOMContentLoaded', function() {
    // Fetch all bills on page load
    fetchBills();
    
    // Set up event listeners
    document.getElementById('create-bill-btn').addEventListener('click', showCreateBillModal);
    document.getElementById('close-bill-modal').addEventListener('click', closeBillModal);
    document.getElementById('cancel-bill').addEventListener('click', closeBillModal);
    document.getElementById('save-bill').addEventListener('click', saveBill);
    document.getElementById('close-status-modal').addEventListener('click', closeStatusModal);
    document.getElementById('cancel-status').addEventListener('click', closeStatusModal);
    document.getElementById('save-status').addEventListener('click', updateBillStatus);
    document.getElementById('close-delete-modal').addEventListener('click', closeDeleteModal);
    document.getElementById('cancel-delete').addEventListener('click', closeDeleteModal);
    document.getElementById('confirm-delete').addEventListener('click', deleteBill);
    document.getElementById('bill-search').addEventListener('input', filterBills);
    document.getElementById('status-filter').addEventListener('change', filterBills);
    
    // Add event listener for reservation selection to auto-calculate amount
    document.getElementById('reservation-id').addEventListener('change', calculateBillAmount);
});

// Global variables
let allBills = [];
let allReservations = [];

// Fetch all bills from billing service
async function fetchBills() {
    try {
        const query = `
            query {
                bills {
                    id
                    reservationId
                    totalAmount
                    paymentStatus
                    generatedAt
                }
            }
        `;
        
        // First, get all bills
        const billsResponse = await fetch('http://localhost:8004/graphql', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query })
        });
        
        if (!billsResponse.ok) {
            throw new Error('Network response was not ok');
        }
        
        const billsData = await billsResponse.json();
        
        if (billsData.errors) {
            throw new Error(billsData.errors[0].message);
        }
        
        // Now get reservation details for each bill
        const bills = billsData.data.bills;
        const enhancedBills = [];
        
        for (const bill of bills) {
            // For each bill, fetch its reservation details
            if (bill.reservationId) {
                const reservationQuery = `
                    query {
                        reservation(id: ${bill.reservationId}) {
                            id
                            guestId
                            roomId
                            checkInDate
                            checkOutDate
                            guest {
                                id
                                fullName
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
                
                try {
                    const resResponse = await fetch('http://localhost:8002/graphql', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ query: reservationQuery })
                    });
                    
                    if (resResponse.ok) {
                        const resData = await resResponse.json();
                        if (!resData.errors && resData.data && resData.data.reservation) {
                            // Add reservation data to the bill
                            bill.reservation = resData.data.reservation;
                        }
                    }
                } catch (error) {
                    console.error(`Error fetching reservation ${bill.reservationId}:`, error);
                }
            }
            
            enhancedBills.push(bill);
        }
        
        allBills = enhancedBills;
        renderBillsTable(allBills);
    } catch (error) {
        console.error('Error fetching bills:', error);
        document.getElementById('bills-table-body').innerHTML = `
            <tr>
                <td colspan="7" class="error-message">
                    Failed to load bills. Please try again later.
                </td>
            </tr>
        `;
    }
}

// Render bills table with data
function renderBillsTable(bills) {
    const tableBody = document.getElementById('bills-table-body');
    
    if (bills.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="empty-message">
                    No bills found. Create a new bill to get started.
                </td>
            </tr>
        `;
        return;
    }
    
    tableBody.innerHTML = '';
    
    bills.forEach(bill => {
        const tr = document.createElement('tr');
        
        // Format dates if reservation exists
        let checkInDate = 'N/A';
        let checkOutDate = 'N/A';
        
        if (bill.reservation) {
            checkInDate = new Date(bill.reservation.checkInDate).toLocaleDateString();
            checkOutDate = new Date(bill.reservation.checkOutDate).toLocaleDateString();
        }
        
        // Create status badge with appropriate class
        const statusClass = getStatusClass(bill.paymentStatus);
        
        tr.innerHTML = `
            <td>
                <div>Bill #${bill.id}</div>
                <div class="small-text">Created: ${new Date(bill.generatedAt).toLocaleDateString()}</div>
            </td>
            <td>
                <div>${bill.reservation ? `#${bill.reservation.id}` : 'N/A'}</div>
                <div class="small-text">${checkInDate} - ${checkOutDate}</div>
            </td>
            <td>${bill.reservation && bill.reservation.guest ? bill.reservation.guest.fullName : 'N/A'}</td>
            <td>${bill.reservation && bill.reservation.room ? bill.reservation.room.roomNumber : 'N/A'}</td>
            <td>$${bill.totalAmount.toFixed(2)}</td>
            <td><span class="badge ${statusClass}">${capitalizeFirstLetter(bill.paymentStatus)}</span></td>
            <td class="actions">
                <button class="btn-icon update-status" data-id="${bill.id}" data-status="${bill.paymentStatus}">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-icon delete-bill" data-id="${bill.id}">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        
        tableBody.appendChild(tr);
    });
    
    // Add event listeners to action buttons
    document.querySelectorAll('.update-status').forEach(button => {
        button.addEventListener('click', () => {
            const billId = button.dataset.id;
            const status = button.dataset.status;
            console.log('Event listener triggered with billId:', billId, 'status:', status);
            showStatusModal(billId, status);
        });
    });
    
    document.querySelectorAll('.delete-bill').forEach(button => {
        button.addEventListener('click', () => showDeleteModal(button.dataset.id));
    });
}

// Filter bills based on search input and status filter
function filterBills() {
    const searchTerm = document.getElementById('bill-search').value.toLowerCase();
    const statusFilter = document.getElementById('status-filter').value;
    
    const filteredBills = allBills.filter(bill => {
        const guestName = bill.reservation && bill.reservation.guest ? bill.reservation.guest.fullName.toLowerCase() : '';
        const roomNumber = bill.reservation && bill.reservation.room ? bill.reservation.room.roomNumber.toLowerCase() : '';
        const billId = bill.id.toString();
        const amount = bill.totalAmount.toString();
        
        const matchesSearch = 
            guestName.includes(searchTerm) ||
            roomNumber.includes(searchTerm) ||
            billId.includes(searchTerm) ||
            amount.includes(searchTerm);
            
        const matchesStatus = statusFilter === 'all' || bill.paymentStatus.toLowerCase() === statusFilter.toLowerCase();
        
        return matchesSearch && matchesStatus;
    });
    
    renderBillsTable(filteredBills);
}

// Show modal to create a new bill
async function showCreateBillModal() {
    document.getElementById('bill-form').reset();
    
    // Fetch reservations for dropdown
    await populateReservationsDropdown();
    
    document.getElementById('bill-modal').classList.add('active');
}

// Populate reservations dropdown
async function populateReservationsDropdown() {
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
        
        const reservationSelect = document.getElementById('reservation-id');
        reservationSelect.innerHTML = '<option value="">Select a reservation</option>';
        
        // Only show checked-out or confirmed reservations
        const validReservations = allReservations.filter(res => 
            res.status === 'checked-out' || res.status === 'confirmed' || res.status === 'checked-in'
        );
        
        validReservations.forEach(reservation => {
            const guestName = reservation.guest ? reservation.guest.fullName : 'Unknown Guest';
            const roomNumber = reservation.room ? reservation.room.roomNumber : 'Unknown Room';
            const checkInDate = new Date(reservation.checkInDate).toLocaleDateString();
            const checkOutDate = new Date(reservation.checkOutDate).toLocaleDateString();
            
            const option = document.createElement('option');
            option.value = reservation.id;
            option.textContent = `${guestName} - Room ${roomNumber} (${checkInDate} - ${checkOutDate})`;
            reservationSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error fetching reservations:', error);
        alert('Failed to load reservations. Please try again.');
    }
}

// Calculate bill amount based on selected reservation
function calculateBillAmount() {
    const reservationId = document.getElementById('reservation-id').value;
    
    if (!reservationId) return;
    
    const reservation = allReservations.find(r => r.id == reservationId);
    if (!reservation || !reservation.room || !reservation.room.pricePerNight) return;
    
    // Calculate days between check-in and check-out
    const checkIn = new Date(reservation.checkInDate);
    const checkOut = new Date(reservation.checkOutDate);
    const days = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
    
    // Calculate total amount
    const totalAmount = days * reservation.room.pricePerNight;
    document.getElementById('total-amount').value = totalAmount.toFixed(2);
}

// Close the bill modal
function closeBillModal() {
    document.getElementById('bill-modal').classList.remove('active');
}

// Save a new bill
async function saveBill() {
    const reservationId = document.getElementById('reservation-id').value;
    const totalAmount = parseFloat(document.getElementById('total-amount').value);
    const status = document.getElementById('payment-status').value;
    
    if (!reservationId || isNaN(totalAmount)) {
        alert('Please fill in all required fields');
        return;
    }
    
    try {
        // Create new bill
        const query = `
            mutation {
                createBill(
                    billData: {
                        reservationId: ${reservationId},
                        totalAmount: ${totalAmount},
                        paymentStatus: "${status}"
                    }
                ) {
                    id
                    reservationId
                    totalAmount
                    paymentStatus
                }
            }
        `;
        
        const response = await fetch('http://localhost:8004/graphql', {
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
        
        closeBillModal();
        fetchBills(); // Refresh the table
        
    } catch (error) {
        console.error('Error creating bill:', error);
        alert('Failed to create bill. Please try again.');
    }
}

// Show status update modal
function showStatusModal(billId, currentStatus) {
    console.log('showStatusModal called with billId:', billId, 'type:', typeof billId);
    
    // Make sure billId is a number
    if (typeof billId === 'string') {
        billId = parseInt(billId);
    }
    
    // Set the value and a data attribute to ensure we have the correct value
    const statusBillIdInput = document.getElementById('status-bill-id');
    statusBillIdInput.value = billId;
    statusBillIdInput.setAttribute('data-id', billId);
    
    document.getElementById('new-status').value = currentStatus;
    document.getElementById('status-modal').classList.add('active');
}

// Close status update modal
function closeStatusModal() {
    document.getElementById('status-modal').classList.remove('active');
}

// Update bill status
async function updateBillStatus() {
    // Try to get the billId from multiple sources to ensure we have it
    const statusBillIdInput = document.getElementById('status-bill-id');
    let billId;
    
    // First try the data attribute
    if (statusBillIdInput.getAttribute('data-id')) {
        billId = parseInt(statusBillIdInput.getAttribute('data-id'));
    } else {
        // Fall back to the value
        billId = parseInt(statusBillIdInput.value);
    }
    
    const newStatus = document.getElementById('new-status').value;
    
    // Ensure billId is a valid integer
    if (isNaN(billId)) {
        console.error('Invalid bill ID:', statusBillIdInput.value);
        alert('Invalid bill ID. Please try again.');
        return;
    }
    
    console.log('Updating bill status for ID:', billId, 'to status:', newStatus);
    
    try {
        const query = `
            mutation UpdateBill($billId: Int!, $billData: BillUpdateInput!) {
                updateBill(id: $billId, billData: $billData) {
                    id
                    reservationId
                    totalAmount
                    paymentStatus
                    generatedAt
                }
            }
        `;
        
        const variables = {
            billId: billId,
            billData: {
                paymentStatus: newStatus
            }
        };
        
        console.log('GraphQL variables:', JSON.stringify(variables));
        
        const response = await fetch('http://localhost:8004/graphql', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query, variables })
        });
        
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        
        const data = await response.json();
        
        if (data.errors) {
            throw new Error(data.errors[0].message);
        }
        
        closeStatusModal();
        fetchBills(); // Refresh the table
        
    } catch (error) {
        console.error('Error updating bill status:', error);
        alert('Failed to update bill status. Please try again.');
    }
}

// Show delete confirmation modal
function showDeleteModal(billId) {
    document.getElementById('delete-bill-id').value = billId;
    document.getElementById('delete-modal').classList.add('active');
}

// Close delete confirmation modal
function closeDeleteModal() {
    document.getElementById('delete-modal').classList.remove('active');
}

// Delete a bill
async function deleteBill() {
    const billId = document.getElementById('delete-bill-id').value;
    
    try {
        const query = `
            mutation {
                deleteBill(id: ${billId})
            }
        `;
        
        const response = await fetch('http://localhost:8004/graphql', {
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
        fetchBills(); // Refresh the table
        
    } catch (error) {
        console.error('Error deleting bill:', error);
        alert('Failed to delete bill. Please try again.');
    }
}

// Helper function to get status badge class
function getStatusClass(status) {
    switch (status.toLowerCase()) {
        case 'pending':
            return 'badge-warning';
        case 'paid':
            return 'badge-success';
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
