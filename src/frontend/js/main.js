function pingServer() {
  fetch('http://localhost:3000/api/ping')
    .then(res => res.json())
    .then(data => alert(data.message))
    .catch(err => console.error('Errore:', err));
}
