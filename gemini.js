import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const model = genAI.getGenerativeModel({
  model: "gemini-1.5-flash-latest"
});
async function run() {
  const result = await model.generateContent(
    "Explique programação em C de forma simples"
  );

  console.log(result.response.text());
}

run();
