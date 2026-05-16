  import axios from "axios";

  const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  });

  // Request interceptor — inject Bearer token
  api.interceptors.request.use((config) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("vcf_token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  });

  // Response interceptor — handle 401
  api.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401 && typeof window !== "undefined") {
        localStorage.removeItem("vcf_token");
        localStorage.removeItem("vcf_user");
        window.location.href = "/login";
      }
      return Promise.reject(error);
    }
  );

  export default api;

  // ── Auth ──────────────────────────────────────────────────────────────────────
  export const authApi = {
    login: (username: string, password: string) =>
      api.post("/login", { username, password }),
    me: () => api.get("/me"),
    logout: () => api.post("/logout"),
  };

  // ── Master Data ───────────────────────────────────────────────────────────────
  export const masterApi = {
    // Transporters
    getTransporters: (params?: object) => api.get("/master/transporters", { params }),
    createTransporter: (data: object) => api.post("/master/transporters", data),
    updateTransporter: (id: number, data: object) =>
      api.put(`/master/transporters/${id}`, data),
    deleteTransporter: (id: number) => api.delete(`/master/transporters/${id}`),

    // Drivers
    getDrivers: (params?: object) => api.get("/master/drivers", { params }),
    createDriver: (data: object) => api.post("/master/drivers", data),
    updateDriver: (id: number, data: object) =>
      api.put(`/master/drivers/${id}`, data),
    deleteDriver: (id: number) => api.delete(`/master/drivers/${id}`),

    // Jenis Kendaraan
    getJenisKendaraan: (params?: object) => api.get("/master/jenis-kendaraan", { params }),
    createJenisKendaraan: (data: object) =>
      api.post("/master/jenis-kendaraan", data),
    updateJenisKendaraan: (id: number, data: object) =>
      api.put(`/master/jenis-kendaraan/${id}`, data),
    deleteJenisKendaraan: (id: number) =>
      api.delete(`/master/jenis-kendaraan/${id}`),

    // Logistik
    getLogistik: (params?: object) => api.get("/master/logistik", { params }),
    createLogistik: (data: object) => api.post("/master/logistik", data),
    updateLogistik: (id: number, data: object) =>
      api.put(`/master/logistik/${id}`, data),
    deleteLogistik: (id: number) => api.delete(`/master/logistik/${id}`),

    // Produk
    getProduk: (params?: object) => api.get("/master/produk", { params }),
    createProduk: (data: object) => api.post("/master/produk", data),
    updateProduk: (id: number, data: object) =>
      api.put(`/master/produk/${id}`, data),
    deleteProduk: (id: number) => api.delete(`/master/produk/${id}`),

    // Item Kelengkapan Supir
    getItemKelengkapanSupir: (params?: object) => api.get("/master/item-kelengkapan-supir", { params }),
    createItemKelengkapanSupir: (data: object) =>
      api.post("/master/item-kelengkapan-supir", data),
    updateItemKelengkapanSupir: (id: number, data: object) =>
      api.put(`/master/item-kelengkapan-supir/${id}`, data),
    deleteItemKelengkapanSupir: (id: number) =>
      api.delete(`/master/item-kelengkapan-supir/${id}`),

    // Item Muatan
    getItemMuatan: (params?: object) => api.get("/master/item-muatan", { params }),
    createItemMuatan: (data: object) => api.post("/master/item-muatan", data),
    updateItemMuatan: (id: number, data: object) =>
      api.put(`/master/item-muatan/${id}`, data),
    deleteItemMuatan: (id: number) => api.delete(`/master/item-muatan/${id}`),

    // Item Pemeriksaan Masuk
    getItemPemeriksaanMasuk: (params?: object) => api.get("/master/item-pemeriksaan-masuk", { params }),
    createItemPemeriksaanMasuk: (data: object) =>
      api.post("/master/item-pemeriksaan-masuk", data),
    updateItemPemeriksaanMasuk: (id: number, data: object) =>
      api.put(`/master/item-pemeriksaan-masuk/${id}`, data),
    deleteItemPemeriksaanMasuk: (id: number) =>
      api.delete(`/master/item-pemeriksaan-masuk/${id}`),

    // Item Pemeriksaan Keluar
    getItemPemeriksaanKeluar: (params?: object) => api.get("/master/item-pemeriksaan-keluar", { params }),
    createItemPemeriksaanKeluar: (data: object) =>
      api.post("/master/item-pemeriksaan-keluar", data),
    updateItemPemeriksaanKeluar: (id: number, data: object) =>
      api.put(`/master/item-pemeriksaan-keluar/${id}`, data),
    deleteItemPemeriksaanKeluar: (id: number) =>
      api.delete(`/master/item-pemeriksaan-keluar/${id}`),

    // Users
    getUsers: (params?: object) => api.get("/master/users", { params }),
    createUser: (data: object) => api.post("/master/users", data),
    updateUser: (id: number, data: object) =>
      api.put(`/master/users/${id}`, data),
    deleteUser: (id: number) => api.delete(`/master/users/${id}`),
  };

  // ── VCF Transactions ──────────────────────────────────────────────────────────
  export const vcfApi = {
    getList: (params?: object) => api.get("/vcf", { params }),
    getNextNumber: (params?: object) => api.get("/vcf/next-number", { params }),
    getDetail: (id: number) => api.get(`/vcf/${id}`),
    createBagian1: (data: object) => api.post("/vcf", data),
    updateBagian1: (id: number, data: object) => api.put(`/vcf/${id}`, data),
    rejectVcf: (id: number, data: { catatan_reject: string }) => api.post(`/vcf/${id}/reject`, data),

    getBagian2: (id: number) => api.get(`/vcf/${id}/bagian2`),
    createBagian2: (id: number, data: object) =>
      api.post(`/vcf/${id}/bagian2`, data),
    rejectBagian2: (id: number, data: { catatan_reject: string }) =>
      api.post(`/vcf/${id}/bagian2/reject`, data),
    updateBagian2: (id: number, data: object) =>
      api.put(`/vcf/${id}/bagian2`, data),

    startOperasional: (id: number) =>
      api.post(`/vcf/${id}/operasional/start`),
    finishOperasional: (id: number, data: object) =>
      api.post(`/vcf/${id}/operasional/finish`, data),

    getBagian3: (id: number) => api.get(`/vcf/${id}/bagian3`),
    createBagian3: (id: number, data: object) =>
      api.post(`/vcf/${id}/bagian3`, data),
    updateBagian3: (id: number, data: object) =>
      api.put(`/vcf/${id}/bagian3`, data),
    rejectBagian3: (id: number, data: { catatan_reject: string }) =>
      api.post(`/vcf/${id}/bagian3/reject`, data),

    getBagian4: (id: number) => api.get(`/vcf/${id}/bagian4`),
    createBagian4: (id: number, data: object) =>
      api.post(`/vcf/${id}/bagian4`, data),
    updateBagian4: (id: number, data: object) =>
      api.put(`/vcf/${id}/bagian4`, data),
    finalizeVcf: (id: number) => api.post(`/vcf/${id}/finalize`),
  };

  // ── Settings ─────────────────────────────────────────────────────────────────
  export const settingsApi = {
    getAll: (params?: object) => api.get("/settings", { params }),
    getPublic: (keys?: string[]) => api.get("/settings/public", { params: { keys } }),
    getVcf: () => api.get("/settings/vcf"),
    getPrint: () => api.get("/settings/print"),
    getByKey: (key: string) => api.get(`/settings/${key}`),
    update: (key: string, data: { value: any; is_active?: boolean }) =>
      api.put(`/settings/${key}`, data),
    updateBatch: (settings: { key: string; value: any }[]) =>
      api.put("/settings/batch", { settings }),
  };
