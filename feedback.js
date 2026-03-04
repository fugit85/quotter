document.addEventListener('DOMContentLoaded', function(){

  const modal = document.getElementById('feedbackModal');
  const closeBtn = document.getElementById('feedbackClose');
  const form = document.getElementById('feedbackForm');
  const messageBox = document.getElementById('feedbackMessage');

  window.openFeedbackForm = function(){
    modal.classList.remove('hidden');
  };

  closeBtn.addEventListener('click', function(){
    modal.classList.add('hidden');
  });

  modal.addEventListener('click', function(e){
    if(e.target === modal){
      modal.classList.add('hidden');
    }
  });

  form.addEventListener('submit', function(e){
    e.preventDefault();

    const comment = document.getElementById('feedbackComment').value.trim();
    const contact = document.getElementById('feedbackContact').value.trim();

    fetch('https://feedback-service-ykt7.onrender.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        comment: comment,
        contact: contact,
        url: window.location.href
      })
    })
    .then(res => res.json())
    .then(data => {
  form.style.display = 'none';
  messageBox.innerHTML = `
    <div class="feedback-success">
      <div class="feedback-success-icon">✓</div>
      <div class="feedback-success-title">Спасибо!</div>
      <div class="feedback-success-text">Ваш коментарий отправлен — обязательно посмотрим</div>
    </div>
  `;
  setTimeout(function() {
    modal.classList.add('hidden');
    form.style.display = '';
    messageBox.innerHTML = '';
    form.reset();
  }, 2500);
}))
    .catch(err => {
      messageBox.textContent = "Ошибка отправки. Попробуйте позже.";
    });
  });

});
