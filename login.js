(function () {
  'use strict';
  DB.initDatabase();
  let role = 'admin';
  const email = document.getElementById('email');
  const password = document.getElementById('password');
  const error = document.getElementById('loginError');
  const demos = { admin: ['admin@society.com', 'admin123'], resident: ['resident@society.com', 'resident123'], vendor: ['vendor@society.com', 'vendor123'] };
  function enter(user) { location.replace(Auth.homeFor(user.role)); }
  const session = Auth.currentUser();
  if (session) enter(session);
  document.querySelectorAll('[data-role]').forEach(function (tab) {
    tab.addEventListener('click', function () {
      role = tab.dataset.role;
      document.querySelectorAll('[data-role]').forEach(function (x) { x.classList.toggle('active', x === tab); });
      email.value = demos[role][0]; password.value = demos[role][1]; error.hidden = true;
    });
  });
  document.getElementById('loginForm').addEventListener('submit', function (event) {
    event.preventDefault();
    const result = Auth.login(email.value, password.value, role);
    if (!result.ok) { error.textContent = result.reason; error.hidden = false; return; }
    enter(result.user);
  });
  email.value = demos.admin[0]; password.value = demos.admin[1];
})();
