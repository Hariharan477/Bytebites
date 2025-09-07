// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBnbKmYaaii53KiA2f7Mz9kYyvD_XE1QHU",
  authDomain: "hack123-7b2ea.firebaseapp.com",
  databaseURL: "https://hack123-7b2ea-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "hack123-7b2ea",
  storageBucket: "hack123-7b2ea.appspot.com",
  messagingSenderId: "1015807331811",
  appId: "1:1015807331811:web:04981db1337cfad89324d6"
};

// Initialize Firebase only once
let db = null;
let auth = null;

try {
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
    console.log("✅ Firebase initialized");
  }

  db = firebase.firestore();
  auth = firebase.auth();
} catch (error) {
  console.error("❌ Firebase initialization error:", error);
}

// Check if Firebase is available
function isFirebaseAvailable() {
  return db !== null && auth !== null;
}

// Check database connection
function checkDatabaseConnection() {
  if (!isFirebaseAvailable()) {
    console.error("Firebase not available");
    updateConnectionStatus(false, "Firebase not initialized");
    return Promise.resolve(false);
  }

  return db.enableNetwork()
    .then(() => {
      console.log("✅ Connected to Firebase Firestore");
      updateConnectionStatus(true);
      return true;
    })
    .catch((error) => {
      console.error("❌ Database connection error:", error);
      updateConnectionStatus(false, error.message);
      return false;
    });
}

// Update UI with connection status
function updateConnectionStatus(isConnected, message = "") {
  const statusElement = document.getElementById('dbStatus');
  if (statusElement) {
    statusElement.style.display = 'block';
    statusElement.textContent = isConnected
      ? "✅ Connected to Cloud Database"
      : "❌ Database Error: " + message;
    statusElement.className = isConnected ? "db-status db-connected" : "db-status db-disconnected";
  }
}

// Save an order to Firestore
async function saveOrder(orderData) {
  if (!isFirebaseAvailable()) throw new Error("Firebase not available");

  try {
    const docRef = await db.collection("orders").add({
      ...orderData,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      status: "pending"
    });
    console.log("✅ Order saved with ID:", docRef.id);
    return docRef.id;
  } catch (error) {
    console.error("❌ Error saving order:", error);
    throw error;
  }
}

// Get all orders from Firestore
async function getOrdersFromFirebase() {
  if (!isFirebaseAvailable()) throw new Error("Firebase not available");

  try {
    const snapshot = await db.collection("orders").orderBy("createdAt", "desc").get();
    const orders = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.createdAt) data.createdAt = data.createdAt.toDate();
      orders.push({ id: doc.id, ...data });
    });
    return orders;
  } catch (error) {
    console.error("❌ Error getting orders:", error);
    throw error;
  }
}

// Update order status
async function updateOrderStatusInFirebase(orderId, status) {
  if (!isFirebaseAvailable()) throw new Error("Firebase not available");

  try {
    await db.collection("orders").doc(orderId).update({
      status: status,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    console.log("✅ Order status updated");
    return true;
  } catch (error) {
    console.error("❌ Error updating order:", error);
    throw error;
  }
}

// Real-time listener for orders - UPDATED VERSION
function setupOrdersListener(callback) {
  if (!isFirebaseAvailable()) {
    console.error("Firebase not available");
    showNotification('Firebase not available', 'error');
    return null;
  }
  
  try {
    return db.collection("orders")
      .orderBy("createdAt", "desc")
      .onSnapshot(snapshot => {
        const orders = [];
        snapshot.forEach(doc => {
          const data = doc.data();
          // Convert Firestore timestamp to JavaScript Date object
          if (data.createdAt) {
            data.createdAt = data.createdAt.toDate();
          }
          orders.push({
            id: doc.id,
            ...data
          });
        });
        callback(orders);
      }, error => {
        console.error("Orders listener error: ", error);
        showNotification('Error receiving updates: ' + error.message, 'error');
        
        // Try to reconnect after 5 seconds
        setTimeout(() => {
          console.log("Attempting to reconnect...");
          setupOrdersListener(callback);
        }, 5000);
      });
  } catch (error) {
    console.error("Error setting up listener: ", error);
    showNotification('Error setting up listener', 'error');
    return null;
  }
}

// Admin credentials (for demo login)
const adminCredentials = {
  username: "admin",
  password: "bytebites123"
};

// Authenticate admin
function authenticateAdmin(username, password) {
  return username === adminCredentials.username &&
         password === adminCredentials.password;
}

// Auto-check connection on page load
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    checkDatabaseConnection();
  }, 1000);
});
