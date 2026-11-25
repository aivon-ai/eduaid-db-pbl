// 복사 버튼과 '완료' 체크(이 브라우저에만 저장)
(function () {
  function copyText(text, btn) {
    function ok() { btn.textContent = '복사됨'; btn.classList.add('done');
      setTimeout(function () { btn.textContent = '복사'; btn.classList.remove('done'); }, 1500); }
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(ok, function () { fallback(text); ok(); });
    } else { fallback(text); ok(); }
  }
  function fallback(text) {
    var ta = document.createElement('textarea'); ta.value = text;
    ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta);
    ta.select(); try { document.execCommand('copy'); } catch (e) {} document.body.removeChild(ta);
  }
  document.querySelectorAll('.code').forEach(function (box) {
    var btn = box.querySelector('.copy'); var pre = box.querySelector('pre');
    if (btn && pre) btn.addEventListener('click', function () {
      var text = pre.textContent.replace(/^\n/, '');
      // 표 모양(data-tsv) 상자는 ' | '를 탭으로 바꿔 복사한다 → 시트에 붙이면 칸이 나뉜다
      if (box.hasAttribute('data-tsv')) text = text.split('\n').map(function (l) {
        return l.split('|').map(function (c) { return c.trim(); }).join('\t');
      }).join('\n');
      copyText(text, btn);
    });
  });

  var KEY = 'eduaid-pbl-done-' + (document.body.dataset.page || 'page');
  var state = {};
  try { state = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { state = {}; }
  var steps = document.querySelectorAll('.step[data-id]');

  // 진행 그래프: 교시(섹션)마다 막대 하나
  var LABELS = { 'prep': '준비', 'd1-7': '1회차 문제정의 ①', 'd1-8': '1회차 문제정의 ②',
    'd2-1': '2회차 설계', 'd2-3': '2회차 적재', 'd2-4': '2회차 손익', 'd2-5': '2회차 조회 뷰',
    'd2-6': '2회차 발주서', 'd2-7': '2회차 스크립트', 'd2-8': '2회차 PDF' };
  var groups = [];
  document.querySelectorAll('section.block[id]').forEach(function (sec) {
    var ss = sec.querySelectorAll('.step[data-id]');
    if (!ss.length) return;
    var h = sec.querySelector('h2');
    var label = LABELS[sec.id] || (h ? h.textContent.split('·')[0].trim() : sec.id);
    groups.push({ id: sec.id, label: label, steps: ss });
  });
  var panel = document.getElementById('progress-panel');
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (err) {} }
  if (panel) groups.forEach(function (g) {
    var line = document.createElement('div'); line.className = 'pp-line';
    var row = document.createElement('a'); row.className = 'pp-row'; row.href = '#' + g.id;
    row.innerHTML = '<span class="pp-label"></span><span class="pp-bar"><i></i></span><span class="pp-num"></span>';
    row.querySelector('.pp-label').textContent = g.label;
    // 교시 전체를 한 번에 체크/해제 (다른 컴퓨터로 옮겼을 때 지난 회차를 빠르게 채우는 용도)
    var all = document.createElement('button'); all.type = 'button'; all.className = 'pp-all';
    all.addEventListener('click', function () {
      var full = true; g.steps.forEach(function (s) { if (!state[s.dataset.id]) full = false; });
      if (full && !window.confirm('"' + g.label + '"의 완료 체크를 모두 지울까요?')) return;
      g.steps.forEach(function (s) { state[s.dataset.id] = !full; });
      save(); render();
    });
    line.appendChild(row); line.appendChild(all);
    panel.appendChild(line); g.row = row; g.all = all;
  });

  function render() {
    var n = 0;
    steps.forEach(function (s) { var on = !!state[s.dataset.id]; s.classList.toggle('is-done', on);
      var cb = s.querySelector('.done-check input'); if (cb) cb.checked = on; if (on) n++; });
    var pct = steps.length ? Math.round(n * 100 / steps.length) : 0;
    var p = document.getElementById('progress');
    if (p) { var pi = p.querySelector('.pbar i'), pb = p.querySelector('b');
      if (pi) pi.style.width = pct + '%'; if (pb) pb.textContent = pct + '%';
      p.title = '완료 ' + n + ' / ' + steps.length + ' 단계 · 눌러서 내 진행 상황 보기'; }
    var tb = document.querySelector('.pp-total-bar i'), tt = document.querySelector('.pp-total-txt');
    if (tb) tb.style.width = pct + '%';
    if (tt) tt.textContent = '전체 ' + pct + '% · ' + n + ' / ' + steps.length + ' 단계 완료';
    groups.forEach(function (g) {
      if (!g.row) return;
      var d = 0; g.steps.forEach(function (s) { if (state[s.dataset.id]) d++; });
      var gp = Math.round(d * 100 / g.steps.length);
      g.row.querySelector('.pp-bar i').style.width = gp + '%';
      g.row.querySelector('.pp-num').textContent = d + ' / ' + g.steps.length;
      g.row.classList.toggle('full', d === g.steps.length);
      if (g.all) g.all.textContent = d === g.steps.length ? '체크 지우기' : '✔ 모두 완료';
    });
  }

  var resetBtn = document.getElementById('progress-reset');
  if (resetBtn) resetBtn.addEventListener('click', function () {
    if (!window.confirm('완료 체크를 모두 지우고 처음부터 시작할까요?\n(시트에 한 작업은 지워지지 않습니다)')) return;
    state = {};
    try { localStorage.removeItem(KEY); } catch (err) {}
    render();
  });
  steps.forEach(function (s) {
    var lab = document.createElement('label'); lab.className = 'done-check';
    lab.innerHTML = '<input type="checkbox"> 이 단계 끝났어요';
    s.appendChild(lab);
    lab.querySelector('input').addEventListener('change', function (e) {
      state[s.dataset.id] = e.target.checked;
      save(); render();
    });
  });
  render();

  // 새로고침해도 보던 자리 그대로 (이 탭 안에서만 기억)
  (function () {
    var SK = 'eduaid-scroll-' + location.pathname;
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    function keep() { try { sessionStorage.setItem(SK, String(window.scrollY)); } catch (e) {} }
    window.addEventListener('beforeunload', keep); window.addEventListener('pagehide', keep);
    window.addEventListener('load', function () {
      var y = null; try { y = sessionStorage.getItem(SK); } catch (e) {}
      if (y === null) return;
      var h = document.documentElement; h.style.scrollBehavior = 'auto';
      window.scrollTo(0, +y); setTimeout(function () { window.scrollTo(0, +y); h.style.scrollBehavior = ''; }, 50);
    });
  })();
})();
