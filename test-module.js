export function testFunction() {
  console.log('Test module importado y ejecutado exitosamente!');
  // No intentes modificar document.body directamente aquí si el script principal ya lo hizo,
  // para evitar conflictos. Solo un log es suficiente para la prueba.
  // O usa un elemento específico:
  const p = document.createElement('p');
  p.style.color = 'green';
  p.textContent = 'Módulo ES cargado y función ejecutada!';
  document.body.appendChild(p);
}