const filters = [...document.querySelectorAll('[data-filter]')];
const opportunities = [...document.querySelectorAll('.volunteer-card')];
const areaSelect = document.querySelector('#volunteer-area');

filters.forEach((filter) => {
  filter.addEventListener('click', () => {
    filters.forEach((item) => item.setAttribute('aria-pressed', String(item === filter)));
    opportunities.forEach((card) => {
      card.hidden = filter.dataset.filter !== 'todas' && card.dataset.area !== filter.dataset.filter;
    });
  });
});

document.querySelectorAll('[data-select-area]').forEach((button) => {
  button.addEventListener('click', () => {
    areaSelect.value = button.dataset.selectArea;
    document.querySelector('#cadastro').scrollIntoView({ behavior: 'smooth' });
    areaSelect.focus({ preventScroll: true });
  });
});

const form = document.querySelector('[data-volunteer-form]');
form.addEventListener(
  'submit',
  () => {
    const area = areaSelect.value;
    const availability = document.querySelector('#volunteer-availability').value.trim();
    const message = document.querySelector('#volunteer-message').value.trim();
    form.elements.assunto.value = `Voluntariado — ${area}`;
    form.elements.mensagem.value = `Área de interesse: ${area}\nDisponibilidade: ${availability}\n\nComo gostaria de contribuir:\n${message}`;
  },
  { capture: true }
);
