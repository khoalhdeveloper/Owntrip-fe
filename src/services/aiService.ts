

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
      
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
      
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
        console.log("Nhan duoc ket qua tu Gemini:", JSON.stringify(data, null, 2));
        
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
  },

  /**
   * Gọi AI để tự động sinh lịch trình dựa trên các địa điểm gợi ý
   * @param days Số ngày của chuyến đi
   * @param availablePlaces Danh sách địa điểm gợi ý lấy từ API searchText
   * @returns Mảng JSON map dayId với danh sách placeId tương ứng
   */
  autoGenerateTripItinerary: async (days: any[], availablePlaces: any[]) => {
    try {
      if (!apiKey) {
        console.error("Thiếu EXPO_PUBLIC_GEMINI_API_KEY trong file .env");
        return null;
      }

      // Format lại data cho AI dễ đọc
      const dayList = days.map(d => ({
        dayId: d.dayId,
        day: d.day,
      }));

      const placesInfo = availablePlaces.map(p => ({
        id: p.placeId || p._id,
        name: p.name,
        types: p.types || p.category,
        rating: p.rating,
      }));

      console.log("Bat dau goi Gemini AI (Auto Generate)...");

      const prompt = `
        Tôi đang lên lịch trình cho một chuyến đi ${days.length} ngày.
        Đây là danh sách các ngày:
        ${JSON.stringify(dayList, null, 2)}
        
        Đây là danh sách các địa điểm có sẵn tại điểm đến:
        ${JSON.stringify(placesInfo, null, 2)}
        
        Hãy chọn ngẫu nhiên khoảng 3-4 địa điểm cho mỗi ngày (cố gắng chọn đa dạng các loại hình như ăn uống, tham quan, giải trí).
        Tuyệt đối không chọn trùng lặp 1 địa điểm cho nhiều ngày khác nhau.
        Bạn BẮT BUỘC PHẢI trả về kết quả dưới định dạng JSON hợp lệ (KHÔNG bọc bằng markdown \`\`\`json).
        
        Cấu trúc JSON yêu cầu:
        {
          "itinerary": [
            {
              "dayId": "ID_CỦA_NGÀY",
              "placeIds": ["ID_ĐỊA_ĐIỂM_1", "ID_ĐỊA_ĐIỂM_2", "ID_ĐỊA_ĐIỂM_3"]
            }
          ],
          "replyMessage": "Một câu giới thiệu ngắn gọn, thân thiện (ví dụ: 'Dạ em đã chọn lọc và lên lịch trình hoàn chỉnh cho anh/chị rồi ạ!')"
        }
      `;

      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000); // 12 seconds timeout

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.4 }
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);
        const data = await response.json();
        const responseText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (!responseText) return null;

        const cleanJsonStr = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsedData = JSON.parse(cleanJsonStr);

        if (parsedData.itinerary && Array.isArray(parsedData.itinerary)) {
          return parsedData;
        }
        return null;

      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          console.warn("⚠️ Mạng bị nghẽn. Dùng Fallback (Mock) cho Auto Generate.");
          // MOCK FALLBACK: Tự động chia 3 địa điểm / ngày từ danh sách
          const fallbackItinerary = days.map((day, index) => {
            const startIdx = index * 3;
            const placesForDay = availablePlaces.slice(startIdx, startIdx + 3).map(p => p.placeId || p._id);
            return {
              dayId: day.dayId,
              placeIds: placesForDay
            };
          });
          return {
            itinerary: fallbackItinerary,
            replyMessage: "Dạ mạng hơi nghẽn nên em đã tự động nhặt ngẫu nhiên 3 địa điểm mỗi ngày cho lịch trình của mình ạ!"
          };
        }
        throw fetchError;
      }
    } catch (error: any) {
      console.error("Lỗi khi gọi Auto Generate AI:", error?.response?.data || error);
      return null;
    }
  }
};
