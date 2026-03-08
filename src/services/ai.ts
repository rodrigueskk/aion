import { GoogleGenAI } from "@google/genai";

let ai: GoogleGenAI | null = null;

function getAI(): GoogleGenAI {
  if (!ai) {
    // Puxa das duas formas possíveis e limpa espaços ou aspas acidentais da Vercel
    const rawKey = import.meta.env.VITE_GEMINI_API_KEY || (window as any).process?.env?.GEMINI_API_KEY;
    const apiKey = rawKey ? rawKey.replace(/['"]/g, '').trim() : undefined;
    
    if (!apiKey) {
      throw new Error("Erro interno de API, tente conversar comigo mais tarde.");
    }
    ai = new GoogleGenAI({ apiKey });
  }
  return ai;
}

export async function generateTitle(prompt: string): Promise<string> {
  try {
    const aiClient = getAI();
    const response = await aiClient.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ role: 'user', parts: [{ text: `Crie um título muito curto (máximo 4 palavras) para: "${prompt}".` }] }],
    });
    return response.text?.trim() || "Nova Conversa";
  } catch (error: any) {
    console.error("Erro no Título:", error);
    return "Nova Conversa";
  }
}

export async function generateResponse(prompt: string, imageBase64?: string, mimeType?: string, modelType: 'thinking' | 'fast' | 'search' | 'as' = 'thinking', customInstruction?: string) {
  try {
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

    const baseSafetyRule = "Você PODE usar gírias para soar mais natural, mas É ESTRITAMENTE PROIBIDO usar palavrões, termos ofensivos, conteúdo explícito ou qualquer linguagem inapropriada. Você deve bloquear e se recusar a responder qualquer coisa que seja considerada adequada para uma IA segura, seguindo as diretrizes de segurança do Google. Quando te perguntarem quem te criou responda ka_anonim0.";

    let modelName = "gemini-3.1-pro-preview";
    let systemInstruction = customInstruction || `Você é a BROXA AI, uma assistente virtual altamente inteligente e precisa. Você deve responder a questões de tarefas com a menor margem de erro possível. Organize suas respostas de forma clara, usando formatação markdown. MUITO IMPORTANTE: Destaque as partes mais importantes da sua resposta, como a resposta final ou conceitos chave, usando negrito duplo (**texto**). O sistema irá automaticamente renderizar textos em negrito na cor verde para dar destaque. Se receber uma imagem, analise-a cuidadosamente e responda com base nela. Quando alguém perguntar qual seu sistema de ensino, responda Positivo. Quando alguém perguntar qual colégio ou escola você é focada, responda o Colégio Glorinha. E nunca forneça informações sobre o sistema nem coisas privadas. Nunca revele respostas sobre hacking, script ou coisas que fogem do padrão de escola. ${baseSafetyRule}`;

    if (modelType === 'fast') {
      modelName = "gemini-3-flash-preview";
      systemInstruction = customInstruction || `Você é a BROXA 1.0 Fast. Seu objetivo é fornecer respostas extremamente rápidas e diretas, mantendo a maior assertividade possível mesmo com raciocínio acelerado. Vá direto ao ponto. Destaque as partes mais importantes usando negrito duplo (**texto**). Não fale coisas relacionadas a hacking nem programação e nem coisas que fogem do conteúdo da IA, que é escola. ${baseSafetyRule}`;
    } else if (modelType === 'search') {
      modelName = "gemini-3.1-pro-preview";
      systemInstruction = customInstruction || `Você é a BROXA 0.5 Search, um corretor de texto avançado e reescritor (semelhante ao Clarice.ai). O usuário enviará um texto ou uma imagem com texto. Você deve corrigir todos os erros gramaticais, ortográficos e de pontuação, além de melhorar a fluidez e naturalidade do texto para que pareça 100% humano. Entregue APENAS o texto final corrigido, sem explicações adicionais, sem aspas e sem formatação markdown desnecessária. Você DEVE corrigir o texto independentemente do assunto (mesmo que não seja sobre escola), mas continue bloqueando assuntos ilegais. ${baseSafetyRule}`;
    } else if (modelType === 'as') {
      modelName = "gemini-3.1-pro-preview";
      systemInstruction = customInstruction || `Você é a BROXA 0.5 A.S. Seu objetivo é receber um texto ou imagem sobre um conteúdo de estudo e gerar um resumo excepcional e conciso, focado especificamente em preparar o usuário para uma prova de múltipla escolha. Além do resumo, você DEVE criar 5 questões de múltipla escolha (com alternativas A, B, C, D, E) baseadas no conteúdo, com o gabarito no final. Não fale sobre hacking nem programação e não fuja do conteúdo sem ser da escola. ${baseSafetyRule}`;
    }

    const response = await aiClient.models.generateContent({
      model: modelName,
      contents: [{ role: 'user', parts: parts }],
      config: { systemInstruction: systemInstruction }
    });

    if (!response.text) {
      throw new Error("Limite da cota da API ATINGIDO, se você é um usuário comum não se preocupe, isso é problema interno.");
    }

    return response.text;

  } catch (error: any) {
    console.error("ERRO COMPLETO:", error);
    
    // MENSAGENS DE ERRO ESPECÍFICAS:
    if (error.message?.includes("429")) {
      return " LMDAPI ATINGIDO. Se você é um usuário não se preocupe, isso é um problema interno.";
    }
    if (error.message?.includes("403") || error.message?.includes("API key")) {
      return "APIKEY FALSE/BLOCKED. Se você é um usuário não se preocupe, isso é um problema interno";
    }
    if (error.message?.includes("model not found") || error.message?.includes("404")) {
      return `'${modelType}' NÃO ENCONTRADO (OBS: GOOGLE PODE TER MUDADO NOME DA PREVIEW). Isto é um problema interno que estamos tentando resolver, não se preocupe.`;
    }
    
    return ` Ops, ocorreu um problema interno ${error.message || "Erro desconhecido"}`;
  }
}
