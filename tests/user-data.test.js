import test from 'node:test';
import assert from 'node:assert/strict';
import { destinationForRole, passwordRedirect, signupRedirect } from '../js/auth-routing.js';
import { agendaGroups, upcomingAppointments } from '../js/usuario-data.js';
test('role routing separates users and staff and uses production recovery', () => {
  assert.equal(destinationForRole('usuario'), 'area-usuario.html');
  assert.equal(destinationForRole('funcionario'), 'dashboard.html');
  assert.equal(destinationForRole('admin'), 'dashboard.html');
  assert.equal(destinationForRole('invalid'), null);
  assert.equal(passwordRedirect, 'https://prjtmargarida.vercel.app/redefinir-senha.html');
  assert.equal(signupRedirect, 'https://prjtmargarida.vercel.app/area-usuario.html');
});
test('agenda groups do not repeat entries and exclude completed/cancelled/past visits', () => {
  const now = new Date(2026, 8, 12, 9);
  const rows = [12, 13, 22].map((day, i) => ({
    id: i,
    status: 'Agendada',
    data_atendimento: new Date(2026, 8, day, 10).toISOString(),
  }));
  rows.push(
    { id: 3, status: 'Cancelada', data_atendimento: new Date(2026, 8, 14, 10).toISOString() },
    { id: 4, status: 'Realizada', data_atendimento: new Date(2026, 8, 14, 11).toISOString() },
    { id: 5, status: 'Agendada', data_atendimento: new Date(2026, 8, 11, 10).toISOString() }
  );
  assert.equal(upcomingAppointments(rows, now).length, 3);
  const groups = agendaGroups(rows, now);
  assert.equal(groups.Hoje.length, 1);
  assert.equal(groups['Próximos dias'].length, 1);
  assert.equal(groups['Este mês'].length, 1);
  assert.equal(Object.values(groups).flat().length, 3);
});
