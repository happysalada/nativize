import * as edn from 'jsedn'
import axios from 'axios'
import "babel-polyfill"

document.addEventListener('DOMContentLoaded', () => {
  let submitTimeoutID;
  const inputSource = document.getElementById('input-source')
  const nativizedResponse = document.getElementById('nativized-response')
  const nativizeButton = document.getElementById('nativize-button')
  const submit = async () => {
    if (!inputSource.value) return
    try {
      const { data, status} = await axios({
        method: 'post',
        url: 'https://spike-ring.work/',
        headers: {'Content-Type': 'application/edn'},
        data: edn.encode(new edn.Map([edn.kw(":text"), `${inputSource.value}`]))
      })
      if (status > 299) throw new Error('there was a problem with the request')
      nativizedResponse.innerHTML = edn.parse(data).at(edn.kw(":text"))
      nativizedResponse.style.visibility = 'visible'
    } catch (error) {
      nativizedResponse.innerHTML = error.message
    }
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
