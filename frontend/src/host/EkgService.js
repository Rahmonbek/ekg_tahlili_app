export const analyzeEkgFile = async (file) => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("https://localhost:7020/api/Ekg/analyze", {
    method: "POST",
    body: formData
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Server error");
  }

  return response.json();
};
