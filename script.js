let urlParams = new URLSearchParams(window.location.search);
let kid = urlParams.get('kid');
console.log(kid);

if (kid === 'A') {
  window.location.href = 'A0.html';
} else if (kid === 'H') {
  window.location.href = 'index.html';
}

