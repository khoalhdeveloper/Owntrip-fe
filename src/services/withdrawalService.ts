import axiosClient from "./axiosClient";

export type WithdrawalStatus = "pending" | "approved" | "rejected";

export interface WithdrawalRequestItem {
  _id: string;
  userId: string;
  amount: number;
  bankName: string;
  accountNumber: string;
  accountName: string;
  status: WithdrawalStatus;
  adminNote?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWithdrawalPayload {
  amount: number;
  bankName: string;
  accountNumber: string;
  accountName: string;
}

export const withdrawalService = {
  create: async (payload: CreateWithdrawalPayload): Promise<{ success: boolean; message?: string; data?: WithdrawalRequestItem; currentBalance?: number }> => {
    try {
      const response: any = await axiosClient.post("/api/withdrawals", payload);
      return response;
    } catch (error: any) {
      return { success: false, message: error?.response?.data?.message || "Không thể tạo yêu cầu rút tiền" };
    }
  },

  getMyRequests: async (): Promise<{ success: boolean; data: WithdrawalRequestItem[]; message?: string }> => {
    try {
      const response: any = await axiosClient.get("/api/withdrawals/my");
      return { success: !!response?.success, data: response?.data || [], message: response?.message };
    } catch (error: any) {
      return { success: false, data: [], message: error?.response?.data?.message || "Không thể tải lịch sử rút tiền" };
    }
  },

  getAdminRequests: async (): Promise<{ success: boolean; data: WithdrawalRequestItem[]; message?: string }> => {
    try {
      const response: any = await axiosClient.get("/api/withdrawals/admin");
      return { success: !!response?.success, data: response?.data || [], message: response?.message };
    } catch (error: any) {
      return { success: false, data: [], message: error?.response?.data?.message || "Không thể tải danh sách yêu cầu" };
    }
  },

  reviewByAdmin: async (id: string, action: "approved" | "rejected", adminNote?: string): Promise<{ success: boolean; message?: string; data?: WithdrawalRequestItem }> => {
    try {
      const response: any = await axiosClient.put(`/api/withdrawals/admin/${id}`, { action, adminNote });
      return response;
    } catch (error: any) {
      return { success: false, message: error?.response?.data?.message || "Không thể xử lý yêu cầu" };
    }
  }
};
