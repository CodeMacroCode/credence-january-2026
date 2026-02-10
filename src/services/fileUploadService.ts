import fileUploadAxios from "@/lib/fileUploadAxios";

export const excelFileUploadForDevice = async (
  file: File,
  schoolId: string,
  branchId: string
) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("schoolId", schoolId);
  formData.append("branchId", branchId);

  const response = await fileUploadAxios.post("/device/upload-excel", formData);

  return response.data;
};

export const excelFileUploadForStudent = async (
  file: File,
  schoolId: string,
  branchId: string
) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("schoolId", schoolId);
  formData.append("branchId", branchId);

  const response = await fileUploadAxios.post("/child/upload-excel", formData);

  return response.data;
};
export const excelFileUploadForBranch = async (file: File) => {
  const formData = new FormData();

  // 🔑 MUST match upload.single("file")
  formData.append("file", file);

  const response = await fileUploadAxios.post(
    "/add-multiple-branches",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );

  return response.data;
};

export const excelFileUploadForSchool = async (file: File) => {
  const formData = new FormData();

  // 🔑 MUST match upload.single("file")
  formData.append("file", file);

  const response = await fileUploadAxios.post(
    "/add-multiple-schools",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );

  return response.data;
};