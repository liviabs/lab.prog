const API = process.env.REACT_APP_API_URL || "http://localhost:3001";

export default API;

/**
 * Wrapper para fetch com tratamento de erro de conexão padronizado.
 */
export async function apiFetch(path, options = {}) {
  const url = `${API}${path}`;
  const defaults = { credentials: "include" };
  try {
    const res = await fetch(url, { ...defaults, ...options });
    return res;
  } catch (err) {
    throw new Error(
      "Não foi possível conectar ao servidor. Verifique se o backend está rodando em http://localhost:3001"
    );
  }
}
