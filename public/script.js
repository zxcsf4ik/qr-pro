let token = null;
let currentQR = null;
let currentText = null;

const toast = (icon, title) => {
  Swal.fire({
    icon, title, toast: true, position: 'top-end',
    showConfirmButton: false, timer: 2800, timerProgressBar: true
  });
};

function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const allowedDomains = ['gmail.com', 'outlook.com', 'icloud.com', 'ukr.net', 'yahoo.com', 'hotmail.com', 'protonmail.com'];

  if (!re.test(email)) return false;

  const domain = email.split('@')[1].toLowerCase();
  return allowedDomains.includes(domain);
}

function toggleTheme() {
  const isDark = document.documentElement.classList.toggle("dark");
  localStorage.setItem("theme", isDark ? "dark" : "light");

  const icon = document.querySelector('.theme-toggle i');
  if (icon) {
    icon.classList.toggle('fa-moon', !isDark);
    icon.classList.toggle('fa-sun', isDark);
  }
}

function loadTheme() {
  if (localStorage.getItem("theme") === "dark") {
    document.documentElement.classList.add("dark");
    const icon = document.querySelector('.theme-toggle i');
    if (icon) icon.classList.replace('fa-moon', 'fa-sun');
  }
}

window.onload = () => {
  loadTheme();
  token = localStorage.getItem("token");
  if (token) switchToMain(false);
};

function logout() {
  localStorage.removeItem("token");
  token = null;
  location.reload();
}

function showTab(tab) {
  document.getElementById("login-form").style.display = tab === "login" ? "block" : "none";
  document.getElementById("register-form").style.display = tab === "register" ? "block" : "none";
  document.getElementById("tab-login").classList.toggle("active", tab === "login");
  document.getElementById("tab-register").classList.toggle("active", tab === "register");
}

function switchToMain(isGuest) {
  document.getElementById("auth-screen").style.display = "none";
  document.getElementById("main-screen").style.display = "block";
  document.getElementById("user-nav").style.display = "flex";

  if (isGuest) {
    document.getElementById("save-btn").style.display = "none";
    document.getElementById("history-section").style.display = "none";
  } else {
    document.getElementById("save-btn").style.display = "flex";
    document.getElementById("history-section").style.display = "block";
    loadMyQrs();
  }
}

async function login() {
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;

  if (!email || !password) return toast('error', 'Введіть email і пароль');

  const res = await fetch("/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });

  const data = await res.json();

  if (res.ok) {
    token = data.token;
    localStorage.setItem("token", token);
    switchToMain(false);
    toast('success', `Вітаємо, ${data.username}!`);
  } else {
    toast('error', data.message || "Невірні дані");
  }
}

async function register() {
  const username = document.getElementById("username").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  if (!username || !email || !password) {
    return toast('error', 'Заповніть всі поля');
  }
  if (!validateEmail(email)) {
    return Swal.fire({
      icon: 'warning',
      title: 'Невідома пошта',
      text: 'Використовуйте: gmail.com, ukr.net, outlook.com тощо',
      confirmButtonColor: '#4f46e5'
    });
  }
  if (password.length < 8) {
    return toast('error', 'Пароль повинен бути мінімум 8 символів');
  }

  const res = await fetch("/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, email, password })
  });
  const data = await res.json();

  if (res.ok) {
    toast('success', 'Акаунт успішно створено!');
    showTab("login");
  } else {
    toast('error', data.message);
  }
}

function guestMode() {
  token = null;
  switchToMain(true);
  toast('info', 'Режим гостя активовано');
}

async function generateQR() {
  const text = document.getElementById("qrText").value.trim();
  const color = document.getElementById("fgColor").value;

  if (!text) return toast('warning', 'Введіть текст або посилання');

  const res = await fetch("/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, color })
  });
  const data = await res.json();

  if (res.ok) {
    currentQR = data.qrImage;
    currentText = text;
    document.getElementById("result").innerHTML = `<img src="${data.qrImage}" alt="QR">`;
    document.getElementById("download-btn").style.display = "block";
    toast('success', 'QR-код згенеровано!');
  }
}

function downloadQR() {
  const link = document.createElement("a");
  link.href = document.querySelector("#result img").src;
  link.download = `qr_pro_${Date.now()}.png`;
  link.click();
}

async function saveQR() {
  if (!token || !currentQR) return;

  const res = await fetch("/save-qr", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({ qr_text: currentText, qr_image: currentQR })
  });

  if (res.ok) {
    toast('success', 'Збережено в історію');
    loadMyQrs();
  }
}

async function loadMyQrs() {
  if (!token) return;

  const res = await fetch("/my-qrs", {
    headers: { "Authorization": `Bearer ${token}` }
  });

  if (res.ok) {
    const data = await res.json();
    let html = "";
    data.forEach(qr => {
      html += `<div class="saved-qr">
                 <img src="${qr.qr_image}">
                 <p title="${qr.qr_text}">${qr.qr_text}</p>
               </div>`;
    });
    document.getElementById("myQrs").innerHTML = html || "<p>Історія порожня</p>";
  }
}