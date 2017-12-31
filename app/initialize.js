import * as edn from 'jsedn'
import axios from 'axios'

document.addEventListener('DOMContentLoaded', () => {
  let submitTimeoutID;
  const inputSource = document.querySelectorAll('#input-source')[0];
  const nativizedResponse = document.querySelectorAll('#nativized-response')[0];
  const nativizeButton = document.querySelectorAll('#nativize-button')[0];
  const submit = () => inputSource.value &&
    axios({
      method: 'post',
      url: 'https://spike-ring.work/',
      headers: {'Content-Type': 'application/edn'},
      data: edn.encode(new edn.Map([edn.kw(":text"), `${inputSource.value}`]))
    }).then(({ data, status }) => {
      if (status > 299) throw new Error('there was a problem with the request')
      nativizedResponse.innerHTML = edn.parse(data).at(edn.kw(":text"));
    }).catch(error => {
      nativizedResponse.innerHTML = error.message
    });
  inputSource.addEventListener('input', () => {
    if (submitTimeoutID) window.clearTimeout(submitTimeoutID);
    submitTimeoutID = window.setTimeout(submit, 1000);
  })
  inputSource.addEventListener('keydown',
    ({keyCode}) => keyCode == 13 && event.preventDefault())
  inputSource.addEventListener('keyup',
    ({keyCode}) => keyCode == 13 && submit())
  nativizeButton.addEventListener('click',
    event => event.preventDefault() && submit())
});
