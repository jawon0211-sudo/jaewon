import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "GEMINI_API_KEY 환경변수가 설정되지 않았습니다." });
  }

  const { origin, destination } = req.body;
  if (!origin || !destination) {
    return res.status(400).json({ error: "출발지와 목적지를 모두 입력해 주세요." });
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // JSON 응답 스키마 정의
    const responseSchema = {
      type: "object",
      properties: {
        summary: { type: "string", description: "경로 요약 및 안내 메시지" },
        totalDurationMinutes: { type: "number", description: "총 예상 소요시간(분)" },
        trafficLights: {
          type: "array",
          description: "경로 상 주요 신호등 목록",
          items: {
            type: "object",
            properties: {
              name: { type: "string", description: "신호등 위치 이름" },
              offsetLat: { type: "number", description: "출발지-목적지 사이 가상 위도 오프셋 (0.0~1.0)" },
              offsetLng: { type: "number", description: "출발지-목적지 사이 가상 경도 오프셋 (0.0~1.0)" },
              redDuration: { type: "number", description: "적색불 주기(초)" },
              greenDuration: { type: "number", description: "녹색불 주기(초)" }
            },
            required: ["name", "offsetLat", "offsetLng", "redDuration", "greenDuration"]
          }
        }
      },
      required: ["summary", "totalDurationMinutes", "trafficLights"]
    };

    const prompt = `
      출발지 "${origin}"에서 목적지 "${destination}"까지 이동하는 가장 빠른 길을 안내해 주세요.
      해당 경로에 존재하는 3~4개의 주요 교차로 신호등 정보를 생성해 주세요.
      offsetLat와 offsetLng는 출발지(0)에서 목적지(1) 사이의 위치 비율을 의미합니다. (예: 첫 번째 신호등 0.25, 두 번째 0.5, 세 번째 0.75)
    `;

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      }
    });

    const result = await model.generateContent(prompt);
    const responseText = await result.response.text();
    
    return res.status(200).json(JSON.parse(responseText));

  } catch (error) {
    console.error("Gemini API Error:", error);
    return res.status(500).json({ error: "경로를 분석하는 중 오류가 발생했습니다." });
  }
}
