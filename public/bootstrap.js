try {
  await import('./lessons.js');
  for (const id of ['lesson-run', 'lesson-next', 'map-toggle', 'mode-toggle']) document.getElementById(id).disabled = false;
} catch (error) {
  console.error(error);
  document.getElementById('lesson-title').textContent = 'The workshop could not load.';
  const feedback = document.getElementById('lesson-feedback');
  feedback.textContent = 'A lesson file could not be loaded. Please retry after checking the connection or lesson data.';
  feedback.dataset.error = 'true';
  for (const id of ['lesson-run', 'lesson-code', 'lesson-back', 'map-toggle', 'mode-toggle']) document.getElementById(id).disabled = true;
  const retry = document.getElementById('lesson-next');
  retry.disabled = false;
  retry.textContent = 'Retry loading';
  retry.onclick = () => location.reload();
}
