const SOURCE = 'https://www.anbima.com.br/informacoes/est-termo/CZ-down.asp';

function parseCurve(text) {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n|\r/).map(s => s.trim()).filter(Boolean);
  const start = lines.findIndex(line => /Beta 1;Beta 2;Beta 3;Beta 4;Lambda 1;Lambda 2/i.test(line));
  if (start < 0) throw new Error('Cabeçalho da curva ausente');
  const header = lines[start].split(';').map(s => s.trim());
  const data = header[0];
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(data)) throw new Error('Data de referência inválida');
  const row = lines.slice(start + 1).map(s => s.split(';').map(v => v.trim())).find(r => r[0] === 'PREFIXADOS');
  if (!row || row.length < 7) throw new Error('Parâmetros prefixados ausentes');
  const keys = ['beta1', 'beta2', 'beta3', 'beta4', 'lambda1', 'lambda2'];
  const params = {};
  keys.forEach((key, i) => {
    const raw = row[i + 1];
    if (!raw) throw new Error('Parâmetro vazio');
    const normalized = raw.includes(',') ? raw.replace(/\./g, '').replace(',', '.') : raw;
    if (!/^[+-]?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(normalized)) throw new Error('Parâmetro inválido');
    const value = Number(normalized);
    if (!Number.isFinite(value)) throw new Error('Parâmetro não finito');
    params[key] = value;
  });
  if (params.lambda1 <= 0 || params.lambda2 <= 0) throw new Error('Lambda inválido');
  return { data, params, fonte: SOURCE, tipo: 'PREFIXADOS' };
}

async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Método não permitido' });
  }
  try {
    // Sem data: solicita a publicação corrente e usa a data informada pela fonte.
    const response = await fetch(SOURCE, {
      headers: { 'User-Agent': 'Littlebox-ETTJ/1.0', Accept: 'text/csv,text/plain,*/*' },
      signal: AbortSignal.timeout(12000)
    });
    if (!response.ok) throw new Error(`ANBIMA HTTP ${response.status}`);
    const text = new TextDecoder('windows-1252').decode(await response.arrayBuffer());
    const curve = parseCurve(text);
    res.setHeader('Cache-Control', 'public, s-maxage=900');
    return res.status(200).json(curve);
  } catch (error) {
    console.error('ETTJ:', error.message);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(502).json({ error: 'Curva ANBIMA indisponível. Use a taxa manual e tente novamente mais tarde.' });
  }
}

module.exports = handler;
module.exports.parseCurve = parseCurve;
