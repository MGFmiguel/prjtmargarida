export function upcomingAppointments(rows, now = new Date()) {
  return rows
    .filter(
      (row) =>
        !['Realizada', 'Cancelada'].includes(row.status) && new Date(row.data_atendimento) >= now
    )
    .sort((a, b) => new Date(a.data_atendimento) - new Date(b.data_atendimento));
}
export function agendaGroups(rows, now = new Date()) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const weekEnd = new Date(today);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const groups = { Hoje: [], 'Próximos dias': [], 'Este mês': [], 'Mais adiante': [] };
  for (const row of upcomingAppointments(rows, now)) {
    const date = new Date(row.data_atendimento);
    const key =
      date < tomorrow
        ? 'Hoje'
        : date < weekEnd
          ? 'Próximos dias'
          : date < monthEnd
            ? 'Este mês'
            : 'Mais adiante';
    groups[key].push(row);
  }
  return groups;
}
