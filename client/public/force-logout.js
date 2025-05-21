// Force Logout Script
// This script forcibly removes all authentication data

// Clear all localStorage data
function clearLocalStorage() {
  console.log("Clearing all localStorage data");
  localStorage.clear();
}

// Clear all sessionStorage data
function clearSessionStorage() {
  console.log("Clearing all sessionStorage data");
  sessionStorage.clear();
}

// Clear all cookies
function clearAllCookies() {
  console.log("Clearing all cookies");
  const cookies = document.cookie.split(";");
  
  for (let i = 0; i < cookies.length; i++) {
    const cookie = cookies[i];
    const eqPos = cookie.indexOf("=");
    const name = eqPos > -1 ? cookie.substring(0, eqPos).trim() : cookie.trim();
    document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
    document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=" + window.location.hostname;
  }
}

// Perform server logout call
async function callServerLogout() {
  console.log("Calling server logout endpoint");
  try {
    const response = await fetch('/api/auth/logout', {
      method: 'POST',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      },
      credentials: 'include'
    });
    console.log("Server logout response:", response.status);
    return response.ok;
  } catch (error) {
    console.error("Server logout failed:", error);
    return false;
  }
}

// Force redirect to login page
function redirectToLogin() {
  console.log("Redirecting to login page");
  window.location.href = "/auth";
}

// Execute full logout process
async function forceLogout() {
  clearLocalStorage();
  clearSessionStorage();
  clearAllCookies();
  await callServerLogout();
  redirectToLogin();
}

// Run the force logout
forceLogout();