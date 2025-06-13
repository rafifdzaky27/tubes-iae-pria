// Dashboard.js - Handles dashboard data and charts

document.addEventListener('DOMContentLoaded', function() {
    // Update last updated time
    document.getElementById('last-updated-time').textContent = new Date().toLocaleTimeString();
    
    // Fetch summary data from services first
    fetchDashboardData()
        .then(() => {
            // After data is fetched, initialize charts with real data
            initChartsWithRealData();
        })
        .catch(error => {
            console.error('Error initializing dashboard:', error);
            // Initialize charts with sample data if there's an error
            initOccupancyChart();
            initRevenueChart();
        });
});

// Global variables to store dashboard data
let dashboardData = {
    roomStats: null,
    guestStats: null,
    reservationStats: null,
    billingStats: null,
    recentActivity: null,
    monthlyRevenue: null
};

// Fetch data from all services for dashboard
async function fetchDashboardData() {
    try {
        // Fetch room statistics
        dashboardData.roomStats = await fetchRoomStatistics();
        document.getElementById('available-rooms').textContent = dashboardData.roomStats.availableRooms;
        document.getElementById('occupied-rooms').textContent = dashboardData.roomStats.occupiedRooms;
        
        // Fetch guest statistics
        dashboardData.guestStats = await fetchGuestStatistics();
        document.getElementById('total-guests').textContent = dashboardData.guestStats.totalGuests;
        document.getElementById('new-guests').textContent = dashboardData.guestStats.newGuestsThisMonth;
        
        // Fetch reservation statistics
        dashboardData.reservationStats = await fetchReservationStatistics();
        document.getElementById('active-reservations').textContent = dashboardData.reservationStats.activeReservations;
        document.getElementById('upcoming-reservations').textContent = dashboardData.reservationStats.upcomingReservations;
        
        // Fetch billing statistics
        dashboardData.billingStats = await fetchBillingStatistics();
        document.getElementById('pending-payments').textContent = dashboardData.billingStats.pendingPayments;
        
        // Format total revenue with currency symbol
        const formattedRevenue = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(dashboardData.billingStats.totalRevenue);
        document.getElementById('total-revenue').textContent = formattedRevenue;
        
        // Fetch recent activity
        dashboardData.recentActivity = await fetchRecentActivity();
        updateRecentActivity(dashboardData.recentActivity);
        
        // Fetch monthly revenue data
        dashboardData.monthlyRevenue = await fetchMonthlyRevenue();
        
        return dashboardData;
    } catch (error) {
        console.error('Error fetching dashboard data:', error);
        throw error;
    }
}

// Fetch room statistics from room service
async function fetchRoomStatistics() {
    try {
        const query = `
            query {
                roomStatistics {
                    totalRooms
                    availableRooms
                    reservedRooms
                    occupiedRooms
                    maintenanceRooms
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
        
        // If real data is not available, use sample data
        if (data.errors || !data.data || !data.data.roomStatistics) {
            console.warn('Using sample room statistics data');
            return {
                totalRooms: 50,
                availableRooms: 15,
                reservedRooms: 20,
                occupiedRooms: 12,
                maintenanceRooms: 3
            };
        }
        
        return data.data.roomStatistics;
    } catch (error) {
        console.error('Error fetching room statistics:', error);
        // Return sample data if API fails
        return {
            totalRooms: 50,
            availableRooms: 15,
            reservedRooms: 20,
            occupiedRooms: 12,
            maintenanceRooms: 3
        };
    }
}

// Fetch guest statistics from guest service
async function fetchGuestStatistics() {
    try {
        const query = `
            query {
                guestStatistics {
                    totalGuests
                    newGuestsThisMonth
                    returningGuests
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
        
        // If real data is not available, use sample data
        if (data.errors || !data.data || !data.data.guestStatistics) {
            console.warn('Using sample guest statistics data');
            return {
                totalGuests: 124,
                newGuestsThisMonth: 18,
                returningGuests: 106
            };
        }
        
        return data.data.guestStatistics;
    } catch (error) {
        console.error('Error fetching guest statistics:', error);
        // Return sample data if API fails
        return {
            totalGuests: 124,
            newGuestsThisMonth: 18,
            returningGuests: 106
        };
    }
}

// Fetch reservation statistics from reservation service
async function fetchReservationStatistics() {
    try {
        const query = `
            query {
                reservationStatistics {
                    totalReservations
                    activeReservations
                    upcomingReservations
                    completedReservations
                    cancelledReservations
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
        
        // If real data is not available, use sample data
        if (data.errors || !data.data || !data.data.reservationStatistics) {
            console.warn('Using sample reservation statistics data');
            return {
                totalReservations: 85,
                activeReservations: 32,
                upcomingReservations: 28,
                completedReservations: 20,
                cancelledReservations: 5
            };
        }
        
        return data.data.reservationStatistics;
    } catch (error) {
        console.error('Error fetching reservation statistics:', error);
        // Return sample data if API fails
        return {
            totalReservations: 85,
            activeReservations: 32,
            upcomingReservations: 28,
            completedReservations: 20,
            cancelledReservations: 5
        };
    }
}

// Fetch billing statistics from billing service
async function fetchBillingStatistics() {
    try {
        const query = `
            query {
                billingStatistics {
                    totalBills
                    pendingPayments
                    paidBills
                    totalRevenue
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
        
        // If real data is not available, use sample data
        if (data.errors || !data.data || !data.data.billingStatistics) {
            console.warn('Using sample billing statistics data');
            return {
                totalBills: 75,
                pendingPayments: 8,
                paidBills: 67,
                totalRevenue: 24500
            };
        }
        
        return data.data.billingStatistics;
    } catch (error) {
        console.error('Error fetching billing statistics:', error);
        // Return sample data if API fails
        return {
            totalBills: 75,
            pendingPayments: 8,
            paidBills: 67,
            totalRevenue: 24500
        };
    }
}

// Fetch recent activity from reservation service
async function fetchRecentActivity() {
    try {
        const query = `
            query {
                recentActivity {
                    id
                    guestName
                    roomNumber
                    action
                    timestamp
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
        
        // If real data is not available, use sample data
        if (data.errors || !data.data || !data.data.recentActivity) {
            console.warn('Using sample recent activity data');
            return [
                { id: 1, guestName: 'John Doe', roomNumber: '101', action: 'Check-in', timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() },
                { id: 2, guestName: 'Jane Smith', roomNumber: '203', action: 'Check-out', timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString() },
                { id: 3, guestName: 'Robert Johnson', roomNumber: '305', action: 'Reservation', timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() }
            ];
        }
        
        return data.data.recentActivity;
    } catch (error) {
        console.error('Error fetching recent activity:', error);
        // Return sample data if API fails
        return [
            { id: 1, guestName: 'John Doe', roomNumber: '101', action: 'Check-in', timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() },
            { id: 2, guestName: 'Jane Smith', roomNumber: '203', action: 'Check-out', timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString() },
            { id: 3, guestName: 'Robert Johnson', roomNumber: '305', action: 'Reservation', timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() }
        ];
    }
}

// Update recent activity list in the UI
function updateRecentActivity(activities) {
    const activityList = document.getElementById('activity-list');
    activityList.innerHTML = '';
    
    activities.forEach(activity => {
        const timeAgo = getTimeAgo(new Date(activity.timestamp));
        
        const activityItem = document.createElement('li');
        activityItem.className = 'activity-item';
        activityItem.innerHTML = `
            <div class="activity-info">
                <div class="activity-guest">${activity.guestName}</div>
                <div class="activity-room">Room: ${activity.roomNumber}</div>
            </div>
            <div class="activity-details">
                <div class="activity-action">${activity.action}</div>
                <div class="activity-time">${timeAgo}</div>
            </div>
        `;
        
        activityList.appendChild(activityItem);
    });
}

// Helper function to format time ago
function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    
    let interval = Math.floor(seconds / 31536000);
    if (interval > 1) return interval + ' years ago';
    
    interval = Math.floor(seconds / 2592000);
    if (interval > 1) return interval + ' months ago';
    
    interval = Math.floor(seconds / 86400);
    if (interval > 1) return interval + ' days ago';
    if (interval === 1) return 'Yesterday';
    
    interval = Math.floor(seconds / 3600);
    if (interval > 1) return interval + ' hours ago';
    if (interval === 1) return '1 hour ago';
    
    interval = Math.floor(seconds / 60);
    if (interval > 1) return interval + ' minutes ago';
    if (interval === 1) return '1 minute ago';
    
    return 'Just now';
}

// Fetch monthly revenue data from billing service
async function fetchMonthlyRevenue() {
    try {
        const query = `
            query {
                monthlyRevenue {
                    month
                    revenue
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
        
        // If real data is not available, use sample data
        if (data.errors || !data.data || !data.data.monthlyRevenue) {
            console.warn('Using sample monthly revenue data');
            return [
                { month: 'Jan', revenue: 12500 },
                { month: 'Feb', revenue: 19200 },
                { month: 'Mar', revenue: 15800 },
                { month: 'Apr', revenue: 21500 },
                { month: 'May', revenue: 18300 },
                { month: 'Jun', revenue: 24500 }
            ];
        }
        
        return data.data.monthlyRevenue;
    } catch (error) {
        console.error('Error fetching monthly revenue:', error);
        // Return sample data if API fails
        return [
            { month: 'Jan', revenue: 12500 },
            { month: 'Feb', revenue: 19200 },
            { month: 'Mar', revenue: 15800 },
            { month: 'Apr', revenue: 21500 },
            { month: 'May', revenue: 18300 },
            { month: 'Jun', revenue: 24500 }
        ];
    }
}

// Initialize charts with real data
function initChartsWithRealData() {
    initOccupancyChartWithRealData();
    initRevenueChartWithRealData();
}

// Initialize room occupancy chart with real data
function initOccupancyChartWithRealData() {
    const ctx = document.getElementById('occupancyChart').getContext('2d');
    
    // Use real data if available, otherwise use sample data
    const roomStats = dashboardData.roomStats || {
        availableRooms: 15,
        reservedRooms: 20,
        occupiedRooms: 12,
        maintenanceRooms: 3
    };
    
    const data = {
        labels: ['Available', 'Reserved', 'Occupied', 'Maintenance'],
        datasets: [{
            data: [
                roomStats.availableRooms,
                roomStats.reservedRooms,
                roomStats.occupiedRooms,
                roomStats.maintenanceRooms
            ],
            backgroundColor: [
                '#4CAF50',
                '#2196F3',
                '#FFC107',
                '#F44336'
            ],
            borderWidth: 0
        }]
    };
    
    new Chart(ctx, {
        type: 'doughnut',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        boxWidth: 10,
                        padding: 8,
                        font: {
                            size: 11
                        }
                    }
                }
            },
            cutout: '65%'
        }
    });
}

// Initialize revenue chart with real data
function initRevenueChartWithRealData() {
    const ctx = document.getElementById('revenueChart').getContext('2d');
    
    // Use real data if available, otherwise use sample data
    const monthlyRevenue = dashboardData.monthlyRevenue || [
        { month: 'Jan', revenue: 12500 },
        { month: 'Feb', revenue: 19200 },
        { month: 'Mar', revenue: 15800 },
        { month: 'Apr', revenue: 21500 },
        { month: 'May', revenue: 18300 },
        { month: 'Jun', revenue: 24500 }
    ];
    
    const data = {
        labels: monthlyRevenue.map(item => item.month),
        datasets: [{
            label: 'Revenue',
            data: monthlyRevenue.map(item => item.revenue),
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 2,
            tension: 0.4
        }]
    };
    
    new Chart(ctx, {
        type: 'line',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: true,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '$' + value.toLocaleString();
                        },
                        font: {
                            size: 10
                        },
                        maxTicksLimit: 6
                    }
                },
                x: {
                    ticks: {
                        font: {
                            size: 10
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

// Keep the original functions for fallback
// Initialize room occupancy chart with sample data
function initOccupancyChart() {
    const ctx = document.getElementById('occupancyChart').getContext('2d');
    
    // Sample data
    const data = {
        labels: ['Available', 'Reserved', 'Occupied', 'Maintenance'],
        datasets: [{
            data: [15, 20, 12, 3],
            backgroundColor: [
                '#4CAF50',
                '#2196F3',
                '#FFC107',
                '#F44336'
            ],
            borderWidth: 0
        }]
    };
    
    new Chart(ctx, {
        type: 'doughnut',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        boxWidth: 10,
                        padding: 8,
                        font: {
                            size: 11
                        }
                    }
                }
            },
            cutout: '65%'
        }
    });
}

// Initialize revenue chart with sample data
function initRevenueChart() {
    const ctx = document.getElementById('revenueChart').getContext('2d');
    
    // Sample data
    const data = {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        datasets: [{
            label: 'Revenue',
            data: [12500, 19200, 15800, 21500, 18300, 24500],
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 2,
            tension: 0.4
        }]
    };
    
    new Chart(ctx, {
        type: 'line',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: true,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '$' + value.toLocaleString();
                        },
                        font: {
                            size: 10
                        },
                        maxTicksLimit: 6
                    }
                },
                x: {
                    ticks: {
                        font: {
                            size: 10
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}
