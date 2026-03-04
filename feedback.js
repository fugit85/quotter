document.addEventListener('DOMContentLoaded', function(){

  var modal      = document.getElementById('feedbackModal');
  var closeBtn   = document.getElementById('feedbackClose');
  var form       = document.getElementById('feedbackForm');
  var messageBox = document.getElementById('feedbackMessage');

  if (!modal || !closeBtn || !form) return;

  window.openFeedbackForm = function(){
    modal.classList.remove('hidden');
  };

  closeBtn.addEventListener('click', function(){
    modal.classList.add('hidden');
  });

  modal.addEventListener('click', function(e){
    if (e.target === modal) modal.classList.add('hidden');
  });

  form.addEventListener('submit', function(e){
    e.preventDefault();

    var comment = document.getElementById('feedbackComment').value.trim();
    var contact = document.getElementById('feedbackContact').value.trim();
    if (!comment) return;

    var submitBtn = form.querySelector('.feedback-submit');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Отправляем...';

    fetch('https://feedback-service-ykt7.onrender.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        comment: comment,
        contact: contact,
        url: window.location.href
      })
    })
    .then(function(res) { return res.json(); })
    .then(function(data) {
      form.style.display = 'none';
      messageBox.innerHTML =
        '<div class="feedback-success">' +
          '<div class="feedback-success-icon">✓</div>' +
          '<div class="feedback-success-title">Спасибо!</div>' +
          '<div class="feedback-success-text">Ваш коментарий отправлен — обязательно посмотрим</div>' +
        '</div>';

      setTimeout(function() {
        modal.classList.add('hidden');
        setTimeout(function() {
          form.style.display = '';
          messageBox.innerHTML = '';
          form.reset();
          submitBtn.disabled = false;
          submitBtn.textContent = 'Отправить';
        }, 300);
      }, 2500);
    })
    .catch(function() {
      messageBox.textContent = 'Ошибка отправки. Попробуйте позже.';
      submitBtn.disabled = false;
      submitBtn.textContent = 'Отправить';
    });
  });

});
