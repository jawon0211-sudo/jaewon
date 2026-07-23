import { GoogleGenAI, Type } from "@google/genai";

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
    const ai = new GoogleGenAI({ apiKey });

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        summary: { type: Type.STRING, description: "경로 요약 및 안내 메시지" },
        totalDurationMinutes: { type: Type.NUMBER, description: "총 예상 소요시간(분)" },
        trafficLights: {
          type: Type.ARRAY,
          description: "경로 상 주요 신호등 목록",
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING, description: "신호등 위치 이름" },
              offsetLat: { type: Type.NUMBER, description: "출발지-목적지 사이 가상 위도 오프셋 (0.0~1.0)" },
              offsetLng: { type: Type.NUMBER, description: "출발지-목적지 사이 가상 경도 오프셋 (0.0~1.0)" },
              redDuration: { type: Type.NUMBER, description: "적색불 주기(초)" },
              greenDuration: { type: Type.NUMBER, description: "녹색불 주기(초)" }
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

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      },
    });

    const result = JSON.parse(response.text);
    return res.status(200).json(result);

  } catch (error) {
    console.error("Gemini API Error:", error);
    return res.status(500).json({ error: "경로를 분석하는 중 오류가 발생했습니다." });
  }
}
