// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function () {
  initApp();
});

// Global listener reference
let unsubscribeOrders = null;

// Initialize the application
function initApp() {
  checkDatabaseConnection().then(isConnected => {
    showNotification(
      isConnected ? 'Connected to database' : 'Database connection failed',
      isConnected ? 'success' : 'error'
    );
  });

  animateElements();

  const orderForm = document.getElementById('orderForm');
  if (orderForm) {
    orderForm.addEventListener('submit', handleOrderSubmit);
  }

  checkAdminAuth();
}

// Animate elements on page load
function animateElements() {
  const cards = document.querySelectorAll('.role-card, .feature');
  cards.forEach((card, index) => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';
    setTimeout(() => {
      card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
      card.style.opacity = '1';
      card.style.transform = 'translateY(0)';
    }, 100 * index);
  });
}

// Handle order form submission
async function handleOrderSubmit(e) {
  e.preventDefault();

  const name = document.getElementById('name').value.trim();
  const id = document.getElementById('id')?.value.trim() || '';
  const item = document.getElementById('menu').value;
  const time = document.getElementById('time').value;
  const notes = document.getElementById('notes')?.value.trim() || '';

  if (!name || !item || !time) {
    showNotification('Please fill in all required fields.', 'error');
    return;
  }

  try {
    const orderData = { name, studentId: id, item, time, notes, status: 'pending' };
    await saveOrder(orderData);

    document.getElementById('confirmation').textContent =
      `✅ Order placed for ${name}: ${item} at ${time}. Please pay at the counter.`;

    showNotification('Order placed successfully!');
    document.getElementById('orderForm').reset();
  } catch (error) {
    console.error('Error saving order:', error);
    showNotification('Error placing order. Please try again.', 'error');
  }
}

// Admin login
function adminLogin() {
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value.trim();

  if (authenticateAdmin(username, password)) {
    localStorage.setItem('adminAuthenticated', 'true');
    showAdminDashboard();
    showNotification('Login successful!', 'success');
  } else {
    showNotification('Invalid credentials. Please try again.', 'error');
  }
}

// Admin logout
function adminLogout() {
  localStorage.removeItem('adminAuthenticated');
  document.getElementById('loginForm').style.display = 'block';
  document.getElementById('adminDashboard').style.display = 'none';
  document.getElementById('header')?.style.display = 'none';

  if (unsubscribeOrders) {
    unsubscribeOrders();
  }

  showNotification('Logged out successfully.', 'success');
}

// Show admin dashboard
function showAdminDashboard() {
  document.getElementById('loginForm').style.display = 'none';
  document.getElementById('adminDashboard').style.display = 'block';
  document.getElementById('header')?.style.display = 'block';

  setupRealTimeListener();
}

// Check admin auth
function checkAdminAuth() {
  if (localStorage.getItem('adminAuthenticated') === 'true') {
    showAdminDashboard();
  }
}

// Real-time listener
function setupRealTimeListener() {
  if (unsubscribeOrders) {
    unsubscribeOrders();
  }

  unsubscribeOrders = db.collection("orders")
    .orderBy("createdAt", "desc")
    .onSnapshot(snapshot => {
      const orders = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.createdAt) data.createdAt = data.createdAt.toDate();
        orders.push({ id: doc.id, ...data });
      });

      renderOrders(orders);
      updateOrderStats(orders);
    }, error => {
      console.error("Orders listener error:", error);
      showNotification('Error receiving real-time updates', 'error');
    });
}

// Render orders
function renderOrders(orders) {
  const tbody = document.querySelector("#ordersTable tbody");
  tbody.innerHTML = '';

  if (orders.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No orders found.</td></tr>';
    return;
  }

  orders.forEach(order => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${order.name}</td>
      <td>${order.studentId || 'N/A'}</td>
      <td>${order.item}</td>
      <td>${order.time}</td>
      <td><span class="status-badge status-${order.status}">${order.status}</span></td>
      <td>
        ${order.status !== 'completed' ? `<button class="action-btn complete-btn" onclick="updateOrderStatus('${order.id}', 'completed')">Complete</button>` : ''}
        ${order.status !== 'cancelled' ? `<button class="action-btn cancel-btn" onclick="updateOrderStatus('${order.id}', 'cancelled')">Cancel</button>` : ''}
      </td>
    `;
    tbody.appendChild(row);
  });
}

// Update order status
async function updateOrderStatus(orderId, status) {
  try {
    await updateOrderStatusInFirebase(orderId, status);
    showNotification(`Order status updated to ${status}.`, 'success');
  } catch (error) {
    console.error('Error updating order:', error);
    showNotification('Error updating order status.', 'error');
  }
}

// Update stats
function updateOrderStats(orders) {
  const total = orders.length;
  const pending = orders.filter(o => o.status === 'pending').length;
  const completed = orders.filter(o => o.status === 'completed').length;

  document.getElementById('totalOrders').textContent = total;
  document.getElementById('pendingOrders').textContent = pending;
  document.getElementById('completedOrders').textContent = completed;
}

// Notifications
function showNotification(message, type = 'success') {
  let notification = document.getElementById('notification');
  if (!notification) {
    notification = document.createElement('div');
    notification.id = 'notification';
    notification.className = 'notification';
    document.body.appendChild(notification);
  }

  notification.textContent = message;
  notification.style.background = type === 'success' ? 'var(--success)' :
                                  type === 'error' ? 'var(--danger)' : 'var(--warning)';
  notification.style.display = 'block';

  setTimeout(() => {
    notification.style.display = 'none';
  }, 3000);
}