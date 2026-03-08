import { GoogleGenAI } from "@google/genai";

let ai: GoogleGenAI | null = null;

function getAI(): GoogleGenAI {
  if (!ai) {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || (window as any).process?.env?.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("A chave da API do Gemini não está configurada.");
    }
    ai = new GoogleGenAI({ apiKey });
  }
  return ai;
}

export async function generateTitle(prompt: string): Promise<string> {
  const aiClient = getAI();
  const response = await aiClient.models.generateContent({
    model: "gemini-1.5-flash", // Use 1.5-flash que é mais estável para títulos
    contents: [{ role: 'user', parts: [{ text: `Crie um título muito curto (máximo 4 palavras) para: "${prompt}"` }] }],
  });
  return response.text?.trim() || "Nova Conversa";
}

export async function generateResponse(prompt: string, imageBase64?: string, mimeType?: string, modelType: 'thinking' | 'fast' | 'search' | 'as' = 'thinking', customInstruction?: string) {
  const parts: any[] = [];
  
  if (imageBase64 && mimeType) {
    parts.push({
      inlineData: {
        data: imageBase64.split(',')[1],
        mimeType: mimeType,
      }
    });
  }
  
  parts.push({ text: prompt });

  const aiClient = getAI();

  const baseSafetyRule = "Você PODE usar gírias para soar mais natural, mas É ESTRITAMENTE PROIBIDO usar palavrões, termos ofensivos, conteúdo explícito ou qualquer linguagem inapropriada. Você deve bloquear e se recusar a responder qualquer coisa que seja considerada inadequada para uma IA segura, seguindo as diretrizes de segurança do Google. Quando te perguntarem quem te criou responda ka_anonim0.";

  // Ajuste nos nomes dos modelos para versões estáveis (as previews mudam muito rápido)
  let modelName = "gemini-1.5-pro"; 
  let systemInstruction = customInstruction || `Você é a BROXA AI... ${baseSafetyRule}`;

  if (modelType === 'fast') {
    modelName = "gemini-1.5-flash";
    systemInstruction = customInstruction || `Você é a BROXA 1.0 Fast... ${baseSafetyRule}`;
  } else if (modelType === 'search') {
    modelName = "gemini-1.5-pro";
    systemInstruction = customInstruction || `Você é a BROXA 0.5 Search... ${baseSafetyRule}`;
  } else if (modelType === 'as') {
    modelName = "gemini-1.5-pro";
    systemInstruction = customInstruction || `Você é a BROXA 0.5 A.S... ${baseSafetyRule}`;
  }

  // CORREÇÃO CRÍTICA AQUI: A estrutura de contents precisa de role e parts em array
  const response = await aiClient.models.generateContent({
    model: modelName,
    contents: [{ role: 'user', parts: parts }],
    config: {
      systemInstruction: systemInstruction,
    }
  });

  return response.text;
}
