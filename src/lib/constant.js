export const soldType = [
    "Căn hộ chung cư",
    "Nhà mặt phố",
    "Nhà riêng",
    "Nhà thương mại",
    "Kho",
    "Nhà xưởng",
    "Trang trại",
    "Khu nghỉ dưỡng",
    "Nhà Đất",
    "Biệt Thự",
    "Khác"
].map((item) => ({
    name: item,
    path: item.toLowerCase().replace(/\s+/g, '-')
}))

export const rentType = [
    "Căn hộ chung cư",
    "Nhà mặt phố",
    "Nhà riêng",
    "Nhà thương mại",
    "Kho",
    "Nhà xưởng",
    "Trang trại",
    "Khu nghỉ dưỡng",
    "Nhà Trọ, Phòng Trọ",
    "Văn Phòng",
    "Biệt Thự",
    "Khác"
].map((item) => ({
    name: item,
    path: item.toLowerCase().replace(/\s+/g, '-')
}))