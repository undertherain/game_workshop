try {
  await import('./lessons.js');
  for (const id of ['lesson-reset', 'lesson-run', 'lesson-next', 'map-toggle', 'mode-toggle', 'title-continue', 'title-map']) document.getElementById(id).disabled = false;
} catch (error) {
  console.error(error);
  document.body.dataset.mode = 'lessons';
  document.getElementById('title-screen').hidden = true;
  document.getElementById('lessons').hidden = false;
  document.getElementById('lesson-title').textContent = 'The workshop could not load.';
  const feedback = document.getElementById('lesson-feedback');
  feedback.textContent = 'A lesson file could not be loaded. Please retry after checking the connection or lesson data.';
  feedback.dataset.error = 'true';
  for (const id of ['lesson-reset', 'lesson-run', 'lesson-code', 'lesson-back', 'map-toggle', 'mode-toggle']) document.getElementById(id).disabled = true;
  const retry = document.getElementById('lesson-next');
  retry.disabled = false;
  retry.textContent = 'Retry loading';
  retry.onclick = () => location.reload();
}
