// register.js
// Crea usuarios en localStorage (mp_users_v1) para usarlos en el login.

(function(){
  const KEY_USERS = 'mp_users_v1';

  const form = document.getElementById('registerForm');
  const nameEl = document.getElementById('regName');
  const emailEl = document.getElementById('regEmail');
  const passEl = document.getElementById('regPass');

  function loadUsers(){
    const raw = localStorage.getItem(KEY_USERS);
    try{
      return raw ? JSON.parse(raw) : [];
    }catch(e){
      return [];
    }
  }

  function saveUsers(users){
    localStorage.setItem(KEY_USERS, JSON.stringify(users));
  }

  form.addEventListener('submit', (e)=>{
    e.preventDefault();

    const name = (nameEl.value || '').trim();
    const email = (emailEl.value || '').trim().toLowerCase();
    const password = (passEl.value || '').trim();

    if(!name || !email || !password){
      alert('Complete todos los campos.');
      return;
    }

    const users = loadUsers();

    // evitar duplicados por email/username
    const exists = users.some(u =>
      String(u.email || '').toLowerCase() === email ||
      String(u.username || '').toLowerCase() === email
    );

    if(exists){
      alert('Ese correo ya está registrado.');
      return;
    }

    // por compatibilidad con el login: username = email
    users.push({
      username: email,
      email,
      password,
      name
    });

    saveUsers(users);
    alert('Usuario creado. Ahora puede iniciar sesión.');
    window.location.href = 'index.html';
  });
})();
