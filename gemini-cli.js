#!/usr/bin/env node

import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI("AIzaSyDKYUopN1R_WIck_YW8hKOOoQxxvB_GXY8");

// 🔥 modelo correto atual
const model = genAI.getGenerativeModel({
  model: "gemini-1.5-flash"
});

async function run() {
  const result = await model.generateContent("Analisa o sistema BizControl");
  const response = await result.response;
  console.log(response.text());
}

run();

