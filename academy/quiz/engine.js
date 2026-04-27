/* ============================================================
   ACADEMY — Quiz Engine
   ============================================================
   Multiple-Choice Quiz mit Feedback und Score-Berechnung.
   Wird von Lernpfaden + Wissenstest genutzt.

   API:
     QuizEngine.start(questions, opts)
       - questions: [{ frage, optionen, korrekt, erklaerung }]
       - opts: { onComplete: (result) => void, container: el? }
     QuizEngine.renderQuestion(idx) — interner State
   ============================================================ */

const QuizEngine = (function () {
  let state = null;

  function start(questions, opts = {}) {
    state = {
      questions,
      idx: 0,
      answers: [],          // ausgewählte Indizes
      revealed: false,      // Antwort bereits aufgedeckt?
      onComplete: opts.onComplete || null,
      container: opts.container || document.getElementById('ac-content'),
    };
    renderQuestion();
  }

  function pick(optIdx) {
    if (state.revealed) return;
    state.answers[state.idx] = optIdx;
    state.revealed = true;
    renderQuestion();
  }

  function next() {
    state.revealed = false;
    state.idx++;
    if (state.idx >= state.questions.length) {
      finish();
    } else {
      renderQuestion();
    }
  }

  function finish() {
    const correct = state.answers.filter((a, i) => a === state.questions[i].korrekt).length;
    const total = state.questions.length;
    const passed = correct / total >= 0.7;

    state.container.innerHTML = `
      <div class="ac-section">
        <h2>${passed ? '🎉 Quiz bestanden!' : '📚 Quiz nicht bestanden'}</h2>
        <div style="font-size: 48px; font-weight: 700; color: ${passed ? '#10B981' : 'var(--accent)'}; text-align: center; margin: var(--space-4) 0;">
          ${correct} / ${total}
        </div>
        <div style="text-align: center; color: var(--text-secondary); margin-bottom: var(--space-5);">
          ${passed ? 'Gut gemacht! Du hast die wichtigsten Konzepte verstanden.' : 'Bei mind. 70% gilt das Quiz als bestanden. Versuche es nochmal!'}
        </div>
        <div style="display: flex; gap: var(--space-2); justify-content: center; flex-wrap: wrap;">
          ${passed && state.onComplete ? `<button class="btn btn-primary" onclick="QuizEngine._continue()">Weiter →</button>` : ''}
          <button class="btn" onclick="QuizEngine._retry()">🔄 Wiederholen</button>
        </div>
      </div>
    `;

    if (state.onComplete) state.onComplete({ correct, total, passed });
  }

  function _continue() {
    if (state.onComplete) state.onComplete({ done: true });
  }

  function _retry() {
    state.idx = 0;
    state.answers = [];
    state.revealed = false;
    renderQuestion();
  }

  function renderQuestion() {
    const q = state.questions[state.idx];
    const selected = state.answers[state.idx];
    const correct = q.korrekt;

    state.container.innerHTML = `
      <div class="ac-quiz-question">
        <div class="ac-quiz-q-num">Frage ${state.idx + 1} von ${state.questions.length}</div>
        <div class="ac-quiz-q">${Utils.escapeHtml(q.frage)}</div>
        <div class="ac-quiz-opts">
          ${q.optionen.map((opt, i) => {
            let cls = 'ac-quiz-opt';
            if (state.revealed) {
              if (i === correct) cls += ' correct';
              else if (i === selected) cls += ' wrong';
            } else if (i === selected) cls += ' selected';
            return `<button class="${cls}" onclick="QuizEngine._pick(${i})" ${state.revealed ? 'disabled' : ''}>${Utils.escapeHtml(opt)}</button>`;
          }).join('')}
        </div>
        ${state.revealed ? `
          <div class="ac-quiz-feedback ${selected === correct ? 'correct' : 'wrong'}">
            <strong>${selected === correct ? '✓ Richtig!' : '✗ Falsch.'}</strong>
            ${q.erklaerung ? '<br>' + Utils.escapeHtml(q.erklaerung) : ''}
          </div>
          <div style="margin-top: var(--space-4); display: flex; justify-content: flex-end;">
            <button class="btn btn-primary" onclick="QuizEngine._next()">
              ${state.idx + 1 < state.questions.length ? 'Nächste Frage →' : 'Auswertung →'}
            </button>
          </div>
        ` : ''}
      </div>
    `;
  }

  return {
    start, _pick: pick, _next: next, _retry, _continue,
  };
})();
