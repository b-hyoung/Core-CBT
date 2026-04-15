const CHAR_THRESHOLD = 200;

function tokenize(text, granularity) {
  if (granularity === 'word') return String(text).split(/(\s+)/);
  return Array.from(String(text));
}

function lcsTable(a, b) {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Uint32Array(n + 1));
  for (let i = 1; i <= m; i += 1) {
    for (let j = 1; j <= n; j += 1) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1] + 1
          : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp;
}

function buildSegments(userTokens, correctTokens, dp) {
  const segments = [];
  let i = userTokens.length;
  let j = correctTokens.length;
  // We walk i/j from end to start, so tokens are encountered in reverse order.
  // Prepend text inside each segment, then reverse the outer array at the end.
  const push = (type, text) => {
    if (!text) return;
    const last = segments[segments.length - 1];
    if (last && last.type === type) last.text = text + last.text;
    else segments.push({ type, text });
  };
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && userTokens[i - 1] === correctTokens[j - 1]) {
      push('equal', userTokens[i - 1]);
      i -= 1;
      j -= 1;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      push('added', correctTokens[j - 1]);
      j -= 1;
    } else {
      push('removed', userTokens[i - 1]);
      i -= 1;
    }
  }
  return segments.reverse();
}

export function computeDiff(userText, correctText) {
  const u = String(userText ?? '');
  const c = String(correctText ?? '');
  const granularity = Math.max(u.length, c.length) > CHAR_THRESHOLD ? 'word' : 'char';
  const userTokens = tokenize(u, granularity);
  const correctTokens = tokenize(c, granularity);
  const dp = lcsTable(userTokens, correctTokens);
  const segments = buildSegments(userTokens, correctTokens, dp);
  return { user: u, correct: c, granularity, segments };
}
