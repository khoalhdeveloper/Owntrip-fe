

// Lấy API key từ biến môi trường
const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';

export interface AIReorderResult {
  orderedPlaceIds: string[];
  replyMessage: string;
}

export const aiService = {
  /**
   * Gọi AI để tự động sắp xếp lại lịch trình dựa trên yêu cầu của người dùng.
   * @param userInput Lời thoại / yêu cầu của người dùng (VD: "Trời hôm nay mưa", "Cho tôi đi Dinh Độc Lập trước")
   * @param currentPlaces Danh sách các địa điểm hiện tại trong ngày
   * @returns Mảng các _id của địa điểm đã được sắp xếp mới và một câu trả lời thân thiện
   */
  rearrangeItineraryWithAI: async (userInput: string, currentPlaces: any[]): Promise<AIReorderResult | null> => {
    try {
      if (!apiKey) {
        console.error("Thiếu EXPO_PUBLIC_GEMINI_API_KEY trong file .env");
        return null;
      }

      // Tạo chuỗi mô tả danh sách địa điểm hiện tại
      const placesInfo = currentPlaces.map((p, index) => ({
        id: p.place._id,
        name: p.place.name,
        address: p.place.address,
        timeOfDay: p.place.timeOfDay,
        currentOrder: index + 1
      }));

      console.log("Bat dau goi Gemini AI qua REST API...");

      const prompt = `
        Tôi là một hệ thống tự động sắp xếp lịch trình du lịch.
        Danh sách địa điểm hiện tại (đang theo thứ tự):
        ${JSON.stringify(placesInfo, null, 2)}
        
        Người dùng yêu cầu: "${userInput}"
        
        Hãy phân tích yêu cầu và sắp xếp lại danh sách các địa điểm.
        Bạn BẮT BUỘC PHẢI trả về KẾT QUẢ DƯỚI DẠNG JSON hợp lệ. KHÔNG bọc bằng markdown (\`\`\`json).
        Cấu trúc JSON yêu cầu:
        {
          "orderedPlaceIds": ["id1", "id2", ...],
          "replyMessage": "Một câu trả lời ngắn gọn, thân thiện bằng tiếng Việt."
        }
      `;

      console.log("Gui request den Gemini qua Fetch...");
      
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 seconds timeout
      
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.2
            }
          }),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        const data = await response.json();
        console.log("Nhan duoc ket qua tu Gemini");
        
        const responseText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        console.log("Raw response:", responseText);
        
        if (!responseText) return null;

        // Xử lý loại bỏ markdown block nếu AI vẫn vô tình trả về
        const cleanJsonStr = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        
        const parsedData = JSON.parse(cleanJsonStr) as AIReorderResult;
        
        // Đảm bảo trả về đủ số lượng ID
        if (parsedData.orderedPlaceIds && Array.isArray(parsedData.orderedPlaceIds)) {
          console.log("Parse JSON thanh cong:", parsedData);
          return parsedData;
        }
        
        return null;
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          console.warn("⚠️ Mạng bị nghẽn (không truy cập được Google Gemini). Sử dụng dữ liệu giả lập (Mock).");
          // Fake logic: Just reverse the order as a demonstration
          return {
            orderedPlaceIds: currentPlaces.map(p => p.place._id).reverse(),
            replyMessage: "Dạ, vì mạng đang lỗi kết nối tới AI, em xin phép đổi ngược danh sách tạm thời ạ!"
          };
        }
        throw fetchError;
      }
    } catch (error: any) {
      console.error("Lỗi khi gọi Gemini AI REST API:", error?.response?.data || error);
      return null;
    }
  }
};
