document.addEventListener('DOMContentLoaded', () => {
  let submitTimeoutID;
  const inputSource = document.querySelectorAll('#input-source')[0];
  const nativizedResponse = document.querySelectorAll('#nativized-response')[0];
  const submit= () => {
    fetch('https://2d9c64d4-820e-46d9-b762-230889fdd5b1.mock.pstmn.io/nativize', {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ "text": inputSource.value })
    }).then(response => {
      if (response.status > 299) throw new Error('there was a problem with the request')
      nativizedResponse.innerHTML = response.json()
    }).catch(error => {
      nativizedResponse.innerHTML = error.message
    })
  }
  inputSource.addEventListener('input', () => {
    if (submitTimeoutID) window.clearTimeout(submitTimeoutID);
    submitTimeoutID = window.setTimeout(submit, 1000);
  })
  inputSource.addEventListener('keydown',
    ({keyCode}) => keyCode == 13 && event.preventDefault())
  inputSource.addEventListener('keyup',
    ({keyCode}) => keyCode == 13 && submit())
});
