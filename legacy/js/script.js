// Config: número de WhatsApp del negocio (formato internacional, sin +, sin espacios)
const WHATSAPP_NUMBER = "56912345678";

// Header background on scroll
const header = document.getElementById('header');
window.addEventListener('scroll', () => {
  header.classList.toggle('scrolled', window.scrollY > 20);
});

// Mobile menu
const menuToggle = document.getElementById('menuToggle');
const mobileMenu = document.getElementById('mobileMenu');
menuToggle.addEventListener('click', () => {
  const isOpen = mobileMenu.style.display === 'block';
  mobileMenu.style.display = isOpen ? 'none' : 'block';
});
document.querySelectorAll('.mobile-link').forEach(link => {
  link.addEventListener('click', () => { mobileMenu.style.display = 'none'; });
});

// Booking form -> WhatsApp
const form = document.getElementById('bookingForm');
const formSuccess = document.getElementById('formSuccess');

form.addEventListener('submit', function (e) {
  e.preventDefault();

  const nombre = document.getElementById('nombre').value.trim();
  const telefono = document.getElementById('telefono').value.trim();
  const servicio = document.getElementById('servicio').value;
  const fecha = document.getElementById('fecha').value;
  const hora = document.getElementById('hora').value;
  const mensaje = document.getElementById('mensaje').value.trim();

  if (!nombre || !telefono || !servicio || !fecha || !hora) {
    formSuccess.textContent = "Por favor completa todos los campos obligatorios.";
    formSuccess.style.borderColor = "#c94b4b";
    formSuccess.style.color = "#f2c4c4";
    formSuccess.style.background = "rgba(201,75,75,.08)";
    formSuccess.classList.add('show');
    return;
  }

  const fechaFormateada = new Date(fecha + 'T00:00:00').toLocaleDateString('es-CL', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });

  let texto = `Hola Imperio Barber, quiero agendar una hora.\n\n`;
  texto += `Nombre: ${nombre}\n`;
  texto += `Teléfono: ${telefono}\n`;
  texto += `Servicio: ${servicio}\n`;
  texto += `Fecha: ${fechaFormateada}\n`;
  texto += `Hora: ${hora}`;
  if (mensaje) texto += `\nComentario: ${mensaje}`;

  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(texto)}`;
  window.open(url, '_blank');

  formSuccess.style.borderColor = "";
  formSuccess.style.color = "";
  formSuccess.style.background = "";
  formSuccess.textContent = "✓ Abrimos WhatsApp con tu solicitud. Si no se abrió, revisa el bloqueador de pop-ups.";
  formSuccess.classList.add('show');
  form.reset();
});

// Set min date to today
document.getElementById('fecha').min = new Date().toISOString().split('T')[0];
