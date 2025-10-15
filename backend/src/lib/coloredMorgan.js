// src/lib/coloredMorgan.js
const morgan = require("morgan");

/**
 * Custom colored Morgan format
 * Colors based on HTTP status codes, methods, and response times
 */
const coloredMorgan = morgan((tokens, req, res) => {
  const status = tokens.status(req, res);
  const method = tokens.method(req, res);
  const url = tokens.url(req, res);
  const responseTime = tokens['response-time'](req, res);
  const date = tokens.date(req, res, 'clf');
  const remoteAddr = tokens['remote-addr'](req, res);
  const userAgent = tokens['user-agent'](req, res);
  const referrer = tokens.referrer(req, res);
  const contentLength = tokens.res(req, res, 'content-length');

  // Color codes
  const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    // Background colors
    bgRed: '\x1b[41m',
    bgGreen: '\x1b[42m',
    bgYellow: '\x1b[43m',
    bgBlue: '\x1b[44m',
    bgMagenta: '\x1b[45m',
    bgCyan: '\x1b[46m',
    bgWhite: '\x1b[47m',
  };

  // Status code colors
  let statusColor = colors.reset;
  let statusBg = '';
  let statusText = '';

  const statusNum = parseInt(status);
  
  if (statusNum >= 200 && statusNum < 300) {
    // Success (2xx) - Green background, white text
    statusBg = colors.bgGreen;
    statusText = colors.white;
    statusColor = `${statusBg}${statusText}`;
  } else if (statusNum >= 300 && statusNum < 400) {
    // Redirect (3xx) - Yellow background, white text
    statusBg = colors.bgYellow;
    statusText = colors.white;
    statusColor = `${statusBg}${statusText}`;
  } else if (statusNum >= 400 && statusNum < 500) {
    // Client Error (4xx) - Red background, white text
    statusBg = colors.bgRed;
    statusText = colors.white;
    statusColor = `${statusBg}${statusText}`;
  } else if (statusNum >= 500) {
    // Server Error (5xx) - Red background, white text
    statusBg = colors.bgRed;
    statusText = colors.white;
    statusColor = `${statusBg}${statusText}`;
  } else {
    // Other - Default
    statusColor = colors.reset;
  }

  // Method colors
  let methodColor = colors.cyan;
  if (method === 'GET') methodColor = colors.green;
  else if (method === 'POST') methodColor = colors.blue;
  else if (method === 'PUT') methodColor = colors.yellow;
  else if (method === 'DELETE') methodColor = colors.red;
  else if (method === 'PATCH') methodColor = colors.magenta;

  // Response time colors
  let timeColor = colors.green;
  const time = parseFloat(responseTime);
  if (time > 1000) timeColor = colors.red;
  else if (time > 500) timeColor = colors.yellow;
  else if (time > 100) timeColor = colors.cyan;

  // Build the colored log line
  const logLine = [
    `${colors.dim}[${date}]${colors.reset}`,
    `${colors.dim}${remoteAddr}${colors.reset}`,
    `${statusColor} ${status} ${colors.reset}`,
    `${methodColor}${method}${colors.reset}`,
    `${colors.white}${url}${colors.reset}`,
    `${timeColor}${responseTime}ms${colors.reset}`,
    `${colors.dim}${contentLength || '-'}${colors.reset}`,
    `${colors.dim}"${referrer || '-'}"${colors.reset}`,
    '\n',
    `${colors.dim}"${userAgent}"${colors.reset}`,
    '\n',
  ].join(' ');

  return logLine;
});

/**
 * Print color legend for reference
 */
function printColorLegend() {
  console.log('🌈 Color Legend:');
  console.log('  🟢 Success (2xx) - Green background');
  console.log('  🟡 Redirect (3xx) - Yellow background');
  console.log('  🔴 Client Error (4xx) - Red background');
  console.log('  🔴 Server Error (5xx) - Red background');
  console.log('  🟢 GET, 🔵 POST, 🟡 PUT, 🔴 DELETE, 🟣 PATCH');
  console.log('  ⚡ Fast (<100ms), 🟡 Medium (100-500ms), 🔴 Slow (>500ms)');
}

module.exports = {
  coloredMorgan,
  printColorLegend
};
