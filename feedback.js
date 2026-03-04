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
  var comment = document.getElementById('feedbackComment').value.trim();
  var contact = document.getElementById('feedbackContact').value.trim();
  if (!comment) return;

  var submitBtn = form.querySelector('.feedback-submit');
  submitBtn.textContent = 'Проверка...';
  submitBtn.disabled = true;

  grecaptcha.ready(function() {
    grecaptcha.execute('ВАШ_SITE_KEY', { action: 'feedback' }).then(function(token) {
      fetch('https://feedback-service-ykt7.onrender.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          comment: comment,
          contact: contact,
          url: window.location.href,
          recaptcha_token: token
        })
      })
      .then(function(res) { return res.json(); })
      .then(function(data) {
        if (data.ok) {
          form.style.display = 'none';
          var messageBox = document.getElementById('feedbackMessage');
          messageBox.innerHTML = `
            <div class="feedback-success">
              <div class="feedback-success-icon">✓</div>
              <div class="feedback-success-title">Спасибо!</div>
              <div class="feedback-success-text">Твой отзыв отправлен — обязательно посмотрим</div>
            </div>
          `;
          setTimeout(function() {
            var modal = document.getElementById('feedbackModal');
            modal.classList.add('hidden');
            form.style.display = '';
            messageBox.innerHTML = '';
            form.reset();
          }, 2500);
        } else {
          submitBtn.textContent = 'Отправить';
          submitBtn.disabled = false;
          var messageBox = document.getElementById('feedbackMessage');
          messageBox.textContent = data.error || 'Похоже вы робот. Попробуйте позже.';
        }
      })
      .catch(function() {
        submitBtn.textContent = 'Отправить';
        submitBtn.disabled = false;
      });
    });
  });
});
  });
