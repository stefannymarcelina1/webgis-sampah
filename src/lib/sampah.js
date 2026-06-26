export const getSampahStatus = (item) => item?.status ?? item?.status_pengangkutan ?? "Menunggu";

export const updateSampahStatus = async (supabaseClient, id, status) => {
  return await supabaseClient.from("sampah").update({ status }).eq("id", id);
};
