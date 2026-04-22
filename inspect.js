// 코레일 검색 결과 페이지에서 F12 > Console에 이 내용을 붙여넣고 실행하세요
// 결과가 클립보드에 복사됩니다

var results = [];
document.querySelectorAll('.price_box').forEach(function(el, i) {
  var t = el.closest('.tckList');
  var name = '';
  if (t) {
    var blind = t.querySelector('.blind');
    var num = t.querySelector('.num');
    name = (blind ? blind.textContent : '') + ' ' + (num ? num.textContent : '');
  }
  var txt = el.querySelector('.tck_etc_use');
  var inner = el.querySelector('.inner');
  results.push(
    i + ' | ' + name.trim() +
    ' | class: ' + el.className +
    ' | txt: ' + (txt ? txt.textContent.trim() : '') +
    ' | inner: ' + (inner ? inner.textContent.trim() : '')
  );
});

var text = results.join('\n');
var ta = document.createElement('textarea');
ta.value = text;
ta.style.position = 'fixed';
ta.style.left = '-9999px';
document.body.appendChild(ta);
ta.select();
document.execCommand('copy');
document.body.removeChild(ta);
alert(results.length + '개 price_box 복사 완료!\n\n붙여넣기(Ctrl+V) 하세요.');
