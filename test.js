import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI("AIzaSyDKYUopN1R_WIck_YW8hKOOoQxxvB_GXY8");

async function run() {
    try {
        // Usamos o modelo 1.5-flash que é o padrão atual
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
        
        console.log("A enviar pergunta...");
        const result = await model.generateContent("Olá, teste de ligação.");
        const response = await result.response;
        console.log("Sucesso! Resposta:", response.text());
    } catch (error) {
        console.error("Erro ao conectar:");
        console.error(error.message);
    }
}

run();
